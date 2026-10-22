const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Booking = require('../models/Booking');
const VendorSalaryEarning = require('../models/VendorSalaryEarning');
const Transaction = require('../models/Transaction');

const COMPLETION_STATUSES = new Set(['work_done', 'completed']);

const roundDurationMinutes = (value) => {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0
    ? Number(minutes.toFixed(2))
    : 0;
};

const parseClockMinutes = (value) => {
  const text = String(value || '').trim().toUpperCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }
  return (hours * 60) + minutes;
};

const getSlotDurationMinutes = (booking) => {
  if (String(booking.bookingType || '').toLowerCase() !== 'scheduled') return 0;
  const start = parseClockMinutes(booking.timeSlot?.start);
  const end = parseClockMinutes(booking.timeSlot?.end);
  if (start === null || end === null) return 0;

  const duration = end >= start ? end - start : (24 * 60) - start + end;
  return roundDurationMinutes(duration);
};

const getDurationMinutes = (booking) => {
  const tracking = booking.hourlyTracking || {};

  // Timer values are the source of truth for both instant and scheduled services.
  if (Number(tracking.actualDurationMinutes) > 0) {
    return roundDurationMinutes(tracking.actualDurationMinutes);
  }

  if (tracking.serviceStartedAt && tracking.serviceEndedAt) {
    const elapsed = (new Date(tracking.serviceEndedAt).getTime() -
      new Date(tracking.serviceStartedAt).getTime()) / 60000;
    if (elapsed > 0) return roundDurationMinutes(elapsed);
  }

  // A scheduled booking without timer data uses the actual reserved slot length.
  const slotDuration = getSlotDurationMinutes(booking);
  if (slotDuration > 0) return slotDuration;

  if (Number(tracking.bookedMinutes) > 0) {
    return roundDurationMinutes(tracking.bookedMinutes);
  }

  const items = Array.isArray(booking.bookedItems) ? booking.bookedItems : [];
  const estimatedMinutes = items.reduce((total, item) => {
    const card = item.card || {};
    const minutes = Number(card.durationMinutes || card.estimatedDurationMinutes);
    const hours = Number(card.hours);
    return total + (minutes > 0 ? minutes : (hours > 0 ? hours * 60 : 0)) * (Number(item.quantity) || 1);
  }, 0);

  return roundDurationMinutes(estimatedMinutes);
};

const getRateForDate = (vendor, earningDate = new Date()) => {
  const config = vendor.salaryConfig || {};
  const targetTime = new Date(earningDate).getTime();
  const history = Array.isArray(config.rateHistory) ? [...config.rateHistory] : [];

  history.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  const historicalRate = history.find((item) => new Date(item.effectiveFrom).getTime() <= targetTime);

  if (historicalRate) {
    return {
      rateAmount: Number(historicalRate.rateAmount) || 0,
      rateUnitMinutes: Number(historicalRate.rateUnitMinutes) || 60
    };
  }

  if (config.effectiveFrom && new Date(config.effectiveFrom).getTime() > targetTime) {
    return null;
  }

  if (Number(config.rateAmount) > 0) {
    return {
      rateAmount: Number(config.rateAmount),
      rateUnitMinutes: Number(config.rateUnitMinutes) || 60
    };
  }

  return null;
};

const calculateBookingEarning = ({ durationMinutes, rateAmount, rateUnitMinutes }) => {
  const unitMinutes = Number(rateUnitMinutes) > 0 ? Number(rateUnitMinutes) : 60;
  const billableUnits = durationMinutes > 0
    ? Number((durationMinutes / unitMinutes).toFixed(4))
    : 0;
  const amount = Number((billableUnits * rateAmount).toFixed(2));

  return { billableUnits, amount };
};

const createSalaryTransaction = async (earning, booking) => {
  if (!earning || earning.amount <= 0) return;

  await Transaction.findOneAndUpdate(
    {
      type: 'salary_earning',
      'metadata.salaryEarningId': earning._id.toString()
    },
    {
      $set: {
        amount: earning.amount
      },
      $setOnInsert: {
        vendorId: earning.vendorId,
        bookingId: earning.bookingId,
        type: 'salary_earning',
        status: 'completed',
        paymentMethod: 'system',
        description: 'Salary earning ₹' + earning.amount + ' credited for booking #' + (booking?.bookingNumber || earning.bookingId),
        metadata: {
          salaryEarningId: earning._id.toString(),
          durationMinutes: earning.durationMinutes,
          rateAmount: earning.rateAmount,
          rateUnitMinutes: earning.rateUnitMinutes,
          billableUnits: earning.billableUnits
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * Create or refresh one salary earning for a completed booking.
 * This function is idempotent and never updates Vendor.wallet.earnings.
 */
const creditSalaryEarningForBooking = async ({ bookingId, vendorId }) => {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking || !booking.vendorId) {
    return { created: false, reason: 'booking_or_vendor_missing' };
  }

  if (vendorId && String(booking.vendorId) !== String(vendorId)) {
    return { created: false, reason: 'vendor_mismatch' };
  }

  if (!COMPLETION_STATUSES.has(String(booking.status))) {
    return { created: false, reason: 'booking_not_completed' };
  }

  const actualVendorId = booking.vendorId;
  const sourceKey = 'booking:' + booking._id.toString();
  const earningDate = booking.completedAt || booking.updatedAt || new Date();
  const durationMinutes = getDurationMinutes(booking);
  const vendor = await Vendor.findById(actualVendorId).select('salaryConfig').lean();
  if (!vendor) return { created: false, reason: 'vendor_missing' };

  const rate = getRateForDate(vendor, earningDate);
  const existing = await VendorSalaryEarning.findOne({ sourceKey });

  if (existing && ['paid', 'reversed'].includes(existing.status)) {
    return { created: false, existing, reason: 'already_credited' };
  }

  if (!rate || rate.rateAmount <= 0) {
    const pending = existing || await VendorSalaryEarning.create({
      vendorId: actualVendorId,
      bookingId: booking._id,
      sourceKey,
      type: 'booking_earning',
      amount: 0,
      status: 'pending_rate',
      earningDate,
      durationMinutes,
      description: 'Salary earning pending rate for booking #' + booking.bookingNumber,
      metadata: { bookingNumber: booking.bookingNumber }
    });
    return { created: !existing, pending, reason: 'rate_not_configured' };
  }

  const { billableUnits, amount } = calculateBookingEarning({
    durationMinutes,
    rateAmount: rate.rateAmount,
    rateUnitMinutes: rate.rateUnitMinutes
  });

  const earning = existing
    ? await VendorSalaryEarning.findByIdAndUpdate(existing._id, {
      $set: {
        amount,
        status: 'accrued',
        earningDate,
        durationMinutes,
        rateAmount: rate.rateAmount,
        rateUnitMinutes: rate.rateUnitMinutes,
        billableUnits,
        description: 'Salary earning ₹' + amount + ' for booking #' + booking.bookingNumber
      }
    }, { new: true })
    : await VendorSalaryEarning.create({
      vendorId: actualVendorId,
      bookingId: booking._id,
      sourceKey,
      type: 'booking_earning',
      amount,
      status: 'accrued',
      earningDate,
      durationMinutes,
      rateAmount: rate.rateAmount,
      rateUnitMinutes: rate.rateUnitMinutes,
      billableUnits,
      description: 'Salary earning ₹' + amount + ' for booking #' + booking.bookingNumber,
      metadata: { bookingNumber: booking.bookingNumber }
    });

  await createSalaryTransaction(earning, booking);

  return {
    created: !existing,
    earning,
    reason: existing
      ? (existing.status === 'pending_rate' ? 'pending_rate_refreshed' : 'recalculated')
      : 'credited'
  };
};

const refreshPendingSalaryEarnings = async (vendorId) => {
  const pending = await VendorSalaryEarning.find({
    vendorId,
    status: 'pending_rate',
    bookingId: { $ne: null }
  }).select('bookingId');

  let refreshed = 0;
  for (const record of pending) {
    const result = await creditSalaryEarningForBooking({
      vendorId,
      bookingId: record.bookingId
    });
    if (result.reason === 'pending_rate_refreshed' || result.reason === 'credited') refreshed += 1;
  }
  return refreshed;
};

// Re-run the exact-duration calculation for unpaid booking earnings. This also
// corrects older records created with block rounding (45 minutes at 50/30 was
// previously stored as 100 instead of 75).
const refreshAccruedSalaryEarnings = async (vendorId) => {
  const accrued = await VendorSalaryEarning.find({
    vendorId,
    status: 'accrued',
    bookingId: { $ne: null }
  }).select('bookingId');

  let refreshed = 0;
  for (const record of accrued) {
    const result = await creditSalaryEarningForBooking({
      vendorId,
      bookingId: record.bookingId
    });
    if (result.reason === 'recalculated') refreshed += 1;
  }
  return refreshed;
};

module.exports = {
  getDurationMinutes,
  getRateForDate,
  calculateBookingEarning,
  creditSalaryEarningForBooking,
  refreshPendingSalaryEarnings,
  refreshAccruedSalaryEarnings
};

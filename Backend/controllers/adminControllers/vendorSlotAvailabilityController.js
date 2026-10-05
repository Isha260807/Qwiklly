const mongoose = require('mongoose');
const Vendor = require('../../models/Vendor');
const Settings = require('../../models/Settings');
const Booking = require('../../models/Booking');
const VendorSlotAvailability = require('../../models/VendorSlotAvailability');
const { BOOKING_STATUS } = require('../../utils/constants');

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_START = /^([01]\d|2[0-3]):[0-5]\d$/;
const BOOKED_SLOT_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.AWAITING_PAYMENT,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.WORK_DONE
];

const isValidDateKey = (value) => {
  if (!DATE_KEY.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const dateRange = (from, to) => {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const normalizeSlotStart = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = 0;
    if (meridiem === 'PM') hours += 12;
  }
  if (hours > 23) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getBookedSlots = async (vendorId, from, to) => {
  const { start, end } = dateRange(from, to);
  const bookings = await Booking.find({
    vendorId,
    bookingType: 'scheduled',
    // Availability administration is scoped to fixed-price NORMAL SLOT
    // bookings. Duration/hourly booking administration remains unchanged.
    'hourlyTracking.isHourly': false,
    scheduledDate: { $gte: start, $lt: end },
    status: { $in: BOOKED_SLOT_STATUSES }
  }).select('_id bookingNumber scheduledDate scheduledTime timeSlot status').lean();

  const bookedSlots = {};
  bookings.forEach((booking) => {
    const dateKey = booking.scheduledDate?.toISOString().slice(0, 10);
    const startValue = normalizeSlotStart(booking.timeSlot?.start);
    if (!dateKey || !startValue) return;
    if (!bookedSlots[dateKey]) bookedSlots[dateKey] = [];
    bookedSlots[dateKey].push({
      start: startValue,
      end: normalizeSlotStart(booking.timeSlot?.end),
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status
    });
  });

  return bookedSlots;
};

/**
 * @route GET /api/admin/vendors/:vendorId/slot-availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @desc  Admin-marked slot availability for a vendor in a date range
 */
exports.getVendorSlotAvailability = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { from, to } = req.query;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor id' });
    }
    if (!isValidDateKey(from) || !isValidDateKey(to) || from > to) {
      return res.status(400).json({ success: false, message: 'from and to (YYYY-MM-DD) are required' });
    }

    const availability = await VendorSlotAvailability.find({
      vendorId,
      date: { $gte: from, $lte: to }
    }).select('date slots').sort({ date: 1 }).lean();

    const bookedSlots = await getBookedSlots(vendorId, from, to);
    res.status(200).json({ success: true, availability, bookedSlots });
  } catch (error) {
    console.error('Get vendor slot availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch slot availability' });
  }
};

/**
 * @route PUT /api/admin/vendors/:vendorId/slot-availability
 * @body  { dates: ['YYYY-MM-DD', ...], slots: ['09:00', ...] }
 * @desc  Replace the available slots for each given date. An empty `slots`
 *        array marks those dates as unavailable (the day's record is removed).
 */
exports.setVendorSlotAvailability = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { dates, slots } = req.body;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor id' });
    }
    if (!Array.isArray(dates) || dates.length === 0 || dates.length > 366 || !dates.every(isValidDateKey)) {
      return res.status(400).json({ success: false, message: 'dates must be a list of YYYY-MM-DD values' });
    }
    if (!Array.isArray(slots) || !slots.every(s => SLOT_START.test(s))) {
      return res.status(400).json({ success: false, message: 'slots must be a list of HH:MM values' });
    }

    const vendor = await Vendor.findById(vendorId).select('_id');
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const uniqueDates = [...new Set(dates)].sort();
    const uniqueSlots = [...new Set(slots)].sort();
    const settings = await Settings.findOne({ type: 'global' })
      .select('slotStartHour slotEndHour slotIntervalMins disabledSlots')
      .lean();
    const slotStartMinutes = Number(settings?.slotStartHour ?? 9) * 60;
    const slotEndMinutes = Number(settings?.slotEndHour ?? 21) * 60;
    const slotMinutes = Number(settings?.slotIntervalMins) || 60;
    const disabledSlots = new Set(settings?.disabledSlots || []);

    const isConfiguredSlot = (value) => {
      const normalized = normalizeSlotStart(value);
      if (!normalized) return false;
      const [hours, minutes] = normalized.split(':').map(Number);
      const total = hours * 60 + minutes;
      return total >= slotStartMinutes
        && total < slotEndMinutes
        && (total - slotStartMinutes) % slotMinutes === 0
        && !disabledSlots.has(normalized);
    };

    if (uniqueSlots.some(slot => !isConfiguredSlot(slot))) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SLOT',
        message: 'One or more slots are not configured as active booking slots.'
      });
    }

    const { start, end } = dateRange(uniqueDates[0], uniqueDates[uniqueDates.length - 1]);
    const [existingAvailability, bookedSlots] = await Promise.all([
      VendorSlotAvailability.find({ vendorId, date: { $in: uniqueDates } }).select('date slots').lean(),
      Booking.find({
        vendorId,
        bookingType: 'scheduled',
        'hourlyTracking.isHourly': false,
        scheduledDate: { $gte: start, $lt: end },
        status: { $in: BOOKED_SLOT_STATUSES }
      }).select('scheduledDate timeSlot.start').lean()
    ]);

    const existingByDate = new Map(existingAvailability.map(record => [record.date, new Set(record.slots || [])]));
    const bookedByDate = new Map();
    bookedSlots.forEach((booking) => {
      const dateKey = booking.scheduledDate?.toISOString().slice(0, 10);
      const slot = normalizeSlotStart(booking.timeSlot?.start);
      if (!dateKey || !slot) return;
      if (!bookedByDate.has(dateKey)) bookedByDate.set(dateKey, new Set());
      bookedByDate.get(dateKey).add(slot);
    });

    const requestedSlots = new Set(uniqueSlots);
    for (const date of uniqueDates) {
      const currentSlots = existingByDate.get(date) || new Set();
      const bookedForDate = bookedByDate.get(date) || new Set();
      const changedBookedSlot = [...bookedForDate].find(slot => currentSlots.has(slot) !== requestedSlots.has(slot));
      if (changedBookedSlot) {
        return res.status(409).json({
          success: false,
          code: 'BOOKED_SLOT_PROTECTED',
          message: `Slot ${changedBookedSlot} on ${date} is already booked and cannot be changed until the booking is completed or cancelled.`
        });
      }
    }

    if (uniqueSlots.length === 0) {
      await VendorSlotAvailability.deleteMany({ vendorId, date: { $in: uniqueDates } });
    } else {
      await VendorSlotAvailability.bulkWrite(uniqueDates.map(date => ({
        updateOne: {
          filter: { vendorId, date },
          update: { $set: { slots: uniqueSlots, slotMinutes, updatedBy: req.user?._id || null } },
          upsert: true
        }
      })));
    }

    res.status(200).json({
      success: true,
      message: `Slot availability updated for ${uniqueDates.length} day(s)`
    });
  } catch (error) {
    console.error('Set vendor slot availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to update slot availability' });
  }
};

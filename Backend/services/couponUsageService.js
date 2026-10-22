const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');

const couponCapacityFilter = (couponId) => ({
  _id: couponId,
  $or: [
    { usageLimit: null },
    { usageLimit: { $exists: false } },
    { usageLimit: { $lte: 0 } },
    {
      $expr: {
        $lt: [
          {
            $add: [
              { $ifNull: ['$usedCount', 0] },
              { $ifNull: ['$reservedCount', 0] }
            ]
          },
          '$usageLimit'
        ]
      }
    }
  ]
});

const reserveCouponUsage = async (couponId) => {
  if (!couponId) return null;

  return Coupon.findOneAndUpdate(
    couponCapacityFilter(couponId),
    { $inc: { reservedCount: 1 } },
    { new: true }
  ).lean();
};

const releaseCouponReservation = async (couponId) => {
  if (!couponId) return false;

  const updated = await Coupon.findOneAndUpdate(
    { _id: couponId, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1 } },
    { new: true }
  ).lean();

  return Boolean(updated);
};

const consumeCouponReservation = async (couponId) => {
  if (!couponId) return false;

  const updated = await Coupon.findOneAndUpdate(
    { _id: couponId, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1, usedCount: 1 } },
    { new: true }
  ).lean();

  // Supports usages created before reservedCount was introduced.
  if (!updated) {
    const fallback = await Coupon.findByIdAndUpdate(
      couponId,
      { $inc: { usedCount: 1 } },
      { new: true }
    ).lean();
    return Boolean(fallback);
  }

  return true;
};

const settleCouponUsage = async ({ bookingId, paymentId = null }) => {
  if (!bookingId) return { consumed: false, reason: 'NO_BOOKING' };

  const usage = await CouponUsage.findOneAndUpdate(
    { bookingId, status: 'APPLIED' },
    {
      $set: {
        status: 'CONSUMED',
        paymentId: paymentId || null
      }
    },
    { new: true }
  ).lean();

  if (!usage) {
    return { consumed: false, reason: 'ALREADY_SETTLED_OR_NOT_FOUND' };
  }

  await consumeCouponReservation(usage.couponId);
  return { consumed: true, usage };
};

const cancelCouponUsage = async (bookingId) => {
  if (!bookingId) return { restored: false, reason: 'NO_BOOKING' };

  // Claim the usage first so repeated cancellation/scheduler calls cannot
  // restore the same coupon capacity twice.
  const usage = await CouponUsage.findOneAndUpdate(
    {
      bookingId,
      status: { $in: ['APPLIED', 'CONSUMED'] }
    },
    { $set: { status: 'CANCELLED' } },
    { new: false }
  ).lean();

  if (!usage) {
    return { restored: false, reason: 'ALREADY_CANCELLED_OR_NOT_FOUND' };
  }

  if (usage.status === 'CONSUMED') {
    await Coupon.findOneAndUpdate(
      { _id: usage.couponId, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      { new: true }
    );
  } else {
    await releaseCouponReservation(usage.couponId);
  }

  return { restored: true, previousStatus: usage.status };
};

module.exports = {
  reserveCouponUsage,
  releaseCouponReservation,
  consumeCouponReservation,
  settleCouponUsage,
  cancelCouponUsage
};
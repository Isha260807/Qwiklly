const mongoose = require('mongoose');

/**
 * CouponUsage Model
 * Tracks every redemption / audit event of a coupon by users on specific bookings
 */
const couponUsageSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: [true, 'Coupon is required'],
    index: true
  },
  couponCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    index: true
  },
  paymentId: {
    type: String,
    default: null
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderAmount: {
    type: Number,
    required: true,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['APPLIED', 'CONSUMED', 'CANCELLED', 'REFUNDED'],
    default: 'APPLIED',
    index: true
  }
}, {
  timestamps: true
});

// Compound unique index prevents duplicate consumption records for the same booking
couponUsageSchema.index({ couponId: 1, bookingId: 1 });
couponUsageSchema.index({ userId: 1, couponId: 1, status: 1 });

module.exports = mongoose.model('CouponUsage', couponUsageSchema);

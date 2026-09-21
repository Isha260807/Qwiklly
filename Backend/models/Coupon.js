const mongoose = require('mongoose');

/**
 * Coupon Model
 * Represents discount coupons created by admin and applicable by users
 */
const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Coupon code must be at least 3 characters'],
    maxlength: [30, 'Coupon code cannot exceed 30 characters'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED'],
    required: [true, 'Discount type is required'],
    default: 'PERCENTAGE'
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0.01, 'Discount value must be greater than 0']
  },
  maxDiscount: {
    type: Number,
    default: null, // null means no cap for percentage discount
    min: [0, 'Max discount must be non-negative']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount must be non-negative']
  },
  usageLimit: {
    type: Number,
    default: null // null means unlimited global usage
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  perUserLimit: {
    type: Number,
    default: 1,
    min: [1, 'Per user limit must be at least 1']
  },
  startAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  // Scope / Applicability filters
  applicableServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  applicableCities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City'
  }],
  applicableProviders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  }],
  // User Constraints
  firstOrderOnly: {
    type: Boolean,
    default: false
  },
  newUserOnly: {
    type: Boolean,
    default: false
  },
  allowedPaymentMethods: [{
    type: String,
    enum: ['online', 'cash', 'wallet', 'pay_at_home', 'all']
  }],
  stackable: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Normalize coupon code before saving
couponSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

// Compound indexes for optimal queries
couponSchema.index({ code: 1, isActive: 1, isDeleted: 1 });
couponSchema.index({ startAt: 1, expiresAt: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('Coupon', couponSchema);

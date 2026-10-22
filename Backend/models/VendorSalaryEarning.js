const mongoose = require('mongoose');

/**
 * Salary ledger for vendors.
 * Every booking has at most one booking-earning record. Manual salary,
 * bonus, and incentive credits are also stored here so the vendor can see
 * one consistent, date-filterable earning history.
 */
const vendorSalaryEarningSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    index: true
  },
  payrollPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorPayrollPayment',
    default: null,
    index: true
  },
  sourceKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['booking_earning', 'salary', 'bonus', 'incentive', 'adjustment', 'custom'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending_rate', 'accrued', 'paid', 'reversed'],
    default: 'accrued',
    index: true
  },
  earningDate: {
    type: Date,
    required: true,
    index: true
  },
  durationMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  rateAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  rateUnitMinutes: {
    type: Number,
    enum: [30, 60],
    default: 60
  },
  billableUnits: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

vendorSalaryEarningSchema.index({ vendorId: 1, earningDate: -1 });
vendorSalaryEarningSchema.index({ vendorId: 1, status: 1, earningDate: -1 });
vendorSalaryEarningSchema.index({ vendorId: 1, bookingId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('VendorSalaryEarning', vendorSalaryEarningSchema);

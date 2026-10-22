const mongoose = require('mongoose');

/**
 * A manual weekly/monthly salary payout made by an admin.
 * Booking earnings included in the period are linked to this record and
 * marked paid; salary/bonus/incentive amounts are separate ledger credits.
 */
const vendorPayrollPaymentSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  periodType: {
    type: String,
    enum: ['week', 'month', 'custom'],
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  bookingEarningsAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  salaryAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  bonusAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  incentiveAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  adjustmentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  customItems: [{
    label: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'cash', 'other'],
    required: true
  },
  paymentReference: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['processing', 'paid', 'cancelled'],
    default: 'processing',
    index: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  ledgerEntryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorSalaryEarning'
  }]
}, {
  timestamps: true
});

vendorPayrollPaymentSchema.index({ vendorId: 1, periodType: 1, periodStart: 1 }, { unique: true });
vendorPayrollPaymentSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('VendorPayrollPayment', vendorPayrollPaymentSchema);

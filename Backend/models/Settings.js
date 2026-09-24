const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'global',
    unique: true
  },
  visitedCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  instantBookingCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  serviceGstPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  partsGstPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  servicePayoutPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  partsPayoutPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tdsPercentage: {
    type: Number,
    default: 1, // 1% default TDS u/s 194-O
    min: 0,
    max: 100
  },
  platformFeePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  vendorCashLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  cancellationPenalty: {
    type: Number,
    default: 0,
    min: 0
  },
  maxSearchTime: {
    type: Number,
    default: 5, // 5 minutes default
    min: 1
  },
  waveDuration: {
    type: Number,
    default: 60, // 60 seconds per wave default
    min: 10
  },
  searchRadius: {
    type: Number,
    default: 5, // 5 km default search radius
    min: 1
  },
  paymentTimeoutMinutes: {
    type: Number,
    default: 15, // Release vendor & re-search if unpaid after this many minutes
    min: 1
  },
  // Razorpay Settings
  razorpayKeyId: {
    type: String,
    default: null
  },
  razorpayKeySecret: {
    type: String,
    default: null
  },
  razorpayWebhookSecret: {
    type: String,
    default: null
  },
  // Cloudinary Settings
  cloudinaryCloudName: {
    type: String,
    default: null
  },
  cloudinaryApiKey: {
    type: String,
    default: null
  },
  cloudinaryApiSecret: {
    type: String,
    default: null
  },
  // Future extensible fields
  currency: {
    type: String,
    default: 'INR'
  },

  // Billing & Invoice Configuration
  companyName: {
    type: String,
    default: 'TodayMyDream'
  },
  companyGSTIN: {
    type: String,
    default: ''
  },
  companyPAN: {
    type: String,
    default: ''
  },
  companyAddress: {
    type: String,
    default: ''
  },
  companyCity: {
    type: String,
    default: ''
  },
  companyState: {
    type: String,
    default: ''
  },
  companyPincode: {
    type: String,
    default: ''
  },
  companyPhone: {
    type: String,
    default: ''
  },
  companyEmail: {
    type: String,
    default: ''
  },

  // Invoice Settings
  invoicePrefix: {
    type: String,
    default: 'INV'
  },
  sacCode: {
    type: String,
    default: '998599'  // Event services SAC code
  },
  currentInvoiceNumber: {
    type: Number,
    default: 0
  },

  // Support Settings
  supportEmail: {
    type: String,
    default: ''
  },
  supportPhone: {
    type: String,
    default: ''
  },
  supportWhatsapp: {
    type: String,
    default: ''
  },
  isOnlinePaymentEnabled: {
    type: Boolean,
    default: true
  },

  // Dynamic Booking & Time Slot Configuration
  slotStartHour: {
    type: Number,
    default: 9, // 9 AM
    min: 0,
    max: 23
  },
  slotEndHour: {
    type: Number,
    default: 21, // 9 PM
    min: 1,
    max: 24
  },
  slotIntervalMins: {
    type: Number,
    default: 60, // 60 min intervals
    enum: [30, 45, 60, 90, 120]
  },
  maxDaysInAdvance: {
    type: Number,
    default: 7, // 7 days in date picker
    min: 1,
    max: 30
  },
  leadTimeHours: {
    type: Number,
    default: 1, // 1 hour minimum notice for same-day
    min: 0
  },
  slotServiceDurationMins: {
    type: Number,
    default: 45, // "Service will take approx 45 mins"
    min: 15
  },
  disabledSlots: {
    type: [String], // Array of slot values like ["13:00", "14:00"]
    default: []
  },
  customSlots: [{
    value: { type: String, required: true },
    end: { type: String, required: true },
    display: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);

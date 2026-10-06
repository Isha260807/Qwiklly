const mongoose = require('mongoose');
const { SERVICE_STATUS } = require('../utils/constants');

/**
 * User Service Model
 * Represents individual services strictly under a Brand
 * separate from internal services or global services
 */
const userServiceSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    default: null,
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a service title'],
    trim: true,
    index: true
  },
  slug: {
    type: String,
    lowercase: true,
    index: true
  },
  iconUrl: {
    type: String,
    default: null
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    default: 0
  },
  discountPrice: {
    type: Number,
    default: null
  },
  // ==========================================
  // Pricing Configuration (FIXED | DURATION)
  // ==========================================
  pricingType: {
    type: String,
    enum: ['FIXED', 'DURATION', 'HOURLY'],
    default: 'FIXED',
    index: true
  },
  fixedPrice: {
    type: Number,
    default: null,
    min: [0, 'Fixed price cannot be negative']
  },
  estimatedDurationMinutes: {
    type: Number,
    default: 30,
    min: 1
  },
  // Duration-based pricing. `pricePer30Minutes` remains for backwards
  // compatibility with older services; new services use the generic
  // billing-unit fields below.
  pricePerUnit: {
    type: Number,
    default: null,
    min: [0, 'Price per billing unit cannot be negative']
  },
  billingUnitMinutes: {
    type: Number,
    default: 30,
    min: [1, 'Billing unit must be at least 1 minute']
  },
  pricePer30Minutes: {
    type: Number,
    default: null,
    min: [0, 'Price per 30 minutes cannot be negative']
  },
  minDurationMinutes: {
    type: Number,
    default: 30,
    min: 1
  },
  maxDurationMinutes: {
    type: Number,
    default: 180,
    min: 1
  },
  durationStepMinutes: {
    type: Number,
    default: 30
  },
  durationPricing: {
    pricePerUnit: { type: Number, default: null },
    billingUnitMinutes: { type: Number, default: 30 },
    pricePer30Minutes: { type: Number, default: null },
    minDurationMinutes: { type: Number, default: 30 },
    maxDurationMinutes: { type: Number, default: 180 },
    durationStepMinutes: { type: Number, default: 30 }
  },
  // Backward compatibility fields
  hourlyRate: {
    type: Number,
    default: null,
    min: [0, 'Hourly rate cannot be negative']
  },
  minHours: {
    type: Number,
    default: 0.5,
    min: 0
  },
  maxHours: {
    type: Number,
    default: 8,
    min: 0
  },
  allowCustomHours: {
    type: Boolean,
    default: false
  },
  allowExtraHours: {
    type: Boolean,
    default: true
  },
  allowExtraParts: {
    type: Boolean,
    default: true
  },
  gstPercentage: {
    type: Number,
    default: 18,
    min: 0
  },
  rating: {
    type: Number,
    default: 4.9,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: String,
    default: '4.9 (237.6k)'
  },
  badge: {
    type: String,
    default: null,
    trim: true
  },
  tagline: {
    type: String,
    default: null,
    trim: true
  },
  heroBanner: {
    imageUrl: { type: String, default: null },
    buttonText: { type: String, default: 'BOOK NOW' }
  },
  inclusions: [{
    title: { type: String, trim: true },
    name: { type: String, trim: true },
    duration: { type: String, trim: true },
    iconUrl: { type: String, default: null },
    description: { type: String, default: null }
  }],
  whyLoveTitle: {
    type: String,
    default: null,
    trim: true
  },
  whyLove: [{
    text: { type: String, trim: true }
  }],
  exclusionsTitle: {
    type: String,
    default: null,
    trim: true
  },
  exclusions: [{
    text: { type: String, trim: true }
  }],
  howItWorksTitle: {
    type: String,
    default: null,
    trim: true
  },
  howItWorks: [{
    stepNumber: { type: Number, default: 1 },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    iconUrl: { type: String, default: null }
  }],
  faqs: [{
    question: { type: String, trim: true },
    answer: { type: String, trim: true }
  }],
  cityIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true
  }],
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true
  },
  // If empty, service is available in every active zone. If non-empty, the
  // resolved booking zone MUST be in this list or booking fails with
  // SERVICE_NOT_AVAILABLE_IN_ZONE.
  zoneIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    index: true
  }],
  // Per-service override of the global vendor-matching radius (km).
  // Falls back to Settings.searchRadius when not set.
  serviceRadiusKm: {
    type: Number,
    default: null,
    min: 1
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: Object.values(SERVICE_STATUS),
    default: SERVICE_STATUS.ACTIVE,
    index: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

userServiceSchema.index({ status: 1, displayOrder: 1 });

module.exports = mongoose.model('UserService', userServiceSchema);

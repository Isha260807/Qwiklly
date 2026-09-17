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

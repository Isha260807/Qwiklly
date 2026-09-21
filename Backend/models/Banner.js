const mongoose = require('mongoose');

/**
 * Banner Model
 * Manages promotional and hero banners across the platform
 */
const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    default: ''
  },
  subtitle: {
    type: String,
    trim: true,
    default: ''
  },
  imageUrl: {
    type: String,
    required: [true, 'Banner image URL is required'],
    trim: true
  },
  bannerType: {
    type: String,
    enum: ['top', 'hero', 'footer', 'bottom', 'promo', 'middle', 'popup'],
    default: 'top'
  },
  position: {
    type: String,
    enum: ['top', 'middle', 'bottom', 'footer'],
    default: 'top'
  },
  // City association - if null, shown in all cities
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    default: null,
    index: true
  },
  // Action/Click redirection configuration
  targetType: {
    type: String,
    enum: ['none', 'category', 'service', 'url'],
    default: 'none'
  },
  targetCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  targetServiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService',
    default: null
  },
  targetUrl: {
    type: String,
    trim: true,
    default: ''
  },
  buttonText: {
    type: String,
    trim: true,
    default: 'Book Now'
  },
  badgeText: {
    type: String,
    trim: true,
    default: ''
  },
  gradientClass: {
    type: String,
    default: 'from-blue-600 to-indigo-700'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for fast query on active banners sorted by order
bannerSchema.index({ isActive: 1, bannerType: 1, cityId: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);

const mongoose = require('mongoose');

/**
 * Cart Model
 * Stores user's cart items per user
 */
const cartItemSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService',
    required: false
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: false,
    default: 'General'
  },
  categoryTitle: {
    type: String,
    default: ''
  },
  categoryIcon: {
    type: String,
    default: null
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  originalPrice: {
    type: Number,
    default: null
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  serviceCount: {
    type: Number,
    default: 1,
    min: 1
  },
  // Pricing Type: FIXED or DURATION
  pricingType: {
    type: String,
    enum: ['FIXED', 'DURATION', 'HOURLY'],
    default: 'FIXED'
  },
  // Duration in minutes for DURATION-priced services (multiples of 30)
  durationMinutes: {
    type: Number,
    default: null
  },
  // Price per 30 minutes for DURATION-priced services
  pricePer30Minutes: {
    type: Number,
    default: null
  },
  minDurationMinutes: {
    type: Number,
    default: 30
  },
  maxDurationMinutes: {
    type: Number,
    default: 480
  },
  // Selected hours for legacy HOURLY-priced services (null for FIXED items)
  hours: {
    type: Number,
    default: null,
    min: 0
  },
  rating: {
    type: String,
    default: '4.8'
  },
  reviews: {
    type: String,
    default: '10k+'
  },
  // Section / Brand info (from service catalog)
  sectionTitle: {
    type: String,
    default: ''
  },
  sectionIcon: {
    type: String,
    default: null
  },
  sectionId: {
    type: String,
    default: null
  },
  // Card details (matching service catalog structure)
  card: {
    title: String,
    subtitle: String,
    price: Number,
    originalPrice: Number,
    duration: String,
    description: String,
    imageUrl: String,
    features: [String]
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  items: [cartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update updatedAt on save
cartSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);


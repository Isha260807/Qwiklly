const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  referralCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'rewarded', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  referrerRewardAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  referredRewardAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  qualifyingBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  rewardTransactionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  capturedAt: {
    type: Date,
    default: Date.now
  },
  rewardedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

referralSchema.index({ referrerId: 1, createdAt: -1 });

module.exports = mongoose.model('Referral', referralSchema);

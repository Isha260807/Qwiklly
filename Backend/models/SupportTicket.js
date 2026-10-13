const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  requesterName: {
    type: String,
    required: true,
    trim: true
  },
  requesterEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  requesterPhone: {
    type: String,
    trim: true,
    default: ''
  },
  bookingId: {
    type: String,
    trim: true,
    default: ''
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  adminResponse: {
    type: String,
    trim: true,
    default: ''
  },
  respondedAt: {
    type: Date,
    default: null
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

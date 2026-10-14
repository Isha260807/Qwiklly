const mongoose = require('mongoose');

/**
 * Audit/idempotency record for presence events. The unique vendor/eventId
 * pair makes client retries safe when the same event id is sent again.
 */
const vendorPresenceEventSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  requestedOnline: {
    type: Boolean,
    required: true
  },
  accepted: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    default: null
  },
  effectiveOnline: {
    type: Boolean,
    default: false
  },
  dateKey: {
    type: String,
    required: true
  },
  occurredAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

vendorPresenceEventSchema.index({ vendorId: 1, eventId: 1 }, { unique: true });
vendorPresenceEventSchema.index({ vendorId: 1, occurredAt: -1 });

module.exports = mongoose.model('VendorPresenceEvent', vendorPresenceEventSchema);

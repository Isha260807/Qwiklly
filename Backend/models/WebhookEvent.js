const mongoose = require('mongoose');

/**
 * Ledger of inbound payment-provider webhook deliveries. The unique index on
 * (provider, eventId) is the idempotency gate: only one delivery can ever insert
 * the row, so only one delivery can own the processing of a given event.
 */
const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, default: 'razorpay', required: true },
  eventId: { type: String, required: true },
  eventType: { type: String, default: null },
  // processing -> processed | ignored | failed. `failed` and stale `processing`
  // rows may be re-claimed by a retry delivery.
  status: {
    type: String,
    enum: ['processing', 'processed', 'ignored', 'failed'],
    default: 'processing',
    index: true
  },
  razorpayOrderId: { type: String, default: null, index: true },
  razorpayPaymentId: { type: String, default: null },
  attempts: { type: Number, default: 1 },
  lockedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
  result: { type: String, default: null }, // short machine-readable outcome, never raw payload
  lastError: { type: String, default: null }
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);

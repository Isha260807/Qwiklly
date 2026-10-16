const mongoose = require('mongoose');

/**
 * Round-robin state for scheduled bookings.
 *
 * The cursor is deliberately advanced only after a slot booking is committed
 * (payment success / plan-covered / accepted cash booking). A booking that is
 * still waiting for payment only carries a version snapshot on the booking.
 */
const slotAssignmentCursorSchema = new mongoose.Schema({
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true,
    index: true
  },
  // Scheduled slot bookings use one round-robin pool per operational zone.
  // Keep this separate from serviceId so different services do not reset the
  // rotation back to the first vendor.
  poolKey: {
    type: String,
    default: null
  },
  // Legacy per-service value retained only for old cursor documents.
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService',
    default: null,
    index: true
  },
  lastCommittedVendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  version: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// The old zoneId+serviceId index is intentionally retained for backwards
// compatibility with cursor documents created by the previous per-service
// implementation. New shared-pool documents are unique by poolKey.
slotAssignmentCursorSchema.index({ poolKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('SlotAssignmentCursor', slotAssignmentCursorSchema);

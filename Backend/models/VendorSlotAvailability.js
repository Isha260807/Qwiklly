const mongoose = require('mongoose');

/**
 * VendorSlotAvailability
 * Admin-managed, per-day slot availability for a vendor. Used ONLY by SLOT
 * (scheduled) bookings: a vendor can be auto-assigned to a slot only when the
 * admin has marked that slot as available for that date. Instant/hourly
 * dispatch does not read this collection.
 *
 * `date` is a YYYY-MM-DD key (same UTC date key used for booking.scheduledDate)
 * and `slots` holds slot start values ("HH:MM") generated from the global
 * slot settings (slotStartHour / slotIntervalMins).
 */
const vendorSlotAvailabilitySchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  slots: {
    type: [String],
    default: []
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

vendorSlotAvailabilitySchema.index({ vendorId: 1, date: 1 }, { unique: true });
vendorSlotAvailabilitySchema.index({ date: 1 });

module.exports = mongoose.model('VendorSlotAvailability', vendorSlotAvailabilitySchema);

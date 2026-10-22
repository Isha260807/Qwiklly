const mongoose = require('mongoose');

/**
 * One attendance summary per vendor per local calendar day.
 *
 * We intentionally store a summary instead of multiple work sessions:
 * firstOnlineAt is the day start and lastOfflineAt is the manual day end.
 */
const vendorAttendanceSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  dateKey: {
    type: String,
    required: true
  },
  firstOnlineAt: {
    type: Date,
    default: null
  },
  lastOfflineAt: {
    type: Date,
    default: null
  },
  dayStatus: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN'
  },
  manualOffAt: {
    type: Date,
    default: null
  },
  endReason: {
    type: String,
    default: null
  },
  lastEventAt: {
    type: Date,
    default: null
  },
  lastEventSource: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

vendorAttendanceSchema.index({ vendorId: 1, dateKey: 1 }, { unique: true });
vendorAttendanceSchema.index({ dateKey: 1, dayStatus: 1 });

module.exports = mongoose.model('VendorAttendance', vendorAttendanceSchema);

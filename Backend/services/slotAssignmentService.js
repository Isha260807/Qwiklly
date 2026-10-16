const Booking = require('../models/Booking');
const SlotAssignmentCursor = require('../models/SlotAssignmentCursor');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const SLOT_ASSIGNMENT_STATE = Object.freeze({
  TENTATIVE: 'TENTATIVE',
  COMMITTING: 'COMMITTING',
  COMMITTED: 'COMMITTED',
  RELEASED: 'RELEASED'
});

const getCursor = async (zoneId) => {
  if (!zoneId) return null;
  const poolKey = String(zoneId);
  const cursor = await SlotAssignmentCursor.findOne({ poolKey }).lean();
  if (cursor) return cursor;
  const legacyCursor = await SlotAssignmentCursor.findOne({ zoneId, lastCommittedVendorId: { $ne: null } })
    .sort({ updatedAt: -1 })
    .lean();
  return legacyCursor
    ? { lastCommittedVendorId: legacyCursor.lastCommittedVendorId, version: 0 }
    : null;
};

const orderVendorsFromCursor = (vendors = [], cursor = null) => {
  const stable = [...vendors].sort((a, b) => String(a._id).localeCompare(String(b._id)));
  if (stable.length < 2 || !cursor?.lastCommittedVendorId) return stable;

  const lastId = String(cursor.lastCommittedVendorId);
  const lastIndex = stable.findIndex(vendor => String(vendor._id) === lastId);
  if (lastIndex < 0) return stable;

  return stable.slice(lastIndex + 1).concat(stable.slice(0, lastIndex + 1));
};

/**
 * Returns a version from the shared zone-level cursor. All scheduled services
 * in the zone use the same round-robin pool.
 */
const getSelectionContext = async ({ zoneId, vendors }) => {
  const cursor = await getCursor(zoneId);
  return {
    cursor,
    version: Number(cursor?.version || 0),
    vendors: orderVendorsFromCursor(vendors, cursor)
  };
};

/**
 * Advance the pool cursor exactly once for a successfully committed booking.
 * If another payment already advanced the same pool after this booking was
 * selected, the stale payment does not move the pointer backwards.
 */
const advanceCursorAfterCommit = async ({ zoneId, vendorId, selectionVersion }) => {
  if (!zoneId || !vendorId) return { advanced: false, stale: false };
  const poolKey = String(zoneId);

  const expectedVersion = Number.isFinite(Number(selectionVersion))
    ? Number(selectionVersion)
    : 0;

  const cursor = await SlotAssignmentCursor.findOneAndUpdate(
    {
      poolKey,
      version: expectedVersion
    },
    {
      $set: {
        lastCommittedVendorId: vendorId,
        updatedAt: new Date()
      },
      $inc: { version: 1 }
    },
    { new: true }
  );

  if (cursor) return { advanced: true, stale: false, cursor };

  // First commit creates the cursor only if the expected version was zero.
  // The unique pool key plus the version predicate makes concurrent first
  // payments first-wins; the loser is treated as stale.
  if (expectedVersion === 0) {
    try {
      const created = await SlotAssignmentCursor.create({
        zoneId,
        poolKey,
        serviceId: null,
        lastCommittedVendorId: vendorId,
        version: 1
      });
      return { advanced: true, stale: false, cursor: created };
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  return { advanced: false, stale: true };
};

/**
 * Commit a tentative scheduled assignment after the payment has already been
 * atomically marked successful. This function is idempotent and also repairs a
 * COMMITTING booking if the process stopped between cursor and booking writes.
 */
const commitSlotAssignmentAfterPayment = async (booking) => {
  if (!booking || booking.bookingType !== 'scheduled') {
    return { committed: false, skipped: true, booking };
  }

  const isCashScheduledBooking = booking.paymentMethod === 'cash';
  if (!isCashScheduledBooking && ![PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.PLAN_COVERED].includes(booking.paymentStatus)) {
    return { committed: false, skipped: true, booking };
  }

  if (booking.slotAssignment?.state === SLOT_ASSIGNMENT_STATE.COMMITTED) {
    return { committed: true, alreadyCommitted: true, booking };
  }

  if (!booking.vendorId) {
    return { committed: false, skipped: true, booking };
  }

  const bookingId = booking._id;
  const tentative = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      bookingType: 'scheduled',
      vendorId: booking.vendorId,
      paymentStatus: { $in: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.PLAN_COVERED, ...(isCashScheduledBooking ? [PAYMENT_STATUS.PENDING] : [])] },
      status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
      'slotAssignment.state': { $in: [SLOT_ASSIGNMENT_STATE.TENTATIVE, SLOT_ASSIGNMENT_STATE.COMMITTING] }
    },
    {
      $set: {
        'slotAssignment.state': SLOT_ASSIGNMENT_STATE.COMMITTING,
        'slotAssignment.committingAt': new Date()
      }
    },
    { new: true }
  );

  if (!tentative) {
    const current = await Booking.findById(bookingId);
    return current?.slotAssignment?.state === SLOT_ASSIGNMENT_STATE.COMMITTED
      ? { committed: true, alreadyCommitted: true, booking: current }
      : { committed: false, skipped: true, booking: current || booking };
  }

  const cursorResult = await advanceCursorAfterCommit({
    zoneId: tentative.zoneId,
    // Service is intentionally not part of the shared zone-level cursor.
    vendorId: tentative.vendorId,
    selectionVersion: tentative.slotAssignment?.selectionVersion
  });

  const committed = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      paymentStatus: { $in: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.PLAN_COVERED, ...(isCashScheduledBooking ? [PAYMENT_STATUS.PENDING] : [])] },
      status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
      'slotAssignment.state': SLOT_ASSIGNMENT_STATE.COMMITTING
    },
    {
      $set: {
        status: BOOKING_STATUS.CONFIRMED,
        vendorAssignmentStatus: 'ACCEPTED',
        assignedAt: new Date(),
        acceptedAt: new Date(),
        'slotAssignment.state': SLOT_ASSIGNMENT_STATE.COMMITTED,
        'slotAssignment.committedAt': new Date(),
        'slotAssignment.cursorAdvanced': Boolean(cursorResult.advanced),
        'slotAssignment.cursorStale': Boolean(cursorResult.stale)
      }
    },
    { new: true }
  );

  return committed
    ? { committed: true, alreadyCommitted: false, cursorResult, booking: committed }
    : { committed: false, skipped: true, cursorResult, booking: tentative };
};

module.exports = {
  SLOT_ASSIGNMENT_STATE,
  getCursor,
  getSelectionContext,
  orderVendorsFromCursor,
  advanceCursorAfterCommit,
  commitSlotAssignmentAfterPayment
};

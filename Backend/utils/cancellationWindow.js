const { BOOKING_STATUS } = require('./constants');

// Once a vendor accepts a booking the customer has this long to cancel for free.
const CANCELLATION_WINDOW_MS = (Number(process.env.USER_CANCEL_WINDOW_MINUTES) || 3) * 60 * 1000;

// Statuses from which the customer may still cancel (subject to the window).
const USER_CANCELLABLE_STATUSES = [
  BOOKING_STATUS.SEARCHING,
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.AWAITING_PAYMENT,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.NO_VENDORS,
  BOOKING_STATUS.PENDING_ADMIN
];

/**
 * Decide whether the customer can cancel right now.
 *  - No vendor accepted yet: always allowed (nobody's time is used).
 *  - Vendor accepted: allowed only for CANCELLATION_WINDOW_MS after acceptance
 *    and only until the vendor starts the journey.
 */
const getCancellationState = (booking, now = new Date()) => {
  const base = { serverTime: now.toISOString(), windowMs: CANCELLATION_WINDOW_MS };

  if (!USER_CANCELLABLE_STATUSES.includes(booking.status)) {
    return { ...base, canCancel: false, cancelDeadline: null, reason: 'STATUS_NOT_CANCELLABLE' };
  }
  if (booking.journeyStartedAt) {
    return { ...base, canCancel: false, cancelDeadline: null, reason: 'JOURNEY_STARTED' };
  }
  if (!booking.acceptedAt) {
    return { ...base, canCancel: true, cancelDeadline: null, reason: null };
  }

  const deadline = new Date(new Date(booking.acceptedAt).getTime() + CANCELLATION_WINDOW_MS);
  if (now > deadline) {
    return { ...base, canCancel: false, cancelDeadline: deadline.toISOString(), reason: 'WINDOW_EXPIRED' };
  }
  return { ...base, canCancel: true, cancelDeadline: deadline.toISOString(), reason: null };
};

module.exports = { CANCELLATION_WINDOW_MS, USER_CANCELLABLE_STATUSES, getCancellationState };

const crypto = require('crypto');
const Booking = require('../../models/Booking');
const Settings = require('../../models/Settings');
const WebhookEvent = require('../../models/WebhookEvent');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../../utils/constants');
const { verifyWebhookSignature } = require('../../services/razorpayService');
const { finalizePaymentSuccess } = require('./paymentController');

/**
 * Razorpay webhook (server-to-server) — an authoritative, independent source of payment truth.
 *
 * Mounted in server.js with express.raw() BEFORE express.json(), so `req.body` is the exact
 * Buffer Razorpay signed. Flow:
 *   1. verify HMAC-SHA256 signature over the raw bytes (constant time)  -> 400 on failure
 *   2. parse JSON                                                       -> 400 on failure
 *   3. claim the event id atomically (unique index)                     -> duplicates acked, in-flight 409
 *   4. validate against OUR database records (order, amount, currency)  -> then apply
 *   5. mark event processed, ack 200. Any unexpected error -> 5xx so Razorpay retries.
 */

const PROVIDER = 'razorpay';
const LOCK_TTL_MS = 2 * 60 * 1000; // a 'processing' claim older than this is considered abandoned
const HANDLED_EVENTS = new Set(['payment.captured', 'payment.failed', 'order.paid']);

// Structured, secret-free logging. Only identifiers and outcome codes are ever logged.
const log = (level, message, fields = {}) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), scope: 'RazorpayWebhook', level, message, ...fields });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
};

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const str = (value) => (value === undefined || value === null ? null : String(value));
const truncate = (value, max = 500) => (value === null || value === undefined ? null : String(value).slice(0, max));

const resolveSecret = async () => {
  // Settings (admin-configurable) keeps working; the environment variable is the primary source.
  if (process.env.RAZORPAY_WEBHOOK_SECRET) return process.env.RAZORPAY_WEBHOOK_SECRET;
  const settings = await Settings.findOne({ type: 'global' }).select('razorpayWebhookSecret').lean();
  return settings?.razorpayWebhookSecret || null;
};

/** Atomically claim ownership of an event. */
const claimEvent = async ({ eventId, eventType, orderId, paymentId }) => {
  try {
    await WebhookEvent.create({
      provider: PROVIDER, eventId, eventType,
      razorpayOrderId: orderId, razorpayPaymentId: paymentId
    });
    return { claimed: true };
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  const existing = await WebhookEvent.findOne({ provider: PROVIDER, eventId });
  if (!existing) return claimEvent({ eventId, eventType, orderId, paymentId }); // row vanished (TTL/cleanup) — retry once more
  if (['processed', 'ignored'].includes(existing.status)) return { duplicate: true, status: existing.status };

  // 'failed' (earlier attempt errored) or a stale 'processing' claim: take it over — but only one caller wins.
  const reclaimed = await WebhookEvent.findOneAndUpdate(
    {
      _id: existing._id,
      $or: [
        { status: 'failed' },
        { status: 'processing', lockedAt: { $lt: new Date(Date.now() - LOCK_TTL_MS) } }
      ]
    },
    { $set: { status: 'processing', lockedAt: new Date() }, $inc: { attempts: 1 } },
    { new: true }
  );
  return reclaimed ? { claimed: true, retried: true } : { inFlight: true };
};

const finishEvent = (eventId, status, result, lastError = null) =>
  WebhookEvent.updateOne(
    { provider: PROVIDER, eventId },
    { $set: { status, result, lastError: truncate(lastError), processedAt: status === 'failed' ? null : new Date() } }
  );

/** Locate the DB record an order id belongs to, and the amount (in paise) we expect for it. */
const resolveOrder = async (orderId) => {
  const booking = await Booking.findOne({ razorpayOrderId: orderId });
  if (booking) {
    return { kind: 'booking', booking, expectedPaise: Math.round(Number(booking.razorpayOrderAmount || 0) * 100) };
  }
  const extraBooking = await Booking.findOne({ 'hourlyTracking.extraRazorpayOrderId': orderId });
  if (extraBooking) {
    return {
      kind: 'extra',
      booking: extraBooking,
      expectedPaise: Math.round(Number(extraBooking.hourlyTracking?.extraAmount || 0) * 100)
    };
  }
  return null;
};

/**
 * Validate gateway data against our record. Returns null when valid, else a reason code.
 * Nothing taken from the webhook is trusted until it matches the order we created.
 */
const validateAgainstRecord = ({ paymentEntity, orderEntity, resolved, orderId }) => {
  if (paymentEntity.order_id !== orderId) return 'order_id_mismatch';
  if (!(resolved.expectedPaise > 0)) return 'no_expected_amount';
  if (String(paymentEntity.currency || '').toUpperCase() !== 'INR') return 'currency_mismatch';
  if (Number(paymentEntity.amount) !== resolved.expectedPaise) return 'amount_mismatch';

  if (orderEntity) {
    if (String(orderEntity.currency || '').toUpperCase() !== 'INR') return 'currency_mismatch';
    if (Number(orderEntity.amount) !== resolved.expectedPaise) return 'amount_mismatch';
    if (Number(orderEntity.amount_paid) !== resolved.expectedPaise) return 'amount_paid_mismatch';
  }

  // Order notes were written by us at order-creation time; if present they must point at this booking and user.
  const notes = { ...asObject(paymentEntity.notes), ...asObject(orderEntity?.notes) };
  if (notes.bookingId && String(notes.bookingId) !== String(resolved.booking._id)) return 'booking_note_mismatch';
  if (notes.userId && String(notes.userId) !== String(resolved.booking.userId)) return 'user_note_mismatch';
  return null;
};

const recordCapture = (booking, paymentEntity, eventId) =>
  Booking.updateOne(
    { _id: booking._id, paymentStatus: PAYMENT_STATUS.SUCCESS, 'razorpayCapture.capturedAt': null },
    {
      $set: {
        razorpayCapture: {
          amount: Number(paymentEntity.amount),
          currency: paymentEntity.currency,
          method: str(paymentEntity.method),
          capturedAt: paymentEntity.created_at ? new Date(Number(paymentEntity.created_at) * 1000) : new Date(),
          eventId
        }
      },
      $unset: { paymentFailure: '' }
    }
  );

/** payment.captured and order.paid share the same verified-success path. */
const applyPaymentSuccess = async ({ eventId, eventType, paymentEntity, orderEntity }) => {
  if (!paymentEntity?.id || !paymentEntity?.order_id) return { status: 'ignored', result: 'missing_payment_entity' };
  const orderId = paymentEntity.order_id;

  if (eventType === 'payment.captured' && paymentEntity.status !== 'captured') {
    return { status: 'ignored', result: 'payment_not_captured' };
  }
  if (eventType === 'order.paid' && orderEntity?.status !== 'paid') {
    return { status: 'ignored', result: 'order_not_paid' };
  }

  const resolved = await resolveOrder(orderId);
  if (!resolved) {
    // e.g. plan-purchase orders (verified client-side only) or an order superseded by a newer one.
    log('warn', 'no_record_for_order', { eventId, eventType, orderId, paymentId: paymentEntity.id });
    return { status: 'ignored', result: 'no_record_for_order' };
  }

  const problem = validateAgainstRecord({ paymentEntity, orderEntity, resolved, orderId });
  if (problem) {
    // Not retryable (retrying cannot change the facts) — ack so Razorpay stops, but make it loud for reconciliation.
    log('error', 'payment_validation_failed', {
      eventId, eventType, reason: problem, orderId, paymentId: paymentEntity.id, bookingId: String(resolved.booking._id)
    });
    return { status: 'ignored', result: problem };
  }

  const { booking } = resolved;

  if (resolved.kind === 'extra') {
    const { finalizeExtraPaymentSuccess } = require('../bookingControllers/hourlyPaymentController');
    const outcome = await finalizeExtraPaymentSuccess(booking, paymentEntity.id);
    return { status: 'processed', result: outcome?.alreadyProcessed ? 'extra_already_paid' : 'extra_paid' };
  }

  if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
    if (booking.razorpayPaymentId && booking.razorpayPaymentId !== paymentEntity.id) {
      log('error', 'second_payment_on_paid_booking', {
        eventId, orderId, paymentId: paymentEntity.id, bookingId: String(booking._id)
      });
    }
  } else if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
    log('error', 'captured_payment_for_unavailable_booking', {
      eventId, orderId, paymentId: paymentEntity.id, bookingId: String(booking._id), bookingStatus: booking.status
    });
    return { status: 'ignored', result: 'booking_unavailable_needs_refund' };
  }

  // Idempotent and atomic internally (shared with the client /verify path).
  const outcome = await finalizePaymentSuccess(booking, paymentEntity.id);
  await recordCapture(booking, paymentEntity, eventId);
  return { status: 'processed', result: outcome?.alreadyProcessed ? 'already_paid' : 'payment_confirmed' };
};

const applyPaymentFailed = async ({ eventId, paymentEntity }) => {
  if (!paymentEntity?.id || !paymentEntity?.order_id) return { status: 'ignored', result: 'missing_payment_entity' };
  const orderId = paymentEntity.order_id;

  const resolved = await resolveOrder(orderId);
  if (!resolved) {
    log('warn', 'no_record_for_order', { eventId, eventType: 'payment.failed', orderId, paymentId: paymentEntity.id });
    return { status: 'ignored', result: 'no_record_for_order' };
  }
  const problem = validateAgainstRecord({ paymentEntity, orderEntity: null, resolved, orderId });
  if (problem) {
    log('error', 'payment_validation_failed', {
      eventId, eventType: 'payment.failed', reason: problem, orderId, paymentId: paymentEntity.id
    });
    return { status: 'ignored', result: problem };
  }

  if (resolved.kind === 'extra') {
    // The extra-payment flow is retry-driven (PROCESSING -> user retries on the same order); nothing to change.
    return { status: 'ignored', result: 'extra_payment_failure_noted' };
  }

  // Record failure details only while the booking is still unpaid. booking.paymentStatus deliberately
  // stays 'pending': the scheduler's payment-timeout/expiry jobs and the retry-payment flow key off it,
  // and a failed attempt must not cancel or pre-empt either. A SUCCESS can never be overwritten here.
  const res = await Booking.updateOne(
    { _id: resolved.booking._id, paymentStatus: PAYMENT_STATUS.PENDING },
    {
      $set: {
        paymentFailure: {
          razorpayPaymentId: paymentEntity.id,
          code: truncate(paymentEntity.error_code, 100),
          reason: truncate(paymentEntity.error_reason, 200),
          description: truncate(paymentEntity.error_description, 500),
          step: truncate(paymentEntity.error_step, 100),
          source: truncate(paymentEntity.error_source, 100),
          failedAt: new Date(),
          eventId
        }
      }
    }
  );
  return { status: 'processed', result: res.modifiedCount ? 'failure_recorded' : 'failure_ignored_booking_not_pending' };
};

const dispatchEvent = (eventType, payload, eventId) => {
  const paymentEntity = payload?.payment?.entity;
  const orderEntity = payload?.order?.entity;
  if (eventType === 'payment.failed') return applyPaymentFailed({ eventId, paymentEntity });
  return applyPaymentSuccess({ eventId, eventType, paymentEntity, orderEntity });
};

const handleRazorpayWebhook = async (req, res) => {
  const startedAt = Date.now();
  let eventId = null;
  let claimed = false;

  try {
    const rawBody = req.body;
    const signature = req.headers['x-razorpay-signature'];

    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      log('warn', 'rejected_unparseable_body', { contentType: req.headers['content-type'] });
      return res.status(400).json({ success: false, message: 'Invalid request body' });
    }
    if (!signature) {
      log('warn', 'rejected_missing_signature');
      return res.status(400).json({ success: false, message: 'Missing signature' });
    }

    const secret = await resolveSecret();
    if (!secret) {
      log('error', 'webhook_secret_not_configured');
      return res.status(500).json({ success: false, message: 'Webhook not configured' });
    }

    // Nothing below runs before this check passes.
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      log('warn', 'rejected_invalid_signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (_) {
      log('warn', 'rejected_invalid_json');
      return res.status(400).json({ success: false, message: 'Invalid JSON' });
    }

    const eventType = typeof event?.event === 'string' ? event.event : null;
    if (!eventType) {
      log('warn', 'rejected_missing_event_type');
      return res.status(400).json({ success: false, message: 'Missing event type' });
    }

    // x-razorpay-event-id is unique per event and identical across redeliveries. Fall back to the
    // body hash (also identical across redeliveries) so a missing header can never defeat dedup.
    eventId = str(req.headers['x-razorpay-event-id'])
      || `body_${crypto.createHash('sha256').update(rawBody).digest('hex')}`;

    log('info', 'received', { eventId, eventType });

    if (!HANDLED_EVENTS.has(eventType)) {
      log('info', 'unhandled_event_type_acknowledged', { eventId, eventType });
      return res.status(200).json({ success: true, message: 'Event type not handled' });
    }

    const paymentEntity = event.payload?.payment?.entity;
    const claim = await claimEvent({
      eventId,
      eventType,
      orderId: str(paymentEntity?.order_id || event.payload?.order?.entity?.id),
      paymentId: str(paymentEntity?.id)
    });

    if (claim.duplicate) {
      log('info', 'duplicate_event_acknowledged', { eventId, eventType, previousStatus: claim.status });
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }
    if (claim.inFlight) {
      log('warn', 'event_in_flight_retry_later', { eventId, eventType });
      return res.status(409).json({ success: false, message: 'Event is being processed' });
    }
    claimed = true;

    const outcome = await dispatchEvent(eventType, event.payload, eventId);
    await finishEvent(eventId, outcome.status, outcome.result);

    log('info', 'processed', { eventId, eventType, outcome: outcome.status, result: outcome.result, ms: Date.now() - startedAt });
    return res.status(200).json({ success: true });
  } catch (error) {
    log('error', 'processing_failed', { eventId, error: truncate(error?.message, 300), ms: Date.now() - startedAt });
    if (claimed) {
      // Release the claim so Razorpay's retry can re-run it. If even this fails, the stale-lock TTL does.
      try { await finishEvent(eventId, 'failed', 'error', error?.message); } catch (_) { /* best effort */ }
    }
    // Non-2xx on purpose: Razorpay retries with backoff.
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

module.exports = { handleRazorpayWebhook };

/**
 * Razorpay webhook tests — real Express route wiring (raw body before json), real Mongoose models,
 * in-memory MongoDB. Run: npm run test:webhook
 */
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'dummy_key_secret';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const WebhookEvent = require('../models/WebhookEvent');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../utils/constants');

// Notifications / socket side effects are irrelevant here; stub them before the controller loads.
const notifPath = require.resolve('../controllers/notificationControllers/notificationController');
require.cache[notifPath] = { id: notifPath, filename: notifPath, loaded: true, exports: { createNotification: async () => ({}) } };

const { handleRazorpayWebhook } = require('../controllers/paymentControllers/razorpayWebhookController');

let mongod, server, baseUrl;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await WebhookEvent.init();
  const app = express();
  // Same wiring as server.js: raw body on the webhook path BEFORE express.json().
  app.post(['/api/payment/razorpay/webhook', '/api/payments/webhook'],
    express.raw({ type: 'application/json', limit: '1mb' }), handleRazorpayWebhook);
  app.use(express.json());
  app.get('/api/other', (req, res) => res.json({ ok: true }));
  app.post('/api/other', (req, res) => res.json({ got: req.body }));
  server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(r => server.close(r));
  await mongoose.disconnect();
  await mongod.stop();
});

const ORDER_ID = 'order_TEST123';
const PAY_ID = 'pay_TEST123';
let booking;
let eventSeq = 0;

beforeEach(async () => {
  await Promise.all([Booking.deleteMany({}), Transaction.deleteMany({}), WebhookEvent.deleteMany({})]);
  const userId = new mongoose.Types.ObjectId();
  booking = await Booking.collection.insertOne({
    userId,
    vendorId: new mongoose.Types.ObjectId(),
    bookingNumber: 'BK-TEST-1',
    bookingType: 'instant',
    status: BOOKING_STATUS.AWAITING_PAYMENT,
    paymentStatus: PAYMENT_STATUS.PENDING,
    serviceId: new mongoose.Types.ObjectId(),
    serviceName: 'AC Repair',
    serviceCategory: 'Appliances',
    basePrice: 500,
    finalAmount: 500,
    address: { addressLine1: '1 Test St', city: 'Indore', state: 'MP', pincode: '452001' },
    scheduledDate: new Date(),
    scheduledTime: '10:00',
    timeSlot: { start: '10:00', end: '11:00' },
    razorpayOrderId: ORDER_ID,
    razorpayOrderAmount: 500,
    pendingWalletAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  booking = await Booking.findById(booking.insertedId);
});

const sign = (raw, secret = process.env.RAZORPAY_WEBHOOK_SECRET) =>
  crypto.createHmac('sha256', secret).update(raw).digest('hex');

const payEntity = (over = {}) => ({
  id: PAY_ID, order_id: ORDER_ID, amount: 50000, currency: 'INR', status: 'captured', method: 'upi', created_at: 1700000000, ...over
});

const send = async (body, { eventId, signature, path = '/api/payment/razorpay/webhook', secret } = {}) => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = { 'content-type': 'application/json' };
  if (eventId !== null) headers['x-razorpay-event-id'] = eventId || `evt_${++eventSeq}`;
  if (signature !== null) headers['x-razorpay-signature'] = signature || sign(raw, secret);
  const res = await fetch(baseUrl + path, { method: 'POST', headers, body: raw });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const captured = (over) => ({ event: 'payment.captured', payload: { payment: { entity: payEntity(over) } } });
const failed = (over) => ({
  event: 'payment.failed',
  payload: { payment: { entity: payEntity({ status: 'failed', error_code: 'BAD_REQUEST_ERROR', error_reason: 'payment_failed', error_description: 'Payment failed', error_step: 'payment_authentication', error_source: 'customer', ...over }) } }
});
const orderPaid = (orderOver = {}, payOver = {}) => ({
  event: 'order.paid',
  payload: {
    payment: { entity: payEntity(payOver) },
    order: { entity: { id: ORDER_ID, amount: 50000, amount_paid: 50000, currency: 'INR', status: 'paid', ...orderOver } }
  }
});
const reload = () => Booking.findById(booking._id);

test('1. valid payment.captured confirms the booking once', async () => {
  const r = await send(captured());
  assert.equal(r.status, 200);
  const b = await reload();
  assert.equal(b.paymentStatus, PAYMENT_STATUS.SUCCESS);
  assert.equal(b.status, BOOKING_STATUS.CONFIRMED);
  assert.equal(b.razorpayPaymentId, PAY_ID);
  assert.equal(b.razorpayCapture.amount, 50000);
  assert.equal(b.razorpayCapture.method, 'upi');
  assert.equal(await Transaction.countDocuments({ bookingId: b._id, type: 'payment' }), 1);
});

test('2. valid payment.failed records failure but leaves booking retryable', async () => {
  const r = await send(failed());
  assert.equal(r.status, 200);
  const b = await reload();
  assert.equal(b.paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal(b.status, BOOKING_STATUS.AWAITING_PAYMENT);
  assert.equal(b.paymentFailure.code, 'BAD_REQUEST_ERROR');
  assert.equal(b.paymentFailure.razorpayPaymentId, PAY_ID);
});

test('3. valid order.paid confirms the booking', async () => {
  const r = await send(orderPaid());
  assert.equal(r.status, 200);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.SUCCESS);
});

test('4. invalid signature -> 400, nothing processed', async () => {
  const r = await send(captured(), { signature: 'a'.repeat(64) });
  assert.equal(r.status, 400);
  const r2 = await send(captured(), { secret: 'wrong_secret' });
  assert.equal(r2.status, 400);
  const r3 = await send(captured(), { signature: 'not-hex' });
  assert.equal(r3.status, 400);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal(await WebhookEvent.countDocuments(), 0);
});

test('5. missing signature -> 400', async () => {
  const r = await send(captured(), { signature: null });
  assert.equal(r.status, 400);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
});

test('5b. signature is over the exact raw bytes (re-serialised body is rejected)', async () => {
  const pretty = JSON.stringify(captured(), null, 2);
  const sigOfCompact = sign(JSON.stringify(captured()));
  const r = await send(pretty, { signature: sigOfCompact });
  assert.equal(r.status, 400);
});

test('6. duplicate event id is acknowledged and not re-processed', async () => {
  const body = captured();
  assert.equal((await send(body, { eventId: 'evt_dup' })).status, 200);
  const again = await send(body, { eventId: 'evt_dup' });
  assert.equal(again.status, 200);
  assert.match(again.body.message, /already processed/i);
  assert.equal(await Transaction.countDocuments({ bookingId: booking._id, type: 'payment' }), 1);
  assert.equal(await WebhookEvent.countDocuments({ eventId: 'evt_dup' }), 1);
});

test('7. concurrent deliveries of the same event confirm exactly once', async () => {
  const body = captured();
  const results = await Promise.all(Array.from({ length: 6 }, () => send(body, { eventId: 'evt_race' })));
  for (const r of results) assert.ok([200, 409].includes(r.status), `unexpected status ${r.status}`);
  assert.ok(results.some(r => r.status === 200));
  assert.equal(await Transaction.countDocuments({ bookingId: booking._id, type: 'payment' }), 1);
  assert.equal(await WebhookEvent.countDocuments({ eventId: 'evt_race' }), 1);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.SUCCESS);
});

test('7b. concurrent DIFFERENT events for the same payment confirm exactly once', async () => {
  const results = await Promise.all([
    send(captured(), { eventId: 'evt_a' }),
    send(orderPaid(), { eventId: 'evt_b' }),
    send(captured(), { eventId: 'evt_c' })
  ]);
  for (const r of results) assert.equal(r.status, 200);
  assert.equal(await Transaction.countDocuments({ bookingId: booking._id, type: 'payment' }), 1);
});

test('8. wrong razorpay order id -> no booking touched', async () => {
  const r = await send(captured({ order_id: 'order_OTHER' }));
  assert.equal(r.status, 200);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal((await WebhookEvent.findOne()).result, 'no_record_for_order');
});

test('9. incorrect amount is rejected', async () => {
  const r = await send(captured({ amount: 100 }));
  assert.equal(r.status, 200);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal((await WebhookEvent.findOne()).result, 'amount_mismatch');
  const r2 = await send(orderPaid({ amount_paid: 100 }));
  assert.equal(r2.status, 200);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
});

test('10. incorrect currency is rejected', async () => {
  await send(captured({ currency: 'USD' }));
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal((await WebhookEvent.findOne()).result, 'currency_mismatch');
});

test('10b. another user\'s / booking\'s notes cannot confirm this booking', async () => {
  await send(captured({ notes: { bookingId: new mongoose.Types.ObjectId().toString() } }));
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
  await send(captured({ notes: { userId: new mongoose.Types.ObjectId().toString() } }));
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
});

test('11. missing booking record is acknowledged without side effects', async () => {
  await Booking.deleteMany({});
  const r = await send(captured());
  assert.equal(r.status, 200);
  assert.equal(await Transaction.countDocuments(), 0);
});

test('12. database failure during processing -> 500 so Razorpay retries, then retry succeeds', async () => {
  const original = Booking.findOne;
  Booking.findOne = () => { throw new Error('simulated db outage'); };
  let r;
  try { r = await send(captured(), { eventId: 'evt_dbfail' }); } finally { Booking.findOne = original; }
  assert.equal(r.status, 500);
  assert.equal((await WebhookEvent.findOne({ eventId: 'evt_dbfail' })).status, 'failed');
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);

  const retry = await send(captured(), { eventId: 'evt_dbfail' }); // same event id redelivered
  assert.equal(retry.status, 200);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.SUCCESS);
  assert.equal((await WebhookEvent.findOne({ eventId: 'evt_dbfail' })).attempts, 2);
});

test('12b. database failure while claiming the event -> 500', async () => {
  const original = WebhookEvent.create;
  WebhookEvent.create = async () => { throw new Error('simulated db outage'); };
  let r;
  try { r = await send(captured()); } finally { WebhookEvent.create = original; }
  assert.equal(r.status, 500);
  assert.equal((await reload()).paymentStatus, PAYMENT_STATUS.PENDING);
});

test('13. failed event arriving after successful capture cannot overwrite it', async () => {
  await send(captured());
  const r = await send(failed());
  assert.equal(r.status, 200);
  const b = await reload();
  assert.equal(b.paymentStatus, PAYMENT_STATUS.SUCCESS);
  assert.equal(b.status, BOOKING_STATUS.CONFIRMED);
  assert.equal(b.paymentFailure?.code ?? null, null);
});

test('13b. capture arriving after an earlier failed attempt succeeds and clears failure', async () => {
  await send(failed());
  await send(captured());
  const b = await reload();
  assert.equal(b.paymentStatus, PAYMENT_STATUS.SUCCESS);
  assert.equal(b.paymentFailure?.code ?? null, null);
});

test('14. captured + order.paid + failed for the same payment -> single confirmation', async () => {
  assert.equal((await send(captured())).status, 200);
  assert.equal((await send(orderPaid())).status, 200);
  assert.equal((await send(failed())).status, 200);
  const b = await reload();
  assert.equal(b.paymentStatus, PAYMENT_STATUS.SUCCESS);
  assert.equal(await Transaction.countDocuments({ bookingId: b._id, type: 'payment' }), 1);
});

test('14b. cancelled booking with a captured payment is flagged, not resurrected', async () => {
  await Booking.updateOne({ _id: booking._id }, { $set: { status: BOOKING_STATUS.CANCELLED } });
  const r = await send(captured());
  assert.equal(r.status, 200);
  const b = await reload();
  assert.equal(b.status, BOOKING_STATUS.CANCELLED);
  assert.equal(b.paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal((await WebhookEvent.findOne()).result, 'booking_unavailable_needs_refund');
});

test('unhandled event types are acknowledged; malformed JSON is 400', async () => {
  assert.equal((await send({ event: 'refund.processed', payload: {} })).status, 200);
  assert.equal((await send('{not json')).status, 400);
});

test('legacy /api/payments/webhook alias works and other routes still parse JSON', async () => {
  assert.equal((await send(captured(), { path: '/api/payments/webhook' })).status, 200);
  const res = await fetch(baseUrl + '/api/other', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ a: 1 })
  });
  assert.deepEqual(await res.json(), { got: { a: 1 } });
});

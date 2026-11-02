/**
 * Sends a correctly-signed fake Razorpay webhook to a LOCAL server (for manual testing).
 *
 * Usage:
 *   node scripts/sendTestWebhook.js <event> <razorpayOrderId> <amountInRupees> [eventId] [url]
 *
 * Examples:
 *   node scripts/sendTestWebhook.js payment.captured order_ABC123 499
 *   node scripts/sendTestWebhook.js payment.failed   order_ABC123 499
 *   node scripts/sendTestWebhook.js order.paid       order_ABC123 499 evt_same_again   (run twice => duplicate)
 *
 * The order id / amount must match a booking in your LOCAL DB (booking.razorpayOrderId and
 * booking.razorpayOrderAmount). Uses RAZORPAY_WEBHOOK_SECRET from Backend/.env. Default URL:
 * http://localhost:<PORT or 5000>/api/payment/razorpay/webhook
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');

const [event, orderId, amountRupees, eventIdArg, urlArg] = process.argv.slice(2);
if (!event || !orderId || !amountRupees) {
  console.error('Usage: node scripts/sendTestWebhook.js <payment.captured|payment.failed|order.paid> <orderId> <amountRupees> [eventId] [url]');
  process.exit(1);
}
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!secret) { console.error('RAZORPAY_WEBHOOK_SECRET is not set in Backend/.env'); process.exit(1); }

const paise = Math.round(Number(amountRupees) * 100);
const payment = {
  id: `pay_TEST${Date.now()}`, order_id: orderId, amount: paise, currency: 'INR',
  status: event === 'payment.failed' ? 'failed' : 'captured', method: 'upi',
  created_at: Math.floor(Date.now() / 1000),
  ...(event === 'payment.failed' && {
    error_code: 'BAD_REQUEST_ERROR', error_reason: 'payment_failed',
    error_description: 'Test failure', error_step: 'payment_authentication', error_source: 'customer'
  })
};
const payload = { payment: { entity: payment } };
if (event === 'order.paid') {
  payload.order = { entity: { id: orderId, amount: paise, amount_paid: paise, currency: 'INR', status: 'paid' } };
}

const raw = JSON.stringify({ event, payload });
const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
const url = urlArg || `http://localhost:${process.env.PORT || 5000}/api/payment/razorpay/webhook`;

fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-razorpay-signature': signature,
    'x-razorpay-event-id': eventIdArg || `evt_local_${Date.now()}`
  },
  body: raw
}).then(async (r) => console.log(r.status, await r.text()))
  .catch((e) => { console.error('Request failed (is the server running?):', e.message); process.exit(1); });

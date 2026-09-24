const Booking = require('../../models/Booking');
const Transaction = require('../../models/Transaction');
const { createOrder, verifyPayment } = require('../../services/razorpayService');
const { createNotification } = require('../notificationControllers/notificationController');

/**
 * HOURLY SERVICE — EXTRA TIME PAYMENT
 * ────────────────────────────────────
 * Isolated to bookings with hourlyTracking.isHourly = true. The user pays ONLY
 * the extra amount computed by the backend in endHourlyService — never the
 * full booking amount again.
 */

/**
 * Create a Razorpay order for the outstanding extra-time amount.
 */
const createExtraPaymentOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, userId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const tracking = booking.hourlyTracking;
    if (!tracking?.isHourly) {
      return res.status(400).json({ success: false, message: 'This is not an hourly service booking' });
    }
    if (tracking.extraPaymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Extra payment already completed' });
    }
    if (tracking.extraPaymentStatus !== 'PENDING' && tracking.extraPaymentStatus !== 'PROCESSING' && tracking.extraPaymentStatus !== 'FAILED') {
      return res.status(400).json({ success: false, message: 'No extra payment is currently due' });
    }
    if (!tracking.extraAmount || tracking.extraAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No extra amount to collect' });
    }

    // Reuse an existing unpaid order rather than minting a new one on every click
    if (tracking.extraRazorpayOrderId && tracking.extraPaymentStatus === 'PROCESSING') {
      return res.status(200).json({
        success: true,
        message: 'Extra payment order already exists',
        data: {
          orderId: tracking.extraRazorpayOrderId,
          amount: tracking.extraAmount,
          currency: 'INR',
          key: process.env.RAZORPAY_KEY_ID,
          bookingId: booking._id
        }
      });
    }

    const orderResult = await createOrder(
      tracking.extraAmount,
      'INR',
      `${booking.bookingNumber}-EXTRA`,
      {
        purpose: 'hourly_extra_payment',
        bookingId: booking._id.toString(),
        userId: userId.toString(),
        bookingNumber: booking.bookingNumber
      }
    );

    if (!orderResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to create payment order', error: orderResult.error });
    }

    tracking.extraRazorpayOrderId = orderResult.orderId;
    tracking.extraPaymentStatus = 'PROCESSING';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Extra payment order created',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100,
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID,
        bookingId: booking._id
      }
    });
  } catch (error) {
    console.error('Create extra payment order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create extra payment order' });
  }
};

/**
 * Shared idempotent core — called from the client-invoked verify endpoint and
 * (via paymentController's webhook router) from the Razorpay webhook.
 */
const finalizeExtraPaymentSuccess = async (booking, paymentId) => {
  const tracking = booking.hourlyTracking;
  if (tracking.extraPaymentStatus === 'PAID') {
    return { alreadyProcessed: true };
  }

  tracking.extraPaymentStatus = 'PAID';
  tracking.extraRazorpayPaymentId = paymentId;
  tracking.workDoneAllowed = true;
  tracking.phase = 'ENDED';

  await booking.save();

  try {
    await Transaction.create({
      userId: booking.userId,
      bookingId: booking._id,
      type: 'payment',
      amount: tracking.extraAmount,
      status: 'completed',
      paymentMethod: 'razorpay',
      referenceId: paymentId,
      description: `Extra hourly service charge for booking ${booking.bookingNumber}`
    });
  } catch (txnErr) {
    console.error('[HourlyExtraPayment] Transaction log error:', txnErr);
  }

  let io = null;
  try { io = require('../../sockets').getIO(); } catch (_) { /* socket layer not initialized */ }
  if (io) {
    io.to(`vendor_${booking.vendorId}`).emit('hourly_extra_payment_paid', {
      bookingId: booking._id,
      extraAmount: tracking.extraAmount
    });
    io.to(`user_${booking.userId}`).emit('hourly_extra_payment_paid', {
      bookingId: booking._id,
      extraAmount: tracking.extraAmount
    });
  }

  await createNotification({
    userId: booking.userId,
    type: 'hourly_extra_payment_paid',
    title: 'Extra Payment Successful',
    message: `Your additional payment of ₹${tracking.extraAmount} was successful.`,
    relatedId: booking._id,
    relatedType: 'booking',
    priority: 'medium',
    pushData: {
      type: 'hourly_extra_payment_paid',
      bookingId: booking._id.toString(),
      link: `/user/booking/${booking._id}`
    }
  });

  return { alreadyProcessed: false };
};

/**
 * Client-invoked verification after Razorpay checkout completes.
 */
const verifyExtraPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const booking = await Booking.findOne({ _id: id, userId, 'hourlyTracking.extraRazorpayOrderId': razorpay_order_id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    await finalizeExtraPaymentSuccess(booking, razorpay_payment_id);

    res.status(200).json({ success: true, message: 'Extra payment verified successfully' });
  } catch (error) {
    console.error('Verify extra payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify extra payment' });
  }
};

/**
 * Poll extra-payment / service status from the user side.
 */
const getHourlyBookingStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, userId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const tracking = booking.hourlyTracking;
    if (!tracking?.isHourly) {
      return res.status(400).json({ success: false, message: 'This is not an hourly service booking' });
    }

    res.status(200).json({
      success: true,
      data: {
        phase: tracking.phase,
        serviceStartedAt: tracking.serviceStartedAt,
        serviceEndedAt: tracking.serviceEndedAt,
        bookedMinutes: tracking.bookedMinutes,
        actualDurationMinutes: tracking.actualDurationMinutes,
        extraDurationMinutes: tracking.extraDurationMinutes,
        extraAmount: tracking.extraAmount,
        extraPaymentStatus: tracking.extraPaymentStatus,
        workDoneAllowed: tracking.workDoneAllowed
      }
    });
  } catch (error) {
    console.error('Get hourly booking status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking status' });
  }
};

module.exports = {
  createExtraPaymentOrder,
  verifyExtraPayment,
  finalizeExtraPaymentSuccess,
  getHourlyBookingStatus
};

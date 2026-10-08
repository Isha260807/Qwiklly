const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Settings = require('../../models/Settings');
const Plan = require('../../models/Plan');
const { validationResult } = require('express-validator');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../../utils/constants');
const { createOrder, verifyPayment, verifyWebhookSignature, refundPayment } = require('../../services/razorpayService');
const { createNotification } = require('../notificationControllers/notificationController');
const { recordBookingEarning } = require('../../services/earningTrackerService');
const { creditSalaryEarningForBooking } = require('../../services/salaryEarningService');

/**
 * Create Razorpay order for booking payment
 */
const createPaymentOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { bookingId, useWallet = false } = req.body;

    // Get booking
    const booking = await Booking.findOne({ _id: bookingId, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if payment already done
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    // Payment is only collected after a vendor has accepted the booking
    if (!booking.vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Please wait for a vendor to accept your booking before paying.'
      });
    }

    const user = useWallet ? await User.findById(userId).select('wallet') : null;
    const walletBalance = Number(user?.wallet?.balance || 0);
    const totalAmount = Number(booking.finalAmount || 0);
    const walletAmount = useWallet ? Math.min(walletBalance, totalAmount) : 0;
    const onlineAmount = Math.max(totalAmount - walletAmount, 0);

    // When the wallet covers the complete bill, no Razorpay order is needed.
    // The frontend will call the wallet payment endpoint directly.
    if (onlineAmount <= 0) {
      booking.pendingWalletAmount = 0;
      booking.razorpayOrderId = null;
      booking.razorpayOrderAmount = 0;
      await booking.save();
      return res.status(200).json({
        success: true,
        message: 'Wallet can cover the complete payment',
        data: {
          requiresWalletPayment: true,
          totalAmount,
          amount: 0,
          walletAmount,
          onlineAmount: 0,
          bookingId: booking._id
        }
      });
    }

    // Reuse an already-created, still-unpaid order instead of minting a new one on
    // every "Pay Now" click. A new order is created when the wallet choice changes
    // because the Razorpay amount changes too.
    if (booking.razorpayOrderId
      && Number(booking.razorpayOrderAmount || 0) === onlineAmount
      && Number(booking.pendingWalletAmount || 0) === walletAmount) {
      return res.status(200).json({
        success: true,
        message: 'Payment order already exists',
        data: {
          orderId: booking.razorpayOrderId,
          totalAmount,
          amount: onlineAmount,
          walletAmount,
          onlineAmount,
          currency: 'INR',
          key: process.env.RAZORPAY_KEY_ID,
          bookingId: booking._id
        }
      });
    }

    // Create Razorpay order
    console.log('Creating Razorpay order with amount:', onlineAmount);
    const orderResult = await createOrder(
      onlineAmount,
      'INR',
      booking.bookingNumber,
      {
        bookingId: booking._id.toString(),
        userId: userId.toString(),
        bookingNumber: booking.bookingNumber
      }
    );

    console.log('Razorpay order result:', orderResult);

    if (!orderResult.success) {
      console.error('Razorpay order creation failed:', orderResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: orderResult.error || 'Unknown error'
      });
    }

    // Update booking with Razorpay order ID
    booking.razorpayOrderId = orderResult.orderId;
    booking.razorpayOrderAmount = onlineAmount;
    booking.pendingWalletAmount = walletAmount;
    booking.walletAmount = 0;
    booking.onlineAmount = 0;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: orderResult.orderId,
        totalAmount,
        amount: orderResult.amount / 100, // Convert back to rupees
        walletAmount,
        onlineAmount,
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID,
        bookingId: booking._id
      }
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order. Please try again.',
      error: error.message
    });
  }
};

const getPaymentBreakdown = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const userId = req.user.id;
    const { bookingId, useWallet = false } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, userId }).select('finalAmount vendorId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const user = useWallet ? await User.findById(userId).select('wallet') : null;
    const totalAmount = Number(booking.finalAmount || 0);
    const walletBalance = Number(user?.wallet?.balance || 0);
    const walletAmount = useWallet ? Math.min(walletBalance, totalAmount) : 0;
    const onlineAmount = Math.max(totalAmount - walletAmount, 0);
    return res.status(200).json({
      success: true,
      data: {
        totalAmount,
        walletAmount,
        onlineAmount,
        walletBalance,
        bookingId: booking._id
      }
    });
  } catch (error) {
    console.error('Get payment breakdown error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate payment breakdown' });
  }
};
const debitWalletContribution = async (booking, amount) => {
  const walletAmount = Number(amount || 0);
  if (walletAmount <= 0) return null;

  const updatedUser = await User.findOneAndUpdate(
    { _id: booking.userId, 'wallet.balance': { $gte: walletAmount } },
    { $inc: { 'wallet.balance': -walletAmount } },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error('Insufficient wallet balance. Please retry without wallet payment.');
  }

  const Transaction = require('../../models/Transaction');
  await Transaction.create({
    userId: booking.userId,
    bookingId: booking._id,
    amount: walletAmount,
    type: 'debit',
    paymentMethod: 'wallet',
    status: 'completed',
    description: `Wallet contribution for booking ${booking.bookingNumber}`,
    balanceBefore: Number(updatedUser.wallet.balance || 0) + walletAmount,
    balanceAfter: Number(updatedUser.wallet.balance || 0)
  });

  return updatedUser;
};
/**
 * Shared "payment succeeded" logic — called from both the client-invoked verify
 * endpoint and the server-to-server Razorpay webhook, so payment truth never
 * depends solely on the frontend staying online. Idempotent: safe to call twice
 * for the same booking (e.g. webhook arrives after the client already verified).
 */
const finalizePaymentSuccess = async (booking, paymentId) => {
  if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
    return { alreadyProcessed: true };
  }

  // Claim the payment atomically so a client verify and Razorpay webhook cannot
  // both debit the wallet or create duplicate payment transactions.
  const paymentClaim = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: { $ne: PAYMENT_STATUS.SUCCESS } },
    { $set: { paymentStatus: PAYMENT_STATUS.SUCCESS } },
    { new: false }
  );
  if (!paymentClaim) return { alreadyProcessed: true };

  // Update booking payment status
  const walletAmount = Math.max(Number(booking.pendingWalletAmount || 0), 0);
  const onlineAmount = walletAmount > 0
    ? Math.max(Number(booking.razorpayOrderAmount || 0), 0)
    : Number(booking.finalAmount || 0);

  try {
    await debitWalletContribution(booking, walletAmount);
  } catch (error) {
    await Booking.findByIdAndUpdate(booking._id, {
      $set: { paymentStatus: PAYMENT_STATUS.PENDING }
    });
    throw error;
  }

  booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
  booking.paymentMethod = walletAmount > 0 ? 'wallet+online' : 'online';
  booking.walletAmount = walletAmount;
  booking.onlineAmount = onlineAmount;
  booking.pendingWalletAmount = 0;
  booking.razorpayPaymentId = paymentId;
  booking.paymentId = paymentId;

  // Update booking status based on current state
  if ([BOOKING_STATUS.PENDING, BOOKING_STATUS.SEARCHING, BOOKING_STATUS.AWAITING_PAYMENT].includes(booking.status)) {
    booking.status = !booking.vendorId ? BOOKING_STATUS.SEARCHING : BOOKING_STATUS.CONFIRMED;
    if (!booking.vendorId) {
      booking.waveStartedAt = new Date();
    }
  } else if (booking.status === BOOKING_STATUS.WORK_DONE) {
    booking.status = BOOKING_STATUS.COMPLETED;
    booking.completedAt = new Date();
  }

  await booking.save();

  // ── Atomic Coupon Consumption on Payment Success ──
  if (booking.coupon && booking.coupon.couponId) {
    try {
      const Coupon = require('../../models/Coupon');
      const CouponUsage = require('../../models/CouponUsage');
      const usage = await CouponUsage.findOne({ bookingId: booking._id });
      if (usage && usage.status !== 'CONSUMED') {
        usage.status = 'CONSUMED';
        usage.paymentId = paymentId;
        await usage.save();

        // Increment global coupon used count atomically
        await Coupon.findByIdAndUpdate(booking.coupon.couponId, { $inc: { usedCount: 1 } });
      }
    } catch (couponUsageErr) {
      console.error('[PaymentVerification] Error finalizing coupon usage:', couponUsageErr);
    }
  }

  // ── Credit Vendor Wallet from VendorBill (single source of truth) ──
  const Transaction = require('../../models/Transaction');
  const Vendor = require('../../models/Vendor');
  const VendorBill = require('../../models/VendorBill');

  // User payment transaction
  await Transaction.create({
    userId: booking.userId,
    bookingId: booking._id,
    amount: onlineAmount,
    type: 'payment',
    paymentMethod: 'razorpay',
    status: 'completed',
    description: `Online payment for booking ${booking.bookingNumber}`,
    referenceId: paymentId,
    metadata: {
      bookingTotal: booking.finalAmount,
      walletAmount
    }
  });

  // If booking does not have a vendor assigned yet, retry the zone broadcast.
  // dispatchBookingToVendors has an atomic dispatchState guard, so this does
  // not duplicate requests when the booking was already broadcast at creation.
  if (!booking.vendorId) {
    const { dispatchBookingToVendors } = require('../bookingControllers/userBookingController');
    if (typeof dispatchBookingToVendors === 'function') {
      setImmediate(() => {
        console.log(`[Payment] Payment successful for booking ${booking.bookingNumber}. Retrying zone vendor dispatch if needed.`);
        dispatchBookingToVendors(booking._id);
      });
    }
  }

  // Fetch VendorBill for earnings (only if bill exists = post-completion payment)
  const bill = await VendorBill.findOne({ bookingId: booking._id });

  if (bill && booking.vendorId) {
    const vendorEarning = 0;

    // Mark bill as paid
    bill.status = 'paid';
    bill.paidAt = new Date();
    await bill.save();
    await creditSalaryEarningForBooking({ bookingId: booking._id, vendorId: booking.vendorId });

    // Online payment: only earnings increase, NO dues (platform holds the money)
    await Vendor.findByIdAndUpdate(booking.vendorId, {
      $inc: { 'wallet.earnings': vendorEarning }
    });

    // Earnings credit transaction
    if (vendorEarning > 0) {
      await Transaction.create({
        vendorId: booking.vendorId,
        bookingId: booking._id,
        amount: vendorEarning,
        type: 'earnings_credit',
        paymentMethod: 'system',
        status: 'completed',
        description: `Earnings ₹${vendorEarning} credited for booking ${booking.bookingNumber} (online payment)`,
        metadata: {
          type: 'earnings_increase',
          billId: bill._id.toString(),
          serviceEarning: bill.vendorServiceEarning,
          partsEarning: bill.vendorPartsEarning
        }
      });
    }

    console.log(`[Payment] Credited ₹${vendorEarning} to vendor ${booking.vendorId}`);
  }

  // Record stats in the Daily Earning Tracker (Async)
  recordBookingEarning({
    date: new Date(),
    totalRevenue: Number(bill ? bill.grandTotal : booking.finalAmount) || 0,
    totalGST: Number(bill ? bill.totalGST : 0) || 0,
    totalTDS: 0 // Tracked in withdrawals
  }).catch(err => console.error('[Payment] Daily tracker failed:', err));

  // Send notification to user
  await createNotification({
    userId: booking.userId,
    type: 'payment_success',
    title: 'Payment Successful',
    message: `Payment of ₹${booking.finalAmount} for booking ${booking.bookingNumber} was successful. Thank you!`,
    relatedId: booking._id,
    relatedType: 'payment',
    priority: 'high'
  });

  // Notify vendor & worker
  let vendorTitle = 'Booking Confirmed';
  let vendorMsg = `Payment received for booking ${booking.bookingNumber}. The service is now confirmed.`;

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    vendorTitle = 'Payment Received (Online)';
    vendorMsg = `User paid ₹${booking.finalAmount} online for booking ${booking.bookingNumber}. Job Completed!`;
  }

  if (booking.vendorId) {
    await createNotification({
      vendorId: booking.vendorId,
      type: 'payment_success',
      title: vendorTitle,
      message: vendorMsg,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    });
  }

  if (booking.workerId) {
    await createNotification({
      workerId: booking.workerId,
      type: 'payment_success',
      title: vendorTitle,
      message: vendorMsg,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    });
  }

  return { alreadyProcessed: false };
};

/**
 * Verify payment (client-invoked, right after Razorpay checkout succeeds)
 */
const verifyPaymentWebhook = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Find booking by Razorpay order ID
    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await finalizePaymentSuccess(booking, razorpay_payment_id);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
};

/**
 * Razorpay webhook (server-to-server) — the authoritative source of payment truth,
 * independent of whether the client stayed online long enough to call /verify.
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const settings = await Settings.findOne({ type: 'global' }).select('razorpayWebhookSecret').lean();
    const secret = settings?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[RazorpayWebhook] No webhook secret configured — rejecting.');
      return res.status(400).json({ success: false, message: 'Webhook not configured' });
    }

    const isValid = verifyWebhookSignature(req.rawBody, signature, secret);
    if (!isValid) {
      console.warn('[RazorpayWebhook] Invalid signature received.');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;

    if ((event === 'payment.captured' || event === 'order.paid') && paymentEntity?.order_id) {
      const booking = await Booking.findOne({ razorpayOrderId: paymentEntity.order_id });
      if (booking) {
        await finalizePaymentSuccess(booking, paymentEntity.id);
      } else {
        // Not the primary booking payment — check if this is an hourly-service extra-time order
        const extraBooking = await Booking.findOne({ 'hourlyTracking.extraRazorpayOrderId': paymentEntity.order_id });
        if (extraBooking) {
          const { finalizeExtraPaymentSuccess } = require('../bookingControllers/hourlyPaymentController');
          await finalizeExtraPaymentSuccess(extraBooking, paymentEntity.id);
        } else {
          console.warn(`[RazorpayWebhook] No booking found for order ${paymentEntity.order_id}`);
        }
      }
    }

    // Always ack quickly — Razorpay retries on non-200
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[RazorpayWebhook] Error:', error);
    // Still ack so Razorpay doesn't hammer retries for a local bug; the payment
    // remains reconcilable via getPaymentDetails/admin tooling if needed.
    res.status(200).json({ success: false });
  }
};

/**
 * Process wallet payment
 */
const processWalletPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { bookingId } = req.body;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get booking
    const booking = await Booking.findOne({ _id: bookingId, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if payment already done
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    // Check wallet balance
    if (user.wallet.balance < booking.finalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Deduct atomically so a balance cannot be spent by two requests at once.
    const updatedUser = await debitWalletContribution(booking, booking.finalAmount);

    // Update booking payment status
    booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
    booking.paymentMethod = 'wallet';
    booking.walletAmount = booking.finalAmount;
    booking.onlineAmount = 0;
    booking.pendingWalletAmount = 0;
    booking.paymentId = `WALLET_${Date.now()}`;

    // Update booking status
    if ([BOOKING_STATUS.PENDING, BOOKING_STATUS.SEARCHING, BOOKING_STATUS.AWAITING_PAYMENT].includes(booking.status)) {
      booking.status = BOOKING_STATUS.CONFIRMED;
    } else if (booking.status === BOOKING_STATUS.WORK_DONE) {
      booking.status = BOOKING_STATUS.COMPLETED;
      booking.completedAt = new Date();
    }

    await booking.save();

    // ── Credit Vendor Wallet from VendorBill (single source of truth) ──
    const Vendor = require('../../models/Vendor');
    const VendorBill = require('../../models/VendorBill');

    const bill = await VendorBill.findOne({ bookingId: booking._id });

    if (bill && booking.vendorId) {
      const vendorEarning = 0;

      // Mark bill as paid
      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();
      await creditSalaryEarningForBooking({ bookingId: booking._id, vendorId: booking.vendorId });

      // Wallet payment: only earnings increase, NO dues (platform holds the money)
      await Vendor.findByIdAndUpdate(booking.vendorId, {
        $inc: { 'wallet.earnings': vendorEarning }
      });

      if (vendorEarning > 0) {
        await Transaction.create({
          vendorId: booking.vendorId,
          bookingId: booking._id,
          amount: vendorEarning,
          type: 'earnings_credit',
          paymentMethod: 'system',
          status: 'completed',
          description: `Earnings ₹${vendorEarning} credited for booking ${booking.bookingNumber} (wallet payment)`,
          metadata: {
            type: 'earnings_increase',
            billId: bill._id.toString(),
            serviceEarning: bill.vendorServiceEarning,
            partsEarning: bill.vendorPartsEarning
          }
        });
      }

      console.log(`[Wallet Payment] Credited ₹${vendorEarning} to vendor ${booking.vendorId}`);
    }

    // Record stats in the Daily Earning Tracker (Async)
    recordBookingEarning({
      date: new Date(),
      totalRevenue: Number(bill ? bill.grandTotal : booking.finalAmount) || 0,
      totalGST: Number(bill ? bill.totalGST : 0) || 0,
      totalTDS: 0 // Tracked in withdrawals
    }).catch(err => console.error('[Wallet Payment] Daily tracker failed:', err));

    // Send notification to user
    await createNotification({
      userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of ₹${booking.finalAmount} for booking ${booking.bookingNumber} was successful.`,
      relatedId: booking._id,
      relatedType: 'payment',
      priority: 'high'
    });

    // Notify vendor & worker
    let vendorTitle = 'Booking Confirmed';
    let vendorMsg = `Payment received for booking ${booking.bookingNumber}. The service is now confirmed.`;

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      vendorTitle = 'Payment Received (Wallet)';
      vendorMsg = `User paid ₹${booking.finalAmount} via wallet for booking ${booking.bookingNumber}. Job Completed!`;
    }

    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'payment_success',
        title: vendorTitle,
        message: vendorMsg,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      });
    }

    if (booking.workerId) {
      await createNotification({
        workerId: booking.workerId,
        type: 'payment_success',
        title: vendorTitle,
        message: vendorMsg,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        bookingId: booking._id,
        amount: booking.finalAmount,
        remainingBalance: updatedUser.wallet.balance
      }
    });
  } catch (error) {
    console.error('Process wallet payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment. Please try again.'
    });
  }
};

/**
 * Process refund
 */
const processRefund = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bookingId } = req.body;
    const { amount } = req.body; // Optional: partial refund

    // Get booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if payment was successful
    if (booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed for this booking'
      });
    }

    // Process refund based on payment method
    if (booking.paymentMethod === 'wallet+online') {
      const totalWalletPaid = Number(booking.walletAmount || 0);
      const requestedRefund = amount === undefined || amount === null
        ? booking.finalAmount
        : Number(amount);
      const refundTotal = Math.min(Math.max(requestedRefund, 0), booking.finalAmount);
      const walletRefund = Math.min(totalWalletPaid, refundTotal);
      const onlineRefund = Math.max(refundTotal - walletRefund, 0);

      if (onlineRefund > 0 && booking.razorpayPaymentId) {
        const refundResult = await refundPayment(
          booking.razorpayPaymentId,
          onlineRefund,
          {
            bookingId: booking._id.toString(),
            reason: 'Booking cancellation'
          }
        );

        if (!refundResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to process online refund'
          });
        }
      }

      if (walletRefund > 0) {
        const user = await User.findById(booking.userId);
        if (user) {
          user.wallet.balance += walletRefund;
          await user.save();

          const Transaction = require('../../models/Transaction');
          await Transaction.create({
            userId: booking.userId,
            bookingId: booking._id,
            amount: walletRefund,
            type: 'refund',
            paymentMethod: 'wallet',
            status: 'completed',
            description: `Wallet refund for booking ${booking.bookingNumber}`,
            balanceAfter: user.wallet.balance
          });
        }
      }

      booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else if (booking.paymentMethod === 'razorpay' && booking.razorpayPaymentId) {
      // Razorpay refund
      const refundResult = await refundPayment(
        booking.razorpayPaymentId,
        amount || booking.finalAmount,
        {
          bookingId: booking._id.toString(),
          reason: 'Booking cancellation'
        }
      );

      if (!refundResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to process refund'
        });
      }

      // Update booking payment status
      booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else if (booking.paymentMethod === 'wallet') {
      // Wallet refund - add back to user wallet
      const user = await User.findById(booking.userId);
      if (user) {
        user.wallet.balance += (amount || booking.finalAmount);
        await user.save();
      }

      // Update booking payment status
      booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Refund not supported for this payment method'
      });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        bookingId: booking._id,
        refundAmount: amount || booking.finalAmount
      }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund. Please try again.'
    });
  }
};

/**
 * Get payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings with successful payments
    const bookings = await Booking.find({
      userId,
      paymentStatus: PAYMENT_STATUS.SUCCESS
    })
      .populate('serviceId', 'title iconUrl')
      .populate('vendorId', 'name businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments({
      userId,
      paymentStatus: PAYMENT_STATUS.SUCCESS
    });

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history. Please try again.'
    });
  }
};

const calculateUpgradeAmount = (currentPlan, newPlanPrice) => {
  if (!currentPlan || !currentPlan.isActive) return { amount: newPlanPrice, credit: 0 };

  const now = new Date();
  const expiry = new Date(currentPlan.expiry);

  if (expiry <= now) return { amount: newPlanPrice, credit: 0 };

  const totalDuration = 30 * 24 * 60 * 60 * 1000;
  const remainingTime = expiry.getTime() - now.getTime();

  let remainingRatio = remainingTime / totalDuration;
  if (remainingRatio > 1) remainingRatio = 1;
  if (remainingRatio < 0) remainingRatio = 0;

  const credit = Math.floor((currentPlan.price || 0) * remainingRatio);

  if (credit <= 0) return { amount: newPlanPrice, credit: 0 };

  let finalAmount = newPlanPrice - credit;
  if (finalAmount < 0) finalAmount = 0;

  return { amount: Math.ceil(finalAmount), credit };
};

const getUpgradeDetails = async (req, res) => {
  try {
    const { planId } = req.query;
    if (!planId) return res.status(400).json({ success: false, message: 'Plan ID required' });

    const newPlan = await Plan.findById(planId);
    if (!newPlan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const user = await User.findById(req.user.id);
    const { amount, credit } = calculateUpgradeAmount(user.plans, newPlan.price);

    res.status(200).json({
      success: true,
      data: {
        originalPrice: newPlan.price,
        credit,
        finalAmount: amount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};






const createPlanOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const user = await User.findById(req.user.id);

    // Calculate dynamic pricing
    const { amount } = calculateUpgradeAmount(user.plans, plan.price);

    // Add 18% Tax
    const amountWithTax = Math.ceil(amount * 1.18);

    const orderResult = await createOrder(
      amountWithTax,
      'INR',
      `PLAN_${Date.now()}`,
      { type: 'plan', planId, userId: req.user.id }
    );
    if (!orderResult.success) {
      return res.status(500).json({ success: false, message: 'Order creation failed' });
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyPlanPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    // Import verifyPayment if needed, but it's destructured at top
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid signature' });

    const plan = await Plan.findById(planId);
    const user = await User.findById(req.user.id);

    const validityDays = plan.validityDays || 30;
    user.plans = {
      isActive: true,
      name: plan.name,
      expiry: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
      price: plan.price
    };

    await user.save();

    res.status(200).json({ success: true, message: 'Plan activated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPaymentOrder,
  getPaymentBreakdown,
  verifyPaymentWebhook,
  handleRazorpayWebhook,
  processWalletPayment,
  processRefund,
  getPaymentHistory,
  createPlanOrder,
  verifyPlanPayment,
  getUpgradeDetails
};


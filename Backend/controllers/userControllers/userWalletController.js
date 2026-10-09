const mongoose = require('mongoose');
const User = require('../../models/User');
const { validationResult } = require('express-validator');
const { createOrder } = require('../../services/razorpayService');

/**
 * Get wallet balance
 */
const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('wallet');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        balance: user.wallet.balance || 0
      }
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance. Please try again.'
    });
  }
};

/**
 * Add money to wallet
 */
const addMoneyToWallet = async (req, res) => {
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
    const { amount } = req.body;

    // Validate amount
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount to add is ₹100'
      });
    }

    // Create Razorpay order for wallet top-up
    const orderResult = await createOrder(
      amount,
      'INR',
      `WALLET_${userId}_${Date.now()}`,
      {
        userId: userId.toString(),
        type: 'wallet_topup'
      }
    );

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100,
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Add money to wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order. Please try again.'
    });
  }
};

/**
 * Verify wallet top-up payment
 */
const verifyWalletTopup = async (req, res) => {
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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    // Verify signature
    const { verifyPayment } = require('../../services/razorpayService');
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add money to wallet
    const previousBalance = user.wallet.balance || 0;
    user.wallet.balance = previousBalance + amount;
    await user.save();

    // Create Transaction Record
    const Transaction = require('../../models/Transaction');
    await Transaction.create({
      userId: user._id,
      type: 'credit',
      amount: amount,
      status: 'completed',
      paymentMethod: 'razorpay', // or online
      description: 'Wallet Top-up',
      balanceBefore: previousBalance,
      balanceAfter: user.wallet.balance,
      referenceId: razorpay_payment_id,
      metadata: {
        orderId: razorpay_order_id,
        signature: razorpay_signature
      }
    });

    res.status(200).json({
      success: true,
      message: 'Money added to wallet successfully',
      data: {
        balance: user.wallet.balance
      }
    });
  } catch (error) {
    console.error('Verify wallet topup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add money to wallet. Please try again.'
    });
  }
};

/**
 * Get wallet transaction history
 */
const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    const parseFilterDate = (value, endExclusive = false) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const date = new Date(value + 'T00:00:00+05:30');
      if (Number.isNaN(date.getTime())) return null;
      if (endExclusive) date.setUTCDate(date.getUTCDate() + 1);
      return date;
    };

    const start = startDate ? parseFilterDate(startDate) : null;
    const end = endDate ? parseFilterDate(endDate, true) : null;
    if ((startDate && !start) || (endDate && !end) || (start && end && start >= end)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date range.'
      });
    }

    const query = { userId: new mongoose.Types.ObjectId(userId) };
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = start;
      if (end) query.createdAt.$lt = end;
    }

    const Transaction = require('../../models/Transaction');
    const skip = (parsedPage - 1) * parsedLimit;
    const spentTypes = ['payment', 'withdrawal', 'platform_fee', 'convenience_fee', 'gst', 'worker_payment', 'cash_collected'];
    const earnedTypes = ['credit', 'referral', 'refund', 'topup', 'cashback'];

    const [transactions, total, summaryResult] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSpent: {
              $sum: { $cond: [{ $in: ['$type', spentTypes] }, '$amount', 0] }
            },
            totalEarned: {
              $sum: { $cond: [{ $in: ['$type', earnedTypes] }, '$amount', 0] }
            }
          }
        }
      ])
    ]);

    const formattedTransactions = transactions.map(txn => ({
      id: txn._id,
      type: txn.type,
      amount: txn.amount,
      description: txn.description,
      date: txn.createdAt,
      status: txn.status,
      balanceAfter: txn.balanceAfter
    }));
    const summary = summaryResult[0] || { totalSpent: 0, totalEarned: 0 };

    res.status(200).json({
      success: true,
      data: formattedTransactions,
      summary: {
        totalSpent: Number(summary.totalSpent || 0),
        totalEarned: Number(summary.totalEarned || 0)
      },
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history. Please try again.'
    });
  }
};

module.exports = {
  getWalletBalance,
  addMoneyToWallet,
  verifyWalletTopup,
  getWalletTransactions
};

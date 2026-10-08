const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const {
  getWallet,
  getTransactions,
  recordCashCollection,
  getWalletSummary
} = require('../../controllers/vendorControllers/vendorWalletController');

// Validation rules
const cashCollectionValidation = [
  body('bookingId').notEmpty().withMessage('Booking ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required')
];

// Routes
// Get wallet with ledger balance
router.get('/wallet', authenticate, isVendor, getWallet);

// Get wallet summary for dashboard
router.get('/wallet/summary', authenticate, isVendor, getWalletSummary);

// Get transaction history/ledger
router.get('/wallet/transactions', authenticate, isVendor, getTransactions);

// Record cash collection (creates negative entry - vendor owes admin)
router.post('/wallet/cash-collection', authenticate, isVendor, cashCollectionValidation, recordCashCollection);

module.exports = router;

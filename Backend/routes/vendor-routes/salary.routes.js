const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const {
  getVendorSalaryWallet,
  getVendorSalaryEarnings,
  getVendorSalaryPayments
} = require('../../controllers/salaryController');

router.get('/wallet', authenticate, isVendor, getVendorSalaryWallet);
router.get('/earnings', authenticate, isVendor, getVendorSalaryEarnings);
router.get('/payments', authenticate, isVendor, getVendorSalaryPayments);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAdminSalaryWallets,
  getAdminVendorSalaryWallet,
  getAdminVendorPayrollPayments,
  getAdminSalaryPayments,
  updateSalaryRate,
  createPayrollPayment
} = require('../../controllers/salaryController');

router.get('/vendor-wallets', authenticate, isAdmin, getAdminSalaryWallets);
router.get('/salary-payments', authenticate, isAdmin, getAdminSalaryPayments);
router.get('/vendors/:vendorId/salary-wallet', authenticate, isAdmin, getAdminVendorSalaryWallet);
router.get('/vendors/:vendorId/salary-payments', authenticate, isAdmin, getAdminVendorPayrollPayments);
router.patch('/vendors/:vendorId/salary-rate', authenticate, isAdmin, updateSalaryRate);
router.post('/vendors/:vendorId/salary-payments', authenticate, isAdmin, createPayrollPayment);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../../middleware/roleMiddleware');
const {
  getAdminSalaryWallets,
  getAdminVendorSalaryWallet,
  getAdminVendorPayrollPayments,
  getAdminSalaryPayments,
  getAdminSalaryEarnings,
  updateSalaryRate,
  createPayrollPayment
} = require('../../controllers/salaryController');

const superAdminOnly = [authenticate, isAdmin, isSuperAdmin];

router.get('/vendor-wallets', superAdminOnly, getAdminSalaryWallets);
router.get('/salary-payments', superAdminOnly, getAdminSalaryPayments);
router.get('/salary-earnings', superAdminOnly, getAdminSalaryEarnings);
router.get('/vendors/:vendorId/salary-wallet', superAdminOnly, getAdminVendorSalaryWallet);
router.get('/vendors/:vendorId/salary-payments', superAdminOnly, getAdminVendorPayrollPayments);
router.patch('/vendors/:vendorId/salary-rate', superAdminOnly, updateSalaryRate);
router.post('/vendors/:vendorId/salary-payments', superAdminOnly, createPayrollPayment);

module.exports = router;

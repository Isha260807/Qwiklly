const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCouponUsageHistory
} = require('../../controllers/adminControllers/adminCouponController');

// All coupon management routes require admin privileges
router.use(authenticate, isAdmin);

router.get('/', getCoupons);
router.get('/:id', getCouponById);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.patch('/:id/toggle-status', toggleCouponStatus);
router.delete('/:id', deleteCoupon);
router.get('/:id/usage', getCouponUsageHistory);

module.exports = router;

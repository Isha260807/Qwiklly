const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const {
  getAvailableCoupons,
  applyCoupon,
  removeCoupon
} = require('../../controllers/couponControllers/couponController');

// All coupon user endpoints require authentication
router.use(authenticate, isUser);

router.get('/available', getAvailableCoupons);
router.post('/apply', applyCoupon);
router.post('/remove', removeCoupon);

module.exports = router;

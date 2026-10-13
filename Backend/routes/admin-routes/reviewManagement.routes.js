const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllReviews,
  updateReviewStatus,
  getReviewStats,
  getVendorRatingAnalytics
} = require('../../controllers/adminControllers/adminReviewController');

// All routes require authentication and admin role
router.use(authenticate, isAdmin);

// Get all reviews
router.get('/reviews', getAllReviews);

// Get review statistics
router.get('/reviews/stats', getReviewStats);

// Get week/month rating trend for one vendor
router.get('/reviews/vendor-analytics', getVendorRatingAnalytics);

// Update review status
router.patch('/reviews/:id/status', updateReviewStatus);

module.exports = router;

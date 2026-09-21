const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllBanners,
  getBannerStats,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners
} = require('../../controllers/adminControllers/adminBannerController');

// All routes require admin authentication
router.use(authenticate, isAdmin);

// Banner statistics
router.get('/banners/stats', getBannerStats);

// Reorder banners
router.patch('/banners/reorder', reorderBanners);

// Toggle banner status
router.patch('/banners/:id/status', toggleBannerStatus);

// CRUD operations
router.get('/banners', getAllBanners);
router.get('/banners/:id', getBannerById);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

module.exports = router;

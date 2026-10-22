const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const {
  getVendorServices
} = require('../../controllers/vendorControllers/vendorServiceController');

// Routes
router.get('/services', authenticate, isVendor, getVendorServices);

module.exports = router;

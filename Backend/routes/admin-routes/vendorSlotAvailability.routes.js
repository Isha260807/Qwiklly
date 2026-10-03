const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getVendorSlotAvailability,
  setVendorSlotAvailability
} = require('../../controllers/adminControllers/vendorSlotAvailabilityController');

router.get('/vendors/:vendorId/slot-availability', authenticate, isAdmin, getVendorSlotAvailability);
router.put('/vendors/:vendorId/slot-availability', authenticate, isAdmin, setVendorSlotAvailability);

module.exports = router;

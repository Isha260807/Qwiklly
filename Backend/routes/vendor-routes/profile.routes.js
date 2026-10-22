const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const { getProfile, updateProfile, updateAddress, updateLocation, syncLocation, getAssignedZones, toggleOnlineStatus } = require('../../controllers/vendorControllers/vendorProfileController');

// Validation rules
const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('businessName').optional().trim().isLength({ max: 100 }).withMessage('Business name must be less than 100 characters')
];

const updateAddressValidation = [
  body('fullAddress').notEmpty().trim().withMessage('Full address is required'),
  body('lat').notEmpty().isFloat().withMessage('Valid latitude is required'),
  body('lng').notEmpty().isFloat().withMessage('Valid longitude is required')
];

// Routes
router.get('/profile', authenticate, isVendor, getProfile);
router.get('/assigned-zones', authenticate, isVendor, getAssignedZones);
router.put('/profile', authenticate, isVendor, updateProfileValidation, updateProfile);
router.put('/profile/status', authenticate, isVendor, toggleOnlineStatus);
router.put('/status', authenticate, isVendor, toggleOnlineStatus);
router.put('/address', authenticate, isVendor, updateAddressValidation, updateAddress);
router.put('/profile/location', authenticate, isVendor, updateLocation);
// Live GPS + zone presence sync (auto-offline when outside assigned zones)
router.post('/profile/sync-location', authenticate, isVendor, syncLocation);

module.exports = router;



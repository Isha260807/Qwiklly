const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllBookings,
  getBookingById,
  cancelBooking,
  getBookingAnalytics,
  getEligibleVendorsForBooking,
  assignVendorToBooking
} = require('../../controllers/bookingControllers/adminBookingController');

// Validation rules
const cancelBookingValidation = [
  body('cancellationReason').optional().trim()
];

const assignVendorValidation = [
  body('vendorId').notEmpty().withMessage('vendorId is required')
];

// Routes
router.get('/bookings', authenticate, isAdmin, getAllBookings);
router.get('/bookings/analytics', authenticate, isAdmin, getBookingAnalytics);
router.get('/bookings/:id', authenticate, isAdmin, getBookingById);
router.post('/bookings/:id/cancel', authenticate, isAdmin, cancelBookingValidation, cancelBooking);
router.get('/bookings/:id/eligible-vendors', authenticate, isAdmin, getEligibleVendorsForBooking);
router.post('/bookings/:id/assign-vendor', authenticate, isAdmin, assignVendorValidation, assignVendorToBooking);

module.exports = router;


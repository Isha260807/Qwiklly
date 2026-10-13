const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  login,
  logout,
  updateProfile,
  getProfile,
  refreshToken
} = require('../../controllers/adminControllers/adminAuthController');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../../middleware/roleMiddleware');

// Validation rules
const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/login', loginValidation, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, isAdmin, logout);
router.put('/profile', authenticate, isAdmin, isSuperAdmin, updateProfile);
// Profile data is also used to refresh a sub-admin's latest permissions after
// the Super Admin changes module access. Updating the profile remains
// Super Admin-only below.
router.get('/profile', authenticate, isAdmin, getProfile);

module.exports = router;


const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  sendOTP,
  register,
  login,
  logout,
  verifyLogin,
  sendPhoneChangeOTP,
  verifyPhoneChangeOTP
} = require('../../controllers/vendorControllers/vendorAuthController');
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');

// Validation rules
const sendOTPValidation = [
  body('phone').trim().notEmpty().withMessage('Phone number is required').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Please provide a valid email')
];

const verifyLoginValidation = [
  body('phone').trim().notEmpty().withMessage('Phone number is required').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone number is required').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
  body('aadhar').trim().notEmpty().withMessage('Aadhar number is required').isLength({ min: 12, max: 12 }).withMessage('Aadhar number must be 12 digits'),
  body('pan').trim().notEmpty().withMessage('PAN number is required').isLength({ min: 10, max: 10 }).withMessage('PAN number must be 10 characters')
  // service and otp/token relaxed
];

const loginValidation = [
  body('phone').trim().notEmpty().withMessage('Phone number is required').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('token').trim().notEmpty().withMessage('Verification token is required')
];

const phoneChangeValidation = [
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Phone number must be a valid 10-digit Indian mobile number')
];

const phoneChangeVerifyValidation = [
  ...phoneChangeValidation,
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits')
];
// Routes
router.post('/change-phone/send-otp', authenticate, isVendor, phoneChangeValidation, sendPhoneChangeOTP);
router.post('/change-phone/verify-otp', authenticate, isVendor, phoneChangeVerifyValidation, verifyPhoneChangeOTP);
router.post('/send-otp', sendOTPValidation, sendOTP);
router.post('/verify-login', verifyLoginValidation, verifyLogin); // New Unified Entry
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh-token', require('../../controllers/vendorControllers/vendorAuthController').refreshToken);
router.post('/logout', authenticate, isVendor, logout);

module.exports = router;


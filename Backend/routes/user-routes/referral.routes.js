const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const { getMyReferralSummary } = require('../../controllers/userControllers/referralController');

router.get('/me', authenticate, isUser, getMyReferralSummary);

module.exports = router;

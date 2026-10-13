const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  requireAdminSettingsPermission,
  requireAdminSettingsUpdatePermission
} = require('../../middleware/adminAuthorization');
const { getSettings, updateSettings } = require('../../controllers/adminControllers/settingsController');

// All routes are protected and for admin only
router.use(authenticate, isAdmin);

router.get('/settings', requireAdminSettingsPermission([
  'settings_profile',
  'settings_support',
  'settings_financial',
  'settings_billing',
  'settings_referral',
  'settings_slots'
]), getSettings);

router.put('/settings', requireAdminSettingsUpdatePermission, updateSettings);

module.exports = router;

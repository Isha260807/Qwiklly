/**
 * User FCM Token Routes
 * Manages FCM tokens for push notifications
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { sendPushNotification } = require('../../services/firebaseAdmin');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');

const MAX_TOKENS = 10; // Maximum tokens per platform

/**
 * @route   POST /api/users/fcm-tokens/save
 * @desc    Save FCM token for user
 * @access  Private
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Use atomic updates to prevent VersionError (Race Conditions)

    // 1. Remove token if it exists (to avoid duplicates)
    const pullQuery = { $pull: { fcmTokens: token, fcmTokenMobile: token } };

    await User.findByIdAndUpdate(userId, pullQuery);

    // 2. Add token to front with limit
    const pushQuery = platform === 'mobile'
      ? {
        $push: {
          fcmTokenMobile: {
            $each: [token],
            $position: 0,
            $slice: MAX_TOKENS
          }
        }
      }
      : {
        $push: {
          fcmTokens: {
            $each: [token],
            $position: 0,
            $slice: MAX_TOKENS
          }
        }
      };

    const user = await User.findByIdAndUpdate(userId, pushQuery, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // A browser/device FCM token may be used by both the user and partner surfaces.
    // Keep it in both account collections so a shared test device receives the
    // correct notification for each active role. Logout removes the current role's token.
    res.json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * @route   DELETE /api/users/fcm-tokens/remove
 * @desc    Remove FCM token for user
 * @access  Private
 */
router.delete('/remove', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Remove token based on platform
    if (platform === 'web' && user.fcmTokens) {
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
    } else if (platform === 'mobile' && user.fcmTokenMobile) {
      user.fcmTokenMobile = user.fcmTokenMobile.filter(t => t !== token);
    }

    await user.save();

    res.json({ success: true, message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' });
  }
});

/**
 * @route   DELETE /api/users/fcm-tokens/remove-all
 * @desc    Remove ALL FCM tokens for a specific platform (called during logout)
 * @access  Private
 */
router.delete('/remove-all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { platform = 'web' } = req.body;

    // Clear only the specified platform's tokens
    const updateQuery = platform === 'mobile'
      ? { $set: { fcmTokenMobile: [] } }
      : { $set: { fcmTokens: [] } };

    const user = await User.findByIdAndUpdate(userId, updateQuery, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`[FCM] ✅ All ${platform} tokens removed for user: ${userId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * @route   POST /api/users/fcm-tokens/test
 * @desc    Send test notification to user (development only)
 * @access  Private
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const account = await User.findById(req.user._id).select('fcmTokens fcmTokenMobile');
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const tokens = Array.from(new Set([
      ...(account.fcmTokens || []),
      ...(account.fcmTokenMobile || [])
    ].filter(Boolean)));

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No FCM token is registered for this account. Login again and allow notifications.'
      });
    }

    const result = await sendPushNotification(tokens, {
      title: 'Test Notification',
      body: 'Push notifications are working properly!',
      data: {
        type: 'test',
        link: '/'
      },
      dataOnly: false
    });

    res.json({
      success: result.successCount > 0,
      message: result.successCount > 0
        ? 'Test notification sent successfully'
        : 'FCM could not deliver the test notification',
      successCount: result.successCount,
      failureCount: result.failureCount
    });
  } catch (error) {
    console.error('Error in user test notification route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

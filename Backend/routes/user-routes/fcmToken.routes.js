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
    const pullQuery = platform === 'mobile'
      ? { $pull: { fcmTokenMobile: token } }
      : { $pull: { fcmTokens: token } };

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

    // Remove this token from Vendor and Worker collections to prevent cross-account notifications
    // Remove this token from Vendor and Worker collections to prevent cross-account notifications
    // COMMENTED OUT to allow testing on same device (e.g. localhost) without tokens getting deleted
    /*
    try {
      await Vendor.updateMany(
        { $or: [{ fcmTokens: token }, { fcmTokenMobile: token }] },
        { $pull: { fcmTokens: token, fcmTokenMobile: token } }
      );

      await Worker.updateMany(
        { $or: [{ fcmTokens: token }, { fcmTokenMobile: token }] },
        { $pull: { fcmTokens: token, fcmTokenMobile: token } }
      );
    } catch (cleanupError) {
      console.error('Error removing token from other collections:', cleanupError);
      // Don't fail the request if cleanup fails
    }
    */

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
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Support token passed in request body
    const { token } = req.body;
    let tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];
    if (token && typeof token === 'string' && token.trim()) {
      const cleanToken = token.trim();
      tokens.push(cleanToken);
      // Auto-save to user.fcmTokens if not already saved
      if (!user.fcmTokens || !user.fcmTokens.includes(cleanToken)) {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { fcmTokens: cleanToken }
        });
      }
    }

    const uniqueTokens = [...new Set(tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0))];

    if (uniqueTokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No FCM tokens found. Please enable push notifications and grant browser permission first.'
      });
    }

    const title = '🔔 Test Notification';
    const body = 'This is a test notification from Quiklly! Push notifications are working properly.';

    const response = await sendPushNotification(uniqueTokens, {
      title,
      body,
      data: {
        type: 'test',
        link: '/user/notifications',
        timestamp: Date.now().toString()
      }
    });

    // Also store notification in user's Notification collection
    try {
      const Notification = require('../../models/Notification');
      await Notification.create({
        userId,
        type: 'general',
        title,
        message: body,
        data: { type: 'test' }
      });
    } catch (dbErr) {
      console.warn('Could not record notification in DB:', dbErr.message);
    }

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      successCount: response?.successCount || 0,
      failureCount: response?.failureCount || 0
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

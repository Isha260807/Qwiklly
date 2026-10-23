/**
 * Firebase Admin Service
 * Handles push notification sending via Firebase Cloud Messaging (FCM)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Pushes that must wake the device and ring like a call (vendor booking request).
const BOOKING_ALERT_TYPES = ['new_booking', 'booking_request'];
const BOOKING_ALERT_TTL_MS = 2 * 60 * 1000;

function parseServiceAccount(rawConfig) {
  if (!rawConfig) return null;

  let normalized = String(rawConfig).trim();
  if (normalized.length >= 2 && normalized.startsWith("'") && normalized.endsWith("'")) {
    normalized = normalized.slice(1, -1);
  }
  if (normalized.length >= 2 && normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }

  const serviceAccount = JSON.parse(normalized);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  return serviceAccount;
}

function readMultilineFirebaseConfigFromEnvFile() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return null;

  const envFile = fs.readFileSync(envPath, 'utf8');
  const match = envFile.match(/^\s*FIREBASE_CONFIG\s*=\s*'([\s\S]*?)'\s*(?:\r?\n|$)/m);
  return match ? parseServiceAccount(match[1]) : null;
}

// Initialize Firebase Admin SDK using deployment environment variables only.
function initFirebase() {
  if (admin.apps.length) return true;
  try {
    let serviceAccount;
    if (process.env.FIREBASE_CONFIG) {
      try {
        serviceAccount = parseServiceAccount(process.env.FIREBASE_CONFIG);
      } catch (error) {
        // dotenv cannot parse a pretty-printed single-quoted JSON block. Read
        // that same env value from the local env file without hardcoding creds.
        serviceAccount = readMultilineFirebaseConfigFromEnvFile();
        if (!serviceAccount) throw error;
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      const serviceAccountPath = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
      if (serviceAccountPath) {
        const resolved = path.resolve(__dirname, '..', serviceAccountPath);
        if (fs.existsSync(resolved)) {
          serviceAccount = parseServiceAccount(fs.readFileSync(resolved, 'utf8'));
        }
      }
    }

    if (serviceAccount && !admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin SDK initialized');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to load Firebase credentials:', error.message);
  }
  return false;
}

// Initial attempt
initFirebase();

/**
 * Send push notification to multiple tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {Object} payload.data - Additional data (optional)
 * @param {boolean} payload.highPriority - Send as high priority (default: true)
 * @returns {Promise<Object>} - Response with success/failure counts
 */
async function sendPushNotification(tokens, payload) {
  try {
    if (!admin.apps.length && !initFirebase()) {
      console.error('❌ Firebase Admin SDK is not initialized');
      throw new Error('Firebase Admin SDK is not initialized. Please configure FIREBASE_CONFIG in Backend/.env');
    }
    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens provided');
      return { successCount: 0, failureCount: 0 };
    }

    // Remove duplicates and empty values (Robust deduplication)
    const uniqueTokens = Array.from(new Set(tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0)));

    if (uniqueTokens.length === 0) {
      console.log('No valid FCM tokens after filtering');
      return { successCount: 0, failureCount: 0 };
    }

    // Ensure data values are strings (FCM requirement)
    const stringData = {
      // Always include title and body in data for data-only notifications and Service Worker access
      title: payload.title || (payload.body ? 'New Update' : 'App Notification'),
      body: payload.body || ''
    };
    if (payload.data) {
      Object.keys(payload.data).forEach(key => {
        stringData[key] = String(payload.data[key]);
      });
    }

    const message = {
      data: stringData,
      tokens: uniqueTokens,
      // Android specific configuration for high priority
      android: {
        priority: 'high', // HIGH priority for immediate delivery
        // notification block removed to ensure Data-Only message
      },
      // iOS/APNs specific configuration
      apns: {
        headers: {
          'apns-priority': '10', // Highest priority for immediate delivery
          'apns-push-type': 'alert'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1, // Wake up app in background
            'mutable-content': 1
          }
        }
      },
      // Web push configuration
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400' // 24 hours
        },
        fcmOptions: {
          link: payload.data?.link || '/'
        }
      },
      priority: payload.highPriority !== false ? 'high' : 'normal'
    };

    // Standard notification block (Top-level)
    message.notification = {
      title: payload.title || 'App Notification',
      body: payload.body || 'New Update',
    };

    // Android specific (Sound, Priority, Channel).
    // Delivered by the system even when the app is killed, so the channel and sound
    // must match what the Flutter app created (see FCM_* environment variables).
    // A channelId the device does not know falls back to FCM's default channel.
    const pushType = String(payload.data?.type || '');
    const isBookingAlert = BOOKING_ALERT_TYPES.includes(pushType);
    const channelId = isBookingAlert
      ? (process.env.FCM_BOOKING_CHANNEL_ID || process.env.FCM_DEFAULT_CHANNEL_ID)
      : process.env.FCM_DEFAULT_CHANNEL_ID;
    const sound = isBookingAlert ? process.env.FCM_BOOKING_SOUND : undefined;
    // Web notifications are rendered by firebase-messaging-sw.js. Sending both
    // an FCM notification payload and calling showNotification() in the worker
    // creates two browser notifications. Mobile tokens still use the native
    // notification payload below.
    const dataOnly = payload.dataOnly === true;
    const notificationTitle = payload.title || 'App Notification';
    const notificationBody = payload.body || 'New Update';

    if (!dataOnly) {
      // Standard notification block (top-level)
      message.notification = {
        title: notificationTitle,
        body: notificationBody,
      };

      // Android specific (Sound, Priority, Channel).
      // Delivered by the system even when the app is killed, so the channel and sound
      // must match what the Flutter app created (see FCM_* environment variables).
      const pushType = String(payload.data?.type || '');
      const isBookingAlert = BOOKING_ALERT_TYPES.includes(pushType);
      const channelId = isBookingAlert
        ? (process.env.FCM_BOOKING_CHANNEL_ID || process.env.FCM_DEFAULT_CHANNEL_ID)
        : process.env.FCM_DEFAULT_CHANNEL_ID;
      const sound = isBookingAlert ? process.env.FCM_BOOKING_SOUND : undefined;

      message.android.notification = {
        title: notificationTitle,
        body: notificationBody,
        color: '#f44336',
        priority: isBookingAlert ? 'max' : 'high',
        visibility: 'public',
        ...(channelId ? { channelId } : {}),
        ...(sound ? { sound } : { defaultSound: true })
      };
      if (isBookingAlert) {
        message.android.ttl = BOOKING_ALERT_TTL_MS;
      }

      // iOS/APNs specific (Sound, Alert, Badge)
      message.apns.payload.aps.alert = {
        title: notificationTitle,
        body: notificationBody,
      };

      // WebPush notification payload is intentionally omitted for web data-only pushes.
      message.webpush.notification = {
        title: notificationTitle,
        body: notificationBody,
      };
    }



    // Ensure critical fields are also in data for background handling
    // Use payload source directly since message.notification is disabled
    message.data.title = payload.title || 'App Notification';
    message.data.body = payload.body || 'New Update';

    // Log intent
    console.log('[FCM] Sending ' + (dataOnly ? 'data-only' : 'native') + ' notification to ' + uniqueTokens.length + ' tokens:', payload.title);

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Push notification sent - Success: ${response.successCount}, Failed: ${response.failureCount}`);

    // Log failed tokens for debugging and cleanup invalid ones
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          console.log(`❌ Failed token[${idx}]: ${errorCode} - ${resp.error?.message}`);

          if (errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token') {
            invalidTokens.push(uniqueTokens[idx]);
          }
        }
      });

      // Cleanup invalid tokens
      if (invalidTokens.length > 0) {
        removeInvalidTokens(invalidTokens);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    throw error;
  }
}

/**
 * Remove invalid FCM tokens from all collections
 * @param {string[]} tokens - Array of invalid tokens to remove
 */
async function removeInvalidTokens(tokens) {
  try {
    console.log(`[FCM Cleanup] Removing ${tokens.length} invalid tokens...`);
    const User = require('../models/User');
    const Vendor = require('../models/Vendor');

    const updateQuery = {
      $pull: {
        fcmTokens: { $in: tokens },
        fcmTokenMobile: { $in: tokens }
      }
    };

    // We run updates in parallel for all collections as a token might belong to any
    await Promise.all([
      User.updateMany({ $or: [{ fcmTokens: { $in: tokens } }, { fcmTokenMobile: { $in: tokens } }] }, updateQuery),
      Vendor.updateMany({ $or: [{ fcmTokens: { $in: tokens } }, { fcmTokenMobile: { $in: tokens } }] }, updateQuery)
    ]);

    console.log('[FCM Cleanup] ✅ Invalid tokens removed from database');
  } catch (err) {
    console.error('[FCM Cleanup] ❌ Error removing tokens:', err);
  }
}

/**
 * Send one native notification per unique token. The service worker skips
 * manual rendering when FCM already includes a notification payload.
 */
async function sendToPlatformTokens(webTokens = [], mobileTokens = [], payload = {}) {
  const allTokens = Array.from(new Set(
    [...(webTokens || []), ...(mobileTokens || [])]
      .filter(token => typeof token === 'string' && token.trim().length > 0)
  ));

  if (allTokens.length === 0) return;
  await sendPushNotification(allTokens, { ...payload, dataOnly: false });
}

/**
 * Send notification to a specific user
 */
async function sendNotificationToUser(userId, payload, includeMobile = true) {
  try {
    const User = require('../models/User');
    let user = await User.findById(userId).select('fcmTokens fcmTokenMobile');

    if (!user) {
      console.log('[FCM] User not found for notification: ' + userId);
      return;
    }

    let webTokens = user.fcmTokens || [];
    let mobileTokens = includeMobile ? (user.fcmTokenMobile || []) : [];

    // Login/token registration can finish a few hundred milliseconds after
    // the booking notification is created. Retry the read before giving up.
    if (webTokens.length === 0 && mobileTokens.length === 0) {
      for (const delayMs of [250, 500, 1000]) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        user = await User.findById(userId).select('fcmTokens fcmTokenMobile');
        if (!user) return;

        webTokens = user.fcmTokens || [];
        mobileTokens = includeMobile ? (user.fcmTokenMobile || []) : [];
        if (webTokens.length > 0 || mobileTokens.length > 0) break;
      }
    }

    if (webTokens.length === 0 && mobileTokens.length === 0) {
      console.log('[FCM] No FCM tokens found for user: ' + userId);
      return;
    }

    const finalPayload = {
      ...payload,
      highPriority: payload.priority === 'high' ||
        ['booking_accepted', 'worker_started', 'journey_started', 'work_done', 'work_completed', 'booking_completed', 'vendor_reached', 'visit_verified', 'payment_success', 'payment_received', 'work_started', 'in_progress', 'worker_accepted'].includes(payload.data?.type)
    };

    await sendToPlatformTokens(webTokens, mobileTokens, finalPayload);
  } catch (error) {
    console.error('[FCM] Error sending notification to user ' + userId + ':', error);
  }
}

/**
 * Send notification to a specific vendor
 */
async function sendNotificationToVendor(vendorId, payload, includeMobile = true) {
  try {
    const Vendor = require('../models/Vendor');
    let vendor = await Vendor.findById(vendorId).select('fcmTokens fcmTokenMobile');

    if (!vendor) {
      console.log('[FCM] Vendor not found for notification: ' + vendorId);
      return;
    }

    let webTokens = vendor.fcmTokens || [];
    let mobileTokens = includeMobile ? (vendor.fcmTokenMobile || []) : [];

    // Vendor login/token registration can complete just after a booking event.
    // Retry the DB read so a valid token saved during that race is not missed.
    if (webTokens.length === 0 && mobileTokens.length === 0) {
      for (const delayMs of [250, 500, 1000]) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        vendor = await Vendor.findById(vendorId).select('fcmTokens fcmTokenMobile');
        if (!vendor) return;

        webTokens = vendor.fcmTokens || [];
        mobileTokens = includeMobile ? (vendor.fcmTokenMobile || []) : [];
        if (webTokens.length > 0 || mobileTokens.length > 0) break;
      }
    }

    if (webTokens.length === 0 && mobileTokens.length === 0) {
      console.log('[FCM] No FCM tokens found for vendor: ' + vendorId);
      return;
    }

    const finalPayload = {
      ...payload,
      title: '[Partner] ' + payload.title
    };

    await sendToPlatformTokens(webTokens, mobileTokens, finalPayload);
  } catch (error) {
    console.error('[FCM] Error sending notification to vendor ' + vendorId + ':', error);
  }
}

/**
 * Send notification to a specific admin
 */
async function sendNotificationToAdmin(adminId, payload, includeMobile = true) {
  try {
    let adminUser = null;
    try {
      const Admin = require('../models/Admin');
      adminUser = await Admin.findById(adminId);
    } catch (e) {
      const User = require('../models/User');
      adminUser = await User.findById(adminId);
    }

    if (!adminUser) {
      console.log('Admin not found: ' + adminId);
      return;
    }

    const webTokens = adminUser.fcmTokens || [];
    const mobileTokens = includeMobile ? (adminUser.fcmTokenMobile || []) : [];
    if (webTokens.length === 0 && mobileTokens.length === 0) {
      console.log('[FCM] No FCM tokens found for admin: ' + adminId);
      return;
    }

    const finalPayload = {
      ...payload,
      title: '[Admin] ' + payload.title
    };

    await sendToPlatformTokens(webTokens, mobileTokens, finalPayload);
  } catch (error) {
    console.error('[FCM] Error sending notification to admin ' + adminId + ':', error);
  }
}

/**
 * Send notification to a specific worker
 */
async function sendNotificationToWorker(workerId, payload, includeMobile = true) {
  try {
    // Workers are represented by Vendor documents in the current data model.
    const Vendor = require('../models/Vendor');
    const worker = await Vendor.findById(workerId);
    if (!worker) {
      console.log('[FCM] Worker not found for notification: ' + workerId);
      return;
    }

    const webTokens = worker.fcmTokens || [];
    const mobileTokens = includeMobile ? (worker.fcmTokenMobile || []) : [];
    if (webTokens.length === 0 && mobileTokens.length === 0) {
      console.log('[FCM] No FCM tokens found for worker: ' + workerId);
      return;
    }

    const finalPayload = {
      ...payload,
      highPriority: payload.priority === 'high' || payload.data?.type === 'payment_received'
    };

    await sendToPlatformTokens(webTokens, mobileTokens, finalPayload);
  } catch (error) {
    console.error('[FCM] Error sending notification to worker ' + workerId + ':', error);
  }
}

module.exports = {
  sendPushNotification,
  sendNotificationToUser,
  sendNotificationToVendor,
  sendNotificationToWorker,
  sendNotificationToAdmin
};

/**
 * Push Notification Service
 * Handles FCM token registration and notification handling
 */

import { messaging, firebaseConfig, getToken, onMessage } from '../firebase';
import flutterBridge from '../utils/flutterBridge';

const VAPID_KEY = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

function getConfiguredApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('[FCM] VITE_API_BASE_URL is missing from the frontend environment');
  }
  return API_BASE_URL;
}

function getFirebaseServiceWorkerUrl() {
  const serviceWorkerUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  const serviceWorkerConfig = {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
    measurementId: firebaseConfig.measurementId,
    databaseURL: firebaseConfig.databaseURL
  };

  Object.entries(serviceWorkerConfig).forEach(([key, value]) => {
    if (value) serviceWorkerUrl.searchParams.set(`firebase_${key}`, value);
  });

  return serviceWorkerUrl.href;
}

/**
 * Check if running inside Flutter WebView
 * @returns {boolean}
 */
function isFlutterWebView() {
  return typeof window !== 'undefined' && !!window.flutter_inappwebview;
}

/**
 * Get the current platform type
 * @returns {'web' | 'mobile'}
 */
function getPlatformType() {
  return isFlutterWebView() ? 'mobile' : 'web';
}

/**
 * Get the native Firebase token from the Flutter host.
 * Flutter WebView does not reliably support browser service workers or the
 * browser Notification API, so mobile must use the native FCM token.
 */
async function getNativeFCMToken() {
  try {
    const result = await flutterBridge.callHandler('getFcmToken');
    const token = typeof result === 'string'
      ? result
      : result?.token || result?.fcmToken || result?.data?.token;

    if (!token || typeof token !== 'string') {
      console.error('[FCM] Flutter did not return a native FCM token');
      return null;
    }

    return token.trim() || null;
  } catch (error) {
    console.error('[FCM] Failed to get native FCM token from Flutter:', error);
    return null;
  }
}

/**
 * Register service worker for push notifications
 * @returns {Promise<ServiceWorkerRegistration>}
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(getFirebaseServiceWorkerUrl(), {
        updateViaCache: 'none' // Force fetch from network, don't use cache
      });
      // Force update to pick up any config changes
      await registration.update();
      console.log('✅ Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Service Workers are not supported in this browser');
  }
}

/**
 * Request notification permission from user
 * @returns {Promise<boolean>}
 */
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  }
  // console.log('❌ Notifications not supported');
  return false;
}

/**
 * Get FCM token from Firebase
 * @returns {Promise<string|null>}
 */
let lastFcmError = '';

/**
 * Last reason a web FCM token could not be obtained (shown to the user by the test button).
 * @returns {string}
 */
function getLastFcmError() {
  return lastFcmError;
}

/**
 * Drop a stale browser push subscription (e.g. created earlier for another
 * Firebase project/VAPID key) so Firebase can subscribe again cleanly.
 */
async function resetPushSubscription() {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager?.getSubscription();
    if (subscription) await subscription.unsubscribe();
    if (typeof window !== 'undefined' && window.indexedDB) {
      window.indexedDB.deleteDatabase('firebase-messaging-database');
      window.indexedDB.deleteDatabase('firebase-installations-database');
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  } catch (resetErr) {
    console.warn('[FCM] Failed to reset push subscription:', resetErr);
  }
}

async function getFCMToken(retryCount = 0) {
  try {
    lastFcmError = '';

    if (!messaging) {
      lastFcmError = 'Firebase is not configured on this site (missing env variables).';
      console.error('Firebase messaging not initialized');
      return null;
    }

    if (!VAPID_KEY) {
      lastFcmError = 'Push key (VAPID) is missing on this site.';
      console.error('[FCM] VITE_FIREBASE_VAPID_KEY is missing from the frontend environment');
      return null;
    }

    const registration = await registerServiceWorker();
    try {
      await registration.update(); // Update service worker
    } catch (swErr) {
      // Non-critical if SW update fails
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('❌ No FCM token available');
      return null;
    }
  } catch (error) {
    // If IndexedDB version mismatch occurs (e.g. VersionError: The requested version (1) is less than the existing version (2))
    if (retryCount === 0 && (error?.name === 'VersionError' || (error?.message && error.message.includes('VersionError')))) {
      console.warn('⚠️ IndexedDB VersionError encountered in FCM. Resetting Firebase IndexedDB databases and retrying...');
      try {
        if (typeof window !== 'undefined' && window.indexedDB) {
          window.indexedDB.deleteDatabase('firebase-messaging-database');
          window.indexedDB.deleteDatabase('firebase-installations-database');
          window.indexedDB.deleteDatabase('fcm_token_details_db');
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        return await getFCMToken(1);
      } catch (dbErr) {
        console.error('Failed to reset Firebase IndexedDB:', dbErr);
      }
    }
    // A subscription made with an older VAPID key/project blocks a new subscribe().
    if (retryCount === 0 && (error?.name === 'InvalidStateError' || error?.name === 'AbortError')) {
      console.warn('⚠️ Stale push subscription detected. Resetting and retrying...');
      await resetPushSubscription();
      return await getFCMToken(1);
    }
    lastFcmError = error?.code || error?.name || error?.message || 'Unknown error while getting push token.';
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}

/**
 * Register FCM token with backend
 * @param {string} userType - 'user', 'vendor', or 'worker'
 * @param {boolean} forceUpdate - Force token update
 * @returns {Promise<string|null>}
 */
async function registerFCMTokenInternal(userType = 'user', forceUpdate = false, platform = getPlatformType()) {
  try {
    console.log(`[FCM] Starting registration for ${userType}, forceUpdate: ${forceUpdate}`);

    let token = null;

    if (platform === 'mobile') {
      console.log('[FCM] Getting native FCM token from Flutter...');
      token = await getNativeFCMToken();
    } else {
      // Browser web notifications use the Firebase web SDK and service worker.
      console.log('[FCM] Requesting notification permission...');
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.log('[FCM] ❌ Notification permission not granted, skipping FCM registration');
        return null;
      }

      console.log('[FCM] Getting web FCM token from Firebase...');
      token = await getFCMToken();
    }

    if (!token) {
      console.log(`[FCM] ❌ Failed to get ${platform} FCM token`);
      return null;
    }
    console.log('[FCM] ✅ Got FCM token:', token.substring(0, 30) + '...');

    // Determine API endpoint based on user type
    let endpoint;
    let authTokenKey;
    switch (userType) {
      case 'vendor':
        endpoint = '/vendors/fcm-tokens/save';
        authTokenKey = 'vendorAccessToken';
        break;
      case 'worker':
        endpoint = '/workers/fcm-tokens/save';
        authTokenKey = 'workerAccessToken';
        break;
      case 'user':
        endpoint = '/users/fcm-tokens/save';
        authTokenKey = 'accessToken';
        break;
      default:
        // console.warn(`[FCM] Unknown userType: ${userType}, defaulting to user`);
        endpoint = '/users/fcm-tokens/save';
        authTokenKey = 'accessToken';
    }

    // Get auth token
    const authToken = localStorage.getItem(authTokenKey) || sessionStorage.getItem(authTokenKey);
    if (!authToken) {
      console.log(`[FCM] ❌ No auth token found for ${userType} (${authTokenKey}), skipping registration`);
      return null;
    }

    // Save to backend
    const baseUrl = getConfiguredApiBaseUrl();
    console.log(`[FCM] Saving to backend: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token: token,
        platform: platform
      })
    });

    console.log(`[FCM] Backend response status: ${response.status}`);

    if (response.ok) {
      // Token is stored only by the backend against the authenticated account.
      console.log('[FCM] ✅ FCM token registered with backend successfully!');
      return token;
    } else {
      const error = await response.json();
      console.error('[FCM] ❌ Failed to register token with backend:', error);
      return null;
    }
  } catch (error) {
    console.error('[FCM] ❌ Error registering FCM token:', error);
    return null;
  }
}

const fcmRegistrationInFlight = new Map();

/**
 * Register one token at a time per account and platform. Login, socket
 * connection and dashboard mount can all happen together.
 */
async function registerFCMToken(userType = 'user', forceUpdate = false) {
  const platform = getPlatformType();
  const registrationKey = userType + ':' + platform;
  const existingRequest = fcmRegistrationInFlight.get(registrationKey);
  if (existingRequest) return existingRequest;

  const request = registerFCMTokenInternal(userType, forceUpdate, platform);
  fcmRegistrationInFlight.set(registrationKey, request);

  try {
    return await request;
  } finally {
    if (fcmRegistrationInFlight.get(registrationKey) === request) {
      fcmRegistrationInFlight.delete(registrationKey);
    }
  }
}
/**
 * Remove FCM token from backend (removes specific token for current device)
 * @param {string} userType - 'user', 'vendor', or 'worker'
 */
async function removeFCMToken(userType = 'user') {
  try {
    // Detect platform automatically
    const platform = getPlatformType();
    // Read the current token from Firebase instead of a client-side cache.
    const tokenToRemove = await getFCMToken();
    if (!tokenToRemove) {
      console.log('[FCM] No current Firebase token found for ' + userType);
      return;
    }

    // console.log(`[FCM] Removing ${platform} token for ${userType}...`);

    // Determine API endpoint based on user type
    let endpoint;
    let authTokenKey;
    switch (userType) {
      case 'vendor':
        endpoint = '/vendors/fcm-tokens/remove';
        authTokenKey = 'vendorAccessToken';
        break;
      case 'worker':
        endpoint = '/workers/fcm-tokens/remove';
        authTokenKey = 'workerAccessToken';
        break;
      default:
        endpoint = '/users/fcm-tokens/remove';
        authTokenKey = 'accessToken';
    }

    const authToken = localStorage.getItem(authTokenKey) || sessionStorage.getItem(authTokenKey);
    // If we have an auth token, try to remove from backend
    if (authToken) {
      const baseUrl = getConfiguredApiBaseUrl();

      // Call remove endpoint with specific token
      await fetch(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token: tokenToRemove,
          platform: platform
        })
      });
      console.log(`[FCM] ✅ Token removed from backend`);
    }

  } catch (error) {
    console.error('[FCM] Error removing FCM token:', error);
  }
}

/**
 * Setup foreground notification handler
 * @param {Function} handler - Custom handler function
 */
function setupForegroundNotificationHandler(handler) {
  if (!messaging) {
    // console.error('Firebase messaging not initialized');
    return;
  }

  onMessage(messaging, (payload) => {
    // console.log('📬 Foreground message received:', payload);

    const data = payload.data || {};
    const notification = payload.notification || {};

    // Use notification fields first, then data fields as fallback (for data-only messages)
    const title = notification.title || data.title || 'New Notification';
    const body = notification.body || data.body || '';
    const type = data.type || data.notificationType || 'default';

    // FCM does not automatically show a browser tray notification while the
    // page is active. Render one here so foreground and background delivery
    // have the same visible behavior.
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted' &&
      document.visibilityState === 'visible' &&
      (title || body)
    ) {
      const foregroundNotification = new window.Notification(title, {
        body,
        ...(data.notificationId || data.bookingId
          ? { tag: data.notificationId || data.bookingId }
          : {})
      });

      foregroundNotification.onclick = () => {
        window.focus();
        if (data.link) {
          window.location.assign(data.link);
        }
        foregroundNotification.close();
      };
    }

    // Call custom handler (e.g. for toast)
    if (handler) {
      handler(payload);
    }
  });
}

/**
 * Browsers (esp. Chrome on Android) ignore notification permission prompts that
 * are not triggered by a tap. If registration at login could not get permission,
 * retry once on the user's next tap.
 * @param {string} userType - 'user', 'vendor', or 'worker'
 */
function registerFCMTokenOnNextGesture(userType = 'user') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (isFlutterWebView() || Notification.permission !== 'default') return;

  const handler = () => {
    document.removeEventListener('click', handler, true);
    registerFCMToken(userType, true).catch(console.error);
  };
  document.addEventListener('click', handler, true);
}

/**
 * Initialize push notifications
 * Call this on app load
 */
async function initializePushNotifications() {
  try {
    if (!('serviceWorker' in navigator)) {
      // console.log('Service workers not supported');
      return;
    }

    if (!('Notification' in window)) {
      // console.log('Notifications not supported');
      return;
    }

    await registerServiceWorker();
    // console.log('✅ Push notifications initialized');
  } catch (error) {
    // console.error('Error initializing push notifications:', error);
  }
}

/**
 * Test push notification for current user device
 * @param {string} userType - 'user' | 'vendor'
 * @returns {Promise<{success: boolean, message?: string, error?: string, details?: any}>}
 */
async function testPushNotification(userType = 'user') {
  try {
    const platform = getPlatformType();

    if (platform !== 'mobile') {
      // Browser support checks are not applicable inside Flutter WebView.
      if (!('Notification' in window)) {
        return {
          success: false,
          error: 'Push notifications are not supported in this browser.'
        };
      }

      if (!('serviceWorker' in navigator)) {
        return {
          success: false,
          error: 'Service Workers are not supported in this browser.'
        };
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'denied') {
        return {
          success: false,
          error: 'Notification permission is blocked. Please allow notifications in your browser settings (lock icon near URL).'
        };
      }
    }

    // 3. Register the platform-specific FCM token
    let token = null;
    try {
      token = await registerFCMToken(userType, true);
    } catch (e) {
      console.warn('[FCM] registerFCMToken warning:', e);
    }

    if (!token && platform !== 'mobile') {
      try {
        token = await getFCMToken();
      } catch (e) {
        console.warn('[FCM] getFCMToken warning:', e);
      }
    }

    // Without a registered token the backend has nothing to send to; report the real reason.
    if (!token) {
      const reason = platform === 'mobile'
        ? 'Could not get the device push token from the app.'
        : `Could not get a push token for this browser${lastFcmError ? ` (${lastFcmError})` : ''}.`;
      return { success: false, error: reason };
    }

    // 4. Send request to backend
    const authTokenKey = userType === 'vendor' ? 'vendorAccessToken' : 'accessToken';
    const authToken = localStorage.getItem(authTokenKey) || sessionStorage.getItem(authTokenKey);

    if (!authToken) {
      return {
        success: false,
        error: 'You need to be logged in to test notifications.'
      };
    }

    const baseUrl = getConfiguredApiBaseUrl();
    const endpoint = userType === 'vendor' ? '/vendors/fcm-tokens/test' : '/users/fcm-tokens/test';

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ token: token || undefined })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to send test notification from backend.'
      };
    }

    // 5. Local notification banner disabled


    return {
      success: true,
      message: data.message || 'Test notification sent successfully!',
      details: data
    };
  } catch (error) {
    console.error('[FCM] testPushNotification failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to send test notification.'
    };
  }
}

export {
  initializePushNotifications,
  registerFCMToken,
  registerFCMTokenOnNextGesture,
  getLastFcmError,
  removeFCMToken,
  setupForegroundNotificationHandler,
  requestNotificationPermission,
  getFCMToken,
  testPushNotification
};


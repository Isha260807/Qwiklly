import { useEffect, useRef, useSyncExternalStore } from 'react';
import { toast } from 'react-hot-toast';
import vendorService from '../../../services/vendorService';

/**
 * Vendor live-location & zone-presence tracking.
 *
 * - Syncs GPS with the backend on app entry, whenever the app returns to the
 *   foreground, and periodically while visible.
 * - Backend decides zone presence and auto-offlines an idle vendor who left
 *   all assigned zones (see backend vendorZonePresenceService).
 * - Presence is kept in a tiny shared store so every Header instance
 *   (rendered per page) shows the same state instantly.
 */

const SYNC_INTERVAL_ONLINE_MS = 45 * 1000;
const SYNC_INTERVAL_OFFLINE_MS = 90 * 1000;
const STORAGE_KEY = 'vendorZonePresence';

// ---------------------------------------------------------------------------
// Shared presence store
// ---------------------------------------------------------------------------
const loadInitial = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return saved;
  } catch { /* ignore */ }
  return {
    status: 'unknown', // 'unknown' | 'checking' | 'ok' | 'permission_denied' | 'unavailable' | 'error'
    isInsideAssignedZone: null,
    canGoOnline: null,
    currentZones: [],
    currentPhysicalZone: null,
    assignedZones: [],
    reason: null,
    message: null
  };
};

let presenceState = loadInitial();
const listeners = new Set();

const setPresence = (patch) => {
  presenceState = { ...presenceState, ...patch };
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(presenceState)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getZonePresence = () => presenceState;

export const useZonePresence = () => useSyncExternalStore(subscribe, getZonePresence, getZonePresence);

// ---------------------------------------------------------------------------
// GPS helper
// ---------------------------------------------------------------------------
export const getCurrentCoords = ({ timeout = 15000, maximumAge = 30000 } = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const err = new Error('Geolocation not supported');
      err.code = 'UNSUPPORTED';
      reject(err);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout, maximumAge }
    );
  });

const isOnlineLocally = () => localStorage.getItem('vendorIsOnline') === 'true';

const broadcastOnline = (isOnline) => {
  localStorage.setItem('vendorIsOnline', String(isOnline));
  window.dispatchEvent(new CustomEvent('vendorOnlineStatusChanged', { detail: { isOnline } }));
};

let inFlight = null;

/**
 * Perform one GPS + presence sync. Safe to call from anywhere; concurrent
 * calls share the same request.
 */
export const syncZonePresence = () => {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const prev = presenceState;
    if (prev.status === 'unknown') setPresence({ status: 'checking' });

    let coords;
    try {
      coords = await getCurrentCoords();
    } catch (err) {
      const denied = err && err.code === 1; // PERMISSION_DENIED
      setPresence({
        status: denied ? 'permission_denied' : 'unavailable',
        canGoOnline: false,
        message: denied
          ? 'Location permission is blocked. Allow location to go online.'
          : 'Unable to get your location. Turn on GPS to go online.'
      });
      return presenceState;
    }

    try {
      const res = await vendorService.syncLocation(coords);
      if (!res?.success) return presenceState;

      setPresence({
        status: 'ok',
        isInsideAssignedZone: res.isInsideAssignedZone,
        canGoOnline: res.canGoOnline,
        currentZones: res.currentZones || [],
        currentPhysicalZone: res.currentPhysicalZone || null,
        assignedZones: res.assignedZones || [],
        reason: res.reason,
        message: res.message,
        pendingExit: res.pendingExit,
        onActiveJob: res.onActiveJob
      });

      // Server is the source of truth for online state
      if (typeof res.isOnline === 'boolean' && res.isOnline !== isOnlineLocally()) {
        broadcastOnline(res.isOnline);
      }

      if (res.autoOfflined) {
        toast.error('You left your assigned zone. You have been switched OFFLINE.', {
          id: 'zone-auto-offline',
          duration: 6000
        });
      } else if (prev.canGoOnline === false && res.canGoOnline === true && !res.isOnline) {
        const zoneName = res.currentZones?.[0]?.name;
        toast.success(`You are back in ${zoneName || 'your zone'}. You can go online now.`, {
          id: 'zone-back-in',
          duration: 5000
        });
      }
    } catch (err) {
      // Network / server error: keep last known presence, don't flip state
      console.warn('[ZonePresence] sync failed:', err?.message);
      setPresence({ status: prev.status === 'checking' ? 'error' : prev.status });
    }
    return presenceState;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
};

/**
 * Mount ONCE inside the authenticated vendor app.
 */
export const useVendorZonePresenceTracker = (enabled = true) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const hasToken = () =>
      Boolean(localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken'));

    let cancelled = false;

    const schedule = () => {
      clearTimeout(timerRef.current);
      if (cancelled || document.visibilityState !== 'visible') return;
      const delay = isOnlineLocally() ? SYNC_INTERVAL_ONLINE_MS : SYNC_INTERVAL_OFFLINE_MS;
      timerRef.current = setTimeout(async () => {
        if (hasToken()) await syncZonePresence();
        schedule();
      }, delay);
    };

    const runNow = async () => {
      if (!hasToken()) return;
      await syncZonePresence();
      schedule();
    };

    // App entry
    runNow();

    // Foreground / unlock: re-verify immediately (mobile browsers pause GPS & timers in background)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') runNow();
      else clearTimeout(timerRef.current);
    };
    // Re-schedule with the right cadence when online state changes
    const onOnlineChange = () => schedule();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('vendorOnlineStatusChanged', onOnlineChange);

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('vendorOnlineStatusChanged', onOnlineChange);
    };
  }, [enabled]);
};

export default useVendorZonePresenceTracker;

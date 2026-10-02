import api from './api';

let cachedSettings = null;
let inFlightPromise = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const configService = {
  getSettings: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedSettings && (now - lastFetchedAt < CACHE_TTL_MS)) {
      return cachedSettings;
    }

    if (inFlightPromise) {
      return inFlightPromise;
    }

    inFlightPromise = (async () => {
      try {
        const response = await api.get('/public/config');
        if (response.data && response.data.success) {
          cachedSettings = response.data;
          lastFetchedAt = Date.now();
        }
        return response.data;
      } catch (error) {
        console.error('Error getting public settings', error);
        return {
          success: false,
          settings: {
            visitedCharges: 0,
            serviceGstPercentage: 0,
            partsGstPercentage: 0,
            instantBookingCharges: 0,
            servicePayoutPercentage: 0,
            partsPayoutPercentage: 0
          }
        };
      } finally {
        inFlightPromise = null;
      }
    })();

    return inFlightPromise;
  },

  clearCache: () => {
    cachedSettings = null;
    lastFetchedAt = 0;
  }
};

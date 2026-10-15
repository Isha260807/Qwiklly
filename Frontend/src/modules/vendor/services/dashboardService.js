import api from '../../../services/api';

const DASHBOARD_CACHE_TTL = 30000;
let dashboardStatsCache = null;
let dashboardStatsRequest = null;

const getVendorScope = () => {
  try {
    const profile = JSON.parse(localStorage.getItem('vendorData') || '{}');
    return String(profile._id || profile.id || profile.phone || 'anonymous');
  } catch {
    return 'anonymous';
  }
};

const getCachedDashboardStats = () => {
  const scope = getVendorScope();
  if (
    dashboardStatsCache &&
    dashboardStatsCache.scope === scope &&
    Date.now() - dashboardStatsCache.fetchedAt < DASHBOARD_CACHE_TTL
  ) {
    return dashboardStatsCache.data;
  }
  return null;
};

/**
 * Vendor Dashboard Service
 * Handles all dashboard-related API calls
 */
export const vendorDashboardService = {
  /**
   * Get vendor dashboard statistics
   * @returns {Promise<Object>} Dashboard stats and recent bookings
   */
  getDashboardStats: async ({ forceRefresh = false } = {}) => {
    const scope = getVendorScope();
    const cached = getCachedDashboardStats();

    if (!forceRefresh && cached) {
      return cached;
    }

    if (dashboardStatsRequest?.scope === scope) {
      return dashboardStatsRequest.promise;
    }

    const request = api.get('/vendors/dashboard/stats')
      .then((response) => {
        const data = response.data;
        dashboardStatsCache = {
          scope,
          data,
          fetchedAt: Date.now()
        };
        return data;
      })
      .catch((error) => {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      })
      .finally(() => {
        if (dashboardStatsRequest?.promise === request) {
          dashboardStatsRequest = null;
        }
      });

    dashboardStatsRequest = { scope, promise: request };
    return request;
  },

  getCachedDashboardStats,

  /**
   * Get revenue analytics
   * @param {string} period - 'daily', 'weekly', or 'monthly'
   * @returns {Promise<Object>} Revenue analytics data
   */
  getRevenueAnalytics: async (period = 'monthly') => {
    try {
      const response = await api.get(`/vendors/dashboard/revenue?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  },

  /**
   * Get worker performance statistics
   * @returns {Promise<Object>} Worker performance data
   */
  getWorkerPerformance: async () => {
    try {
      const response = await api.get('/vendors/dashboard/workers');
      return response.data;
    } catch (error) {
      console.error('Error fetching worker performance:', error);
      throw error;
    }
  },

  /**
   * Get service performance metrics
   * @returns {Promise<Object>} Service performance data
   */
  getServicePerformance: async () => {
    try {
      const response = await api.get('/vendors/dashboard/services');
      return response.data;
    } catch (error) {
      console.error('Error fetching service performance:', error);
      throw error;
    }
  }
};

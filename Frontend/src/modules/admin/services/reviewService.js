import api from '../../../services/api';

/**
 * Admin Review Service
 * Manages user reviews from admin perspective
 */
const reviewService = {
  /**
   * Get all reviews with pagination and filters
   * @param {Object} params - Query parameters (page, limit, status, rating, vendorId, serviceId, userId)
   */
  getAllReviews: async (params = {}) => {
    const response = await api.get('/admin/reviews', { params });
    return response.data;
  },

  /**
   * Update review status
   * @param {string} reviewId - The ID of the review to update
   * @param {string} status - New status ('active', 'hidden', 'deleted')
   */
  updateReviewStatus: async (reviewId, status) => {
    const response = await api.patch(`/admin/reviews/${reviewId}/status`, { status });
    return response.data;
  },

  /**
   * Get review statistics
   */
  getReviewStats: async () => {
    const response = await api.get('/admin/reviews/stats');
    return response.data;
  },

  /**
   * Get week/month rating trend for a selected vendor
   */
  getVendorRatingAnalytics: async (vendorId, period = 'week', dateRange = {}) => {
    const response = await api.get('/admin/reviews/vendor-analytics', {
      params: {
        vendorId,
        period,
        ...(dateRange.fromDate ? { fromDate: dateRange.fromDate } : {}),
        ...(dateRange.toDate ? { toDate: dateRange.toDate } : {})
      }
    });
    return response.data;
  }
};

export default reviewService;

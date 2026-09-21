import api from '../../../services/api';

/**
 * Admin Coupon Service
 * Handles CRUD operations, status toggling, deletion, and usage history for coupons
 */
const couponService = {
  /**
   * Get all coupons with pagination and filters
   * @param {Object} params - Query parameters (page, limit, search, status, discountType)
   */
  getCoupons: async (params = {}) => {
    const response = await api.get('/admin/coupons', { params });
    return response.data;
  },

  /**
   * Get single coupon by ID
   * @param {string} id
   */
  getCouponById: async (id) => {
    const response = await api.get(`/admin/coupons/${id}`);
    return response.data;
  },

  /**
   * Create new coupon
   * @param {Object} data
   */
  createCoupon: async (data) => {
    const response = await api.post('/admin/coupons', data);
    return response.data;
  },

  /**
   * Update existing coupon
   * @param {string} id
   * @param {Object} data
   */
  updateCoupon: async (id, data) => {
    const response = await api.put(`/admin/coupons/${id}`, data);
    return response.data;
  },

  /**
   * Toggle coupon active status
   * @param {string} id
   */
  toggleCouponStatus: async (id) => {
    const response = await api.patch(`/admin/coupons/${id}/toggle-status`);
    return response.data;
  },

  /**
   * Soft delete / Archive coupon
   * @param {string} id
   */
  deleteCoupon: async (id) => {
    const response = await api.delete(`/admin/coupons/${id}`);
    return response.data;
  },

  /**
   * Get usage audit history for a coupon
   * @param {string} id
   * @param {Object} params - (page, limit)
   */
  getCouponUsageHistory: async (id, params = {}) => {
    const response = await api.get(`/admin/coupons/${id}/usage`, { params });
    return response.data;
  }
};

export default couponService;

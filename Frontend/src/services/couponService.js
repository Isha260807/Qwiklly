import api from './api';

/**
 * Coupon Service (User Side)
 * Handles available coupon fetching, code application, and removal
 */
export const couponService = {
  // Get available active coupons for the user with eligibility flags
  getAvailableCoupons: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.amount) queryParams.append('amount', params.amount);
    if (params.serviceId) queryParams.append('serviceId', params.serviceId);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await api.get(`/coupons/available${queryString}`);
    return response.data;
  },

  // Apply a coupon and get verified server-side price breakdown
  applyCoupon: async (payload) => {
    const response = await api.post('/coupons/apply', payload);
    return response.data;
  },

  // Remove coupon and restore standard pricing
  removeCoupon: async (payload) => {
    const response = await api.post('/coupons/remove', payload);
    return response.data;
  }
};

export default couponService;

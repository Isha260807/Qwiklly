import api from './api';

export const adminBookingService = {
  // Get all bookings with filters and search
  getAllBookings: async (params) => {
    try {
      const response = await api.get('/admin/bookings', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch bookings' };
    }
  },

  // Get booking details by ID
  getBookingById: async (id) => {
    try {
      const response = await api.get(`/admin/bookings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch booking details' };
    }
  },

  // Get booking analytics
  getAnalytics: async (filters = {}) => {
    try {
      const response = await api.get('/admin/bookings/analytics', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch analytics' };
    }
  },

  // Cancel booking
  cancelBooking: async (id, reason) => {
    try {
      const response = await api.post(`/admin/bookings/${id}/cancel`, { cancellationReason: reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel booking' };
    }
  },

  // Zone/service/radius-qualified vendor candidates for manual assignment
  getEligibleVendors: async (id) => {
    try {
      const response = await api.get(`/admin/bookings/${id}/eligible-vendors`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch eligible vendors' };
    }
  },

  // Manually assign a vendor to a booking (e.g. one parked as pending_admin)
  assignVendor: async (id, vendorId) => {
    try {
      const response = await api.post(`/admin/bookings/${id}/assign-vendor`, { vendorId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to assign vendor' };
    }
  }
};

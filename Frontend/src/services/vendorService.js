import api from './api';

const vendorService = {
  // Get vendor profile
  getProfile: async () => {
    const response = await api.get('/vendors/profile');
    return response.data;
  },

  // Get vendor assigned zones with polygon boundaries
  getAssignedZones: async () => {
    const response = await api.get('/vendors/assigned-zones');
    return response.data;
  },

  // Update vendor profile
  updateProfile: async (profileData) => {
    const response = await api.put('/vendors/profile', profileData);
    return response.data;
  },

  // Update vendor address
  updateAddress: async (addressData) => {
    const response = await api.put('/vendors/address', addressData);
    return response.data;
  },

  // Update real-time location
  updateLocation: async (lat, lng) => {
    return api.put('/vendors/profile/location', { lat, lng });
  },

  // Sync live GPS + resolve zone presence (auto-offline outside assigned zones)
  syncLocation: async ({ lat, lng, accuracy }) => {
    const response = await api.post('/vendors/profile/sync-location', { lat, lng, accuracy });
    return response.data;
  },

  // Toggle online/offline status. Going online should include fresh coords
  // ({ lat, lng }) so the backend can verify the vendor is inside an assigned zone.
  toggleOnlineStatus: async (isOnline, coords = null) => {
    const payload = { isOnline };
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      payload.lat = coords.lat;
      payload.lng = coords.lng;
    }
    const response = await api.put('/vendors/profile/status', payload);
    return response.data;
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    const response = await api.get('/vendors/dashboard/stats');
    return response.data;
  },

  // Get revenue analytics
  getRevenueAnalytics: async (period) => {
    const response = await api.get(`/vendors/dashboard/revenue?period=${period}`);
    return response.data;
  },

  // Trigger Emergency SOS
  triggerEmergencySOS: async (data = {}) => {
    const response = await api.post('/notifications/emergency-sos', data);
    return response.data;
  }
};

export default vendorService;

import api from './api';

/**
 * Zone Service
 * Public zone resolution + admin zone CRUD + vendor zone assignment.
 */
export const zoneService = {
  // Public: resolve which zone a coordinate falls in (UI/catalog use only -
  // booking creation always re-resolves this server-side)
  resolve: async (lat, lng) => {
    const response = await api.get(`/public/zones/resolve?lat=${lat}&lng=${lng}`);
    return response.data;
  },

  // Public: advisory zone+service+radius+vendor availability check
  checkServiceability: async (serviceId, lat, lng) => {
    const response = await api.get(`/public/zones/serviceability?serviceId=${serviceId}&lat=${lat}&lng=${lng}`);
    return response.data;
  },

  // Admin CRUD
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/zones${query ? `?${query}` : ''}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/zones/${id}`);
    return response.data;
  },

  getImpact: async (id) => {
    const response = await api.get(`/admin/zones/${id}/impact`);
    return response.data;
  },

  create: async (zoneData) => {
    const response = await api.post('/admin/zones', zoneData);
    return response.data;
  },

  update: async (id, zoneData) => {
    const response = await api.put(`/admin/zones/${id}`, zoneData);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/admin/zones/${id}`);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/admin/zones/${id}/status`);
    return response.data;
  },

  toggleComingSoon: async (id) => {
    const response = await api.patch(`/admin/zones/${id}/coming-soon`);
    return response.data;
  },

  togglePauseOrdering: async (id) => {
    const response = await api.patch(`/admin/zones/${id}/pause-ordering`);
    return response.data;
  },

  // Admin: assign zones to a vendor
  assignVendorZones: async (vendorId, zoneIds) => {
    const response = await api.patch(`/admin/vendors/${vendorId}/zones`, { zoneIds });
    return response.data;
  }
};

export default zoneService;

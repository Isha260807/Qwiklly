import api from './api';
import { apiCache } from '../utils/apiCache';

const zoneResolveInFlight = new Map();
const serviceabilityInFlight = new Map();

/**
 * Zone Service
 * Public zone resolution + admin zone CRUD + vendor zone assignment.
 */
export const zoneService = {
  // Public: resolve which zone a coordinate falls in (UI/catalog use only -
  // booking creation always re-resolves this server-side)
  resolve: async (lat, lng) => {
    const cacheKey = 'public:zone-resolve:' + Number(lat).toFixed(5) + ':' + Number(lng).toFixed(5);
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const existingRequest = zoneResolveInFlight.get(cacheKey);
    if (existingRequest) return existingRequest;

    const request = api.get('/public/zones/resolve?lat=' + lat + '&lng=' + lng)
      .then(response => {
        apiCache.set(cacheKey, response.data, 120);
        return response.data;
      })
      .finally(() => {
        zoneResolveInFlight.delete(cacheKey);
      });

    zoneResolveInFlight.set(cacheKey, request);
    return request;
  },

  // Public: advisory zone+service+radius+vendor availability check
  checkServiceability: async (serviceId, lat, lng) => {
    // Deduplicate concurrent checks (e.g. React StrictMode's dev remount).
    // No response cache is used because serviceability can change live.
    const requestKey = String(serviceId) + ':' + String(lat) + ':' + String(lng);
    const existingRequest = serviceabilityInFlight.get(requestKey);
    if (existingRequest) return existingRequest;

    const request = api.get(
      '/public/zones/serviceability?serviceId=' +
      encodeURIComponent(serviceId) +
      '&lat=' + encodeURIComponent(lat) +
      '&lng=' + encodeURIComponent(lng)
    )
      .then(response => response.data)
      .finally(() => {
        serviceabilityInFlight.delete(requestKey);
      });

    serviceabilityInFlight.set(requestKey, request);
    return request;
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

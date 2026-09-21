import api from '../../../services/api';

/**
 * Admin Banner Service
 * Handles CRUD operations, stats, status toggle, and reordering for banners
 */
const bannerService = {
  /**
   * Get all banners with pagination and filters
   * @param {Object} params - Query parameters (page, limit, search, bannerType, position, cityId, isActive)
   */
  getAllBanners: async (params = {}) => {
    const response = await api.get('/admin/banners', { params });
    return response.data;
  },

  /**
   * Get banner statistics
   */
  getBannerStats: async () => {
    const response = await api.get('/admin/banners/stats');
    return response.data;
  },

  /**
   * Get single banner by ID
   * @param {string} id
   */
  getBannerById: async (id) => {
    const response = await api.get(`/admin/banners/${id}`);
    return response.data;
  },

  /**
   * Create new banner
   * @param {Object} data
   */
  createBanner: async (data) => {
    const response = await api.post('/admin/banners', data);
    return response.data;
  },

  /**
   * Update existing banner
   * @param {string} id
   * @param {Object} data
   */
  updateBanner: async (id, data) => {
    const response = await api.put(`/admin/banners/${id}`, data);
    return response.data;
  },

  /**
   * Delete banner
   * @param {string} id
   */
  deleteBanner: async (id) => {
    const response = await api.delete(`/admin/banners/${id}`);
    return response.data;
  },

  /**
   * Toggle banner active status
   * @param {string} id
   */
  toggleStatus: async (id) => {
    const response = await api.patch(`/admin/banners/${id}/status`);
    return response.data;
  },

  /**
   * Reorder multiple banners
   * @param {Array<{ id: string, order: number }>} orders
   */
  reorderBanners: async (orders) => {
    const response = await api.patch('/admin/banners/reorder', { orders });
    return response.data;
  }
};

export default bannerService;

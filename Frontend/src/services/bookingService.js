import api from './api';
import { apiCache } from '../utils/apiCache';

const BOOKINGS_CACHE_PREFIX = 'user:bookings:';
const BOOKINGS_CACHE_TTL_SECONDS = 300;
const bookingsInFlight = new Map();

const getUserCacheScope = () => {
  try {
    const storedUser = localStorage.getItem('userData');
    const user = storedUser ? JSON.parse(storedUser) : null;
    return user?._id || user?.id || user?.userId || user?.phone || 'current';
  } catch {
    return 'current';
  }
};

const buildBookingsQuery = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  return queryParams;
};

const getBookingsCacheKey = (params = {}) =>
  `${BOOKINGS_CACHE_PREFIX}${getUserCacheScope()}:${buildBookingsQuery(params).toString() || 'all'}`;

const invalidateUserBookingsCache = () => {
  apiCache.invalidatePrefix(BOOKINGS_CACHE_PREFIX);
};

/**
 * Booking Service
 * Handles all API calls for Bookings
 */

export const bookingService = {
  // Create a new booking
  create: async (bookingData) => {
    console.log('[BookingService] Creating booking with payload:', JSON.stringify(bookingData, null, 2));
    const response = await api.post('/users/bookings', bookingData);
    if (response.data?.success) invalidateUserBookingsCache();
    return response.data;
  },

  // Get user bookings with filters
  getUserBookings: async (params = {}) => {
    const queryParams = buildBookingsQuery(params);
    const cacheKey = getBookingsCacheKey(params);
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    // React StrictMode, route remounts, and notification events can request the
    // same data at the same time. Reuse the pending request instead of sending
    // another request to the API.
    if (bookingsInFlight.has(cacheKey)) {
      return bookingsInFlight.get(cacheKey);
    }

    const request = api
      .get(`/users/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
      .then((response) => {
        if (response.data?.success) {
          apiCache.set(cacheKey, response.data, BOOKINGS_CACHE_TTL_SECONDS);
        }
        return response.data;
      })
      .finally(() => {
        bookingsInFlight.delete(cacheKey);
      });

    bookingsInFlight.set(cacheKey, request);
    return request;
  },

  // Get booking details by ID
  getById: async (id) => {
    const response = await api.get(`/users/bookings/${id}`);
    return response.data;
  },

  // Cancel booking
  cancel: async (id, cancellationReason) => {
    const response = await api.post(`/users/bookings/${id}/cancel`, { cancellationReason });
    if (response.data?.success) invalidateUserBookingsCache();
    return response.data;
  },

  // Reschedule booking
  reschedule: async (id, rescheduleData) => {
    const response = await api.put(`/users/bookings/${id}/reschedule`, rescheduleData);
    if (response.data?.success) invalidateUserBookingsCache();
    return response.data;
  },

  // Add review and rating
  addReview: async (id, reviewData) => {
    const response = await api.post(`/users/bookings/${id}/review`, reviewData);
    if (response.data?.success) invalidateUserBookingsCache();
    return response.data;
  },

  // Get user ratings and reviews
  getRatings: async (params = {}) => {
    const response = await api.get('/users/bookings/ratings', { params });
    return response.data;
  },

  // ── Hourly Service Timer / Extra-Time Payment ──
  getHourlyStatus: async (id) => {
    const response = await api.get(`/users/bookings/${id}/hourly/status`);
    return response.data;
  },

  createHourlyExtraPaymentOrder: async (id) => {
    const response = await api.post(`/users/bookings/${id}/hourly/extra-payment/order`);
    return response.data;
  },

  verifyHourlyExtraPayment: async (id, paymentData) => {
    const response = await api.post(`/users/bookings/${id}/hourly/extra-payment/verify`, paymentData);
    return response.data;
  }
};

export default bookingService;


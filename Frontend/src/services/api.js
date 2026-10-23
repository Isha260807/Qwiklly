import axios from 'axios';
import { toast } from 'react-hot-toast';
import { apiCache } from '../utils/apiCache';

// API Base URL
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // For cookies
});

// Helper to get token keys based on role/path
const getTokenKeys = (url) => {
  // 1. Prioritize current page context for role-based tokens
  if (window.location.pathname.startsWith('/admin')) {
    return { access: 'adminAccessToken', refresh: 'adminRefreshToken', role: 'admin' };
  }
  if (window.location.pathname.startsWith('/vendor')) {
    return { access: 'vendorAccessToken', refresh: 'vendorRefreshToken', role: 'vendor' };
  }
  if (window.location.pathname.startsWith('/worker')) {
    return { access: 'workerAccessToken', refresh: 'workerRefreshToken', role: 'worker' };
  }

  // 2. Explicitly detect auth routes regardless of current page (for cross-role login/actions)
  if (url?.includes('/admin/auth')) return { access: 'adminAccessToken', refresh: 'adminRefreshToken', role: 'admin' };
  if (url?.includes('/vendors/auth')) return { access: 'vendorAccessToken', refresh: 'vendorRefreshToken', role: 'vendor' };
  if (url?.includes('/workers/auth')) return { access: 'workerAccessToken', refresh: 'workerRefreshToken', role: 'worker' };

  // 3. Fallback to user token (most common case for user app)
  return { access: 'accessToken', refresh: 'refreshToken', role: 'user' };
};

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const { access } = getTokenKeys(config.url);
    const token = sessionStorage.getItem(access) || localStorage.getItem(access);

    // For debugging
    // console.log(`Request to ${config.url}, using token key: ${access}, token exists: ${!!token}`);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track if we're currently refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestRole = getTokenKeys(originalRequest?.url).role;
    const vendorSessionReplaced =
      requestRole === 'vendor' &&
      error.response?.status === 401 &&
      (
        error.response?.data?.code === 'VENDOR_SESSION_REPLACED' ||
        /another device|no longer active/i.test(error.response?.data?.message || '')
      );

    // A replaced vendor session must not enter token refresh; its refresh token
    // is invalid for the new device as well.
    if (vendorSessionReplaced) {
      processQueue(error, null);
      isRefreshing = false;
      toast.error('Your account was logged in on another device. Please login again.', {
        id: 'vendor-session-replaced'
      });
      handleLogout('vendor');
      return Promise.reject(error);
    }

    // Skip token refresh logic for auth endpoints where 401 indicates invalid credentials
    const isAuthEndpoint = 
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/verify-login') ||
      originalRequest?.url?.includes('/auth/verify-otp') ||
      originalRequest?.url?.includes('/auth/send-otp') ||
      originalRequest?.url?.includes('/auth/refresh-token') ||
      originalRequest?.url?.includes('/auth/validate-referral');

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { access, refresh, role } = getTokenKeys(originalRequest.url);
      const refreshToken = sessionStorage.getItem(refresh) || localStorage.getItem(refresh);

      if (!refreshToken) {
        // No refresh token, logout and reset refresh state
        processQueue(error, null);
        isRefreshing = false;
        handleLogout(role);
        return Promise.reject(error);
      }

      try {
        // Determine correct refresh endpoint based on current path
        let refreshEndpoint = '/users/auth/refresh-token'; // Default to user
        if (role === 'vendor') refreshEndpoint = '/vendors/auth/refresh-token';
        else if (role === 'worker') refreshEndpoint = '/workers/auth/refresh-token';
        else if (role === 'admin') refreshEndpoint = '/admin/auth/refresh-token';

        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}${refreshEndpoint}`, {
          refreshToken
        });

        const { accessToken } = response.data;

        // Save new access token - Try session first, then local (update where it was found)
        if (sessionStorage.getItem(access)) {
          sessionStorage.setItem(access, accessToken);
        } else {
          localStorage.setItem(access, accessToken);
        }

        // Update authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('RefreshToken failed:', refreshError);
        // Refresh failed, logout
        processQueue(refreshError, null);
        isRefreshing = false;
        const vendorRefreshSessionReplaced =
          role === 'vendor' &&
          refreshError.response?.status === 401 &&
          (
            refreshError.response?.data?.code === 'VENDOR_SESSION_REPLACED' ||
            /another device|no longer active/i.test(refreshError.response?.data?.message || '')
          );
        if (vendorRefreshSessionReplaced) {
          toast.error('Your account was logged in on another device. Please login again.', {
            id: 'vendor-session-replaced'
          });
        }
        if (role === 'admin' && refreshError.response?.data?.code === 'ADMIN_DELETED') {
          toast.error('Your profile was deleted by admin.', { id: 'admin-deleted' });
        } else if (role === 'admin' && refreshError.response?.data?.code === 'ADMIN_BLOCKED') {
          toast.error('Blocked by admin', { id: 'admin-blocked' });
        }
        handleLogout(role);
        return Promise.reject(refreshError);
      }
    }

    // A blocked admin must be logged out immediately. Keep ordinary module
    // permission 403s non-destructive so a missing module does not log out a
    // valid session.
    if (error.response?.status === 403) {
      console.error('Access Denied (403):', error.response.data.message);
      const { role } = getTokenKeys(originalRequest.url);
      const isAdminLoginRequest = originalRequest.url?.includes('/admin/auth/login');
      const isDeletedAdmin = role === 'admin' && (
        error.response.data.code === 'ADMIN_DELETED' ||
        /profile was deleted by admin/i.test(error.response.data.message || '')
      );
      const isBlockedAdmin = role === 'admin' && (
        error.response.data.code === 'ADMIN_BLOCKED' ||
        /blocked by admin/i.test(error.response.data.message || '')
      );

      if (isDeletedAdmin && !isAdminLoginRequest) {
        toast.error('Your profile was deleted by admin.', { id: 'admin-deleted' });
        handleLogout('admin');
      } else if (isBlockedAdmin && !isAdminLoginRequest) {
        toast.error('Blocked by admin', { id: 'admin-blocked' });
        handleLogout('admin');
      }
    }

    return Promise.reject(error);
  }
);

// Handle logout
export const handleLogout = (role = null) => {
  if (!role) {
    // Determine role from path if not provided
    const path = window.location.pathname;
    if (path.startsWith('/admin')) role = 'admin';
    else if (path.startsWith('/vendor')) role = 'vendor';
    else if (path.startsWith('/worker')) role = 'worker';
    else role = 'user';
  }

  // Clear role-specific tokens selectively
  const clearTokens = (prefix) => {
    // Clear both sessionStorage and localStorage to prevent state mismatch
    sessionStorage.removeItem(`${prefix}AccessToken`);
    sessionStorage.removeItem(`${prefix}RefreshToken`);
    sessionStorage.removeItem(`${prefix}Data`);

    localStorage.removeItem(`${prefix}AccessToken`);
    localStorage.removeItem(`${prefix}RefreshToken`);
    localStorage.removeItem(`${prefix}Data`);
  };

  const dispatchRedirect = (targetPath) => {
    if (window.location.pathname !== targetPath) {
      window.dispatchEvent(new CustomEvent('auth_redirect', { detail: { path: targetPath } }));
    }
  };

  if (role === 'vendor') {
    window.dispatchEvent(new Event('vendor_session_invalidated'));

    clearTokens('vendor');
    dispatchRedirect('/vendor/login');
  } else if (role === 'worker') {
    clearTokens('worker');
    dispatchRedirect('/worker/login');
  } else if (role === 'admin') {
    clearTokens('admin');
    dispatchRedirect('/admin/login');
  } else {
    // User
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userData');

    const isGuestAllowedPage =
      window.location.pathname === '/user' ||
      window.location.pathname === '/user/' ||
      window.location.pathname.includes('/location') ||
      window.location.pathname.includes('/login');

    if (!isGuestAllowedPage) {
      dispatchRedirect('/user/login');
    }
  }
};

export { apiCache };
export default api;

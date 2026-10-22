import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Synchronous token & role validator for public routes (login/signup)
 */
const checkPublicAuthSync = (userType) => {
  let tokenKey = 'accessToken';
  let refreshTokenKey = 'refreshToken';
  let dataKey = 'userData';

  switch (userType) {
    case 'vendor':
      tokenKey = 'vendorAccessToken';
      refreshTokenKey = 'vendorRefreshToken';
      dataKey = 'vendorData';
      break;
    case 'worker':
      tokenKey = 'workerAccessToken';
      refreshTokenKey = 'workerRefreshToken';
      dataKey = 'workerData';
      break;
    case 'admin':
      tokenKey = 'adminAccessToken';
      refreshTokenKey = 'adminRefreshToken';
      dataKey = 'adminData';
      break;
    case 'user':
    default:
      tokenKey = 'accessToken';
      refreshTokenKey = 'refreshToken';
      dataKey = 'userData';
      break;
  }

  const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
  const refreshToken = localStorage.getItem(refreshTokenKey) || sessionStorage.getItem(refreshTokenKey);
  const userData = localStorage.getItem(dataKey) || sessionStorage.getItem(dataKey);

  if (userData && (token || refreshToken)) {
    try {
      const decodeToken = (value) => {
        try {
          const parts = value?.split('.');
          if (parts?.length !== 3) return null;
          return JSON.parse(atob(parts[1]));
        } catch {
          return null;
        }
      };
      const roleMap = {
        user: 'user',
        vendor: 'vendor',
        worker: 'worker',
        admin: 'admin'
      };
      const hasValidRole = (payload) => {
        if (!payload?.exp || payload.exp <= Date.now() / 1000) return false;
        const normalizedRole = String(payload.role || '').toLowerCase();
        const isAdminToken = userType === 'admin' && [
          'admin',
          'super_admin',
          'sub_admin'
        ].includes(normalizedRole);
        return normalizedRole === roleMap[userType] || isAdminToken;
      };

      // Keep the login screen out of the first render when the access token
      // has expired but the refresh token can still restore the session.
      if (hasValidRole(decodeToken(token)) || hasValidRole(decodeToken(refreshToken))) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
};
/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 */
const PublicRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const isAuthenticated = useMemo(() => checkPublicAuthSync(userType), [userType, location.pathname]);

  if (isAuthenticated) {
    const defaultRedirects = {
      user: '/user',
      vendor: '/vendor/dashboard',
      worker: '/worker/dashboard',
      admin: '/admin/dashboard'
    };

    const redirectPath = redirectTo || defaultRedirects[userType] || '/user';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default PublicRoute;


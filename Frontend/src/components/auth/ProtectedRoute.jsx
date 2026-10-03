import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Synchronous token & session validator to eliminate async blank screen delays
 */
const checkAuthSync = (userType) => {
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

  const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
  const refreshToken = sessionStorage.getItem(refreshTokenKey) || localStorage.getItem(refreshTokenKey);
  const userData = sessionStorage.getItem(dataKey) || localStorage.getItem(dataKey);

  if (token && userData) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp > currentTime) {
          return true;
        } else if (refreshToken) {
          return true;
        }
      }
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * Protected Route Component
 * Checks if user is authenticated before allowing access
 */
const ProtectedRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const isAuthenticated = useMemo(() => checkAuthSync(userType), [userType, location.pathname]);

  if (!isAuthenticated) {
    const defaultRedirects = {
      user: '/user/login',
      vendor: '/vendor/login',
      worker: '/worker/login',
      admin: '/admin/login'
    };

    const redirectPath = redirectTo || defaultRedirects[userType] || '/user/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;


import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Synchronous token & role validator for public routes (login/signup)
 */
const checkPublicAuthSync = (userType) => {
  let tokenKey = 'accessToken';
  let dataKey = 'userData';

  switch (userType) {
    case 'vendor':
      tokenKey = 'vendorAccessToken';
      dataKey = 'vendorData';
      break;
    case 'worker':
      tokenKey = 'workerAccessToken';
      dataKey = 'workerData';
      break;
    case 'admin':
      tokenKey = 'adminAccessToken';
      dataKey = 'adminData';
      break;
    case 'user':
    default:
      tokenKey = 'accessToken';
      dataKey = 'userData';
      break;
  }

  const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
  const userData = localStorage.getItem(dataKey) || sessionStorage.getItem(dataKey);

  if (token && userData) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const currentTime = Date.now() / 1000;

        if (payload.exp && payload.exp > currentTime) {
          const roleMap = {
            user: 'user',
            vendor: 'vendor',
            worker: 'worker',
            admin: 'admin'
          };
          if (payload.role === roleMap[userType]) {
            return true;
          }
        }
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


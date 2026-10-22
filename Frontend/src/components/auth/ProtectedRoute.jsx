import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessAdminPath, getFirstAccessibleAdminPath } from './adminAccess';

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
  const adminData = useMemo(() => {
    if (userType !== 'admin' || !isAuthenticated) return {};
    try {
      const storedData = sessionStorage.getItem('adminData') || localStorage.getItem('adminData');
      return JSON.parse(storedData || '{}');
    } catch {
      return {};
    }
  }, [userType, isAuthenticated, location.pathname]);
  const hasAdminModuleAccess = useMemo(() => {
    if (userType !== 'admin' || !isAuthenticated) return true;
    return canAccessAdminPath(location.pathname, adminData);
  }, [userType, isAuthenticated, location.pathname, adminData]);
  const firstAccessibleAdminPath = useMemo(
    () => getFirstAccessibleAdminPath(adminData),
    [adminData]
  );

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

  if (userType === 'admin' && !hasAdminModuleAccess) {
    if (firstAccessibleAdminPath && firstAccessibleAdminPath !== location.pathname) {
      return <Navigate to={firstAccessibleAdminPath} replace />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">No admin access assigned</h1>
          <p className="mt-2 text-sm text-gray-500">
            Please ask the Super Admin to assign at least one module.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;


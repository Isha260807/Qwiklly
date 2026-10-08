import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PageTransition from '../components/common/PageTransition';
import BottomNav from '../components/layout/BottomNav';
import ErrorBoundary from '../components/common/ErrorBoundary';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';
import PublicRoute from '../../../components/auth/PublicRoute';
import CashLimitModal from '../components/common/CashLimitModal'; // Import
import GlobalBookingAlert from '../components/common/GlobalBookingAlert';
import VendorUnderReviewModal from '../components/common/VendorUnderReviewModal';
import { useVendorZonePresenceTracker } from '../hooks/useVendorZonePresence';
// import useAppNotifications from '../../../hooks/useAppNotifications.jsx'; // Handled globally

// Lazy load wrapper with error handling (same as user app)
const lazyLoad = (importFunc) => {
  return lazy(() => {
    return Promise.resolve(importFunc()).catch((error) => {
      console.error('Failed to load vendor page:', error);
      // Return a fallback component wrapped in a Promise
      return Promise.resolve({
        default: () => (
          <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to load page</h2>
              <p className="text-gray-600 mb-4">Please refresh the page or try again later.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:opacity-90"
                style={{ backgroundColor: '#347989' }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        ),
      });
    });
  });
};

// Lazy load vendor pages for code splitting
const Login = lazyLoad(() => import('../pages/login'));
const Signup = lazyLoad(() => import('../pages/signup'));
const Dashboard = lazyLoad(() => import('../pages/Dashboard'));
const BookingAlert = lazyLoad(() => import('../pages/BookingAlert'));
const BookingAlerts = lazyLoad(() => import('../pages/BookingAlerts'));
const BookingDetails = lazyLoad(() => import('../pages/BookingDetails'));
const BookingTimeline = lazyLoad(() => import('../pages/BookingTimeline'));
const ActiveJobs = lazyLoad(() => import('../pages/ActiveJobs'));
const Wallet = lazyLoad(() => import('../pages/Wallet'));
const Earnings = Wallet;
const Profile = lazyLoad(() => import('../pages/Profile'));
const ProfileDetails = lazyLoad(() => import('../pages/Profile/ProfileDetails'));
const EditProfile = lazyLoad(() => import('../pages/Profile/EditProfile'));
const PayoutDetails = lazyLoad(() => import('../pages/Profile/PayoutDetails'));
const BookingMap = lazyLoad(() => import('../pages/BookingMap'));
const Settings = lazyLoad(() => import('../pages/Settings'));
const AddressManagement = lazyLoad(() => import('../pages/AddressManagement'));
const Notifications = lazyLoad(() => import('../pages/Notifications'));
const MyRatings = lazyLoad(() => import('../pages/MyRatings'));
const AboutQwiklly = lazyLoad(() => import('../pages/AboutHomster'));
const BillingPage = lazyLoad(() => import('../pages/BillingPage'));
const MyServices = lazyLoad(() => import('../pages/MyServices'));

// Loading fallback component
import LogoLoader from '../../../components/common/LogoLoader';

const LoadingFallback = () => (
  <LogoLoader />
);

const VendorRoutes = () => {
  const location = useLocation();

  // Check if current route should hide bottom nav (auth routes or map)
  // Check if current route should hide bottom nav (auth routes or map or booking alert)
  const shouldHideBottomNav = location.pathname === '/vendor/login' ||
    location.pathname === '/vendor/signup' ||
    location.pathname.endsWith('/map') ||
    location.pathname.includes('/booking-alert/');

  const shouldShowBottomNav = !shouldHideBottomNav;

  // Live GPS + zone presence tracking for authenticated vendor screens
  const isAuthRoute = location.pathname === '/vendor/login' || location.pathname === '/vendor/signup';
  useVendorZonePresenceTracker(!isAuthRoute);

  // Only show booking alerts for fully approved vendors
  const vendorApprovalStatus = (() => {
    try { return (JSON.parse(localStorage.getItem('vendorData') || '{}').approvalStatus || '').toLowerCase(); }
    catch { return ''; }
  })();
  const isVendorApproved = vendorApprovalStatus === 'approved';

  return (
    <ErrorBoundary>
      {/* Main content area - leaves space for bottom nav when needed */}
      <div className={shouldShowBottomNav ? "pb-14" : ""}>
        <Suspense fallback={<LoadingFallback />}>
          <PageTransition>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<PublicRoute userType="vendor"><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute userType="vendor"><Signup /></PublicRoute>} />

              {/* Protected routes (auth required) */}
              <Route path="/" element={<ProtectedRoute userType="vendor"><Navigate to="dashboard" replace /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute userType="vendor"><Dashboard /></ProtectedRoute>} />
              <Route path="/booking-alerts" element={<ProtectedRoute userType="vendor"><BookingAlerts /></ProtectedRoute>} />
              <Route path="/booking-alert/:id" element={<ProtectedRoute userType="vendor"><BookingAlert /></ProtectedRoute>} />
              <Route path="/booking/:id" element={<ProtectedRoute userType="vendor"><BookingDetails /></ProtectedRoute>} />
              <Route path="/booking/:id/map" element={<ProtectedRoute userType="vendor"><BookingMap /></ProtectedRoute>} />
              <Route path="/booking/:id/billing" element={<ProtectedRoute userType="vendor"><BillingPage /></ProtectedRoute>} />
              <Route path="/booking/:id/timeline" element={<ProtectedRoute userType="vendor"><BookingTimeline /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute userType="vendor"><ActiveJobs /></ProtectedRoute>} />
              <Route path="/earnings" element={<ProtectedRoute userType="vendor"><Earnings /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute userType="vendor"><Wallet /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute userType="vendor"><Profile /></ProtectedRoute>} />
              <Route path="/profile/details" element={<ProtectedRoute userType="vendor"><ProfileDetails /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute userType="vendor"><EditProfile /></ProtectedRoute>} />
              <Route path="/profile/payout" element={<ProtectedRoute userType="vendor"><PayoutDetails /></ProtectedRoute>} />
              <Route path="/payout-details" element={<ProtectedRoute userType="vendor"><PayoutDetails /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute userType="vendor"><Settings /></ProtectedRoute>} />
              <Route path="/address-management" element={<ProtectedRoute userType="vendor"><AddressManagement /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute userType="vendor"><Notifications /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute userType="vendor"><MyServices /></ProtectedRoute>} />
              <Route path="/my-services" element={<ProtectedRoute userType="vendor"><MyServices /></ProtectedRoute>} />
              <Route path="/my-ratings" element={<ProtectedRoute userType="vendor"><MyRatings /></ProtectedRoute>} />
              <Route path="/about-Qwiklly" element={<ProtectedRoute userType="vendor"><AboutQwiklly /></ProtectedRoute>} />
              <Route path="/about-qwiklly" element={<ProtectedRoute userType="vendor"><AboutQwiklly /></ProtectedRoute>} />
            </Routes>
          </PageTransition>
        </Suspense>
      </div>

      {/* BottomNav is OUTSIDE Suspense so it persists during page loads */}
      {shouldShowBottomNav && <BottomNav />}

      {/* Global New Booking Alert Modal — only for approved vendors */}
      {!shouldHideBottomNav && isVendorApproved && <GlobalBookingAlert />}

      {/* Vendor Profile Under Review Modal */}
      {!shouldHideBottomNav && <VendorUnderReviewModal />}
    </ErrorBoundary>
  );
};

export default VendorRoutes;

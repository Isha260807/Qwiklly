import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiSearch, FiUser, FiAlertTriangle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { vendorTheme as themeColors } from '../../../../theme';
import Logo from '../../../../components/common/Logo';
import api from '../../../../services/api';
import vendorService from '../../../../services/vendorService';
import { toast } from 'react-hot-toast';
import SOSModal from '../common/SOSModal';

const Header = memo(({
  title,
  onBack,
  showBack = true,
  showSearch = false,
  showNotifications = true,
  notificationCount = 0
}) => {
  const navigate = useNavigate();
  const [count, setCount] = useState(notificationCount);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isOnline, setIsOnline] = useState(() => {
    const saved = localStorage.getItem('vendorIsOnline');
    return saved !== null ? saved === 'true' : true;
  });
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Listen for global SOS trigger event
  useEffect(() => {
    const handleOpenSOS = () => setShowSOSModal(true);
    window.addEventListener('openVendorSOS', handleOpenSOS);
    return () => window.removeEventListener('openVendorSOS', handleOpenSOS);
  }, []);

  // Sync prop changes for notifications
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Load online status from profile
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await vendorService.getProfile();
        if (res.success && res.vendor) {
          const online = res.vendor.isOnline !== undefined ? Boolean(res.vendor.isOnline) : true;
          setIsOnline(online);
          localStorage.setItem('vendorIsOnline', String(online));
        }
      } catch (err) {
        // Fallback to local
      }
    };

    fetchStatus();

    const handleStatusSync = (e) => {
      if (e.detail && e.detail.isOnline !== undefined) {
        setIsOnline(e.detail.isOnline);
      }
    };

    window.addEventListener('vendorOnlineStatusChanged', handleStatusSync);
    return () => window.removeEventListener('vendorOnlineStatusChanged', handleStatusSync);
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications/vendor');
        if (res.data.success && typeof res.data.unreadCount === 'number') {
          setCount(res.data.unreadCount);
        }
      } catch (error) {
        // Silent fail
      }
    };

    if (showNotifications) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [showNotifications]);

  const handleToggleOnline = async () => {
    if (togglingStatus) return;
    try {
      setTogglingStatus(true);
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      localStorage.setItem('vendorIsOnline', String(newStatus));

      const res = await vendorService.toggleOnlineStatus(newStatus);
      if (res.success) {
        toast.success(
          newStatus ? '🟢 You are now ONLINE & ready for bookings' : '⚪ You are now OFFLINE',
          { duration: 3000 }
        );
        window.dispatchEvent(new CustomEvent('vendorOnlineStatusChanged', { detail: { isOnline: newStatus } }));
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setIsOnline(isOnline);
      localStorage.setItem('vendorIsOnline', String(isOnline));
      toast.error('Failed to update status. Please try again.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleNotifications = () => {
    navigate('/vendor/notifications');
  };

  const handleLogoClick = () => {
    navigate('/vendor/dashboard');
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 w-full bg-white"
        style={{
          borderBottom: '1px solid rgba(232, 217, 223, 0.7)',
          boxShadow: '0 4px 20px rgba(114, 12, 62, 0.04)',
        }}
      >
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Left: Back button or Logo */}
          <div className="flex items-center gap-2 min-w-0">
            {showBack ? (
              <motion.button
                onClick={handleBack}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                <FiArrowLeft className="w-5 h-5 text-[#720C3E]" />
              </motion.button>
            ) : (
              <motion.div
                className="cursor-pointer flex-shrink-0"
                onClick={handleLogoClick}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Logo className="h-8 sm:h-10 w-auto object-contain" />
              </motion.div>
            )}
            {showBack && (
              <h1 className="text-sm sm:text-base font-bold text-[#24151D] truncate">{title || 'Vendor'}</h1>
            )}
          </div>

          {/* Right Area: SOS Button + Online/Offline Toggle + Search + Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* SOS Emergency Button */}
            <motion.button
              onClick={() => setShowSOSModal(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[11px] sm:text-xs shadow-md shadow-red-500/30 hover:from-red-700 hover:to-rose-700 active:scale-95 transition-all cursor-pointer select-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Emergency SOS"
            >
              <FiAlertTriangle className="w-3.5 h-3.5" />
              <span className="tracking-wider font-extrabold">SOS</span>
            </motion.button>

            {/* Online / Offline Toggle Switch */}
            <button
              onClick={handleToggleOnline}
              disabled={togglingStatus}
              className="flex flex-row items-center gap-1 sm:gap-1.5 cursor-pointer select-none"
            >
              {/* Toggle Track */}
              <div
                className={`relative w-9 sm:w-11 h-5 sm:h-6 rounded-full transition-all duration-300 ${
                  isOnline ? 'bg-emerald-400' : 'bg-gray-300'
                }`}
              >
                {/* Thumb */}
                <span
                  className={`absolute top-0.5 left-0.5 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                    isOnline ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                  }`}
                />
                {/* Online ping animation */}
                {isOnline && (
                  <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-1.5 sm:w-2 h-1.5 sm:h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
                  </span>
                )}
              </div>
              {/* Label */}
              <span className={`text-[8px] sm:text-[9px] font-bold tracking-wide hidden xs:inline ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </button>

            {showSearch && (
              <button
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-[#720C3E] transition-colors active:scale-95 cursor-pointer"
                onClick={() => navigate('/vendor/jobs')}
              >
                <FiSearch className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}

            {showNotifications && (
              <motion.div
                className="relative rounded-full cursor-pointer"
                style={{
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Inner Button */}
                <motion.button
                  onClick={handleNotifications}
                  className="relative z-10 w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-[#FCEBF3] text-[#720C3E] shadow-xs cursor-pointer hover:bg-[#F9DCE8] transition-colors"
                >
                  <FiBell className="w-4 sm:w-5 h-4 sm:h-5" />
                </motion.button>

                {/* Active Badge */}
                {count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center z-20 border-2 border-white"
                    style={{
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 3px',
                    }}
                  >
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </motion.div>
            )}

            {/* Profile Button */}
            <motion.button
              onClick={() => navigate('/vendor/profile')}
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center bg-[#720C3E] text-white flex-shrink-0 cursor-pointer hover:bg-[#5a0930] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiUser className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </motion.button>
          </div>
        </div>
      </header>
      {/* Spacer to push content below fixed header */}
      <div className="h-[57px]" />

      {/* Emergency SOS Modal */}
      <SOSModal isOpen={showSOSModal} onClose={() => setShowSOSModal(false)} />
    </>
  );
});

Header.displayName = 'VendorHeader';
export default Header;


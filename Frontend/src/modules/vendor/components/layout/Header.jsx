import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { vendorTheme as themeColors } from '../../../../theme';
import Logo from '../../../../components/common/Logo';
import api from '../../../../services/api';
import vendorService from '../../../../services/vendorService';
import { toast } from 'react-hot-toast';

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
  const [isOnline, setIsOnline] = useState(() => {
    const saved = localStorage.getItem('vendorIsOnline');
    return saved !== null ? saved === 'true' : true;
  });
  const [togglingStatus, setTogglingStatus] = useState(false);

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
    <header
      className="sticky top-0 z-40 w-full bg-white"
      style={{
        borderBottom: '1px solid rgba(232, 217, 223, 0.7)',
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
        boxShadow: '0 4px 20px rgba(114, 12, 62, 0.04)',
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack ? (
            <motion.button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
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
              <Logo className="h-10 w-auto object-contain" />
            </motion.div>
          )}
          {showBack && (
            <h1 className="text-base font-bold text-[#24151D] truncate">{title || 'Vendor'}</h1>
          )}
        </div>

        {/* Right Area: Online/Offline Toggle + Search + Notifications */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Online / Offline Toggle Button */}
          <motion.button
            onClick={handleToggleOnline}
            disabled={togglingStatus}
            whileTap={{ scale: 0.94 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer text-xs font-bold select-none ${
              isOnline
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-xs'
                : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {/* Status Dot with Pulse animation */}
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            </span>
            <span className="tracking-wide">{isOnline ? 'Online' : 'Offline'}</span>
          </motion.button>

          {showSearch && (
            <button
              className="p-2 rounded-full hover:bg-gray-100 text-[#720C3E] transition-colors active:scale-95 cursor-pointer"
              onClick={() => navigate('/vendor/jobs')}
            >
              <FiSearch className="w-5 h-5" />
            </button>
          )}

          {showNotifications && (
            <motion.div
              className="relative rounded-full cursor-pointer"
              style={{
                width: '38px',
                height: '38px',
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
                <FiBell className="w-5 h-5" />
              </motion.button>

              {/* Active Badge */}
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center z-20 border-2 border-white"
                  style={{
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 3px',
                  }}
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'VendorHeader';
export default Header;

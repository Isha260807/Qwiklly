import React, { useState, useEffect, memo, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HiHome, 
  HiOutlineHome, 
  HiBriefcase, 
  HiOutlineBriefcase, 
  HiUser, 
  HiOutlineUser 
} from 'react-icons/hi';
import { FaWallet, FaRegCreditCard } from 'react-icons/fa';
import { motion } from 'framer-motion';

const BottomNav = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingJobsCount, setPendingJobsCount] = useState(0);

  // Load pending jobs count from localStorage
  useEffect(() => {
    const updatePendingCount = () => {
      try {
        const acceptedBookings = JSON.parse(localStorage.getItem('vendorAcceptedBookings') || '[]');
        const activeJobs = acceptedBookings.filter(job => job.status === 'PENDING');
        setPendingJobsCount(activeJobs.length);
      } catch (error) {
        console.error('Error reading pending jobs:', error);
      }
    };

    updatePendingCount();
    window.addEventListener('storage', updatePendingCount);
    window.addEventListener('vendorJobsUpdated', updatePendingCount);

    return () => {
      window.removeEventListener('storage', updatePendingCount);
      window.removeEventListener('vendorJobsUpdated', updatePendingCount);
    };
  }, []);

  // navItems without Workers
  const navItems = useMemo(() => [
    { id: 'home', path: '/vendor/dashboard', icon: HiOutlineHome, activeIcon: HiHome, label: 'Home' },
    { id: 'jobs', path: '/vendor/jobs', icon: HiOutlineBriefcase, activeIcon: HiBriefcase, label: 'Jobs', badge: pendingJobsCount },
    { id: 'wallet', path: '/vendor/wallet', icon: FaRegCreditCard, activeIcon: FaWallet, label: 'Wallet' },
    { id: 'profile', path: '/vendor/profile', icon: HiOutlineUser, activeIcon: HiUser, label: 'Profile' },
  ], [pendingJobsCount]);

  const getActiveTab = () => {
    const p = location.pathname;
    if (p === '/vendor/dashboard' || p === '/vendor' || p === '/vendor/') return 'home';
    if (p.startsWith('/vendor/jobs') || p.startsWith('/vendor/active-jobs')) return 'jobs';
    if (p.startsWith('/vendor/wallet') || p.startsWith('/vendor/earnings')) return 'wallet';
    if (p.startsWith('/vendor/profile') || p.startsWith('/vendor/settings')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleNavClick = (path) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  // Hide nav when specific routes are active (booking alerts, maps)
  const hideNavRoutes = [
    '/vendor/booking-alert/',
    '/vendor/booking/',
  ];

  const shouldHideNav = hideNavRoutes.some(route =>
    location.pathname.includes(route) &&
    (location.pathname.includes('/map') || location.pathname.includes('/alert/'))
  );

  if (shouldHideNav) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full bg-white border-t border-[#E8D9DF]/60 shadow-[0_-4px_20px_rgba(114,12,62,0.05)]"
      style={{
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = isActive ? item.activeIcon : item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              whileTap={{ scale: 0.94 }}
              className={`relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'text-[#720C3E] font-bold'
                  : 'text-[#6F5A64] hover:text-[#24151D] font-medium'
              }`}
            >
              {/* Active Pill Background */}
              {isActive && (
                <motion.div
                  layoutId="vendorBottomNavActivePill"
                  className="absolute inset-0 bg-[#FCEBF3] rounded-2xl z-0"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              {/* Icon & Label */}
              <div className="relative z-10 flex items-center gap-1.5">
                <div className="relative flex items-center justify-center">
                  <IconComponent 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'text-[#720C3E]' : 'text-[#6F5A64]'
                    }`} 
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-[#720C3E] text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 border-2 border-white shadow-xs">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[13px] sm:text-sm font-semibold whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;

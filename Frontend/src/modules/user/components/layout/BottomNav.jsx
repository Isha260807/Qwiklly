import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HiHome, 
  HiOutlineHome, 
  HiClipboardList, 
  HiOutlineClipboardList, 
  HiUser, 
  HiOutlineUser 
} from 'react-icons/hi';
import { motion } from 'framer-motion';

const BottomNav = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = useMemo(() => [
    { 
      id: 'home', 
      label: 'Home', 
      icon: HiOutlineHome, 
      activeIcon: HiHome, 
      path: '/user' 
    },
    { 
      id: 'bookings', 
      label: 'Bookings', 
      icon: HiOutlineClipboardList, 
      activeIcon: HiClipboardList, 
      path: '/user/my-bookings' 
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: HiOutlineUser, 
      activeIcon: HiUser, 
      path: '/user/account' 
    },
  ], []);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/user' || path === '/user/') return 'home';
    if (path.startsWith('/user/my-bookings') || path.startsWith('/user/booking')) return 'bookings';
    if (path.startsWith('/user/account') || path.startsWith('/user/profile') || path.startsWith('/user/update-profile') || path.startsWith('/user/settings')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (path) => {
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full lg:hidden bg-white border-t border-[#E8D9DF]/60 shadow-[0_-4px_20px_rgba(114,12,62,0.04)]"
      style={{
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = isActive ? item.activeIcon : item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={() => handleTabClick(item.path)}
              whileTap={{ scale: 0.94 }}
              className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'text-[#720C3E] font-extrabold'
                  : 'text-[#55404B] hover:text-[#24151D] font-bold'
              }`}
            >
              {/* Active Pill Background Matching App Theme */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavActivePill"
                  className="absolute inset-0 bg-[#FCEBF3] rounded-2xl z-0"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              {/* Icon & Label */}
              <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <div className="relative flex items-center justify-center">
                  <IconComponent 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'text-[#720C3E]' : 'text-[#55404B]'
                    }`} 
                  />
                </div>
                <span className={`text-sm tracking-wide whitespace-nowrap ${isActive ? 'font-extrabold' : 'font-bold'}`}>
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

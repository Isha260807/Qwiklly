import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiChevronDown, HiUser } from 'react-icons/hi';
import { FiSearch } from 'react-icons/fi';
import NotificationBell from '../common/NotificationBell';

const Header = ({ location, onLocationClick, onSearchClick }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userData');
      if (stored) {
        setUserData(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Parse location into title and detailed subtitle
  const cleanLocation = location && location !== '...' ? location : 'Select Location';
  const locationParts = cleanLocation.split(/[,-]/);
  const primaryTitle = locationParts[0]?.trim() || 'Select Location';
  const subtitle = cleanLocation;

  return (
    <header 
      className="text-white shadow-md select-none sticky top-0 z-50 transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)'
      }}
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3">
        {/* Left Side: Address Section with Dropdown Chevron */}
        <div
          className="flex flex-col cursor-pointer max-w-[55%] xs:max-w-[62%] sm:max-w-md group min-w-0"
          onClick={onLocationClick}
        >
          <div className="flex items-center gap-1 text-white">
            <span className="font-bold text-[16px] sm:text-lg tracking-tight truncate leading-tight group-hover:opacity-90">
              {primaryTitle}
            </span>
            <HiChevronDown className="w-4 h-4 text-white shrink-0 stroke-[1.5] transition-transform duration-200 group-hover:translate-y-0.5" />
          </div>
          <span className="text-[11px] sm:text-xs text-pink-100/90 font-normal truncate mt-0.5 opacity-90 leading-tight">
            {subtitle}
          </span>
        </div>

        {/* Right Side: Search, Notification & Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Search Trigger Button */}
          <button
            type="button"
            onClick={onSearchClick}
            className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20 shadow-sm"
            aria-label="Search services"
            title="Search"
          >
            <FiSearch className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>

          {/* Notification Button */}
          <NotificationBell
            className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
            iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2]"
            dotClassName="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
          />

          {/* Profile Avatar Button */}
          <Link
            to="/user/account"
            className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full bg-white text-[#720C3E] flex items-center justify-center shadow-md overflow-hidden border border-white/40 hover:opacity-95 active:scale-95 transition-all duration-200"
            aria-label="User Account"
            title="Account"
          >
            {userData?.profilePhoto ? (
              <img
                src={userData.profilePhoto}
                alt={userData.name || 'User Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <HiUser className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-[#720C3E]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;


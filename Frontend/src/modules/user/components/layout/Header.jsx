import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiChevronDown, HiUser } from 'react-icons/hi';
import { FiSearch } from 'react-icons/fi';

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
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left Side: Address Section with Dropdown Chevron */}
        <div
          className="flex flex-col cursor-pointer max-w-[65%] xs:max-w-[70%] sm:max-w-md group"
          onClick={onLocationClick}
        >
          <div className="flex items-center gap-1 text-white">
            <span className="font-bold text-[17px] sm:text-lg tracking-tight truncate leading-tight group-hover:opacity-90">
              {primaryTitle}
            </span>
            <HiChevronDown className="w-4 h-4 text-white shrink-0 stroke-[1.5] transition-transform duration-200 group-hover:translate-y-0.5" />
          </div>
          <span className="text-[11px] sm:text-xs text-pink-100/90 font-normal truncate mt-0.5 opacity-90 leading-tight">
            {subtitle}
          </span>
        </div>

        {/* Right Side: Search & Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Trigger Button */}
          <button
            type="button"
            onClick={onSearchClick}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20 shadow-sm"
            aria-label="Search services"
            title="Search"
          >
            <FiSearch className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>

          {/* Profile Avatar Button */}
          <Link
            to="/user/account"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-[#720C3E] flex items-center justify-center shadow-md overflow-hidden border border-white/40 hover:opacity-95 active:scale-95 transition-all duration-200"
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
              <HiUser className="w-5 h-5 sm:w-6 sm:h-6 text-[#720C3E]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;


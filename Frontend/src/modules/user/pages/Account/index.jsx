import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import { userAuthService } from '../../../../services/authService';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiEdit3,
  FiClipboard,
  FiHeadphones,
  FiFileText,
  FiStar,
  FiMapPin,
  FiSettings,
  FiChevronRight,
  FiLogOut,
  FiGift,
  FiShield,
  FiZap
} from 'react-icons/fi';
import { MdAccountBalanceWallet } from 'react-icons/md';
import NotificationBell from '../../components/common/NotificationBell';
import Logo from '../../../../components/common/Logo';

const defaultUserProfile = {
  name: 'Verified Customer',
  phone: '',
  email: '',
  isPhoneVerified: false,
  isEmailVerified: false,
  walletBalance: 0,
  plans: null
};

const mapUserProfile = (userData = {}) => ({
  ...defaultUserProfile,
  name: userData.name || defaultUserProfile.name,
  phone: userData.phone || '',
  email: userData.email || '',
  isPhoneVerified: userData.isPhoneVerified || false,
  isEmailVerified: userData.isEmailVerified || false,
  profilePhoto: userData.profilePhoto || '',
  walletBalance: userData.wallet?.balance ?? 0,
  plans: userData.plans
});

const getStoredUserProfile = () => {
  try {
    const storedUserData = localStorage.getItem('userData');
    return storedUserData ? mapUserProfile(JSON.parse(storedUserData)) : defaultUserProfile;
  } catch {
    return defaultUserProfile;
  }
};

const Account = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(getStoredUserProfile);

  // Render the stored profile immediately, then refresh it silently in the background.
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const response = await userAuthService.getProfile();
        if (!cancelled && response.success && response.user) {
          setUserProfile(mapUserProfile(response.user));
        }
      } catch (error) {
        // The locally stored profile is already rendered, so keep it visible
        // when the background refresh is unavailable.
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    if (phone.startsWith('+91')) return phone;
    if (phone.length === 10) return `+91 ${phone}`;
    return phone;
  };

  const getInitials = () => {
    if (userProfile.name && userProfile.name !== 'Verified Customer') {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (userProfile.phone) {
      return userProfile.phone.slice(-2);
    }
    return 'QC';
  };

  const handleLogout = async () => {
    try {
      await userAuthService.logout();
      toast.success('Logged out successfully');
      navigate('/user/login');
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      toast.success('Logged out successfully');
      navigate('/user/login');
    }
  };

  const MenuItem = ({ icon: Icon, label, onClick, color = "text-gray-800", badge }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 hover:bg-[#FCEBF3]/60 active:bg-[#FCEBF3] transition-colors text-left group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color === 'text-red-500' ? 'bg-red-50 text-red-500' : 'bg-[#FFF7FA] text-[#720C3E] group-hover:bg-[#FCEBF3]'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {badge && (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded-full">
            {badge}
          </span>
        )}
        <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#720C3E] transition-colors" />
      </div>
    </button>
  );

  return (
    <div className="relative bg-transparent min-h-screen">
      {/* Background provided globally by UserRoutes */}

      {/* =========================================================================
          MOBILE LAYOUT (< md / < 768px) - 100% UNCHANGED & IDENTICAL
      ========================================================================= */}
      <div className="md:hidden max-w-lg mx-auto pb-16">
        {/* Theme Gradient Header */}
        <header 
          className="sticky top-0 z-40 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
              title="Go Back"
            >
              <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Account</h1>
          </div>
          <NotificationBell 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
            iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2]"
            dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
          />
        </header>

        <main className="px-4 py-3 space-y-3">
          {/* Compact Profile Card */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                {userProfile.profilePhoto ? (
                  <img
                    src={userProfile.profilePhoto}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-black text-lg"
                    style={{ backgroundColor: themeColors.primary || '#720C3E' }}
                  >
                    {getInitials()}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/user/update-profile')}
                className="absolute -bottom-1 -right-1 p-1 bg-gray-900 text-white rounded-md border border-white shadow-sm active:scale-95 transition-transform"
              >
                <FiEdit3 className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 break-words leading-tight">
                {userProfile.name}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {userProfile.phone ? formatPhoneNumber(userProfile.phone) : 'No phone linked'}
              </p>
              <button
                onClick={() => navigate('/user/update-profile')}
                className="mt-1.5 px-2.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Quick Actions Grid (Balance & Rewards) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => navigate('/user/wallet')}
              className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left active:scale-[0.99] cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5"
                style={{ backgroundColor: `${themeColors.primary || '#720C3E'}15`, color: themeColors.primary || '#720C3E' }}
              >
                <MdAccountBalanceWallet className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-[#6F5A64] font-bold uppercase tracking-wider">Balance</span>
              <p className={`text-sm font-black mt-0.5 ${userProfile.walletBalance < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                ₹{Math.abs(userProfile.walletBalance || 0).toLocaleString('en-IN')}
                {userProfile.walletBalance < 0 && <span className="text-[10px] font-normal ml-1">(Penalty)</span>}
              </p>
            </button>

            <button
              onClick={() => navigate('/user/rewards')}
              className="bg-[#181E27] p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-left relative overflow-hidden active:scale-[0.99] cursor-pointer"
            >
              <div className="w-8 h-8 bg-white/10 text-yellow-400 rounded-xl flex items-center justify-center mb-1.5">
                <FiGift className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Rewards</span>
              <p className="text-xs font-bold text-white mt-0.5">Refer & Earn</p>
            </button>
          </div>

          {/* Menu Card 1: Shopping & Activity */}
          <div>
            <h3 className="text-[11px] font-bold text-[#55404B] uppercase tracking-wider mb-1.5 px-1">Orders & Activity</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              <MenuItem
                icon={FiClipboard}
                label="My Bookings"
                onClick={() => navigate('/user/my-bookings')}
              />
              <MenuItem
                icon={FiStar}
                label="My Ratings"
                onClick={() => navigate('/user/my-rating')}
              />
            </div>
          </div>

          {/* Menu Card 2: Preferences */}
          <div>
            <h3 className="text-[11px] font-bold text-[#55404B] uppercase tracking-wider mb-1.5 px-1">Preferences</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              <MenuItem
                icon={FiMapPin}
                label="Manage Addresses"
                onClick={() => navigate('/user/manage-addresses')}
              />
              <MenuItem
                icon={FiSettings}
                label="Settings"
                onClick={() => navigate('/user/settings')}
              />
            </div>
          </div>

          {/* Menu Card 3: Support & Legal */}
          <div>
            <h3 className="text-[11px] font-bold text-[#55404B] uppercase tracking-wider mb-1.5 px-1">Support & More</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              <MenuItem
                icon={FiHeadphones}
                label="Help & Support"
                onClick={() => navigate('/user/help-support')}
              />
              <button
                type="button"
                onClick={() => navigate('/user/about-Qwiklly')}
                className="w-full flex items-center justify-between p-3 hover:bg-[#FCEBF3]/60 active:bg-[#FCEBF3] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF7FA] text-[#720C3E] group-hover:bg-[#FCEBF3] flex items-center justify-center transition-colors">
                    <Logo className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800">About Qwiklly</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#720C3E] transition-colors" />
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 bg-red-500 hover:bg-red-600 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>

          <div className="text-center pt-1 pb-0">
            <p className="text-[10px] font-medium text-gray-400">Version 7.6.27 R547</p>
          </div>
        </main>
      </div>

      {/* =========================================================================
          TABLET & DESKTOP LAYOUT (>= md / >= 768px) - 2-COLUMN PREMIUM DASHBOARD
      ========================================================================= */}
      <div className="hidden md:block pb-16">
        {/* Top Header Bar */}
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Go Back"
              >
                <FiArrowLeft className="text-lg" />
              </button>
              <div>
                <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/user')}>Home</span>
                  <span>/</span>
                  <span className="text-[#720C3E] font-bold">My Account</span>
                </nav>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mt-1">
                  Account & Settings
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/user/update-profile')}
                className="px-4 py-2 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <FiEdit3 className="text-sm" />
                <span>Edit Profile</span>
              </button>

              <NotificationBell 
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 relative shrink-0 cursor-pointer"
                iconClassName="w-5 h-5 text-slate-700 stroke-[2]"
                dotClassName="absolute top-2 right-2 w-2 h-2 bg-[#FF2D55] rounded-full ring-2 ring-white shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Column: Profile Card & Quick Actions (md:col-span-5 lg:col-span-4) */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 space-y-6">
              {/* Profile Summary Card */}
              <div className="bg-white rounded-3xl p-6 border border-[#E8D9DF]/80 shadow-sm relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
                />

                <div className="relative pt-6 flex flex-col items-center text-center">
                  {/* Profile Avatar */}
                  <div className="relative mb-3.5">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-md border border-slate-100 bg-white">
                      {userProfile.profilePhoto ? (
                        <img
                          src={userProfile.profilePhoto}
                          alt={userProfile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
                          style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
                        >
                          {getInitials()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('/user/update-profile')}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-slate-900 hover:bg-black text-white rounded-lg border-2 border-white shadow-sm transition-transform active:scale-95 cursor-pointer"
                      title="Change profile photo"
                    >
                      <FiEdit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                    {userProfile.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {userProfile.phone ? formatPhoneNumber(userProfile.phone) : 'No phone linked'}
                  </p>
                  {userProfile.email && (
                    <p className="text-xs text-slate-400 font-normal truncate max-w-full mt-0.5">
                      {userProfile.email}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3.5">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <FiShield className="text-xs" /> Verified Customer
                    </span>
                  </div>

                  <button
                    onClick={() => navigate('/user/update-profile')}
                    className="w-full mt-5 py-2.5 bg-[#FFF7FA] hover:bg-[#FCEBF3] text-[#720C3E] border border-[#E8D9DF] font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Manage Account Info
                  </button>
                </div>
              </div>

              {/* Quick Actions Grid (Balance & Rewards) */}
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => navigate('/user/wallet')}
                  className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#E8D9DF] transition-all text-left active:scale-[0.99] cursor-pointer group"
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-colors"
                    style={{ backgroundColor: `${themeColors.primary || '#720C3E'}15`, color: themeColors.primary || '#720C3E' }}
                  >
                    <MdAccountBalanceWallet className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Wallet Balance</span>
                  <p className={`text-base font-black mt-0.5 ${userProfile.walletBalance < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                    ₹{Math.abs(userProfile.walletBalance || 0).toLocaleString('en-IN')}
                    {userProfile.walletBalance < 0 && <span className="text-[10px] font-normal ml-1 block text-red-500">(Penalty)</span>}
                  </p>
                </button>

                <button
                  onClick={() => navigate('/user/rewards')}
                  className="bg-[#181E27] p-4 rounded-3xl shadow-sm hover:shadow-md hover:bg-[#222933] transition-all text-left relative overflow-hidden active:scale-[0.99] cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-white/10 text-yellow-400 rounded-2xl flex items-center justify-center mb-3">
                    <FiGift className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider block">Rewards</span>
                  <p className="text-xs font-bold text-white mt-0.5">Refer & Earn</p>
                </button>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 active:scale-[0.99] text-xs font-bold uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
              >
                <FiLogOut className="w-4 h-4" />
                <span>Log out from Account</span>
              </button>

              <div className="text-center pt-2">
                <p className="text-[11px] font-medium text-slate-400">Qwiklly User App • Version 7.6.27 R547</p>
              </div>
            </div>

            {/* Right Column: Menu Sections (md:col-span-7 lg:col-span-8 space-y-6) */}
            <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-6">
              
              {/* Section 1: Orders & Subscriptions */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Orders & Activity</h3>
                    <p className="text-xs text-slate-400 font-medium">Track service appointments, bookings, and history</p>
                  </div>
                  <span className="px-2.5 py-1 bg-[#FFF7FA] text-[#720C3E] border border-[#E8D9DF] text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    Activity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div
                    onClick={() => navigate('/user/my-bookings')}
                    className="p-4 bg-slate-50 hover:bg-[#FFF7FA] hover:border-[#E8D9DF] rounded-2xl border border-slate-100 transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-white text-[#720C3E] shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiClipboard className="text-base" />
                      </div>
                      <FiChevronRight className="text-slate-300 group-hover:text-[#720C3E] transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mt-2">My Bookings</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">View active & past orders</p>
                    </div>
                  </div>

                  <div
                    onClick={() => navigate('/user/my-rating')}
                    className="p-4 bg-slate-50 hover:bg-[#FFF7FA] hover:border-[#E8D9DF] rounded-2xl border border-slate-100 transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-white text-[#720C3E] shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiStar className="text-base" />
                      </div>
                      <FiChevronRight className="text-slate-300 group-hover:text-[#720C3E] transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mt-2">My Ratings</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">Reviews & feedback</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Account Preferences & Settings */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Preferences & Security</h3>
                    <p className="text-xs text-slate-400 font-medium">Manage addresses, app settings, and payments</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    Settings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div
                    onClick={() => navigate('/user/manage-addresses')}
                    className="p-4 bg-slate-50 hover:bg-[#FFF7FA] hover:border-[#E8D9DF] rounded-2xl border border-slate-100 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white text-[#720C3E] shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FiMapPin className="text-lg" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Manage Addresses</h4>
                        <p className="text-[11px] text-slate-500">Saved home, work & other delivery locations</p>
                      </div>
                    </div>
                    <FiChevronRight className="text-slate-300 group-hover:text-[#720C3E] transition-colors shrink-0" />
                  </div>

                  <div
                    onClick={() => navigate('/user/settings')}
                    className="p-4 bg-slate-50 hover:bg-[#FFF7FA] hover:border-[#E8D9DF] rounded-2xl border border-slate-100 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white text-[#720C3E] shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FiSettings className="text-lg" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">App Settings</h4>
                        <p className="text-[11px] text-slate-500">Notifications, security & permissions</p>
                      </div>
                    </div>
                    <FiChevronRight className="text-slate-300 group-hover:text-[#720C3E] transition-colors shrink-0" />
                  </div>
                </div>
              </div>

              {/* Section 3: Support & Information */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Support & Information</h3>
                    <p className="text-xs text-slate-400 font-medium">Customer care, FAQs, and company info</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    Help
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div
                    onClick={() => navigate('/user/help-support')}
                    className="p-4 bg-slate-50 hover:bg-[#FFF7FA] hover:border-[#E8D9DF] rounded-2xl border border-slate-100 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white text-[#720C3E] shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FiHeadphones className="text-lg" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Help & Support</h4>
                        <p className="text-[11px] text-slate-500">24/7 Assistance with bookings & queries</p>
                      </div>
                    </div>
                    <FiChevronRight className="text-slate-300 group-hover:text-[#720C3E] transition-colors shrink-0" />
                  </div>

                  <div
                    onClick={() => navigate('/user/about-Qwiklly')}
                    className="p-4 bg-slate-50 hover:bg-[#FFF7FA] hover:border-[#E8D9DF] rounded-2xl border border-slate-100 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white text-[#720C3E] shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Logo className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">About Qwiklly</h4>
                        <p className="text-[11px] text-slate-500">Our safety standards, mission & team</p>
                      </div>
                    </div>
                    <FiChevronRight className="text-slate-300 group-hover:text-[#720C3E] transition-colors shrink-0" />
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import { userAuthService } from '../../../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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

const Account = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: 'Verified Customer',
    phone: '',
    email: '',
    isPhoneVerified: false,
    isEmailVerified: false,
    walletBalance: 0,
    plans: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUserProfile({
            name: userData.name || 'Verified Customer',
            phone: userData.phone || '',
            email: userData.email || '',
            isPhoneVerified: userData.isPhoneVerified || false,
            isEmailVerified: userData.isEmailVerified || false,
            profilePhoto: userData.profilePhoto || '',
            walletBalance: userData.wallet?.balance ?? 0
          });
        }

        const response = await userAuthService.getProfile();
        if (response.success && response.user) {
          setUserProfile({
            name: response.user.name || 'Verified Customer',
            phone: response.user.phone || '',
            email: response.user.email || '',
            isPhoneVerified: response.user.isPhoneVerified || false,
            isEmailVerified: response.user.isEmailVerified || false,
            profilePhoto: response.user.profilePhoto || '',
            walletBalance: response.user.wallet?.balance ?? 0,
            plans: response.user.plans
          });
        }
      } catch (error) {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUserProfile({
            name: userData.name || 'Verified Customer',
            phone: userData.phone || '',
            email: userData.email || '',
            isPhoneVerified: userData.isPhoneVerified || false,
            isEmailVerified: userData.isEmailVerified || false
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative bg-transparent">
      {/* Background provided globally by UserRoutes */}

      <div className="relative z-10 max-w-lg mx-auto">
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

          {/* Active Plan Card */}
          {userProfile.plans && userProfile.plans.isActive && (
            <div
              onClick={() => navigate('/user/my-plan')}
              className="relative overflow-hidden rounded-2xl p-3.5 text-white cursor-pointer group shadow-sm"
              style={{
                backgroundColor: themeColors.primary || '#720C3E'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <FiShield className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/80">Membership Status</span>
                  </div>
                  <h3 className="text-base font-bold">{userProfile.plans.name}</h3>
                  <p className="text-[10px] text-white/80 mt-0.5">
                    Expires: {new Date(userProfile.plans.expiry).toLocaleDateString()}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FiZap className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          )}

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
            <h3 className="text-[11px] font-bold text-[#55404B] uppercase tracking-wider mb-1.5 px-1">Orders & Plans</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              <MenuItem
                icon={FiFileText}
                label="My Plans"
                onClick={() => navigate('/user/my-plan')}
              />
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
                onClick={() => navigate('/user/about-homestr')}
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
    </div>
  );
};

export default Account;

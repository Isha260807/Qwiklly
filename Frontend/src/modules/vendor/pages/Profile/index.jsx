import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiEdit2, FiMapPin, FiPhone, FiMail, FiBriefcase, FiStar, FiArrowRight, FiSettings, FiChevronRight, FiCreditCard, FiLogOut, FiTrash2, FiLayers } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import { vendorAuthService } from '../../../../services/authService';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LogoLoader from '../../../../components/common/LogoLoader';

const Profile = () => {
  const navigate = useNavigate();

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const menuItems = [
    { id: 5, label: 'My Ratings', icon: FiStar, path: '/vendor/my-ratings' },
    { id: 7, label: 'Manage Address', icon: FiMapPin, path: '/vendor/address-management' },
    { id: 8, label: 'Settings', icon: FiSettings, path: '/vendor/settings' },
    { id: 9, label: 'About Qwiklly', icon: null, customIcon: 'Q', path: '/vendor/about-homestr' },
  ];

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      // Try to load from local storage first for immediate display
      const storedVendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
      if (storedVendorData && Object.keys(storedVendorData).length > 0) {
        const rawServices = storedVendorData.service || storedVendorData.categories || [];
        const servicesList = Array.isArray(rawServices) ? rawServices : (rawServices ? [rawServices] : []);

        setProfile({
          name: storedVendorData.name || 'Vendor Name',
          businessName: storedVendorData.businessName || null,
          phone: storedVendorData.phone || '',
          email: storedVendorData.email || '',
          address: storedVendorData.address ?
            (typeof storedVendorData.address === 'string' ? storedVendorData.address :
              `${storedVendorData.address.addressLine1 || ''} ${storedVendorData.address.addressLine2 || ''} ${storedVendorData.address.city || ''} ${storedVendorData.address.state || ''} ${storedVendorData.address.pincode || ''}`.trim() || 'Not set')
            : 'Not set',
          rating: storedVendorData.rating || 0,
          totalJobs: storedVendorData.totalJobs || 0,
          completionRate: storedVendorData.completionRate || 0,
          serviceCategory: Array.isArray(storedVendorData.service) ? storedVendorData.service.join(', ') : (storedVendorData.service || ''),
          services: servicesList,
          skills: [],
          photo: storedVendorData.profilePhoto || null,
          approvalStatus: storedVendorData.approvalStatus,
          isPhoneVerified: storedVendorData.isPhoneVerified || false,
          isEmailVerified: storedVendorData.isEmailVerified || false
        });
        setIsLoading(false); // Show content immediately
      }

      setError(null);
      try {
        const response = await vendorAuthService.getProfile();
        if (response.success) {
          const vendorData = response.vendor;
          // Format address
          const addressString = vendorData.address
            ? (typeof vendorData.address === 'string' ? vendorData.address :
              `${vendorData.address.addressLine1 || ''} ${vendorData.address.addressLine2 || ''} ${vendorData.address.city || ''} ${vendorData.address.state || ''} ${vendorData.address.pincode || ''}`.trim() || 'Not set')
            : 'Not set';

          setProfile({
            name: vendorData.name || 'Vendor Name',
            businessName: vendorData.businessName || null,
            phone: vendorData.phone || '',
            email: vendorData.email || '',
            address: addressString,
            rating: vendorData.rating || 0,
            totalJobs: vendorData.totalJobs || 0,
            completionRate: vendorData.completionRate || 0,
            serviceCategory: vendorData.service || '',
            skills: [],
            photo: vendorData.profilePhoto || null,
            approvalStatus: vendorData.approvalStatus,
            isPhoneVerified: vendorData.isPhoneVerified || false,
            isEmailVerified: vendorData.isEmailVerified || false
          });
          localStorage.setItem('vendorData', JSON.stringify(vendorData));
        } else {
          // If API fails but we have local data, stick with it?
          if (!storedVendorData || Object.keys(storedVendorData).length === 0) {
            setError(response.message || 'Failed to fetch profile');
            toast.error(response.message || 'Failed to fetch profile');
          }
        }
      } catch (err) {
        console.error('Error fetching vendor profile:', err);
        if (!storedVendorData || Object.keys(storedVendorData).length === 0) {
          setError(err.response?.data?.message || 'Failed to fetch profile');
          toast.error(err.response?.data?.message || 'Failed to fetch profile');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    window.addEventListener('vendorDataUpdated', fetchProfile);
    window.addEventListener('vendorProfileUpdated', fetchProfile);

    return () => {
      window.removeEventListener('vendorDataUpdated', fetchProfile);
      window.removeEventListener('vendorProfileUpdated', fetchProfile);
    };
  }, []);

  if (isLoading) {
    return <LogoLoader />;
  }

  if (error && !profile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: themeColors.backgroundGradient,
        }}
      >
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-500">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to Load Profile</h3>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl text-white font-semibold transition-all shadow-md active:scale-95"
            style={{
              backgroundColor: themeColors.button,
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: themeColors.backgroundGradient,
      }}
    >
      <Header />

      <main className="max-w-md mx-auto pt-4">
        {/* Profile Card - Light & Compact without borders */}
        <div
          className="mx-4 p-3 rounded-xl mb-3 relative overflow-hidden bg-white shadow-sm"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              {/* Profile Photo */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-13 h-13 rounded-full flex items-center justify-center overflow-hidden bg-[#FCEBF3]"
                  style={{
                    width: '52px',
                    height: '52px',
                  }}
                >
                  {profile.photo ? (
                    <img
                      src={profile.photo}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiUser className="w-6 h-6 text-[#720C3E]" />
                  )}
                </div>
                {/* Star Rating Below Photo */}
                {profile.rating > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FCEBF3] mt-1 shadow-2xs">
                    <FiStar className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-bold text-[#24151D]">{profile.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Name and Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h2 className="text-sm font-bold text-[#24151D] leading-tight truncate">{profile.name}</h2>
                {profile.businessName && (
                  <p className="text-[#720C3E] text-xs font-semibold truncate mt-0.5">{profile.businessName}</p>
                )}

                {/* Phone and Email */}
                <div className="space-y-0.5 mt-1">
                  {profile.phone && (
                    <div className="flex items-center gap-1.5">
                      <FiPhone className="w-2.5 h-2.5 text-[#720C3E] flex-shrink-0" />
                      <span className="text-[11px] text-gray-600 font-medium truncate">{profile.phone}</span>
                    </div>
                  )}
                  {profile.email && (
                    <div className="flex items-center gap-1.5">
                      <FiMail className="w-2.5 h-2.5 text-[#720C3E] flex-shrink-0" />
                      <span className="text-[11px] text-gray-600 font-medium truncate">{profile.email}</span>
                    </div>
                  )}
                </div>

                {/* Assigned Services Pills */}
                {profile.services && profile.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {profile.services.slice(0, 3).map((srv, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold text-[#720C3E] bg-[#FCEBF3]"
                      >
                        {srv}
                      </span>
                    ))}
                    {profile.services.length > 3 && (
                      <span className="text-[9px] font-bold text-[#720C3E] self-center">
                        +{profile.services.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Navigate Button */}
              <button
                onClick={() => navigate('/vendor/profile/details')}
                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-[#FCEBF3] text-[#720C3E] hover:bg-[#f6d7e6] active:scale-95 transition-all cursor-pointer"
                aria-label="View Profile Details"
              >
                <FiChevronRight className="w-4 h-4 text-[#720C3E]" />
              </button>
            </div>
          </div>
        </div>

        {/* Three Cards Section - Horizontal */}
        <div className="px-4 mb-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Active Jobs */}
            <button
              onClick={() => navigate('/vendor/jobs')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl active:scale-95 transition-all duration-200 bg-white shadow-xs hover:shadow-sm cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 bg-[#FCEBF3] text-[#720C3E]">
                <FiBriefcase className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-[#24151D] text-center leading-tight">
                Active Jobs
              </span>
            </button>

            {/* Wallet */}
            <button
              onClick={() => navigate('/vendor/wallet')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl active:scale-95 transition-all duration-200 bg-white shadow-xs hover:shadow-sm cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 bg-[#FCEBF3] text-[#720C3E]">
                <FaWallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-[#24151D] text-center leading-tight">
                Wallet
              </span>
            </button>

            {/* My Services */}
            <button
              onClick={() => navigate('/vendor/services')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl active:scale-95 transition-all duration-200 bg-white shadow-xs hover:shadow-sm cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 bg-[#FCEBF3] text-[#720C3E]">
                <FiLayers className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-[#24151D] text-center leading-tight">
                My Services
              </span>
            </button>
          </div>
        </div>

        {/* Menu List Section */}
        <div className="px-4 mb-3 space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-2.5 bg-white rounded-xl shadow-xs hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {item.customIcon ? (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E]">
                      <span className="text-xs font-black">{item.customIcon}</span>
                    </div>
                  ) : (
                    IconComponent && (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E]">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                    )
                  )}
                  <span className="text-xs font-bold text-[#24151D] text-left">
                    {item.label}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center">
                  <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="px-4 mb-3">
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                await vendorAuthService.logout();
                toast.success('Logged out successfully');
                navigate('/vendor/login');
              } catch (error) {
                localStorage.removeItem('vendorAccessToken');
                localStorage.removeItem('vendorRefreshToken');
                localStorage.removeItem('vendorData');
                toast.success('Logged out successfully');
                navigate('/vendor/login');
              }
            }}
            className="w-full font-semibold py-2.5 rounded-xl active:scale-98 transition-all text-white flex items-center justify-center gap-2 text-xs cursor-pointer shadow-xs"
            style={{
              backgroundColor: '#EF4444',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#EF4444';
            }}
          >
            <FiLogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;


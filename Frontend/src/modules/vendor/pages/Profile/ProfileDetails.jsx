import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiEdit2, FiMapPin, FiPhone, FiMail, FiBriefcase, FiCreditCard, FiSmartphone } from 'react-icons/fi';
import { vendorAuthService } from '../../../../services/authService';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

const ProfileDetails = () => {
  const navigate = useNavigate();

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const [profile, setProfile] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: '',
    address: '',
    serviceCategory: '',
    profilePhoto: '',
    bankDetails: {
      upiId: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: ''
    }
  });

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
    const loadProfile = async () => {
      try {
        // Optimistic load from local storage
        const localVendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        const vendorProfile = JSON.parse(localStorage.getItem('vendorProfile') || '{}');

        // Merge sources, preferring vendorData (which might be fresher from other pages)
        const storedData = { ...vendorProfile, ...localVendorData };

        if (Object.keys(storedData).length > 0) {
          // Format address if object
          let addressString = storedData.address;
          if (typeof storedData.address === 'object' && storedData.address !== null) {
            if (storedData.address.fullAddress) {
              addressString = storedData.address.fullAddress;
            } else {
              addressString = `${storedData.address.addressLine1 || ''} ${storedData.address.addressLine2 || ''} ${storedData.address.city || ''} ${storedData.address.state || ''} ${storedData.address.pincode || ''}`.trim() || 'Not set';
            }
          }

          setProfile(prev => ({
            ...prev,
            name: storedData.name || 'Vendor Name',
            businessName: storedData.businessName || null,
            phone: storedData.phone || '',
            email: storedData.email || '',
            address: addressString || 'Not set',
            serviceCategory: storedData.serviceCategory || storedData.service || '',
            profilePhoto: storedData.profilePhoto || '',
            bankDetails: {
              upiId: storedData.bankDetails?.upiId || '',
              accountHolderName: storedData.bankDetails?.accountHolderName || '',
              accountNumber: storedData.bankDetails?.accountNumber || '',
              ifscCode: storedData.bankDetails?.ifscCode || '',
              bankName: storedData.bankDetails?.bankName || ''
            }
          }));
        }

        // Fetch fresh data from API
        const response = await vendorAuthService.getProfile();
        if (response.success) {
          const apiData = response.vendor;

          // Format address
          let formattedAddress = apiData.address;
          if (typeof apiData.address === 'object' && apiData.address !== null) {
            if (apiData.address.fullAddress) {
              formattedAddress = apiData.address.fullAddress;
            } else {
              formattedAddress = `${apiData.address.addressLine1 || ''} ${apiData.address.addressLine2 || ''} ${apiData.address.city || ''} ${apiData.address.state || ''} ${apiData.address.pincode || ''}`.trim() || 'Not set';
            }
          }

          const newProfile = {
            name: apiData.name,
            businessName: apiData.businessName,
            phone: apiData.phone,
            email: apiData.email,
            address: formattedAddress,
            serviceCategory: Array.isArray(apiData.service) ? apiData.service.join(', ') : (apiData.service || ''),
            profilePhoto: apiData.profilePhoto,
            bankDetails: apiData.bankDetails || {
              upiId: '',
              accountHolderName: '',
              accountNumber: '',
              ifscCode: '',
              bankName: ''
            }
          };

          setProfile(prev => ({ ...prev, ...newProfile }));

          // Update local storage
          localStorage.setItem('vendorData', JSON.stringify(apiData));
          localStorage.setItem('vendorProfile', JSON.stringify({ ...storedData, ...apiData }));
        }

      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
    window.addEventListener('vendorProfileUpdated', loadProfile);

    return () => {
      window.removeEventListener('vendorProfileUpdated', loadProfile);
    };
  }, []);

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Profile" />

      <main className="max-w-md mx-auto px-4 pt-3 pb-6">
        {/* Header with Edit Button */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-base">Profile Information</h3>
          <button
            onClick={() => navigate('/vendor/profile/edit')}
            className="px-2.5 py-1.5 rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.icon} 100%)`,
              color: '#FFFFFF',
            }}
          >
            <FiEdit2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Edit</span>
          </button>
        </div>

        {/* Profile Info - Compact List */}
        <div className="space-y-2.5 mb-4">

          {/* Profile Photo Section */}
          <div className="flex justify-center mb-1">
            <div className="w-18 h-18 rounded-full p-0.5 bg-white shadow-sm relative" style={{ width: '72px', height: '72px' }}>
              <div className="w-full h-full rounded-full overflow-hidden bg-[#FCEBF3] flex items-center justify-center">
                {profile.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser className="w-7 h-7 text-[#720C3E]" />
                )}
              </div>
              <div
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xs text-white"
                style={{ background: themeColors.button }}
              >
                <FiUser className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Personal Info Group */}
          <div className="bg-white rounded-xl p-3.5 shadow-xs">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Personal Details</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E]">
                  <FiUser className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">Full Name</p>
                  <p className="text-gray-900 font-bold text-xs truncate leading-none">{profile.name || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E]">
                  <FiBriefcase className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">Business Name</p>
                  <p className="text-gray-900 font-bold text-xs truncate leading-none">{profile.businessName || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info Group */}
          <div className="bg-white rounded-xl p-3.5 shadow-xs">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Contact Information</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E]">
                  <FiPhone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">Mobile Number</p>
                  <p className="text-gray-900 font-bold text-xs truncate leading-none">{profile.phone || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E]">
                  <FiMail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">Email Address</p>
                  <p className="text-gray-900 font-bold text-xs truncate leading-none">{profile.email || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E] mt-0.5">
                  <FiMapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">Address</p>
                  <p className="text-gray-900 font-bold text-xs leading-snug">{profile.address || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payout & Bank Details Group */}
          <div className="bg-white rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bank & UPI Details (Payouts)</h4>
              <button
                onClick={() => navigate('/vendor/profile/payout')}
                className="text-[10px] font-bold text-[#720C3E] hover:underline flex items-center gap-1"
              >
                <FiEdit2 className="w-2.5 h-2.5" />
                {profile.bankDetails?.upiId || profile.bankDetails?.accountNumber || profile.bankDetails?.upiQrCode ? 'Manage' : '+ Add Details'}
              </button>
            </div>
            
            <div className="space-y-2.5">
              {/* QR Code */}
              {profile.bankDetails?.upiQrCode && (
                <div className="flex items-center gap-3 p-2 bg-pink-50/50 rounded-xl border border-pink-100/60">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white p-0.5 shrink-0">
                    <img
                      src={profile.bankDetails.upiQrCode}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">Scanner QR Code</p>
                    <p className="text-emerald-700 font-bold text-xs leading-none">QR Code Configured</p>
                  </div>
                </div>
              )}

              {/* UPI ID */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-700">
                  <FiSmartphone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">UPI ID (Google Pay / PhonePe)</p>
                  <p className="text-gray-900 font-bold text-xs truncate leading-none">
                    {profile.bankDetails?.upiId || <span className="text-gray-400 font-normal italic">Not configured</span>}
                  </p>
                </div>
              </div>

              {/* Bank Account */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E] mt-0.5">
                  <FiCreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium leading-none mb-1">Bank Account</p>
                  {profile.bankDetails?.accountNumber ? (
                    <div className="space-y-0.5">
                      <p className="text-gray-900 font-bold text-xs leading-none">
                        {profile.bankDetails.bankName ? `${profile.bankDetails.bankName} - ` : ''}
                        A/C {profile.bankDetails.accountNumber}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium leading-tight">
                        {profile.bankDetails.accountHolderName && `Holder: ${profile.bankDetails.accountHolderName}`}
                        {profile.bankDetails.ifscCode && ` | IFSC: ${profile.bankDetails.ifscCode}`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No bank account added</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ProfileDetails;


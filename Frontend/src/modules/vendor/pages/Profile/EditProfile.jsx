import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiBriefcase, FiPhone, FiMail, FiMapPin, FiCamera, FiUpload, FiCreditCard, FiX, FiShield } from 'react-icons/fi';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';

import { vendorAuthService } from '../../../../services/authService';
import AddressSelectionModal from '../../../user/pages/Checkout/components/AddressSelectionModal';
import { toast } from 'react-hot-toast';
import { z } from "zod";
import flutterBridge from '../../../../utils/flutterBridge';

// Zod schema
const vendorProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  businessName: z.string().trim().optional(),
  // Phone is already verified and is not editable by this update endpoint.
  // Accept existing formatted values so profile edits are not blocked.
  phone: z.string().optional(),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal('')),
  // Address can be missing for older vendors; the backend preserves the
  // existing address and supports partial profile updates.
  address: z.custom((val) => {
    if (
      val === undefined ||
      val === null ||
      val === '' ||
      (typeof val === 'object' && !val.fullAddress && !val.addressLine1)
    ) {
      return true;
    }
    return (typeof val === 'string' && val.trim().length > 0) ||
      (typeof val === 'object' && val !== null && (val.fullAddress || val.addressLine1));
  }, "Address is invalid").optional(),
});
const EditProfile = () => {
  const navigate = useNavigate();

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: '',
    address: '',
    profilePhoto: '', // URL
    aadharDocument: '', // URL
    serviceRange: 10,
    bankDetails: {
      upiId: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: ''
    }
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [isFlutter, setIsFlutter] = useState(flutterBridge.isFlutter);
  const [isPhoneChangeOpen, setIsPhoneChangeOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false);

  // Sync flutter bridge state
  useEffect(() => {
    flutterBridge.waitForFlutter().then(ready => {
      setIsFlutter(ready);
    });
  }, []);

  const handleNativeCamera = async (target = 'photo') => {
    const file = await flutterBridge.openCamera();
    if (file) {
      if (target === 'photo') {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
      } else if (target === 'aadhar') {
        setAadharFile(file);
      }
      flutterBridge.hapticFeedback('success');
    }
  };

  const handleImageClick = (target = 'photo') => {
    if (isFlutter) {
      handleNativeCamera(target);
    } else {
      if (target === 'photo') {
        document.getElementById('photo-upload')?.click();
      } else {
        document.getElementById('aadhar-upload')?.click();
      }
    }
  };



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
        // Try to get fresh profile from API
        const response = await vendorAuthService.getProfile();

        if (response.success && response.vendor) {
          const v = response.vendor;

          let addressData = v.address;
          if (typeof v.address === 'string') {
            addressData = { fullAddress: v.address };
          } else if (!v.address) {
            addressData = {};
          }

          setFormData({
            name: v.name || '',
            businessName: v.businessName || '',
            phone: v.phone || '',
            email: v.email || '',
            address: addressData,
            profilePhoto: v.profilePhoto || '',
            aadharDocument: v.aadharDocument || (v.aadhar && v.aadhar.document) || '',
            serviceRange: v.settings?.serviceRange || 10,
            bankDetails: {
              upiId: v.bankDetails?.upiId || '',
              accountHolderName: v.bankDetails?.accountHolderName || '',
              accountNumber: v.bankDetails?.accountNumber || '',
              ifscCode: v.bankDetails?.ifscCode || '',
              bankName: v.bankDetails?.bankName || ''
            }
          });

          // Update local storage
          localStorage.setItem('vendorProfile', JSON.stringify(v));
          localStorage.setItem('vendorData', JSON.stringify(v));
        } else {
          // Fallback to local storage if API fails
          const vendorProfile = JSON.parse(localStorage.getItem('vendorProfile') || '{}');
          const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
          const storedData = { ...vendorProfile, ...vendorData };

          if (Object.keys(storedData).length > 0) {
            // ... existing fallback logic ...
            let addressData = storedData.address;
            if (typeof storedData.address === 'string') {
              addressData = { fullAddress: storedData.address };
            } else if (!storedData.address) {
              addressData = {};
            }

            setFormData({
              name: storedData.name || '',
              businessName: storedData.businessName || '',
              phone: storedData.phone || '',
              email: storedData.email || '',
              address: addressData,
              profilePhoto: storedData.profilePhoto || '',
              aadharDocument: storedData.aadharDocument || (storedData.aadhar && storedData.aadhar.document) || '',
              serviceRange: storedData.serviceRange || 10,
              bankDetails: {
                upiId: storedData.bankDetails?.upiId || '',
                accountHolderName: storedData.bankDetails?.accountHolderName || '',
                accountNumber: storedData.bankDetails?.accountNumber || '',
                ifscCode: storedData.bankDetails?.ifscCode || '',
                bankName: storedData.bankDetails?.bankName || ''
              }
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadProfile();
  }, []);

  const handleAddressSave = (houseNumber, location) => {
    let city = '';
    let state = '';
    let pincode = '';
    let addressLine2 = '';

    // Parse Google Maps address components
    if (location.components) {
      location.components.forEach(comp => {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        if (comp.types.includes('postal_code')) pincode = comp.long_name;
        if (comp.types.includes('sublocality')) addressLine2 = comp.long_name;
      });
    }

    // Update FormData with structured address object
    setFormData(prev => ({
      ...prev,
      address: {
        ...(typeof prev.address === 'object' ? prev.address : {}),
        fullAddress: location.address,
        addressLine1: houseNumber, // House/Flat No
        addressLine2: addressLine2, // Sublocality/Street
        city: city,
        state: state,
        pincode: pincode,
        lat: location.lat,
        lng: location.lng
      }
    }));
    setIsAddressModalOpen(false);
  };

  // Upload file helper
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    let baseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
    if (!baseUrl) throw new Error('VITE_API_BASE_URL is missing');
    baseUrl = baseUrl.replace(/\/api$/, '');
    const response = await fetch(`${baseUrl}/api/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return data.imageUrl;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAadharChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setAadharFile(file);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleBankChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...(prev.bankDetails || {}),
        [field]: value
      }
    }));
  };


  const openPhoneChangeModal = () => {
    setNewPhone(formData.phone || '');
    setPhoneOtp('');
    setPhoneOtpSent(false);
    setIsPhoneChangeOpen(true);
  };

  const closePhoneChangeModal = () => {
    if (!phoneChangeLoading) {
      setIsPhoneChangeOpen(false);
      setPhoneOtp('');
      setPhoneOtpSent(false);
    }
  };

  const handleSendPhoneChangeOtp = async () => {
    const cleanPhone = newPhone.replace(/\D/g, '');

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (cleanPhone === String(formData.phone || '').replace(/\D/g, '')) {
      toast.error('Please enter a new mobile number');
      return;
    }

    try {
      setPhoneChangeLoading(true);
      const response = await vendorAuthService.sendPhoneChangeOTP(cleanPhone);

      if (!response.success) {
        throw new Error(response.message || 'Unable to send OTP');
      }

      setNewPhone(cleanPhone);
      setPhoneOtpSent(true);
      toast.success('OTP sent to your new mobile number');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to send OTP');
    } finally {
      setPhoneChangeLoading(false);
    }
  };

  const handleVerifyPhoneChangeOtp = async () => {
    const cleanPhone = newPhone.replace(/\D/g, '');

    if (!/^\d{6}$/.test(phoneOtp)) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    try {
      setPhoneChangeLoading(true);
      const response = await vendorAuthService.verifyPhoneChangeOTP(cleanPhone, phoneOtp);

      if (!response.success) {
        throw new Error(response.message || 'Invalid OTP');
      }

      const updatedPhone = response.vendor?.phone || cleanPhone;
      setFormData((prev) => ({ ...prev, phone: updatedPhone }));

      ['vendorData', 'vendorProfile'].forEach((storageKey) => {
        try {
          const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
          localStorage.setItem(storageKey, JSON.stringify({ ...stored, phone: updatedPhone }));
        } catch (storageError) {
          console.warn('Unable to update stored vendor phone:', storageError);
        }
      });

      setIsPhoneChangeOpen(false);
      setPhoneOtp('');
      setPhoneOtpSent(false);
      toast.success('Mobile number updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to verify OTP');
    } finally {
      setPhoneChangeLoading(false);
    }
  };
  const handleSubmit = async () => {
    // Zod Validation
    const validationResult = vendorProfileSchema.safeParse({
      name: String(formData.name || '').trim(),
      businessName: String(formData.businessName || '').trim(),
      phone: String(formData.phone || '').trim(),
      email: String(formData.email || '').trim(),
      address: formData.address,
    });

    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error);
      const issues = validationResult.error?.issues || validationResult.error?.errors || [];
      const fieldErrors = issues.reduce((result, issue) => {
        const field = issue.path?.[0];
        if (field && !result[field]) result[field] = issue.message;
        return result;
      }, {});
      setErrors(fieldErrors);
      toast.error(issues[0]?.message || 'Please check the entered details');
      return;
    }

    setErrors({});
    try {
      setUploading(true);
      let photoUrl = formData.profilePhoto;
      let aadharUrl = formData.aadharDocument;

      // Upload new photo if selected
      if (photoFile) {
        try {
          photoUrl = await uploadFile(photoFile);
        } catch (err) {
          console.error('Photo upload failed:', err);
          alert('Failed to upload profile photo');
          setUploading(false);
          return;
        }
      }

      // Upload Aadhar if selected
      if (aadharFile) {
        try {
          aadharUrl = await uploadFile(aadharFile);
        } catch (err) {
          console.error('Aadhar upload failed:', err);
          alert('Failed to upload Aadhar document');
          setUploading(false);
          return;
        }
      }

      // Prepare payload to match backend structure
      const payload = {
        name: validationResult.data.name,
        businessName: validationResult.data.businessName,
        address: formData.address,
        profilePhoto: photoUrl,
        // Only send Aadhar when a new file was selected; existing documents must not be revalidated on every profile save.
        aadharDocument: aadharFile ? aadharUrl : undefined,
        serviceRange: formData.serviceRange,
        bankDetails: formData.bankDetails
      };

      try {
        const response = await vendorAuthService.updateProfile(payload);
        if (response.success) {
          const updatedProfile = { ...response.vendor, skills: formData.skills, bankDetails: formData.bankDetails };

          // Update Local Storage
          localStorage.setItem('vendorProfile', JSON.stringify(updatedProfile));
          localStorage.setItem('vendorData', JSON.stringify(updatedProfile));

          // Dispatch events
          window.dispatchEvent(new Event('vendorProfileUpdated'));
          window.dispatchEvent(new Event('vendorDataUpdated'));

          toast.success('Profile & Bank details updated successfully!');
          navigate('/vendor/profile');
        } else {
          throw new Error(response.message || 'Failed to update profile');
        }
      } catch (apiError) {
        console.error('API update failed:', apiError);
        const serverErrors = apiError.response?.data?.errors;
        const errorDetails = Array.isArray(serverErrors)
          ? serverErrors.map((item) => item.message || item.msg || (item.field || 'Profile') + ' is invalid').join(', ')
          : '';
        const errorMessage = [
          apiError.response?.data?.message,
          errorDetails
        ].filter(Boolean).join(': ') || apiError.message || 'Failed to save profile on server.';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Edit Profile" />

      <main className="px-4 py-6">
        <div className="space-y-6">
          {/* Profile Photo - Integrated */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative group">
              <div
                className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl cursor-pointer"
                style={{ background: '#f0f0f0' }}
                onClick={() => handleImageClick('photo')}
              >
                {photoPreview || formData.profilePhoto ? (
                  <img
                    src={photoPreview || formData.profilePhoto}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <FiUser className="w-12 h-12" />
                  </div>
                )}
              </div>

              <div
                onClick={() => handleImageClick('photo')}
                className="absolute bottom-1 right-1 p-2 rounded-full cursor-pointer shadow-lg transition-transform active:scale-95 hover:scale-105"
                style={{ background: themeColors.button }}
              >
                <FiCamera className="w-5 h-5 text-white" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3 font-medium">Tap icon to change photo</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.icon}25 0%, ${themeColors.icon}15 100%)`,
                }}
              >
                <FiUser className="w-4 h-4" style={{ color: themeColors.icon }} />
              </div>
              <span>Name <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your name"
              className={`w-full px-4 py-3 bg-white rounded-xl border focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500' : 'border-gray-200'
                }`}
              style={{ focusRingColor: themeColors.button }}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.icon}25 0%, ${themeColors.icon}15 100%)`,
                }}
              >
                <FiBriefcase className="w-4 h-4" style={{ color: themeColors.icon }} />
              </div>
              <span>Business Name</span>
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              placeholder="Enter business name"
              className={`w-full px-4 py-3 bg-white rounded-xl border focus:outline-none focus:ring-2 ${errors.businessName ? 'border-red-500' : 'border-gray-200'
                }`}
              style={{ focusRingColor: themeColors.button }}
            />
            {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.icon}25 0%, ${themeColors.icon}15 100%)`,
                }}
              >
                <FiPhone className="w-4 h-4" style={{ color: themeColors.icon }} />
              </div>
              <span>Phone Number <span className="text-red-500">*</span></span>
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={formData.phone}
                readOnly
                placeholder="Enter phone number"
                className="min-w-0 flex-1 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 text-gray-600 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={openPhoneChangeModal}
                className="shrink-0 px-4 py-3 rounded-xl font-semibold text-white whitespace-nowrap"
                style={{ background: themeColors.button }}
              >
                Change
              </button>
            </div>
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.icon}25 0%, ${themeColors.icon}15 100%)`,
                }}
              >
                <FiMail className="w-4 h-4" style={{ color: themeColors.icon }} />
              </div>
              <span>Email</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              className={`w-full px-4 py-3 bg-white rounded-xl border focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500' : 'border-gray-200'
                }`}
              style={{ focusRingColor: themeColors.button }}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.icon}25 0%, ${themeColors.icon}15 100%)`,
                }}
              >
                <FiMapPin className="w-4 h-4" style={{ color: themeColors.icon }} />
              </div>
              <span>Address</span>
            </label>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-2">
              <p className="text-sm font-medium text-gray-700">
                {formData.address?.fullAddress ||
                  (typeof formData.address === 'string' ? formData.address : '') ||
                  `${formData.address?.addressLine1 || ''} ${formData.address?.city || ''}`
                }
              </p>
              {!formData.address || (typeof formData.address === 'object' && !formData.address.fullAddress && !formData.address.addressLine1) ? (
                <p className="text-xs text-gray-400 italic mt-1">No address set</p>
              ) : null}
            </div>

            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              style={{
                backgroundColor: hexToRgba(themeColors.button, 0.1),
                color: themeColors.button,
                border: `1.5px solid ${hexToRgba(themeColors.button, 0.25)}`,
              }}
            >
              <FiMapPin className="w-4 h-4" />
              Build/Change Location on Map
            </button>

            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>



          {/* Service Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.icon}25 0%, ${themeColors.icon}15 100%)`,
                }}
              >
                <FiMapPin className="w-4 h-4" style={{ color: themeColors.icon }} />
              </div>
              <span>Service Range (Km) <span className="text-red-500">*</span></span>
            </label>
            <input
              type="number"
              value={formData.serviceRange}
              onChange={(e) => handleInputChange('serviceRange', e.target.value)}
              placeholder="e.g. 10"
              min="1"
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
              style={{ focusRingColor: themeColors.button }}
            />
            <p className="text-[10px] text-gray-400 mt-1">Distance from your location where you can provide services</p>
          </div>

          {/* Aadhar Document Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.icon}25 0%, ${themeColors.icon}15 100%)`,
                }}
              >
                <FiUpload className="w-4 h-4" style={{ color: themeColors.icon }} />
              </div>
              <span>Identity Proof (Aadhar) <span className="text-red-500">*</span></span>
            </label>

            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center transition-colors hover:border-blue-300 bg-gray-50 cursor-pointer"
              onClick={() => handleImageClick('aadhar')}
            >
              <input
                id="aadhar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAadharChange}
              />
              <div className="cursor-pointer flex flex-col items-center">
                {aadharFile ? (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <FiUpload className="w-5 h-5" />
                    <span className="truncate max-w-[200px]">{aadharFile.name}</span>
                  </div>
                ) : formData.aadharDocument ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-200 mb-2 relative group-hover:opacity-75 transition-opacity">
                      <img
                        src={formData.aadharDocument}
                        alt="Aadhar Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-green-600 font-medium text-sm">Document Uploaded</p>
                      <span className="text-xs text-blue-500 underline mt-1">Click to replace</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 font-medium">Click to upload Aadhar Card</span>
                    <span className="text-xs text-gray-400 mt-1">First Page Only (Max 5MB)</span>
                  </>
                )}
              </div>
            </div>
            {errors.aadharDocument && <p className="text-red-500 text-sm mt-1">{errors.aadharDocument}</p>}
          </div>

          {/* Dedicated Link to Payout & Bank Details */}
          <div
            onClick={() => navigate('/vendor/profile/payout')}
            className="p-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-xs cursor-pointer hover:shadow-sm transition-all active:scale-[0.99] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FiCreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 leading-tight">Payout & Bank Details (QR / UPI)</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Manage UPI ID, Bank Account & QR Scanner</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
              Manage →
            </span>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => navigate('/vendor/profile')}
            className="flex-1 py-4 rounded-xl font-semibold text-gray-700 bg-white border-2 border-gray-200 transition-all active:scale-95"
            style={{
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: themeColors.button,
              boxShadow: `0 4px 12px ${themeColors.button}40`,
            }}
          >
            {uploading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>

      <AddressSelectionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        address={(typeof formData.address === 'object' ? formData.address?.fullAddress : formData.address) || ''}
        houseNumber={(typeof formData.address === 'object' ? formData.address?.addressLine1 : '') || ''}
        onHouseNumberChange={(val) => {
          if (typeof formData.address === 'object') {
            setFormData(prev => ({
              ...prev,
              address: { ...prev.address, addressLine1: val }
            }));
          }
        }}
        onSave={handleAddressSave}
      />
      {isPhoneChangeOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: themeColors.primaryLight, color: themeColors.icon }}
                >
                  <FiShield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Change Mobile Number</h2>
                  <p className="text-xs text-gray-500">OTP verification required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePhoneChangeModal}
                disabled={phoneChangeLoading}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {!phoneOtpSent ? (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New mobile number
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
                />
                <button
                  type="button"
                  onClick={handleSendPhoneChangeOtp}
                  disabled={phoneChangeLoading}
                  className="w-full mt-4 py-3 rounded-xl font-bold text-white disabled:opacity-60"
                  style={{ background: themeColors.button }}
                >
                  {phoneChangeLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Enter the 6-digit OTP sent to <strong>{newPhone}</strong>.
                </p>
                <input
                  type="tel"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-[0.35em] text-lg focus:outline-none focus:ring-2"
                />
                <button
                  type="button"
                  onClick={handleVerifyPhoneChangeOtp}
                  disabled={phoneChangeLoading}
                  className="w-full mt-4 py-3 rounded-xl font-bold text-white disabled:opacity-60"
                  style={{ background: themeColors.button }}
                >
                  {phoneChangeLoading ? 'Verifying...' : 'Verify & Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneOtpSent(false);
                    setPhoneOtp('');
                  }}
                  disabled={phoneChangeLoading}
                  className="w-full mt-2 py-2 text-sm font-semibold"
                  style={{ color: themeColors.button }}
                >
                  Change number / Resend OTP
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfile;


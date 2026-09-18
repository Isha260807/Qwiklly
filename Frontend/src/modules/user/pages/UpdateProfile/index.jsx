import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiCamera, FiImage, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import { userAuthService } from '../../../../services/authService';
import flutterBridge from '../../../../utils/flutterBridge';

import { z } from "zod";

// Zod schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address").refine(val => val.includes('@'), "Invalid email address"),
});

const UpdateProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    profilePhoto: '', // URL
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFlutter, setIsFlutter] = useState(flutterBridge.isFlutter);
  const [showSourceSheet, setShowSourceSheet] = useState(false);

  // Sync flutter bridge state
  useEffect(() => {
    flutterBridge.waitForFlutter().then(ready => {
      setIsFlutter(ready);
    });
  }, []);

  const handleNativeCamera = async () => {
    try {
      const file = await flutterBridge.openCamera();
      if (file) {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        flutterBridge.hapticFeedback('success');
      }
    } catch (error) {
      console.error('Native camera failed:', error);
    }
  };

  const handleImageClick = () => {
    setShowSourceSheet(true);
  };

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // First check localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            profilePhoto: userData.profilePhoto || '',
          });
        }

        // Fetch fresh data from API
        const response = await userAuthService.getProfile();
        if (response.success && response.user) {
          const user = response.user;
          setFormData({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            profilePhoto: user.profilePhoto || '',
          });

          // Update localStorage with fresh data including photo
          if (storedUserData) {
            const updatedLocal = { ...JSON.parse(storedUserData), ...user };
            localStorage.setItem('userData', JSON.stringify(updatedLocal));
          }
        }
      } catch (error) {
        // Use localStorage data if API fails
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            profilePhoto: userData.profilePhoto || '',
          });
        } else {
          toast.error('Failed to load profile data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Upload file helper
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    if (!baseUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = 'http://localhost:5000';
      } else {
        baseUrl = window.location.origin;
      }
    }
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
        toast.error('File size should be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    if (phone.startsWith('+91')) return phone;
    if (phone.length === 10) return `+91 ${phone}`;
    return phone;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    // Zod Validation
    const validationResult = profileSchema.safeParse({
      name: formData.name.trim(),
      email: formData.email.trim()
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setIsSaving(true);
    setUploading(true);
    try {
      let photoUrl = formData.profilePhoto;

      // Upload photo if selected
      if (photoFile) {
        try {
          photoUrl = await uploadFile(photoFile);
        } catch (err) {
          console.error('Photo upload failed:', err);
          toast.error('Failed to upload profile photo');
          setIsSaving(false);
          setUploading(false);
          return;
        }
      }

      const response = await userAuthService.updateProfile({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        profilePhoto: photoUrl
      });

      if (response.success) {
        toast.success('Profile updated successfully!');
        // authService.updateProfile already updates localStorage with response.user
        // but let's ensure we have the latest data
        if (response.user) {
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            const existingData = JSON.parse(storedUserData);
            const updatedData = { ...existingData, ...response.user };
            localStorage.setItem('userData', JSON.stringify(updatedData));
          } else {
            localStorage.setItem('userData', JSON.stringify(response.user));
          }
        }
        navigate('/user/account');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
      setUploading(false);
    }
  };

  const handleBack = () => {
    navigate('/user/account');
  };

  return (
    <div className="min-h-screen bg-transparent pb-16">
      {/* Theme Gradient Header */}
      <header 
        className="sticky top-0 z-30 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
      >
        <div className="flex items-center gap-2.5 max-w-lg mx-auto w-full">
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
            title="Go Back"
          >
            <FiArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-base font-bold text-white tracking-tight">Edit Profile</h1>
        </div>
      </header>

      <main className="px-3.5 py-3 max-w-lg mx-auto">
        {/* Profile Form */}
        <div className="space-y-3">
          {/* Profile Photo */}
          <div className="flex flex-col items-center justify-center my-1">
            <div className="relative group">
              <div
                className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer bg-gray-100 flex items-center justify-center"
                onClick={handleImageClick}
              >
                {photoPreview || formData.profilePhoto ? (
                  <img
                    src={photoPreview || formData.profilePhoto}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <FiUser className="w-9 h-9" />
                  </div>
                )}
              </div>

              <div
                onClick={handleImageClick}
                className="absolute bottom-0 right-0 p-1.5 rounded-full cursor-pointer shadow-md transition-transform active:scale-90 hover:scale-105"
                style={{ background: themeColors.button }}
              >
                <FiCamera className="w-3.5 h-3.5 text-white" />
                <input
                  id="user-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <p className="text-gray-400 text-[10px] mt-1.5 font-bold uppercase tracking-wider">Tap to change photo</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative flex items-center">
              <span
                className="absolute left-3 flex items-center justify-center pointer-events-none"
                style={{ color: themeColors.button }}
              >
                <FiUser className="w-4 h-4" />
              </span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-medium text-gray-900 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#720C3E] focus:border-[#720C3E] transition-all placeholder:text-gray-400 bg-white"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span
                className="absolute left-3 flex items-center justify-center pointer-events-none"
                style={{ color: themeColors.button }}
              >
                <FiMail className="w-4 h-4" />
              </span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-medium text-gray-900 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#720C3E] focus:border-[#720C3E] transition-all placeholder:text-gray-400 bg-white"
                placeholder="Enter your email address"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative flex items-center">
              <span
                className="absolute left-3 flex items-center justify-center pointer-events-none"
                style={{ color: themeColors.button }}
              >
                <FiPhone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                name="phone"
                value={formatPhoneNumber(formData.phone)}
                disabled
                className="w-full pl-9 pr-3 py-2.5 text-xs font-medium text-gray-600 rounded-xl border border-gray-200 bg-gray-50 cursor-not-allowed"
                placeholder="Phone number cannot be changed"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 ml-1 leading-tight">
              Phone number cannot be changed for security reasons
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="w-full text-white font-bold py-2.5 px-4 text-xs uppercase tracking-wider rounded-xl active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${themeColors.button} 0%, #9A2459 100%)`,
              boxShadow: '0 3px 10px rgba(114, 12, 62, 0.25)',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>

      {/* Photo Source Selection - Mobile Styled Bottom Sheet */}
      <AnimatePresence>
        {showSourceSheet && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSourceSheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-lg rounded-t-2xl p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900 text-sm">Select Photo Source</h4>
                <button 
                  onClick={() => setShowSourceSheet(false)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Camera Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceSheet(false);
                    if (isFlutter) {
                      handleNativeCamera();
                    } else {
                      document.getElementById('user-photo-upload')?.click();
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-pink-100 active:scale-95 transition-all"
                  style={{ backgroundColor: `${themeColors.button}0A` }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: themeColors.button }}
                  >
                    <FiCamera className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs" style={{ color: themeColors.button }}>Take Photo</span>
                </button>

                {/* Gallery Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceSheet(false);
                    document.getElementById('user-photo-upload')?.click();
                  }}
                  className="flex flex-col items-center gap-2 p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white shadow-sm">
                    <FiImage className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-800 text-xs">Gallery</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpdateProfile;


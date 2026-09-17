import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiMail, FiPhone, FiMessageCircle, FiShield, FiChevronRight, FiLogOut, FiTrash2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import { userAuthService } from '../../../../services/authService';
import { registerFCMToken, removeFCMToken } from '../../../../services/pushNotificationService';
import BottomNav from '../../components/layout/BottomNav';

const Settings = () => {
  const navigate = useNavigate();

  // State for notification toggles
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
  });

  // Load user settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await userAuthService.getProfile();
      if (response.success && response.user?.settings) {
        setNotifications(prev => ({
          ...prev,
          push: response.user.settings.notifications ?? true
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleToggle = async (key) => {
    // Optimistic update
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));

    // Handle Push Toggle specifically
    if (key === 'push') {
      const newState = !notifications.push;
      const toastId = toast.loading(newState ? 'Enabling notifications...' : 'Disabling notifications...');

      try {
        if (newState) {
          // Enable
          const token = await registerFCMToken('user', true);
          if (!token) {
            toast.error('Failed to enable. Check permissions.', { id: toastId });
            // Revert state
            setNotifications(prev => ({ ...prev, push: false }));
            return;
          }
        } else {
          // Disable
          await removeFCMToken('user');
        }

        // Persist preference to backend
        await userAuthService.updateProfile({
          settings: { notifications: newState }
        });

        toast.success(newState ? 'Notifications enabled' : 'Notifications disabled', { id: toastId });

      } catch (error) {
        console.error('Error updating notification settings:', error);
        toast.error('Failed to update settings', { id: toastId });
        // Revert
        setNotifications(prev => ({ ...prev, push: !newState }));
      }
    }
  };

  const handlePrivacyClick = () => {
    // Navigate to privacy page (can be implemented later)
    // navigate('/privacy');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="px-3.5 py-2.5 flex items-center gap-2.5 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <FiArrowLeft className="w-4 h-4 text-gray-800" />
          </button>
          <h1 className="text-sm font-bold text-gray-900 tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="px-3.5 py-3 max-w-lg mx-auto">
        {/* Order Related Messages Notice */}
        <div className="mb-3.5 p-2.5 bg-pink-50/50 rounded-xl border border-pink-100/60 flex items-start gap-2">
          <FiMessageCircle className="w-3.5 h-3.5 text-[#720C3E] shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-gray-600">
            <span className="font-bold text-gray-800">Order messages: </span>
            Cannot be turned off as they are required for active booking updates and service experience.
          </div>
        </div>

        {/* Notifications & Reminders Section */}
        <div className="mb-3.5">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Notifications & Reminders</h2>

          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-pink-50 text-[#720C3E]">
                  <FiBell className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-gray-800">Push Notifications</span>
              </div>
              <button
                onClick={() => handleToggle('push')}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                  notifications.push ? 'bg-[#720C3E]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                    notifications.push ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-pink-50 text-[#720C3E]">
                  <FiMail className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-gray-800">Email</span>
              </div>
              <button
                onClick={() => handleToggle('email')}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                  notifications.email ? 'bg-[#720C3E]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                    notifications.email ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Data Section */}
        <div className="mb-3.5">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Privacy</h2>
          <button
            onClick={handlePrivacyClick}
            className="w-full bg-white rounded-xl border border-gray-100 p-2.5 flex items-center justify-between shadow-2xs hover:bg-gray-50 active:scale-[0.99] transition-all text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-pink-50 text-[#720C3E]">
                <FiShield className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-gray-800">Privacy & Data</span>
            </div>
            <FiChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Account Actions Section */}
        <div className="mb-3.5">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Account Actions</h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
            <button
              onClick={async () => {
                const confirmed = window.confirm('Are you sure you want to log out?');
                if (confirmed) {
                  await userAuthService.logout();
                  navigate('/user/login');
                  toast.success('Logged out successfully');
                }
              }}
              className="w-full p-2.5 flex items-center gap-2.5 hover:bg-rose-50/50 active:scale-[0.99] transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600">
                <FiLogOut className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-rose-600">Log Out</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action is irreversible.')) {
                  toast.loading('Processing deletion...');
                  setTimeout(() => {
                    toast.dismiss();
                    toast.error('Please contact support to delete account for security reasons.');
                  }, 1000);
                }
              }}
              className="w-full p-2.5 flex items-center gap-2.5 hover:bg-gray-50 active:scale-[0.99] transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500">
                <FiTrash2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-gray-700 block">Delete Account</span>
                <span className="text-[10px] text-gray-400">Permanently remove your data</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;

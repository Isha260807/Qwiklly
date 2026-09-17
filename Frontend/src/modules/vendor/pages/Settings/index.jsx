import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGlobe, FiLogOut, FiTrash2, FiMapPin, FiShield, FiInfo } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import { vendorAuthService } from '../../../../services/authService';
import Header from '../../components/layout/Header';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    language: 'en',
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
    const loadSettings = () => {
      try {
        const savedSettings = JSON.parse(localStorage.getItem('vendorSettings') || '{}');
        if (Object.keys(savedSettings).length > 0) {
          setSettings(prev => ({ ...prev, ...savedSettings }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleLanguageChange = (lang) => {
    const updated = { ...settings, language: lang };
    setSettings(updated);
    localStorage.setItem('vendorSettings', JSON.stringify(updated));
    toast.success(`Language set to ${lang === 'en' ? 'English' : 'हिंदी'}`);
  };

  const handleLogout = async () => {
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
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      localStorage.removeItem('vendorProfile');
      localStorage.removeItem('vendorSettings');
      localStorage.removeItem('vendorWorkers');
      localStorage.removeItem('vendorAcceptedBookings');
      localStorage.removeItem('vendorWallet');
      localStorage.removeItem('vendorTransactions');
      localStorage.removeItem('vendorAccessToken');
      localStorage.removeItem('vendorData');
      toast.success('Account data cleared');
      navigate('/vendor/login');
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Settings" />

      <main className="px-4 py-6 space-y-4">
        {/* Address Management */}
        <div
          className="bg-white rounded-2xl p-4 shadow-xs border border-[#E8D9DF]/60 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
          onClick={() => navigate('/vendor/address-management')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FCEBF3] text-[#720C3E]">
                <FiMapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-[#24151D] text-sm">Manage Address</p>
                <p className="text-xs text-[#6F5A64]">Set your service & business location</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E8D9DF]/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-[#FCEBF3] text-[#720C3E]">
              <FiGlobe className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#24151D] text-sm">Language</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { code: 'en', name: 'English' },
              { code: 'hi', name: 'हिंदी' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`py-2.5 px-4 rounded-xl text-center font-semibold text-sm transition-all duration-200 cursor-pointer ${
                  settings.language === lang.code
                    ? 'bg-[#720C3E] text-white shadow-sm'
                    : 'bg-gray-50 text-[#6F5A64] hover:bg-gray-100 border border-gray-100'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E8D9DF]/60 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <FiLogOut className="w-5 h-5" />
              <span className="font-semibold text-sm">Log Out</span>
            </div>
            <svg className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer text-xs"
          >
            <div className="flex items-center gap-3">
              <FiTrash2 className="w-4 h-4" />
              <span>Delete Account Data</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Settings;

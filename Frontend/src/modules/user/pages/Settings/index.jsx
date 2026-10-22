import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMessageCircle, FiShield, FiChevronRight, FiLogOut, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { userAuthService } from '../../../../services/authService';

const Settings = () => {
  const navigate = useNavigate();

  const handlePrivacyClick = () => {
    navigate('/login/privacy');
  };

  return (
    <div className="min-h-screen bg-transparent pb-12">
      {/* Theme Gradient Header */}
      <header 
        className="sticky top-0 z-30 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
      >
        <div className="flex items-center gap-2.5 max-w-lg mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
            title="Go Back"
          >
            <FiArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-base font-bold text-white tracking-tight">Settings</h1>
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

        {/* Privacy & Data Section */}
        <div className="mb-3.5">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Privacy</h2>
          <button
            onClick={handlePrivacyClick}
            className="w-full bg-white rounded-xl border border-gray-100 p-2.5 flex items-center justify-between shadow-2xs hover:bg-[#FCEBF3]/60 active:scale-[0.99] transition-all text-left"
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
              className="w-full p-2.5 flex items-center gap-2.5 hover:bg-[#FCEBF3]/60 active:scale-[0.99] transition-all text-left"
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

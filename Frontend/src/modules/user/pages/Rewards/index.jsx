import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { FiCopy, FiArrowLeft, FiGift } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import NotificationBell from '../../components/common/NotificationBell';
import referralService from '../../../../services/referralService';

const Rewards = () => {
  const navigate = useNavigate();
  const [referral, setReferral] = useState(null);

  useEffect(() => {
    referralService.getSummary()
      .then(response => {
        if (response.success) setReferral(response.data);
      })
      .catch(() => toast.error('Failed to load referral details'));
  }, []);

  const shareUrl = referral?.referralCode
    ? `${window.location.origin}/user/login?ref=${encodeURIComponent(referral.referralCode)}`
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return toast.error('Referral link is not ready yet');
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copied to clipboard!');
    });
  };

  const handleShareWhatsApp = () => {
    if (!shareUrl) return toast.error('Referral link is not ready yet');
    const text = 'Check out this amazing electrical services app!';
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-transparent pb-12">
      {/* Theme Gradient Header */}
      <header 
        className="sticky top-0 z-50 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
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
          <div className="flex items-center gap-2">
            <FiGift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Refer & Earn</h1>
          </div>
        </div>
        <NotificationBell 
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
          iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2]"
          dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
        />
      </header>

      <main>
        {/* Main Referral Section */}
        <div className="bg-gray-50 relative overflow-hidden" style={{ background: 'transparent' }}>
          {/* Dotted Pattern Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_black_1px,_transparent_1px)] bg-[length:20px_20px]"></div>
          </div>

          <div className="relative px-4 py-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-black mb-2">
                  Refer & Earn
                </h2>
                <p className="text-[11px] font-semibold text-[#720C3E]">Referrer: INR {referral?.referrerRewardAmount ?? 0} | New user: INR {referral?.referredRewardAmount ?? 0}</p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Invite your friends to try our services. New users get INR {referral?.referredRewardAmount ?? 0}; you earn INR {referral?.referrerRewardAmount ?? 0} after their first completed booking.
                </p>
              </div>
              {/* Gift Box Illustration */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 bg-yellow-400 rounded-lg flex items-center justify-center transform rotate-12 shadow-lg">
                  <span className="text-3xl">🎁</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full"></div>
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-orange-300 rounded-full"></div>
              </div>
            </div>

            {/* Refer Via Section */}
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-700 mb-2">Refer via</p>
              <div className="flex gap-3">
                {/* WhatsApp */}
                <button
                  onClick={handleShareWhatsApp}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center">
                    <FaWhatsapp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-gray-700">Whatsapp</span>
                </button>


                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00A6A6' }}>
                    <FiCopy className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-gray-700">Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* How it works Section */}
        <div className="px-4 py-4 bg-white rounded-t-3xl shadow-sm border-t border-gray-100">
          <h3 className="text-base font-bold text-black mb-3">How it works?</h3>

          <div className="relative pl-7">
            {/* Vertical Line */}
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {/* Step 1 */}
            <div className="relative mb-4">
              <div className="absolute -left-7 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                1
              </div>
              <p className="text-xs text-gray-700">Invite your friends & get rewarded</p>
            </div>

            {/* Step 2 */}
            <div className="relative mb-4">
              <div className="absolute -left-7 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                2
              </div>
              <p className="text-xs text-gray-700">They get INR {referral?.referredRewardAmount ?? 0} after their first completed booking</p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-7 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                3
              </div>
              <p className="text-xs text-gray-700">You get INR {referral?.referrerRewardAmount ?? 0} after their first completed booking</p>
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2 text-[#00A6A6] text-xs">
            <span className="text-[#00A6A6]">•</span>
            <button className="hover:underline">Terms and conditions</button>
            <span className="text-[#00A6A6]">•</span>
            <button className="hover:underline">FAQs</button>
          </div>
        </div>

        {/* Scratch Cards Section - New Addition */}
        <div className="px-4 py-4 bg-white border-t border-gray-100">
          <h2 className="text-base font-bold text-gray-800 mb-1.5">
            You are yet to earn any scratch cards
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Start referring to get surprises
          </p>

          {/* Dotted Line Separator */}
          <div className="border-t border-dotted border-gray-300 my-3"></div>

          {/* Referral Offer */}
          <div className="flex items-center gap-2.5 mt-4">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🎁</span>
            </div>
            <p className="text-sm text-gray-800 font-medium">
              Earn INR {referral?.referrerRewardAmount ?? 0} on every successful referral
            </p>
          </div>
        </div>
      </main>


    </div>
  );
};

export default Rewards;

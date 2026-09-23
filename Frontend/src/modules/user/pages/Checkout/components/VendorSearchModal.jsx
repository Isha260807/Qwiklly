import React, { useEffect, useState } from 'react';
import { themeColors } from '../../../../../theme';

const VendorSearchModal = ({ isOpen, onClose, currentStep, acceptedVendor, onRetry }) => {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    if (isOpen && (currentStep === 'searching' || currentStep === 'waiting')) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '.' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[320px] sm:max-w-sm overflow-hidden transform transition-all relative">

        {/* Close/Minimize Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-1.5 bg-white/90 rounded-full shadow-xs text-gray-400 hover:text-gray-600 transition-colors hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {(currentStep === 'searching' || currentStep === 'waiting') && (
          <div className="flex flex-col items-center justify-center pt-6 pb-6 px-4 relative">

            {/* Map-like Background (Subtle) */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
            </div>

            {/* Central Radar Animation */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              {/* Outer Ripples */}
              <div className="absolute inset-0 rounded-full border-2 opacity-20 animate-ping"
                style={{ borderColor: themeColors.brand.teal, animationDuration: '3s' }}></div>
              <div className="absolute inset-3 rounded-full border opacity-40 animate-ping"
                style={{ borderColor: themeColors.brand.teal, animationDuration: '3s', animationDelay: '0.6s' }}></div>

              {/* Rotating Scanner Gradient */}
              <div className="absolute inset-0 rounded-full animate-spin-slow opacity-30"
                style={{
                  background: `conic-gradient(transparent 180deg, ${themeColors.brand.teal})`,
                  animationDuration: '4s'
                }}></div>

              {/* Center Core */}
              <div className="relative z-10 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${themeColors.brand.teal}15, ${themeColors.brand.teal}05)` }}>
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm animate-pulse"
                    style={{ backgroundColor: themeColors.brand.teal }}></div>
                  <div className="absolute w-full h-full animate-pulse opacity-30 rounded-full"
                    style={{ backgroundColor: themeColors.brand.teal }}></div>
                </div>
              </div>

              {/* Floating "Found" Dots Animation */}
              <div className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full animate-bounce opacity-50" style={{ backgroundColor: themeColors.brand.orange, animationDelay: '0.2s' }}></div>
              <div className="absolute bottom-5 left-5 w-1.5 h-1.5 rounded-full animate-bounce opacity-50" style={{ backgroundColor: themeColors.brand.yellow, animationDelay: '1.5s' }}></div>
            </div>

            {/* Status Text */}
            <div className="text-center relative z-20 px-2 mb-2">
              <h3 className="text-base font-bold text-gray-900 mb-0.5">Searching nearby {currentStep === 'waiting' ? 'professionals' : 'experts'}</h3>
              <p className="text-gray-500 text-xs font-medium leading-tight">
                Searching within 5km radius{dots}
              </p>
            </div>

            {/* Bottom Pill */}
            <div className="flex justify-center mt-2">
              <div className="px-3 py-1 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-medium text-gray-400">
                Process runs in background
              </div>
            </div>

          </div>
        )}

        {currentStep === 'accepted' && acceptedVendor && (
          <div className="flex flex-col items-center pt-6 pb-5 px-5 bg-white w-full">
            {/* Success Icon */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-md animate-bounce-short"
              style={{ background: `linear-gradient(135deg, ${themeColors.brand.teal}, ${themeColors.brand.secondary})` }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-0.5">Expert Found!</h3>
            <p className="text-gray-500 text-xs text-center mb-4">
              Request accepted by professional
            </p>

            {/* Vendor Card */}
            <div className="w-full bg-gray-50 rounded-xl p-3.5 border border-gray-100 mb-4 relative overflow-hidden shadow-xs">
              <div className="relative z-10">
                <h4 className="font-bold text-base text-gray-900 mb-1">{acceptedVendor.businessName}</h4>
                <div className="flex items-center gap-2.5 text-xs text-gray-500 mt-2">
                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-xs font-semibold text-xs">
                    <span className="text-yellow-500">★</span> {acceptedVendor.rating || '4.9'}
                  </span>
                  <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {acceptedVendor.distance || 'Nearby'}
                  </span>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10" style={{ backgroundColor: themeColors.brand.teal }}></div>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${themeColors.brand.teal}, ${themeColors.brand.secondary})`,
              }}
            >
              Continue to Details
            </button>
          </div>
        )}

        {currentStep === 'failed' && (
          <div className="flex flex-col items-center pt-6 pb-5 px-5 bg-white w-full">
            {/* Failed Icon */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-xs bg-red-50 border border-red-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-0.5">No Expert Found</h3>
            <p className="text-gray-500 text-xs text-center mb-4 leading-relaxed">
              We couldn't find any available professionals in your area right now.
            </p>

            <button
              onClick={onRetry}
              className="w-full text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 mb-2"
              style={{ background: themeColors.button }}
            >
              Search Again
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-400 py-2 rounded-xl font-medium text-xs hover:text-gray-600 transition-all"
            >
              Cancel Booking
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default VendorSearchModal;

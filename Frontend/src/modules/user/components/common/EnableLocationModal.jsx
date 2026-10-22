import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiCrosshair, FiX, FiAlertCircle } from 'react-icons/fi';
import LogoLoader from '../../../../components/common/LogoLoader';

const EnableLocationModal = ({
  isOpen,
  onClose,
  onRetry,
  onSelectManually,
  isLoading = false,
  errorType = null
}) => {
  if (!isOpen) return null;

  const isDenied = errorType === 'denied';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Centered modal */}
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 z-10 border border-[#E8D9DF] overflow-hidden"
        >
          
          

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>

          {/* Icon with animated radar beacon */}
          <div className="flex justify-center mb-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 bg-[#720C3E]/10 rounded-full animate-ping pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FFF7FA] to-[#FCEBF3] border-2 border-[#E8A0B8] flex items-center justify-center shadow-md relative z-10">
                <FiMapPin className="w-8 h-8 text-[#720C3E]" />
              </div>
            </div>
          </div>

          {/* Heading and text */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-black text-[#24151D] tracking-tight">
              {isDenied ? 'Location Permission Needed' : 'Turn on Device Location'}
            </h3>
            <p className="text-xs sm:text-sm text-[#6F5A64] font-medium mt-2 leading-relaxed px-2">
              {isDenied ? (
                <>
                  Location permission was blocked. Please tap <strong>Allow</strong> in your browser prompt or enable location permission in settings.
                </>
              ) : (
                <>
                  Your device location is currently turned off. Please enable device location to view available services and real-time pricing in your area.
                </>
              )}
            </p>

            {isDenied && (
              <div className="mt-3 mx-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-left">
                <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] font-semibold text-amber-800 leading-tight">
                  Tip: Look for the lock/tune icon near your browser address bar to allow location.
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              onClick={onRetry}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#720C3E] hover:bg-[#4D082A] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#720C3E]/20 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LogoLoader fullScreen={false} inline={true} size="w-4 h-4" />
                  <span>Detecting location...</span>
                </>
              ) : (
                <>
                  <FiCrosshair className="text-base text-[#E8A0B8]" />
                  <span>{isDenied ? 'Try Again' : 'Turn On Location'}</span>
                </>
              )}
            </button>

            <button
              onClick={onSelectManually}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-[#720C3E] bg-[#FFF7FA] hover:bg-[#F5E6ED] border border-[#E8D9DF] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FiMapPin className="w-4 h-4 text-[#720C3E]" />
              <span>Select City Manually</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EnableLocationModal;

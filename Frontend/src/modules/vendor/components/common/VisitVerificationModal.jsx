import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FiX, FiCheckCircle } from 'react-icons/fi';
import { verifySelfVisit } from '../../services/bookingService';
import flutterBridge from '../../../../utils/flutterBridge';
import LocationAccessModal from '../../../../components/common/LocationAccessModal';

/**
 * Reusable Visit Verification Modal
 * Used for OTP-based arrival verification by vendors/workers
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Callback to close modal
 * @param {string} bookingId - The booking ID to verify
 * @param {function} onSuccess - Callback on successful verification
 */
const VisitVerificationModal = ({ isOpen, onClose, bookingId, onSuccess }) => {
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userType, setUserType] = useState('vendor');

  // Detect user type
  React.useEffect(() => {
    const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
    const workerData = JSON.parse(localStorage.getItem('workerData') || '{}');
    if (workerData._id || workerData.id) setUserType('worker');
    else if (vendorData._id || vendorData.id) setUserType('vendor');
  }, []);

  // Auto-verify as last digit enters
  React.useEffect(() => {
    const otpValue = otpInput.join('');
    if (otpValue.length === 4 && !loading && isOpen) {
      handleVerify();
    }
  }, [otpInput]);

  const handleOtpChange = (index, value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (sanitized.length > 1) return;

    const newOtp = [...otpInput];
    newOtp[index] = sanitized;
    setOtpInput(newOtp);

    // Auto-focus next input
    if (sanitized && index < 3) {
      document.getElementById(`visit-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      document.getElementById(`visit-otp-${index - 1}`)?.focus();
    }
  };

  /**
   * Use robust Native Bridge with Browser Fallback
   */
  const getPosition = async () => {
    try {
      const location = await flutterBridge.getCurrentLocation();
      return location;
    } catch (error) {
      console.error("[VisitVerification] Location fetching failed:", error);
      throw error;
    }
  };

  const handleVerify = async () => {
    const otp = otpInput.join('');
    if (otp.length !== 4) {
      toast.error('Please enter 4-digit OTP');
      return;
    }

    setLoading(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is required for verification');
      setLoading(false);
      return;
    }

    try {
      const locationData = await getPosition();
      const location = {
        lat: locationData.latitude,
        lng: locationData.longitude
      };

      const response = await verifySelfVisit(bookingId, otp, location);

      if (response.success) {
        toast.success('Visit Verified Successfully!');
        setOtpInput(['', '', '', '']);
        onClose();
        onSuccess?.();
      } else {
        toast.error(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error("Verification Error:", error);

      // Handle geolocation errors
      if (error.code === 1) {
        toast.error('Location permission denied. Requesting access...');
        setShowLocationModal(true);
      } else if (error.code === 2) {
        toast.error('Location unavailable. Check your GPS settings.');
      } else if (error.code === 3) {
        toast.error('Location timeout. Please try again.');
      } else {
        // API error or other
        toast.error(error.response?.data?.message || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSuccess = async (coords) => {
    setShowLocationModal(false);
    const otp = otpInput.join('');
    if (otp.length !== 4) return;

    setLoading(true);
    try {
      const location = { lat: coords.latitude || coords.lat, lng: coords.longitude || coords.lng };
      const response = await verifySelfVisit(bookingId, otp, location);

      if (response.success) {
        toast.success('Visit Verified Successfully!');
        setOtpInput(['', '', '', '']);
        onClose();
        onSuccess?.();
      } else {
        toast.error(response.message || 'Verification failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOtpInput(['', '', '', '']);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white w-full max-w-[310px] xs:max-w-xs rounded-2xl p-4 sm:p-5 shadow-2xl relative z-10 mx-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  Verify Arrival
                </h3>
                <p className="text-[10px] text-[#720C3E] font-bold uppercase tracking-wider mt-0.5">
                  Check-in Verification
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 disabled:opacity-50 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Please enter the <span className="text-gray-900 font-bold">4-digit code</span> provided by customer to confirm your arrival.
              </p>
            </div>

            {/* OTP Inputs */}
            <div className="flex justify-center gap-2.5 mb-4">
              {otpInput.map((digit, idx) => (
                <input
                  key={idx}
                  id={`visit-otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={idx === 0}
                  disabled={loading}
                  className={`w-11 h-12 text-center text-lg font-bold rounded-xl transition-all outline-none border disabled:opacity-50
                    ${digit
                      ? 'border-[#720C3E] bg-[#FCEBF3]/60 text-[#720C3E]'
                      : 'border-gray-200 bg-gray-50 text-gray-800 focus:border-[#720C3E] focus:bg-white focus:ring-2 focus:ring-[#720C3E]/20'
                    }`}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                background: '#720C3E'
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Verify & Start Work</span>
                </>
              )}
            </button>
          </motion.div>

          <LocationAccessModal
            isOpen={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            onSuccess={handleLocationSuccess}
            userType={userType}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

export default VisitVerificationModal;

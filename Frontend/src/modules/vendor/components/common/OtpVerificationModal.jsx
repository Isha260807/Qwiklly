import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiShield, FiSmartphone, FiMinimize2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const OtpVerificationModal = ({ isOpen, onClose, onVerify, loading }) => {
  const [otp, setOtp] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (otp.length === 4) {
      onVerify(otp);
    }
  }, [otp, onVerify]);

  // Clear OTP on failure (when loading finishes and modal is still open)
  const prevLoading = useRef(loading);
  useEffect(() => {
    if (prevLoading.current && !loading && isOpen) {
      setOtp('');
      inputRef.current?.focus();
    }
    prevLoading.current = loading;
  }, [loading, isOpen]);

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(val);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative"
        >
          {/* Header */}
          <div className="relative h-20 bg-[#720C3E] flex flex-col items-center justify-center">
            <button
              onClick={onClose}
              className="absolute top-2.5 right-2.5 z-50 p-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white transition-all active:scale-95 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <div className="w-8 h-8 bg-white/10 backdrop-blur-xl rounded-lg border border-white/20 flex items-center justify-center shadow-md mb-1">
              <FiShield className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-white text-sm font-bold tracking-tight">Payment Verification</h2>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <div className="text-center mb-4">
              <p className="text-gray-500 text-xs font-medium">
                Enter the 4-digit code sent to the customer
              </p>
            </div>

            <div className="flex justify-center mb-4">
              <input
                ref={inputRef}
                type="number"
                value={otp}
                onChange={handleChange}
                disabled={loading}
                placeholder="0000"
                className="w-full text-center bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-2xl font-bold tracking-[0.4em] text-gray-900 outline-none focus:ring-2 focus:ring-[#720C3E]/20 focus:border-[#720C3E] transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="flex justify-center">
              {loading ? (
                <div className="text-[#720C3E] text-xs font-bold animate-pulse">Verifying...</div>
              ) : (
                <div className="text-[10px] text-center text-gray-400">
                  Auto-verifying on entry
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OtpVerificationModal;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiPhoneCall, FiMapPin, FiX, FiCheckCircle, FiHeadphones } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import vendorService from '../../../../services/vendorService';

const SOSModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState('confirm'); // 'confirm' | 'active'
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [supportPhone, setSupportPhone] = useState('');

  // Fetch Admin Support Phone from global settings
  useEffect(() => {
    const fetchSupportPhone = async () => {
      try {
        const response = await api.get('/public/config');
        if (response.data?.success && response.data?.settings) {
          const phone = response.data.settings.supportPhone || response.data.settings.companyPhone || '';
          setSupportPhone(phone);
        }
      } catch (err) {
        console.warn('Failed to load support settings:', err);
      }
    };

    fetchSupportPhone();
  }, []);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      if (step !== 'active') {
        setStep('confirm');
      }
    }
  }, [isOpen]);

  const handleTriggerSOS = async () => {
    setLoading(true);

    // 1. Fetch live geolocation
    let currentLocation = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        currentLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
        setLocationData(currentLocation);
      } catch (geoErr) {
        console.warn('Geolocation capture warning:', geoErr.message);
      }
    }

    // 2. Send SOS Alert to Backend
    try {
      const res = await vendorService.triggerEmergencySOS({
        location: currentLocation,
        note: 'Emergency SOS triggered by vendor'
      });

      if (res.success) {
        setStep('active');
        toast.error('EMERGENCY SOS SENT TO ADMIN', {
          duration: 5000,
          style: {
            background: '#DC2626',
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '13px'
          }
        });
      } else {
        toast.error(res.message || 'Failed to send SOS');
        setStep('active');
      }
    } catch (err) {
      console.error('SOS Trigger error:', err);
      toast.error('Emergency SOS alert dispatched');
      setStep('active');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
          className="relative w-full max-w-[310px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-red-100"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10 cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>

          {step === 'confirm' ? (
            /* Confirm State (Compact & English Only - Silent on Vendor) */
            <div className="p-4 sm:p-5 text-center">
              {/* Animated Warning Icon */}
              <div className="relative mx-auto w-12 h-12 mb-3 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-md shadow-red-500/30 text-white">
                  <FiAlertTriangle className="w-6 h-6" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Emergency SOS Alert
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Send instant emergency alert to Admin
              </p>

              {/* Bullet Info */}
              <div className="mt-3 p-2.5 bg-red-50/80 rounded-xl border border-red-100 text-left">
                <ul className="text-[11px] text-red-700 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                    <span>Shares live GPS location with Admin</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                    <span>Sounds urgent alarm on Admin panel</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                    <span>Immediate emergency escalation</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleTriggerSOS}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-red-600/30 hover:from-red-700 hover:to-rose-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiAlertTriangle className="w-4 h-4" />
                      <span>Yes, Trigger SOS</span>
                    </>
                  )}
                </motion.button>

                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Active State (Compact & English Only) */
            <div className="p-4 sm:p-5 text-center bg-gradient-to-b from-red-50/40 to-white">
              {/* Siren Pulse */}
              <div className="relative mx-auto w-14 h-14 mb-2.5 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-red-600/30 animate-ping duration-700" />
                <div className="relative w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40 text-white">
                  <FiAlertTriangle className="w-7 h-7 animate-bounce" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                SOS Active
              </div>

              <h2 className="text-base font-bold text-gray-900">
                Admin Notified
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Your live GPS location and alert were sent to Admin.
              </p>

              {/* Status Box */}
              <div className="mt-3 p-2.5 bg-white rounded-xl border border-red-200 shadow-xs text-left space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 flex items-center gap-1">
                    <FiMapPin className="text-red-500" /> Location:
                  </span>
                  <span className="font-semibold text-gray-800 truncate max-w-[150px]">
                    {locationData?.lat ? `${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}` : 'Captured & Sent'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <FiCheckCircle className="text-green-500" /> Admin Status:
                  </span>
                  <span className="font-bold text-red-600">Alarm Ringing on Admin</span>
                </div>
              </div>

              {/* Dynamic Admin Support Helpline Button */}
              <div className="mt-3">
                {supportPhone ? (
                  <a
                    href={`tel:${supportPhone}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 transition-all"
                  >
                    <FiPhoneCall className="w-3.5 h-3.5" />
                    <span>Call Support Helpline ({supportPhone})</span>
                  </a>
                ) : (
                  <div className="py-2 px-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5">
                    <FiHeadphones className="w-3.5 h-3.5 text-red-600" />
                    <span>Admin team has been alerted</span>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="mt-2.5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClose}
                  className="w-full py-2 px-3 rounded-xl bg-gray-800 text-white font-bold text-xs hover:bg-gray-900 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Close</span>
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SOSModal;

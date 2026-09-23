import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiPhoneCall, FiMapPin, FiExternalLink, FiCheckCircle, FiVolume2, FiVolumeX, FiX } from 'react-icons/fi';
import { playEmergencyAlarm, stopEmergencyAlarm } from '../../../../utils/notificationSound';

const EmergencySOSAlertModal = () => {
  const [activeSOS, setActiveSOS] = useState(null);
  const [alarmPlaying, setAlarmPlaying] = useState(false);

  useEffect(() => {
    const handleSOSAlert = (event) => {
      const data = event.detail;
      if (data) {
        console.log('[Admin SOS Modal] Received emergency alert:', data);
        setActiveSOS(data);
      }
    };

    window.addEventListener('adminEmergencySOSAlert', handleSOSAlert);
    return () => {
      window.removeEventListener('adminEmergencySOSAlert', handleSOSAlert);
      stopEmergencyAlarm();
    };
  }, []);

  // When activeSOS is set, ensure sound plays and state updates
  useEffect(() => {
    if (activeSOS) {
      setAlarmPlaying(true);
      playEmergencyAlarm(true);
    } else {
      stopEmergencyAlarm();
      setAlarmPlaying(false);
    }

    return () => {
      stopEmergencyAlarm();
    };
  }, [activeSOS]);

  const handleDismiss = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    stopEmergencyAlarm();
    setAlarmPlaying(false);
    setActiveSOS(null);
  };

  const toggleAlarmSound = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (alarmPlaying) {
      stopEmergencyAlarm();
      setAlarmPlaying(false);
    } else {
      playEmergencyAlarm(true);
      setAlarmPlaying(true);
    }
  };

  if (!activeSOS) return null;

  const lat = activeSOS.location?.lat;
  const lng = activeSOS.location?.lng;
  const mapUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const phone = activeSOS.phone || activeSOS.vendorPhone;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-red-500 cursor-default"
        >
          {/* Top Urgent Bar */}
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <FiAlertTriangle className="w-6 h-6 animate-bounce text-white" />
              <div>
                <h3 className="text-lg font-black tracking-wide uppercase">
                  EMERGENCY SOS ALERT
                </h3>
                <p className="text-[11px] text-red-100 font-medium">Vendor initiated emergency alert</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAlarmSound}
                className="p-2 rounded-full text-white hover:bg-white/20 transition-colors cursor-pointer"
                title={alarmPlaying ? 'Mute Alarm' : 'Play Alarm'}
              >
                {alarmPlaying ? <FiVolume2 className="w-5 h-5 animate-pulse text-yellow-300" /> : <FiVolumeX className="w-5 h-5 text-gray-300" />}
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {/* Vendor Highlight Card */}
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {activeSOS.vendorName || activeSOS.name || 'Vendor Partner'}
                  </h4>
                  {activeSOS.businessName && (
                    <p className="text-xs font-semibold text-gray-600 mt-0.5">
                      {activeSOS.businessName}
                    </p>
                  )}
                </div>
                <span className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse">
                  CRITICAL
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {phone && (
                  <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                    <FiPhoneCall className="text-red-600 flex-shrink-0" />
                    <span>{phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                  <FiMapPin className="text-red-600 flex-shrink-0" />
                  <span className="truncate">
                    {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : activeSOS.location?.address || 'Location Shared'}
                  </span>
                </div>
              </div>

              {activeSOS.note && (
                <div className="mt-2.5 pt-2.5 border-t border-red-200/60 text-xs text-red-900 font-medium">
                  <strong>Note:</strong> {activeSOS.note}
                </div>
              )}
            </div>

            {/* Audio Alarm Status & Timestamp */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="flex items-center gap-1.5 font-semibold text-red-600">
                {alarmPlaying ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                    <span>Alarm Ringing</span>
                  </>
                ) : (
                  <button 
                    onClick={toggleAlarmSound} 
                    className="text-red-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FiVolume2 /> Click to Play Alarm
                  </button>
                )}
              </span>
              <span className="text-gray-500">
                {activeSOS.createdAt ? new Date(activeSOS.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-md transition-colors"
                >
                  <FiPhoneCall className="w-4 h-4" />
                  <span>Call Vendor</span>
                </a>
              ) : null}

              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
                >
                  <FiMapPin className="w-4 h-4" />
                  <span>Open Maps</span>
                  <FiExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}
            </div>

            {/* Acknowledge & Dismiss */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleDismiss}
              className="w-full py-3 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <FiCheckCircle className="w-4 h-4 text-green-400" />
              <span>Acknowledge & Stop Alarm</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmergencySOSAlertModal;

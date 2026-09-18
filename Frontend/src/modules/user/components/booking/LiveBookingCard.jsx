import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiMapPin, FiTool, FiCheckCircle, FiChevronRight, FiNavigation, FiX } from 'react-icons/fi';
import userBookingService from '../../../../services/bookingService';
import { userTheme } from '../../../../theme';
import RatingModal from './RatingModal';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../../../context/SocketContext';

const LiveBookingCard = ({ hasBottomNav }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Status mapping for UI
  const getStatusInfo = (status) => {
    switch (status?.toUpperCase()) {
      case 'ASSIGNED':
        return { label: 'Partner Assigned', icon: FiCheckCircle, sub: 'Partner will start journey soon' };
      case 'STARTED':
      case 'JOURNEY_STARTED':
        return { label: 'Partner on the Way', icon: FiNavigation, sub: 'Track live location', pulse: true };
      case 'VISITED':
        return { label: 'Partner Reached', icon: FiMapPin, sub: 'At your location • Work Started' };
      case 'IN_PROGRESS':
        return { label: 'Work in Progress', icon: FiTool, sub: 'Service is underway' };
      case 'WORK_DONE':
        return { label: 'Work Completed', icon: FiCheckCircle, sub: 'Review & pay securely' };
      // New Finding Status
      case 'REQUESTED':
      case 'SEARCHING':
        return { label: 'Finding Partner', icon: FiClock, sub: 'Scanning nearby partners...', pulse: true };
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchActiveBooking();

    if (socket) {
      socket.on('booking_updated', fetchActiveBooking);
      socket.on('notification', fetchActiveBooking);
    }

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchActiveBooking, 30000);
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('booking_updated', fetchActiveBooking);
        socket.off('notification', fetchActiveBooking);
      }
    };
  }, [socket]);

  const fetchActiveBooking = async () => {
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      if (!token) {
        setActiveBooking(null);
        setLoading(false);
        return;
      }

      const res = await userBookingService.getUserBookings({ limit: 5 });
      if (res.success && res.data.length > 0) {
        // Find the first booking that is in an active state (checking both cases to be safe)
        const ongoing = res.data.find(b => {
          const s = b.status?.toUpperCase();
          // Hide LiveBookingCard if status is WORK_DONE and review is already done
          if (s === 'WORK_DONE' && b.rating) return false;

          return ['ASSIGNED', 'STARTED', 'JOURNEY_STARTED', 'VISITED', 'IN_PROGRESS', 'WORK_DONE', 'SEARCHING', 'REQUESTED'].includes(s);
        });
        setActiveBooking(ongoing || null);
      }
    } catch (error) {
      // Failed to fetch active booking
    } finally {
      setLoading(false);
    }
  };

  // Auto-show rating modal when work is marked done
  useEffect(() => {
    if (activeBooking && activeBooking.status?.toUpperCase() === 'WORK_DONE' && !activeBooking.rating && !showRatingModal) {
      const dismissed = localStorage.getItem(`rating_dismissed_live_${activeBooking._id}`);
      if (!dismissed) {
        setShowRatingModal(true);
      }
    }
  }, [activeBooking]);

  const handleRateSubmit = async (ratingData) => {
    try {
      const response = await userBookingService.addReview(activeBooking._id || activeBooking.id, ratingData);
      if (response.success) {
        toast.success('Thank you for your rating!', {
          icon: '🌟',
          style: { borderRadius: '15px', background: '#720C3E', color: '#fff' }
        });
        setShowRatingModal(false);
        fetchActiveBooking(); // Refresh to hide card or update state
      } else {
        toast.error(response.message || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  // Check dismissed state on activeBooking or route
  const bookingId = activeBooking?._id || activeBooking?.id;
  const isAlreadyDismissed = isDismissed || (bookingId && sessionStorage.getItem(`dismissed_live_booking_${bookingId}`) === 'true');

  // Don't show LiveBookingCard on My Bookings or Booking Details / Confirmation pages
  const isBookingPage = location.pathname.startsWith('/user/my-bookings') || 
                        location.pathname.startsWith('/user/booking/') || 
                        location.pathname.startsWith('/user/booking-confirmation');

  if (!activeBooking || isAlreadyDismissed || isBookingPage) return null;

  const statusInfo = getStatusInfo(activeBooking.status);
  if (!statusInfo) return null;

  const Icon = statusInfo.icon;

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (bookingId) {
      sessionStorage.setItem(`dismissed_live_booking_${bookingId}`, 'true');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="live-booking-card"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        onClick={() => {
          const status = activeBooking.status?.toUpperCase();
          // If worker is on the way, go to tracking map
          if (status === 'STARTED' || status === 'JOURNEY_STARTED') {
            navigate(`/user/booking/${activeBooking._id || activeBooking.id}/track`);
          } else if (status === 'SEARCHING' || status === 'REQUESTED') {
            navigate(`/user/booking-confirmation/${activeBooking._id || activeBooking.id}`);
          } else {
            navigate(`/user/booking/${activeBooking._id || activeBooking.id}`);
          }
        }}
        className={`fixed ${hasBottomNav ? 'bottom-[4.5rem] sm:bottom-20' : 'bottom-4'} left-3 right-3 sm:left-4 sm:right-4 max-w-md mx-auto z-50`}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_6px_25px_rgba(114,12,62,0.12)] border border-[#E8D9DF] p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform group">

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-1.5 right-1.5 p-1 bg-[#FFF7FA] hover:bg-[#FCEBF3] text-[#6F5A64] hover:text-[#720C3E] rounded-full z-20 pointer-events-auto transition-colors border border-[#E8D9DF]/40"
            title="Dismiss"
          >
            <FiX className="w-3 h-3" />
          </button>

          {/* Progress Bar Background */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-[#FCEBF3] w-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#720C3E] via-[#9A2459] to-[#E8A0B8]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Compact Icon Box */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#720C3E] to-[#9A2459] text-white flex items-center justify-center shrink-0 relative shadow-sm shadow-[#720C3E]/25">
            {statusInfo.pulse && (
              <div className="absolute inset-0 rounded-xl bg-[#720C3E] animate-ping opacity-40"></div>
            )}
            <Icon className="text-white w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0 pr-4 sm:pr-2">
            <h4 className="font-bold text-[#24151D] text-xs sm:text-sm truncate leading-tight">
              {statusInfo.label}
            </h4>
            <p className="text-[11px] text-[#6F5A64] truncate leading-tight mt-0.5">
              {statusInfo.sub} • <span className="text-[#24151D] font-medium">{activeBooking.serviceName}</span>
            </p>
          </div>

          {/* Action Arrow or Pay Button */}
          {activeBooking.status?.toUpperCase() === 'WORK_DONE' && !activeBooking.cashCollected ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/booking/${activeBooking._id || activeBooking.id}`);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] text-white text-[11px] font-bold rounded-lg shadow-sm shadow-[#720C3E]/25 active:scale-95 transition-all shrink-0 whitespace-nowrap uppercase tracking-wider"
            >
              Pay Now
            </button>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#FFF7FA] border border-[#E8D9DF]/60 flex items-center justify-center shrink-0 text-[#720C3E] group-hover:bg-[#FCEBF3] transition-colors">
              <FiChevronRight className="w-4 h-4 text-[#720C3E]" />
            </div>
          )}

        </div>
      </motion.div>

      {/* Global Rating Modal */}
      <RatingModal
        key="rating-modal"
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          if (activeBooking) {
            localStorage.setItem(`rating_dismissed_live_${activeBooking._id}`, 'true');
          }
        }}
        onSubmit={handleRateSubmit}
        bookingName={activeBooking.serviceName || 'Service'}
        workerName={activeBooking.workerId?.name || 'Worker'}
      />
    </AnimatePresence>
  );
};

export default LiveBookingCard;

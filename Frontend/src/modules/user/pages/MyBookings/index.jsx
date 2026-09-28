import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiChevronRight, FiCalendar, FiSearch, FiCheckCircle, FiShield } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import NotificationBell from '../../components/common/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingService } from '../../../../services/bookingService';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, confirmed, in-progress, completed, cancelled

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filter !== 'all') {
          params.status = filter;
        }
        const response = await bookingService.getUserBookings(params);
        if (isMounted) {
          if (response.success) {
            setBookings(response.data || []);
          } else {
            toast.error(response.message || 'Failed to load bookings');
            setBookings([]);
          }
        }
      } catch (error) {
        if (isMounted) {
          toast.error('Failed to load bookings. Please try again.');
          setBookings([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBookings();

    // Listen for real-time updates
    const handleUpdate = () => loadBookings();
    window.addEventListener('userBookingsUpdated', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('userBookingsUpdated', handleUpdate);
    };
  }, [filter]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'cancelled':
      case 'rejected':
      case 'declined':
        return {
          label: 'Cancelled',
          className: 'bg-rose-50 text-rose-600 border-rose-200/80',
          dot: 'bg-rose-500'
        };
      case 'completed':
      case 'work_done':
      case 'finished':
        return {
          label: 'Completed',
          className: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
          dot: 'bg-emerald-500'
        };
      case 'confirmed':
      case 'assigned':
        return {
          label: 'Confirmed',
          className: 'bg-blue-50 text-blue-600 border-blue-200/80',
          dot: 'bg-blue-500'
        };
      case 'in_progress':
      case 'in-progress':
      case 'work_started':
      case 'visited':
        return {
          label: 'In Progress',
          className: 'bg-purple-50 text-purple-600 border-purple-200/80',
          dot: 'bg-purple-500'
        };
      case 'journey_started':
      case 'worker_started':
      case 'on_the_way':
        return {
          label: 'On The Way',
          className: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
          dot: 'bg-indigo-500'
        };
      case 'awaiting_payment':
      case 'payment_pending':
        return {
          label: 'Payment Due',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500'
        };
      case 'pending_admin':
      case 'admin_review':
      case 'under_review':
        return {
          label: 'Admin Review',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500'
        };
      case 'requested':
      case 'searching':
        return {
          label: 'Searching',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500'
        };
      default: {
        const cleanedLabel = (status || 'Unknown')
          .replace(/[-_]/g, ' ')
          .toLowerCase()
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return {
          label: cleanedLabel,
          className: 'bg-gray-50 text-gray-700 border-gray-200',
          dot: 'bg-gray-400'
        };
      }
    }
  };

  const handleBookingClick = (booking) => {
    navigate(`/user/booking/${booking._id || booking.id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All Bookings' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen pb-28 lg:pb-16 relative bg-transparent">
      {/* Top Header - Responsive across Mobile, Tablet, Desktop */}
      <header 
        className="sticky top-0 z-40 text-white shadow-md select-none"
        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 md:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm shrink-0 cursor-pointer"
              title="Go Back"
              aria-label="Go Back"
            >
              <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>

            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div>
                <h1 className="text-base sm:text-lg md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>My Bookings</span>
                  {!loading && bookings.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-xs font-bold text-white border border-white/25">
                      {bookings.length}
                    </span>
                  )}
                </h1>
                <p className="hidden md:block text-xs text-white/80 font-medium">
                  Track, reschedule, and manage your booked home services
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell 
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
              iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2]"
              dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
            />
          </div>
        </div>
      </header>

      {/* Filter Tabs Bar - Responsive Horizontal Scroll on Mobile, Segmented on Tablet/Desktop */}
      <div className="bg-white/95 backdrop-blur-md sticky top-[48px] sm:top-[53px] md:top-[64px] z-30 border-b border-[#E8D9DF]/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2 sm:py-2.5">
          <div
            className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar scrollbar-hide scroll-smooth py-0.5 md:flex-wrap [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filterTabs.map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 sm:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all duration-200 border cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#720C3E] to-[#9A2459] text-white shadow-xs border-transparent scale-[1.02]'
                      : 'bg-white border-[#E8D9DF] text-[#6F5A64] hover:text-[#24151D] hover:bg-[#FFF7FA] active:scale-95'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area - Responsive Grid Layout (1 col Mobile, 2 col Tablet, 2-3 col Desktop) */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 md:py-6">
        {loading ? (
          /* Loading Skeletons Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-xs animate-pulse flex gap-3 sm:gap-4 items-center"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-2.5 w-20 bg-gray-200 rounded" />
                  <div className="h-3.5 w-36 sm:w-44 bg-gray-200 rounded" />
                  <div className="h-2.5 w-28 bg-gray-200 rounded" />
                </div>
                <div className="flex flex-col items-end justify-between h-14 sm:h-16 py-0.5 shrink-0 min-w-[65px]">
                  <div className="h-4 w-16 bg-gray-200 rounded-md" />
                  <div className="h-4 w-12 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 md:py-24 text-center px-4 max-w-md mx-auto"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FFF0F5] rounded-full flex items-center justify-center mb-4 border border-[#E8D9DF] shadow-xs text-[#720C3E]">
              <FiClock className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            <h3 className="text-[#24151D] text-base sm:text-lg md:text-xl font-extrabold mb-1">
              No Bookings Found
            </h3>
            <p className="text-[#6F5A64] text-xs sm:text-sm max-w-xs sm:max-w-sm leading-relaxed mb-6">
              {filter === 'all'
                ? "You haven't booked any services yet. Explore our verified home services to get started!"
                : `No ${filter.replace('-', ' ')} bookings found.`}
            </p>
            <button
              onClick={() => navigate('/user')}
              className="px-6 py-3 rounded-xl text-white font-bold text-xs sm:text-sm bg-gradient-to-r from-[#720C3E] to-[#9A2459] shadow-md shadow-[#720C3E]/20 hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FiSearch className="w-4 h-4" />
              Explore Services
            </button>
          </motion.div>
        ) : (
          /* Responsive Bookings Grid */
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.04 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
          >
            {bookings.map((booking) => {
              // Display ID (clean & compact)
              const fullId = booking.bookingNumber || (booking._id || booking.id || '').toString();
              const bId = fullId.length > 10 ? fullId.substring(0, 10).toUpperCase() : fullId.toUpperCase();

              const serviceImg =
                booking.serviceId?.iconUrl ||
                booking.serviceId?.images?.[0] ||
                booking.bookedItems?.[0]?.icon ||
                booking.bookedItems?.[0]?.card?.iconUrl ||
                booking.categoryIcon;

              // Format service title
              const formattedTitle = (
                booking.serviceName ||
                booking.serviceId?.title ||
                (booking.bookedItems && (booking.bookedItems[0]?.card?.title || booking.bookedItems[0]?.title)) ||
                'Service Request'
              ).trim();

              const dateStr = formatDate(booking.scheduledDate || booking.createdAt);
              const timeStr = booking.scheduledTime || booking.timeSlot?.time || booking.timeSlot?.start || 'ASAP';
              const statusBadge = getStatusBadge(booking.status);
              const price = Number(booking.finalAmount || booking.totalAmount || booking.servicePrice || 0);
              const isCompleted = (booking.status || '').toLowerCase() === 'completed' || (booking.status || '').toLowerCase() === 'work_done';

              return (
                <motion.div
                  key={booking._id || booking.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { type: 'spring', stiffness: 140, damping: 18 }
                    }
                  }}
                  onClick={() => handleBookingClick(booking)}
                  className="bg-white rounded-2xl p-3 sm:p-3.5 md:p-4 border border-[#E8D9DF]/60 shadow-[0_2px_8px_rgba(114,12,62,0.03)] hover:shadow-lg hover:border-[#720C3E]/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex gap-3 sm:gap-3.5 md:gap-4 items-center active:scale-[0.99] group"
                >
                  {/* Left: Square Image Thumbnail */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-xl md:rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {serviceImg ? (
                      <img
                        src={serviceImg}
                        alt={formattedTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-[#FFF0F5] to-[#FCEBF3] flex items-center justify-center text-lg md:text-xl">⚡</div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#FFF0F5] to-[#FCEBF3] flex items-center justify-center text-lg md:text-xl">
                        ⚡
                      </div>
                    )}
                  </div>

                  {/* Middle: Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 sm:gap-1">
                    {/* Booking ID */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#8A7A82] font-mono tracking-tight truncate">
                        #{bId}
                      </span>
                    </div>

                    {/* Service Title */}
                    <h2 className="text-xs sm:text-[13.5px] md:text-[15px] font-bold text-[#24151D] leading-tight line-clamp-1 capitalize group-hover:text-[#720C3E] transition-colors">
                      {formattedTitle}
                    </h2>

                    {/* Date & Time Slot */}
                    {isCompleted && booking.rating ? (
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-semibold text-amber-600 mt-0.5">
                        <span>⭐ {booking.rating}</span>
                        <span className="text-gray-400 font-normal text-[9px] sm:text-[10px] md:text-[11px]">(Rated)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs text-[#6F5A64] font-medium mt-0.5 truncate">
                        <FiCalendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#8A7A82] shrink-0" />
                        <span className="truncate">{dateStr}</span>
                        {timeStr && (
                          <>
                            <span className="text-[#8A7A82]/50 shrink-0">•</span>
                            <span className="shrink-0">{timeStr}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Status Pill & Price */}
                  <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5 min-w-[70px] sm:min-w-[80px] md:min-w-[90px]">
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-wider border whitespace-nowrap shadow-2xs ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>

                    {/* Price & Chevron */}
                    <div className="flex items-center gap-0.5 sm:gap-1 mt-auto pt-1">
                      <span className="text-xs sm:text-sm md:text-base font-black text-[#24151D]">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <FiChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-[#720C3E] transition-all shrink-0" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default MyBookings;

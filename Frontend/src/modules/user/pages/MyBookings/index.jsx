import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import NotificationBell from '../../components/common/NotificationBell';
import { motion } from 'framer-motion';
import { bookingService } from '../../../../services/bookingService';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, confirmed, in-progress, completed, cancelled

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filter !== 'all') {
          params.status = filter;
        }
        const response = await bookingService.getUserBookings(params);
        if (response.success) {
          setBookings(response.data || []);
        } else {
          toast.error(response.message || 'Failed to load bookings');
          setBookings([]);
        }
      } catch (error) {
        toast.error('Failed to load bookings. Please try again.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();

    // Listen for real-time updates
    window.addEventListener('userBookingsUpdated', loadBookings);

    return () => {
      window.removeEventListener('userBookingsUpdated', loadBookings);
    };
  }, [filter]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'cancelled':
      case 'rejected':
        return {
          label: 'CANCELLED',
          className: 'bg-[#FFF0F3] text-[#EF4444] border-[#FEE2E2]'
        };
      case 'completed':
      case 'work_done':
        return {
          label: 'COMPLETED',
          className: 'bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]'
        };
      case 'confirmed':
        return {
          label: 'CONFIRMED',
          className: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]'
        };
      case 'in_progress':
      case 'in-progress':
      case 'assigned':
      case 'journey_started':
      case 'visited':
        return {
          label: 'IN PROGRESS',
          className: 'bg-[#F5F3FF] text-[#7C3AED] border-[#EDE9FE]'
        };
      case 'awaiting_payment':
      case 'requested':
      case 'searching':
        return {
          label: 'PENDING',
          className: 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]'
        };
      default:
        return {
          label: (status || 'UNKNOWN').toUpperCase(),
          className: 'bg-gray-50 text-gray-600 border-gray-200'
        };
    }
  };

  const handleBookingClick = (booking) => {
    navigate(`/user/booking/${booking._id || booking.id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen pb-24 relative bg-transparent">
      {/* Background provided globally by UserRoutes */}

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Theme Gradient Header */}
        <header 
          className="sticky top-0 z-40 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
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
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">My Bookings</h1>
          </div>
          <NotificationBell 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
            iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2]"
            dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
          />
        </header>

        {/* Filter Pills */}
        <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 sticky top-[48px] sm:top-[53px] z-30 border-b border-[#E8D9DF]/60 shadow-xs">
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide scroll-smooth [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { id: 'all', label: 'All Bookings' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'in-progress', label: 'In Progress' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-gradient-to-r from-[#720C3E] to-[#9A2459] text-white shadow-xs border-transparent active:scale-95'
                      : 'bg-white border-[#E8D9DF] text-[#6F5A64] hover:text-[#24151D] hover:bg-[#FFF7FA]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <main className="px-4 py-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm animate-pulse flex gap-3 items-center"
                >
                  <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                    <div className="h-4 w-44 bg-gray-200 rounded" />
                    <div className="h-3 w-36 bg-gray-200 rounded" />
                  </div>
                  <div className="flex flex-col items-end justify-between h-16 py-1">
                    <div className="h-5 w-20 bg-gray-200 rounded-md" />
                    <div className="h-4 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center px-6"
            >
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <FiClock className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-gray-900 text-base font-bold mb-1">No Bookings Found</h3>
              <p className="text-gray-500 text-xs max-w-xs leading-relaxed">
                {filter === 'all'
                  ? "You haven't booked any services yet. Explore our services to get started!"
                  : `No ${filter.replace('-', ' ')} bookings found.`}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
              className="space-y-3"
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

                // Format service title to Title Case if needed & fallback
                let formattedTitle = (
                  booking.serviceName ||
                  booking.serviceId?.title ||
                  (booking.bookedItems && (booking.bookedItems[0]?.card?.title || booking.bookedItems[0]?.title)) ||
                  'Service Request'
                ).trim();

                const dateStr = formatDate(booking.scheduledDate || booking.createdAt);
                const timeStr = booking.scheduledTime || booking.timeSlot?.time || booking.timeSlot?.start || 'ASAP';
                const statusBadge = getStatusBadge(booking.status);
                const price = booking.finalAmount || booking.totalAmount || booking.servicePrice || 0;
                const isCompleted = (booking.status || '').toLowerCase() === 'completed' || (booking.status || '').toLowerCase() === 'work_done';

                return (
                  <motion.div
                    key={booking._id || booking.id}
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { type: 'spring', stiffness: 120, damping: 16 }
                      }
                    }}
                    onClick={() => handleBookingClick(booking)}
                    className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex gap-3.5 items-center active:scale-[0.99]"
                  >
                    {/* Left: Square Image Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {serviceImg ? (
                        <img
                          src={serviceImg}
                          alt={formattedTitle}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.innerHTML = '<span class="text-xl">⚡</span>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center text-xl">
                          ⚡
                        </div>
                      )}
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      {/* Booking ID */}
                      <span className="text-[11px] font-bold text-gray-400 tracking-tight">
                        #{bId}
                      </span>

                      {/* Service Title - Clean & Compact */}
                      <h3 className="text-xs sm:text-[13px] font-semibold text-[#1E293B] leading-snug break-words capitalize">
                        {formattedTitle}
                      </h3>

                      {/* Date & Time Slot or Review Rating */}
                      {isCompleted && booking.rating ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
                          <span>⭐ {booking.rating}</span>
                          <span className="text-gray-400 font-normal">(Reviewed)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium flex-wrap">
                          <span>{dateStr}</span>
                          {timeStr && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span>{timeStr}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Status Pill & Price */}
                    <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5 min-w-[75px]">
                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>

                      {/* Price & Chevron */}
                      <div className="flex items-center gap-1 mt-auto pt-1">
                        <span className="text-sm sm:text-base font-black text-[#1E293B]">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                        <FiChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyBookings;

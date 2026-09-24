import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import {
  FiCheckCircle,
  FiMapPin,
  FiClock,
  FiCalendar,
  FiPackage,
  FiDollarSign,
  FiHome,
  FiArrowRight,
  FiLoader,
  FiArrowLeft,
  FiBell,
  FiXCircle
} from 'react-icons/fi';
import { bookingService } from '../../../../services/bookingService';
import { paymentService } from '../../../../services/paymentService';
import NotificationBell from '../../components/common/NotificationBell';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';

// Inline SearchingAnimation Component
const SearchingAnimation = () => {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-5 px-4 relative">
      {/* Map-like Background (Subtle) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="w-full h-full" style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      {/* Central Radar Animation */}
      <div className="relative w-32 h-32 flex items-center justify-center mb-3">
        {/* Outer Ripples */}
        <div className="absolute inset-0 rounded-full border-2 opacity-20 animate-ping"
          style={{ borderColor: themeColors.brand.teal, animationDuration: '3s' }}></div>
        <div className="absolute inset-3 rounded-full border opacity-40 animate-ping"
          style={{ borderColor: themeColors.brand.teal, animationDuration: '3s', animationDelay: '0.6s' }}></div>

        {/* Rotating Scanner Gradient */}
        <div className="absolute inset-0 rounded-full animate-spin opacity-30"
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

        {/* Floating Dots Animation */}
        <div className="absolute top-5 right-5 w-1.5 h-1.5 rounded-full animate-bounce opacity-50" style={{ backgroundColor: themeColors.brand.orange, animationDelay: '0.2s' }}></div>
        <div className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full animate-bounce opacity-50" style={{ backgroundColor: themeColors.brand.yellow, animationDelay: '1.5s' }}></div>
      </div>

      {/* Status Text */}
      <div className="text-center relative z-20">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Searching nearby experts</h3>
        <p className="text-gray-500 text-xs max-w-[220px] mx-auto leading-tight">
          Searching within 5km radius{dots}
        </p>
      </div>

      {/* Bottom Pill */}
      <div className="mt-2.5">
        <div className="px-3 py-1 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-medium text-gray-400">
          Process runs in background
        </div>
      </div>
    </div>
  );
};

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(!location.state?.noVendorsFound); // Respect passed state
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [paying, setPaying] = useState(false);

  const handlePayNow = async () => {
    if (paying || !booking) return;
    try {
      setPaying(true);
      toast.loading('Opening secure payment gateway...');
      const orderResponse = await paymentService.createOrder(booking._id || booking.id);
      toast.dismiss();

      if (!orderResponse.success) {
        toast.error(orderResponse.message || 'Failed to initialize payment order');
        setPaying(false);
        return;
      }

      const razorpayKey = orderResponse.data?.key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_8sYbzHWidwe5Zw';
      if (!window.Razorpay || !razorpayKey) {
        toast.error('Payment gateway is not available right now. Please try again.');
        setPaying(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderResponse.data.amount * 100,
        currency: orderResponse.data.currency || 'INR',
        order_id: orderResponse.data.orderId,
        name: 'Qwiklly',
        description: `Booking #${booking.bookingNumber || ''}`,
        handler: async function (response) {
          try {
            toast.loading('Verifying payment...');
            const verifyResponse = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.dismiss();

            if (verifyResponse.success) {
              toast.success('Payment successful! You can now start your service journey.');
              setBooking(prev => prev ? { ...prev, paymentStatus: 'success' } : prev);
            } else {
              toast.error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error) {
            toast.dismiss();
            toast.error('Failed to verify payment');
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment was cancelled. You can retry anytime.');
            setPaying(false);
          }
        },
        theme: { color: themeColors.button }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        toast.dismiss();
        toast.error(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
        setPaying(false);
      });
      razorpay.open();
    } catch (error) {
      toast.dismiss();
      toast.error('Something went wrong. Please try again.');
      setPaying(false);
    }
  };

  useEffect(() => {
    const loadBooking = async () => {
      try {
        setLoading(true);
        const response = await bookingService.getById(id);
        if (response.success) {
          const data = { ...response.data };
          // Calculate notional display values for plan_benefit
          if (data.paymentMethod === 'plan_benefit') {
            if (!data.tax) data.tax = 0;
            if (!data.visitingCharges && !data.visitationFee) data.visitingCharges = 0;
          }
          setBooking(data);

          // Check if vendor is already assigned
          const currentStatus = data.status?.toLowerCase();
          if (data.vendorId || (currentStatus !== 'requested' && currentStatus !== 'searching')) {
            setIsSearching(false);
          }
        } else {
          toast.error(response.message || 'Booking not found');
          navigate('/user/my-bookings');
        }
      } catch (error) {
        toast.error('Failed to load booking details');
        navigate('/user/my-bookings');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadBooking();
    }
  }, [id, navigate]);

  // Poll for vendor acceptance
  useEffect(() => {
    if (!isSearching || !id) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await bookingService.getById(id);
        if (response.success) {
          const updatedBooking = { ...response.data };

          // Calculate notional display values for plan_benefit
          if (updatedBooking.paymentMethod === 'plan_benefit') {
            if (!updatedBooking.tax) updatedBooking.tax = 0;
            if (!updatedBooking.visitingCharges && !updatedBooking.visitationFee) updatedBooking.visitingCharges = 0;
          }

          setBooking(updatedBooking);
          // If vendor accepted or status changed
          const currentStatus = updatedBooking.status?.toLowerCase();
          if (updatedBooking.vendorId || (currentStatus !== 'requested' && currentStatus !== 'searching')) {
            setIsSearching(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isSearching, id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getAddressString = (address) => {
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object') {
      return `${address.addressLine1 || ''}${address.addressLine2 ? `, ${address.addressLine2}` : ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Booking not found</p>
          <button
            onClick={() => navigate('/user/my-bookings')}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: themeColors.button }}
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  const handleViewDetails = () => {
    navigate(`/user/booking/${booking._id || booking.id}`);
  };

  const handleGoHome = () => {
    navigate('/user', { replace: true });
  };

  const handleCancelBooking = async () => {
    try {
      setLoading(true);
      await bookingService.cancel(booking._id || booking.id, { reason: 'Cancelled during uncertain vendor search' });
      toast.success('Booking cancelled successfully');
      navigate('/user');
    } catch (error) {
      console.error(error);
      toast.error('Failed to cancel booking');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 relative bg-white">
      {/* Refined Brand Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.teal || '#347989'}25 0%, transparent 70%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}20 0%, transparent 70%),
              radial-gradient(at 100% 100%, ${themeColors?.brand?.orange || '#BB5F36'}15 0%, transparent 75%),
              radial-gradient(at 0% 100%, ${themeColors?.brand?.teal || '#347989'}10 0%, transparent 70%),
              radial-gradient(at 50% 50%, ${themeColors?.brand?.teal || '#347989'}03 0%, transparent 100%),
              #FFFFFF
            `
          }}
        />
        {/* Elegant Dot Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.teal || '#347989'} 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative z-10">
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
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Booking Sent</h1>
          </div>
          <NotificationBell 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
            iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2]"
            dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
          />
        </header>

        <main className="px-3.5 py-3.5 max-w-lg mx-auto">
          {/* Searching Animation - Show at top when searching for vendor */}
          {isSearching && (
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 mb-3 overflow-hidden">
              <SearchingAnimation />
            </div>
          )}

          {/* Success Icon - Show when confirmed */}
          {!isSearching && ['confirmed', 'assigned', 'journey_started', 'work_in_progress', 'visited', 'work_done', 'completed'].includes(booking?.status?.toLowerCase()) && (
            <div className="flex flex-col items-center justify-center mb-3.5 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2 shadow-xs">
                <FiCheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-0.5">Booking Confirmed!</h1>
              <p className="text-xs text-gray-500 max-w-xs leading-tight">
                Your booking has been confirmed. We'll send you updates via SMS.
              </p>
            </div>
          )}

          {/* Request Sent Icon - Show when status is requested but searching animation is stopped */}
          {!isSearching && booking?.status?.toLowerCase() === 'requested' && (
            <div className="flex flex-col items-center justify-center mb-3.5 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-2 border border-amber-100 shadow-xs">
                <FiBell className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <h1 className="text-base font-black text-gray-900 mb-0.5 tracking-tight">REQUEST SENT!</h1>
              <p className="text-xs text-gray-500 max-w-xs font-medium leading-tight">
                Your request has been broadcasted to all nearby experts. We'll notify you once accepted.
              </p>
            </div>
          )}

          {/* Failure Icon - Show when expired/cancelled/rejected */}
          {!isSearching && ['expired', 'cancelled', 'rejected', 'failed', 'timeout'].includes(booking?.status?.toLowerCase()) && (
            <div className="flex flex-col items-center justify-center mb-3.5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2 shadow-xs">
                <FiXCircle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-base font-bold text-gray-900 mb-0.5">No Expert Found</h1>
              <p className="text-xs text-gray-500 max-w-xs mb-3 leading-tight">
                We couldn't find a nearby expert for your request at this moment.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2 bg-teal-600 text-white rounded-lg font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <FiArrowRight className="w-4 h-4" />
                Search Again
              </button>
            </div>
          )}

          {/* Booking ID Card */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-3 mb-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Booking ID</p>
                <p className="text-sm font-bold text-gray-900 tracking-tight">{booking.bookingNumber || booking._id || booking.id}</p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${(isSearching || booking?.status?.toLowerCase() === 'requested')
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                {isSearching ? 'Finding Vendor...' : (booking?.status?.toLowerCase() === 'requested' ? 'Request Sent' : 'Confirmed')}
              </div>
            </div>
          </div>

          {/* Payment Card - shown once a vendor has accepted */}
          {booking?.vendorId && (
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-3 mb-2.5">
              {booking?.paymentStatus === 'success' ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Payment Successful</p>
                    <p className="text-[11px] text-gray-500 leading-tight">You can now start your service journey.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Amount Payable</p>
                    <p className="text-base font-bold text-gray-900">₹{(booking.finalAmount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <button
                    onClick={handlePayNow}
                    disabled={paying}
                    className="px-4 py-2 rounded-lg font-bold text-white text-xs disabled:opacity-50 active:scale-95 transition-all shadow-xs"
                    style={{ backgroundColor: themeColors.button }}
                  >
                    {paying ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Service Details Card */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-3 mb-2.5">
            <h3 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider text-slate-500">Service Details</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                  <FiMapPin className="w-3.5 h-3.5" style={{ color: themeColors.button }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">Service Address</p>
                  <p className="text-xs text-gray-700 leading-tight">{getAddressString(booking.address)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                  <FiCalendar className="w-3.5 h-3.5" style={{ color: themeColors.button }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">Date & Time</p>
                  <p className="text-xs text-gray-700 font-medium leading-tight">
                    {formatDate(booking.scheduledDate)} • {booking.scheduledTime || booking.timeSlot?.start || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Summary Card */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-3 mb-2.5">
            <h3 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider text-slate-500">Order Summary</h3>
            <div className="space-y-2">
              {/* Service Category */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                  {booking.categoryIcon ? (
                    <img src={booking.categoryIcon} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <FiPackage className="w-3.5 h-3.5" style={{ color: themeColors.button }} />
                  )}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Service Category</p>
                  <p className="text-xs font-bold text-gray-800">{booking.serviceCategory || booking.serviceName || 'Service'}</p>
                </div>
              </div>

              {/* Brand */}
              {(() => {
                const brandName = booking.brandName || booking.bookedItems?.[0]?.brandName;
                const brandIcon = booking.brandIcon || booking.bookedItems?.[0]?.brandIcon;
                if (!brandName) return null;
                return (
                  <div className="flex items-center gap-2.5 pt-2 border-t border-dashed border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                      {brandIcon ? (
                        <img src={brandIcon} alt={brandName} className="w-4 h-4 object-contain" />
                      ) : (
                        <span className="text-xs font-black text-slate-400">{brandName.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Brand</p>
                      <p className="text-xs font-bold text-gray-800">{brandName}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Service Cards */}
              {booking.bookedItems && booking.bookedItems.length > 0 ? (
                <div className="pt-2 border-t border-dashed border-gray-100 space-y-1.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Services Booked</p>
                  {booking.bookedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold px-1.5 py-0.2 rounded border"
                            style={{ color: themeColors.button, backgroundColor: 'rgba(0,166,166,0.08)', borderColor: 'rgba(0,166,166,0.2)' }}>
                            {item.card?.hours ? `${item.card.hours} ${item.card.hours === 1 ? 'Hour' : 'Hours'}` : `×${item.quantity}`}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 truncate">{item.card?.title || 'Service'}</span>
                        </div>
                        {item.card?.subtitle && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{item.card.subtitle}</p>}
                        {item.card?.duration && <p className="text-[10px] text-gray-400 mt-0.5">⏱ {item.card.duration}</p>}
                      </div>
                      <span className="text-xs font-bold text-gray-900 ml-2 shrink-0">₹{((item.card?.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Payment Summary - Professional Card */}
          <div className="bg-white border border-slate-100 rounded-xl p-3 mb-3 shadow-xs overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: themeColors.gradient || themeColors.button }}></div>

            <div className="flex items-center gap-2 mb-2.5">
              <div className={`p-1.5 rounded-md ${booking.paymentMethod === 'plan_benefit' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                {booking.paymentMethod === 'plan_benefit' ? (
                  <FiPackage className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <FiDollarSign className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Summary</h3>
            </div>

            <div className="space-y-1.5">
              {/* Base Price */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Base Price</span>
                {booking.paymentMethod === 'plan_benefit' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="line-through text-slate-400 text-[11px]">₹{(booking.basePrice || 0).toLocaleString('en-IN')}</span>
                    <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">FREE ✓</span>
                  </div>
                ) : (
                  <span className="font-medium text-slate-900">₹{(booking.basePrice || 0).toLocaleString('en-IN')}</span>
                )}
              </div>

              {/* Discount */}
              {booking.paymentMethod !== 'plan_benefit' && booking.discount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-green-600 font-medium">Discount</span>
                  <span className="font-medium text-green-600">-₹{booking.discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {/* Tax */}
              {(booking.tax > 0 || booking.paymentMethod === 'plan_benefit') && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Taxes & GST</span>
                  {booking.paymentMethod === 'plan_benefit' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-slate-400 text-[11px]">₹{(booking.tax || 0).toLocaleString('en-IN')}</span>
                      <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">FREE ✓</span>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-700">₹{(booking.tax || 0).toLocaleString('en-IN')}</span>
                  )}
                </div>
              )}

              {/* Convenience Fee */}
              {(booking.visitingCharges > 0 || booking.visitationFee > 0 || booking.paymentMethod === 'plan_benefit') && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Convenience Fee</span>
                  {booking.paymentMethod === 'plan_benefit' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-slate-400 text-[11px]">₹{(booking.visitingCharges || booking.visitationFee || 0).toLocaleString('en-IN')}</span>
                      <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">FREE ✓</span>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-700">₹{(booking.visitingCharges || booking.visitationFee || 0).toLocaleString('en-IN')}</span>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="border-t border-slate-200 pt-2 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">Total Paid</span>
                  <span className="text-base font-black text-slate-900">
                    ₹{(booking.paymentMethod === 'plan_benefit' ? 0 : (booking.finalAmount || booking.totalAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Success Badge */}
            {(booking.paymentId || booking.paymentMethod === 'plan_benefit') && (
              <div className={`mt-2 pt-2 border-t border-dashed ${booking.paymentMethod === 'plan_benefit' ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-2 border rounded-lg p-2 ${booking.paymentMethod === 'plan_benefit' ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-200'}`}>
                  <FiCheckCircle className={`w-4 h-4 shrink-0 ${booking.paymentMethod === 'plan_benefit' ? 'text-amber-600' : 'text-green-600'}`} />
                  <div>
                    <p className={`text-xs font-bold ${booking.paymentMethod === 'plan_benefit' ? 'text-amber-700' : 'text-green-700'}`}>
                      {booking.paymentMethod === 'plan_benefit' ? 'Membership Benefit Applied' : 'Payment Successful'}
                    </p>
                    {booking.paymentId && <p className="text-[10px] text-green-600 font-mono">ID: {booking.paymentId}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {isSearching && (
              <button
                onClick={() => setConfirmDialog(true)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all mb-2"
              >
                Cancel Booking Request
              </button>
            )}

            <button
              onClick={handleViewDetails}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs"
              style={{ backgroundColor: themeColors.button }}
            >
              View Full Details
              <FiArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoHome}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Back to Home
            </button>
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        onConfirm={handleCancelBooking}
        title="Cancel Booking Request"
        message="Are you sure you want to cancel this booking search?"
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep It"
        type="danger"
      />
    </div>
  );
};

export default BookingConfirmation;

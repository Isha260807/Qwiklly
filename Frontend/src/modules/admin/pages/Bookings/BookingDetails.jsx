import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiClock,
  FiShoppingBag, FiDollarSign, FiCheckCircle, FiAlertCircle, FiXCircle,
  FiLoader, FiCopy, FiExternalLink, FiBriefcase, FiRefreshCw, FiFileText
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminBookingService } from '../../../../services/adminBookingService';

const statusBadgeConfig = {
  SEARCHING: { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Searching Partner', icon: FiLoader },
  PENDING: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending', icon: FiClock },
  ACCEPTED: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Accepted by Partner', icon: FiCheckCircle },
  ASSIGNED: { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Partner Assigned', icon: FiCheckCircle },
  VISITED: { bg: 'bg-cyan-100 text-cyan-800 border-cyan-200', label: 'Partner Visited', icon: FiMapPin },
  WORK_DONE: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Work Done', icon: FiCheckCircle },
  FINAL_SETTLEMENT: { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Settlement Pending', icon: FiDollarSign },
  COMPLETED: { bg: 'bg-green-100 text-green-800 border-green-200', label: 'Completed', icon: FiCheckCircle },
  CANCELLED: { bg: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled', icon: FiXCircle },
  REJECTED: { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Rejected', icon: FiAlertCircle }
};

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminBookingService.getBookingById(id);
      if (res.success && res.data) {
        setBooking(res.data);
      } else {
        setError('Booking details not found');
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setError(err?.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }
    try {
      setCancelling(true);
      const res = await adminBookingService.cancelBooking(id, cancelReason);
      if (res.success) {
        toast.success('Booking cancelled successfully');
        setCancelModalOpen(false);
        fetchBooking();
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <FiLoader className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-gray-600 font-medium text-sm">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm border border-gray-200 mt-8">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Booking Not Found</h3>
        <p className="text-sm text-gray-500 mb-6">{error || 'Unable to retrieve booking information.'}</p>
        <button
          onClick={() => navigate('/admin/bookings')}
          className="px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl text-sm hover:bg-gray-800 transition"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  const normalizedStatus = (booking.status || 'PENDING').toUpperCase();
  const statusCfg = statusBadgeConfig[normalizedStatus] || {
    bg: 'bg-gray-100 text-gray-800 border-gray-200',
    label: normalizedStatus.replace('_', ' '),
    icon: FiClock
  };
  const StatusIcon = statusCfg.icon;

  const user = booking.userId || {};
  const vendor = booking.vendorId || {};
  const address = booking.address || {};
  const bookedItems = booking.bookedItems || [];

  const formattedDate = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : (booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A');

  const slotDisplay = booking.scheduledTime || (typeof booking.timeSlot === 'string' ? booking.timeSlot : (booking.timeSlot?.start ? `${booking.timeSlot.start} ${booking.timeSlot.end ? `- ${booking.timeSlot.end}` : ''}` : '')) || (booking.bookingType === 'instant' ? 'Instant (ASAP)' : 'Flexible Slot');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">
                #{booking.bookingNumber || booking._id}
              </h1>
              <button
                onClick={() => handleCopy(booking.bookingNumber || booking._id, 'Booking ID')}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Copy ID"
              >
                <FiCopy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Booked on {new Date(booking.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${statusCfg.bg}`}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusCfg.label}</span>
          </div>

          <button
            onClick={fetchBooking}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
            title="Refresh"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>

          {!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(normalizedStatus) && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 font-semibold rounded-xl text-xs border border-red-200 transition"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Service & Booked Items */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <FiShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {booking.serviceName || booking.serviceId?.title || 'Service Details'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">{booking.serviceCategory || 'Category'}</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold uppercase">
                {booking.bookingType || 'Standard'}
              </span>
            </div>

            {/* Booked Items List */}
            {bookedItems.length > 0 ? (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Booked Package & Items</h4>
                {bookedItems.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <h5 className="font-bold text-sm text-gray-800">{item.card?.title || item.serviceName || 'Service Item'}</h5>
                      {item.card?.subtitle && <p className="text-xs text-gray-500 mt-0.5">{item.card.subtitle}</p>}
                      {item.brandName && (
                        <span className="inline-block mt-1 text-[11px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                          Brand: {item.brandName}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900">₹{item.card?.price || item.price || 0}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
                <p><span className="font-medium text-gray-800">Base Service:</span> {booking.serviceName || 'Standard Service'}</p>
              </div>
            )}
          </div>

          {/* Customer & Address Details */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Customer & Location</h3>
                <p className="text-xs text-gray-500 font-medium">Service delivery destination</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Details</p>
                <p className="text-sm font-bold text-gray-800">{user.name || 'Customer'}</p>
                {user.phone && (
                  <p className="text-xs text-gray-600 flex items-center gap-2">
                    <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`tel:${user.phone}`} className="text-blue-600 hover:underline">{user.phone}</a>
                  </p>
                )}
                {user.email && (
                  <p className="text-xs text-gray-600 flex items-center gap-2">
                    <FiMail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{user.email}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Service Address</p>
                <p className="text-sm text-gray-800 leading-relaxed font-medium">
                  {[address.addressLine1, address.addressLine2, address.landmark, address.city, address.state, address.pincode]
                    .filter(Boolean)
                    .join(', ') || 'Address not specified'}
                </p>
                {address.lat && address.lng && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${address.lat},${address.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline mt-1"
                  >
                    <FiMapPin className="w-3.5 h-3.5" />
                    <span>Open in Google Maps ({address.lat.toFixed(4)}, {address.lng.toFixed(4)})</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Partner / Vendor */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <FiBriefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Assigned Partner / Vendor</h3>
                  <p className="text-xs text-gray-500 font-medium">Service provider execution info</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${vendor._id ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {vendor._id ? 'Assigned' : 'Unassigned'}
              </span>
            </div>

            {vendor._id ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partner Info</p>
                  <p className="text-sm font-bold text-gray-800">{vendor.name || vendor.businessName}</p>
                  {vendor.businessName && vendor.businessName !== vendor.name && (
                    <p className="text-xs text-gray-500">Business: {vendor.businessName}</p>
                  )}
                  {vendor.phone && (
                    <p className="text-xs text-gray-600 flex items-center gap-2">
                      <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                      <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline">{vendor.phone}</a>
                    </p>
                  )}
                  {vendor.email && (
                    <p className="text-xs text-gray-600 flex items-center gap-2">
                      <FiMail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{vendor.email}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partner Address</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {vendor.address?.fullAddress || vendor.address?.city || 'Registered city: Indore'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Approval: <span className="font-semibold text-green-600 capitalize">{vendor.approvalStatus || 'Approved'}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl text-xs text-amber-800 flex items-center gap-2.5">
                <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>No partner is currently assigned to this booking. Matching engine broadcasts to nearest vendors.</span>
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Schedule, Timeline & Payment Summary */}
        <div className="space-y-6">

          {/* Schedule Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-primary-600" />
              <span>Schedule & Timing</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Date</span>
                <span className="font-bold text-gray-800">{formattedDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Time Slot</span>
                <span className="font-bold text-gray-800">{slotDisplay}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Booking Type</span>
                <span className="font-semibold text-primary-700 capitalize">{booking.bookingType || 'Instant'}</span>
              </div>
            </div>
          </div>

          {/* Payment & Billing Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
              <FiDollarSign className="w-4 h-4 text-emerald-600" />
              <span>Payment Breakdown</span>
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Base Price</span>
                <span>₹{booking.basePrice || booking.amount || 0}</span>
              </div>

              {booking.discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-₹{booking.discount}</span>
                </div>
              )}

              {booking.tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Taxes & Fees</span>
                  <span>+₹{booking.tax}</span>
                </div>
              )}

              {booking.visitingCharges > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Visiting Fee</span>
                  <span>+₹{booking.visitingCharges}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-900">Final Total</span>
                <span className="font-extrabold text-lg text-gray-900">
                  ₹{booking.finalAmount ?? booking.basePrice ?? booking.amount ?? 0}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Payment Mode</span>
                <span className="font-bold text-gray-800 uppercase">{booking.paymentMethod || 'CASH'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Payment Status</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                  ['SUCCESS', 'PAID', 'COLLECTED_BY_VENDOR'].includes((booking.paymentStatus || '').toUpperCase())
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {booking.paymentStatus || 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Partner Payout</span>
                <span className="font-semibold text-gray-700 capitalize">
                  {booking.workerPaymentStatus || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Timestamps */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-3 text-xs">
            <h3 className="font-bold text-gray-900 pb-2 border-b border-gray-100">Milestone Timestamps</h3>
            
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="font-medium text-gray-800">
                  {booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-IN') : '-'}
                </span>
              </div>
              {booking.acceptedAt && (
                <div className="flex justify-between">
                  <span>Accepted:</span>
                  <span className="font-medium text-gray-800">{new Date(booking.acceptedAt).toLocaleString('en-IN')}</span>
                </div>
              )}
              {booking.visitedAt && (
                <div className="flex justify-between">
                  <span>Visited:</span>
                  <span className="font-medium text-gray-800">{new Date(booking.visitedAt).toLocaleString('en-IN')}</span>
                </div>
              )}
              {booking.completedAt && (
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-medium text-gray-800">{new Date(booking.completedAt).toLocaleString('en-IN')}</span>
                </div>
              )}
              {booking.cancelledAt && (
                <div className="flex justify-between text-red-600">
                  <span>Cancelled:</span>
                  <span className="font-medium">{new Date(booking.cancelledAt).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {booking.cancellationReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-xl text-red-700 text-xs">
                <p className="font-bold">Cancellation Reason:</p>
                <p className="mt-0.5">{booking.cancellationReason}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <FiAlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel booking <span className="font-bold">#{booking.bookingNumber || booking._id}</span>?
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Reason for cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-2"
              >
                {cancelling && <FiLoader className="w-4 h-4 animate-spin" />}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BookingDetails;

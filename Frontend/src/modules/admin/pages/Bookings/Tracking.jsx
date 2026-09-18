import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiCheckCircle, FiTruck, FiPackage, FiClipboard, FiClock,
  FiUser, FiPhone, FiMapPin, FiExternalLink, FiX, FiAlertCircle, FiXCircle,
  FiBriefcase, FiDollarSign, FiNavigation
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminBookingService } from '../../../../services/adminBookingService';
import { toast } from 'react-hot-toast';

const Tracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch bookings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          page: 1,
          limit: 50,
          search: debouncedSearch,
        };
        const res = await adminBookingService.getAllBookings(params);
        if (res.success && res.data) {
          setBookings(res.data);
          if (targetId) {
            const matched = res.data.find(b => b._id === targetId || b.bookingNumber === targetId);
            if (matched) {
              setSelectedOrder(matched);
            } else if (res.data.length > 0 && !selectedOrder) {
              setSelectedOrder(res.data[0]);
            }
          } else if (res.data.length > 0 && !selectedOrder) {
            setSelectedOrder(res.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [debouncedSearch, targetId]);

  const getStatusStepIndex = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'searching':
      case 'requested':
      case 'awaiting_payment':
      case 'pending': return 0;
      case 'confirmed':
      case 'accepted':
      case 'assigned': return 1;
      case 'journey_started':
      case 'visited': return 2;
      case 'in_progress': return 3;
      case 'work_done': return 4;
      case 'completed': return 5;
      default: return 0;
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'work_done') {
      return {
        label: s === 'work_done' ? 'Work Done' : 'Completed',
        bg: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      };
    }
    if (s === 'confirmed' || s === 'accepted' || s === 'assigned') {
      return {
        label: s.replace('_', ' '),
        bg: 'bg-blue-100 text-blue-800 border border-blue-200'
      };
    }
    if (s === 'in_progress' || s === 'journey_started' || s === 'visited') {
      return {
        label: s.replace('_', ' '),
        bg: 'bg-purple-100 text-purple-800 border border-purple-200'
      };
    }
    if (s === 'cancelled') {
      return { label: 'Cancelled', bg: 'bg-red-100 text-red-800 border border-red-200' };
    }
    if (s === 'rejected') {
      return { label: 'Rejected', bg: 'bg-rose-100 text-rose-800 border border-rose-200' };
    }
    return { label: s.replace('_', ' ') || 'Pending', bg: 'bg-yellow-100 text-yellow-800 border border-yellow-200' };
  };

  const steps = [
    { title: 'Booking Placed', desc: 'Order received & queued', icon: FiClipboard },
    { title: 'Partner Assigned', desc: 'Service professional confirmed', icon: FiBriefcase },
    { title: 'Journey Started', desc: 'Partner on the way to location', icon: FiTruck },
    { title: 'Work In Progress', desc: 'Service currently being performed', icon: FiPackage },
    { title: 'Work Done', desc: 'Service completed by partner', icon: FiCheckCircle },
    { title: 'Order Completed', desc: 'Payment verified & closed', icon: FiCheckCircle }
  ];

  const isCancelledOrRejected = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'cancelled' || s === 'rejected';
  };

  const getPrimaryService = (b) => {
    if (b.serviceName) return b.serviceName;
    if (b.serviceId?.title) return b.serviceId.title;
    if (b.items && b.items.length > 0) {
      return b.items[0].serviceName || b.items[0].title || 'Service';
    }
    return 'General Service';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Search Header */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Booking ID (#BK...), customer name, phone, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => navigate('/admin/bookings')}
          className="px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex items-center gap-1.5 whitespace-nowrap"
        >
          All Bookings Table
        </button>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[580px]">
        {/* Left: Orders List Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[640px]">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
              Active Bookings ({bookings.length})
            </h3>
            <span className="text-[11px] text-gray-500">Click any row to view live track</span>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-xs border-b border-gray-100">
                <tr>
                  <th className="px-3.5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">BOOKING ID</th>
                  <th className="px-3.5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">CUSTOMER</th>
                  <th className="px-3.5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">STATUS</th>
                  <th className="px-3.5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">BOOKING DATE</th>
                  <th className="px-3.5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-xs text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-xs text-gray-500">
                      <FiAlertCircle className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      No orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const isSelected = selectedOrder?._id === booking._id;
                    const badge = getStatusBadge(booking.status);

                    return (
                      <tr
                        key={booking._id}
                        onClick={() => setSelectedOrder(booking)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary-50/50 border-l-4 border-l-primary-600'
                            : 'hover:bg-gray-50/80 border-l-4 border-l-transparent'
                        }`}
                      >
                        {/* ID */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className={`font-bold text-xs ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                            #{booking.bookingNumber || booking._id?.slice(-6).toUpperCase()}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-3.5 py-3">
                          <div className="max-w-[150px]">
                            <p className="font-bold text-gray-900 text-xs truncate">
                              {booking.userId?.name || booking.customerName || 'Customer'}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium truncate">
                              {booking.userId?.phone || booking.customerPhone || 'No Phone'}
                            </p>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-[11px] text-gray-600 font-medium">
                          {new Date(booking.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedOrder(booking)}
                            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                              isSelected
                                ? 'bg-primary-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-700 hover:bg-primary-600 hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Tracking' : 'Track'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Tracking Details Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[640px]">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Panel Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-gray-900">
                        #{selectedOrder.bookingNumber || selectedOrder._id?.slice(-6).toUpperCase()}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${getStatusBadge(selectedOrder.status).bg}`}>
                        {getStatusBadge(selectedOrder.status).label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{getPrimaryService(selectedOrder)}</p>
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    ₹{(selectedOrder.finalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Panel Scrollable Content */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                  {/* Status Banner for Cancelled/Rejected */}
                  {isCancelledOrRejected(selectedOrder.status) && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800">
                      <FiXCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-wide">
                          Booking {selectedOrder.status?.toUpperCase()}
                        </p>
                        <p className="text-[11px] text-red-700 mt-0.5">
                          {selectedOrder.cancellationReason || selectedOrder.rejectionReason || 'This booking has been cancelled or rejected.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Customer & Partner Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Customer Card */}
                    <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase">
                        <FiUser className="w-3.5 h-3.5 text-primary-600" /> Customer
                      </div>
                      <p className="font-bold text-gray-900 text-xs truncate">
                        {selectedOrder.userId?.name || selectedOrder.customerName || 'Customer'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium truncate flex items-center gap-1">
                        <FiPhone className="w-3 h-3 text-gray-400" />
                        {selectedOrder.userId?.phone || selectedOrder.customerPhone || 'N/A'}
                      </p>
                    </div>

                    {/* Partner Card */}
                    <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase">
                        <FiBriefcase className="w-3.5 h-3.5 text-blue-600" /> Service Partner
                      </div>
                      <p className="font-bold text-gray-900 text-xs truncate">
                        {selectedOrder.vendorId?.name || selectedOrder.vendorId?.businessName || 'Searching Partner'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium truncate flex items-center gap-1">
                        <FiPhone className="w-3 h-3 text-gray-400" />
                        {selectedOrder.vendorId?.phone || 'Awaiting partner assignment'}
                      </p>
                    </div>
                  </div>

                  {/* Timeline Tracker */}
                  <div className="pt-2">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Live Progress Journey</h4>

                    <div className="space-y-4 relative pl-3">
                      {/* Vertical connector line */}
                      <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-200"></div>

                      {steps.map((step, index) => {
                        const currentIdx = getStatusStepIndex(selectedOrder.status);
                        const isPast = !isCancelledOrRejected(selectedOrder.status) && index < currentIdx;
                        const isCurrent = !isCancelledOrRejected(selectedOrder.status) && index === currentIdx;
                        const isUpcoming = isCancelledOrRejected(selectedOrder.status) || index > currentIdx;

                        return (
                          <div key={index} className="relative flex items-start gap-3.5">
                            {/* Icon Circle */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                                isPast
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-primary-600 text-white ring-4 ring-primary-100 shadow-sm animate-pulse'
                                  : 'bg-gray-100 text-gray-400 border border-gray-200'
                              }`}
                            >
                              <step.icon className="w-3.5 h-3.5" />
                            </div>

                            {/* Label & Description */}
                            <div className="flex-1 pt-0.5">
                              <div className="flex items-center justify-between">
                                <h5
                                  className={`text-xs font-bold ${
                                    isCurrent ? 'text-primary-700' : isPast ? 'text-gray-900' : 'text-gray-400'
                                  }`}
                                >
                                  {step.title}
                                </h5>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    isPast
                                      ? 'text-emerald-700 bg-emerald-50'
                                      : isCurrent
                                      ? 'text-primary-700 bg-primary-50'
                                      : 'text-gray-400 bg-gray-50'
                                  }`}
                                >
                                  {isPast ? 'Done' : isCurrent ? 'In Progress' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Panel Footer */}
                <div className="p-3.5 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => navigate(`/admin/bookings/${selectedOrder._id}`)}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary-600/20 active:scale-95"
                  >
                    View Full Order Details <FiExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center text-gray-400">
                <FiNavigation className="w-10 h-10 text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600 text-xs">Select an order from the list</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Live tracking updates and journey timeline will be shown here.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default Tracking;

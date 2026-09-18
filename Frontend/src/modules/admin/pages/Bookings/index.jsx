import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiCalendar, FiDownload, FiMoreVertical,
  FiClock, FiCheckCircle, FiBox, FiTruck, FiXCircle, FiRefreshCw, FiShoppingBag,
  FiEye, FiNavigation, FiSlash, FiX, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminBookingService } from '../../../../services/adminBookingService';

const BookingStatsCard = ({ title, count, icon: Icon, colorClass, bgClass, onClick, isSelected }) => (
  <div
    onClick={onClick}
    className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none relative overflow-hidden flex items-center justify-between ${bgClass} ${
      isSelected ? 'shadow-md border-gray-400 font-semibold' : 'hover:shadow-sm'
    }`}
    style={{ boxSizing: 'border-box' }}
  >
    <div className="z-10 relative">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${colorClass.replace('text-', 'bg-').replace('600', '100').replace('700', '100')}`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{title}</h3>
      <p className="text-xl font-extrabold text-gray-900 mt-0.5">{count || 0}</p>
    </div>
    <div className={`w-14 h-14 rounded-full opacity-15 pointer-events-none absolute -right-3 -bottom-3 ${colorClass.replace('text-', 'bg-')}`}></div>
  </div>
);

const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Cancel Modal State
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
    total: 0
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Stats
  const fetchStats = async () => {
    try {
      const analyticsRes = await adminBookingService.getAnalytics();
      if (analyticsRes.success && analyticsRes.data?.summaryStats) {
        setStats(analyticsRes.data.summaryStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Load Bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit: 10,
        search: debouncedSearch,
        startDate,
        endDate
      };

      if (statusFilter !== 'All Status') {
        params.status = statusFilter;
      }

      const res = await adminBookingService.getAllBookings(params);
      if (res.success) {
        setBookings(res.data || []);
        setTotalPages(res.pagination?.pages || 1);
        setTotalEntries(res.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [page, debouncedSearch, statusFilter, startDate, endDate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleExport = () => {
    if (!bookings || bookings.length === 0) {
      toast.error('No bookings to export');
      return;
    }

    const headers = ['Order ID', 'Customer Name', 'Customer Phone', 'Service', 'Total Amount', 'Status', 'Payment Method', 'Payment Status', 'Date'];
    const rows = bookings.map(b => [
      `"${b.bookingNumber || b._id}"`,
      `"${b.userId?.name || b.customerName || 'Customer'}"`,
      `"${b.userId?.phone || b.customerPhone || 'N/A'}"`,
      `"${b.serviceName || b.serviceId?.title || b.items?.[0]?.serviceName || b.items?.[0]?.title || 'Service'}"`,
      b.finalAmount || 0,
      `"${b.status || 'pending'}"`,
      `"${b.paymentMethod || 'COD'}"`,
      `"${b.paymentStatus || 'pending'}"`,
      `"${new Date(b.createdAt).toLocaleString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bookings exported successfully');
  };

  const handleCancelBooking = async (e) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    try {
      setCancelling(true);
      const res = await adminBookingService.cancelBooking(
        cancelModalBooking._id || cancelModalBooking.id,
        cancelReason || 'Cancelled by Admin'
      );
      if (res.success) {
        toast.success('Booking cancelled successfully');
        setCancelModalBooking(null);
        setCancelReason('');
        fetchBookings();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'work_done') {
      return { label: s === 'work_done' ? 'Work Done' : 'Completed', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
    if (s === 'confirmed' || s === 'accepted' || s === 'assigned') {
      return { label: s.replace('_', ' '), bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
    if (s === 'in_progress' || s === 'journey_started' || s === 'visited') {
      return { label: s.replace('_', ' '), bg: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
    if (s === 'cancelled') {
      return { label: 'Cancelled', bg: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (s === 'rejected') {
      return { label: 'Rejected', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { label: s.replace('_', ' ') || 'Pending', bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  };

  const getPrimaryService = (b) => {
    if (b.serviceName) return b.serviceName;
    if (b.serviceId?.title) return b.serviceId.title;
    if (b.items && b.items.length > 0) {
      return b.items[0].serviceName || b.items[0].title || 'Service';
    }
    return 'Service';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <BookingStatsCard
          title="Awaiting"
          count={stats.pending}
          icon={FiClock}
          bgClass="bg-yellow-50/70 border-yellow-200/80"
          colorClass="text-yellow-600"
          isSelected={statusFilter === 'pending'}
          onClick={() => { setStatusFilter(statusFilter === 'pending' ? 'All Status' : 'pending'); setPage(1); }}
        />
        <BookingStatsCard
          title="Confirmed"
          count={stats.confirmed}
          icon={FiCheckCircle}
          bgClass="bg-blue-50/70 border-blue-200/80"
          colorClass="text-blue-600"
          isSelected={statusFilter === 'confirmed'}
          onClick={() => { setStatusFilter(statusFilter === 'confirmed' ? 'All Status' : 'confirmed'); setPage(1); }}
        />
        <BookingStatsCard
          title="In Progress"
          count={stats.inProgress}
          icon={FiBox}
          bgClass="bg-purple-50/70 border-purple-200/80"
          colorClass="text-purple-600"
          isSelected={statusFilter === 'in_progress'}
          onClick={() => { setStatusFilter(statusFilter === 'in_progress' ? 'All Status' : 'in_progress'); setPage(1); }}
        />
        <BookingStatsCard
          title="Completed"
          count={stats.completed}
          icon={FiTruck}
          bgClass="bg-emerald-50/70 border-emerald-200/80"
          colorClass="text-emerald-600"
          isSelected={statusFilter === 'completed'}
          onClick={() => { setStatusFilter(statusFilter === 'completed' ? 'All Status' : 'completed'); setPage(1); }}
        />
        <BookingStatsCard
          title="Cancelled"
          count={stats.cancelled}
          icon={FiXCircle}
          bgClass="bg-red-50/70 border-red-200/80"
          colorClass="text-red-600"
          isSelected={statusFilter === 'cancelled'}
          onClick={() => { setStatusFilter(statusFilter === 'cancelled' ? 'All Status' : 'cancelled'); setPage(1); }}
        />
        <BookingStatsCard
          title="Total Orders"
          count={stats.total}
          icon={FiShoppingBag}
          bgClass="bg-gray-50 border-gray-100"
          colorClass="text-gray-700"
          isSelected={false}
          onClick={() => { setStatusFilter('All Status'); setSearch(''); setStartDate(''); setEndDate(''); setPage(1); }}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-3 justify-between items-center">
        <div className="relative w-full lg:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Order #, Customer, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer shadow-sm"
          >
            <option value="All Status">All Status</option>
            <option value="pending">Pending / Awaiting</option>
            <option value="confirmed">Confirmed / Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed / Work Done</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
            <FiCalendar className="text-gray-400 w-3.5 h-3.5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none w-24"
              title="Start Date"
            />
            <span className="text-gray-400 text-[10px] font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none w-24"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-gray-400 hover:text-red-500 ml-1"
                title="Clear date filter"
              >
                <FiX className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/20 active:scale-95"
          >
            <FiDownload className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75">
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Service / Items</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total (₹)</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FiAlertCircle className="w-8 h-8 text-gray-300" />
                      <p className="font-semibold text-gray-700">No bookings found</p>
                      <p className="text-gray-400 text-[11px]">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const badge = getStatusBadge(booking.status);
                  const isMenuOpen = activeMenuId === booking._id;
                  const canCancel = booking.status !== 'completed' && booking.status !== 'work_done' && booking.status !== 'cancelled';

                  return (
                    <tr
                      key={booking._id}
                      onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Order ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-primary-700 group-hover:underline text-xs">
                          #{booking.bookingNumber || booking._id?.slice(-6).toUpperCase()}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">
                            {booking.userId?.name || booking.customerName || 'Customer'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {booking.userId?.phone || booking.customerPhone || 'No Phone'}
                          </p>
                        </div>
                      </td>

                      {/* Service / Items */}
                      <td className="px-4 py-3.5">
                        <div className="max-w-[200px]">
                          <p className="font-bold text-gray-800 text-xs truncate" title={getPrimaryService(booking)}>
                            {getPrimaryService(booking)}
                          </p>
                          <span className="text-blue-600 text-[10px] font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                            {booking.items?.length || 1} {booking.items?.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5">
                        <span className="font-extrabold text-gray-900 text-xs">
                          ₹{(booking.finalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-[11px] text-gray-800 capitalize font-bold">
                            {booking.paymentMethod?.replace('_', ' ') || 'Pay At Home'}
                          </p>
                          <span className={`text-[9px] font-bold uppercase ${
                            booking.paymentStatus === 'success' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {booking.paymentStatus || 'pending'}
                          </span>
                        </div>
                      </td>

                      {/* Order Date */}
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] text-gray-600 font-medium">
                          {new Date(booking.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : booking._id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Dropdown */}
                        {isMenuOpen && (
                          <div className="absolute right-4 top-10 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-left">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/admin/bookings/${booking._id}`);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiEye className="w-3.5 h-3.5 text-blue-600" /> View Details
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/admin/bookings/tracking?id=${booking._id}`);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiNavigation className="w-3.5 h-3.5 text-purple-600" /> Track Booking
                            </button>
                            {canCancel && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setCancelModalBooking(booking);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <FiSlash className="w-3.5 h-3.5" /> Cancel Order
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && bookings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50 gap-2">
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">
              Showing <span className="text-gray-800">{bookings.length}</span> of <span className="text-gray-800">{totalEntries}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModalBooking && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                  <FiAlertCircle className="w-5 h-5" /> Cancel Booking
                </div>
                <button onClick={() => setCancelModalBooking(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to cancel Order <span className="font-bold text-gray-800">#{cancelModalBooking.bookingNumber || cancelModalBooking._id}</span>?
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Reason for cancellation</label>
                <textarea
                  rows="3"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason (e.g., Customer requested cancellation, Partner unavailable)..."
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/20 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Bookings;

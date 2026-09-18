import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiLoader, FiCalendar, FiClock, FiUser, FiBriefcase } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import adminVendorService from '../../../../services/adminVendorService';

const VendorBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const loadBookings = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        status: filterStatus === 'all' ? undefined : filterStatus,
        search: searchQuery.trim() || undefined
      };
      const response = await adminVendorService.getAllBookings(params);
      if (response.success) {
        setBookings(response.data || []);
        setPagination(response.pagination || { page: 1, limit: 20, total: 0 });
      }
    } catch (error) {
      console.error('Error loading vendor bookings:', error);
      toast.error('Failed to load vendor bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filterStatus, searchQuery]);

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      searching: 'bg-amber-100 text-amber-800',
      accepted: 'bg-blue-100 text-blue-800',
      assigned: 'bg-indigo-100 text-indigo-800',
      visited: 'bg-cyan-100 text-cyan-800',
      work_done: 'bg-emerald-100 text-emerald-800',
      final_settlement: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-rose-100 text-rose-800'
    };
    return styles[s] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (b) => {
    const raw = b.scheduledDate || b.createdAt || b.bookingDate;
    if (!raw) return 'N/A';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatSlot = (b) => {
    if (b.scheduledTime) return b.scheduledTime;
    if (b.timeSlot) {
      if (typeof b.timeSlot === 'string') return b.timeSlot;
      if (b.timeSlot.start) return `${b.timeSlot.start} ${b.timeSlot.end ? `- ${b.timeSlot.end}` : ''}`.trim();
    }
    if (b.bookingSlot) return b.bookingSlot;
    if (b.bookingType === 'instant') return 'Instant (ASAP)';
    return 'Flexible Slot';
  };

  const getServiceName = (b) => {
    return b.serviceName || b.serviceId?.title || b.serviceId?.name || b.bookedItems?.[0]?.serviceName || b.serviceCategory || 'Service';
  };

  return (
    <div className="space-y-6">
      <CardShell icon={FiBriefcase}>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FiSearch className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by partner, customer, booking ID, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="visited">Visited</option>
            <option value="work_done">Work Done</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="w-8 h-8 text-gray-400 animate-spin mr-3" />
              <span className="text-gray-600">Loading partner bookings...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No partner bookings found</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookings.map((booking) => (
                <motion.div
                  key={booking._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-teal-50 p-3 rounded-lg flex-shrink-0">
                        <FiBriefcase className="text-teal-600 w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h4 className="font-bold text-gray-900">{getServiceName(booking)}</h4>
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {booking.bookingNumber || booking._id}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(booking.status)}`}>
                            {(booking.status || 'PENDING').toString().toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <FiBriefcase className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            <span>Partner: <span className="font-medium text-gray-800">{booking.vendorId?.businessName || booking.vendorId?.name || 'Unassigned'}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span>Customer: <span className="font-medium text-gray-800">{booking.userId?.name || 'Customer'}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiCalendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span>Date: <span className="font-medium text-gray-800">{formatDate(booking)}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiClock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span>Slot: <span className="font-medium text-gray-800">{formatSlot(booking)}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-lg font-bold text-gray-900">
                        ₹{booking.finalAmount ?? booking.basePrice ?? booking.amount ?? 0}
                      </div>
                      <button
                        onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                        className="text-sm text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i}
                onClick={() => loadBookings(i + 1)}
                className={`w-10 h-10 rounded-lg font-semibold transition-all ${pagination.page === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </CardShell>
    </div>
  );
};

export default VendorBookings;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiFilter, FiDownload, FiUser, FiCheckCircle,
  FiClock, FiXCircle, FiAlertCircle, FiDollarSign, FiRefreshCw,
  FiTrendingDown, FiTrendingUp, FiCreditCard, FiCalendar, FiX,
  FiEye, FiShoppingBag
} from 'react-icons/fi';
import { adminTransactionService } from '../../../../services/adminTransactionService';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../../../utils/csvExport';

const UserPayments = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: ''
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, debouncedSearch, filters.status, filters.type, filters.startDate, filters.endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [response, statsRes] = await Promise.all([
        adminTransactionService.getAllTransactions({
          page: pagination.page,
          limit: pagination.limit,
          search: debouncedSearch,
          status: filters.status,
          type: filters.type,
          startDate: filters.startDate,
          endDate: filters.endDate,
          entity: 'user'
        }),
        adminTransactionService.getTransactionStats({ entity: 'user' })
      ]);

      if (response.success && response.data) {
        setTransactions(response.data);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total || 0,
            pages: response.pagination.pages || 1
          }));
        }
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      toast.error('Failed to load user transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('User payments refreshed');
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed':
      case 'success':
        return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FiCheckCircle };
      case 'pending':
        return { label: 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: FiClock };
      case 'failed':
        return { label: 'Failed', bg: 'bg-red-50 text-red-700 border-red-200', icon: FiXCircle };
      case 'refunded':
        return { label: 'Refunded', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: FiAlertCircle };
      default:
        return { label: s || 'Unknown', bg: 'bg-gray-50 text-gray-700 border-gray-200', icon: FiClock };
    }
  };

  const getTypeBadge = (type) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'credit': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'payment': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'cash_collected': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'debit': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'refund': return 'text-purple-700 bg-purple-50 border-purple-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    exportToCSV(transactions, 'user_payments', [
      { key: '_id', label: 'Transaction ID' },
      { key: 'referenceId', label: 'Reference ID' },
      { key: 'bookingId.bookingNumber', label: 'Order ID' },
      { key: 'userId.name', label: 'Customer Name' },
      { key: 'userId.phone', label: 'Phone' },
      { key: 'userId.email', label: 'Email' },
      { key: 'type', label: 'Payment Type' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'amount', label: 'Amount (INR)', type: 'currency' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Date', type: 'datetime' },
      { key: 'description', label: 'Description' }
    ]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Collected */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total Customer Payments</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Online & COD collections</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FiDollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* User Refunds */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">User Refunds</p>
            <h3 className="text-2xl font-extrabold text-red-600 mt-1">{formatCurrency(stats.totalRefunds)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Cancelled / returned payments</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <FiTrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Net User Volume */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Net User Revenue</p>
            <h3 className="text-2xl font-extrabold text-blue-700 mt-1">{formatCurrency(stats.netRevenue)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Net realized from customers</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <FiTrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-3 justify-between items-center">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by ID, customer, order #..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns, Dates, Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer shadow-xs"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer shadow-xs"
          >
            <option value="all">All Types</option>
            <option value="payment">Online Payment</option>
            <option value="cash_collected">Cash Collected (COD)</option>
            <option value="credit">Wallet Credit</option>
            <option value="debit">Wallet Debit</option>
            <option value="refund">Refund</option>
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 shadow-xs">
            <FiCalendar className="text-gray-400 w-3.5 h-3.5" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none w-24"
              title="Start Date"
            />
            <span className="text-gray-400 text-[10px] font-bold">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none w-24"
              title="End Date"
            />
            {(filters.startDate || filters.endDate) && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))}
                className="text-gray-400 hover:text-red-500 ml-0.5"
                title="Clear Dates"
              >
                <FiX className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100">
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer Details</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Reference</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Type</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-16 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading user transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-16 text-center text-xs text-gray-400">
                    <FiUser className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-bold text-gray-700 text-sm">No user payments found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">User payments for bookings and orders will appear here.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const badge = getStatusBadge(tx.status);
                  const Icon = badge.icon;
                  const customerName = tx.userId?.name || tx.bookingId?.customerName || tx.bookingId?.userId?.name || 'Customer';
                  const customerPhone = tx.userId?.phone || tx.bookingId?.customerPhone || 'N/A';
                  const customerEmail = tx.userId?.email || tx.bookingId?.userId?.email || '';
                  const orderNumber = tx.bookingId?.bookingNumber || (tx.bookingId?._id ? tx.bookingId._id.slice(-6).toUpperCase() : null);
                  const isPositive = ['credit', 'payment', 'cash_collected'].includes(tx.type);

                  return (
                    <tr key={tx._id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Transaction ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-primary-700 text-xs font-mono">
                          #{tx.referenceId || tx._id.slice(-8).toUpperCase()}
                        </span>
                      </td>

                      {/* Customer Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{customerName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{customerPhone || customerEmail || 'No contact'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Order Reference */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {orderNumber ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                            <FiShoppingBag className="w-3 h-3" />
                            <span>Order #{orderNumber}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Direct Tx</span>
                        )}
                      </td>

                      {/* Payment Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTypeBadge(tx.type)}`}>
                          {tx.type?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-700 font-semibold capitalize">
                          {tx.paymentMethod?.replace('_', ' ') || (tx.type === 'cash_collected' ? 'Pay At Home (COD)' : 'Online')}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`font-extrabold text-xs ${isPositive ? 'text-emerald-700' : 'text-gray-900'}`}>
                          {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {formatDate(tx.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
              Showing <span className="text-gray-800">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-gray-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-gray-800">{pagination.total}</span> transactions
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 text-xs font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                    <FiCreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">User Payment Details</h3>
                    <p className="text-[10px] text-gray-400 font-mono">#{selectedTx.referenceId || selectedTx._id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Customer Name</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {selectedTx.userId?.name || selectedTx.bookingId?.customerName || 'Customer'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Customer Phone</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {selectedTx.userId?.phone || selectedTx.bookingId?.customerPhone || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Amount</p>
                  <p className="font-extrabold text-emerald-700 text-sm mt-0.5">
                    {formatCurrency(selectedTx.amount)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Status</p>
                  <p className="font-bold text-gray-900 mt-0.5 capitalize">{selectedTx.status}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Payment Method</p>
                  <p className="font-bold text-gray-900 mt-0.5 capitalize">{selectedTx.paymentMethod || 'Online'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Transaction Type</p>
                  <p className="font-bold text-gray-900 mt-0.5 uppercase">{selectedTx.type?.replace('_', ' ')}</p>
                </div>
              </div>

              {selectedTx.bookingId && (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs">
                  <p className="text-blue-600 font-bold uppercase text-[10px]">Associated Booking</p>
                  <p className="font-bold text-gray-900 mt-1">
                    Order #{selectedTx.bookingId.bookingNumber || selectedTx.bookingId._id}
                  </p>
                  {selectedTx.bookingId.serviceName && (
                    <p className="text-gray-600 text-[11px] mt-0.5">{selectedTx.bookingId.serviceName}</p>
                  )}
                </div>
              )}

              {selectedTx.description && (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Description</p>
                  <p>{selectedTx.description}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UserPayments;

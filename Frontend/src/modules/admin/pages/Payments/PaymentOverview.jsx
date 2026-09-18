import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiSearch, FiFilter, FiDownload, FiDollarSign, FiTrendingUp,
  FiTrendingDown, FiAlertCircle, FiCheckCircle, FiClock, FiXCircle,
  FiRefreshCw, FiCreditCard, FiUser, FiBriefcase
} from 'react-icons/fi';
import { adminTransactionService } from '../../../../services/adminTransactionService';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../../../utils/csvExport';

const PaymentOverview = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all'
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
  }, [pagination.page, debouncedSearch, filters.status, filters.type]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [statsRes, transactionsRes] = await Promise.all([
        adminTransactionService.getTransactionStats(),
        adminTransactionService.getAllTransactions({
          page: pagination.page,
          limit: pagination.limit,
          search: debouncedSearch,
          status: filters.status,
          type: filters.type
        })
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data);
        setPagination(prev => ({
          ...prev,
          total: transactionsRes.pagination?.total || 0,
          pages: transactionsRes.pagination?.pages || 1
        }));
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Payment data refreshed');
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
    exportToCSV(transactions, 'payment_transactions', [
      { key: '_id', label: 'Transaction ID' },
      { key: 'userId.name', label: 'User Name' },
      { key: 'userId.phone', label: 'Phone' },
      { key: 'userId.email', label: 'Email' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Date', type: 'datetime' },
      { key: 'razorpayOrderId', label: 'Razorpay Order ID' },
      { key: 'referenceId', label: 'Reference ID' },
      { key: 'description', label: 'Description' }
    ]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total Volume</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Gross transaction value</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
            <FiDollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Refunds */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total Refunds</p>
            <h3 className="text-2xl font-extrabold text-red-600 mt-1">{formatCurrency(stats.totalRefunds)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Refunded to customers</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <FiTrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Net Realized</p>
            <h3 className="text-2xl font-extrabold text-blue-700 mt-1">{formatCurrency(stats.netRevenue)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Net completed revenue</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <FiTrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by ID, customer, vendor, ref..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
          />
        </div>

        {/* Dropdown Filters & Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="refund">Refund</option>
          </select>

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
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">User / Entity</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Type</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-16 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading payment transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-16 text-center text-xs text-gray-400">
                    <FiCreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-bold text-gray-700 text-sm">No transactions found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Payments and transactions will be recorded here as orders are placed.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const badge = getStatusBadge(tx.status);
                  const Icon = badge.icon;
                  const entityName = tx.userId?.name || tx.bookingId?.customerName || tx.vendorId?.businessName || tx.vendorId?.name || tx.workerId?.name || 'Customer';
                  const entityPhone = tx.userId?.phone || tx.bookingId?.customerPhone || tx.vendorId?.phone || '';
                  const orderRef = tx.bookingId?.bookingNumber || (tx.bookingId?._id ? tx.bookingId._id.slice(-6).toUpperCase() : null);

                  return (
                    <tr key={tx._id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Transaction ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-primary-700 text-xs font-mono">
                          #{tx.referenceId || tx._id.slice(-8).toUpperCase()}
                        </span>
                        {orderRef && (
                          <span className="block text-[10px] text-gray-400 font-medium mt-0.5">
                            Order #{orderRef}
                          </span>
                        )}
                      </td>

                      {/* User / Entity */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                            {entityName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{entityName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{entityPhone || tx.userId?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTypeBadge(tx.type)}`}>
                          {tx.type?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`font-extrabold text-xs ${
                          ['credit', 'payment', 'cash_collected'].includes(tx.type) ? 'text-emerald-700' : 'text-gray-900'
                        }`}>
                          {['credit', 'payment', 'cash_collected'].includes(tx.type) ? '+' : '-'}{formatCurrency(tx.amount)}
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

                      {/* Reference */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="text-[10px] text-gray-400 font-mono" title={tx.razorpayOrderId || tx.referenceId || tx._id}>
                          {(tx.razorpayOrderId || tx.referenceId || tx._id).slice(0, 14)}...
                        </span>
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
    </motion.div>
  );
};

export default PaymentOverview;
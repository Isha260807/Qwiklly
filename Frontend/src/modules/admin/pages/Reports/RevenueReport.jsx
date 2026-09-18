import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiDollarSign, FiTrendingUp, FiPieChart, FiDownload,
  FiRefreshCw, FiSearch, FiCalendar, FiArrowUpRight, FiCreditCard,
  FiCheckCircle, FiClock, FiShoppingBag, FiPercent
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { toast } from 'react-hot-toast';
import adminReportService from '../../../../services/adminReportService';
import CardShell from '../UserCategories/components/CardShell';
import { exportToCSV } from '../../../../utils/csvExport';

const RevenueReport = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminReportService.getRevenueReport({ period });
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Revenue report error:', error);
      toast.error('Failed to load revenue report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Revenue report refreshed');
  };

  // Export revenue trends as CSV
  const handleExportTrends = () => {
    if (!data?.revenueTrends || data.revenueTrends.length === 0) {
      toast.error('No revenue data to export');
      return;
    }
    exportToCSV(data.revenueTrends, `revenue_trends_${period}`, [
      { key: '_id', label: 'Period' },
      { key: 'revenue', label: 'Total Revenue (₹)', type: 'currency' },
      { key: 'commission', label: 'Platform Commission (₹)', type: 'currency' },
      { key: 'bookings', label: 'Total Bookings', type: 'number' }
    ]);
  };

  // Export revenue by service as CSV
  const handleExportByService = () => {
    if (!data?.revenueByService || data.revenueByService.length === 0) {
      toast.error('No service data to export');
      return;
    }
    exportToCSV(data.revenueByService, `revenue_by_service_${period}`, [
      { key: '_id', label: 'Service' },
      { key: 'revenue', label: 'Revenue (₹)', type: 'currency' },
      { key: 'commission', label: 'Commission (₹)', type: 'currency' },
      { key: 'count', label: 'Bookings', type: 'number' }
    ]);
  };

  // Export recent transactions
  const handleExportTransactions = () => {
    if (!data?.recentTransactions || data.recentTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    exportToCSV(data.recentTransactions, `revenue_transactions_${period}`, [
      { key: 'bookingNumber', label: 'Booking Number' },
      { key: 'service', label: 'Service' },
      { key: 'customer', label: 'Customer' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'amount', label: 'Gross Amount (₹)', type: 'currency' },
      { key: 'commission', label: 'Commission (₹)', type: 'currency' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date', type: 'date' }
    ]);
  };

  const COLORS = ['#2874F0', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

  const filteredTransactions = (data?.recentTransactions || []).filter(item => {
    const q = search.toLowerCase();
    const bNum = (item.bookingNumber || '').toLowerCase();
    const srv = (item.service || '').toLowerCase();
    const cust = (item.customer || '').toLowerCase();
    const vend = (item.vendor || '').toLowerCase();
    return !q || bNum.includes(q) || srv.includes(q) || cust.includes(q) || vend.includes(q);
  });

  const summary = data?.summary || {
    totalRevenue: 0,
    platformCommission: 0,
    vendorPayout: 0,
    totalBookings: 0,
    avgOrderValue: 0,
    growth: '+0%'
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <FiTrendingUp className="text-primary-600 w-4 h-4" />
            Revenue & Financial Analytics
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Real-time breakdown of GMV, commission margins, and vendor payouts</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="bg-gray-100/80 p-1 rounded-xl flex gap-1 border border-gray-200/60">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  period === p
                    ? 'bg-white text-primary-700 shadow-xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            title="Refresh Data"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportTrends}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Revenue (GMV)</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FiDollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-gray-900">₹{(summary.totalRevenue || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
            <FiArrowUpRight className="w-3 h-3" /> {summary.growth || '+14.5%'} vs last cycle
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform Commission</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FiTrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-emerald-700">₹{(summary.platformCommission || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Avg 20% commission</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vendor Payouts</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <FiCreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-purple-700">₹{(summary.vendorPayout || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Disbursed & Pending</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed Orders</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <FiShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-gray-900">{summary.totalBookings || 0}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Revenue generating</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Order Value (AOV)</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FiPercent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-indigo-700">₹{(summary.avgOrderValue || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Per fulfilled booking</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue & Commission Area Trend */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiTrendingUp className="text-primary-600" />
                Revenue & Platform Commission Trends ({period.toUpperCase()})
              </h3>
              <p className="text-[10px] text-gray-400">Total gross transaction volume vs company profit margin</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Total Revenue
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Commission
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenueTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2874F0" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2874F0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="_id"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      fontSize: '11px'
                    }}
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Total Revenue"
                    stroke="#2874F0"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    name="Commission"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorComm)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue by Payment Method Donut */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiPieChart className="text-amber-500" />
                Payment Channels
              </h3>
              <p className="text-[10px] text-gray-400">Distribution across payment modes</p>
            </div>
          </div>

          <div className="h-[210px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.revenueByPaymentMethod || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="revenue"
                    nameKey="_id"
                  >
                    {(data?.revenueByPaymentMethod || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      fontSize: '11px'
                    }}
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-50 max-h-[80px] overflow-y-auto">
            {(data?.revenueByPaymentMethod || []).map((pm, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px]">
                <span className="flex items-center gap-1.5 font-medium text-gray-600 capitalize truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {pm._id || 'Online'}
                </span>
                <span className="font-bold text-gray-800">₹{(pm.revenue || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue by Service Categories */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div>
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <FiShoppingBag className="text-primary-600" />
              Top Services by Revenue & Margins
            </h3>
            <p className="text-[10px] text-gray-400">Total earnings breakdown per catalog service</p>
          </div>
          <button
            onClick={handleExportByService}
            className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-semibold"
          >
            <FiDownload className="w-3.5 h-3.5" /> Export Service CSV
          </button>
        </div>

        <div className="h-[220px] w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueByService || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="_id"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    fontSize: '11px'
                  }}
                  formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, name === 'revenue' ? 'Gross Revenue' : 'Commission']}
                />
                <Bar dataKey="revenue" name="Gross Revenue" fill="#2874F0" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="commission" name="Commission" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue Transactions Ledger Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-3.5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Recent Revenue Transactions</h3>
            <p className="text-[10px] text-gray-400">Order-level revenue and platform commission records</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search booking, customer, vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <button
              onClick={handleExportTransactions}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
            >
              <FiDownload className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Booking Info</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer & Vendor</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Gross Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Commission</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-xs text-gray-400">
                    No revenue transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={tx._id || idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-xs text-gray-900 font-mono">{tx.bookingNumber}</p>
                      <p className="text-[10px] text-gray-400">
                        {tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{tx.service}</p>
                      <span className="text-[9px] text-gray-400 capitalize">{tx.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-gray-900">{tx.customer}</p>
                      <p className="text-[10px] text-gray-400">Vendor: {tx.vendor}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-extrabold text-gray-900">
                        ₹{(tx.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-extrabold text-emerald-600">
                        +₹{(tx.commission || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tx.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default RevenueReport;



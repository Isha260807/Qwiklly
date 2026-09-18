import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiShoppingBag, FiPieChart, FiBarChart2, FiDownload,
  FiRefreshCw, FiCheckCircle, FiXCircle, FiClock, FiTrendingUp
} from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { toast } from 'react-hot-toast';
import adminReportService from '../../../../services/adminReportService';
import CardShell from '../UserCategories/components/CardShell';
import { exportToCSV } from '../../../../utils/csvExport';

const BookingReport = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('monthly');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminReportService.getBookingReport({ period });
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Booking report error:', error);
      toast.error('Failed to load booking report');
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
    toast.success('Booking report refreshed');
  };

  // Export monthly trends
  const handleExportMonthly = () => {
    if (!data?.monthlyTrends || data.monthlyTrends.length === 0) {
      toast.error('No monthly data to export');
      return;
    }
    exportToCSV(data.monthlyTrends, `booking_${period}_trends`, [
      { key: '_id', label: 'Period' },
      { key: 'total', label: 'Total Bookings', type: 'number' },
      { key: 'completed', label: 'Completed', type: 'number' },
      { key: 'cancelled', label: 'Cancelled', type: 'number' }
    ]);
  };

  // Export status distribution
  const handleExportStatus = () => {
    if (!data?.statusDistribution || data.statusDistribution.length === 0) {
      toast.error('No status data to export');
      return;
    }
    exportToCSV(data.statusDistribution, 'booking_status_distribution', [
      { key: 'name', label: 'Status' },
      { key: 'count', label: 'Count', type: 'number' }
    ]);
  };

  // Export service distribution
  const handleExportService = () => {
    if (!data?.serviceDistribution || data.serviceDistribution.length === 0) {
      toast.error('No service data to export');
      return;
    }
    exportToCSV(data.serviceDistribution, 'booking_by_service', [
      { key: '_id', label: 'Service' },
      { key: 'count', label: 'Bookings', type: 'number' },
      { key: 'revenue', label: 'Revenue (₹)', type: 'currency' }
    ]);
  };

  const COLORS = ['#10B981', '#2874F0', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'];

  const summary = data?.summary || {
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    completionRate: '0%'
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <FiShoppingBag className="text-amber-500 w-4 h-4" />
            Booking Analytics & Fulfillment
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Order volumes, completion rates, and status distributions</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="bg-gray-100/80 p-1 rounded-xl flex gap-1 border border-gray-200/60">
            {['daily', 'monthly'].map((p) => (
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
            onClick={handleExportMonthly}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Bookings</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FiShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-gray-900">{(summary.totalBookings || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">All time orders</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FiCheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700">{(summary.completedBookings || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-0.5">{summary.completionRate} Fulfillment Rate</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">In-Progress / Pending</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <FiClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700">{(summary.pendingBookings || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Active fulfillment</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cancelled / Rejected</span>
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
              <FiXCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-red-600">{(summary.cancelledBookings || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Cancellation volume</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Booking Trends Bar Chart */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiTrendingUp className="text-primary-600" />
                Booking Trends ({period.toUpperCase()})
              </h3>
              <p className="text-[10px] text-gray-400">Total vs fulfilled vs cancelled orders</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-indigo-600">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Total
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Completed
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Cancelled
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
                <BarChart data={data?.monthlyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                  <Bar dataKey="total" name="Total Bookings" fill="#6366F1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution Donut */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiPieChart className="text-amber-500" />
                Status Distribution
              </h3>
              <p className="text-[10px] text-gray-400">Current lifecycle states</p>
            </div>
            <button onClick={handleExportStatus} className="text-xs text-gray-500 hover:text-emerald-600">
              <FiDownload className="w-3.5 h-3.5" />
            </button>
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
                    data={data?.statusDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="name"
                  >
                    {(data?.statusDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-50 max-h-[80px] overflow-y-auto">
            {(data?.statusDistribution || []).map((st, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px]">
                <span className="flex items-center gap-1.5 font-medium text-gray-600 truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {st.name}
                </span>
                <span className="font-bold text-gray-800">{st.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings by Service Category */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <FiBarChart2 className="text-primary-600" />
              Bookings by Service Category
            </h3>
            <p className="text-[10px] text-gray-400">Order volume demand per catalog offering</p>
          </div>
          <button onClick={handleExportService} className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-semibold">
            <FiDownload className="w-3.5 h-3.5" /> Export Service CSV
          </button>
        </div>

        <div className="h-[240px] w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.serviceDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                <Bar dataKey="count" name="Bookings" fill="#2874F0" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {(data?.serviceDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BookingReport;



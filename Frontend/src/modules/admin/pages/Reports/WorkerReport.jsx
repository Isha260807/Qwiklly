import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiUsers, FiTrendingUp, FiUserCheck, FiDownload,
  FiRefreshCw, FiCheckCircle, FiSearch, FiShoppingBag, FiHeart
} from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { toast } from 'react-hot-toast';
import adminReportService from '../../../../services/adminReportService';
import CardShell from '../UserCategories/components/CardShell';
import { exportToCSV } from '../../../../utils/csvExport';

const WorkerReport = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminReportService.getCustomerReport();
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Customer report error:', error);
      toast.error('Failed to load customer analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Customer analytics refreshed');
  };

  const handleExportCustomers = () => {
    if (!data?.topUsers || data.topUsers.length === 0) {
      toast.error('No customer data to export');
      return;
    }
    exportToCSV(data.topUsers, 'top_customers_report', [
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'bookingCount', label: 'Total Bookings', type: 'number' },
      { key: 'totalSpent', label: 'Total Spent (₹)', type: 'currency' }
    ]);
  };

  const COLORS = ['#2874F0', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

  const filteredTopUsers = (data?.topUsers || []).filter(u => {
    const q = search.toLowerCase();
    const name = (u.name || '').toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return !q || name.includes(q) || phone.includes(q) || email.includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <FiUsers className="text-indigo-600 w-4 h-4" />
            Customer Analytics & User Engagement
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Customer retention, verification status, and top spenders</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            title="Refresh Data"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCustomers}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered Users</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FiUsers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-gray-900">{(data?.totalUsers || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-0.5">{data?.growth || '+0%'} Monthly Growth</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Customers</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FiUserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700">{(data?.activeUsers || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Active profiles</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Repeat Customer Rate</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <FiHeart className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-purple-700">{data?.retentionRate || '0%'}</p>
          <span className="text-[10px] text-purple-600 font-bold mt-0.5">Booked 2+ times</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Customer Orders</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <FiShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700">{(data?.totalBookings || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Cumulative bookings</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Acquisition Trend Area Chart */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiTrendingUp className="text-primary-600" />
                Customer Registration Growth (Last 6 Months)
              </h3>
              <p className="text-[10px] text-gray-400">Monthly new customer signups</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUserGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} formatter={(val) => [val, 'New Users']} />
                  <Area type="monotone" dataKey="count" name="New Customers" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUserGrowth)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Verification Status Donut */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiUserCheck className="text-indigo-600" />
                Profile Verification
              </h3>
              <p className="text-[10px] text-gray-400">Phone & email status</p>
            </div>
          </div>

          <div className="h-[200px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.verificationStatus || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="name"
                  >
                    {(data?.verificationStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-50 max-h-[80px] overflow-y-auto">
            {(data?.verificationStatus || []).map((st, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px]">
                <span className="flex items-center gap-1.5 font-medium text-gray-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {st.name}
                </span>
                <span className="font-bold text-gray-800">{st.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Customers Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-3.5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Top Customers by Spending</h3>
            <p className="text-[10px] text-gray-400">High-value customers ranked by cumulative order volume</p>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search customer by name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rank & Customer</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone & Email</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Total Bookings</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTopUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-xs text-gray-400">
                    No customer data found
                  </td>
                </tr>
              ) : (
                filteredTopUsers.map((user, idx) => (
                  <tr key={user._id || idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          idx === 0 ? 'bg-amber-100 text-amber-800' :
                          idx === 1 ? 'bg-gray-200 text-gray-700' :
                          idx === 2 ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-gray-900">{user.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-700">{user.phone || '-'}</p>
                      <p className="text-[10px] text-gray-400">{user.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {user.bookingCount || 0} bookings
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-extrabold text-gray-900">
                        ₹{(user.totalSpent || 0).toLocaleString('en-IN')}
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

export default WorkerReport;


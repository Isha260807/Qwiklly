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

const CustomerReport = () => {
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <FiUsers size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Registered</p>
              <p className="text-base font-black text-gray-900 mt-0.5">{data?.stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <FiUserCheck size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verified Customers</p>
              <p className="text-base font-black text-gray-900 mt-0.5">{data?.stats?.verifiedUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <FiShoppingBag size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">With Bookings</p>
              <p className="text-base font-black text-gray-900 mt-0.5">{data?.stats?.usersWithBookings || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-pink-50 text-pink-600 shrink-0">
              <FiHeart size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Repeat Customers</p>
              <p className="text-base font-black text-gray-900 mt-0.5">{data?.stats?.repeatCustomers || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Top Spending Customers</h3>
            <p className="text-[10px] text-gray-400">Ranked by total expenditure and completed bookings</p>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4"># Rank</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Bookings</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">Loading customer analytics...</td>
                </tr>
              ) : filteredTopUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">No customers found matching your search.</td>
                </tr>
              ) : (
                filteredTopUsers.map((user, idx) => (
                  <tr key={user._id || idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-400">#{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{user.name || 'Anonymous User'}</div>
                      <div className="text-[10px] text-gray-400">ID: {user._id?.substring(user._id.length - 6)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-700">{user.phone || 'N/A'}</div>
                      <div className="text-[10px] text-gray-400">{user.email || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-primary-600">
                      {user.bookingCount || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">
                      ₹{(user.totalSpent || 0).toLocaleString('en-IN')}
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

export default CustomerReport;

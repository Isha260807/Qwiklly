import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiBriefcase, FiTrendingUp, FiStar, FiDownload,
  FiRefreshCw, FiCheckCircle, FiClock, FiUsers, FiSearch
} from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { toast } from 'react-hot-toast';
import adminReportService from '../../../../services/adminReportService';
import CardShell from '../UserCategories/components/CardShell';
import { exportToCSV } from '../../../../utils/csvExport';

const VendorReport = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminReportService.getVendorReport();
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Vendor report error:', error);
      toast.error('Failed to load vendor report');
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
    toast.success('Vendor report refreshed');
  };

  const handleExportVendors = () => {
    if (!data?.topVendors || data.topVendors.length === 0) {
      toast.error('No vendor data to export');
      return;
    }
    exportToCSV(data.topVendors, 'top_vendors_report', [
      { key: 'businessName', label: 'Business Name' },
      { key: 'name', label: 'Owner Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'bookingsCount', label: 'Completed Bookings', type: 'number' },
      { key: 'totalRevenue', label: 'Total Revenue (₹)', type: 'currency' }
    ]);
  };

  const COLORS = ['#2874F0', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

  const filteredTopVendors = (data?.topVendors || []).filter(v => {
    const q = search.toLowerCase();
    const bName = (v.businessName || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    const phone = (v.phone || '').toLowerCase();
    return !q || bName.includes(q) || name.includes(q) || phone.includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <FiBriefcase className="text-emerald-600 w-4 h-4" />
            Vendor Analytics & Partner Performance
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Top-performing partners, onboarding status, and revenue generation</p>
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
            onClick={handleExportVendors}
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
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Partners</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FiUsers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-gray-900">{(data?.totalVendors || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-0.5">{data?.growth || '+0%'} Monthly Growth</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active & Online</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FiCheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700">{(data?.activeVendors || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Ready for dispatch</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Approved Accounts</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <FiBriefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-purple-700">{(data?.approvedVendors || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Verified documents</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Verification</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <FiClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700">{(data?.pendingVendors || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Awaiting KYC review</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Vendors by Revenue Bar Chart */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiTrendingUp className="text-primary-600" />
                Top Partners by Revenue Generated
              </h3>
              <p className="text-[10px] text-gray-400">Total gross earnings per vendor</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topVendors || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="businessName" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']} />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#2874F0" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {(data?.topVendors || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Approval Status Donut */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FiBriefcase className="text-amber-500" />
                Partner Verification Status
              </h3>
              <p className="text-[10px] text-gray-400">KYC & account states</p>
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

      {/* Top Vendors Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-3.5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Partner Leaderboard & Rankings</h3>
            <p className="text-[10px] text-gray-400">Detailed performance metrics across top active vendors</p>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search partner by name, phone..."
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
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rank & Partner</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Completed Orders</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTopVendors.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-xs text-gray-400">
                    No vendor performance data found
                  </td>
                </tr>
              ) : (
                filteredTopVendors.map((vendor, idx) => (
                  <tr key={vendor._id || idx} className="hover:bg-gray-50/60 transition-colors">
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
                          <p className="font-bold text-xs text-gray-900">{vendor.businessName || vendor.name}</p>
                          <p className="text-[10px] text-gray-400">{vendor.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-700">{vendor.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {vendor.bookingsCount || 0} orders
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-extrabold text-gray-900">
                        ₹{(vendor.totalRevenue || 0).toLocaleString('en-IN')}
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

export default VendorReport;


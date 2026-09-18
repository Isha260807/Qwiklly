import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiPieChart,
  FiTrendingUp,
  FiUsers,
  FiBriefcase,
  FiDollarSign,
  FiActivity,
  FiLoader,
  FiPhone,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import adminReportService from '../../../../services/adminReportService';
import { formatCurrency } from '../../utils/adminHelpers';

const STATUS_COLORS = {
  APPROVED: '#10B981',
  PENDING: '#F59E0B',
  REJECTED: '#EF4444',
  SUSPENDED: '#8B5CF6'
};

const VendorAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminReportService.getVendorReport();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Vendor analytics error:', error);
      toast.error('Failed to load vendor analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading partner analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  const totalVendors = data.totalVendors || 0;
  const approvedCount = data.approvedVendors || 0;
  const activeRate = totalVendors > 0 ? Math.round((approvedCount / totalVendors) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Partner & Vendor Analytics</h2>
          <p className="text-xs text-gray-500">Live platform vendor performance and onboarding statistics</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {data.activeVendors || totalVendors} Active
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Total Registered Partners</p>
          <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{totalVendors}</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Verified
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Approved Partners</p>
          <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{approvedCount}</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <FiTrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Month-over-Month
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Partner Growth Rate</p>
          <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{data.growth || '0%'}</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <FiActivity className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              Approval Rate
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Approval Ratio</p>
          <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{activeRate}%</h3>
        </div>
      </div>

      {/* Row 1: Approval Status Donut & Top Performing Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <CardShell icon={FiPieChart} title="Partner Approval Breakdown">
          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {data.statusDistribution.map((entry, index) => {
                    const fill = STATUS_COLORS[entry.name] || '#3B82F6';
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} Partners`, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Top Performers */}
        <CardShell icon={FiTrendingUp} title="Top Performing Partners">
          <div className="space-y-3 pt-2">
            {data.topVendors && data.topVendors.length > 0 ? (
              data.topVendors.map((vendor, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/80 rounded-xl transition border border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-sm text-gray-900 truncate">{vendor.businessName || vendor.name}</p>
                      <p className="text-xs text-gray-500">{vendor.phone || (Array.isArray(vendor.service) ? vendor.service.join(', ') : 'Service Partner')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="font-bold text-sm text-gray-900">{formatCurrency(vendor.totalRevenue || 0)}</span>
                    <p className="text-xs text-teal-600 font-semibold">{vendor.bookingsCount} jobs</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-gray-500 py-8">No partner job performance recorded yet.</p>
            )}
          </div>
        </CardShell>
      </div>

      {/* Row 2: Registration Trend */}
      <CardShell icon={FiTrendingUp} title="Partner Onboarding Timeline (Past 6 Months)">
        <div className="h-[260px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="vendorRegTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="monthLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <Tooltip
                formatter={(val) => [`${val} New Partners`, 'Onboarding']}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0D9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#vendorRegTrend)"
                dot={{ r: 4, fill: '#0D9488', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#0F766E' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* Row 3: Recently Registered Partners */}
      {data.recentVendors && data.recentVendors.length > 0 && (
        <CardShell icon={FiUsers} title="Recently Onboarded Partners">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {data.recentVendors.map((v, i) => (
              <div
                key={v._id || i}
                className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-gray-900 truncate">{v.businessName || v.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                    v.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {(v.approvalStatus || 'pending').toUpperCase()}
                  </span>
                </div>
                {v.phone && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{v.phone}</span>
                  </p>
                )}
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5 pt-1 border-t border-gray-100">
                  <FiCalendar className="w-3.5 h-3.5" />
                  <span>Joined {new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </p>
              </div>
            ))}
          </div>
        </CardShell>
      )}
    </motion.div>
  );
};

export default VendorAnalytics;

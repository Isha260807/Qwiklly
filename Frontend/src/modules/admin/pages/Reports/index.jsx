import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiTrendingUp,
  FiDollarSign,
  FiUsers,
  FiShoppingBag,
  FiDownload,
  FiPieChart,
  FiBarChart2,
  FiArrowRight,
  FiActivity,
  FiBriefcase,
  FiCalendar,
  FiRefreshCw
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { toast } from 'react-hot-toast';
import dashboardService from '../../services/dashboardService';
import CardShell from '../UserCategories/components/CardShell';

// Import sub-report components
import RevenueReport from './RevenueReport';
import BookingReport from './BookingReport';
import VendorReport from './VendorReport';
import WorkerReport from './WorkerReport';

const ReportsOverview = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [bookingTrends, setBookingTrends] = useState([]);
  const [growthData, setGrowthData] = useState([]);
  const [period, setPeriod] = useState('monthly');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, revenueRes, trendsRes, growthRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRevenue({ period }),
        dashboardService.getBookingTrends({ days: 30 }),
        dashboardService.getGrowthMetrics({ days: 30 })
      ]);

      if (statsRes.success) setStats(statsRes.data.stats);
      if (revenueRes.success) setRevenueData(revenueRes.data.revenueData || []);
      if (trendsRes.success) setBookingTrends(trendsRes.data.trends || []);
      if (growthRes.success) {
        const userGrowth = growthRes.data.userGrowth || [];
        const vendorGrowth = growthRes.data.vendorGrowth || [];
        const merged = userGrowth.map(ug => {
          const vg = vendorGrowth.find(v => v._id === ug._id);
          return {
            date: ug._id,
            users: ug.count,
            vendors: vg ? vg.count : 0
          };
        });
        setGrowthData(merged);
      }
    } catch (error) {
      console.error('Fetch reports error:', error);
      toast.error('Failed to load report data');
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
    toast.success('Overview data refreshed');
  };

  const kpis = [
    {
      title: 'Total GMV Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: FiDollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/admin/reports/revenue'
    },
    {
      title: 'Platform Comm.',
      value: `₹${(stats?.platformCommission || 0).toLocaleString('en-IN')}`,
      icon: FiTrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: '/admin/reports/revenue'
    },
    {
      title: 'Total Bookings',
      value: (stats?.totalBookings || 0).toLocaleString('en-IN'),
      icon: FiShoppingBag,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      link: '/admin/reports/bookings'
    },
    {
      title: 'Active Customers',
      value: (stats?.totalUsers || 0).toLocaleString('en-IN'),
      icon: FiUsers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      link: '/admin/reports/workers'
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Link to="/admin/reports/revenue" className="group">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 font-bold uppercase tracking-wider text-[10px]">Financial Analytics</p>
                <h3 className="text-base font-extrabold mt-0.5">Revenue & Commission</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-xl">
                <FiDollarSign size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-100 group-hover:text-white">
              View Detailed Breakdown <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link to="/admin/reports/bookings" className="group">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 font-bold uppercase tracking-wider text-[10px]">Operations & Growth</p>
                <h3 className="text-base font-extrabold mt-0.5">Booking Reports</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-xl">
                <FiShoppingBag size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-100 group-hover:text-white">
              View Order Trends <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link to="/admin/reports/vendors" className="group">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 font-bold uppercase tracking-wider text-[10px]">Partner Performance</p>
                <h3 className="text-base font-extrabold mt-0.5">Vendor Insights</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-xl">
                <FiBriefcase size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-100 group-hover:text-white">
              View Leaderboards <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {kpis.map((kpi, index) => (
          <Link key={index} to={kpi.link}>
            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} shrink-0`}>
                  <kpi.icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.title}</p>
                  <p className="text-base font-black text-gray-900 mt-0.5">{kpi.value}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Overview Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trends */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
              <FiDollarSign className="text-primary-600" />
              Revenue Trends ({period.toUpperCase()})
            </h3>
            <div className="bg-gray-100 p-0.5 rounded-lg flex gap-1 text-[10px]">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-1 font-bold uppercase rounded-md transition-all ${
                    period === p ? 'bg-white text-primary-700 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2874F0" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2874F0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#2874F0" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevOverview)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking Trends */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
              <FiShoppingBag className="text-amber-600" />
              Booking Status Trends
            </h3>
            <span className="text-[10px] text-gray-400 font-medium">Last 30 Days</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="count" name="Total" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User & Vendor Growth */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
              <FiUsers className="text-indigo-600" />
              Platform Acquisition & Growth (Last 30 Days)
            </h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span> New Users
              </span>
              <span className="flex items-center gap-1 text-pink-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-pink-600"></span> New Vendors
              </span>
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                <Area type="monotone" dataKey="users" name="New Users" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.12} strokeWidth={2.5} />
                <Area type="monotone" dataKey="vendors" name="New Vendors" stroke="#EC4899" fill="#EC4899" fillOpacity={0.12} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Reports = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navTabs = [
    { name: 'Overview', path: '/admin/reports', icon: FiActivity, exact: true },
    { name: 'Revenue Report', path: '/admin/reports/revenue', icon: FiDollarSign },
    { name: 'Booking Report', path: '/admin/reports/bookings', icon: FiShoppingBag },
    { name: 'Vendor Report', path: '/admin/reports/vendors', icon: FiUsers },
    { name: 'Customer Analytics', path: '/admin/reports/workers', icon: FiBriefcase },
  ];

  const isTabActive = (tab) => {
    if (tab.exact) return location.pathname === '/admin/reports' || location.pathname === '/admin/reports/';
    return location.pathname.startsWith(tab.path);
  };

  return (
    <div className="space-y-4">
      {/* Top Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-100 shadow-xs flex flex-wrap gap-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                active
                  ? 'bg-primary-50 text-primary-700 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-semibold'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Child Routes */}
      <Routes>
        <Route index element={<ReportsOverview />} />
        <Route path="revenue" element={<RevenueReport />} />
        <Route path="bookings" element={<BookingReport />} />
        <Route path="vendors" element={<VendorReport />} />
        <Route path="workers" element={<WorkerReport />} />
        <Route path="customers" element={<WorkerReport />} />
      </Routes>
    </div>
  );
};

export default Reports;


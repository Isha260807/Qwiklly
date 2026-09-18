import React from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { FiPieChart, FiUser, FiBriefcase, FiTrendingUp, FiFileText } from 'react-icons/fi';
import PaymentOverview from './PaymentOverview';
import VendorPayments from './VendorPayments';
import UserPayments from './UserPayments';
import PaymentReports from './PaymentReports';
import AdminRevenue from './AdminRevenue';

const Payments = () => {
  const location = useLocation();

  const navTabs = [
    { path: '/admin/payments/overview', label: 'Overview', icon: FiPieChart },
    { path: '/admin/payments/users', label: 'User Payments', icon: FiUser },
    { path: '/admin/payments/vendors', label: 'Vendor Payouts', icon: FiBriefcase },
    { path: '/admin/payments/revenue', label: 'Platform Revenue', icon: FiTrendingUp },
    { path: '/admin/payments/reports', label: 'Tax & Reports', icon: FiFileText },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-100 shadow-xs flex flex-wrap gap-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path || (tab.path.endsWith('overview') && location.pathname === '/admin/payments');
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-semibold'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<PaymentOverview />} />
          <Route path="users" element={<UserPayments />} />
          <Route path="vendors" element={<VendorPayments />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="reports" element={<PaymentReports />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default Payments;
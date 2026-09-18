import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  FiDollarSign, FiCheck, FiX, FiEye, FiClock, FiUsers,
  FiTrendingUp, FiAlertCircle, FiDownload, FiSearch, FiRefreshCw,
  FiCreditCard, FiArrowUpRight, FiFilter, FiCheckCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import adminSettlementService from '../../../../services/adminSettlementService';
import { getSettings } from '../../services/settingsService';
import { exportToCSV } from '../../../../utils/csvExport';

const SettlementManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [dashboard, setDashboard] = useState(null);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [history, setHistory] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modal State
  const [activeModal, setActiveModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalInput, setModalInput] = useState('');

  // Tab Definitions
  const navTabs = [
    { path: '/admin/settlements/pending', tabKey: 'pending', label: 'Pending Settlements', icon: FiClock },
    { path: '/admin/settlements/withdrawals', tabKey: 'withdrawals', label: 'Withdrawal Requests', icon: FiArrowUpRight },
    { path: '/admin/settlements/vendors', tabKey: 'vendors', label: 'Vendors with Due', icon: FiUsers },
    { path: '/admin/settlements/history', tabKey: 'history', label: 'Settlement History', icon: FiTrendingUp },
  ];

  // Determine active tab from URL
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (['pending', 'vendors', 'history', 'withdrawals'].includes(path)) {
      setActiveTab(path);
    } else {
      setActiveTab('pending');
    }
  }, [location.pathname]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Always load dashboard metrics
      const dashRes = await adminSettlementService.getDashboard();
      if (dashRes.success && dashRes.data) {
        setDashboard(dashRes.data);
      }

      if (activeTab === 'pending') {
        const res = await adminSettlementService.getPendingSettlements();
        if (res.success) setPendingSettlements(res.data || []);
      } else if (activeTab === 'vendors') {
        const res = await adminSettlementService.getVendorBalances({ filterDue: 'true' });
        if (res.success) setVendors(res.data || []);
      } else if (activeTab === 'history') {
        const res = await adminSettlementService.getSettlementHistory();
        if (res.success) setHistory(res.data || []);
      } else if (activeTab === 'withdrawals') {
        const res = await adminSettlementService.getWithdrawalRequests();
        if (res.success) setWithdrawals(res.data || []);

        const setRes = await getSettings();
        if (setRes.success) setSettings(setRes.settings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  // --- Modal Openers ---
  const openApproveSettlement = (item) => {
    setSelectedItem(item);
    setActiveModal('approve_settlement');
  };

  const openRejectSettlement = (item) => {
    setSelectedItem(item);
    setModalInput('');
    setActiveModal('reject_settlement');
  };

  const openBlockVendor = (vendor) => {
    setSelectedItem(vendor);
    setModalInput('');
    setActiveModal('block_vendor');
  };

  const openUnblockVendor = (vendor) => {
    setSelectedItem(vendor);
    setActiveModal('unblock_vendor');
  };

  const openUpdateLimit = (vendor) => {
    setSelectedItem(vendor);
    setModalInput(vendor.cashLimit || 10000);
    setActiveModal('update_limit');
  };

  const openApproveWithdrawal = (item) => {
    setSelectedItem(item);
    setModalInput('');
    setActiveModal('approve_withdrawal');
  };

  const openRejectWithdrawal = (item) => {
    setSelectedItem(item);
    setModalInput('');
    setActiveModal('reject_withdrawal');
  };

  const closeModals = () => {
    setActiveModal(null);
    setSelectedItem(null);
    setModalInput('');
  };

  // --- Action Handlers ---
  const handleApproveSettlement = async () => {
    try {
      setActionLoading(true);
      const res = await adminSettlementService.approveSettlement(selectedItem._id);
      if (res.success) {
        toast.success('Settlement approved successfully!');
        loadData();
        closeModals();
      } else {
        toast.error(res.message || 'Failed to approve');
      }
    } catch (error) {
      toast.error('Failed to approve settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSettlement = async () => {
    if (!modalInput.trim()) return toast.error('Rejection reason is required');
    try {
      setActionLoading(true);
      const res = await adminSettlementService.rejectSettlement(selectedItem._id, modalInput);
      if (res.success) {
        toast.success('Settlement rejected');
        loadData();
        closeModals();
      }
    } catch (error) {
      toast.error('Failed to reject settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockVendor = async () => {
    if (!modalInput.trim()) return toast.error('Blocking reason is required');
    try {
      setActionLoading(true);
      const res = await adminSettlementService.blockVendor(selectedItem._id, modalInput);
      if (res.success) {
        toast.success('Vendor blocked');
        loadData();
        closeModals();
      }
    } catch (error) {
      toast.error('Failed to block vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLimitSubmit = async () => {
    if (!modalInput || isNaN(modalInput)) return toast.error('Valid limit required');
    try {
      setActionLoading(true);
      const res = await adminSettlementService.updateCashLimit(selectedItem._id, parseInt(modalInput));
      if (res.success) {
        toast.success('Limit updated');
        loadData();
        closeModals();
      }
    } catch (error) {
      toast.error('Failed to update limit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockVendorSubmit = async () => {
    try {
      setActionLoading(true);
      const res = await adminSettlementService.unblockVendor(selectedItem._id);
      if (res.success) {
        toast.success('Vendor unblocked');
        loadData();
        closeModals();
      }
    } catch (error) {
      toast.error('Failed to unblock vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveWithdrawalSubmit = async () => {
    const ref = modalInput.trim() || `MANUAL-${Date.now()}`;
    try {
      setActionLoading(true);
      const res = await adminSettlementService.approveWithdrawal(selectedItem._id, { transactionReference: ref });
      if (res.success) {
        toast.success('Withdrawal approved');
        loadData();
        closeModals();
      }
    } catch (error) {
      toast.error('Failed to approve withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWithdrawalSubmit = async () => {
    if (!modalInput.trim()) return toast.error('Rejection reason required');
    try {
      setActionLoading(true);
      const res = await adminSettlementService.rejectWithdrawal(selectedItem._id, modalInput);
      if (res.success) {
        toast.success('Withdrawal rejected');
        loadData();
        closeModals();
      }
    } catch (error) {
      toast.error('Failed to reject withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = () => {
    if (activeTab === 'history' && history.length > 0) {
      exportToCSV(history, 'settlement_history', [
        { key: 'vendorId.name', label: 'Vendor Name' },
        { key: 'vendorId.businessName', label: 'Business Name' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'paymentMethod', label: 'Payment Method' },
        { key: 'paymentReference', label: 'Reference' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Date', type: 'datetime' }
      ]);
    } else if (activeTab === 'vendors' && vendors.length > 0) {
      exportToCSV(vendors, 'vendor_dues', [
        { key: 'name', label: 'Vendor Name' },
        { key: 'businessName', label: 'Business Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'amountDue', label: 'Amount Due', type: 'currency' },
        { key: 'cashLimit', label: 'Cash Limit', type: 'currency' },
        { key: 'isBlocked', label: 'Blocked' }
      ]);
    } else if (activeTab === 'withdrawals' && withdrawals.length > 0) {
      exportToCSV(withdrawals, 'withdrawal_requests', [
        { key: 'vendorId.name', label: 'Vendor Name' },
        { key: 'vendorId.businessName', label: 'Business Name' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'status', label: 'Status' },
        { key: 'requestDate', label: 'Request Date', type: 'date' }
      ]);
    } else if (activeTab === 'pending' && pendingSettlements.length > 0) {
      exportToCSV(pendingSettlements, 'pending_settlements', [
        { key: 'vendorId.name', label: 'Vendor Name' },
        { key: 'vendorId.businessName', label: 'Business Name' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'paymentMethod', label: 'Payment Method' },
        { key: 'paymentReference', label: 'Reference' },
        { key: 'createdAt', label: 'Date', type: 'datetime' }
      ]);
    } else {
      toast.error('No data to export');
    }
  };

  /* --- Top KPI Cards --- */
  const renderDashboardCards = () => {
    let cards = [];

    if (activeTab === 'withdrawals') {
      const pendingCount = withdrawals.length;
      const pendingAmount = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

      cards = [
        {
          title: 'Total Pending Payouts',
          value: `₹${pendingAmount.toLocaleString('en-IN')}`,
          icon: FiDollarSign,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-gray-100'
        },
        {
          title: 'Pending Requests',
          value: pendingCount,
          icon: FiClock,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-gray-100'
        },
        {
          title: 'Avg. Payout Amount',
          value: pendingCount > 0 ? `₹${Math.round(pendingAmount / pendingCount).toLocaleString('en-IN')}` : '₹0',
          icon: FiTrendingUp,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-gray-100'
        },
        {
          title: 'Processing Status',
          value: 'Active',
          icon: FiCheckCircle,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-gray-100'
        }
      ];
    } else if (activeTab === 'vendors') {
      const totalVendors = vendors.length;
      const totalDue = vendors.reduce((sum, v) => sum + (v.amountDue || 0), 0);
      const blockedCount = vendors.filter(v => v.isBlocked).length;
      const totalLimit = vendors.reduce((sum, v) => sum + (v.cashLimit || 0), 0);

      cards = [
        {
          title: 'Total Due from Vendors',
          value: `₹${totalDue.toLocaleString('en-IN')}`,
          icon: FiDollarSign,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-gray-100'
        },
        {
          title: 'Vendors with Dues',
          value: totalVendors,
          icon: FiUsers,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-gray-100'
        },
        {
          title: 'Blocked Vendors',
          value: blockedCount,
          icon: FiAlertCircle,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-gray-100'
        },
        {
          title: 'Total Cash Limit',
          value: `₹${(totalLimit / 100000).toFixed(1)}L`,
          icon: FiCheck,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          border: 'border-gray-100'
        }
      ];
    } else if (activeTab === 'history') {
      const totalTxns = history.length;
      const totalSettled = history.reduce((sum, h) => h.status === 'approved' ? sum + (h.amount || 0) : 0, 0);
      const approvedCount = history.filter(h => h.status === 'approved').length;
      const rejectedCount = history.filter(h => h.status === 'rejected').length;

      cards = [
        {
          title: 'Total Settled Amount',
          value: `₹${totalSettled.toLocaleString('en-IN')}`,
          icon: FiCheckCircle,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-gray-100'
        },
        {
          title: 'Total Transactions',
          value: totalTxns,
          icon: FiTrendingUp,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-gray-100'
        },
        {
          title: 'Approved Requests',
          value: approvedCount,
          icon: FiCheck,
          color: 'text-teal-600',
          bg: 'bg-teal-50',
          border: 'border-gray-100'
        },
        {
          title: 'Rejected Requests',
          value: rejectedCount,
          icon: FiX,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-gray-100'
        }
      ];
    } else {
      cards = [
        {
          title: 'Total Due to Admin',
          value: `₹${(dashboard?.totalDueToAdmin || 0).toLocaleString('en-IN')}`,
          icon: FiDollarSign,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-gray-100'
        },
        {
          title: 'Pending Settlements',
          value: dashboard?.pendingSettlements?.count || pendingSettlements.length || 0,
          icon: FiClock,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-gray-100'
        },
        {
          title: "Today's Collection",
          value: `₹${(dashboard?.todayCashCollected?.amount || 0).toLocaleString('en-IN')}`,
          icon: FiTrendingUp,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-gray-100'
        },
        {
          title: 'Weekly Collection',
          value: `₹${(dashboard?.weeklySettlements?.amount || 0).toLocaleString('en-IN')}`,
          icon: FiCheckCircle,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-gray-100'
        }
      ];
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`bg-white rounded-xl p-4 shadow-sm border ${card.border} flex items-center justify-between`}>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{card.value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-full ${card.bg} ${card.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- Filtered Data ---
  const filteredPending = pendingSettlements.filter(s => {
    const q = search.toLowerCase();
    const vendorName = (s.vendorId?.name || '').toLowerCase();
    const business = (s.vendorId?.businessName || '').toLowerCase();
    const phone = (s.vendorId?.phone || '').toLowerCase();
    const ref = (s.paymentReference || '').toLowerCase();
    const matchesSearch = !q || vendorName.includes(q) || business.includes(q) || phone.includes(q) || ref.includes(q);
    const matchesMethod = methodFilter === 'all' || s.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const filteredVendors = vendors.filter(v => {
    const q = search.toLowerCase();
    const name = (v.name || '').toLowerCase();
    const business = (v.businessName || '').toLowerCase();
    const phone = (v.phone || '').toLowerCase();
    return !q || name.includes(q) || business.includes(q) || phone.includes(q);
  });

  const filteredHistory = history.filter(h => {
    const q = search.toLowerCase();
    const name = (h.vendorId?.name || '').toLowerCase();
    const business = (h.vendorId?.businessName || '').toLowerCase();
    const ref = (h.paymentReference || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || business.includes(q) || ref.includes(q);
    const matchesStatus = statusFilter === 'all' || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredWithdrawals = withdrawals.filter(w => {
    const q = search.toLowerCase();
    const name = (w.vendorId?.name || '').toLowerCase();
    const business = (w.vendorId?.businessName || '').toLowerCase();
    const ref = (w.transactionReference || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || business.includes(q) || ref.includes(q);
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --- Render Helpers ---

  const renderPendingSettlements = () => (
    filteredPending.length === 0 ? (
      <div className="text-center py-16">
        <FiClock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-gray-700 font-bold text-sm">No pending settlements</p>
        <p className="text-xs text-gray-400 mt-0.5">When vendors submit cash collection settlements, they will appear here for verification.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredPending.map(settlement => (
          <div key={settlement._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {(settlement.vendorId?.name || 'V').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-xs">{settlement.vendorId?.name || 'Vendor'}</h3>
                    <p className="text-[10px] text-gray-400">{settlement.vendorId?.businessName || settlement.vendorId?.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold text-blue-700">₹{(settlement.amount || 0).toLocaleString('en-IN')}</p>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase rounded border border-blue-100">
                    {settlement.paymentMethod}
                  </span>
                </div>
              </div>

              {settlement.paymentReference && (
                <p className="text-[10px] text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block border border-gray-100 mb-2">
                  Ref: {settlement.paymentReference}
                </p>
              )}

              {settlement.vendorNotes && (
                <div className="bg-gray-50/70 p-2 rounded-lg border border-gray-100 mb-2 text-xs text-gray-600">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Vendor Note</p>
                  <p className="text-xs italic mt-0.5">"{settlement.vendorNotes}"</p>
                </div>
              )}

              <p className="text-[10px] text-gray-400 font-medium">{formatDate(settlement.createdAt)}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-50 mt-3">
              {settlement.paymentProof && (
                <a
                  href={settlement.paymentProof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <FiEye className="w-3.5 h-3.5" /> Proof
                </a>
              )}
              <button
                onClick={() => openApproveSettlement(settlement)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs transition-all"
              >
                Approve
              </button>
              <button
                onClick={() => openRejectSettlement(settlement)}
                className="px-3.5 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-all"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  const renderVendorsList = () => (
    filteredVendors.length === 0 ? (
      <div className="text-center py-16">
        <FiCheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
        <p className="text-gray-700 font-bold text-sm">All vendors are clear!</p>
        <p className="text-xs text-gray-400 mt-0.5">No vendors currently have pending dues exceeding their limit.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/75">
              <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vendor Details</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Cash Limit Status</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount Due</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredVendors.map(vendor => (
              <tr key={vendor._id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${vendor.isBlocked ? 'bg-red-500' : 'bg-primary-600'}`}>
                      {vendor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">{vendor.name}</p>
                      <p className="text-[10px] text-gray-400">{vendor.businessName} • {vendor.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex flex-col items-end">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      ₹{Math.abs(vendor.dues || vendor.amountDue || 0).toLocaleString('en-IN')} <span className="text-gray-400">/</span> ₹{(vendor.cashLimit || 10000).toLocaleString('en-IN')}
                    </p>
                    <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${vendor.isBlocked ? 'bg-red-500' : 'bg-primary-600'}`}
                        style={{ width: `${Math.min(((vendor.amountDue || 0) / (vendor.cashLimit || 10000)) * 100, 100)}%` }}
                      />
                    </div>
                    {vendor.isBlocked && <span className="text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Blocked</span>}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="font-extrabold text-red-600 text-sm">
                    ₹{(vendor.amountDue || 0).toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => navigate(`/admin/settlements/vendor/${vendor._id}`)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Ledger"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openUpdateLimit(vendor)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Update Cash Limit"
                    >
                      <FiDollarSign className="w-4 h-4" />
                    </button>
                    {vendor.isBlocked ? (
                      <button
                        onClick={() => openUnblockVendor(vendor)}
                        className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-amber-200 transition-colors"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => openBlockVendor(vendor)}
                        className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                      >
                        Block
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  const renderHistoryList = () => (
    filteredHistory.length === 0 ? (
      <div className="text-center py-16">
        <FiTrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-gray-700 font-bold text-sm">No settlement history found</p>
        <p className="text-xs text-gray-400 mt-0.5">Past approved and rejected settlements will appear here.</p>
      </div>
    ) : (
      <div className="space-y-2.5">
        {filteredHistory.map(settlement => (
          <div
            key={settlement._id}
            className={`bg-white rounded-xl p-3.5 border transition-all hover:shadow-sm ${
              settlement.status === 'approved' ? 'border-l-4 border-l-emerald-500 border-gray-100' :
              settlement.status === 'rejected' ? 'border-l-4 border-l-red-500 border-gray-100' :
              'border-l-4 border-l-amber-500 border-gray-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  settlement.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  settlement.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {settlement.status === 'approved' ? <FiCheck className="w-4 h-4" /> : settlement.status === 'rejected' ? <FiX className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">
                    {settlement.vendorId?.name || 'Vendor'} <span className="font-normal text-gray-500">paid</span> <span className="font-extrabold text-emerald-700">₹{(settlement.amount || 0).toLocaleString('en-IN')}</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(settlement.createdAt)} • via {settlement.paymentMethod || 'UPI'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                  settlement.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  settlement.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {settlement.status}
                </span>
                {settlement.rejectionReason && (
                  <p className="text-[10px] text-red-500 mt-0.5 max-w-[200px] truncate" title={settlement.rejectionReason}>{settlement.rejectionReason}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  );

  const renderWithdrawalsList = () => (
    filteredWithdrawals.length === 0 ? (
      <div className="text-center py-16">
        <FiCheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
        <p className="text-gray-700 font-bold text-sm">No withdrawal requests found</p>
        <p className="text-xs text-gray-400 mt-0.5">When vendors request payout withdrawals, they will appear here.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredWithdrawals.map(request => {
          const isPending = request.status === 'pending';
          const isApproved = request.status === 'approved';
          const isRejected = request.status === 'rejected';

          return (
            <div key={request._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      {(request.vendorId?.name || 'V').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xs">{request.vendorId?.name}</h3>
                      <p className="text-[10px] text-gray-400">{request.vendorId?.businessName} • {request.vendorId?.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-emerald-700">₹{(request.amount || 0).toLocaleString('en-IN')}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      isRejected ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {request.status || 'pending'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-2.5 mb-3 space-y-1.5 border border-gray-100">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Available Earnings</span>
                    <span className="font-bold text-gray-800">₹{(request.vendorId?.wallet?.earnings || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Requested Date</span>
                    <span className="font-medium text-gray-700">{formatDate(request.requestDate || request.createdAt)}</span>
                  </div>
                  {request.transactionReference && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">UTR / Ref ID</span>
                      <span className="font-mono font-bold text-gray-800">{request.transactionReference}</span>
                    </div>
                  )}
                  {request.bankDetails && (
                    <div className="pt-1.5 border-t border-gray-200/60 mt-1.5 text-[10px]">
                      <p className="font-bold text-gray-400 uppercase mb-0.5">Bank Details</p>
                      <div className="grid grid-cols-2 gap-1 text-gray-700">
                        {Object.entries(request.bankDetails).map(([key, val]) => (
                          <div key={key} className="truncate">
                            <span className="text-gray-400 capitalize">{key}:</span> <span className="font-semibold">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isPending ? (
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => openApproveWithdrawal(request)}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-xs hover:bg-emerald-700 transition-all uppercase tracking-wider"
                  >
                    Approve & Pay
                  </button>
                  <button
                    onClick={() => openRejectWithdrawal(request)}
                    className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-xs hover:bg-red-50 transition-all uppercase tracking-wider"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-gray-50 text-[10px] text-gray-400 text-right">
                  {request.processedDate && `Processed on ${formatDate(request.processedDate)}`}
                  {request.rejectionReason && <p className="text-red-500 mt-0.5">{request.rejectionReason}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Top Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-100 shadow-xs flex flex-wrap gap-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.tabKey;
          return (
            <button
              key={tab.tabKey}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-semibold'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Dashboard Metrics */}
      {renderDashboardCards()}

      {/* Filter & Action Toolbar */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by vendor, phone, ref ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns & Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {activeTab === 'pending' && (
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer shadow-xs"
            >
              <option value="all">All Methods</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          )}

          {(activeTab === 'history' || activeTab === 'withdrawals') && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer shadow-xs"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved / Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

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

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[320px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-2.5 text-xs font-medium">Loading data...</p>
          </div>
        ) : (
          <div className="p-4">
            {activeTab === 'pending' && renderPendingSettlements()}
            {activeTab === 'vendors' && renderVendorsList()}
            {activeTab === 'history' && renderHistoryList()}
            {activeTab === 'withdrawals' && renderWithdrawalsList()}
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {/* Approve Settlement Modal */}
      <Modal
        isOpen={activeModal === 'approve_settlement'}
        onClose={closeModals}
        title="Approve Settlement"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Are you sure you want to approve this settlement of
            <span className="font-bold text-gray-900 mx-1">₹{(selectedItem?.amount || 0).toLocaleString('en-IN')}</span>
            from {selectedItem?.vendorId?.name}?
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={closeModals}>Cancel</Button>
            <Button
              onClick={handleApproveSettlement}
              isLoading={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Settlement Modal */}
      <Modal
        isOpen={activeModal === 'reject_settlement'}
        onClose={closeModals}
        title="Reject Settlement"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600">Please provide a reason for rejecting this settlement.</p>
          <textarea
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="e.g., Transaction ID not found, Invalid payment screenshot..."
            className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={closeModals}>Cancel</Button>
            <Button
              onClick={handleRejectSettlement}
              isLoading={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              Reject Settlement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block Vendor Modal */}
      <Modal
        isOpen={activeModal === 'block_vendor'}
        onClose={closeModals}
        title="Block Vendor"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Blocking <span className="font-bold">{selectedItem?.name}</span> will prevent them from accepting new cash jobs.
          </p>
          <textarea
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="Reason for blocking..."
            className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={closeModals}>Cancel</Button>
            <Button
              onClick={handleBlockVendor}
              isLoading={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              Block Vendor
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unblock Vendor Modal */}
      <Modal
        isOpen={activeModal === 'unblock_vendor'}
        onClose={closeModals}
        title="Unblock Vendor"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Are you sure you want to unblock <span className="font-bold text-gray-900">{selectedItem?.name}</span>?
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={closeModals}>Cancel</Button>
            <Button
              onClick={handleUnblockVendorSubmit}
              isLoading={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Unblock Vendor
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Cash Limit Modal */}
      <Modal
        isOpen={activeModal === 'update_limit'}
        onClose={closeModals}
        title="Update Cash Limit"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Set maximum allowed cash dues limit for <span className="font-bold text-gray-900">{selectedItem?.name}</span>:
          </p>
          <input
            type="number"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            placeholder="e.g., 10000"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={closeModals}>Cancel</Button>
            <Button
              onClick={handleUpdateLimitSubmit}
              isLoading={actionLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs"
            >
              Save Limit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve Withdrawal Modal */}
      <Modal
        isOpen={activeModal === 'approve_withdrawal'}
        onClose={closeModals}
        title="Approve Withdrawal Payout"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Enter the bank/UPI reference number after transferring <span className="font-bold text-emerald-700">₹{(selectedItem?.amount || 0).toLocaleString('en-IN')}</span> to {selectedItem?.vendorId?.name}:
          </p>
          <input
            type="text"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="Transaction / UTR Reference ID"
            className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={closeModals}>Cancel</Button>
            <Button
              onClick={handleApproveWithdrawalSubmit}
              isLoading={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Confirm Payout
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Withdrawal Modal */}
      <Modal
        isOpen={activeModal === 'reject_withdrawal'}
        onClose={closeModals}
        title="Reject Withdrawal Request"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600">Please provide reason for rejecting this withdrawal request:</p>
          <textarea
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="e.g., Incorrect bank details, Account mismatched..."
            className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={closeModals}>Cancel</Button>
            <Button
              onClick={handleRejectWithdrawalSubmit}
              isLoading={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              Reject Withdrawal
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default SettlementManagement;

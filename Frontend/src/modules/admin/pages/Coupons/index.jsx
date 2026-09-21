import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiTag,
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiEye,
  FiCheck,
  FiX,
  FiPercent,
  FiDollarSign,
  FiUsers,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import couponService from '../../services/couponService';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptions: 0,
    totalDiscountDistributed: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Usage History Modal
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedCouponForUsage, setSelectedCouponForUsage] = useState(null);
  const [usageRecords, setUsageRecords] = useState([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usagePagination, setUsagePagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });

  // Form State
  const initialForm = {
    code: '',
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    maxDiscount: '',
    minOrderAmount: '',
    usageLimit: '',
    perUserLimit: '1',
    startAt: new Date().toISOString().split('T')[0],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    firstOrderOnly: false,
    newUserOnly: false,
    isActive: true
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await couponService.getCoupons({
        search,
        status: statusFilter,
        discountType: typeFilter,
        page: pagination.page,
        limit: pagination.limit
      });

      if (res.success && res.data) {
        setCoupons(res.data.coupons || []);
        setPagination(res.data.pagination);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [search, statusFilter, typeFilter, pagination.page]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount || '',
      minOrderAmount: coupon.minOrderAmount || '',
      usageLimit: coupon.usageLimit || '',
      perUserLimit: coupon.perUserLimit || '1',
      startAt: coupon.startAt ? new Date(coupon.startAt).toISOString().split('T')[0] : '',
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
      firstOrderOnly: Boolean(coupon.firstOrderOnly),
      newUserOnly: Boolean(coupon.newUserOnly),
      isActive: coupon.isActive
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code.trim()) return toast.error('Coupon code is required');
    if (!formData.title.trim()) return toast.error('Coupon title is required');
    if (!formData.discountValue || Number(formData.discountValue) <= 0) return toast.error('Valid discount value is required');
    if (!formData.expiresAt) return toast.error('Expiry date is required');

    setFormSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : 0,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        perUserLimit: formData.perUserLimit ? Number(formData.perUserLimit) : 1
      };

      if (editingCoupon) {
        await couponService.updateCoupon(editingCoupon._id, payload);
        toast.success('Coupon updated successfully');
      } else {
        await couponService.createCoupon(payload);
        toast.success('Coupon created successfully');
      }

      setShowModal(false);
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save coupon');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await couponService.toggleCouponStatus(id);
      if (res.success) {
        toast.success(res.message);
        setCoupons(prev => prev.map(c => c._id === id ? { ...c, isActive: !c.isActive } : c));
      }
    } catch (error) {
      toast.error('Failed to toggle coupon status');
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete / archive coupon "${coupon.code}"?`)) return;

    try {
      await couponService.deleteCoupon(coupon._id);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleOpenUsage = async (coupon, page = 1) => {
    setSelectedCouponForUsage(coupon);
    setShowUsageModal(true);
    setLoadingUsage(true);
    try {
      const res = await couponService.getCouponUsageHistory(coupon._id, { page, limit: 10 });
      if (res.success && res.data) {
        setUsageRecords(res.data.usages || []);
        setUsagePagination(res.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load usage history');
    } finally {
      setLoadingUsage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons & Discounts</h1>
          <p className="text-sm text-gray-500">Create promotional codes, configure usage rules, and monitor redemptions</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all self-start sm:self-auto"
        >
          <FiPlus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <FiTag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Coupons</p>
            <h3 className="text-2xl font-black text-gray-900">{stats.totalCoupons}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold text-xl">
            <FiCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Active Offers</p>
            <h3 className="text-2xl font-black text-gray-900">{stats.activeCoupons}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
            <FiUsers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Redemptions</p>
            <h3 className="text-2xl font-black text-gray-900">{stats.totalRedemptions}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xl">
            <FiDollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Discount Given</p>
            <h3 className="text-2xl font-black text-gray-900">₹{(stats.totalDiscountDistributed || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            placeholder="Search by coupon code or title..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-indigo-500"
          >
            <option value="">All Discount Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Flat Fixed (₹)</option>
          </select>

          <button
            onClick={fetchCoupons}
            className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Refresh"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Code & Title</th>
                <th className="px-6 py-4">Discount Details</th>
                <th className="px-6 py-4">Validity Period</th>
                <th className="px-6 py-4">Usage & Limits</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <FiTag className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="font-semibold text-gray-600">No coupons found</p>
                    <p className="text-xs text-gray-400 mt-0.5">Try adjusting filters or create a new coupon.</p>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isExpired = new Date(coupon.expiresAt) < new Date();
                  return (
                    <tr key={coupon._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-black text-xs uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">
                            {coupon.code}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{coupon.title}</p>
                            {coupon.description && (
                              <p className="text-[11px] text-gray-400 line-clamp-1">{coupon.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          {coupon.discountType === 'PERCENTAGE' ? (
                            <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                              {coupon.discountValue}% OFF {coupon.maxDiscount ? `(Max ₹${coupon.maxDiscount})` : ''}
                            </span>
                          ) : (
                            <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                              FLAT ₹{coupon.discountValue} OFF
                            </span>
                          )}
                          {coupon.minOrderAmount > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1">Min. order: ₹{coupon.minOrderAmount}</p>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-[11px] text-gray-600 space-y-0.5">
                          <p>Start: {new Date(coupon.startAt).toLocaleDateString()}</p>
                          <p className={isExpired ? 'text-red-500 font-bold' : 'text-gray-500'}>
                            Ends: {new Date(coupon.expiresAt).toLocaleDateString()} {isExpired && '(Expired)'}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-gray-800">
                            <span>{coupon.usedCount || 0}</span>
                            <span className="text-gray-400 font-normal">/ {coupon.usageLimit || '∞'} used</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">Per user limit: {coupon.perUserLimit || 1}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon._id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                            coupon.isActive && !isExpired
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {coupon.isActive && !isExpired ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenUsage(coupon)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="View Usage History"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Coupon"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Coupon"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.pages, p.page + 1) }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Coupon Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <FiTag className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Coupon Code *</label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleFormChange}
                      placeholder="e.g. WELCOME100"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:border-indigo-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Offer Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      placeholder="e.g. Welcome 20% Discount"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Description</label>
                  <textarea
                    name="description"
                    rows="2"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Brief description for customer preview..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Discount Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Discount Type *</label>
                    <select
                      name="discountType"
                      value={formData.discountType}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Flat Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      {formData.discountType === 'PERCENTAGE' ? 'Discount % *' : 'Discount Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleFormChange}
                      min="0.01"
                      step="any"
                      placeholder={formData.discountType === 'PERCENTAGE' ? '20' : '150'}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      name="maxDiscount"
                      value={formData.maxDiscount}
                      onChange={handleFormChange}
                      placeholder="e.g. 300 (Optional)"
                      disabled={formData.discountType === 'FIXED'}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 disabled:opacity-40"
                    />
                  </div>
                </div>

                {/* Order & Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      name="minOrderAmount"
                      value={formData.minOrderAmount}
                      onChange={handleFormChange}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Global Usage Limit</label>
                    <input
                      type="number"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleFormChange}
                      placeholder="Leave empty for unlimited"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Per-User Limit</label>
                    <input
                      type="number"
                      name="perUserLimit"
                      value={formData.perUserLimit}
                      onChange={handleFormChange}
                      min="1"
                      placeholder="1"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Validity Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Start Date *</label>
                    <input
                      type="date"
                      name="startAt"
                      value={formData.startAt}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Expiry Date *</label>
                    <input
                      type="date"
                      name="expiresAt"
                      value={formData.expiresAt}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                {/* Specific Rules */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      name="firstOrderOnly"
                      checked={formData.firstOrderOnly}
                      onChange={handleFormChange}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Valid for First Order Only</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      name="newUserOnly"
                      checked={formData.newUserOnly}
                      onChange={handleFormChange}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>New Accounts Only (Registered in last 30 days)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleFormChange}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Publish & Activate Immediately</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50 transition-all"
                  >
                    {formSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Usage History Modal */}
      <AnimatePresence>
        {showUsageModal && selectedCouponForUsage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black text-xs uppercase rounded-lg border border-indigo-100">
                    {selectedCouponForUsage.code}
                  </span>
                  <h3 className="text-base font-bold text-gray-900">Coupon Redemption Audit History</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {loadingUsage ? (
                  <div className="py-12 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </div>
                ) : usageRecords.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="font-semibold text-gray-600">No redemptions yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">This coupon has not been used by any customers yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Booking #</th>
                          <th className="px-4 py-3">Discount Saved</th>
                          <th className="px-4 py-3">Final Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {usageRecords.map((record) => (
                          <tr key={record._id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-800">{record.userId?.name || 'Customer'}</p>
                              <p className="text-[10px] text-gray-400">{record.userId?.phone || record.userId?.email || '-'}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-indigo-600">
                              {record.bookingId?.bookingNumber || 'N/A'}
                            </td>
                            <td className="px-4 py-3 font-bold text-green-600">
                              ₹{(record.discountAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              ₹{(record.finalAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                record.status === 'CONSUMED'
                                  ? 'bg-green-100 text-green-700'
                                  : record.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-400">
                              {new Date(record.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Coupons;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiStar, FiFilter, FiEye, FiEyeOff, FiTrash2, FiSearch,
  FiUser, FiBriefcase, FiBox, FiRefreshCw, FiAlertCircle, FiMessageSquare,
  FiCheckCircle, FiXCircle, FiCalendar, FiTrendingUp, FiChevronDown, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import reviewService from '../../services/reviewService';
import { getAllVendors } from '../../services/vendorService';

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    activeReviews: 0,
    hiddenReviews: 0,
    star5: 0,
    star4: 0,
    star3: 0,
    star2: 0,
    star1: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendors, setVendors] = useState([]);
  const [analyticsVendorId, setAnalyticsVendorId] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('week');
  const [customFromDate, setCustomFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return toDateInputValue(date);
  });
  const [customToDate, setCustomToDate] = useState(() => toDateInputValue(new Date()));
  const [vendorAnalytics, setVendorAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showVendorRating, setShowVendorRating] = useState(true);
  const [ratingDetailsPage, setRatingDetailsPage] = useState(1);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: 'All Status',
    rating: 'All Ratings',
  });

  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    page: 1
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setFilters(prev => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
        search: debouncedSearch
      };
      if (filters.status !== 'All Status') params.status = filters.status;
      if (filters.rating !== 'All Ratings') params.rating = filters.rating;

      const response = await reviewService.getAllReviews(params);
      if (response.success) {
        setReviews(response.data || []);
        setPagination(response.pagination || { total: 0, pages: 1, page: 1 });
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await reviewService.getReviewStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters, debouncedSearch]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await getAllVendors({ limit: 1000 });
        const vendorList = response.data || [];
        setVendors(vendorList);
        setAnalyticsVendorId(current => current || vendorList[0]?._id || '');
      } catch (error) {
        console.error('Fetch vendors for review analytics error:', error);
        toast.error('Failed to load vendors for rating analytics');
      }
    };

    fetchVendors();
  }, []);

  useEffect(() => {
    setRatingDetailsPage(1);

    if (!analyticsVendorId || (analyticsPeriod === 'custom' && (!customFromDate || !customToDate || customFromDate > customToDate))) {
      setVendorAnalytics(null);
      setAnalyticsLoading(false);
      return undefined;
    }

    let isMounted = true;
    const fetchVendorAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await reviewService.getVendorRatingAnalytics(analyticsVendorId, analyticsPeriod, {
          fromDate: analyticsPeriod === 'custom' ? customFromDate : undefined,
          toDate: analyticsPeriod === 'custom' ? customToDate : undefined
        });
        if (isMounted && response.success) {
          setVendorAnalytics(response.data || null);
        }
      } catch (error) {
        console.error('Fetch vendor rating analytics error:', error);
        if (isMounted) toast.error('Failed to load vendor rating analytics');
      } finally {
        if (isMounted) setAnalyticsLoading(false);
      }
    };

    fetchVendorAnalytics();
    return () => {
      isMounted = false;
    };
  }, [analyticsVendorId, analyticsPeriod, customFromDate, customToDate]);

  const ratingDetails = vendorAnalytics?.reviewDetails || [];
  const ratingDetailsPageSize = 10;
  const ratingDetailsPageCount = Math.max(1, Math.ceil(ratingDetails.length / ratingDetailsPageSize));
  const ratingDetailsStartIndex = (ratingDetailsPage - 1) * ratingDetailsPageSize;
  const visibleRatingDetails = ratingDetails.slice(
    ratingDetailsStartIndex,
    ratingDetailsStartIndex + ratingDetailsPageSize
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReviews(), fetchStats()]);
    setRefreshing(false);
    toast.success('Reviews refreshed');
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await reviewService.updateReviewStatus(id, newStatus);
      if (response.success) {
        toast.success(`Review ${newStatus === 'hidden' ? 'hidden' : newStatus === 'active' ? 'published' : 'deleted'}`);
        fetchReviews();
        fetchStats();
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update status');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= (rating || 5)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs font-bold text-gray-800 ml-1">{(rating || 5).toFixed(1)}</span>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Avg Rating Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Average Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-extrabold text-gray-900">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </span>
              <div className="flex items-center text-amber-400">
                <FiStar className="w-5 h-5 fill-amber-400" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Platform overall score</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
            ★
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Reviews</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.totalReviews || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Customer submissions</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <FiMessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Active Reviews */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Public Reviews</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.activeReviews || 0}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Visible to users</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FiCheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Hidden Reviews */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hidden Reviews</p>
            <p className="text-2xl font-extrabold text-gray-700 mt-1">{stats.hiddenReviews || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Moderated / Hidden</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
            <FiEyeOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Vendor Rating Analytics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowVendorRating(current => !current)}
            aria-expanded={showVendorRating}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Vendor Rating Analytics</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Track a vendor's average rating over time</p>
            </div>
            <FiChevronDown className={`w-4 h-4 ml-1 text-gray-400 transition-transform duration-200 ${showVendorRating ? 'rotate-180' : ''}`} />
          </button>

          <div className={`${showVendorRating ? 'flex' : 'hidden'} flex-col sm:flex-row gap-2`}>
            <select
              value={analyticsVendorId}
              onChange={(e) => setAnalyticsVendorId(e.target.value)}
              className="min-w-[220px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer"
              disabled={vendors.length === 0}
            >
              {vendors.length === 0 ? (
                <option value="">Loading vendors...</option>
              ) : (
                vendors.map(vendor => (
                  <option key={vendor._id} value={vendor._id}>
                    {vendor.businessName || vendor.name || 'Unnamed vendor'}
                  </option>
                ))
              )}
            </select>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {['week', 'month', 'custom'].map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setAnalyticsPeriod(period)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold capitalize transition-colors ${
                    analyticsPeriod === period
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                    {period === 'custom' ? 'Custom' : period}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {showVendorRating && analyticsPeriod === 'custom' && (
          <div className="px-4 py-3 bg-primary-50/40 border-b border-gray-100 flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">From date</label>
              <input
                type="date"
                value={customFromDate}
                max={customToDate || undefined}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">To date</label>
              <input
                type="date"
                value={customToDate}
                min={customFromDate || undefined}
                max={toDateInputValue(new Date())}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500"
              />
            </div>
            {customFromDate > customToDate && (
              <p className="text-[10px] font-semibold text-red-600 pb-2">From date must be before To date.</p>
            )}
          </div>
        )}

        <div className={`p-4 ${showVendorRating ? '' : 'hidden'}`}>
          {analyticsLoading ? (
            <div className="h-40 flex items-center justify-center text-xs text-gray-500">Loading rating trend...</div>
          ) : !analyticsVendorId ? (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">No vendors available.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Period average</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">
                    {vendorAnalytics?.averageRating?.toFixed(1) || '0.0'} <span className="text-amber-500">★</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {analyticsPeriod === 'custom' ? 'Custom date range' : `Selected ${analyticsPeriod} range`}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Reviews in range</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{vendorAnalytics?.totalReviews || 0}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Active reviews</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Total rating</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">
                    {vendorAnalytics?.overallAverageRating?.toFixed(1) || '0.0'} <span className="text-amber-500">★</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    All-time average · {vendorAnalytics?.overallTotalReviews || 0} reviews
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-900">Rating Details</h3>
                    <p className="text-[10px] text-gray-400">Users and bookings in the selected range</p>
                  </div>
                  <span className="text-[10px] font-bold text-primary-700">
                    {ratingDetails.length
                      ? (ratingDetailsStartIndex + 1) + '-' + Math.min(ratingDetailsStartIndex + ratingDetailsPageSize, ratingDetails.length) + ' of ' + ratingDetails.length
                      : '0 shown'}
                  </span>
                </div>

                {ratingDetails.length ? (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-100">
                    {visibleRatingDetails.map(review => {
                      const reviewer = review.userId?.name || 'Customer';
                      const bookingNumber = review.bookingId?.bookingNumber || 'Booking unavailable';
                      const serviceName = review.serviceId?.title || review.bookingId?.serviceName || 'Service';
                      const bookingStatus = review.bookingId?.status?.replace(/_/g, ' ');
                      return (
                        <div key={review._id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 hover:bg-gray-50/70">
                          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                            <FiUser className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-xs font-bold text-gray-900">{reviewer}</span>
                              <span className="text-[10px] text-gray-400">{review.userId?.phone || review.userId?.email || ''}</span>
                              <span className="text-[10px] text-gray-400">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="font-semibold text-gray-700">{serviceName}</span>
                              <span className="text-gray-300">•</span>
                              <span className="font-bold text-primary-700">{bookingNumber}</span>
                              {bookingStatus && <span className="capitalize text-gray-400">({bookingStatus})</span>}
                            </div>
                            {review.review && <p className="mt-1 text-[10px] text-gray-500 truncate">{review.review}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-sm text-amber-500">★</span>
                            <span className="text-xs font-extrabold text-gray-800">{Number(review.rating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-[10px] text-gray-400">
                    No rating details available for this range.
                  </div>
                )}

                {ratingDetails.length > ratingDetailsPageSize && (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-gray-400">
                      Page {ratingDetailsPage} of {ratingDetailsPageCount}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRatingDetailsPage(page => Math.max(1, page - 1))}
                        disabled={ratingDetailsPage === 1}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <FiChevronLeft className="w-3 h-3" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setRatingDetailsPage(page => Math.min(ratingDetailsPageCount, page + 1))}
                        disabled={ratingDetailsPage === ratingDetailsPageCount}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                        <FiChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search feedback, customer, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Rating filter */}
          <select
            value={filters.rating}
            onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value, page: 1 }))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer shadow-xs"
          >
            <option value="All Ratings">All Ratings</option>
            <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
            <option value="4">⭐⭐⭐⭐ 4 Stars</option>
            <option value="3">⭐⭐⭐ 3 Stars</option>
            <option value="2">⭐⭐ 2 Stars</option>
            <option value="1">⭐ 1 Star</option>
          </select>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer shadow-xs"
          >
            <option value="All Status">All Status</option>
            <option value="active">Active (Visible)</option>
            <option value="hidden">Hidden</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100">
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rating & Feedback</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Service & Booking</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading reviews...</span>
                    </div>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-xs text-gray-400">
                    <FiMessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-bold text-gray-700 text-sm">No reviews found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Customer ratings and reviews will automatically show up here as bookings are completed and reviewed.
                    </p>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const customerName = review.userId?.name || review.bookingId?.customerName || 'Customer';
                  const customerPhone = review.userId?.phone || review.bookingId?.customerPhone || 'N/A';
                  const customerEmail = review.userId?.email || '';
                  const serviceTitle = review.serviceId?.title || review.bookingId?.serviceName || 'Service';
                  const partnerName = review.vendorId?.businessName || review.vendorId?.name || 'Partner';
                  const orderNumber = review.bookingId?.bookingNumber || (review.bookingId?._id ? `#${review.bookingId._id.slice(-6).toUpperCase()}` : null);
                  const bookingStatus = review.bookingId?.status?.replace(/_/g, ' ');

                  return (
                    <tr key={review._id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Rated by</p>
                            <p className="font-bold text-gray-900 text-xs">{customerName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{customerPhone}</p>
                            {customerEmail && <p className="text-[10px] text-gray-400 truncate max-w-[145px]" title={customerEmail}>{customerEmail}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Rating & Feedback */}
                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="space-y-1">
                          {renderStars(review.rating)}
                          <p className="text-gray-800 text-xs leading-relaxed font-normal">
                            {review.review || <span className="italic text-gray-400">No written feedback provided</span>}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                            <FiCalendar className="w-3 h-3" />
                            <span>
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Service / Booking */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5 max-w-[220px]">
                          <div className="flex items-center gap-1.5 text-xs">
                            <FiBox className="text-primary-600 w-3.5 h-3.5 flex-shrink-0" />
                            <span className="font-bold text-gray-800 truncate" title={serviceTitle}>
                              {serviceTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <FiBriefcase className="text-blue-500 w-3 h-3 flex-shrink-0" />
                            <span className="font-medium truncate" title={partnerName}>{partnerName}</span>
                          </div>
                          {orderNumber && (
                            <div className="rounded-md bg-gray-50 border border-gray-100 px-2 py-1">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Booking</p>
                              <p className="text-[10px] font-bold text-gray-700 truncate" title={orderNumber}>{orderNumber}</p>
                              {bookingStatus && <p className="text-[9px] capitalize text-gray-400">{bookingStatus}</p>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                            review.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {review.status === 'active' ? 'Active' : 'Hidden'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {review.status === 'active' ? (
                            <button
                              onClick={() => handleStatusUpdate(review._id, 'hidden')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Hide Review from Users"
                            >
                              <FiEyeOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusUpdate(review._id, 'active')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Make Review Public"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this review?')) {
                                handleStatusUpdate(review._id, 'deleted');
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Review"
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

        {/* Pagination Footer */}
        {!loading && pagination.pages > 1 && (
          <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
              Page {pagination.page} of {pagination.pages} ({pagination.total} reviews)
            </p>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page === 1}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-all shadow-xs"
              >
                Previous
              </button>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary-600 text-white disabled:opacity-40 hover:bg-primary-700 transition-all shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ReviewsPage;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiImage,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiRefreshCw,
  FiLayers,
  FiCheckCircle,
  FiXCircle,
  FiLink,
  FiArrowUp,
  FiArrowDown,
  FiUploadCloud,
  FiX,
  FiCheck,
  FiTag,
  FiMapPin,
  FiSliders,
  FiGrid,
  FiList,
  FiAlertTriangle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import bannerService from '../../services/bannerService';
import { categoryService, serviceService } from '../../../../services/catalogService';
import api from '../../../../services/api';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const BannersPage = () => {
  const [banners, setBanners] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    topCount: 0,
    heroCount: 0,
    footerCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filters & Search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Metadata options
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [cities, setCities] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    bannerType: 'top',
    position: 'top',
    cityId: '',
    targetType: 'none',
    targetCategoryId: '',
    targetServiceId: '',
    targetUrl: '',
    buttonText: 'Book Now',
    badgeText: '',
    gradientClass: 'from-blue-600 to-indigo-700',
    order: 0,
    isActive: true
  });

  // Fetch all banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (typeFilter !== 'all') params.bannerType = typeFilter;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';
      if (cityFilter !== 'all') params.cityId = cityFilter;

      const response = await bannerService.getAllBanners(params);
      if (response.success) {
        setBanners(response.banners || []);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await bannerService.getBannerStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching banner stats:', error);
    }
  };

  // Fetch dropdown options (categories, services, cities)
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const [catsRes, svcsRes, citiesRes] = await Promise.allSettled([
          categoryService.getAll(),
          serviceService.getAll(),
          api.get('/public/cities')
        ]);

        if (catsRes.status === 'fulfilled' && catsRes.value?.success) {
          setCategories(catsRes.value.categories || []);
        }
        if (svcsRes.status === 'fulfilled' && svcsRes.value?.success && svcsRes.value.services?.length > 0) {
          setServices(svcsRes.value.services || []);
        } else {
          // Fallback: public services
          try {
            const pubRes = await api.get('/public/services');
            if (pubRes.data?.success && pubRes.data.services?.length > 0) {
              setServices(pubRes.data.services || []);
            }
          } catch (pubErr) {
            console.error('Fallback services fetch error:', pubErr);
          }
        }
        if (citiesRes.status === 'fulfilled' && citiesRes.value?.data?.success) {
          setCities(citiesRes.value.data.cities || []);
        }
      } catch (err) {
        console.error('Error loading dropdown options:', err);
      }
    };

    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [search, typeFilter, statusFilter, cityFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBanners(), fetchStats()]);
    setRefreshing(false);
    toast.success('Banners refreshed');
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      bannerType: 'top',
      position: 'top',
      cityId: '',
      targetType: 'none',
      targetCategoryId: '',
      targetServiceId: '',
      targetUrl: '',
      buttonText: 'Book Now',
      badgeText: '',
      gradientClass: 'from-blue-600 to-indigo-700',
      order: banners.length,
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);

    // Clean string ID helper
    const getCleanId = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (val._id) return val._id.toString();
      if (val.id) return val.id.toString();
      return val.toString();
    };

    const targetServiceIdStr = getCleanId(banner.targetServiceId);
    const targetCategoryIdStr = getCleanId(banner.targetCategoryId);
    const cityIdStr = getCleanId(banner.cityId);

    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      bannerType: banner.bannerType === 'footer' || banner.bannerType === 'bottom' ? 'footer' : 'top',
      position: banner.position || 'top',
      cityId: cityIdStr,
      targetType: banner.targetType || (targetServiceIdStr ? 'service' : 'none'),
      targetCategoryId: targetCategoryIdStr,
      targetServiceId: targetServiceIdStr,
      targetUrl: banner.targetUrl || '',
      buttonText: banner.buttonText || 'Book Now',
      badgeText: banner.badgeText || '',
      gradientClass: banner.gradientClass || 'from-blue-600 to-indigo-700',
      order: banner.order || 0,
      isActive: banner.isActive !== false
    });
    setIsModalOpen(true);
  };

  // Handle image upload via Cloudinary or file picker
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setUploadProgress(10);
      const secureUrl = await uploadToCloudinary(file, 'homster/banners', (progress) => {
        setUploadProgress(progress);
      });
      setFormData(prev => ({ ...prev, imageUrl: secureUrl }));
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload banner image error:', error);
      // Fallback: try direct backend upload endpoint
      try {
        const fallbackFormData = new FormData();
        fallbackFormData.append('image', file);
        const fallbackRes = await api.post('/upload', fallbackFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (fallbackRes.data.success && fallbackRes.data.imageUrl) {
          setFormData(prev => ({ ...prev, imageUrl: fallbackRes.data.imageUrl }));
          toast.success('Image uploaded successfully!');
        } else {
          toast.error('Upload failed. You can paste image URL directly.');
        }
      } catch (fallbackErr) {
        toast.error('Failed to upload image. You can paste a direct URL.');
      }
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  // Save Banner (Create or Update)
  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!formData.imageUrl.trim()) {
      toast.error('Please upload a Banner Image');
      return;
    }

    if (formData.targetType === 'service' && !formData.targetServiceId) {
      toast.error('Please select a Service from the dropdown to redirect to');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        cityId: formData.cityId ? formData.cityId.toString() : null,
        targetCategoryId: formData.targetType === 'category' && formData.targetCategoryId ? formData.targetCategoryId.toString() : null,
        targetServiceId: formData.targetType === 'service' && formData.targetServiceId ? formData.targetServiceId.toString() : null,
        targetUrl: formData.targetType === 'url' ? formData.targetUrl.trim() : ''
      };

      if (editingBanner) {
        const res = await bannerService.updateBanner(editingBanner._id || editingBanner.id, payload);
        if (res.success) {
          toast.success('Banner updated successfully!');
          setIsModalOpen(false);
          fetchBanners();
          fetchStats();
        }
      } else {
        const res = await bannerService.createBanner(payload);
        if (res.success) {
          toast.success('New banner added successfully!');
          setIsModalOpen(false);
          fetchBanners();
          fetchStats();
        }
      }
    } catch (error) {
      console.error('Save banner error:', error);
      toast.error(error.response?.data?.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (banner) => {
    const bannerId = banner._id || banner.id;
    try {
      // Optimistic update
      setBanners(prev => prev.map(b => (b._id === bannerId || b.id === bannerId) ? { ...b, isActive: !b.isActive } : b));

      const res = await bannerService.toggleStatus(bannerId);
      if (res.success) {
        toast.success(`Banner ${res.isActive ? 'activated' : 'deactivated'}`);
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to update status');
      fetchBanners();
    }
  };

  // Delete banner
  const handleDeleteBanner = async (bannerId) => {
    try {
      const res = await bannerService.deleteBanner(bannerId);
      if (res.success) {
        toast.success('Banner deleted successfully');
        setDeleteConfirmId(null);
        fetchBanners();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  // Move banner order Up/Down
  const handleMoveOrder = async (index, direction) => {
    const newBanners = [...banners];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBanners.length) return;

    // Swap
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    // Reassign order indices
    const orders = newBanners.map((b, i) => ({
      id: b._id || b.id,
      order: i
    }));

    setBanners(newBanners);

    try {
      await bannerService.reorderBanners(orders);
      toast.success('Banner order updated');
    } catch (error) {
      toast.error('Failed to update order');
      fetchBanners();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* 1. Header & Title Section (Light Card) */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#720C3E]/10 text-[#720C3E] flex items-center justify-center text-xl font-bold">
            <FiImage />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Banner Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Create & manage promotional sliders, hero top banners, and offer cards for user app.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <FiRefreshCw className={`${refreshing ? 'animate-spin text-[#720C3E]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#720C3E] hover:bg-[#5e0932] text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <FiPlus className="text-sm" />
            <span>Add Banner</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Cards (Light Clean Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Banners */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Banners</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Configured in system</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
            <FiLayers />
          </div>
        </div>

        {/* Active Banners */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Active Banners</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Live on user side</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
            <FiCheckCircle />
          </div>
        </div>

        {/* Top Banners */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Top Banners</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">{stats.topCount || stats.heroCount || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Homepage top slider</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base">
            <FiImage />
          </div>
        </div>

        {/* Footer Banners */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Footer Banners</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.footerCount || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Homepage bottom banners</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
            <FiTag />
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar (Light Theme) */}
      <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search by title, badge, subtitle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
              <FiX />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Banner Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-[#720C3E]"
          >
            <option value="all">All Types</option>
            <option value="top">Top Banner (Home Top)</option>
            <option value="footer">Footer Banner (Home Bottom)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-[#720C3E]"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-[#720C3E]"
          >
            <option value="all">All Cities</option>
            <option value="null">Global (All Cities)</option>
            {cities.map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs transition-colors ${viewMode === 'grid' ? 'bg-[#720C3E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              title="Grid View"
            >
              <FiGrid />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition-colors ${viewMode === 'table' ? 'bg-[#720C3E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              title="List View"
            >
              <FiList />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Banner List / Grid (Light Theme) */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center shadow-sm">
          <div className="w-10 h-10 border-3 border-[#720C3E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-xs font-medium">Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-14 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-gray-100">
            <FiImage />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">No Banners Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? "No banners match your current filters. Try changing filter criteria."
              : "Get started by adding your first top hero banner for the user home page."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#720C3E] hover:bg-[#5e0932] text-white rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
          >
            <FiPlus />
            <span>Add Banner</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner, index) => {
            const bannerId = banner._id || banner.id;
            const targetServiceObj = banner.targetServiceId?.title 
              ? banner.targetServiceId 
              : services.find(s => (s._id || s.id)?.toString() === (banner.targetServiceId?._id || banner.targetServiceId)?.toString());

            const targetLabel =
              banner.targetType === 'service'
                ? `Service: ${targetServiceObj?.title || 'Selected Service'}`
                : banner.targetType === 'url'
                ? `Link: ${banner.targetUrl}`
                : 'No Action';

            return (
              <motion.div
                key={bannerId}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md flex flex-col ${
                  banner.isActive ? 'border-gray-200' : 'border-gray-200/60 opacity-80'
                }`}
              >
                {/* Banner Image Preview Container */}
                <div className="relative aspect-[16/8] bg-gray-100 overflow-hidden group">
                  <img
                    src={toAssetUrl(banner.imageUrl)}
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/600x300/f1f5f9/94a3b8?text=Banner+Image';
                    }}
                  />

                  {/* Gradient Overlay for badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 text-gray-800 backdrop-blur-sm shadow-sm">
                      {banner.bannerType === 'footer' || banner.bannerType === 'bottom' ? 'Footer Banner' : 'Top Banner'}
                    </span>

                    {banner.badgeText && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm border border-white/20"
                        style={{
                          background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)'
                        }}
                      >
                        {banner.badgeText}
                      </span>
                    )}
                  </div>

                  {/* Order & City at Bottom Image Edge */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
                    <span className="flex items-center gap-1 font-semibold bg-black/50 px-2 py-0.5 rounded text-[11px] backdrop-blur-sm">
                      <FiLayers className="text-[10px] text-blue-300" /> Order: {banner.order ?? index}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                      <FiMapPin className="text-amber-300 text-[10px]" />
                      {banner.cityId?.name || 'All Cities'}
                    </span>
                  </div>
                </div>

                {/* Banner Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                        {banner.title || 'Untitled Banner'}
                      </h3>
                      {/* Active Status Switch */}
                      <button
                        onClick={() => handleToggleStatus(banner)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          banner.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                        title={banner.isActive ? 'Active (Click to disable)' : 'Inactive (Click to activate)'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            banner.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {banner.subtitle && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}

                    {/* Target Link Info */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg truncate">
                      <FiLink className="flex-shrink-0 text-blue-500" />
                      <span className="truncate font-medium">{targetLabel}</span>
                    </div>
                  </div>

                  {/* Actions & Reordering Toolbar */}
                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    {/* Order buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveOrder(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 transition-colors"
                        title="Move Up"
                      >
                        <FiArrowUp className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(index, 'down')}
                        disabled={index === banners.length - 1}
                        className="p-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 transition-colors"
                        title="Move Down"
                      >
                        <FiArrowDown className="text-xs" />
                      </button>
                    </div>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(banner)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 transition-colors"
                      >
                        <FiEdit2 className="text-xs text-[#720C3E]" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(bannerId)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs border border-red-100 transition-colors"
                        title="Delete Banner"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase font-bold tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Title & Details</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Target Redirection</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {banners.map((banner, index) => {
                  const bannerId = banner._id || banner.id;
                  return (
                    <tr key={bannerId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-2.5">
                        <img
                          src={toAssetUrl(banner.imageUrl)}
                          alt={banner.title}
                          className="w-16 h-9 object-cover rounded border border-gray-200 shadow-xs"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-gray-900 text-xs">{banner.title || 'Untitled Banner'}</p>
                        {banner.subtitle && <p className="text-[11px] text-gray-500 truncate max-w-xs">{banner.subtitle}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                          {banner.bannerType === 'footer' || banner.bannerType === 'bottom' ? 'Footer Banner' : 'Top Banner'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-600 font-medium">
                        {banner.targetType === 'service'
                          ? `Service: ${
                              banner.targetServiceId?.title ||
                              services.find(s => (s._id || s.id)?.toString() === (banner.targetServiceId?._id || banner.targetServiceId)?.toString())?.title ||
                              'Selected Service'
                            }`
                          : banner.targetType === 'url'
                          ? `URL: ${banner.targetUrl}`
                          : 'None'}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-500">
                        {banner.cityId?.name || 'All Cities'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <span>{banner.order ?? index}</span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMoveOrder(index, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                            >
                              <FiArrowUp className="text-[9px]" />
                            </button>
                            <button
                              onClick={() => handleMoveOrder(index, 'down')}
                              disabled={index === banners.length - 1}
                              className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                            >
                              <FiArrowDown className="text-[9px]" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleToggleStatus(banner)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            banner.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {banner.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(banner)}
                            className="p-1 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(bannerId)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Create / Edit Banner Modal (Light Theme) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-gray-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#720C3E] text-white flex items-center justify-center text-base">
                    <FiImage />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Configure banner image, title, and action redirection
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FiX className="text-base" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveBanner} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* 1. Image Upload Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Banner Image <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-[#720C3E] bg-[#720C3E]/10 px-2 py-0.5 rounded-md">
                      {formData.bannerType === 'footer' ? 'Footer Size: 1200 × 450 px (16:6)' : 'Top Hero Size: 1200 × 600 px (2:1)'}
                    </span>
                  </div>

                  {/* Size & Dimension Guide Card for Mobile Fit */}
                  <div className="mb-2.5 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <div className="p-1 rounded-md bg-amber-100 text-amber-700 text-sm mt-0.5 shrink-0">
                      📐
                    </div>
                    <div className="space-y-0.5 text-[11px] leading-relaxed">
                      <p className="font-bold text-amber-950">
                        Recommended Dimensions (Best fit for mobile & desktop screens):
                      </p>
                      <ul className="list-disc list-inside text-amber-800 space-y-0.5 ml-1">
                        <li>
                          <span className="font-semibold text-gray-900">Top Banner (Hero Slider):</span>{' '}
                          <span className="font-bold text-[#720C3E]">1200 × 600 px</span> (Ratio 2:1 / 16:8) or <span className="font-semibold text-gray-900">1080 × 540 px</span>
                        </li>
                        <li>
                          <span className="font-semibold text-gray-900">Footer Banner:</span>{' '}
                          <span className="font-bold text-[#720C3E]">1200 × 450 px</span> (Ratio 16:6) or <span className="font-semibold text-gray-900">1080 × 400 px</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Preview Area */}
                  {formData.imageUrl ? (
                    <div className="relative aspect-[16/8] rounded-xl overflow-hidden border border-gray-200 group mb-2 bg-gray-50 shadow-inner">
                      <img
                        src={toAssetUrl(formData.imageUrl)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 rounded-lg text-xs font-bold shadow-md transition-colors">
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Upload Dropzone */
                    <label className="flex flex-col items-center justify-center aspect-[16/7.5] border-2 border-dashed border-gray-300 hover:border-[#720C3E] rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100/70 transition-all p-5 text-center group">
                      <div className="w-10 h-10 rounded-lg bg-white text-gray-400 group-hover:text-[#720C3E] shadow-sm flex items-center justify-center text-xl mb-1.5 transition-colors border border-gray-200">
                        <FiUploadCloud />
                      </div>
                      <span className="text-xs font-bold text-gray-700">
                        {uploadingImage ? `Uploading... ${uploadProgress}%` : 'Click to Upload Banner Image'}
                      </span>
                      <span className="text-[11px] text-gray-500 mt-1 font-medium">
                        {formData.bannerType === 'footer'
                          ? 'Recommended: 1200 × 450 px (16:6) | Max 5MB (PNG, JPG, WebP)'
                          : 'Recommended: 1200 × 600 px (2:1 Ratio) | Max 5MB (PNG, JPG, WebP)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 2. Title & Subtitle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Banner Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AC Repair Festival"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#720C3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Subtitle / Tagline (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Get Flat 50% Off Today"
                      value={formData.subtitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#720C3E]"
                    />
                  </div>
                </div>

                {/* 3. Banner Type & City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Banner Type
                    </label>
                    <select
                      value={formData.bannerType}
                      onChange={(e) => setFormData(prev => ({ ...prev, bannerType: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:bg-white focus:border-[#720C3E]"
                    >
                      <option value="top">Top Banner (Home Top)</option>
                      <option value="footer">Footer Banner (Home Bottom)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Target City
                    </label>
                    <select
                      value={formData.cityId}
                      onChange={(e) => setFormData(prev => ({ ...prev, cityId: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:bg-white focus:border-[#720C3E]"
                    >
                      <option value="">Global (All Cities)</option>
                      {cities.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Click Redirection / Target Action */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Click Redirection Action
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'service', label: 'Service' },
                      { id: 'url', label: 'Custom URL' }
                    ].map(t => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setFormData(prev => ({ ...prev, targetType: t.id }))}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          formData.targetType === t.id
                            ? 'bg-[#720C3E] text-white border-[#720C3E] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {formData.targetType === 'service' && (
                    <div className="pt-1.5">
                      <label className="block text-[11px] text-gray-700 mb-1 font-bold">
                        Select Service to Open <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.targetServiceId ? formData.targetServiceId.toString() : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetServiceId: e.target.value }))}
                        className={`w-full px-3 py-2 bg-white rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#720C3E] border ${
                          !formData.targetServiceId ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'
                        }`}
                        required
                      >
                        <option value="">-- Choose Service to Redirect --</option>
                        {services.map(s => {
                          const sId = (s._id || s.id)?.toString();
                          return (
                            <option key={sId} value={sId}>{s.title}</option>
                          );
                        })}
                      </select>
                      {!formData.targetServiceId && (
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">
                          Please choose the target service from the list above.
                        </p>
                      )}
                    </div>
                  )}

                  {formData.targetType === 'url' && (
                    <div className="pt-1.5">
                      <label className="block text-[11px] text-gray-500 mb-1 font-medium">External / Internal URL</label>
                      <input
                        type="text"
                        placeholder="e.g. /user/service/... or https://..."
                        value={formData.targetUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetUrl: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#720C3E]"
                      />
                    </div>
                  )}
                </div>

                {/* 5. Additional Settings (Badge, Order, Active) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Badge Text (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50% OFF"
                      value={formData.badgeText}
                      onChange={(e) => setFormData(prev => ({ ...prev, badgeText: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#720C3E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:bg-white focus:border-[#720C3E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold text-gray-700">
                        {formData.isActive ? 'Active (Live)' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingImage}
                    className="px-5 py-2 bg-[#720C3E] hover:bg-[#5e0932] text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Delete Confirmation Dialog (Light Theme) */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm p-5 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-xl mx-auto mb-3 border border-red-100">
                <FiAlertTriangle />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Delete Banner?</h3>
              <p className="text-xs text-gray-500 mb-4">
                Are you sure you want to delete this banner? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-2.5">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteBanner(deleteConfirmId)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BannersPage;

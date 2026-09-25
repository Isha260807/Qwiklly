import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiSearch,
  FiStar,
  FiDollarSign,
  FiUploadCloud,
  FiLayout,
  FiExternalLink
} from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import Modal from "../components/Modal";
import { toAssetUrl } from "../utils";
import { serviceService } from "../../../../../services/catalogService";

const initialServiceForm = {
  title: "",
  tagline: "One Booking. Countless Tasks.",
  description: "Let our professionals take care of everyday household tasks while you focus on work, family and everything else on your schedule.",
  badge: "",
  iconUrl: "",
  basePrice: "",
  originalPrice: "",
  discountPrice: "",
  pricingType: "FIXED",
  pricePer30Minutes: "",
  minDurationMinutes: 30,
  maxDurationMinutes: 240,
  hourlyRate: "",
  minHours: 1,
  maxHours: 8,
  allowCustomHours: false,
  allowExtraHours: true,
  allowExtraParts: true,
  gstPercentage: 18,
  rating: 4.9,
  ratingCount: "237.6k",
  status: "active"
};

const ServicesPage = ({ selectedCity }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [formData, setFormData] = useState(initialServiceForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  // Fetch Services from API
  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCity) params.cityId = selectedCity;
      if (searchTerm) params.search = searchTerm;

      const res = await serviceService.getAll(params);
      if (res.success && res.services) {
        setServices(res.services);
      } else if (res.data) {
        setServices(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [selectedCity]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    if (!searchTerm) return services;
    return services.filter(
      (s) =>
        s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tagline?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingServiceId(null);
    setFormData(initialServiceForm);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (service) => {
    setEditingServiceId(service._id || service.id);
    const pType = service.pricingType === "DURATION" ? "DURATION" : (service.pricingType === "HOURLY" ? "DURATION" : "FIXED");
    const p30 = service.pricePer30Minutes ?? service.durationPricing?.pricePer30Minutes ?? (service.hourlyRate ? Math.round(service.hourlyRate / 2) : (service.basePrice || ""));
    const minM = service.minDurationMinutes ?? service.durationPricing?.minDurationMinutes ?? (service.minHours ? service.minHours * 60 : 30);
    const maxM = service.maxDurationMinutes ?? service.durationPricing?.maxDurationMinutes ?? (service.maxHours ? service.maxHours * 60 : 240);

    setFormData({
      title: service.title || "",
      tagline: service.tagline || "",
      description: service.description || "",
      badge: service.badge || "",
      iconUrl: service.iconUrl || "",
      basePrice: service.basePrice ?? "",
      originalPrice: service.originalPrice ?? "",
      discountPrice: service.discountPrice ?? "",
      pricingType: pType,
      pricePer30Minutes: p30,
      minDurationMinutes: minM,
      maxDurationMinutes: maxM,
      hourlyRate: service.hourlyRate ?? "",
      minHours: service.minHours ?? 1,
      maxHours: service.maxHours ?? 8,
      allowCustomHours: service.allowCustomHours ?? false,
      allowExtraHours: service.allowExtraHours ?? true,
      allowExtraParts: service.allowExtraParts ?? true,
      gstPercentage: service.gstPercentage ?? 18,
      rating: service.rating ?? 4.9,
      ratingCount: service.ratingCount || "237.6k",
      status: service.status || "active"
    });
    setIsModalOpen(true);
  };

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await serviceService.uploadImage(file, "services");
      if (res.success && res.imageUrl) {
        setFormData((prev) => ({ ...prev, iconUrl: res.imageUrl }));
        toast.success("Image uploaded successfully!");
      } else {
        toast.error(res.message || "Image upload failed");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Save Service
  const handleSaveService = async (e) => {
    e?.preventDefault();

    if (!formData.title?.trim()) {
      toast.error("Service title is required");
      return;
    }

    if (formData.pricingType === "DURATION") {
      if (formData.pricePer30Minutes === "" || isNaN(formData.pricePer30Minutes) || Number(formData.pricePer30Minutes) <= 0) {
        toast.error("Valid Price per 30 minutes is required");
        return;
      }
      const minM = Number(formData.minDurationMinutes) || 30;
      const maxM = Number(formData.maxDurationMinutes) || 240;
      if (minM < 30 || minM % 30 !== 0) {
        toast.error("Minimum duration must be at least 30 minutes and a multiple of 30");
        return;
      }
      if (maxM < minM || maxM % 30 !== 0) {
        toast.error("Maximum duration must be greater than or equal to minimum duration and a multiple of 30");
        return;
      }
    } else {
      if (formData.basePrice === "" || isNaN(formData.basePrice)) {
        toast.error("Valid base price is required");
        return;
      }
    }

    try {
      setSaving(true);
      const isDur = formData.pricingType === "DURATION";
      const p30 = isDur ? Number(formData.pricePer30Minutes) : null;
      const minM = isDur ? (Number(formData.minDurationMinutes) || 30) : 30;
      const maxM = isDur ? (Number(formData.maxDurationMinutes) || 240) : 240;

      const payload = {
        title: formData.title.trim(),
        tagline: formData.tagline?.trim(),
        description: formData.description?.trim(),
        badge: formData.badge?.trim() || null,
        iconUrl: formData.iconUrl || null,
        basePrice: isDur ? (p30 * (minM / 30)) : Number(formData.basePrice),
        fixedPrice: isDur ? null : Number(formData.basePrice),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : 0,
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
        pricingType: isDur ? "DURATION" : "FIXED",
        pricePer30Minutes: p30,
        minDurationMinutes: minM,
        maxDurationMinutes: maxM,
        durationStepMinutes: 30,
        durationPricing: isDur ? {
          pricePer30Minutes: p30,
          minDurationMinutes: minM,
          maxDurationMinutes: maxM,
          stepMinutes: 30
        } : undefined,
        // Legacy hourly rate bridge for vendor timers
        hourlyRate: isDur ? (p30 * 2) : null,
        minHours: isDur ? (minM / 60) : 1,
        maxHours: isDur ? (maxM / 60) : 8,
        allowCustomHours: !!formData.allowCustomHours,
        allowExtraHours: !!formData.allowExtraHours,
        allowExtraParts: !!formData.allowExtraParts,
        gstPercentage: Number(formData.gstPercentage) || 18,
        rating: Number(formData.rating) || 4.9,
        ratingCount: formData.ratingCount || "237.6k",
        status: formData.status || "active",
        cityId: selectedCity || null,
        cityIds: selectedCity ? [selectedCity] : []
      };

      if (editingServiceId) {
        const res = await serviceService.update(editingServiceId, payload);
        if (res.success) {
          toast.success("Service updated successfully!");
          setIsModalOpen(false);
          fetchServices();
        } else {
          toast.error(res.message || "Failed to update service");
        }
      } else {
        const res = await serviceService.create(payload);
        if (res.success) {
          toast.success("Service created successfully!");
          setIsModalOpen(false);
          fetchServices();
        } else {
          toast.error(res.message || "Failed to create service");
        }
      }
    } catch (error) {
      console.error("Save service error:", error);
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  // Status Toggle
  const handleToggleStatus = async (service) => {
    const id = service._id || service.id;
    const newStatus = service.status === "active" ? "inactive" : "active";

    try {
      const res = await serviceService.update(id, { status: newStatus });
      if (res.success) {
        toast.success(`Service marked as ${newStatus}`);
        setServices((prev) =>
          prev.map((s) => ((s._id || s.id) === id ? { ...s, status: newStatus } : s))
        );
      }
    } catch (error) {
      toast.error("Failed to toggle service status");
    }
  };

  // Delete Service
  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    const id = serviceToDelete._id || serviceToDelete.id;

    try {
      const res = await serviceService.delete(id);
      if (res.success) {
        toast.success("Service deleted successfully");
        setDeleteModalOpen(false);
        setServiceToDelete(null);
        fetchServices();
      } else {
        toast.error(res.message || "Failed to delete service");
      }
    } catch (error) {
      toast.error("Failed to delete service");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#720C3E]/10 flex items-center justify-center text-[#720C3E]">
              <FiGrid className="text-xl" />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Manage Services
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage services catalog, basic details, and launch Page Builder for custom landing pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#720C3E] w-56 transition-all"
            />
          </div>

          {/* Add Service Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#720C3E] hover:bg-[#5b0931] text-white text-xs font-bold rounded-xl shadow-md shadow-[#720C3E]/20 transition-all duration-200 cursor-pointer active:scale-95"
          >
            <FiPlus className="text-base" />
            Add Service
          </button>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-pulse space-y-3"
            >
              <div className="w-full h-36 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FiPackage className="text-3xl" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Services Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No services matching "${searchTerm}". Try a different search term.`
              : "No services have been added yet. Click 'Add Service' to create your first service."}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#720C3E] text-white text-xs font-bold rounded-xl shadow-md transition-all hover:bg-[#5b0931]"
            >
              <FiPlus /> Add First Service
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredServices.map((service) => {
            const id = service._id || service.id;
            const hasDiscount =
              service.originalPrice && service.originalPrice > service.basePrice;

            return (
              <div
                key={id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
              >
                {/* Image & Badge Area */}
                <div className="relative w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
                  {service.iconUrl ? (
                    <img
                      src={toAssetUrl(service.iconUrl)}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <FiPackage className="text-slate-400 text-4xl" />
                  )}

                  {/* Badge */}
                  {service.badge && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm">
                      {service.badge}
                    </span>
                  )}

                  {/* Duration / Hourly Badge */}
                  {(service.pricingType === "DURATION" || service.pricingType === "HOURLY") && (
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 bg-[#720C3E] text-white text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm">
                      Duration Based
                    </span>
                  )}

                  {/* Rating Tag */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm flex items-center gap-1 text-[11px] font-bold text-slate-800">
                    <FiStar className="text-amber-500 fill-amber-500 text-xs" />
                    <span>{service.rating || 4.9}</span>
                    {service.ratingCount && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({service.ratingCount})
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight truncate capitalize" title={service.title}>
                      {service.title}
                    </h3>
                    {service.tagline && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {service.tagline}
                      </p>
                    )}
                  </div>

                  {/* Pricing & Status Row */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {service.pricingType === "DURATION" || service.pricingType === "HOURLY" ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-slate-900">
                            ₹{service.pricePer30Minutes ?? service.durationPricing?.pricePer30Minutes ?? (service.hourlyRate ? Math.round(service.hourlyRate / 2) : service.basePrice)}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">/ 30 mins</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-slate-900">
                            ₹{service.basePrice}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-slate-400 line-through font-medium">
                              ₹{service.originalPrice}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        {service.pricingType === "DURATION" || service.pricingType === "HOURLY"
                          ? `Range: ${service.minDurationMinutes ?? 30}m – ${service.maxDurationMinutes ?? 240}m`
                          : `GST: ${service.gstPercentage ?? 18}%`}
                      </span>
                    </div>

                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleStatus(service)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        service.status === "active"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {service.status === "active" ? "Active" : "Inactive"}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    {/* Launch Page Builder Button */}
                    <button
                      onClick={() => navigate(`/admin/user-categories/page-builder?serviceId=${id}`)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#720C3E] hover:bg-[#5b0931] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <FiLayout className="text-xs" /> Customize Page Builder
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(service)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <FiEdit2 className="text-xs" /> Edit Info
                      </button>
                      <button
                        onClick={() => {
                          setServiceToDelete(service);
                          setDeleteModalOpen(true);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Service"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingServiceId ? "Edit Service Info" : "Add New Service"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Service Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bathroom Cleaning, Kitchen Help, Dusting"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tagline / Subheading
              </label>
              <input
                type="text"
                placeholder="e.g. One Booking. Countless Tasks."
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Badge (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. POPULAR, BESTSELLER"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
              />
            </div>
          </div>

          {/* Pricing Model Selector */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Pricing Model <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pricingType: "FIXED" })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    formData.pricingType === "FIXED"
                      ? "bg-[#720C3E] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>Fixed Price</span>
                  <span className={`text-[10px] font-normal ${formData.pricingType === "FIXED" ? "text-pink-100" : "text-slate-400"}`}>
                    Flat price per booking
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pricingType: "DURATION" })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    formData.pricingType === "DURATION"
                      ? "bg-[#720C3E] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>Duration Based</span>
                  <span className={`text-[10px] font-normal ${formData.pricingType === "DURATION" ? "text-pink-100" : "text-slate-400"}`}>
                    30-minute scalable increments
                  </span>
                </button>
              </div>
            </div>

            {formData.pricingType === "FIXED" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Flat Base Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 199"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                    required={formData.pricingType === "FIXED"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Original Price / Strikethrough (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 299"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Price per 30 mins (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 30 or 150"
                      value={formData.pricePer30Minutes}
                      onChange={(e) => setFormData({ ...formData, pricePer30Minutes: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E] font-bold text-[#720C3E]"
                      required={formData.pricingType === "DURATION"}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Minimum Duration
                    </label>
                    <select
                      value={formData.minDurationMinutes}
                      onChange={(e) => setFormData({ ...formData, minDurationMinutes: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                    >
                      <option value={30}>30 mins (0.5 hr)</option>
                      <option value={60}>60 mins (1.0 hr)</option>
                      <option value={90}>90 mins (1.5 hrs)</option>
                      <option value={120}>120 mins (2.0 hrs)</option>
                      <option value={180}>180 mins (3.0 hrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Maximum Duration
                    </label>
                    <select
                      value={formData.maxDurationMinutes}
                      onChange={(e) => setFormData({ ...formData, maxDurationMinutes: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                    >
                      <option value={60}>60 mins (1.0 hr)</option>
                      <option value={90}>90 mins (1.5 hrs)</option>
                      <option value={120}>120 mins (2.0 hrs)</option>
                      <option value={180}>180 mins (3.0 hrs)</option>
                      <option value={240}>240 mins (4.0 hrs)</option>
                      <option value={300}>300 mins (5.0 hrs)</option>
                      <option value={360}>360 mins (6.0 hrs)</option>
                      <option value={480}>480 mins (8.0 hrs)</option>
                    </select>
                  </div>
                </div>

                {/* Live Dynamic Pricing Preview Card */}
                {formData.pricePer30Minutes && Number(formData.pricePer30Minutes) > 0 && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-xl border border-slate-700 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FiDollarSign className="text-xs" /> Dynamic Live Pricing Preview
                      </span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">
                        Formula: (Mins ÷ 30) × ₹{formData.pricePer30Minutes}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {Array.from(
                        { length: Math.floor(((Number(formData.maxDurationMinutes) || 240) - (Number(formData.minDurationMinutes) || 30)) / 30) + 1 },
                        (_, idx) => (Number(formData.minDurationMinutes) || 30) + idx * 30
                      ).slice(0, 8).map((mins) => (
                        <div key={mins} className="bg-white/10 rounded-lg p-2 text-center border border-white/5">
                          <p className="text-[11px] text-slate-300 font-medium">{mins} mins {mins >= 60 ? `(${mins / 60}h)` : ''}</p>
                          <p className="text-sm font-black text-amber-400 mt-0.5">
                            ₹{(mins / 30) * Number(formData.pricePer30Minutes)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GST (%)
              </label>
              <input
                type="number"
                value={formData.gstPercentage}
                onChange={(e) => setFormData({ ...formData, gstPercentage: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rating
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Service Thumbnail / Image
            </label>
            <div className="flex items-center gap-3">
              {formData.iconUrl && (
                <img
                  src={toAssetUrl(formData.iconUrl)}
                  alt="Thumbnail"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
              )}
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-600">
                <FiUploadCloud className="text-base text-[#720C3E]" />
                <span>{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#720C3E] hover:bg-[#5b0931] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
            >
              {saving ? "Saving..." : editingServiceId ? "Update Service" : "Create Service"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Service"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-bold text-slate-800">
              "{serviceToDelete?.title}"
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ServicesPage;

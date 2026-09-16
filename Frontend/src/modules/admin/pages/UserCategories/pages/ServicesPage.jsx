import React, { useState, useEffect, useMemo } from "react";
import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiSearch,
  FiStar,
  FiClock,
  FiDollarSign,
  FiCheckCircle,
  FiX,
  FiUploadCloud,
  FiInfo,
  FiList
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import CardShell from "../components/CardShell";
import Modal from "../components/Modal";
import { toAssetUrl } from "../utils";
import { serviceService } from "../../../../../services/catalogService";

const initialServiceForm = {
  title: "",
  tagline: "",
  description: "",
  badge: "",
  iconUrl: "",
  basePrice: "",
  originalPrice: "",
  discountPrice: "",
  gstPercentage: 18,
  rating: 4.9,
  ratingCount: "237.6k",
  status: "active",
  inclusions: [
    { title: "Bathroom Cleaning", duration: "40 mins", iconUrl: "" },
    { title: "Utensils", duration: "20 mins", iconUrl: "" },
    { title: "Sweeping & Mopping", duration: "30 mins", iconUrl: "" }
  ]
};

const ServicesPage = ({ selectedCity }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [formData, setFormData] = useState(initialServiceForm);
  const [activeModalTab, setActiveModalTab] = useState("basic"); // 'basic', 'pricing', 'inclusions'
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
    setActiveModalTab("basic");
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (service) => {
    setEditingServiceId(service._id || service.id);
    setFormData({
      title: service.title || "",
      tagline: service.tagline || "",
      description: service.description || "",
      badge: service.badge || "",
      iconUrl: service.iconUrl || "",
      basePrice: service.basePrice ?? "",
      originalPrice: service.originalPrice ?? "",
      discountPrice: service.discountPrice ?? "",
      gstPercentage: service.gstPercentage ?? 18,
      rating: service.rating ?? 4.9,
      ratingCount: service.ratingCount || "237.6k",
      status: service.status || "active",
      inclusions:
        service.inclusions && service.inclusions.length > 0
          ? service.inclusions
          : [{ title: "", duration: "", iconUrl: "" }]
    });
    setActiveModalTab("basic");
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

  // Inclusions dynamic handlers
  const handleAddInclusion = () => {
    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, { title: "", duration: "30 mins", iconUrl: "" }]
    }));
  };

  const handleRemoveInclusion = (index) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index)
    }));
  };

  const handleInclusionChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.inclusions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, inclusions: updated };
    });
  };

  // Save Service
  const handleSaveService = async (e) => {
    e?.preventDefault();

    if (!formData.title?.trim()) {
      toast.error("Service title is required");
      setActiveModalTab("basic");
      return;
    }

    if (formData.basePrice === "" || isNaN(formData.basePrice)) {
      toast.error("Valid base price is required");
      setActiveModalTab("pricing");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        tagline: formData.tagline?.trim(),
        description: formData.description?.trim(),
        badge: formData.badge?.trim() || null,
        iconUrl: formData.iconUrl || null,
        basePrice: Number(formData.basePrice),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : 0,
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
        gstPercentage: Number(formData.gstPercentage) || 18,
        rating: Number(formData.rating) || 4.9,
        ratingCount: formData.ratingCount || "237.6k",
        status: formData.status || "active",
        inclusions: formData.inclusions.filter((inc) => inc.title?.trim() !== ""),
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
            Create and manage standalone services with direct pricing, task inclusions, and duration estimates.
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
              : "No services have been added yet. Click 'Add Service' to create your first direct service."}
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
                    <h3 className="font-bold text-slate-900 text-sm leading-tight truncate" title={service.title}>
                      {service.title}
                    </h3>
                    {service.tagline && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {service.tagline}
                      </p>
                    )}

                    {/* Inclusions summary */}
                    {service.inclusions && service.inclusions.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#720C3E] font-semibold bg-[#720C3E]/5 px-2 py-1 rounded-lg">
                        <FiCheckCircle className="text-xs shrink-0" />
                        <span className="truncate">{service.inclusions.length} tasks included</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing & Status Row */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
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
                      <span className="text-[10px] text-slate-400">GST: {service.gstPercentage ?? 18}%</span>
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
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(service)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <FiEdit2 className="text-xs" /> Edit
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
            );
          })}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingServiceId ? "Edit Service" : "Add New Service"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveService} className="space-y-5">
          {/* Modal Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            {[
              { id: "basic", label: "1. Basic Info", icon: FiInfo },
              { id: "pricing", label: "2. Pricing & Rating", icon: FiDollarSign },
              { id: "inclusions", label: "3. Included Tasks", icon: FiList }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeModalTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    isActive
                      ? "border-[#720C3E] text-[#720C3E]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Basic Info */}
          {activeModalTab === "basic" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Service Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hourly Service, Bathroom Cleaning, Festive Home Help"
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
                    placeholder="e.g. NEW, POPULAR, BESTSELLER"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the service details and customer expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                />
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Service Image / Thumbnail
                </label>
                <div className="flex items-center gap-4">
                  {formData.iconUrl && (
                    <img
                      src={toAssetUrl(formData.iconUrl)}
                      alt="Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                  )}
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs font-bold text-slate-600">
                      <FiUploadCloud className="text-base text-[#720C3E]" />
                      <span>{uploadingImage ? "Uploading..." : "Upload Service Image"}</span>
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
              </div>
            </div>
          )}

          {/* Tab 2: Pricing & Rating */}
          {activeModalTab === "pricing" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Base Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Original Price / Strikethrough (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 125"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Percentage (%)
                  </label>
                  <input
                    type="number"
                    placeholder="18"
                    value={formData.gstPercentage}
                    onChange={(e) => setFormData({ ...formData, gstPercentage: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rating (e.g. 4.9)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    placeholder="4.9"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rating Count (e.g. 237.6k)
                  </label>
                  <input
                    type="text"
                    placeholder="237.6k ratings"
                    value={formData.ratingCount}
                    onChange={(e) => setFormData({ ...formData, ratingCount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                >
                  <option value="active">Active (Visible to users)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab 3: Included Tasks / Scope */}
          {activeModalTab === "inclusions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Included Tasks & Time Estimates
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    List specific sub-tasks and durations shown on the service details page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddInclusion}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#720C3E]/10 hover:bg-[#720C3E]/20 text-[#720C3E] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <FiPlus /> Add Task
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {formData.inclusions.map((inc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <input
                      type="text"
                      placeholder="Task Name (e.g. Bathroom Cleaning)"
                      value={inc.title || inc.name || ""}
                      onChange={(e) =>
                        handleInclusionChange(index, "title", e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#720C3E]"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 40 mins)"
                      value={inc.duration || ""}
                      onChange={(e) =>
                        handleInclusionChange(index, "duration", e.target.value)
                      }
                      className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#720C3E]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInclusion(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove task"
                    >
                      <FiX className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#720C3E] hover:bg-[#5b0931] text-white rounded-xl text-xs font-bold shadow-md shadow-[#720C3E]/20 transition-all cursor-pointer disabled:opacity-50"
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
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
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

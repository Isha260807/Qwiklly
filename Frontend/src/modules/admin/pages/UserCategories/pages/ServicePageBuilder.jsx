import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FiLayout,
  FiSave,
  FiUploadCloud,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiX,
  FiInfo,
  FiList,
  FiShield,
  FiLayers,
  FiHelpCircle,
  FiImage,
  FiExternalLink,
  FiCheck,
  FiEye
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { serviceService } from "../../../../../services/catalogService";
import { toAssetUrl } from "../utils";

const defaultPageTemplate = {
  tagline: "One Booking. Countless Tasks.",
  description: "Let our professionals take care of everyday household tasks while you focus on work, family and everything else on your schedule.",
  heroBanner: {
    imageUrl: "",
    buttonText: "BOOK NOW"
  },
  inclusions: [
    { title: "Bathroom Cleaning", duration: "40 mins", iconUrl: "" },
    { title: "Utensils", duration: "20 mins", iconUrl: "" },
    { title: "Sweeping & Mopping", duration: "30 mins", iconUrl: "" }
  ],
  whyLoveTitle: "Why Customers Love Our Services",
  whyLove: [
    { text: "Book only the help you need" },
    { text: "No recurring commitment required" },
    { text: "Multiple household tasks covered" },
    { text: "Flexible duration options" },
    { text: "Trained & verified professionals" },
    { text: "Convenient scheduling" }
  ],
  exclusionsTitle: "Does not include",
  exclusions: [
    { text: "Dry wiping of walls" },
    { text: "Complete wardrobe cleaning and organization" },
    { text: "Kitchen cabinet cleaning (interior and exterior)" },
    { text: "Shower cubicle deep cleaning" },
    { text: "Bathtub scrubbing and cleaning" },
    { text: "Any other services like Deep Steam Cleaning, Car Washing or Plant Care." },
    { text: "Chandelier cleaning and fragile glass work are excluded from this service." },
    { text: "Commercial properties or ongoing construction work" },
    { text: "Ironing & Folding" }
  ],
  howItWorksTitle: "How it's done?",
  howItWorks: [
    {
      stepNumber: 1,
      title: "Plan the Work",
      description: "Your professional plans the tasks as per your needs and time booked.",
      iconUrl: ""
    },
    {
      stepNumber: 2,
      title: "Start Cleaning",
      description: "They'll begin with the tasks you want like sweeping, mopping, or bathroom cleaning.",
      iconUrl: ""
    },
    {
      stepNumber: 3,
      title: "Final Checks",
      description: "Before finishing, they'll give a quick wipe and make sure everything looks clean and tidy.",
      iconUrl: ""
    }
  ],
  faqs: [
    {
      question: "What if the cleaning isn't completed within the selected time?",
      answer: "You can place a new booking for the additional time you need, and it will be assigned to the same professional."
    },
    {
      question: "How can I trust your service?",
      answer: "All our professionals undergo thorough background checks, identity verification, and hands-on training before being assigned to jobs."
    },
    {
      question: "Do I need to provide all the cleaning equipment?",
      answer: "Basic supplies are usually available, but you can specify your requirements at the time of booking."
    },
    {
      question: "How are the prices calculated?",
      answer: "Pricing is transparent and based on hourly rates or specific service parameters with no hidden costs."
    },
    {
      question: "How do I contact support?",
      answer: "You can reach our 24/7 customer support directly via the Help & Support section in the app."
    }
  ]
};

const ServicePageBuilder = ({ selectedCity }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(searchParams.get("serviceId") || "");
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("hero"); // 'hero', 'inclusions', 'benefits', 'howItWorks', 'faqs'
  const [uploading, setUploading] = useState(false);

  // Form State for Page Builder
  const [formData, setFormData] = useState(defaultPageTemplate);

  // Fetch Services List
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedCity) params.cityId = selectedCity;
        const res = await serviceService.getAll(params);

        if (res.success && res.services) {
          setServices(res.services);

          // Auto-select first service if none in URL
          const currentId = searchParams.get("serviceId") || (res.services[0]?._id || res.services[0]?.id || "");
          if (currentId) {
            setSelectedServiceId(currentId);
            const found = res.services.find((s) => (s._id || s.id) === currentId);
            if (found) {
              loadServiceIntoForm(found);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load services:", error);
        toast.error("Failed to load services");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [selectedCity]);

  // Load selected service data into form
  const loadServiceIntoForm = (service) => {
    setSelectedService(service);
    setFormData({
      tagline: service.tagline || defaultPageTemplate.tagline,
      description: service.description || defaultPageTemplate.description,
      heroBanner: service.heroBanner || {
        imageUrl: service.iconUrl || "",
        buttonText: "BOOK NOW"
      },
      inclusions:
        service.inclusions && service.inclusions.length > 0
          ? service.inclusions
          : defaultPageTemplate.inclusions,
      whyLoveTitle: service.whyLoveTitle || `Why Customers Love ${service.title || "Hourly Services"}`,
      whyLove:
        service.whyLove && service.whyLove.length > 0
          ? service.whyLove
          : defaultPageTemplate.whyLove,
      exclusionsTitle: service.exclusionsTitle || defaultPageTemplate.exclusionsTitle,
      exclusions:
        service.exclusions && service.exclusions.length > 0
          ? service.exclusions
          : defaultPageTemplate.exclusions,
      howItWorksTitle: service.howItWorksTitle || defaultPageTemplate.howItWorksTitle,
      howItWorks:
        service.howItWorks && service.howItWorks.length > 0
          ? service.howItWorks
          : defaultPageTemplate.howItWorks,
      faqs:
        service.faqs && service.faqs.length > 0
          ? service.faqs
          : defaultPageTemplate.faqs
    });
  };

  const handleSelectService = (serviceId) => {
    setSelectedServiceId(serviceId);
    setSearchParams({ serviceId });
    const found = services.find((s) => (s._id || s.id) === serviceId);
    if (found) {
      loadServiceIntoForm(found);
    }
  };

  // Upload helpers
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await serviceService.uploadImage(file, "services/banners");
      if (res.success && res.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          heroBanner: { ...(prev.heroBanner || {}), imageUrl: res.imageUrl }
        }));
        toast.success("Hero Banner uploaded!");
      }
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGenericItemUpload = async (file, callback) => {
    if (!file) return;
    try {
      const res = await serviceService.uploadImage(file, "services/items");
      if (res.success && res.imageUrl) {
        callback(res.imageUrl);
        toast.success("Icon uploaded!");
      }
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  // Inclusions Handlers
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

  // Why Love Handlers
  const handleAddWhyLove = () => {
    setFormData((prev) => ({
      ...prev,
      whyLove: [...prev.whyLove, { text: "" }]
    }));
  };

  const handleRemoveWhyLove = (index) => {
    setFormData((prev) => ({
      ...prev,
      whyLove: prev.whyLove.filter((_, i) => i !== index)
    }));
  };

  const handleWhyLoveChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.whyLove];
      updated[index] = { text: value };
      return { ...prev, whyLove: updated };
    });
  };

  // Exclusions Handlers
  const handleAddExclusion = () => {
    setFormData((prev) => ({
      ...prev,
      exclusions: [...prev.exclusions, { text: "" }]
    }));
  };

  const handleRemoveExclusion = (index) => {
    setFormData((prev) => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== index)
    }));
  };

  const handleExclusionChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.exclusions];
      updated[index] = { text: value };
      return { ...prev, exclusions: updated };
    });
  };

  // Steps Handlers
  const handleAddStep = () => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: [
        ...prev.howItWorks,
        {
          stepNumber: prev.howItWorks.length + 1,
          title: "",
          description: "",
          iconUrl: ""
        }
      ]
    }));
  };

  const handleRemoveStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: prev.howItWorks.filter((_, i) => i !== index)
    }));
  };

  const handleStepChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.howItWorks];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, howItWorks: updated };
    });
  };

  // FAQs Handlers
  const handleAddFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }]
    }));
  };

  const handleRemoveFaq = (index) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  const handleFaqChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.faqs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  // Save entire page builder configuration
  const handleSavePage = async () => {
    if (!selectedServiceId) {
      toast.error("Please select a service first");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        tagline: formData.tagline?.trim(),
        description: formData.description?.trim(),
        heroBanner: formData.heroBanner,
        inclusions: formData.inclusions.filter((inc) => inc.title?.trim() !== ""),
        whyLoveTitle: formData.whyLoveTitle?.trim(),
        whyLove: formData.whyLove.filter((item) => item.text?.trim() !== ""),
        exclusionsTitle: formData.exclusionsTitle?.trim(),
        exclusions: formData.exclusions.filter((item) => item.text?.trim() !== ""),
        howItWorksTitle: formData.howItWorksTitle?.trim(),
        howItWorks: formData.howItWorks.filter((item) => item.title?.trim() !== ""),
        faqs: formData.faqs.filter((item) => item.question?.trim() !== "")
      };

      const res = await serviceService.update(selectedServiceId, payload);
      if (res.success) {
        toast.success(`Page Builder saved for ${selectedService?.title || "Service"}!`);
      } else {
        toast.error(res.message || "Failed to save page");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save page builder changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#720C3E]/10 flex items-center justify-center text-[#720C3E]">
              <FiLayout className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Service Page Builder
              </h1>
              <p className="text-xs text-slate-500">
                Design custom dynamic landing pages for each service with banners, task scopes, benefits, steps & FAQs.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Quick View */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSavePage}
            disabled={saving || !selectedServiceId}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#720C3E] hover:bg-[#5b0931] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-[#720C3E]/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <FiSave className="text-sm" />
            {saving ? "Saving..." : "Save Page Builder"}
          </button>
        </div>
      </div>

      {/* Service Selector Ribbon */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">
            Select Service:
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => handleSelectService(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
          >
            {services.map((svc) => {
              const id = svc._id || svc.id;
              return (
                <option key={id} value={id}>
                  {svc.title} — ₹{svc.basePrice} ({svc.status === "active" ? "Active" : "Inactive"})
                </option>
              );
            })}
          </select>
        </div>

        {selectedService && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">
              Price: <span className="font-black text-slate-900">₹{selectedService.basePrice}</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-700">
              {selectedService.status}
            </span>
          </div>
        )}
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Navigation Tabs & Section Forms */}
        <div className="lg:col-span-12 space-y-5">
          {/* Builder Navigation Tabs */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-sm flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "hero", label: "1. Banner & Overview", icon: FiImage },
              { id: "inclusions", label: "2. Included Tasks & Duration", icon: FiList },
              { id: "benefits", label: "3. Benefits & Exclusions", icon: FiShield },
              { id: "howItWorks", label: "4. Step-by-Step Process", icon: FiLayers },
              { id: "faqs", label: "5. FAQ Accordion", icon: FiHelpCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#720C3E] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Hero Banner & Overview */}
          {activeTab === "hero" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FiImage className="text-[#720C3E]" /> Hero Banner & Description
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tagline / Subheading
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. One Booking. Countless Tasks."
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hero Button Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BOOK NOW"
                    value={formData.heroBanner?.buttonText}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        heroBanner: { ...(formData.heroBanner || {}), buttonText: e.target.value }
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Service Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what the service provides and what the customer can expect..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
                />
              </div>

              {/* Hero Banner Upload */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Hero Cover Banner Image
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {formData.heroBanner?.imageUrl && (
                    <img
                      src={toAssetUrl(formData.heroBanner.imageUrl)}
                      alt="Banner Preview"
                      className="w-40 h-24 rounded-xl object-cover border border-slate-200 shadow-xs"
                    />
                  )}
                  <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-600">
                    <FiUploadCloud className="text-lg text-[#720C3E]" />
                    <span>{uploading ? "Uploading..." : "Upload High-Res Hero Banner"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Included Tasks ("How long does it take?") */}
          {activeTab === "inclusions" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FiList className="text-[#720C3E]" /> Included Tasks & Durations ("How long does it take?")
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tasks are displayed in the 4-column 3D grid on the user service page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddInclusion}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#720C3E] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#5b0931]"
                >
                  <FiPlus /> Add Task
                </button>
              </div>

              <div className="space-y-3">
                {formData.inclusions.map((inc, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {/* Icon Preview / Upload */}
                    <div className="flex items-center gap-2">
                      {inc.iconUrl ? (
                        <img
                          src={toAssetUrl(inc.iconUrl)}
                          alt="Task Icon"
                          className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                          3D Icon
                        </div>
                      )}
                      <label className="text-[11px] text-[#720C3E] font-bold cursor-pointer hover:underline">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleGenericItemUpload(file, (url) => handleInclusionChange(index, "iconUrl", url));
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="Task Title (e.g. Bathroom Cleaning)"
                      value={inc.title || inc.name || ""}
                      onChange={(e) => handleInclusionChange(index, "title", e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#720C3E]"
                    />

                    <input
                      type="text"
                      placeholder="Duration (e.g. 40 mins)"
                      value={inc.duration || ""}
                      onChange={(e) => handleInclusionChange(index, "duration", e.target.value)}
                      className="w-full sm:w-32 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#720C3E]"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveInclusion(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                      title="Remove task"
                    >
                      <FiTrash2 className="text-base" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Benefits & Exclusions */}
          {activeTab === "benefits" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Benefits (Green Checkmarks) */}
              <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <label className="block text-[11px] font-black text-emerald-900 uppercase tracking-wider mb-1">
                      Benefits Heading
                    </label>
                    <input
                      type="text"
                      value={formData.whyLoveTitle}
                      onChange={(e) => setFormData({ ...formData, whyLoveTitle: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddWhyLove}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-800"
                  >
                    <FiPlus /> Add
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.whyLove.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        ✓
                      </span>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleWhyLoveChange(idx, e.target.value)}
                        placeholder="e.g. Trained & verified professionals"
                        className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveWhyLove(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exclusions (Red Crosses) */}
              <div className="bg-red-50/50 p-5 rounded-2xl border border-red-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <label className="block text-[11px] font-black text-red-900 uppercase tracking-wider mb-1">
                      Exclusions Heading
                    </label>
                    <input
                      type="text"
                      value={formData.exclusionsTitle}
                      onChange={(e) => setFormData({ ...formData, exclusionsTitle: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExclusion}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-red-700"
                  >
                    <FiPlus /> Add
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.exclusions.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        ✕
                      </span>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleExclusionChange(idx, e.target.value)}
                        placeholder="e.g. Dry wiping of walls"
                        className="flex-1 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusion(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: How It Works Steps */}
          {activeTab === "howItWorks" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Process Section Heading
                  </label>
                  <input
                    type="text"
                    value={formData.howItWorksTitle}
                    onChange={(e) => setFormData({ ...formData, howItWorksTitle: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#720C3E] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#5b0931]"
                >
                  <FiPlus /> Add Step
                </button>
              </div>

              <div className="space-y-4">
                {formData.howItWorks.map((step, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#720C3E] bg-[#720C3E]/10 px-3 py-1 rounded-md">
                        Step {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                      >
                        <FiTrash2 className="text-base" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Step Title (e.g. Plan the Work)"
                        value={step.title}
                        onChange={(e) => handleStepChange(idx, "title", e.target.value)}
                        className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                      <div className="flex items-center gap-2">
                        {step.iconUrl && (
                          <img src={toAssetUrl(step.iconUrl)} alt="Step Icon" className="w-8 h-8 rounded object-contain bg-white border" />
                        )}
                        <label className="text-[11px] text-[#720C3E] font-bold cursor-pointer hover:underline">
                          Upload Step Icon
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleGenericItemUpload(file, (url) => handleStepChange(idx, "iconUrl", url));
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Step Description (e.g. Your professional plans the tasks as per your needs...)"
                      value={step.description}
                      onChange={(e) => handleStepChange(idx, "description", e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: FAQs */}
          {activeTab === "faqs" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FiHelpCircle className="text-[#720C3E]" /> Frequently Asked Questions (Accordion)
                  </h3>
                  <p className="text-xs text-slate-500">Add questions and answers that expand on click.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#720C3E] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#5b0931]"
                >
                  <FiPlus /> Add FAQ
                </button>
              </div>

              <div className="space-y-3.5">
                {formData.faqs.map((faq, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-600">Question #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaq(idx)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                      >
                        <FiTrash2 className="text-base" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Question..."
                      value={faq.question}
                      onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    />

                    <textarea
                      rows={2}
                      placeholder="Answer..."
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicePageBuilder;

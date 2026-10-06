import React, { useEffect, useState } from "react";
import { FiHome, FiImage, FiSave, FiUploadCloud } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { homeContentService } from "../../../../../services/catalogService";
import { serviceService } from "../../../../../services/catalogService";

const defaultTrustSection = {
  isVisible: true,
  title: "Relax, your home is in professional hands",
  trustedBy: "15 lakh",
  trustedLabel: "Families",
  rating: "",
  ratingLabel: "3 Lakh+ Ratings",
  imageUrl: "/Homster xpert .png",
};

const HomeContentPage = () => {
  const [formData, setFormData] = useState(defaultTrustSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);


  const loadHomeContent = async () => {
    try {
      setLoading(true);
      const response = await homeContentService.get();
      const trustSection = response.homeContent?.trustSection || {};
      setFormData({ ...defaultTrustSection, ...trustSection });
    } catch (error) {
      console.error("Failed to load home content:", error);
      toast.error("Failed to load home content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeContent();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await serviceService.uploadImage(file, "home-content/trust-section");
      if (response.success && response.imageUrl) {
        setFormData((previous) => ({ ...previous, imageUrl: response.imageUrl }));
        toast.success("Trust section image uploaded");
      } else {
        toast.error(response.message || "Image upload failed");
      }
    } catch (error) {
      console.error("Trust section image upload error:", error);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await homeContentService.update({ trustSection: formData });

      if (response.success) {
        toast.success("Home content saved successfully");
        setFormData({ ...defaultTrustSection, ...(response.homeContent?.trustSection || formData) });
      } else {
        toast.error(response.message || "Failed to save home content");
      }
    } catch (error) {
      console.error("Failed to save home content:", error);
      toast.error("Failed to save home content");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/10";
  const labelClass = "mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600";

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#720C3E]/10 text-[#720C3E]">
            <FiHome className="text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">Home Content</h1>
            <p className="text-xs text-slate-500">
              Manage the dynamic trust and cart CTA section shown at the end of the user home page.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#720C3E] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#720C3E]/20 transition hover:bg-[#5b0931] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiSave />
          {saving ? "Saving..." : "Save Home Content"}
        </button>
      </div>

      <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Trust Section Settings</h2>
                <p className="mt-1 text-xs text-slate-500">These values are rendered dynamically in the user catalog.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isVisible)}
                  onChange={(event) => setFormData((previous) => ({ ...previous, isVisible: event.target.checked }))}
                  className="h-4 w-4 accent-[#720C3E]"
                />
                Visible
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className={labelClass}>Section title</span>
                <input name="title" value={formData.title} onChange={handleChange} className={fieldClass} placeholder="Relax, your home is in professional hands" />
              </label>
              <label>
                <span className={labelClass}>Trusted by value</span>
                <input name="trustedBy" value={formData.trustedBy} onChange={handleChange} className={fieldClass} placeholder="15 lakh" />
              </label>
              <label>
                <span className={labelClass}>Trusted by label</span>
                <input name="trustedLabel" value={formData.trustedLabel} onChange={handleChange} className={fieldClass} placeholder="Families" />
              </label>
              <label>
                <span className={labelClass}>Rating value</span>
                <input name="rating" value={formData.rating} onChange={handleChange} className={fieldClass} placeholder="Blank = auto calculate" />
              </label>
              <label>
                <span className={labelClass}>Rating label</span>
                <input name="ratingLabel" value={formData.ratingLabel} onChange={handleChange} className={fieldClass} placeholder="3 Lakh+ Ratings" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FiImage className="text-[#720C3E]" />
              <div>
                <h2 className="text-base font-black text-slate-900">Professional image</h2>
                <p className="text-xs text-slate-500">This image appears in the visual area of the section.</p>
              </div>
            </div>
            <label className={labelClass}>Image URL</label>
            <input name="imageUrl" value={formData.imageUrl} onChange={handleChange} className={fieldClass} placeholder="Paste image URL" />
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#720C3E]/20 bg-[#720C3E]/5 px-4 py-2.5 text-xs font-bold text-[#720C3E] hover:bg-[#720C3E]/10">
              <FiUploadCloud />
              {uploading ? "Uploading..." : "Upload image"}
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

    </div>
  );
};

export default HomeContentPage;
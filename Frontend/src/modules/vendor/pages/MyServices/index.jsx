import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLayers, FiSearch, FiCheck, FiPlus, FiX, FiSave, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import { vendorAuthService } from '../../../../services/authService';
import { publicCatalogService } from '../../../../services/catalogService';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LogoLoader from '../../../../components/common/LogoLoader';

const MyServices = () => {
  const navigate = useNavigate();

  const [selectedServices, setSelectedServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 1. Load Vendor's existing services
        const storedVendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        let initialServices = [];
        if (storedVendorData) {
          const raw = storedVendorData.service || storedVendorData.services || storedVendorData.categories || [];
          initialServices = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        }

        try {
          const profileRes = await vendorAuthService.getProfile();
          if (profileRes?.success && profileRes.vendor) {
            const raw = profileRes.vendor.service || profileRes.vendor.services || [];
            initialServices = Array.isArray(raw) ? raw : (raw ? [raw] : []);
          }
        } catch (e) {
          console.error('Error loading vendor profile:', e);
        }

        setSelectedServices(initialServices);

        // 2. Load available catalog services
        const serviceTitles = new Set();
        try {
          const svcRes = await publicCatalogService.getServices();
          if (svcRes?.success && Array.isArray(svcRes.services)) {
            svcRes.services.forEach(s => {
              if (s.title && s.title.trim()) {
                serviceTitles.add(s.title.trim());
              }
            });
          }
        } catch (sErr) {
          console.error('Error fetching admin services:', sErr);
        }

        try {
          const brandRes = await publicCatalogService.getBrands();
          if (brandRes?.success && Array.isArray(brandRes.brands)) {
            brandRes.brands.forEach(b => {
              if (b.title && b.title.trim()) {
                serviceTitles.add(b.title.trim());
              }
            });
          }
        } catch (bErr) {
          console.error('Error fetching admin brands:', bErr);
        }

        // Also add already selected services to list if not present
        initialServices.forEach(s => {
          if (s && s.trim()) serviceTitles.add(s.trim());
        });

        setAvailableServices(Array.from(serviceTitles));
      } catch (err) {
        console.error('Error loading services:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(prev => prev.filter(s => s !== service));
    } else {
      setSelectedServices(prev => [...prev, service]);
    }
  };

  const handleSave = async () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setIsSaving(true);
    try {
      const response = await vendorAuthService.updateProfile({
        service: selectedServices,
        services: selectedServices,
      });

      if (response?.success) {
        toast.success('Services updated successfully!');
        window.dispatchEvent(new CustomEvent('vendorDataUpdated'));
        window.dispatchEvent(new CustomEvent('vendorProfileUpdated'));
        navigate('/vendor/profile');
      } else {
        toast.error(response?.message || 'Failed to update services');
      }
    } catch (error) {
      console.error('Error saving services:', error);
      toast.error(error?.response?.data?.message || 'Failed to update services');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAvailable = availableServices.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="My Services" />

      <main className="max-w-md mx-auto px-4 pt-4 pb-6">
        {/* Info Card */}
        <div className="bg-white rounded-xl p-3 mb-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FCEBF3] text-[#720C3E]">
              <FiLayers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#24151D] leading-tight">Assigned Services</h3>
              <p className="text-[10px] text-gray-500 font-medium">Select the services you provide</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCEBF3] text-[#720C3E]">
            {selectedServices.length} Selected
          </span>
        </div>

        {/* Selected Services Tags */}
        {selectedServices.length > 0 && (
          <div className="bg-white rounded-xl p-3 mb-3 shadow-xs">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Your Active Services
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedServices.map((service, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[#FCEBF3] text-[#720C3E]"
                >
                  {service}
                  <button
                    type="button"
                    onClick={() => toggleService(service)}
                    className="hover:opacity-75 active:scale-95 cursor-pointer ml-0.5"
                    aria-label={`Remove ${service}`}
                  >
                    <FiX className="w-3 h-3 text-[#720C3E]" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search Catalog */}
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search available services..."
            className="w-full pl-9 pr-8 py-2.5 bg-white rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 shadow-xs focus:outline-none focus:ring-1 focus:ring-[#720C3E]"
          />
          <FiSearch className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Services List */}
        <div className="bg-white rounded-xl p-3 mb-4 shadow-xs">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Available Services
          </h4>

          {filteredAvailable.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              No services found matching "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredAvailable.map((service, idx) => {
                const isSelected = selectedServices.includes(service);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FCEBF3] text-[#720C3E]'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="truncate text-left">{service}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ml-2 transition-all ${
                        isSelected
                          ? 'bg-[#720C3E] text-white'
                          : 'border border-gray-300 text-transparent'
                      }`}
                    >
                      <FiCheck className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50"
          style={{ background: '#720C3E' }}
        >
          <FiSave className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Services'}
        </button>
      </main>
    </div>
  );
};

export default MyServices;

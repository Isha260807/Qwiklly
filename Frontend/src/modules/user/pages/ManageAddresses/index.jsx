import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiArrowLeft,
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiMapPin,
  FiNavigation,
  FiHome,
  FiBriefcase,
  FiCheck,
  FiShield
} from 'react-icons/fi';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';
import { userAuthService } from '../../../../services/authService';

import { z } from "zod";

// Zod schema for Address validation
const addressSchema = z.object({
  addressLine1: z.string().min(5, "Address location is too short"),
  addressLine2: z.string().optional(), // House Number
  city: z.string().min(2, "City name is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Invalid Pincode format"),
});

const ManageAddresses = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]); // Stores Red raw DB address objects
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [houseNumber, setHouseNumber] = useState('');

  // Fetch addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await userAuthService.getProfile();
      if (response.success && response.user?.addresses) {
        setAddresses(response.user.addresses);
      }
    } catch (error) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setHouseNumber('');
    setShowAddModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setHouseNumber(address.addressLine2 || '');
    setShowMenu(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingAddress(null);
    setHouseNumber('');
  };

  const getComponent = (components, type) => {
    return components?.find(c => c.types.includes(type))?.long_name || '';
  };

  const handleSaveAddress = async (savedHouseNumber, locationObj) => {
    try {
      if (!locationObj) {
        toast.error('Please select a location on the map');
        return;
      }

      // Extract details
      const components = locationObj.components || [];
      const city = getComponent(components, 'locality') || getComponent(components, 'administrative_area_level_2') || '';
      const state = getComponent(components, 'administrative_area_level_1') || '';
      const pincode = getComponent(components, 'postal_code') || '';

      // Zod Validation Preparation
      const addressData = {
        addressLine1: locationObj.address,
        addressLine2: savedHouseNumber,
        city,
        state,
        pincode
      };

      const validationResult = addressSchema.safeParse(addressData);
      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      const newAddress = {
        type: 'home', // Default type
        ...addressData,
        lat: locationObj.lat,
        lng: locationObj.lng,
        isDefault: addresses.length === 0 // Make first address default
      };

      // ENFORCE SINGLE ADDRESS: Replace existing if adding new
      const updatedAddresses = [newAddress];

      // Call API
      toast.loading('Saving address...');
      const response = await userAuthService.updateProfile({ addresses: updatedAddresses });
      toast.dismiss();

      if (response.success) {
        setAddresses(response.user.addresses || updatedAddresses);
        toast.success(editingAddress ? 'Address updated!' : 'Address added!');
        handleCloseModal();
      } else {
        toast.error(response.message || 'Failed to save address');
      }

    } catch (error) {
      toast.dismiss();
      toast.error('Something went wrong');
    }
  };

  const handleDelete = async (addressId) => {
    try {
      const updatedAddresses = addresses.filter(addr => (addr._id || addr.id) !== addressId);

      toast.loading('Deleting address...');
      const response = await userAuthService.updateProfile({ addresses: updatedAddresses });
      toast.dismiss();

      if (response.success) {
        setAddresses(response.user.addresses || updatedAddresses);
        setShowMenu(null);
        toast.success('Address deleted successfully!');
      } else {
        toast.error('Failed to delete address');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to delete address');
    }
  };

  const handleMenuToggle = (addressId) => {
    setShowMenu(showMenu === addressId ? null : addressId);
  };

  // Helper to format address for display
  const formatAddress = (addr) => {
    const parts = [
      addr.addressLine2,
      addr.addressLine1,
      addr.city,
      addr.state,
      addr.pincode
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="min-h-screen bg-transparent pb-10">
      {/* =========================================================================
          MOBILE LAYOUT (< md / < 768px) - 100% UNCHANGED & IDENTICAL
      ========================================================================= */}
      <div className="md:hidden">
        {/* Theme Gradient Header */}
        <header 
          className="sticky top-0 z-30 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
        >
          <div className="flex items-center gap-2.5 max-w-lg mx-auto w-full">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
              title="Go Back"
            >
              <FiArrowLeft className="w-4 h-4 text-white" />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">Manage Addresses</h1>
          </div>
        </header>

        <main className="px-3.5 py-3 max-w-lg mx-auto">
          {/* Saved Addresses Section Header */}
          <div className="mb-2.5">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Saved Address</h2>
          </div>

          {/* Loading State */}
          {loading && addresses.length === 0 && (
            <div className="py-10 text-center">
              <div className="w-6 h-6 border-2 border-gray-100 border-t-[#720C3E] rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-gray-400">Loading your addresses...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && addresses.length === 0 && (
            <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <FiMapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium mb-3">No saved addresses yet</p>
              <button
                onClick={handleAddAddress}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs active:scale-95 transition-all"
                style={{ backgroundColor: '#720C3E' }}
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Add Your First Address</span>
              </button>
            </div>
          )}

          {/* Address List */}
          <div className="space-y-2.5">
            {addresses.map((address) => (
              <div
                key={address._id || address.id}
                className="bg-white border border-gray-200/80 rounded-xl p-3 relative shadow-xs hover:border-gray-300 transition-all"
              >
                {/* Menu Button */}
                <button
                  onClick={() => handleMenuToggle(address._id || address.id)}
                  className="absolute top-2.5 right-2.5 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiMoreVertical className="w-4 h-4 text-gray-500" />
                </button>

                {/* Menu Dropdown */}
                {showMenu === (address._id || address.id) && (
                  <div className="absolute top-9 right-2.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[110px] py-1 overflow-hidden">
                    <button
                      onClick={() => handleEdit(address)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <FiEdit2 className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(address._id || address.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 transition-colors text-left text-rose-600"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Delete</span>
                    </button>
                  </div>
                )}

                {/* Address Content */}
                <div className="pr-8">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-bold uppercase text-gray-600">
                      {address.type || 'HOME'}
                    </span>
                    {address.isDefault && (
                      <span className="px-2 py-0.5 bg-emerald-50 rounded text-[9px] font-bold uppercase text-emerald-700 border border-emerald-100">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 mb-1 leading-relaxed font-medium">
                    {address.addressLine2 ? `${address.addressLine2}, ` : ''}{address.addressLine1}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                </div>
              </div>
            ))}

            {/* Single Add New Address button */}
            {addresses.length > 0 && (
              <button
                onClick={handleAddAddress}
                className="w-full py-2.5 px-3 border border-dashed border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 transition-all active:scale-[0.99] shadow-2xs"
              >
                <FiPlus className="w-3.5 h-3.5" style={{ color: '#720C3E' }} />
                <span>Add New Address</span>
              </button>
            )}
          </div>
        </main>
      </div>

      {/* =========================================================================
          TABLET & DESKTOP LAYOUT (>= md / >= 768px) - 2-COLUMN RESPONSIVE VIEW
      ========================================================================= */}
      <div className="hidden md:block">
        {/* Top Header Bar */}
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Go Back"
              >
                <FiArrowLeft className="text-lg" />
              </button>
              <div>
                <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/user')}>Home</span>
                  <span>/</span>
                  <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/user/account')}>Account</span>
                  <span>/</span>
                  <span className="text-[#720C3E] font-bold">Manage Addresses</span>
                </nav>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mt-1">
                  Saved Addresses
                </h1>
              </div>
            </div>

            <button
              onClick={handleAddAddress}
              className="px-4 py-2 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FiPlus className="text-base" />
              <span>Add New Address</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Column: Address Information & Action Card (col-span-12 md:col-span-5 lg:col-span-4) */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-[#E8D9DF]/80 shadow-sm space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7FA] text-[#720C3E] border border-[#E8D9DF] flex items-center justify-center shadow-2xs">
                  <FiNavigation className="text-2xl" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Service Delivery Address
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                    Our verified professionals use your pinned location to reach your doorstep punctually with all necessary equipment.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>Pinpoint exact flat / house number for faster dispatch</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>Saved addresses allow 1-click checkout on all services</span>
                  </div>
                </div>

                <button
                  onClick={handleAddAddress}
                  className="w-full py-3 bg-[#FFF7FA] hover:bg-[#FCEBF3] text-[#720C3E] border border-[#E8D9DF] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <FiPlus className="text-base" />
                  <span>Add New Location</span>
                </button>
              </div>

              {/* Trust Badge Card */}
              <div className="bg-[#181E27] rounded-3xl p-5 text-white shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <FiShield className="text-xl" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">100% Serviceable Zones</h4>
                  <p className="text-[11px] text-white/70 mt-0.5">Live tracking & direct route for vendor partners</p>
                </div>
              </div>
            </div>

            {/* Right Column: Address Cards Grid (col-span-12 md:col-span-7 lg:col-span-8) */}
            <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Saved Addresses ({addresses.length})
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Manage and update your primary delivery addresses
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {loading && addresses.length === 0 && (
                <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-2xs">
                  <div className="w-8 h-8 border-3 border-slate-100 border-t-[#720C3E] rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-slate-400 font-medium">Loading your saved addresses...</p>
                </div>
              )}

              {/* Empty State */}
              {!loading && addresses.length === 0 && (
                <div className="py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-4">
                    <FiMapPin className="text-3xl" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">No Saved Addresses Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                    Add your home or office address to start booking verified home services with fast doorstep arrival.
                  </p>
                  <button
                    onClick={handleAddAddress}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white rounded-xl shadow-sm active:scale-95 transition-all bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] cursor-pointer"
                  >
                    <FiPlus className="text-base" />
                    <span>Add New Address</span>
                  </button>
                </div>
              )}

              {/* Address Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <div
                    key={address._id || address.id}
                    className="bg-white border border-slate-100 hover:border-[#E8D9DF] rounded-3xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges & Type */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-[#FFF7FA] text-[#720C3E] border border-[#E8D9DF] flex items-center justify-center text-sm font-bold shadow-2xs">
                            <FiHome />
                          </span>
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {address.type || 'HOME'}
                          </span>
                        </div>

                        {address.isDefault && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <FiCheck className="text-xs" /> Default
                          </span>
                        )}
                      </div>

                      {/* Address Content */}
                      <div className="space-y-1 mt-2">
                        {address.addressLine2 && (
                          <p className="text-sm font-extrabold text-slate-900 leading-tight">
                            {address.addressLine2}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {address.addressLine1}
                        </p>
                        <p className="text-xs text-slate-400 font-semibold pt-1">
                          {address.city}, {address.state} — {address.pincode}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(address)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#FFF7FA] hover:text-[#720C3E] text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FiEdit2 className="text-xs" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(address._id || address.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FiTrash2 className="text-xs" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Dashed Add Card in Grid */}
                {addresses.length > 0 && (
                  <button
                    onClick={handleAddAddress}
                    className="border-2 border-dashed border-slate-200 hover:border-[#720C3E]/50 bg-slate-50/50 hover:bg-[#FFF7FA]/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-[#720C3E] transition-all min-h-[180px] cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 group-hover:border-[#E8D9DF] text-slate-400 group-hover:text-[#720C3E] flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110">
                      <FiPlus className="text-xl" />
                    </div>
                    <span className="text-xs font-bold tracking-tight">Add Another Address</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Address Selection Modal (Reuse from Checkout) */}
      <AddressSelectionModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleSaveAddress}
      />

      {/* Close menu when clicking outside (Mobile dropdown) */}
      {showMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
};

export default ManageAddresses;



import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiMapPin, FiNavigation } from 'react-icons/fi';
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

      {/* Address Selection Modal (Reuse from Checkout) */}
      <AddressSelectionModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleSaveAddress}
      />

      {/* Close menu when clicking outside */}
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


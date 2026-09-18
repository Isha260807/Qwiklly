import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiSave, FiSearch, FiHome } from 'react-icons/fi';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import vendorService from '../../../../services/vendorService';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LocationPicker from '../../../user/pages/Checkout/components/LocationPicker';

const libraries = ['places', 'geometry'];

const AddressManagement = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState(''); // Display address
  const [houseNumber, setHouseNumber] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null); // { lat, lng, address, components... }
  const [autocomplete, setAutocomplete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  // Load saved address from backend
  useEffect(() => {
    const loadAddress = async () => {
      try {
        const response = await vendorService.getProfile();
        // Check if response has vendor data
        if (response.success && response.vendor?.address) {
          const addr = response.vendor.address;

          let displayAddress = '';
          let location = null;
          let houseNum = '';

          if (typeof addr === 'string') {
            displayAddress = addr;
          } else {
            // It's an object
            houseNum = addr.addressLine1 || '';
            displayAddress = addr.fullAddress ||
              addr.address ||
              '';

            // If we have city/pincode but no fullAddress, try to construct
            if (!displayAddress && addr.city) {
              displayAddress = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
            }

            if (addr.lat && addr.lng) {
              location = {
                lat: parseFloat(addr.lat),
                lng: parseFloat(addr.lng),
                address: displayAddress
              };
            }
          }

          setAddress(displayAddress);
          setSearchQuery(displayAddress);
          setHouseNumber(houseNum);
          if (location) {
            setSelectedLocation(location);
          }
        }
      } catch (error) {
        console.error('Error loading address:', error);
      }
    };
    loadAddress();
  }, []);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    // setAddress(location.address); 
    // Usually user selects from map -> we update search query & address field
    setSearchQuery(location.address);
    setAddress(location.address);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address,
          components: place.address_components
        };
        setSelectedLocation(location);
        setAddress(place.formatted_address);
        setSearchQuery(place.formatted_address);
      }
    }
  };

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const handleSave = async () => {
    if (!address || !selectedLocation) {
      toast.error('Please select an address');
      return;
    }

    setLoading(true);

    // Prepare full address object similar to `AddressSelectionModal`
    let city = '';
    let state = '';
    let pincode = '';
    let addressLine2 = '';

    // If we have components from Google API (either via map click or autocomplete)
    if (selectedLocation.components) {
      selectedLocation.components.forEach(comp => {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        if (comp.types.includes('postal_code')) pincode = comp.long_name;
        if (comp.types.includes('sublocality')) addressLine2 = comp.long_name;
      });
    }

    // We can also re-use existing logic from updateProfile controller which expects an object
    // consistent with what EditProfile sends.
    const addrData = {
      fullAddress: selectedLocation.address || address,
      addressLine1: houseNumber,
      addressLine2: addressLine2,
      city: city,
      state: state,
      pincode: pincode,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    };

    try {
      const response = await vendorService.updateProfile({
        address: addrData
      });

      if (response.success) {
        toast.success('Address saved successfully!');
        setTimeout(() => {
          //   navigate('/vendor/profile'); // Stay here or go back settings? User preference.
          //   Let's just show success. Or maybe go back.
        }, 500);
      } else {
        toast.error(response.message || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error(error.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header
        title="Address"
        showBack={true}
        onBack={() => navigate('/vendor/settings')}
      />

      <main className="max-w-md mx-auto px-4 pt-3 pb-6">
        {/* Info Card */}
        <div className="rounded-xl p-2.5 mb-3 bg-white shadow-xs border border-[#E8D9DF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FCEBF3] text-[#720C3E]">
              <FiMapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-[#24151D] leading-tight">Set Business Location</h3>
              <p className="text-[10px] text-gray-500 font-medium">
                Place the pin accurately on map to help customers locate you.
              </p>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white rounded-xl shadow-xs overflow-hidden mb-3 border border-[#E8D9DF]">
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            initialPosition={selectedLocation}
          />
        </div>

        {/* Form Inputs Container */}
        <div className="bg-white rounded-xl p-3 shadow-xs space-y-2.5">

          {/* Address Autocomplete */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Street Address / Area
            </label>
            {isLoaded ? (
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{
                  componentRestrictions: { country: 'in' },
                  fields: ['formatted_address', 'geometry', 'name', 'address_components']
                }}
              >
                <div className="relative">
                  <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 z-10" />
                  <input
                    type="text"
                    placeholder="Search for area, street name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#720C3E] transition-colors"
                  />
                </div>
              </Autocomplete>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Loading Maps..."
                  disabled
                  className="w-full pl-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-100"
                />
              </div>
            )}
          </div>

          {/* House Number */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Shop / Building Number
            </label>
            <div className="relative">
              <FiHome className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="e.g. Shop 101, Complex B"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#720C3E] transition-colors"
              />
            </div>
          </div>

          {/* Coordinates Display (Optional, for transparency) */}
          {selectedLocation && (
            <p className="text-[10px] text-gray-400 pt-0.5">
              Lat/Lng: {selectedLocation.lat?.toFixed(5)}, {selectedLocation.lng?.toFixed(5)}
            </p>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!searchQuery || !selectedLocation || loading}
            className="w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs mt-1"
            style={{
              background: '#720C3E',
            }}
          >
            <FiSave className="w-3.5 h-3.5" />
            {loading ? 'Saving...' : 'Save Business Address'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AddressManagement;

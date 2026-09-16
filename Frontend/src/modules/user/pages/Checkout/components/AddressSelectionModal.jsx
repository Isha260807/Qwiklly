import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiArrowLeft, FiX, FiSearch, FiMapPin, FiHome } from 'react-icons/fi';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { themeColors } from '../../../../../theme';
import LocationPicker from './LocationPicker';
import { toast } from 'react-hot-toast';

const libraries = ['places', 'geometry'];
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const AddressSelectionModal = ({ isOpen, onClose, address = '', houseNumber = '', onHouseNumberChange, onSave }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapAddress, setMapAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries,
    language: 'en'
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsClosing(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setMapAddress(location.address);
    setSearchQuery(location.address);
  };

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
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
        setMapAddress(place.formatted_address);
        setSearchQuery(place.formatted_address);
      }
    }
  };

  const handleConfirmSave = () => {
    const addressToSave = searchQuery.trim() || mapAddress.trim() || houseNumber.trim();
    if (!addressToSave) {
      toast.error('Please enter an area, landmark or house details');
      return;
    }

    const finalLocation = selectedLocation ? {
      ...selectedLocation,
      address: searchQuery.trim() || selectedLocation.address
    } : {
      address: addressToSave,
      lat: null,
      lng: null,
      components: []
    };

    onSave(houseNumber, finalLocation);
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Dark Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Centered Modal Card */}
      <div
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10 transition-all duration-300 border border-gray-100 ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3.5 z-10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#720C3E]/10 flex items-center justify-center">
              <FiMapPin className="w-4 h-4 text-[#720C3E]" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Select Location</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors active:scale-95"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div
          className="px-5 py-4 overflow-y-auto flex-1 space-y-4"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          {/* Map Section / GPS Picker */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              initialPosition={selectedLocation}
              isLoaded={isLoaded}
            />
          </div>

          {/* Area / Landmark Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">
              Area / Street / Landmark
            </label>
            {isLoaded && apiKey ? (
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{
                  componentRestrictions: { country: 'in' },
                  fields: ['formatted_address', 'geometry', 'name', 'address_components']
                }}
              >
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                  <input
                    type="text"
                    placeholder="Search for area, street name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setMapAddress(e.target.value);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]/20 focus:border-[#720C3E] transition-all font-medium text-gray-800 placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setMapAddress('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-all"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Autocomplete>
            ) : (
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <input
                  type="text"
                  placeholder="Enter area, street or landmark..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setMapAddress(e.target.value);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]/20 focus:border-[#720C3E] transition-all font-medium text-gray-800 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setMapAddress('');
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-all"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* House / Flat / Floor Number Input */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">
              House / Flat / Floor / Building (Optional)
            </label>
            <div className="relative">
              <FiHome className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <input
                type="text"
                placeholder="e.g. Flat 109-B, 2nd Floor"
                value={houseNumber}
                onChange={(e) => onHouseNumberChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]/20 focus:border-[#720C3E] transition-all font-medium text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Action */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleConfirmSave}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm tracking-wide transition-all active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)'
            }}
          >
            Confirm & Save Location
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddressSelectionModal;

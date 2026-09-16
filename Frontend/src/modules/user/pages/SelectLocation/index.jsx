import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiCrosshair, FiMapPin, FiChevronLeft } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import flutterBridge from '../../../../utils/flutterBridge';
import { useCity } from '../../../../context/CityContext';
import CitySelectorModal from '../../components/common/CitySelectorModal';
import cityIllustration from '../../../../assets/images/location_city.jpg';
import LogoLoader from '../../../../components/common/LogoLoader';

const SelectLocation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cities, selectCity } = useCity();
  const [isLoading, setIsLoading] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Reverse geocoding helper with strict timeout and forced English language
  const reverseGeocode = async (lat, lng) => {
    try {
      const fetchPromise = fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
        { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
      ).then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        const addressObj = data.address || {};
        const detectedCity =
          addressObj.city ||
          addressObj.town ||
          addressObj.village ||
          addressObj.suburb ||
          addressObj.state_district ||
          addressObj.state ||
          '';

        const readableAddress =
          data.display_name?.split(',').slice(0, 3).join(', ') ||
          (detectedCity ? `${detectedCity}, India` : `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);

        return {
          address: readableAddress,
          city: detectedCity,
          state: addressObj.state || '',
          pincode: addressObj.postcode || ''
        };
      });

      // 2.5 second timeout fallback
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              address: `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
              city: '',
              state: '',
              pincode: ''
            }),
          2500
        )
      );

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
      return {
        address: `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        city: '',
        state: '',
        pincode: ''
      };
    }
  };

  // Handle GPS location request & immediate redirect to home
  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const pos = await flutterBridge.getCurrentLocation();
      const lat = pos?.coords?.latitude || pos?.latitude;
      const lng = pos?.coords?.longitude || pos?.longitude;

      if (!lat || !lng) {
        throw new Error('Could not retrieve precise coordinates');
      }

      // Reverse geocode to get city and address with timeout
      const geoResult = await reverseGeocode(lat, lng);
      const addressString = geoResult?.address || `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
      const detectedCityName = geoResult?.city || '';

      // Save to localStorage for Home & header consumption
      localStorage.setItem('currentAddress', addressString);
      if (detectedCityName) {
        localStorage.setItem('currentCity', detectedCityName);
      }
      localStorage.setItem('userLat', lat.toString());
      localStorage.setItem('userLng', lng.toString());
      localStorage.setItem('location_granted', 'true');

      // Check if detected city matches active cities in CityContext
      if (cities && cities.length > 0) {
        let matched = null;
        if (detectedCityName) {
          matched = cities.find(
            (c) =>
              c.name.toLowerCase() === detectedCityName.toLowerCase() ||
              c.name.toLowerCase().includes(detectedCityName.toLowerCase()) ||
              detectedCityName.toLowerCase().includes(c.name.toLowerCase())
          );
        }
        if (!matched) {
          matched = cities.find((c) => c.isDefault) || cities[0];
        }
        if (matched) {
          selectCity(matched);
        }
      }

      window.dispatchEvent(new CustomEvent('locationUpdate', { detail: { lat, lng, address: addressString } }));

      toast.success('Location detected! Redirecting...');
      setIsLoading(false);

      // Smooth instant redirect to user home
      navigate('/user', { replace: true });
    } catch (error) {
      console.error('Location detection failed:', error);
      setIsLoading(false);
      toast.error('Location permission needed. Please select your city.', { duration: 2500 });
      setIsCityModalOpen(true);
    }
  };

  const handleCitySelectedFromModal = (city) => {
    if (city) {
      selectCity(city);
      const formatted = `${city.name}${city.state ? `, ${city.state}` : ''}`;
      localStorage.setItem('currentAddress', formatted);
      localStorage.setItem('currentCity', city.name);
      localStorage.setItem('location_granted', 'true');
      toast.success(`Location set to ${city.name}`);
      navigate('/user', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF7FA] flex justify-center items-center sm:py-8 sm:px-4">
      {/* Main Container Mobile Phone Frame */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[780px] bg-white sm:rounded-3xl sm:shadow-2xl sm:border sm:border-[#E8D9DF] flex flex-col justify-between overflow-hidden relative select-none">
        
        {/* Top App Bar with back / skip */}
        <div className="pt-4 px-6 flex justify-between items-center z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#FFF7FA] border border-[#E8D9DF] flex items-center justify-center text-[#24151D] hover:bg-[#F5E6ED] active:scale-95 transition-all cursor-pointer shadow-2xs"
            aria-label="Back"
          >
            <FiChevronLeft className="w-4 h-4 text-[#24151D]" />
          </button>

          <button
            onClick={() => navigate('/user', { replace: true })}
            className="text-xs font-bold text-[#720C3E] hover:text-[#4D082A] px-2.5 py-1 rounded-full hover:bg-[#FFF7FA] transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        {/* Header Content */}
        <div className="px-6 pt-3 text-left">
          <h1 className="text-[22px] min-[360px]:text-[26px] sm:text-3xl font-black text-[#24151D] tracking-tight leading-tight whitespace-nowrap">
            What's your location?
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#6F5A64] mt-1.5 leading-relaxed">
            We need your location to show you our serviceable hubs & available services.
          </p>
        </div>

        {/* Center 3D Isometric City Illustration (Full bleed / edge-to-edge) */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden my-auto min-h-[300px]">
          {/* Top subtle blend gradient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent z-10" />

          {/* Ambient Brand Glow */}
          <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-[#720C3E]/15 via-[#E8A0B8]/30 to-transparent blur-3xl pointer-events-none" />
          
          <img
            src={cityIllustration}
            alt="City Location Illustration"
            className="w-full h-full object-cover scale-110 sm:scale-105"
            loading="eager"
          />

          {/* Bottom subtle blend gradient */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent z-10" />
        </div>

        {/* Bottom Actions Section */}
        <div className="px-6 pb-6 pt-1 space-y-2 z-10 bg-white">
          {/* Primary Action: Use current location */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
            className="w-full py-2.5 sm:py-3 px-5 rounded-xl text-sm sm:text-[15px] font-bold text-white bg-[#720C3E] hover:bg-[#4D082A] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#720C3E]/20 hover:shadow-lg cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LogoLoader fullScreen={false} inline={true} size="w-4 h-4" />
                <span>Detecting location...</span>
              </>
            ) : (
              <>
                <FiCrosshair className="text-base text-[#E8A0B8]" />
                <span>Use current location</span>
              </>
            )}
          </button>

          {/* Secondary Action: Enter location manually */}
          <button
            type="button"
            onClick={() => setIsCityModalOpen(true)}
            disabled={isLoading}
            className="w-full py-2 px-3 text-center text-xs sm:text-sm font-bold text-[#720C3E] hover:text-[#4D082A] hover:bg-[#FFF7FA] rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FiMapPin className="text-sm text-[#720C3E]" />
            <span>Enter location manually</span>
          </button>
        </div>
      </div>

      {/* City Selector Modal for manual entry */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        onCitySelected={handleCitySelectedFromModal}
      />
    </div>
  );
};

export default SelectLocation;

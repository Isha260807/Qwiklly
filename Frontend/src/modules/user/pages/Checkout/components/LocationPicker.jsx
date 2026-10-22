import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { FiCrosshair } from 'react-icons/fi';
import flutterBridge from '../../../../../utils/flutterBridge';
import { toast } from 'react-hot-toast';

const libraries = ['places', 'geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '210px'
};

const defaultCenter = {
  lat: 22.7196,
  lng: 75.8577
};

const LocationPicker = ({ onLocationSelect, initialPosition = null, isLoaded = false }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(initialPosition || defaultCenter);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  // Update marker when initialPosition changes
  useEffect(() => {
    if (initialPosition?.lat && initialPosition?.lng) {
      setMarker(initialPosition);
      if (map) {
        map.panTo(initialPosition);
        map.setZoom(16);
      }
    }
  }, [initialPosition, map]);

  // Reverse geocode to get address in English from coordinates
  const reverseGeocode = async (position) => {
    setLoading(true);

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: position, language: 'en' }, (results, status) => {
        setLoading(false);
        if (status === 'OK' && results[0]) {
          if (onLocationSelect) {
            onLocationSelect({
              lat: position.lat,
              lng: position.lng,
              address: results[0].formatted_address,
              components: results[0].address_components
            });
          }
          return;
        }
        // Fallback to nominatim
        fallbackNominatim(position.lat, position.lng);
      });
    } else {
      fallbackNominatim(position.lat, position.lng);
    }
  };

  const fallbackNominatim = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
        { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
      );
      const data = await res.json();
      setLoading(false);
      if (data) {
        const addrObj = data.address || {};
        const city = addrObj.city || addrObj.town || addrObj.village || addrObj.suburb || 'Indore';
        const area = addrObj.suburb || addrObj.neighbourhood || addrObj.road || addrObj.residential || '';
        const readable = [area, city, addrObj.state || 'Madhya Pradesh'].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 3).join(', ');

        if (onLocationSelect) {
          onLocationSelect({
            lat,
            lng,
            address: readable,
            components: []
          });
        }
      }
    } catch (e) {
      setLoading(false);
    }
  };

  // Handle map click
  const onMapClick = useCallback((e) => {
    const newPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setMarker(newPos);
    reverseGeocode(newPos);
  }, []);

  const getLocationErrorMessage = (error) => {
    if (Number(error?.code) === 1) {
      return 'Please allow location access to fetch your current location.';
    }

    if (Number(error?.code) === 2) {
      return 'Please turn on your device location/GPS and try again.';
    }

    if (Number(error?.code) === 3) {
      return 'Location request timed out. Please turn on GPS and try again.';
    }

    if (/permission|denied/i.test(error?.message || '')) {
      return 'Please allow location access to fetch your current location.';
    }

    return 'Please turn on your device location/GPS and try again.';
  };

  // Handle Detect Current Location
  const handleCurrentLocation = async () => {
    if (loadingRef.current) return;

    // Let the bridge try native Flutter location even when the WebView has
    // no browser geolocation API available.
    // Show a quick toast only for an already-blocked browser permission.
    if (navigator.geolocation && !flutterBridge.isFlutter && navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          toast.error('Please enable location permission in your device/browser settings.', {
            id: 'location-picker-error',
            duration: 3500
          });
          return;
        }
      } catch {
        // Older browsers may not support querying geolocation permission.
      }
    }

    setLoading(true);
    loadingRef.current = true;

    try {
      const pos = await flutterBridge.getCurrentLocation();
      const latitude = Number(pos?.latitude ?? pos?.coords?.latitude);
      const longitude = Number(pos?.longitude ?? pos?.coords?.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Current location coordinates are unavailable');
      }

      const newPos = { lat: latitude, lng: longitude };
      setMarker(newPos);

      if (map) {
        map.panTo(newPos);
        map.setZoom(17);
      }

      setLoading(false);
      loadingRef.current = false;
      reverseGeocode(newPos);
    } catch (error) {
      setLoading(false);
      loadingRef.current = false;
      toast.error(getLocationErrorMessage(error), {
        id: 'location-picker-error',
        duration: 3500
      });
    }
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-[210px] bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#720C3E] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="w-full relative rounded-2xl overflow-hidden shadow-inner border border-gray-200">
      <div className="relative h-[210px] w-full bg-gray-100">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={marker}
          zoom={15}
          onClick={onMapClick}
          onLoad={setMap}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
            rotateControl: false,
            tiltControl: false,
            zoomControl: false
          }}
        >
          {marker && <Marker position={marker} />}
        </GoogleMap>

        {loading && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black/75 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium z-10 shadow-md animate-pulse">
            Fetching address...
          </div>
        )}

        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={loading}
          className="absolute bottom-3 right-3 h-10 px-3 bg-white rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all z-10 border border-gray-200 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
          title="Use Current Location"
          aria-label="Use Current Location"
        >
          <FiCrosshair className="w-4 h-4 text-[#720C3E]" />
          <span className="text-xs font-semibold text-[#720C3E] whitespace-nowrap">
            {loading ? 'Locating...' : 'Use Current Location'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;

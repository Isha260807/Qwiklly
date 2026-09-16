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

  // Handle Detect Current Location
  const handleCurrentLocation = async () => {
    setLoading(true);
    loadingRef.current = true;

    try {
      const pos = await flutterBridge.getCurrentLocation();
      setLoading(false);
      loadingRef.current = false;

      const newPos = {
        lat: pos?.latitude || pos?.coords?.latitude,
        lng: pos?.longitude || pos?.coords?.longitude
      };

      if (newPos.lat && newPos.lng) {
        setMarker(newPos);
        if (map) {
          map.panTo(newPos);
          map.setZoom(17);
        }
        reverseGeocode(newPos);
        return;
      }
    } catch (e) {
      // silent
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setLoading(false);
          loadingRef.current = false;
          const newPos = {
            lat: p.coords.latitude,
            lng: p.coords.longitude
          };
          setMarker(newPos);
          if (map) {
            map.panTo(newPos);
            map.setZoom(17);
          }
          reverseGeocode(newPos);
        },
        (err) => {
          setLoading(false);
          loadingRef.current = false;
          toast.error('Unable to get GPS location. Please select manually on map.');
        }
      );
    } else {
      setLoading(false);
      loadingRef.current = false;
      toast.error('Location service not supported.');
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
          className="absolute bottom-3 right-3 p-2.5 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all z-10 border border-gray-200 cursor-pointer"
          title="Detect Current Location"
        >
          <FiCrosshair className="w-5 h-5 text-[#720C3E]" />
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;

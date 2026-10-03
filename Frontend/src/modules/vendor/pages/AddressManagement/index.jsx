import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Polygon, Autocomplete } from '@react-google-maps/api';
import {
  FiMapPin,
  FiSave,
  FiSearch,
  FiHome,
  FiNavigation,
  FiCheckCircle,
  FiAlertTriangle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import vendorService from '../../../../services/vendorService';
import Header from '../../components/layout/Header';
import { useZonePresence, getCurrentCoords, syncZonePresence } from '../../hooks/useVendorZonePresence';

const libraries = ['places', 'geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '270px'
};

const defaultCenter = {
  lat: 22.7196,
  lng: 75.8577 // Default Indore
};

// Convert GeoJSON [[[lng, lat], [lng, lat]]] to Google Maps [{ lat, lng }]
const convertGeoJsonToPoints = (geoJsonCoords) => {
  if (!geoJsonCoords || !geoJsonCoords.coordinates || !geoJsonCoords.coordinates[0]) return [];
  const ring = geoJsonCoords.coordinates[0];
  return ring.map(([lng, lat]) => ({ lat, lng }));
};

const AddressManagement = () => {
  const navigate = useNavigate();
  const presence = useZonePresence();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const [map, setMap] = useState(null);
  const [assignedZones, setAssignedZones] = useState([]);
  const [currentPhysicalZone, setCurrentPhysicalZone] = useState(null);
  const [shopAddress, setShopAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [shopLocation, setShopLocation] = useState(null); // { lat, lng }
  const [liveLocation, setLiveLocation] = useState(null); // { lat, lng }
  const [autocomplete, setAutocomplete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualEdit, setShowManualEdit] = useState(false);

  // Load vendor profile and assigned zones
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, zonesRes] = await Promise.allSettled([
        vendorService.getProfile(),
        vendorService.getAssignedZones()
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.success) {
        const vendor = profileRes.value.vendor;
        if (vendor?.address) {
          const addr = vendor.address;
          const display = addr.fullAddress || addr.address || '';
          setShopAddress(display);
          setSearchQuery(display);
          setHouseNumber(addr.addressLine1 || '');
          if (addr.lat && addr.lng) {
            setShopLocation({ lat: parseFloat(addr.lat), lng: parseFloat(addr.lng) });
          }
        }
        if (vendor?.location?.lat && vendor?.location?.lng) {
          setLiveLocation({ lat: parseFloat(vendor.location.lat), lng: parseFloat(vendor.location.lng) });
        }
      }

      if (zonesRes.status === 'fulfilled' && zonesRes.value?.success) {
        setAssignedZones(zonesRes.value.zones || []);
        if (zonesRes.value.currentPhysicalZone) {
          setCurrentPhysicalZone(zonesRes.value.currentPhysicalZone);
        }
        if (zonesRes.value.location?.lat && zonesRes.value.location?.lng) {
          setLiveLocation({
            lat: parseFloat(zonesRes.value.location.lat),
            lng: parseFloat(zonesRes.value.location.lng)
          });
        }
      }
    } catch (err) {
      console.error('Failed to load address data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fit map bounds helper
  const fitMapBounds = useCallback(() => {
    if (!map || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Add assigned zone polygon points
    assignedZones.forEach(zone => {
      const pts = convertGeoJsonToPoints(zone.coordinates);
      pts.forEach(p => {
        bounds.extend(p);
        hasPoints = true;
      });
    });

    // Add live location
    if (liveLocation?.lat && liveLocation?.lng) {
      bounds.extend(liveLocation);
      hasPoints = true;
    }

    // Add shop location
    if (shopLocation?.lat && shopLocation?.lng) {
      bounds.extend(shopLocation);
      hasPoints = true;
    }

    if (hasPoints) {
      map.fitBounds(bounds, { top: 40, right: 30, bottom: 40, left: 30 });
    }
  }, [map, assignedZones, liveLocation, shopLocation]);

  // Fit map bounds whenever zones or live location load
  useEffect(() => {
    fitMapBounds();
  }, [fitMapBounds]);

  const zoomToMyLocation = () => {
    if (map && liveLocation) {
      map.panTo(liveLocation);
      map.setZoom(16);
    }
  };

  const zoomToAssignedZone = () => {
    if (!map || !window.google || assignedZones.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    assignedZones.forEach(zone => {
      const pts = convertGeoJsonToPoints(zone.coordinates);
      pts.forEach(p => bounds.extend(p));
    });
    map.fitBounds(bounds, { top: 40, right: 30, bottom: 40, left: 30 });
  };

  // Fetch Live Phone GPS Location and Sync
  const handleFetchLiveGps = async () => {
    try {
      setFetchingGps(true);
      const coords = await getCurrentCoords({ maximumAge: 0, timeout: 15000 });
      const newPos = { lat: coords.lat, lng: coords.lng };
      setLiveLocation(newPos);

      if (map) {
        map.panTo(newPos);
        map.setZoom(16);
      }

      const syncRes = await syncZonePresence();
      if (syncRes?.currentPhysicalZone) {
        setCurrentPhysicalZone(syncRes.currentPhysicalZone);
      }
      if (syncRes?.isInsideAssignedZone) {
        const zoneName = syncRes.currentZones?.[0]?.name;
        toast.success(`🟢 Live GPS Synced: Inside ${zoneName || 'Assigned Zone'}`, { duration: 4000 });
      } else if (syncRes?.canGoOnline === false) {
        const physName = syncRes?.currentPhysicalZone?.name;
        if (physName) {
          toast.error(`🔴 Currently in ${physName}. Outside your assigned zone.`, { duration: 5000 });
        } else {
          toast.error('🔴 You are outside your assigned zone boundary', { duration: 4000 });
        }
      } else {
        toast.success('Live GPS coordinates updated');
      }
    } catch (err) {
      console.error('GPS error:', err);
      toast.error(
        err?.code === 1
          ? 'Location permission blocked. Please allow location in browser settings.'
          : 'Unable to get live GPS location. Please turn on device GPS.'
      );
    } finally {
      setFetchingGps(false);
    }
  };

  // 1-Click: Set current live GPS as registered shop location
  const handleSetGpsAsShop = async () => {
    if (!liveLocation) {
      await handleFetchLiveGps();
      return;
    }

    setShopLocation(liveLocation);
    // Reverse geocode if google maps loaded
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: liveLocation, language: 'en' }, async (results, status) => {
        let fullAddr = `Lat: ${liveLocation.lat.toFixed(5)}, Lng: ${liveLocation.lng.toFixed(5)}`;
        let components = [];
        if (status === 'OK' && results[0]) {
          fullAddr = results[0].formatted_address;
          components = results[0].address_components || [];
        }
        setShopAddress(fullAddr);
        setSearchQuery(fullAddr);
        await saveShopAddressToBackend(liveLocation.lat, liveLocation.lng, fullAddr, components);
      });
    } else {
      await saveShopAddressToBackend(
        liveLocation.lat,
        liveLocation.lng,
        `Coordinates: ${liveLocation.lat.toFixed(5)}, ${liveLocation.lng.toFixed(5)}`,
        []
      );
    }
  };

  const saveShopAddressToBackend = async (lat, lng, fullAddr, components = []) => {
    try {
      setLoading(true);
      let city = '';
      let state = '';
      let pincode = '';
      let addressLine2 = '';

      components.forEach(comp => {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        if (comp.types.includes('postal_code')) pincode = comp.long_name;
        if (comp.types.includes('sublocality')) addressLine2 = comp.long_name;
      });

      const addrData = {
        fullAddress: fullAddr,
        addressLine1: houseNumber || '',
        addressLine2,
        city,
        state,
        pincode,
        lat,
        lng
      };

      const res = await vendorService.updateProfile({ address: addrData });
      if (res.success) {
        toast.success('Shop address saved successfully as fallback');
        await syncZonePresence();
      } else {
        toast.error(res.message || 'Failed to save address');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save shop address');
    } finally {
      setLoading(false);
    }
  };

  const onMapClick = (e) => {
    if (!showManualEdit) return;
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();
    const pos = { lat: clickedLat, lng: clickedLng };
    setShopLocation(pos);

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: pos, language: 'en' }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setShopAddress(results[0].formatted_address);
          setSearchQuery(results[0].formatted_address);
        }
      });
    }
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setShopLocation(location);
        setShopAddress(place.formatted_address);
        setSearchQuery(place.formatted_address);
        if (map) {
          map.panTo(location);
          map.setZoom(16);
        }
      }
    }
  };

  const isVendorInsideAnyZone = presence.isInsideAssignedZone === true;
  const currentAssignedZoneName = assignedZones[0]?.name || presence.assignedZones?.[0]?.name;
  const effectivePhysicalZoneName = currentPhysicalZone?.name || presence.currentPhysicalZone?.name || (isVendorInsideAnyZone ? currentAssignedZoneName : null);

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header
        title="Service Zone & Location"
        showBack={true}
        onBack={() => navigate('/vendor/settings')}
      />

      <main className="max-w-md mx-auto px-3.5 pt-2 pb-6 space-y-3">
        {/* Zone Status Banner Card */}
        <div className="rounded-2xl p-3.5 bg-white shadow-xs border border-[#E8D9DF] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isVendorInsideAnyZone ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                <FiMapPin className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#24151D] leading-tight">
                  {currentAssignedZoneName ? `Assigned Zone: ${currentAssignedZoneName}` : 'Service Zone Assignment'}
                </h3>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                  {assignedZones.length > 0
                    ? `${assignedZones.length} zone(s) assigned by admin`
                    : 'No zone assigned yet'}
                </p>
              </div>
            </div>

            {/* Live Status Badge */}
            {isVendorInsideAnyZone ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                In Zone
              </span>
            ) : assignedZones.length === 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
                Unassigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Outside Zone
              </span>
            )}
          </div>

          {/* Current Live Zone vs Assigned Zone Info Cards */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Current Live Zone
              </span>
              <span
                className={`text-[11px] font-bold block truncate mt-0.5 ${
                  effectivePhysicalZoneName ? 'text-blue-700' : 'text-gray-600'
                }`}
              >
                {effectivePhysicalZoneName ? `📍 ${effectivePhysicalZoneName}` : '📍 Outside All Zones'}
              </span>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Assigned Zone
              </span>
              <span className="text-[11px] font-bold text-[#720C3E] block truncate mt-0.5">
                🏢 {currentAssignedZoneName || 'None'}
              </span>
            </div>
          </div>

          {/* Contextual Guidance Message */}
          <div
            className={`p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-2 ${
              isVendorInsideAnyZone
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {isVendorInsideAnyZone ? (
              <>
                <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  You are inside your assigned zone (<strong>{currentAssignedZoneName}</strong>). You can receive customer bookings!
                </span>
              </>
            ) : effectivePhysicalZoneName ? (
              <>
                <FiAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You are currently in <strong>{effectivePhysicalZoneName}</strong>. Your assigned zone is <strong>{currentAssignedZoneName || 'different'}</strong>. Please move to {currentAssignedZoneName} to receive bookings.
                </span>
              </>
            ) : (
              <>
                <FiAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You are outside service boundary. Move inside your assigned zone (<strong>{currentAssignedZoneName || 'Assigned Zone'}</strong>) to receive customer bookings.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Google Map Section with Zone Polygons & Live Marker */}
        <div className="bg-white rounded-2xl shadow-xs overflow-hidden border border-[#E8D9DF]">
          <div className="relative">
            {isLoaded && !loadError ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={liveLocation || shopLocation || defaultCenter}
                zoom={14}
                onClick={onMapClick}
                onLoad={setMap}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  clickableIcons: false,
                  gestureHandling: 'greedy'
                }}
              >
                {/* 1. Render Assigned Zone Polygon(s) */}
                {assignedZones.map(zone => {
                  const pts = convertGeoJsonToPoints(zone.coordinates);
                  const isCurrent = presence.currentZones?.some(z => z.id === zone.id || z.name === zone.name);
                  return (
                    <Polygon
                      key={zone.id}
                      paths={pts}
                      options={{
                        fillColor: isCurrent ? '#10B981' : '#3B82F6',
                        fillOpacity: isCurrent ? 0.35 : 0.2,
                        strokeColor: isCurrent ? '#059669' : '#2563EB',
                        strokeWeight: 2.5,
                        clickable: false
                      }}
                    />
                  );
                })}

                {/* 2. Vendor Live GPS Marker (Blue / Green Pin) */}
                {liveLocation && (
                  <Marker
                    position={liveLocation}
                    title="Your Current Live Location"
                    icon={{
                      path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                      scale: 8,
                      fillColor: isVendorInsideAnyZone ? '#10B981' : '#EF4444',
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2.5
                    }}
                  />
                )}

                {/* 3. Registered Shop / Fallback Marker */}
                {shopLocation && (
                  <Marker
                    position={shopLocation}
                    title="Registered Shop / Base Location"
                    label={{
                      text: '🏪',
                      fontSize: '14px'
                    }}
                  />
                )}
              </GoogleMap>
            ) : (
              <div className="w-full h-[270px] bg-gray-100 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#720C3E] border-t-transparent"></div>
                <p className="text-xs text-gray-500 font-medium">Loading Service Map...</p>
              </div>
            )}

            {/* Map Top Legend and Navigation Overlay */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
              <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 shadow-xs flex items-center gap-2 pointer-events-none">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/50 border border-emerald-600"></span>
                  Zone
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                  Live GPS
                </span>
                {shopLocation && (
                  <span className="flex items-center gap-1">
                    <span>🏪</span> Shop
                  </span>
                )}
              </div>

              {/* Map Focus / Quick-Pan Buttons */}
              <div className="flex items-center gap-1">
                {liveLocation && (
                  <button
                    type="button"
                    onClick={zoomToMyLocation}
                    title="Focus on My Live GPS"
                    className="px-2 py-1 rounded-lg bg-white/95 backdrop-blur-xs border border-gray-200 text-[10px] font-bold text-gray-700 hover:bg-gray-50 active:scale-95 shadow-xs cursor-pointer"
                  >
                    📍 My GPS
                  </button>
                )}
                {assignedZones.length > 0 && (
                  <button
                    type="button"
                    onClick={zoomToAssignedZone}
                    title="Focus on Assigned Zone Boundary"
                    className="px-2 py-1 rounded-lg bg-white/95 backdrop-blur-xs border border-gray-200 text-[10px] font-bold text-[#720C3E] hover:bg-gray-50 active:scale-95 shadow-xs cursor-pointer"
                  >
                    🏢 Zone
                  </button>
                )}
                <button
                  type="button"
                  onClick={fitMapBounds}
                  title="Fit All on Map"
                  className="px-2 py-1 rounded-lg bg-white/95 backdrop-blur-xs border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 active:scale-95 shadow-xs cursor-pointer"
                >
                  🗺️ Fit
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action Button: Fetch Live GPS */}
          <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchLiveGps}
              disabled={fetchingGps}
              className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-[#720C3E] hover:bg-[#5a0930] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
            >
              <FiNavigation className={`w-4 h-4 ${fetchingGps ? 'animate-spin' : ''}`} />
              {fetchingGps ? 'Fetching GPS...' : '📍 Fetch My Live Location'}
            </button>

            <button
              type="button"
              onClick={handleSetGpsAsShop}
              disabled={!liveLocation || loading}
              title="Save current live location as registered shop address"
              className="py-2.5 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <FiHome className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Set as Shop</span>
            </button>
          </div>
        </div>

        {/* Registered Shop Address (Fallback & KYC Info) */}
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E8D9DF] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Registered Shop / Base Location</h4>
              <p className="text-[10px] text-gray-500">Used as fallback when live GPS is unavailable</p>
            </div>
            <button
              type="button"
              onClick={() => setShowManualEdit(!showManualEdit)}
              className="text-xs font-bold text-[#720C3E] hover:underline cursor-pointer"
            >
              {showManualEdit ? 'Close' : 'Edit Manually'}
            </button>
          </div>

          {/* Current Saved Display */}
          {!showManualEdit && (
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700">
              <p className="font-semibold text-gray-900">{shopAddress || 'No shop address registered yet'}</p>
              {houseNumber && <p className="text-[10px] text-gray-500 mt-0.5">Shop/Unit: {houseNumber}</p>}
              {shopLocation && (
                <p className="text-[9px] text-gray-400 mt-1">
                  Coords: {shopLocation.lat.toFixed(5)}, {shopLocation.lng.toFixed(5)}
                </p>
              )}
            </div>
          )}

          {/* Manual Input Form (Collapsible) */}
          {showManualEdit && (
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Search Shop Address
                </label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={setAutocomplete}
                    onPlaceChanged={onPlaceChanged}
                    options={{ componentRestrictions: { country: 'in' } }}
                  >
                    <div className="relative">
                      <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 z-10" />
                      <input
                        type="text"
                        placeholder="Search area, landmark or street..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#720C3E]"
                      />
                    </div>
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    disabled
                    placeholder="Loading Maps..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-100"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Shop / Building / Floor Number
                </label>
                <div className="relative">
                  <FiHome className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. Shop 12, First Floor"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#720C3E]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!shopLocation) return toast.error('Please select a location on map or search');
                  saveShopAddressToBackend(shopLocation.lat, shopLocation.lng, shopAddress || searchQuery);
                }}
                disabled={!shopLocation || loading}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#720C3E] hover:bg-[#5a0930] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FiSave className="w-3.5 h-3.5" />
                {loading ? 'Saving...' : 'Save Fallback Shop Address'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AddressManagement;

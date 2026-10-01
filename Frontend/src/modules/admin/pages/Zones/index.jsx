import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, Polyline, Autocomplete } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import { zoneService } from '../../../../services/zoneService';
import { HiPlus, HiPencil, HiTrash, HiSearch, HiLocationMarker, HiArrowLeft, HiCheck, HiX } from 'react-icons/hi';
import { FiLayers, FiRotateCcw, FiTrash2, FiInfo, FiBox, FiTag } from 'react-icons/fi';

const libraries = ['places'];
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 22.7196, lng: 75.8577 }; // Default Indore

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', hint: 'Services will be live for users in this zone.' },
  { value: 'inactive', label: 'Deactive', hint: 'Zone is saved but hidden - no bookings accepted.' }
];

const statusFromFlags = (zone) => (zone.isActive ? 'active' : 'inactive');
const flagsFromStatus = (status) => ({ isActive: status === 'active' });

const STATUS_COLORS = {
  active: '#16a34a',
  inactive: '#d97706'
};

// Ring -> editable point list (GeoJSON is [lng,lat]; markers/polygons need {lat,lng})
const ringToPoints = (coordinates) => {
  const ring = coordinates?.coordinates?.[0] || [];
  const editable =
    ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return editable.map(([lng, lat]) => ({ lat, lng }));
};

const pointsToPolygon = (points) => {
  if (points.length < 3) return null;
  const ring = points.map((p) => [p.lng, p.lat]);
  ring.push([points[0].lng, points[0].lat]);
  return { type: 'Polygon', coordinates: [ring] };
};

const ZoneManagement = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries,
    language: 'en'
  });

  const [zones, setZones] = useState([]);
  const [totalOnlineVendors, setTotalOnlineVendors] = useState(0);
  const [loading, setLoading] = useState(true);

  // View state: 'list' | 'form'
  const [viewMode, setViewMode] = useState('list');
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [drawPoints, setDrawPoints] = useState([]);
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  // Services View Modal state
  const [selectedZoneServices, setSelectedZoneServices] = useState(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Zone Partners View Modal state
  const [selectedZoneVendors, setSelectedZoneVendors] = useState(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorFilterTab, setVendorFilterTab] = useState('all'); // 'all' | 'online' | 'offline'

  // Map state
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const polygonRef = useRef(null);
  const pathListenersRef = useRef([]);
  const searchInputRef = useRef(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await zoneService.getAll();
      if (response.success) {
        setZones(response.zones || []);
        if (response.totalOnlineVendors !== undefined) {
          setTotalOnlineVendors(response.totalOnlineVendors);
        }
      }
    } catch (error) {
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const activeCount = useMemo(() => zones.filter((z) => z.isActive).length, [zones]);

  const handleCloseForm = () => {
    setEditingZoneId(null);
    setDrawPoints([]);
    setFormName('');
    setFormStatus('active');
    setViewMode('list');
  };

  const handleOpenAdd = () => {
    setEditingZoneId(null);
    setDrawPoints([]);
    setFormName('');
    setFormStatus('active');
    setViewMode('form');
  };

  const handleOpenEdit = (zone) => {
    setEditingZoneId(zone._id);
    const pts = ringToPoints(zone.coordinates);
    setDrawPoints(pts);
    setFormName(zone.name);
    setFormStatus(statusFromFlags(zone));
    setViewMode('form');

    setTimeout(() => {
      if (map && pts.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        pts.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds);
      }
    }, 100);
  };

  const undoLastPoint = () => {
    setDrawPoints((prev) => prev.slice(0, -1));
  };

  const clearAllPoints = () => {
    setDrawPoints([]);
  };

  const onMapClick = useCallback((e) => {
    setDrawPoints((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, { lat: e.latLng.lat(), lng: e.latLng.lng() }];
    });
  }, []);

  const detachPathListeners = () => {
    pathListenersRef.current.forEach((listener) => listener.remove());
    pathListenersRef.current = [];
  };

  const onPolygonLoad = (polygon) => {
    polygonRef.current = polygon;
    const path = polygon.getPath();

    const syncFromPath = () => {
      const pts = [];
      for (let i = 0; i < path.getLength(); i++) {
        const latLng = path.getAt(i);
        pts.push({ lat: latLng.lat(), lng: latLng.lng() });
      }
      setDrawPoints(pts);
    };

    detachPathListeners();
    pathListenersRef.current = [
      path.addListener('set_at', syncFromPath),
      path.addListener('insert_at', syncFromPath),
      path.addListener('remove_at', syncFromPath)
    ];
  };

  const onPolygonUnmount = () => {
    detachPathListeners();
    polygonRef.current = null;
  };

  const onMarkerDragEnd = (index, e) => {
    const updated = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setDrawPoints((prev) => prev.map((p, i) => (i === index ? updated : p)));
  };

  const removePoint = (index) => {
    setDrawPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const onPlaceChanged = () => {
    if (!autocomplete || !map) return;
    const place = autocomplete.getPlace();

    const loc = place?.geometry?.location;
    if (loc) {
      map.panTo({ lat: loc.lat(), lng: loc.lng() });
      map.setZoom(15);
      return;
    }

    if (place?.geometry?.viewport) {
      map.fitBounds(place.geometry.viewport);
      return;
    }

    const query = place?.name || searchInputRef.current?.value;
    if (query && window.google?.maps?.Geocoder) {
      new window.google.maps.Geocoder().geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry) {
          const geo = results[0].geometry;
          if (geo.location) {
            map.panTo({ lat: geo.location.lat(), lng: geo.location.lng() });
            map.setZoom(15);
          } else if (geo.viewport) {
            map.fitBounds(geo.viewport);
          }
        } else {
          toast.error('Could not find that location');
        }
      });
    }
  };

  const handleSaveZone = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a zone name');
      return;
    }
    const polygon = pointsToPolygon(drawPoints);
    if (!polygon) {
      toast.error('Place at least 3 boundary points on the map');
      return;
    }

    const { isActive } = flagsFromStatus(formStatus);
    const payload = { name: formName.trim(), coordinates: polygon, isActive };

    try {
      setSaving(true);
      let response;
      if (editingZoneId) {
        response = await zoneService.update(editingZoneId, payload);
        toast.success('Zone updated successfully');
      } else {
        response = await zoneService.create(payload);
        toast.success('Zone created successfully');
        if (response.overlapWarning) toast(response.overlapWarning, { icon: '⚠️', duration: 6000 });
      }
      handleCloseForm();
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete zone "${name}"? This cannot be undone.`)) return;
    try {
      await zoneService.remove(id);
      toast.success('Zone deleted successfully');
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async (zone) => {
    try {
      await zoneService.toggleStatus(zone._id);
      toast.success(`Zone ${zone.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchZones();
    } catch (error) {
      toast.error('Status update failed');
    }
  };

  // Filtered services for the modal
  const filteredServices = useMemo(() => {
    if (!selectedZoneServices?.services) return [];
    if (!serviceSearchQuery.trim()) return selectedZoneServices.services;
    const q = serviceSearchQuery.toLowerCase().trim();
    return selectedZoneServices.services.filter((s) =>
      (s.title || '').toLowerCase().includes(q)
    );
  }, [selectedZoneServices, serviceSearchQuery]);

  // Filtered zone vendors for the modal
  const filteredZoneVendors = useMemo(() => {
    if (!selectedZoneVendors?.vendors) return [];
    let list = selectedZoneVendors.vendors;
    if (vendorFilterTab === 'online') {
      list = list.filter((v) => v.isOnline);
    } else if (vendorFilterTab === 'offline') {
      list = list.filter((v) => !v.isOnline);
    }
    if (vendorSearchQuery.trim()) {
      const q = vendorSearchQuery.toLowerCase().trim();
      list = list.filter((v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.phone || '').includes(q) ||
        (Array.isArray(v.service) ? v.service.join(' ') : (v.service || '')).toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedZoneVendors, vendorFilterTab, vendorSearchQuery]);

  // -------------------------------------------------------------
  // RENDER: Form Page View (When Add or Edit is active)
  // -------------------------------------------------------------
  if (viewMode === 'form') {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseForm}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-2xs flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
            >
              <HiArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {editingZoneId ? `Edit Zone: ${formName || 'Geofence'}` : 'Add New Service Zone'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Define the service polygon boundary on Google Maps and configure zone availability.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveZone}
              disabled={saving || drawPoints.length < 3}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#9E2A2B] hover:bg-[#852324] text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              <HiCheck className="w-4 h-4" />
              <span>{saving ? 'Saving Zone...' : editingZoneId ? 'Update Zone' : 'Save Zone'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
          {/* Left Column: Form Controls & Details */}
          <div className="space-y-5">
            {/* Zone Info Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FiLayers className="w-4 h-4 text-rose-600" />
                <span>Zone Details</span>
              </h3>

              {/* Zone Name Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Zone Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Adani Township, Tirora"
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Zone Status Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormStatus(opt.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        formStatus === opt.value
                          ? 'bg-[#9E2A2B] text-white border-[#9E2A2B] shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {STATUS_OPTIONS.find((o) => o.value === formStatus)?.hint}
                </p>
              </div>
            </div>

            {/* Boundary Points Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Boundary Points</h3>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  drawPoints.length >= 3
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {drawPoints.length} / min 3 points
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoLastPoint}
                  disabled={drawPoints.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <FiRotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Point</span>
                </button>
                <button
                  type="button"
                  onClick={clearAllPoints}
                  disabled={drawPoints.length === 0}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {drawPoints.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {drawPoints.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                    >
                      <span className="font-semibold text-gray-600">Point {idx + 1}</span>
                      <span className="text-gray-400 font-mono text-[11px]">
                        {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instruction Tip Box */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <FiInfo className="w-4 h-4 text-amber-600" />
                <span>How to draw polygon:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11.5px] text-amber-900/90 pl-1">
                <li>Click anywhere on the map to place boundary points.</li>
                <li>At least 3 points are needed to create the boundary polygon.</li>
                <li>Once created, you can drag the polygon corners directly on the map.</li>
                <li>Use the search bar on the map to jump directly to any city or colony.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Google Maps Interactive Canvas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden relative h-[620px]">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={drawPoints[0] || defaultCenter}
                zoom={12}
                onClick={onMapClick}
                onLoad={setMap}
                options={{
                  streetViewControl: false,
                  mapTypeControl: true,
                  fullscreenControl: true,
                  clickableIcons: false
                }}
              >
                {/* Other existing zones for spatial context */}
                {zones.map((zone) => {
                  if (zone._id === editingZoneId) return null;
                  const status = statusFromFlags(zone);
                  return (
                    <Polygon
                      key={zone._id}
                      paths={ringToPoints(zone.coordinates)}
                      options={{
                        fillColor: STATUS_COLORS[status],
                        fillOpacity: 0.12,
                        strokeColor: STATUS_COLORS[status],
                        strokeWeight: 2,
                        clickable: false,
                        zIndex: 1
                      }}
                    />
                  );
                })}

                {/* Current Drawing/Editing Shape */}
                {drawPoints.length < 3 ? (
                  <>
                    {drawPoints.length >= 2 && (
                      <Polyline
                        path={drawPoints}
                        options={{ strokeColor: '#e11d48', strokeWeight: 3, zIndex: 3 }}
                      />
                    )}
                    {drawPoints.map((point, index) => (
                      <Marker
                        key={index}
                        position={point}
                        draggable
                        onDragEnd={(e) => onMarkerDragEnd(index, e)}
                        onClick={() => removePoint(index)}
                        icon={
                          window.google
                            ? {
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 7,
                                fillColor: '#e11d48',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2
                              }
                            : undefined
                        }
                        zIndex={4}
                      />
                    ))}
                  </>
                ) : (
                  <Polygon
                    paths={drawPoints}
                    editable
                    draggable={false}
                    onLoad={onPolygonLoad}
                    onUnmount={onPolygonUnmount}
                    options={{
                      fillColor: '#e11d48',
                      fillOpacity: 0.28,
                      strokeColor: '#e11d48',
                      strokeWeight: 3,
                      zIndex: 2
                    }}
                  />
                )}
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-rose-600 border-t-transparent"></div>
              </div>
            )}

            {/* Location Search Bar in Map */}
            {isLoaded && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-md">
                <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
                  <div className="relative">
                    <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search locality, area, landmark, or city..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl shadow-md border border-gray-200/80 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                </Autocomplete>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Zone Overview / Cards List View
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Zone Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage service polygon geofences and check vendor real-time zone positions using Google Maps API.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Active Zones Pill */}
          <div className="flex items-center gap-2 bg-[#FFF1F2] border border-[#FECDD3] rounded-full px-4 py-2 text-xs font-semibold text-[#9F1239]">
            <FiLayers className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Active Zones: {activeCount} / {zones.length}</span>
          </div>

          {/* Online Vendors Pill */}
          <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-full px-4 py-2 text-xs font-semibold text-[#047857]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Online Vendors: {totalOnlineVendors}</span>
          </div>

          {/* Add Zone Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-[#9E2A2B] hover:bg-[#852324] text-white px-5 py-2 rounded-xl font-semibold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add Zone</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-32 h-5 bg-gray-200 rounded"></div>
                <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-14 bg-gray-100 rounded-xl"></div>
                <div className="h-14 bg-gray-100 rounded-xl"></div>
                <div className="h-14 bg-gray-100 rounded-xl"></div>
                <div className="h-14 bg-gray-100 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zone Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {zones.map((zone) => {
            const pointsLen = zone.stats?.pointsCount ?? ringToPoints(zone.coordinates).length;
            const partnersCount = zone.stats?.totalPartners ?? 0;
            const onlineCount = zone.stats?.onlineVendors ?? 0;
            const servicesCount = zone.stats?.servicesCount ?? 0;
            const servicesList = zone.stats?.services || [];

            return (
              <div
                key={zone._id}
                className="bg-white rounded-2xl border border-gray-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between"
              >
                {/* Top: Icon + Name + Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => handleOpenEdit(zone)}
                      className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-50/90 border border-rose-100/80 flex items-center justify-center text-rose-500 shrink-0 group-hover:bg-rose-100/80 transition-colors">
                        <HiLocationMarker className="w-5 h-5 text-rose-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-rose-600 transition-colors truncate">
                          {zone.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-normal">Click to edit zone boundary</p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {zone.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Deactive
                      </span>
                    )}
                  </div>

                  {/* 2x2 Stats Grid */}
                  <div className="grid grid-cols-2 gap-2.5 my-4">
                    {/* Total Partners (Clickable to view all zone vendors) */}
                    <div
                      onClick={() => {
                        setSelectedZoneVendors({
                          zoneName: zone.name,
                          vendors: zone.stats?.vendors || [],
                          filter: 'all'
                        });
                        setVendorSearchQuery('');
                      }}
                      className="bg-[#EEF2FF] hover:bg-indigo-100/70 border border-transparent hover:border-indigo-200/80 rounded-xl p-3 cursor-pointer transition-all duration-150 group/ptn"
                      title="Click to view all partners in this zone"
                    >
                      <div className="text-[11px] font-semibold text-indigo-500 group-hover/ptn:text-indigo-700 flex items-center justify-between">
                        <span>Total Partners</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover/ptn:opacity-100 font-medium transition-opacity">
                          View →
                        </span>
                      </div>
                      <div className="text-sm font-bold text-indigo-800 mt-0.5">{partnersCount} Partners</div>
                    </div>

                    {/* Online Now (Clickable to view online zone vendors) */}
                    <div
                      onClick={() => {
                        setSelectedZoneVendors({
                          zoneName: zone.name,
                          vendors: zone.stats?.vendors || [],
                          filter: 'online'
                        });
                        setVendorSearchQuery('');
                      }}
                      className="bg-[#ECFDF5] hover:bg-emerald-100/70 border border-transparent hover:border-emerald-200/80 rounded-xl p-3 cursor-pointer transition-all duration-150 group/onl"
                      title="Click to view online partners in this zone"
                    >
                      <div className="text-[11px] font-semibold text-emerald-600 group-hover/onl:text-emerald-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online Now
                        </span>
                        <span className="text-[10px] text-emerald-600 opacity-0 group-hover/onl:opacity-100 font-medium transition-opacity">
                          View →
                        </span>
                      </div>
                      <div className="text-sm font-bold text-emerald-800 mt-0.5">{onlineCount} Online</div>
                    </div>

                    {/* Points */}
                    <div className="bg-gray-50/90 rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-gray-400">Points</div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5">{pointsLen} Points</div>
                    </div>

                    {/* Services (Clickable to open services list) */}
                    <div
                      onClick={() => {
                        setSelectedZoneServices({
                          zoneName: zone.name,
                          services: servicesList
                        });
                        setServiceSearchQuery('');
                      }}
                      className="bg-gray-50/90 hover:bg-rose-50/70 border border-transparent hover:border-rose-200/80 rounded-xl p-3 cursor-pointer transition-all duration-150 group/svc"
                      title="Click to view all services in this zone"
                    >
                      <div className="text-[11px] font-semibold text-gray-400 group-hover/svc:text-rose-600 flex items-center justify-between">
                        <span>Services</span>
                        <span className="text-[10px] text-rose-500 opacity-0 group-hover/svc:opacity-100 font-medium transition-opacity">
                          View →
                        </span>
                      </div>
                      <div className="text-sm font-bold text-rose-950 mt-0.5 group-hover/svc:text-rose-700">
                        {servicesCount} Services
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
                  {/* Left Action: Activate / Deactivate */}
                  <button
                    onClick={() => handleToggleStatus(zone)}
                    className="text-xs text-gray-500 font-medium hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    {zone.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  {/* Right Actions: Edit + Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(zone)}
                      className="flex items-center gap-1 text-xs text-[#BE123C] hover:text-[#9F1239] font-semibold transition-colors cursor-pointer"
                    >
                      <HiPencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(zone._id, zone.name)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded cursor-pointer"
                      title="Delete Zone"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && zones.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FiLayers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No Zones Configured</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Click &quot;Add Zone&quot; to draw your first service polygon geofence on the map.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-[#9E2A2B] hover:bg-[#852324] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <HiPlus /> Add Zone
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* Zone Services Details Modal                               */}
      {/* ========================================================= */}
      {selectedZoneServices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <FiBox className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedZoneServices.zoneName} — Services
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedZoneServices.services.length} services available in this zone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedZoneServices(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter Bar (if there are services) */}
            {selectedZoneServices.services.length > 0 && (
              <div className="px-6 pt-4 pb-2">
                <div className="relative">
                  <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    placeholder="Search services in this zone..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Services List Content */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {filteredServices.length > 0 ? (
                filteredServices.map((service, index) => (
                  <div
                    key={service._id || index}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-rose-50/30 hover:border-rose-100 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {service.iconUrl ? (
                        <img
                          src={service.iconUrl}
                          alt={service.title}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-100 shadow-2xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 font-bold text-sm">
                          <FiTag className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-800 capitalize truncate">
                          {service.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {service.basePrice > 0 && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              ₹{service.basePrice}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 capitalize">
                            Status: <span className="text-gray-600 font-medium">{service.status || 'Active'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                      Available
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2.5">
                    <FiBox className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {serviceSearchQuery ? 'No matching services found' : 'No services available in this zone yet'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {serviceSearchQuery
                      ? 'Try searching with another keyword.'
                      : 'Vendors or services assigned to this zone will appear here.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Total: <strong>{filteredServices.length}</strong> of {selectedZoneServices.services.length} services
              </span>
              <button
                onClick={() => setSelectedZoneServices(null)}
                className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Zone Partners Details Modal (With Online/Offline Status)  */}
      {/* ========================================================= */}
      {selectedZoneVendors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <FiLayers className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedZoneVendors.zoneName} — Partners
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedZoneVendors.vendors.length} total partners assigned to this zone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedZoneVendors(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="px-6 pt-4 pb-2 space-y-2.5 border-b border-gray-100 bg-gray-50/50">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: `All (${selectedZoneVendors.vendors.length})` },
                  {
                    id: 'online',
                    label: `Online (${selectedZoneVendors.vendors.filter((v) => v.isOnline).length})`,
                    isOnline: true
                  },
                  {
                    id: 'offline',
                    label: `Offline (${selectedZoneVendors.vendors.filter((v) => !v.isOnline).length})`
                  }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVendorFilterTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      vendorFilterTab === tab.id
                        ? 'bg-[#9E2A2B] text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {tab.isOnline && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    )}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative pb-1">
                <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={vendorSearchQuery}
                  onChange={(e) => setVendorSearchQuery(e.target.value)}
                  placeholder="Search partner by name, phone, service..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Partners List Content */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {filteredZoneVendors.length > 0 ? (
                filteredZoneVendors.map((vendor, index) => (
                  <div
                    key={vendor._id || index}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-white hover:border-indigo-100 hover:shadow-2xs transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {vendor.profilePhoto ? (
                        <img
                          src={vendor.profilePhoto}
                          alt={vendor.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {vendor.name ? vendor.name.substring(0, 2).toUpperCase() : 'VP'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{vendor.name}</h4>
                        <p className="text-[11px] text-gray-500">{vendor.phone}</p>
                        <p className="text-[10px] text-indigo-600 font-medium truncate mt-0.5">
                          {Array.isArray(vendor.service)
                            ? vendor.service.join(', ')
                            : (vendor.service || 'No services specified')}
                        </p>
                      </div>
                    </div>

                    {vendor.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Offline
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2.5">
                    <FiLayers className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {vendorSearchQuery
                      ? 'No matching partners found'
                      : vendorFilterTab === 'online'
                      ? 'No online partners in this zone right now'
                      : 'No partners assigned to this zone yet'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Partners assigned to this zone will appear here with live duty status.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Showing <strong>{filteredZoneVendors.length}</strong> partners
              </span>
              <button
                onClick={() => setSelectedZoneVendors(null)}
                className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneManagement;

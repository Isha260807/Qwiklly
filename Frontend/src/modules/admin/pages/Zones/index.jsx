import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, Polyline, Autocomplete } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import { zoneService } from '../../../../services/zoneService';
import { HiPlus, HiPencil, HiTrash, HiX, HiSearch } from 'react-icons/hi';
import { FiLayers } from 'react-icons/fi';

const libraries = ['places'];
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 22.7196, lng: 75.8577 }; // Indore

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', hint: 'Services will be live for users in this zone.' },
  { value: 'inactive', label: 'Deactive', hint: 'Zone is saved but hidden - no bookings accepted.' }
];

const statusFromFlags = (zone) => (zone.isActive ? 'active' : 'inactive');

const flagsFromStatus = (status) => ({ isActive: status === 'active' });

const STATUS_COLORS = {
  active: '#16a34a',
  inactive: '#9ca3af'
};

// Ring -> editable point list (GeoJSON is [lng,lat]; markers/polygons need {lat,lng})
const ringToPoints = (coordinates) => {
  const ring = coordinates?.coordinates?.[0] || [];
  const editable = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  return editable.map(([lng, lat]) => ({ lat, lng }));
};

const pointsToPolygon = (points) => {
  if (points.length < 3) return null;
  const ring = points.map(p => [p.lng, p.lat]);
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
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const polygonRef = useRef(null);
  const pathListenersRef = useRef([]);
  const searchInputRef = useRef(null);

  // Drawing / editing state - the map always accepts clicks to place points;
  // "drawing" is simply "there's a working draft" (drawPoints.length > 0 or
  // a zone is being edited), not a separate mode the admin has to enable.
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [drawPoints, setDrawPoints] = useState([]);
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await zoneService.getAll();
      if (response.success) setZones(response.zones);
    } catch (error) {
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const activeCount = useMemo(() => zones.filter(z => z.isActive).length, [zones]);
  const hasDraft = drawPoints.length > 0 || editingZoneId !== null;

  const resetDrawing = () => {
    setEditingZoneId(null);
    setDrawPoints([]);
    setFormName('');
    setFormStatus('active');
  };

  const startCreate = () => {
    resetDrawing();
  };

  const startEdit = (zone) => {
    setEditingZoneId(zone._id);
    setDrawPoints(ringToPoints(zone.coordinates));
    setFormName(zone.name);
    setFormStatus(statusFromFlags(zone));

    if (map) {
      const bounds = new window.google.maps.LatLngBounds();
      ringToPoints(zone.coordinates).forEach(p => bounds.extend(p));
      map.fitBounds(bounds);
    }
  };

  const cancelDrawing = () => {
    resetDrawing();
  };

  const undoLastPoint = () => {
    setDrawPoints(prev => prev.slice(0, -1));
  };

  // Clicking the map seeds the first points of a new zone. Once 3 points
  // exist, the shape becomes a native editable Google Maps polygon - drag a
  // corner to move it, drag the small midpoint dot on any edge to insert a
  // new corner there, or right-click a corner to remove it. Map clicks stop
  // adding points at that stage so they don't fight with polygon editing.
  const onMapClick = useCallback((e) => {
    setDrawPoints(prev => {
      if (prev.length >= 3) return prev;
      return [...prev, { lat: e.latLng.lat(), lng: e.latLng.lng() }];
    });
  }, []);

  const detachPathListeners = () => {
    pathListenersRef.current.forEach(listener => listener.remove());
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

  // Clicking an existing zone's polygon opens it for editing instead of
  // adding a stray boundary point at that spot.
  const onZoneClick = (zone, e) => {
    if (e?.stop) e.stop();
    startEdit(zone);
  };

  const onMarkerDragEnd = (index, e) => {
    const updated = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setDrawPoints(prev => prev.map((p, i) => (i === index ? updated : p)));
  };

  const removePoint = (index) => {
    setDrawPoints(prev => prev.filter((_, i) => i !== index));
  };

  const onPlaceChanged = () => {
    if (!autocomplete || !map) return;
    const place = autocomplete.getPlace();

    // Precise point (most results, e.g. a landmark or address)
    const loc = place?.geometry?.location;
    if (loc) {
      map.panTo({ lat: loc.lat(), lng: loc.lng() });
      map.setZoom(15);
      return;
    }

    // Broad area (e.g. a whole city) often only has a viewport, not a point
    if (place?.geometry?.viewport) {
      map.fitBounds(place.geometry.viewport);
      return;
    }

    // User typed a query and hit Enter without picking a dropdown suggestion
    // - Google's widget returns a place with no geometry in that case, so
    // fall back to geocoding the raw text directly.
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
      resetDrawing();
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this zone? This cannot be undone.')) return;
    try {
      await zoneService.remove(id);
      toast.success('Zone deleted successfully');
      if (editingZoneId === id) resetDrawing();
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleQuickStatus = async (zone, status) => {
    try {
      const { isActive } = flagsFromStatus(status);
      await zoneService.update(zone._id, { isActive });
      fetchZones();
    } catch (error) {
      toast.error('Status update failed');
    }
  };

  if (!apiKey) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
        Google Maps API key is not configured (VITE_GOOGLE_MAPS_API_KEY). Zone drawing requires it.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Zone Management</h2>
          <p className="text-sm text-gray-500">Draw service-boundary polygons that decide where bookings are accepted.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600">
            <FiLayers className="w-4 h-4 text-teal-600" />
            Active Zones: <span className="font-semibold text-gray-900">{activeCount} / {zones.length}</span>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors font-medium"
          >
            <HiPlus /> {hasDraft ? 'New Zone' : 'Add Zone'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4" style={{ height: '620px' }}>
        {/* Left panel: Geofence Creator (always visible) + Zones list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-y-auto flex flex-col">
          <div className="p-4 space-y-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FiLayers className="text-rose-600" /> {editingZoneId ? 'Edit Zone' : 'Geofence Creator'}
              </h3>
              {hasDraft && (
                <button onClick={cancelDrawing} className="text-gray-400 hover:text-gray-700">
                  <HiX className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
              Click directly on the map to place boundary points (minimum 3 required). Drag a point to fine-tune, or click a point marker to remove it.
            </div>

            <div className="text-sm text-gray-600">
              Points placed: <span className="font-semibold text-gray-900">{drawPoints.length}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Zone Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. Vijay Nagar"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Zone Mode &amp; Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormStatus(opt.value)}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      formStatus === opt.value
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{STATUS_OPTIONS.find(o => o.value === formStatus)?.hint}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveZone}
                disabled={saving}
                className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Zone'}
              </button>
              <button
                onClick={undoLastPoint}
                disabled={drawPoints.length === 0}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Undo
              </button>
              <button
                onClick={cancelDrawing}
                disabled={!hasDraft}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {zones.map(zone => (
              <div key={zone._id} className="p-4 hover:bg-gray-50/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-gray-900 text-sm">{zone.name}</div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[statusFromFlags(zone)] }}
                  >
                    {STATUS_OPTIONS.find(o => o.value === statusFromFlags(zone))?.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleQuickStatus(zone, opt.value)}
                      className={`px-2 py-1 rounded text-[10px] font-medium border ${
                        statusFromFlags(zone) === opt.value
                          ? 'border-gray-800 text-gray-800'
                          : 'border-gray-200 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => startEdit(zone)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <HiPencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(zone._id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    <HiTrash className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {zones.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No zones found. Enter a name above and click on the map to draw one.
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Map */}
        <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-100 relative">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
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
              {/* Existing zones (dimmed while one of them is being edited) */}
              {zones.map(zone => {
                if (zone._id === editingZoneId) return null;
                const status = statusFromFlags(zone);
                return (
                  <Polygon
                    key={zone._id}
                    paths={ringToPoints(zone.coordinates)}
                    options={{
                      fillColor: STATUS_COLORS[status],
                      fillOpacity: 0.15,
                      strokeColor: STATUS_COLORS[status],
                      strokeWeight: 2,
                      clickable: true,
                      zIndex: 1
                    }}
                    onClick={(e) => onZoneClick(zone, e)}
                  />
                );
              })}

              {drawPoints.length < 3 ? (
                <>
                  {/* Seed phase: first 1-2 points, connected by a plain line */}
                  {drawPoints.length >= 2 && (
                    <Polyline
                      path={drawPoints}
                      options={{ strokeColor: '#f59e0b', strokeWeight: 3, zIndex: 3 }}
                    />
                  )}
                  {drawPoints.map((point, index) => (
                    <Marker
                      key={index}
                      position={point}
                      draggable
                      onDragEnd={(e) => onMarkerDragEnd(index, e)}
                      onClick={() => removePoint(index)}
                      icon={window.google ? {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: '#f59e0b',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                      } : undefined}
                      zIndex={4}
                    />
                  ))}
                </>
              ) : (
                // 3+ points: hand off to Google's native editable polygon -
                // drag a corner to move it, drag the small midpoint dot on
                // any edge to add a corner there, right-click a corner to
                // remove it. onPolygonLoad keeps drawPoints in sync with
                // every such edit.
                <Polygon
                  paths={drawPoints}
                  editable
                  draggable={false}
                  onLoad={onPolygonLoad}
                  onUnmount={onPolygonUnmount}
                  options={{
                    fillColor: '#f59e0b',
                    fillOpacity: 0.35,
                    strokeColor: '#f59e0b',
                    strokeWeight: 3,
                    zIndex: 2
                  }}
                />
              )}
            </GoogleMap>
          ) : null}

          {/* Area search - always available to navigate the map */}
          {isLoaded && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-md">
              <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search location (e.g. Indore, Bhopal)"
                    className="w-full pl-9 pr-3 py-2 rounded-lg shadow-md border border-gray-200 text-sm focus:outline-none"
                  />
                </div>
              </Autocomplete>
            </div>
          )}

          {!isLoaded && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoneManagement;

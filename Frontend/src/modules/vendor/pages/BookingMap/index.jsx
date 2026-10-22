// BookingMap component for tracking vendor journey and arrival verification
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, OverlayView, PolylineF } from '@react-google-maps/api';
import { FiArrowLeft, FiNavigation, FiMapPin, FiCrosshair, FiPhone, FiClock, FiCheckCircle, FiX, FiMaximize, FiMinimize, FiWifiOff, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { FaMotorcycle } from 'react-icons/fa';
import { getBookingById, verifySelfVisit } from '../../services/bookingService';
import VisitVerificationModal from '../../components/common/VisitVerificationModal';
import vendorService from '../../../../services/vendorService';
import { toast } from 'react-hot-toast';
import { useAppNotifications } from '../../../../hooks/useAppNotifications';
import { toCoordinate, buildRouteProgress, serializeRouteProgress, matchRouteProgress, getRemainingPath, formatDistanceMeters, formatRemainingDuration } from '../../../../utils/routeProgress';

// Simple toggle for the simulation button (Controlled via .env)
const SHOW_SIMULATION_BUTTON = import.meta.env.VITE_ENABLE_MAP_SIMULATION === 'true';

// Zomato-like Premium Map Style (Silver/Clean)
const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const libraries = ['places', 'geometry'];

const BookingMap = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialBooking = location.state?.booking || null;

  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(!initialBooking);

  // Initial coords from passed state if available
  const initialCoords = useMemo(() => {
    const bAddr = initialBooking?.address || {};
    const point = toCoordinate(bAddr.lat, bAddr.lng);
    if (point) {
      return point;
    }
    return null;
  }, [initialBooking]);

  const [coords, setCoords] = useState(initialCoords);
  const [map, setMap] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [routePath, setRoutePath] = useState([]);
  const [routeRefreshTick, setRouteRefreshTick] = useState(0);
  const [isAutoCenter, setIsAutoCenter] = useState(true);
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [heading, setHeading] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false); // Lifted state up
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [actionLoading, setActionLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isTrackingActive = ['journey_started', 'visited', 'in_progress'].includes(String(booking?.status || '').toLowerCase());

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // DEBUG: Location Simulator for testing
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries
  });

  const mapRef = useRef(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await getBookingById(id);
        const data = response.data || response;
        setBooking(data);

        // 1. Destination: Fixed Booking Address from DB
        const bAddr = data.address || {};

        const storedPoint = toCoordinate(bAddr.lat, bAddr.lng);
        if (storedPoint) {
          setCoords(storedPoint);
        } else if (window.google?.maps?.Geocoder) {
          const addressStr = typeof bAddr === 'string' ? bAddr : `${bAddr.addressLine1 || ''}, ${bAddr.city || ''}, ${bAddr.state || ''} ${bAddr.pincode || ''}`;
          if (addressStr.replaceAll(',', '').trim() && !addressStr.toLowerCase().includes('current location')) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: addressStr }, (results, status) => {
              if (status === 'OK' && results[0]) {
                setCoords(results[0].geometry.location.toJSON());
              }
            });
          }
        }

      } catch (error) {
        // Error fetching booking
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  // Geocode address fallback if coordinates were not stored and Google Maps just loaded
  useEffect(() => {
    if (isLoaded && booking && (!coords || (!coords.lat && !coords.lng))) {
      const bAddr = booking.address || {};
      const addressStr = typeof bAddr === 'string' ? bAddr : `${bAddr.addressLine1 || ''}, ${bAddr.city || ''}, ${bAddr.state || ''} ${bAddr.pincode || ''}`;
      if (addressStr.replaceAll(',', '').trim() && !addressStr.toLowerCase().includes('current location') && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: addressStr }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setCoords(results[0].geometry.location.toJSON());
          }
        });
      }
    }
  }, [isLoaded, booking, coords]);

  // Watch the vendor GPS only while this booking is actively being tracked.
  useEffect(() => {
    if (isSimulating || !isTrackingActive) {
      if (!isTrackingActive && !isSimulating) setCurrentLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (isSimulating) return;
        const point = toCoordinate(position.coords.latitude, position.coords.longitude);
        if (!point) return;
        const accuracy = Number(position.coords.accuracy);
        const timestamp = Number(position.timestamp) || Date.now();
        if (timestamp < Date.now() - 60000) return;

        setCurrentLocation({
          ...point,
          accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
          timestamp
        });

        if (position.coords.heading !== null && Number.isFinite(Number(position.coords.heading))) {
          setHeading(Number(position.coords.heading));
        }
      },
      (error) => {
        if (error.code === 1) toast.error('Location permission is required to track this booking.', { id: 'vendor-location-permission' });
        else if (error.code === 2) toast.error('Vendor GPS is currently unavailable.', { id: 'vendor-location-unavailable' });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating, isTrackingActive]);
  const socket = useAppNotifications('vendor'); // Get socket instance 

  // ... 

  // Animated location for smooth marker movement
  const [animatedLocation, setAnimatedLocation] = useState(null);
  const targetLocationRef = useRef(null);
  const animatedLocationRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!currentLocation) return;

    targetLocationRef.current = currentLocation;

    if (!animatedLocationRef.current) {
      animatedLocationRef.current = currentLocation;
      setAnimatedLocation(currentLocation);
      return;
    }

    const animateToTarget = () => {
      const target = targetLocationRef.current;
      const current = animatedLocationRef.current;
      if (!target || !current) return;

      const latDiff = target.lat - current.lat;
      const lngDiff = target.lng - current.lng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (distance < 0.00001) {
        animatedLocationRef.current = target;
        setAnimatedLocation(target);
        return;
      }

      const lerpFactor = 0.1;
      const newLat = current.lat + latDiff * lerpFactor;
      const newLng = current.lng + lngDiff * lerpFactor;
      const newLocation = { lat: newLat, lng: newLng };

      animatedLocationRef.current = newLocation;
      setAnimatedLocation(newLocation);
      animationFrameRef.current = requestAnimationFrame(animateToTarget);
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animateToTarget);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentLocation]);

  // Sync Location to Backend (Periodic)
  useEffect(() => {
    if (socket && id && isTrackingActive) {
      socket.emit('join_tracking', id);
    }
  }, [socket, id, isTrackingActive]);

  useEffect(() => {
    if (currentLocation && socket && id && isTrackingActive) {
      const syncInterval = setInterval(() => {
        // START CHANGE: If simulating, do NOT emit periodic updates here (simulation loop does it)
        if (isSimulating) return;
        // END CHANGE

        if (currentLocation.lat && currentLocation.lng) {
          socket.emit('update_location', {
            bookingId: id,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            heading: heading,
            accuracy: currentLocation.accuracy,
            timestamp: currentLocation.timestamp || Date.now()
          });
        }
      }, 5000);

      return () => clearInterval(syncInterval);
    }
  }, [currentLocation, socket, id, heading, isSimulating, isTrackingActive]); // Add isSimulating to dependency array

  // DEBUG: Location Simulator Functions
  const startSimulation = () => {
    if (!currentLocation || !coords || !socket) {
      toast.error('Wait for map to load first');
      return;
    }

    if (!routePath || routePath.length === 0) {
      toast.error('No road path found. Wait for route to load.');
      return;
    }

    setIsSimulating(true);
    toast.success('🚀 Simulation started! Following the road.');

    // Generate detailed points along the specific road path
    const pathPoints = [];
    const stepMeters = 20; // Distance between points (smaller = smoother)

    // Use the FULL path for simulation, not the sliced visualization path
    const simPath = fullRoutePathRef.current && fullRoutePathRef.current.length > 0 ? fullRoutePathRef.current : routePath;

    for (let i = 0; i < simPath.length - 1; i++) {
      const p1 = simPath[i];
      const p2 = simPath[i + 1];

      // Helper to safely get coords whether it's a LatLng object or plain object
      const getLat = (p) => typeof p.lat === 'function' ? p.lat() : p.lat;
      const getLng = (p) => typeof p.lng === 'function' ? p.lng() : p.lng;

      const lat1 = getLat(p1);
      const lng1 = getLng(p1);
      const lat2 = getLat(p2);
      const lng2 = getLng(p2);

      const p1LatLng = new window.google.maps.LatLng(lat1, lng1);
      const p2LatLng = new window.google.maps.LatLng(lat2, lng2);

      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1LatLng, p2LatLng);
      const steps = Math.max(1, Math.floor(dist / stepMeters));

      for (let j = 0; j < steps; j++) {
        const fraction = j / steps;
        const lat = lat1 + (lat2 - lat1) * fraction;
        const lng = lng1 + (lng2 - lng1) * fraction;
        pathPoints.push({ lat, lng });
      }
    }
    // Add destination
    const last = simPath[simPath.length - 1];
    const lastLat = typeof last.lat === 'function' ? last.lat() : last.lat;
    const lastLng = typeof last.lng === 'function' ? last.lng() : last.lng;
    pathPoints.push({ lat: lastLat, lng: lastLng });

    let pathIndex = 0;

    simulationRef.current = setInterval(() => {
      if (pathIndex >= pathPoints.length) {
        stopSimulation();
        toast.success('✅ Arrived at destination!');
        return;
      }

      const point = pathPoints[pathIndex];
      let simHeading = heading;

      // Calculate heading for correct icon rotation
      if (pathIndex < pathPoints.length - 1) {
        const nextPoint = pathPoints[pathIndex + 1];
        simHeading = window.google.maps.geometry.spherical.computeHeading(
          new window.google.maps.LatLng(point),
          new window.google.maps.LatLng(nextPoint)
        );
      }

      // Emit to socket
      socket.emit('update_location', {
        bookingId: id,
        lat: point.lat,
        lng: point.lng,
        heading: simHeading
      });

      // Update local display
      setCurrentLocation(point);
      setHeading(simHeading);

      pathIndex++;
    }, 1000); // Update every 1 second
  };

  const stopSimulation = () => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    setIsSimulating(false);
  };

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);

  // ... existing code ...

  const prevLocationRef = useRef(null);
  const fullRoutePathRef = useRef([]);
  const routeProgressRef = useRef(null);
  const routeProgressDistanceRef = useRef(0);
  const lastSuccessfulRouteOriginRef = useRef(null);
  const lastSuccessfulRouteDestinationRef = useRef(null);
  const pendingRouteRef = useRef(null);
  const routeRequestInFlightRef = useRef(false);
  const routeRequestSequenceRef = useRef(0);
  const routeLastRequestedAtRef = useRef(0);
  const routeOffRouteRef = useRef(false);
  const offRouteCountRef = useRef(0);
  const hasFittedRouteRef = useRef(false);
  const mountedRef = useRef(true);
  const latestLocationRef = useRef(null);
  const latestDestinationRef = useRef(null);

  latestLocationRef.current = currentLocation;
  latestDestinationRef.current = coords;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      routeRequestSequenceRef.current += 1;
      pendingRouteRef.current = null;
    };
  }, []);

  const handleRetryRoute = () => {
    lastSuccessfulRouteOriginRef.current = null;
    lastSuccessfulRouteDestinationRef.current = null;
    routeOffRouteRef.current = true;
    setRouteError(null);
    setRouteRefreshTick(value => value + 1);
  };

  // Directions is requested only for the initial route, destination changes, or a real off-route event.
  // GPS movement itself updates the remaining geometry locally and does not create a billable request.
  useEffect(() => {
    const googleMaps = window.google?.maps;
    const origin = toCoordinate(currentLocation?.lat, currentLocation?.lng);
    const destination = toCoordinate(coords?.lat, coords?.lng);
    if (!isTrackingActive || !isLoaded || !map || !googleMaps || !origin || !destination || !googleMaps.geometry?.spherical) return;

    const lastOrigin = lastSuccessfulRouteOriginRef.current;
    const lastDestination = lastSuccessfulRouteDestinationRef.current;
    const destinationChanged = !lastDestination || googleMaps.geometry.spherical.computeDistanceBetween(
      new googleMaps.LatLng(destination), new googleMaps.LatLng(lastDestination)
    ) > 1;
    const shouldRefresh = !lastOrigin || destinationChanged || routeOffRouteRef.current;
    if (!shouldRefresh) return;

    const isInitialRequest = !lastOrigin;
    if (!isInitialRequest && !destinationChanged && Date.now() - routeLastRequestedAtRef.current < 60000) return;

    pendingRouteRef.current = {
      origin,
      destination,
      shouldFit: !hasFittedRouteRef.current || destinationChanged
    };
    if (routeRequestInFlightRef.current) return;

    const requestNextRoute = () => {
      const nextRoute = pendingRouteRef.current;
      if (!nextRoute || routeRequestInFlightRef.current || !mountedRef.current) return;

      pendingRouteRef.current = null;
      routeRequestInFlightRef.current = true;
      routeLastRequestedAtRef.current = Date.now();
      const requestSequence = ++routeRequestSequenceRef.current;
      const directionsService = new googleMaps.DirectionsService();

      const tryRoute = (mode) => {
        directionsService.route({
          origin: nextRoute.origin,
          destination: nextRoute.destination,
          travelMode: mode
        }, (result, status) => {
          if (!mountedRef.current || requestSequence !== routeRequestSequenceRef.current) return;

          const latestDestination = toCoordinate(latestDestinationRef.current?.lat, latestDestinationRef.current?.lng);
          const responseIsCurrent = latestDestination && googleMaps.geometry.spherical.computeDistanceBetween(
            new googleMaps.LatLng(nextRoute.destination), new googleMaps.LatLng(latestDestination)
          ) <= 1;

          if (status === googleMaps.DirectionsStatus.OK && result?.routes?.[0]?.legs?.[0] && responseIsCurrent) {
            routeRequestInFlightRef.current = false;
            const route = result.routes[0];
            const leg = route.legs[0];
            const nextProgress = buildRouteProgress({
              route,
              distanceText: leg.distance?.text || '',
              distanceValue: leg.distance?.value || 0,
              durationText: leg.duration?.text || '',
              durationValue: leg.duration?.value || 0,
              origin: nextRoute.origin,
              destination: nextRoute.destination
            });

            if (nextProgress) {
              routeProgressRef.current = nextProgress;
              routeProgressDistanceRef.current = 0;
              fullRoutePathRef.current = nextProgress.path;
              setRoutePath(nextProgress.path);
              setDirections(result);
              setRouteError(null);
              setDistance(leg.distance?.text || '');
              setDuration(leg.duration?.text || '');
              lastSuccessfulRouteOriginRef.current = nextRoute.origin;
              lastSuccessfulRouteDestinationRef.current = nextRoute.destination;
              routeOffRouteRef.current = false;
              offRouteCountRef.current = 0;
              pendingRouteRef.current = null;

              if (socket && id && isTrackingActive) {
                socket.emit('update_location', {
                  bookingId: id,
                  lat: nextRoute.origin.lat,
                  lng: nextRoute.origin.lng,
                  heading: heading,
                  accuracy: currentLocation?.accuracy,
                  timestamp: Date.now(),
                  routeSnapshot: serializeRouteProgress(nextProgress)
                });
              }

              if (nextRoute.shouldFit) {
                const bounds = new googleMaps.LatLngBounds();
                nextProgress.path.forEach(point => bounds.extend(point));
                map.fitBounds(bounds, { top: 80, right: 40, bottom: 250, left: 40 });
                hasFittedRouteRef.current = true;
              }
            }
            requestNextRoute();
          } else if (mode === googleMaps.TravelMode.DRIVING) {
            // Driving route not found, try walking fallback
            tryRoute(googleMaps.TravelMode.WALKING);
          } else {
            routeRequestInFlightRef.current = false;
            // Both DRIVING and WALKING failed: Fallback to direct path
            const straightPath = [nextRoute.origin, nextRoute.destination];
            const p1 = new googleMaps.LatLng(nextRoute.origin);
            const p2 = new googleMaps.LatLng(nextRoute.destination);
            const distM = googleMaps.geometry?.spherical?.computeDistanceBetween(p1, p2) || 0;

            const fallbackProgress = buildRouteProgress({
              path: straightPath,
              distanceText: distM < 1000 ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1)} km`,
              distanceValue: distM,
              durationText: distM < 1000 ? '< 1 min' : `${Math.max(1, Math.round((distM / 1000 / 30) * 60))} min`,
              durationValue: Math.round((distM / 1000 / 30) * 3600),
              origin: nextRoute.origin,
              destination: nextRoute.destination
            });

            if (fallbackProgress) {
              routeProgressRef.current = fallbackProgress;
              routeProgressDistanceRef.current = 0;
              fullRoutePathRef.current = straightPath;
              setRoutePath(straightPath);
              setDirections(null);
              setDistance(fallbackProgress.totalDistanceText);
              setDuration(fallbackProgress.totalDurationText);
              lastSuccessfulRouteOriginRef.current = nextRoute.origin;
              lastSuccessfulRouteDestinationRef.current = nextRoute.destination;
              routeOffRouteRef.current = false;
              offRouteCountRef.current = 0;
              pendingRouteRef.current = null;

              if (socket && id && isTrackingActive) {
                socket.emit('update_location', {
                  bookingId: id,
                  lat: nextRoute.origin.lat,
                  lng: nextRoute.origin.lng,
                  heading: heading,
                  accuracy: currentLocation?.accuracy,
                  timestamp: Date.now(),
                  routeSnapshot: serializeRouteProgress(fallbackProgress)
                });
              }

              if (nextRoute.shouldFit) {
                const bounds = new googleMaps.LatLngBounds();
                bounds.extend(nextRoute.origin);
                bounds.extend(nextRoute.destination);
                map.fitBounds(bounds, { top: 80, right: 40, bottom: 250, left: 40 });
                hasFittedRouteRef.current = true;
              }

              if (distM > 50) {
                setRouteError('Road navigation route unavailable. Showing direct path.');
              } else {
                setRouteError(null);
              }
            } else if (!lastSuccessfulRouteOriginRef.current && !pendingRouteRef.current) {
              setRouteError('Could not calculate a driving route to this location.');
            }

            requestNextRoute();
          }
        });
      };

      tryRoute(googleMaps.TravelMode.DRIVING);
    };

    requestNextRoute();
  }, [isLoaded, coords, map, currentLocation, isTrackingActive, socket, id, routeRefreshTick, heading]);

  // Match GPS to the stored road geometry and remove only the completed route behind the vendor.
  useEffect(() => {
    const progress = routeProgressRef.current;
    const current = toCoordinate(currentLocation?.lat, currentLocation?.lng);
    if (!progress || !current || !isLoaded) return;

    const accuracy = Number(currentLocation?.accuracy) || 50;
    const match = matchRouteProgress(progress, current, routeProgressDistanceRef.current, accuracy);
    if (!match) return;

    routeProgressDistanceRef.current = Math.max(routeProgressDistanceRef.current, match.progressMeters);
    setRoutePath(getRemainingPath(progress, match));
    setDistance(formatDistanceMeters(Math.max(0, progress.totalDistanceMeters - routeProgressDistanceRef.current)));
    setDuration(formatRemainingDuration(progress, Math.max(0, progress.totalDistanceMeters - routeProgressDistanceRef.current)));

    const offRouteThreshold = Math.max(75, accuracy + 25);
    if (match.distanceToRouteMeters > offRouteThreshold) {
      offRouteCountRef.current += 1;
      if (offRouteCountRef.current >= 2 && !routeOffRouteRef.current) {
        routeOffRouteRef.current = true;
        setRouteRefreshTick(value => value + 1);
      }
    } else {
      offRouteCountRef.current = 0;
    }
  }, [currentLocation, isLoaded]);
  // Calculate Heading based on movement (Direction Sense)
  useEffect(() => {
    if (isLoaded && currentLocation && window.google) {
      if (prevLocationRef.current) {
        const start = new window.google.maps.LatLng(prevLocationRef.current);
        const end = new window.google.maps.LatLng(currentLocation);
        const distanceMoved = window.google.maps.geometry.spherical.computeDistanceBetween(start, end);

        // Update heading only if movement is significant (> 2 meters) to prevent jitter
        if (distanceMoved > 1) { // Reduced threshold
          const newHeading = window.google.maps.geometry.spherical.computeHeading(start, end);
          setHeading(newHeading);
        }
      } else if (coords) {
        // Initial heading towards job destination
        const start = new window.google.maps.LatLng(currentLocation);
        const end = new window.google.maps.LatLng(coords);
        setHeading(window.google.maps.geometry.spherical.computeHeading(start, end));
      }
      prevLocationRef.current = currentLocation;
    }
  }, [currentLocation, isLoaded, coords]);

  // Sync Map Heading & Tilt for Navigation Feel
  useEffect(() => {
    if (map && currentLocation && heading && isAutoCenter) {
      map.setHeading(heading);
      map.setTilt(0); // Keep custom markers aligned with the road route
    }
  }, [map, heading, isAutoCenter, currentLocation]);

  // Memoize Map Markers to prevent flickering/blinking
  const destinationMarker = useMemo(() => coords && (
    <OverlayView
      position={coords}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div className="relative -translate-x-1/2 -translate-y-[90%] pointer-events-none flex flex-col items-center">
        <FiMapPin className="w-10 h-10 text-red-600 drop-shadow-xl fill-red-600 stroke-white stroke-[1.5px]" />
        <div className="w-3 h-1 bg-black/20 rounded-full blur-[2px] mt-[-2px]"></div>
      </div>
    </OverlayView>
  ), [coords]);

  const riderMarker = useMemo(() => animatedLocation && (
    <OverlayView
      position={animatedLocation}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        style={{
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          cursor: 'pointer'
        }}
        className="pointer-events-none"
      >
        <div
          className="relative z-20 w-16 h-16"
          style={{
            transform: `rotate(${heading}deg)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <img
            src="/MapRider.png"
            alt="Rider"
            className="w-full h-full object-contain drop-shadow-xl rounded-full"
          />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-teal-500/30 rounded-full animate-ping z-10 pointer-events-none"></div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-12 h-3 bg-black/20 blur-sm rounded-full z-0"></div>
      </div>
    </OverlayView>
  ), [animatedLocation, heading]);

  useEffect(() => {
    if (!map || !isFullScreen || !window.google?.maps?.event) return;
    const center = map.getCenter();
    const frame = requestAnimationFrame(() => {
      window.google.maps.event.trigger(map, 'resize');
      if (center) map.setCenter(center);
    });
    return () => cancelAnimationFrame(frame);
  }, [map, isFullScreen]);
  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeId: 'roadmap',
    gestureHandling: 'greedy',
    rotateControl: true,
    tiltControl: true,
    isFractionalZoomEnabled: true,
    styles: mapStyles,
    ...(mapId ? { mapId } : {}),
  }), [mapId]);

  if (loading && !booking) return <div className="h-screen bg-gray-100 flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="h-screen flex flex-col relative bg-white overflow-hidden">
      {/* Top Floating Header */}
      {/* Top Floating Header - Always Visible */}
      <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-start pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md text-gray-700 hover:bg-white transition-all active:scale-95 cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* No Internet Overlay */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-3 right-3 z-50 bg-red-500 text-white p-3 rounded-xl shadow-xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0">
              <FiWifiOff className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xs">No Internet Connection</h3>
              <p className="text-[10px] text-red-100">Check your network settings.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Error Overlay (Centered) */}
      <AnimatePresence>
        {routeError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-x-4 top-[20%] z-40 bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm mx-auto border border-gray-100"
          >
            <button
              onClick={() => setRouteError(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close"
            >
              <FiX className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
              <FiAlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">Route Notice</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {routeError}
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleRetryRoute}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FiRefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
              <button
                onClick={() => {
                  const dest = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(booking?.address?.addressLine1 || '');
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                }}
                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                Open Maps
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Mode Info Card */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-0 right-0 z-10 flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto bg-white/95 backdrop-blur-xl px-4 py-1.5 rounded-full shadow-lg flex items-center gap-4 border border-white/20 ring-1 ring-black/5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center">
                  <FiMapPin className="w-3 h-3 text-teal-600" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Remaining</p>
                  <p className="text-xs font-bold text-gray-800">{distance}</p>
                </div>
              </div>

              <div className="w-px h-6 bg-gray-100"></div>

              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                  <FiClock className="w-3 h-3 text-orange-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">ETA</p>
                  <p className="text-xs font-bold text-gray-800">{duration}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full h-full relative">
        {!isLoaded ? (
          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-gray-400 font-medium">Loading Map...</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            defaultCenter={defaultCenter}
            defaultZoom={14}
            onLoad={map => {
              setMap(map);
              map.setTilt(0);
              if (currentLocation && coords) {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(currentLocation);
                bounds.extend(coords);
                map.fitBounds(bounds, 60);
              } else if (currentLocation) {
                map.setCenter(currentLocation);
                map.setZoom(16);
              } else if (coords) {
                map.setCenter(coords);
                map.setZoom(16);
              }
            }}
            onDragStart={() => setIsAutoCenter(false)}
            options={mapOptions}
          >
            {(directions || (routePath && routePath.length > 1)) && (
              <>
                {directions && (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      suppressMarkers: true,
                      suppressPolylines: true
                    }}
                  />
                )}
                {routePath && routePath.length > 1 && (
                  <PolylineF
                    path={routePath}
                    options={{
                      strokeColor: "#0F766E", // Dark Teal
                      strokeWeight: 8,
                      strokeOpacity: 1,
                      zIndex: 50
                    }}
                  />
                )}
              </>
            )}

            {destinationMarker}
            {riderMarker}
          </GoogleMap>
        )}

        {/* Full Screen Toggle Button */}
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="absolute top-3 right-3 p-2 rounded-full shadow-md transition-all active:scale-90 z-50 bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullScreen ? <FiMinimize className="w-4 h-4" /> : <FiMaximize className="w-4 h-4" />}
        </button>

        {/* Recenter Button */}
        <button
          onClick={() => {
            setIsAutoCenter(true);
            if (map && currentLocation) {
              map.panTo(currentLocation);
              if (!isNavigationMode) {
                map.setZoom(15);
              } else {
                map.setZoom(18);
              }
            }
          }}
          className={`absolute top-12 right-3 p-2 rounded-full shadow-md transition-all active:scale-90 z-50 cursor-pointer ${isAutoCenter ? 'bg-teal-600 text-white animate-pulse' : 'bg-white/90 backdrop-blur-md text-gray-700'}`}
          title="Recenter"
        >
          <FiCrosshair className="w-4 h-4" />
        </button>

        {/* DEBUG: Simulation Button */}
        {SHOW_SIMULATION_BUTTON && (
          <button
            onClick={isSimulating ? stopSimulation : startSimulation}
            className={`absolute top-22 right-3 px-2.5 py-1.5 rounded-full shadow-md transition-all active:scale-90 z-50 text-[10px] font-bold cursor-pointer ${isSimulating ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'}`}
          >
            {isSimulating ? '⏹ Stop' : '🚀 Simulate'}
          </button>
        )}
      </div>

      {/* Modern Compact Bottom Card */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 p-3.5 pb-4 transition-transform duration-300 ${isFullScreen ? 'translate-y-full' : ''}`}>
        <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-2"></div>

        {/* Time & Distance Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] font-semibold text-teal-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse"></span>
              {duration ? `Trip time: ${duration}` : 'Calculating path...'}
            </p>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Job Location</h2>
          </div>
          {distance && (
            <div className="text-right">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Distance</p>
              <p className="text-sm font-extrabold text-gray-800">{distance}</p>
            </div>
          )}
        </div>

        {/* Address Section */}
        <div className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2.5 mb-2.5 border border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-xs text-teal-600 border border-gray-100 shrink-0">
            <FiMapPin className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-gray-900 truncate">Address</h3>
            <p className="text-[11px] text-gray-500 line-clamp-1 leading-snug">
              {(() => {
                const addr = booking?.address;
                if (!addr) return 'Address loading...';
                if (typeof addr === 'string') return addr;
                return `${addr.addressLine2 ? addr.addressLine2 + ', ' : ''}${addr.addressLine1 || ''}, ${addr.city || ''} ${addr.pincode || ''}`;
              })()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {booking?.status === 'journey_started' && (
            <button
              onClick={() => setIsVisitModalOpen(true)}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FiCheckCircle className="w-4 h-4" /> Reached
            </button>
          )}

          {(booking?.userId?.phone || booking?.customerPhone) && (
            <a
              href={`tel:${booking.userId?.phone || booking.customerPhone}`}
              className="flex-1 py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FiPhone className="w-4 h-4" /> Call
            </a>
          )}
          <button
            onClick={() => {
              const bAddr = booking?.address;
              const addressStr = typeof bAddr === 'string' ? bAddr : `${bAddr.addressLine1 || ''}, ${bAddr.city || ''}`;
              const dest = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(addressStr);
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
            }}
            className="w-10 h-9 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
            title="Open in Google Maps"
          >
            <FiNavigation className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visit OTP Modal */}
      <VisitVerificationModal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        bookingId={id}
        onSuccess={() => {
          setIsVisitModalOpen(false);
          window.dispatchEvent(new Event('vendorJobsUpdated'));
          navigate(`/vendor/booking/${id}/timeline`);
        }}
      />
    </div>
  );
};

export default BookingMap;

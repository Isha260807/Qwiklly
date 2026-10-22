import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, off } from 'firebase/database';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, OverlayView, PolylineF } from '@react-google-maps/api';
import { FiArrowLeft, FiNavigation, FiMapPin, FiCrosshair, FiPhone, FiUser, FiStar, FiShield, FiKey, FiCheckCircle, FiLoader, FiDollarSign, FiMaximize, FiMinimize, FiClock } from 'react-icons/fi';
import { bookingService } from '../../../../services/bookingService';
import { paymentService } from '../../../../services/paymentService';
import { toast } from 'react-hot-toast';
import { useAppNotifications } from '../../../../hooks/useAppNotifications';
import LogoLoader from '../../../../components/common/LogoLoader';
import PaymentVerificationModal from '../../components/booking/PaymentVerificationModal';
import { toCoordinate, distanceBetweenMeters, buildRouteProgress, hydrateRouteSnapshot, matchRouteProgress, getRemainingPath, formatDistanceMeters, formatRemainingDuration } from '../../../../utils/routeProgress';


const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

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

const BookingTrack = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [map, setMap] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null); // Rider Location
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [routePath, setRoutePath] = useState([]);
  const [routeSnapshot, setRouteSnapshot] = useState(null);
  const routeProgressRef = useRef(null);
  const routeProgressDistanceRef = useRef(0);
  const routeDestinationRef = useRef(null);
  const routeRequestInFlightRef = useRef(false);
  const routeRequestSequenceRef = useRef(0);
  const routeLoadedRef = useRef(false);
  const hasFittedRouteRef = useRef(false);
  const latestLocationTimestampRef = useRef(0);
  const latestRouteTimestampRef = useRef(0);
  const [isAutoCenter, setIsAutoCenter] = useState(true);
  const [isNavigationMode, setIsNavigationMode] = useState(false);

  const [paying, setPaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const isTrackingActive = ['journey_started', 'visited', 'in_progress'].includes(String(booking?.status || '').toLowerCase());

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const handleOnlinePayment = async () => {
    if (paying) return;

    // If a Razorpay order already exists for this booking, reuse it
    if (booking.razorpayOrderId) {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round((booking.finalAmount || 0) * 100),
        currency: 'INR',
        order_id: booking.razorpayOrderId,
        name: 'Appzeto',
        description: `Payment for ${booking.serviceName}`,
        handler: async function (response) {
          toast.loading('Verifying payment...');
          const verifyResponse = await paymentService.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          toast.dismiss();
          if (verifyResponse.success) {
            toast.success('Payment successful!');
            navigate(`/user/booking/${booking._id || booking.id}`);
          } else {
            toast.error('Payment verification failed');
          }
          setPaying(false);
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        },
        prefill: { name: 'User', contact: '' },
        theme: { color: "#0F766E" }
      };
      setPaying(true);
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      return;
    }

    try {
      setPaying(true);
      toast.loading('Creating payment order...');
      const orderResponse = await paymentService.createOrder(booking._id || booking.id);
      toast.dismiss();

      if (!orderResponse.success) {
        toast.error(orderResponse.message || 'Failed to create payment order');
        setPaying(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderResponse.data.amount * 100,
        currency: orderResponse.data.currency || 'INR',
        order_id: orderResponse.data.orderId,
        name: 'Appzeto',
        description: `Payment for ${booking.serviceName}`,
        handler: async function (response) {
          toast.loading('Verifying payment...');
          const verifyResponse = await paymentService.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          toast.dismiss();

          if (verifyResponse.success) {
            toast.success('Payment successful!');
            navigate(`/user/booking/${booking._id || booking.id}`);
          } else {
            toast.error('Payment verification failed');
          }
          setPaying(false);
        },
        modal: {
          onhighlight: function () { },
          ondismiss: function () {
            setPaying(false);
          }
        },
        prefill: {
          name: 'User',
          contact: ''
        },
        theme: {
          color: "#0F766E"
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to process payment');
      setPaying(false);
    }
  };

  // Track if initial location was set from socket
  const locationFromSocketRef = useRef(false);

  // Main function to fetch booking data - accessible to all effects
  const refreshBooking = React.useCallback(async (isFirstLoad = false) => {
    try {
      const response = await bookingService.getById(id);
      if (response.success) {
        setBooking(response.data);

        // Geocoding and Initial Location Logic
        // Only run this complex logic on first load or if coords/location are missing
        if (isFirstLoad || !coords) {
          const geocoder = new window.google.maps.Geocoder();
          const bAddr = response.data.address || {};

          // 1. Destination
          const storedDestination = toCoordinate(bAddr.lat, bAddr.lng);
          if (storedDestination) {
            setCoords(storedDestination);
          } else {
            const addressStr = typeof bAddr === 'string' ? bAddr : `${bAddr.addressLine1 || ''}, ${bAddr.city || ''}, ${bAddr.state || ''} ${bAddr.pincode || ''}`;
            if (addressStr && addressStr.replaceAll(',', '').trim() && !addressStr.toLowerCase().includes('current location')) {
              geocoder.geocode({ address: addressStr }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  setCoords(results[0].geometry.location.toJSON());
                }
              });
            }
          }

          // 2. Source (Provider Location) - ONLY on first load if no socket location received yet
          if (isFirstLoad && !locationFromSocketRef.current) {
            const provider = response.data.workerId || response.data.assignedTo || response.data.vendorId || {};
            const providerLocation = toCoordinate(provider.location?.lat, provider.location?.lng);
            if (providerLocation) {
              setCurrentLocation(providerLocation);
            } else if (response.data.vendorId && provider.address) {
              // Fallback to vendor address
              const providerAddress = toCoordinate(provider.address.lat, provider.address.lng);
              if (providerAddress) setCurrentLocation(providerAddress);
            } else {
              // Reset if no location found to avoid wrong location display
              setCurrentLocation(null);
            }
          }
        }
      }
    } catch (error) {
      // Error fetching booking
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  }, [id, coords]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries
  });

  // Initial Load and Polling
  useEffect(() => {
    if (isLoaded) {
      refreshBooking(true);
      const intervalId = setInterval(() => refreshBooking(false), 10000); // Poll every 10s
      return () => clearInterval(intervalId);
    }
  }, [isLoaded, refreshBooking]);

  const socket = useAppNotifications('user');

  // Socket Listener
  useEffect(() => {
    if (socket && id) {
      socket.emit('join_tracking', id);

      const handleLocationUpdate = (data) => {
        const routeTimestamp = Number(data?.routeSnapshot?.timestamp);
        if (data?.routeSnapshot && (!Number.isFinite(routeTimestamp) || routeTimestamp >= latestRouteTimestampRef.current)) {
          if (Number.isFinite(routeTimestamp)) latestRouteTimestampRef.current = routeTimestamp;
          setRouteSnapshot(data.routeSnapshot);
        }

        const incomingTimestamp = Number(data?.gpsTimestamp || data?.timestamp);
        if (Number.isFinite(incomingTimestamp) && incomingTimestamp + 1000 < latestLocationTimestampRef.current) return;
        if (Number.isFinite(incomingTimestamp)) latestLocationTimestampRef.current = incomingTimestamp;

        const point = toCoordinate(data?.lat, data?.lng);
        if (!point) return;
        locationFromSocketRef.current = true;
        setCurrentLocation({
          ...point,
          accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : null,
          timestamp: incomingTimestamp || Date.now()
        });
        if (data.heading !== undefined && data.heading !== null) {
          setHeading(parseFloat(data.heading));
        }
      };
      const handleBookingUpdate = (data) => {
        if (data.bookingId === id || data.relatedId === id || data.data?.bookingId === id) {
          setBooking(prev => {
            if (!prev) return prev;
            return { ...prev, ...(data.data || data) };
          });
          if (data.qrPaymentInitiated) {
            setShowPaymentModal(true);
            toast.success('Professional has initiated payment!');
          } else if (data.customerConfirmationOTP) {
            setShowPaymentModal(true);
            toast.success('Professional has requested payment!');
          }
          refreshBooking(false);
        }
      };

      socket.on('live_location_update', handleLocationUpdate);
      socket.on('booking_updated', handleBookingUpdate);
      socket.on('notification', handleBookingUpdate);

      return () => {
        socket.off('live_location_update', handleLocationUpdate);
        socket.off('booking_updated', handleBookingUpdate);
        socket.off('notification', handleBookingUpdate);
      };
    }
  }, [socket, id]);

  // Firebase Realtime Tracking Listener
  useEffect(() => {
    if (!db || !id) return;

    const trackingRef = ref(db, `trackings/${id}`);

    const unsubscribe = onValue(trackingRef, (snapshot) => {
      const data = snapshot.val();
      const firebaseTimestamp = Number(data?.updatedAt);
      if (Number.isFinite(firebaseTimestamp) && firebaseTimestamp + 1000 < latestLocationTimestampRef.current) return;
      const point = toCoordinate(data?.lat, data?.lng);
      if (!point) return;
      if (Number.isFinite(firebaseTimestamp)) latestLocationTimestampRef.current = firebaseTimestamp;
      locationFromSocketRef.current = true;
      setCurrentLocation({
        ...point,
        accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : null,
        timestamp: firebaseTimestamp || Date.now()
      });
      if (data.heading !== undefined && data.heading !== null) {
        setHeading(parseFloat(data.heading));
      }
    });

    return () => unsubscribe();
  }, [id]);

  // Animated location for smooth marker movement
  const [animatedLocation, setAnimatedLocation] = useState(null);
  const targetLocationRef = useRef(null);
  const animatedLocationRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Smooth interpolation for marker movement
  useEffect(() => {
    if (!currentLocation) return;

    // Store target location
    targetLocationRef.current = currentLocation;

    // If no animated location yet, set it directly
    if (!animatedLocationRef.current) {
      animatedLocationRef.current = currentLocation;
      setAnimatedLocation(currentLocation);
      return;
    }

    // Animation function using refs to avoid stale closures
    const animateToTarget = () => {
      const target = targetLocationRef.current;
      const current = animatedLocationRef.current;

      if (!target || !current) return;

      // Calculate distance to target
      const latDiff = target.lat - current.lat;
      const lngDiff = target.lng - current.lng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      // If close enough, snap to target
      if (distance < 0.00001) {
        animatedLocationRef.current = target;
        setAnimatedLocation(target);
        return;
      }

      // Lerp factor - lower = smoother but slower
      const lerpFactor = 0.1;

      const newLat = current.lat + latDiff * lerpFactor;
      const newLng = current.lng + lngDiff * lerpFactor;
      const newLocation = { lat: newLat, lng: newLng };

      animatedLocationRef.current = newLocation;
      setAnimatedLocation(newLocation);

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animateToTarget);
    };

    // Cancel previous animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Start new animation
    animationFrameRef.current = requestAnimationFrame(animateToTarget);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentLocation]);

  const [heading, setHeading] = useState(0);
  const prevLocationRef = useRef(null);

  // Calculate Heading based on movement (Direction Sense)
  useEffect(() => {
    if (isLoaded && currentLocation && window.google) {
      if (prevLocationRef.current) {
        const start = new window.google.maps.LatLng(prevLocationRef.current);
        const end = new window.google.maps.LatLng(currentLocation);
        const distanceMoved = window.google.maps.geometry.spherical.computeDistanceBetween(start, end);

        // Update heading only if movement is significant (> 2 meters) to prevent jitter
        if (distanceMoved > 2) {
          const newHeading = window.google.maps.geometry.spherical.computeHeading(start, end);
          setHeading(newHeading);
        }
      } else if (coords) {
        // Initial heading towards destination
        const start = new window.google.maps.LatLng(currentLocation);
        const end = new window.google.maps.LatLng(coords);
        setHeading(window.google.maps.geometry.spherical.computeHeading(start, end));
      }
      prevLocationRef.current = currentLocation;
    }
  }, [currentLocation, isLoaded, coords]);

  // DISABLED: Auto heading/tilt sync causes map fluctuation
  // The heading is now displayed on the marker only, not on the map itself
  // useEffect(() => {
  //   if (map && currentLocation && heading && isAutoCenter) {
  //     map.setHeading(heading);
  //     map.setTilt(45);
  //   }
  // }, [map, heading, isAutoCenter, currentLocation]);

  // Simulate Rider Location (Since we don't have real rider GPS stream yet for User App)
  // Ideally this would come from a websocket or Firebase subscription
  // Fallback: Set initial position to allow route calculation
  /* 
  // Simulation Removed: Waiting for Real Backend Location Updates
  // Ideally, use a WebSocket or periodic fetch here to update `currentLocation`
  // with the real rider's GPS coordinates.
  */

  // The vendor publishes one driving route snapshot. The customer hydrates it locally,
  // so GPS updates only advance along the already-rendered road geometry.
  useEffect(() => {
    const destination = toCoordinate(coords?.lat, coords?.lng);
    const snapshotProgress = hydrateRouteSnapshot(routeSnapshot);
    if (!isTrackingActive || !isLoaded || !map || !destination || !snapshotProgress) return;

    const snapshotDestination = snapshotProgress.destination;
    if (snapshotDestination && distanceBetweenMeters(snapshotDestination, destination) > 100) return;

    routeRequestSequenceRef.current += 1;
    routeRequestInFlightRef.current = false;
    routeProgressRef.current = snapshotProgress;
    routeProgressDistanceRef.current = 0;
    routeDestinationRef.current = destination;
    routeLoadedRef.current = true;
    setDirections(null);
    setRoutePath(snapshotProgress.path);
    setDistance(snapshotProgress.totalDistanceText || formatDistanceMeters(snapshotProgress.totalDistanceMeters));
    setDuration(snapshotProgress.totalDurationText || '');

    if (!hasFittedRouteRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      snapshotProgress.path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, { top: 80, right: 40, bottom: 260, left: 40 });
      hasFittedRouteRef.current = true;
    }
  }, [routeSnapshot, coords, map, isLoaded, isTrackingActive]);

  // Fallback for a customer who opens tracking before the vendor publishes a snapshot.
  // It is intentionally a single request per destination; it never reroutes on every GPS update.
  useEffect(() => {
    const googleMaps = window.google?.maps;
    const origin = toCoordinate(currentLocation?.lat, currentLocation?.lng);
    const destination = toCoordinate(coords?.lat, coords?.lng);
    const snapshotProgress = hydrateRouteSnapshot(routeSnapshot);
    const snapshotMatches = snapshotProgress?.destination
      ? distanceBetweenMeters(snapshotProgress.destination, destination) <= 100
      : Boolean(snapshotProgress);

    if (!isTrackingActive || !isLoaded || !map || !googleMaps || !origin || !destination || snapshotMatches) return;

    if (routeProgressRef.current && routeDestinationRef.current && distanceBetweenMeters(routeDestinationRef.current, destination) <= 1) return;
    if (routeRequestInFlightRef.current) return;

    routeProgressRef.current = null;
    routeDestinationRef.current = destination;
    routeLoadedRef.current = false;
    routeRequestInFlightRef.current = true;
    const requestSequence = ++routeRequestSequenceRef.current;
    const directionsService = new googleMaps.DirectionsService();

    directionsService.route({
      origin,
      destination,
      travelMode: googleMaps.TravelMode.DRIVING
    }, (result, status) => {
      routeRequestInFlightRef.current = false;
      if (requestSequence !== routeRequestSequenceRef.current) return;
      if (status !== googleMaps.DirectionsStatus.OK || !result?.routes?.[0]?.legs?.[0]) return;

      const route = result.routes[0];
      const leg = route.legs[0];
      const nextProgress = buildRouteProgress({
        route,
        distanceText: leg.distance?.text || '',
        distanceValue: leg.distance?.value || 0,
        durationText: leg.duration?.text || '',
        durationValue: leg.duration?.value || 0,
        origin,
        destination
      });
      if (!nextProgress) return;

      routeProgressRef.current = nextProgress;
      routeProgressDistanceRef.current = 0;
      routeDestinationRef.current = destination;
      routeLoadedRef.current = true;
      setDirections(result);
      setRoutePath(nextProgress.path);
      setDistance(nextProgress.totalDistanceText || formatDistanceMeters(nextProgress.totalDistanceMeters));
      setDuration(nextProgress.totalDurationText || '');

      if (!hasFittedRouteRef.current) {
        const bounds = new googleMaps.LatLngBounds();
        nextProgress.path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds, { top: 80, right: 40, bottom: 260, left: 40 });
        hasFittedRouteRef.current = true;
      }
    });
  }, [currentLocation, coords, routeSnapshot, map, isLoaded, isTrackingActive]);

  // Advance the displayed route locally. This uses the rendered road geometry,
  // never straight-line distance or a synthetic speed estimate.
  useEffect(() => {
    const progress = routeProgressRef.current;
    const locationPoint = toCoordinate(currentLocation?.lat, currentLocation?.lng);
    if (!progress || !locationPoint) return;

    const accuracy = Number(currentLocation?.accuracy) || 50;
    const match = matchRouteProgress(progress, locationPoint, routeProgressDistanceRef.current, accuracy);
    if (!match) return;

    routeProgressDistanceRef.current = Math.max(routeProgressDistanceRef.current, match.progressMeters);
    const remainingMeters = Math.max(0, progress.totalDistanceMeters - routeProgressDistanceRef.current);
    setRoutePath(getRemainingPath(progress, match));
    setDistance(formatDistanceMeters(remainingMeters));
    setDuration(formatRemainingDuration(progress, remainingMeters));
  }, [currentLocation]);

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
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: mapStyles,
  }), []);

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

  if (!isLoaded || loading || !booking) return <LogoLoader />;

  // Determine active provider based on priority: Worker -> Assigned -> Vendor
  const provider = booking?.workerId || booking?.assignedTo || booking?.vendorId || {};

  // Booking paid upfront online (100% pre-paid architecture) — no on-site OTP/cash flow applies.
  const isPrepaidOnline = booking.paymentMethod === 'online' && booking.paymentStatus === 'success';

  return (
    <div className="h-screen flex flex-col relative bg-white overflow-hidden">
      {/* Top Floating Header */}
      {/* Top Floating Header - Always Visible */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        <button
          onClick={() => navigate(`/user/booking/${id}`)}
          className="pointer-events-auto bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg text-gray-700 hover:bg-white transition-all active:scale-95"
        >
          <FiArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Full Screen Stats Card */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-6 left-0 right-0 z-10 flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto bg-white/95 backdrop-blur-xl px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-6 border border-white/20 ring-1 ring-black/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                  <FiMapPin className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remaining</p>
                  <p className="text-sm font-black text-gray-800">{distance}</p>
                </div>
              </div>

              <div className="w-px h-8 bg-gray-100"></div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                  <FiClock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ETA</p>
                  <p className="text-sm font-black text-gray-800">{duration}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full h-full">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          defaultCenter={defaultCenter}
          defaultZoom={14}
          onLoad={map => {
            setMap(map);
            map.setTilt(0);
          }}
          onDragStart={() => setIsAutoCenter(false)}
          onZoomChanged={() => {
            // Only disable if it's a programmatic zoom check is complicated, 
            // but usually we want to stop auto-centering if user zooms.
            // However, fitBounds triggers zoom changed. So we check user interaction.
          }}
          options={mapOptions}
          onHeadingChanged={() => {
            if (map && isAutoCenter) {
              const h = map.getHeading();
              if (Math.abs(h - heading) > 10) {
                // User manually rotated more than 10 degrees
                setIsAutoCenter(false);
              }
            }
          }}
          onTiltChanged={() => {
            if (map && isAutoCenter) {
              const t = map.getTilt();
              if (t !== 45 && t !== 0) {
                setIsAutoCenter(false);
              }
            }
          }}
        >
          {currentLocation ? (
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
              {routePath.length > 1 && (
                <PolylineF
                  path={routePath}
                  options={{
                    strokeColor: "#0F766E",
                    strokeWeight: 8,
                    strokeOpacity: 1,
                    zIndex: 50
                  }}
                />
              )}              {riderMarker}
            </>
          ) : (
            // Fallback when rider location is not yet available
            <>
              {routePath.length > 1 && (
                <PolylineF
                  path={routePath}
                  options={{
                    strokeColor: "#0F766E",
                    strokeWeight: 8,
                    strokeOpacity: 1,
                    zIndex: 50
                  }}
                />
              )}
              <OverlayView
                position={coords || defaultCenter}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 flex flex-col items-center">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-teal-100 flex items-center gap-3 animate-bounce-slow">
                    <div className="w-3 h-3 bg-teal-500 rounded-full animate-ping"></div>
                    <span className="text-xs font-bold text-gray-700">Waiting for rider location...</span>
                  </div>
                </div>
              </OverlayView>
            </>
          )}

          {destinationMarker}
        </GoogleMap>



        {/* Full Screen Toggle */}
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="absolute top-24 right-4 p-4 rounded-full shadow-2xl transition-all active:scale-90 z-20 bg-white text-gray-700 hover:bg-gray-50"
          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
        >
          {isFullScreen ? <FiMinimize className="w-6 h-6" /> : <FiMaximize className="w-6 h-6" />}
        </button>

        {/* Recenter Button */}
        <button
          onClick={() => {
            setIsAutoCenter(true);
            if (map && currentLocation) {
              map.panTo(currentLocation);
              map.setZoom(16);
            }
          }}
          className={`absolute top-40 right-4 p-4 rounded-full shadow-2xl transition-all active:scale-90 z-20 ${isAutoCenter ? 'bg-teal-600 text-white animate-pulse' : 'bg-white text-gray-700'}`}
          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
        >
          <FiCrosshair className="w-6 h-6" />
        </button>

        {/* Recenter Button */}

      </div>

      {/* Bottom Status Card */}
      <div className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl sm:rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-20 p-3.5 sm:p-5 pb-5 max-h-[75vh] sm:max-h-[62vh] overflow-y-auto custom-scrollbar transition-transform duration-300 ${isFullScreen ? 'translate-y-full' : ''}`}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2.5"></div>

        {/* Status & Distance Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-xs font-semibold text-teal-600 mb-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              {booking?.status?.toLowerCase() === 'work_done'
                ? 'Work Completed'
                : booking?.status?.toLowerCase() === 'in_progress'
                  ? 'Work In Progress'
                  : booking?.status?.toLowerCase() === 'visited'
                    ? 'Partner At Location'
                    : duration ? `Arriving in ${duration}` : 'Tracking active'}
            </p>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight">
              {booking?.status?.toLowerCase() === 'work_done'
                ? 'Service Completed'
                : booking?.status?.toLowerCase() === 'in_progress'
                  ? 'Service Ongoing'
                  : booking?.status?.toLowerCase() === 'visited'
                    ? 'Professional Arrived'
                    : 'On the way'}
            </h2>
          </div>
          {distance && ['journey_started', 'assigned', 'confirmed'].includes(booking?.status?.toLowerCase()) && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Distance</p>
              <p className="text-sm sm:text-base font-black text-gray-800">
                {distance}
              </p>
            </div>
          )}
        </div>

        {/* Address Info */}
        <div className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2.5 mb-2.5 border border-gray-100">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-xs text-teal-600 border border-gray-100 shrink-0">
            <FiMapPin className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-xs leading-none mb-0.5">Your Location</h3>
            <p className="text-[11px] text-gray-500 truncate leading-snug">
              {(() => {
                const addr = booking?.address;
                if (!addr) return 'Loading destination...';
                if (typeof addr === 'string') return addr;
                return `${addr.addressLine1 || ''}, ${addr.city || ''} ${addr.pincode || ''}`;
              })()}
            </p>
          </div>
        </div>

        {/* Arrival OTP Display */}
        {(booking?.visitOtp || booking?.arrivalOTP) && ['confirmed', 'assigned', 'journey_started'].includes(booking?.status?.toLowerCase()) && (
          <div className="mb-2.5 relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 shadow-md">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-xl"></div>
            <div className="relative z-10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0">
                  <FiKey className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-blue-100 uppercase tracking-wider">Start Code</p>
                  <p className="text-xl font-black text-white tracking-[0.15em] leading-none mt-0.5">
                    {booking?.visitOtp || booking?.arrivalOTP}
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                <p className="text-[9px] text-blue-50 font-medium whitespace-nowrap">Waiting for arrival</p>
              </div>
            </div>
          </div>
        )}

        {/* Professional Arrived Notification */}
        {booking?.status?.toLowerCase() === 'visited' && !(booking.arrivalOTP || booking.visitOtp) && (
          <div className="mb-2.5 relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 p-2.5 shadow-md flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shrink-0">
              <FiCheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Professional Arrived</h3>
              <p className="text-[10px] text-teal-50">Expert is starting the work now.</p>
            </div>
          </div>
        )}

        {/* Waiting for Vendor to initiate Payment (not applicable to already-prepaid online bookings) */}
        {!isPrepaidOnline && !booking?.customerConfirmationOTP && booking?.status?.toLowerCase() === 'work_done' && !booking?.cashCollected && (
          <div className="bg-teal-50/50 rounded-xl p-2.5 border border-teal-100 mb-2.5 flex items-center gap-2.5 relative overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-teal-100 shadow-2xs">
              <FiLoader className="w-4 h-4 text-teal-600 animate-spin" />
            </div>
            <div className="relative z-10 flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-xs">Finalizing Bill</h3>
              <p className="text-[10px] text-gray-500 truncate">Professional is finalizing payment details. Please wait...</p>
            </div>
          </div>
        )}

        {/* Final Payment Card - Show when work is done AND bill is finalized (OTP exists) */}
        {!isPrepaidOnline && (booking?.customerConfirmationOTP || booking?.paymentStatus === 'success') && booking?.status?.toLowerCase() === 'work_done' && !booking?.cashCollected && (
          <div
            onClick={() => setShowPaymentModal(true)}
            className={`mb-2.5 relative overflow-hidden rounded-xl p-3 shadow-md cursor-pointer active:scale-[0.98] transition-all ${booking?.paymentStatus === 'success'
                ? 'bg-gradient-to-br from-green-500 to-emerald-700'
                : 'bg-gradient-to-br from-orange-500 to-red-600'
              }`}
          >
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2.5 w-full mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  {booking?.paymentStatus === 'success' ? (
                    <FiCheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <FiDollarSign className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-white/80 uppercase tracking-widest leading-none">
                    {booking?.paymentStatus === 'success' ? 'Payment Received' : 'Final Payment'}
                  </p>
                  <p className="text-white text-xs font-bold mt-0.5 truncate">
                    {booking?.paymentStatus === 'success' ? 'Verified Successfully' : `Service amount: ₹${(booking?.finalAmount || 0).toLocaleString()}`}
                  </p>
                </div>
              </div>

              {booking?.paymentStatus !== 'success' ? (
                <>
                  <button
                    onClick={handleOnlinePayment}
                    className="w-full py-2.5 bg-white text-orange-600 rounded-lg font-black text-xs shadow-md hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FiDollarSign className="w-3.5 h-3.5" /> Pay Online Now
                  </button>

                  <div className="mt-2.5 flex flex-col items-center w-full">
                    <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider mb-1.5">Payment Verification OTP</p>
                    <div className="flex justify-center gap-2">
                      {String(booking?.customerConfirmationOTP || booking?.paymentOtp || '0000').split('').map((digit, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-9 bg-white/15 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20 shadow-xs"
                        >
                          <span className="text-base font-black text-white">{digit}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[9px] text-white/80 text-center font-medium bg-black/10 px-3 py-1 rounded-full">
                      Share with professional to confirm cash payment
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full py-2.5 bg-white/10 backdrop-blur-md text-white rounded-lg font-bold text-xs border border-white/20 flex items-center justify-center gap-1.5">
                  <FiCheckCircle className="w-3.5 h-3.5 text-green-200" /> Booking Completed
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agent / Provider Info */}
        {(provider?._id || provider?.id) && (
          <div className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2.5 border border-gray-100">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-xs overflow-hidden relative shrink-0">
              {(provider.profileImage || provider.profilePhoto) ? (
                <>
                  <img
                    src={toAssetUrl(provider.profileImage || provider.profilePhoto)}
                    alt="Agent"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.fallback-icon').style.display = 'block'; }}
                  />
                  <FiUser className="w-5 h-5 text-gray-400 fallback-icon hidden absolute" />
                </>
              ) : (
                <FiUser className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-xs sm:text-sm">
                {provider.name || 'Service Partner'}
              </h3>
              <div className="flex items-center gap-1 text-yellow-500">
                <FiStar className="w-3 h-3 fill-current" />
                <span className="text-xs font-bold text-gray-700">4.8</span>
                <span className="text-[10px] text-gray-400 truncate">• Verified Professional</span>
              </div>
            </div>

            {/* Call Button */}
            {provider.phone && (
              <a
                href={`tel:${provider.phone}`}
                className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                title="Call Partner"
              >
                <FiPhone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>


      <PaymentVerificationModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        booking={booking}
        onPayOnline={handleOnlinePayment}
      />
    </div>
  );
};

export default BookingTrack;

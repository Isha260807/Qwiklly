// Socket.io initialization
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

let io = null;
const ADMIN_SOCKET_ROLES = new Set(['ADMIN', 'admin', 'super_admin', 'sub_admin']);
const TRACKING_JOIN_STATUSES = new Set(['assigned', 'journey_started', 'visited', 'in_progress']);
const TRACKING_UPDATE_STATUSES = new Set(['journey_started', 'visited', 'in_progress']);
const latestLocationTimestamps = new Map();

const parseCoordinate = (value, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};

const normalizeRouteSnapshot = (snapshot) => {
  if (!snapshot || !Array.isArray(snapshot.path) || snapshot.path.length < 2 || snapshot.path.length > 2500) return null;
  const path = snapshot.path.map(point => ({
    lat: parseCoordinate(point?.lat, -90, 90),
    lng: parseCoordinate(point?.lng, -180, 180)
  }));
  if (path.some(point => point.lat === null || point.lng === null)) return null;

  return {
    path,
    distanceText: typeof snapshot.distanceText === 'string' ? snapshot.distanceText.slice(0, 40) : '',
    distanceValue: Math.max(0, Number(snapshot.distanceValue) || 0),
    durationText: typeof snapshot.durationText === 'string' ? snapshot.durationText.slice(0, 40) : '',
    durationValue: Math.max(0, Number(snapshot.durationValue) || 0),
    origin: snapshot.origin ? {
      lat: parseCoordinate(snapshot.origin.lat, -90, 90),
      lng: parseCoordinate(snapshot.origin.lng, -180, 180)
    } : null,
    destination: snapshot.destination ? {
      lat: parseCoordinate(snapshot.destination.lat, -90, 90),
      lng: parseCoordinate(snapshot.destination.lng, -180, 180)
    } : null,
    timestamp: Date.now()
  };
};

const getAuthorizedTrackingBooking = async (socket, bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) return null;
  const booking = await Booking.findById(bookingId)
    .select('userId vendorId workerId status')
    .lean();
  if (!booking) return null;

  const role = String(socket.userRole || '').toUpperCase();
  const userId = String(socket.userId);
  const isUser = role === 'USER' && String(booking.userId) === userId;
  const isVendor = role === 'VENDOR' && String(booking.vendorId || '') === userId;
  const isWorker = role === 'WORKER' && String(booking.workerId || '') === userId;
  if (!isUser && !isVendor && !isWorker) return null;
  if (!TRACKING_JOIN_STATUSES.has(String(booking.status || '').toLowerCase())) return null;
  return booking;
};

const initializeSocket = (server) => {
  io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean),
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket']
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token using the same method as HTTP middleware
      const { verifyAccessToken } = require('../utils/tokenService');
      const decoded = verifyAccessToken(token);

      if (ADMIN_SOCKET_ROLES.has(String(decoded.role))) {
        const Admin = require('../models/Admin');
        const admin = await Admin.findById(decoded.userId).select('isActive isDeleted').lean();
        if (!admin) return next(new Error('ADMIN_NOT_FOUND'));
        if (admin.isDeleted) return next(new Error('ADMIN_DELETED'));
        if (!admin.isActive) return next(new Error('ADMIN_BLOCKED'));
      }

      if (String(decoded.role).toUpperCase() === 'VENDOR') {
        const Vendor = require('../models/Vendor');
        const vendor = await Vendor.findById(decoded.userId)
          .select('loginSessionId isActive approvalStatus')
          .lean();
        if (!vendor) return next(new Error('VENDOR_NOT_FOUND'));
        if (!vendor.isActive || ['rejected', 'suspended'].includes(vendor.approvalStatus)) {
          return next(new Error('VENDOR_BLOCKED'));
        }
        if (!decoded.loginSessionId || !vendor.loginSessionId || vendor.loginSessionId !== decoded.loginSessionId) {
          return next(new Error('VENDOR_SESSION_REPLACED'));
        }
      }

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.loginSessionId = decoded.loginSessionId || null;

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`);

    // Join user-specific room for notifications
    if (socket.userRole === 'USER') {
      socket.join(`user_${socket.userId.toString()}`);
    } else if (socket.userRole === 'VENDOR') {
      socket.join(`vendor_${socket.userId.toString()}`);
      // Update vendor online status
      updateVendorOnlineStatus(socket.userId, true, socket.id, socket.loginSessionId);
    } else if (socket.userRole === 'WORKER') {
      socket.join(`worker_${socket.userId.toString()}`);
      // Update worker online status
      updateWorkerOnlineStatus(socket.userId, true, socket.id);
    } else if (ADMIN_SOCKET_ROLES.has(String(socket.userRole))) {
      socket.join(`admin_${socket.userId.toString()}`);
      socket.join('admin_room');
      socket.join('admins');
      console.log(`Socket ${socket.id} (Admin) joined admin_room and admins`);
    }

    // Explicit Room Join Events (Fallback/Frontend Initiated)
    socket.on('join_admin_room', () => {
      if (ADMIN_SOCKET_ROLES.has(String(socket.userRole))) {
        socket.join('admin_room');
        socket.join('admins');
        console.log(`Socket ${socket.id} explicitly joined admin_room`);
      }
    });

    socket.on('join_vendor_room', (vendorId) => {
      // Security check: ensure the socket user actually IS this vendor
      if (socket.userRole === 'VENDOR' && socket.userId.toString() === vendorId.toString()) {
        socket.join(`vendor_${vendorId.toString()}`);
        console.log(`Socket ${socket.id} explicitly joined room vendor_${vendorId}`);
      }
    });

    socket.on('join_user_room', (userId) => {
      // Ensure strings for comparison
      if (socket.userRole === 'USER' && socket.userId.toString() === userId.toString()) {
        socket.join(`user_${userId.toString()}`);
        console.log(`Socket ${socket.id} explicitly joined room user_${userId}`);
      }
    });

    socket.on('join_worker_room', (workerId) => {
      if (socket.userRole === 'WORKER' && socket.userId === workerId) {
        socket.join(`worker_${workerId}`);
        console.log(`Socket ${socket.id} explicitly joined room worker_${workerId}`);
      }
    });

    // Live Tracking Events
    socket.trackingBookings = new Map();

    socket.on('join_tracking', async (bookingId) => {
      const normalizedBookingId = String(bookingId || '');
      try {
        const booking = await getAuthorizedTrackingBooking(socket, normalizedBookingId);
        if (!booking) {
          socket.emit('tracking_error', { bookingId: normalizedBookingId, message: 'Tracking is not available for this booking.' });
          return;
        }

        socket.join(`booking_${normalizedBookingId}`);
        socket.trackingBookings.set(normalizedBookingId, {
          status: String(booking.status).toLowerCase(),
          checkedAt: Date.now()
        });
        console.log(`User ${socket.userId} joined tracking for booking_${normalizedBookingId}`);

        try {
          const { getLiveLocation, getLiveRoute } = require('../services/redisService');
          const [cachedLocation, cachedRoute] = await Promise.all([
            getLiveLocation(normalizedBookingId),
            getLiveRoute(normalizedBookingId)
          ]);
          if (cachedLocation || cachedRoute) {
            socket.emit('live_location_update', {
              ...(cachedLocation || {}),
              bookingId: normalizedBookingId,
              routeSnapshot: cachedRoute || null
            });
            console.log(`[Socket] Sent cached tracking state for booking ${normalizedBookingId}`);
          }
        } catch (error) {
          console.error('[Socket] Error fetching cached tracking state:', error);
        }
      } catch (error) {
        console.error('[Socket] Tracking join error:', error);
        socket.emit('tracking_error', { bookingId: normalizedBookingId, message: 'Unable to start tracking.' });
      }
    });
    // Vendor acknowledges receiving booking alert
    socket.on('booking_alert_received', async (data) => {
      try {
        const BookingRequest = require('../models/BookingRequest');
        await BookingRequest.findOneAndUpdate(
          { bookingId: data.bookingId, vendorId: socket.userId },
          { status: 'VIEWED', viewedAt: new Date(), socketDelivered: true }
        );
        console.log(`[Socket] Vendor ${socket.userId} viewed booking ${data.bookingId}`);
      } catch (error) {
        console.error('[Socket] Error updating booking request:', error);
      }
    });

    // Vendor sets availability
    socket.on('set_availability', async (data) => {
      try {
        const Vendor = require('../models/Vendor');

        if (socket.userRole === 'VENDOR') {
          await Vendor.findByIdAndUpdate(socket.userId, {
            availability: data.status // 'AVAILABLE', 'BUSY', etc.
          });
        }
        console.log(`[Socket] ${socket.userRole} ${socket.userId} set availability to ${data.status}`);
      } catch (error) {
        console.error('[Socket] Error setting availability:', error);
      }
    });

    // Rate limiting map for location updates
    const locationUpdateTimestamps = new Map();

    socket.on('update_location', async (data) => {
      const bookingId = String(data?.bookingId || '');
      const role = String(socket.userRole || '').toUpperCase();
      if (!bookingId || !['VENDOR', 'WORKER'].includes(role)) return;
      const lat = parseCoordinate(data.lat, -90, 90);
      const lng = parseCoordinate(data.lng, -180, 180);
      if (lat === null || lng === null) return;
      const now = Date.now();
      const access = socket.trackingBookings.get(bookingId);
      let booking = access && now - access.checkedAt < 15000 ? access : await getAuthorizedTrackingBooking(socket, bookingId);
      if (!booking) return;
      if (!access || now - access.checkedAt >= 15000) socket.trackingBookings.set(bookingId, { status: String(booking.status).toLowerCase(), checkedAt: now });
      if (!TRACKING_UPDATE_STATUSES.has(String(booking.status || access?.status || '').toLowerCase())) return;
      const rateLimitKey = `${socket.userId}:${bookingId}`;
      const lastUpdate = locationUpdateTimestamps.get(rateLimitKey) || 0;
      if (now - lastUpdate < 2000) return;
      locationUpdateTimestamps.set(rateLimitKey, now);
      const clientTimestamp = Number(data.timestamp);
      const candidateTimestamp = Number.isFinite(clientTimestamp) ? Math.min(clientTimestamp, now + 5000) : now;
      const previousTimestamp = latestLocationTimestamps.get(bookingId) || 0;
      if (candidateTimestamp <= previousTimestamp) return;
      latestLocationTimestamps.set(bookingId, candidateTimestamp);
      const accuracy = Number(data.accuracy);
      const routeSnapshot = normalizeRouteSnapshot(data.routeSnapshot);
      const locationPayload = { bookingId, lat, lng, heading: Number.isFinite(Number(data.heading)) ? Number(data.heading) : 0, accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null, timestamp: now, gpsTimestamp: candidateTimestamp };
      if (routeSnapshot) {
        locationPayload.routeSnapshot = routeSnapshot;
        const { setLiveRoute } = require('../services/redisService');
        await setLiveRoute(bookingId, routeSnapshot, 300);
      }
      socket.to(`booking_${bookingId}`).emit('live_location_update', locationPayload);
      try {
        const { setLiveLocation, setVendorLocation } = require('../services/redisService');
        await setLiveLocation(bookingId, locationPayload, 30);
        if (role === 'VENDOR') await setVendorLocation(socket.userId, lat, lng);
      } catch (error) { console.error('[Socket] Error caching live location:', error); }
      try {
        const Vendor = require('../models/Vendor');
        if (role === 'VENDOR') await Vendor.findByIdAndUpdate(socket.userId, { location: { lat, lng, heading: locationPayload.heading, updatedAt: new Date(now) }, geoLocation: { type: 'Point', coordinates: [lng, lat] } });
      } catch (error) { console.error('Error saving live location:', error); }
    });    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Update online status
      if (socket.userRole === 'VENDOR') {
        updateVendorOnlineStatus(socket.userId, false, socket.id, socket.loginSessionId);
      }
    });
  });

  console.log('Socket.io initialized successfully');
};

// Helper function to update vendor online status
const updateVendorOnlineStatus = async (vendorId, isOnline, socketId, sessionId = null) => {
  try {
    const Vendor = require('../models/Vendor');
    const { setVendorPresence } = require('../services/vendorPresenceService');
    const { setVendorOnline, setVendorAvailability } = require('../services/redisService');

    const current = await Vendor.findById(vendorId)
      .select('currentZoneIds loginSessionId currentSocketId')
      .lean();
    if (!current) return;

    // A socket from a replaced login must not update presence or socket state.
    if (sessionId && current.loginSessionId !== sessionId) return;

    if (isOnline) {
      // Zone gate: a vendor whose last GPS sync placed them outside all of
      // their assigned zones must not be auto-marked online on connect.
      const inAssignedZone = Array.isArray(current.currentZoneIds) && current.currentZoneIds.length > 0;
      if (!inAssignedZone) {
        const vendorFilter = sessionId
          ? { _id: vendorId, loginSessionId: sessionId }
          : { _id: vendorId };
        await Vendor.findOneAndUpdate(vendorFilter, { $set: { currentSocketId: socketId } });
        console.log('[Socket] Vendor ' + vendorId + ' connected but is outside assigned zones - kept OFFLINE');
        return;
      }
    }
    const presence = await setVendorPresence({
      vendorId,
      isOnline,
      source: isOnline ? 'socket_connect' : 'socket_disconnect',
      eventId: 'socket:' + (isOnline ? 'connect' : 'disconnect') + ':' + (socketId || 'unknown'),
      socketId,
      sessionId
    });

    // Update Redis cache (fast lookup)
    await setVendorOnline(vendorId, presence.isOnline);
    await setVendorAvailability(vendorId, presence.availability);

    console.log(`[Socket] Vendor ${vendorId} is now ${presence.isOnline ? 'ONLINE' : 'OFFLINE'}`);
  } catch (error) {
    console.error('[Socket] Error updating vendor online status:', error);
  }
};

// Get io instance for emitting notifications
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };


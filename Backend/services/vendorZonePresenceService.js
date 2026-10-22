const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const Booking = require('../models/Booking');
const { BOOKING_STATUS } = require('../utils/constants');

/**
 * Vendor Zone Presence Service
 *
 * Single source of truth for "which of my ASSIGNED zones am I physically in
 * right now" for a vendor, based on live GPS sent by the vendor app.
 *
 * Rules:
 *  - A vendor may only be online / receive bookings while their live GPS is
 *    inside at least one zone that is (a) assigned to them (vendor.zoneIds)
 *    and (b) active.
 *  - Leaving all assigned zones auto-switches an IDLE vendor offline.
 *  - A vendor on an active job (en route / on site) is NEVER auto-offlined -
 *    the job must not be disrupted.
 *  - GPS jitter at boundaries is debounced: a vendor is only auto-offlined
 *    after EXIT_STRIKES_REQUIRED consecutive out-of-zone readings (unless the
 *    previous reading is stale, in which case we act immediately).
 *  - Returning to a zone does NOT auto-online the vendor; it only re-enables
 *    the toggle (vendor may be on a break).
 */

const EXIT_STRIKES_REQUIRED = 2;
// A previous sync older than this is considered stale (app was closed /
// backgrounded) - debounce is skipped and the new reading is trusted.
const STALE_SYNC_MS = 3 * 60 * 1000;
// Readings worse than this (metres) are too imprecise to auto-offline on.
const MAX_TRUSTED_ACCURACY_M = 1000;

// Booking statuses where the vendor is physically travelling to / working at
// the customer location. Scheduled-but-not-started bookings are NOT included
// so a future booking cannot block auto-offline forever.
const ON_JOB_BOOKING_STATUSES = [
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.WORK_DONE
];

const PRESENCE_REASONS = {
  NO_ZONE_ASSIGNED: 'NO_ZONE_ASSIGNED',
  OUTSIDE_ASSIGNED_ZONE: 'OUTSIDE_ASSIGNED_ZONE',
  LOCATION_REQUIRED: 'LOCATION_REQUIRED',
  INVALID_LOCATION: 'INVALID_LOCATION'
};

const isValidCoord = (lat, lng) =>
  typeof lat === 'number' && typeof lng === 'number' &&
  !Number.isNaN(lat) && !Number.isNaN(lng) &&
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
  !(lat === 0 && lng === 0);

/**
 * All ASSIGNED + ACTIVE zones whose polygon contains the point, ordered most
 * specific first (same ordering as booking zone resolution).
 */
const findAssignedZonesAtPoint = async (assignedZoneIds, lat, lng) => {
  if (!assignedZoneIds || assignedZoneIds.length === 0) return [];

  return Zone.find({
    _id: { $in: assignedZoneIds },
    isActive: true,
    coordinates: {
      $geoIntersects: {
        $geometry: { type: 'Point', coordinates: [lng, lat] }
      }
    }
  })
    .select('_id name')
    .sort({ approxArea: 1, displayOrder: 1, _id: 1 })
    .lean();
};

/**
 * Whether the vendor is currently en route to / working on a job.
 */
const hasActiveJob = async (vendor) => {
  if (vendor.availability === 'ON_JOB' || vendor.availability === 'BUSY') return true;
  const active = await Booking.exists({
    vendorId: vendor._id,
    status: { $in: ON_JOB_BOOKING_STATUSES }
  });
  return Boolean(active);
};

const syncRedisStatus = async (vendorId, isOnline, availability) => {
  try {
    const { setVendorOnline, setVendorAvailability } = require('./redisService');
    await setVendorOnline(vendorId, isOnline);
    await setVendorAvailability(vendorId, availability);
  } catch (err) {
    // Redis is a cache only - never fail the request because of it
    console.error('[ZonePresence] Redis sync error:', err.message);
  }
};

const loadAssignedZones = async (zoneIds) => {
  if (!zoneIds || zoneIds.length === 0) return [];
  return Zone.find({ _id: { $in: zoneIds } }).select('_id name isActive').lean();
};

/**
 * Process a live GPS reading from the vendor app: resolve presence, persist
 * location/presence, and auto-offline when required.
 *
 * @param {string} vendorId
 * @param {{lat:number,lng:number,accuracy?:number}} reading
 * @returns {Promise<Object>} presence payload for the client
 */
const syncVendorLocation = async (vendorId, { lat, lng, accuracy }) => {
  if (!isValidCoord(lat, lng)) {
    const err = new Error('Valid latitude and longitude are required');
    err.statusCode = 400;
    err.reason = PRESENCE_REASONS.INVALID_LOCATION;
    throw err;
  }

  const vendor = await Vendor.findById(vendorId)
    .select('zoneIds isOnline availability currentZoneIds lastLocationSyncAt zoneExitStrikes');
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const { findZoneByLocation } = require('./zoneService');
  const physicalZone = await findZoneByLocation(lat, lng);
  const zonesHere = await findAssignedZonesAtPoint(vendor.zoneIds, lat, lng);
  const isInsideAssignedZone = zonesHere.length > 0;
  const onJob = await hasActiveJob(vendor);

  const update = {
    location: { lat, lng, updatedAt: now },
    geoLocation: { type: 'Point', coordinates: [lng, lat] },
    lastLocationSyncAt: now
  };

  let autoOfflined = false;
  let pendingExit = false;

  if (isInsideAssignedZone) {
    update.currentZoneIds = zonesHere.map(z => z._id);
    update.zoneExitStrikes = 0;
  } else {
    const prevSyncFresh = vendor.lastLocationSyncAt &&
      (now - vendor.lastLocationSyncAt) < STALE_SYNC_MS;
    const lowAccuracy = typeof accuracy === 'number' && accuracy > MAX_TRUSTED_ACCURACY_M;

    // Imprecise reading: don't count it as an exit, keep previous presence.
    const strikes = lowAccuracy ? (vendor.zoneExitStrikes || 0) : (vendor.zoneExitStrikes || 0) + 1;
    const exitConfirmed = !lowAccuracy && (!prevSyncFresh || strikes >= EXIT_STRIKES_REQUIRED);

    update.zoneExitStrikes = strikes;

    if (exitConfirmed) {
      update.currentZoneIds = [];
      // Never disrupt an active job; only idle vendors are switched off.
      if (vendor.isOnline && !onJob) {
        update.isOnline = false;
        update.availability = 'OFFLINE';
        update.lastSeenAt = now;
        autoOfflined = true;
      }
    } else {
      pendingExit = true; // keep current presence until exit is confirmed
    }
  }

  const saved = await Vendor.findByIdAndUpdate(vendorId, { $set: update }, { new: true })
    .select('zoneIds isOnline availability currentZoneIds')
    .lean();

  if (autoOfflined) {
    await syncRedisStatus(vendorId, false, 'OFFLINE');
  }

  // Real-time broadcast to Admin panel
  try {
    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) {
      io.to('admin_room').to('admins').emit('vendor_zone_status_changed', {
        vendorId: saved._id,
        currentZoneIds: saved.currentZoneIds,
        lastLocationSyncAt: saved.lastLocationSyncAt,
        isOnline: saved.isOnline,
        availability: saved.availability,
        isInsideAssignedZone,
        currentZones: zonesHere.map(z => ({ id: z._id, name: z.name }))
      });
    }
  } catch (sockErr) {
    // Non-fatal if socket not ready
  }

  const assignedZones = await loadAssignedZones(saved.zoneIds);
  const hasAssignment = assignedZones.length > 0;
  const assignedName = assignedZones[0]?.name;
  const physicalName = physicalZone?.name;

  let reason = null;
  let customMessage = null;

  if (!hasAssignment) {
    reason = PRESENCE_REASONS.NO_ZONE_ASSIGNED;
    customMessage = 'No service zone assigned to you yet by admin.';
  } else if (!isInsideAssignedZone) {
    reason = PRESENCE_REASONS.OUTSIDE_ASSIGNED_ZONE;
    if (physicalName) {
      customMessage = `You are currently in ${physicalName}. Your assigned zone is ${assignedName || 'different'}. Move to ${assignedName} to receive bookings.`;
    } else {
      customMessage = `You are outside your assigned zone (${assignedName || 'Assigned Zone'}). Move inside to receive bookings.`;
    }
  } else {
    customMessage = `You are inside your assigned zone: ${assignedName || 'Zone'}. Ready for bookings!`;
  }

  return {
    isInsideAssignedZone,
    canGoOnline: isInsideAssignedZone,
    currentZones: zonesHere.map(z => ({ id: z._id, name: z.name })),
    currentPhysicalZone: physicalZone ? { id: physicalZone._id, name: physicalZone.name } : null,
    assignedZones: assignedZones.map(z => ({ id: z._id, name: z.name, isActive: z.isActive })),
    isOnline: saved.isOnline,
    availability: saved.availability,
    onActiveJob: onJob,
    autoOfflined,
    pendingExit,
    reason,
    message: customMessage
  };
};

/**
 * Gate used by the online toggle. Returns { allowed, reason, zones }.
 * Prefers a fresh GPS reading sent with the toggle request; otherwise falls
 * back to the last synced presence if it is recent.
 */
const checkCanGoOnline = async (vendor, { lat, lng } = {}) => {
  if (!vendor.zoneIds || vendor.zoneIds.length === 0) {
    return { allowed: false, reason: PRESENCE_REASONS.NO_ZONE_ASSIGNED, zones: [] };
  }

  if (isValidCoord(lat, lng)) {
    const zones = await findAssignedZonesAtPoint(vendor.zoneIds, lat, lng);
    return {
      allowed: zones.length > 0,
      reason: zones.length > 0 ? null : PRESENCE_REASONS.OUTSIDE_ASSIGNED_ZONE,
      zones,
      freshReading: true
    };
  }

  const fresh = vendor.lastLocationSyncAt &&
    (Date.now() - new Date(vendor.lastLocationSyncAt).getTime()) < STALE_SYNC_MS;
  if (!fresh) {
    return { allowed: false, reason: PRESENCE_REASONS.LOCATION_REQUIRED, zones: [] };
  }

  const inZone = Array.isArray(vendor.currentZoneIds) && vendor.currentZoneIds.length > 0;
  return {
    allowed: inZone,
    reason: inZone ? null : PRESENCE_REASONS.OUTSIDE_ASSIGNED_ZONE,
    zones: []
  };
};

module.exports = {
  PRESENCE_REASONS,
  EXIT_STRIKES_REQUIRED,
  isValidCoord,
  findAssignedZonesAtPoint,
  hasActiveJob,
  syncVendorLocation,
  checkCanGoOnline
};

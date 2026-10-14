const Vendor = require('../models/Vendor');
const VendorAttendance = require('../models/VendorAttendance');
const VendorPresenceEvent = require('../models/VendorPresenceEvent');

const PRESENCE_TIME_ZONE = process.env.APP_TIME_ZONE || 'Asia/Kolkata';
const dateKeyFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: PRESENCE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const getPresenceDateKey = (date = new Date()) => {
  const parts = dateKeyFormatter.formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const buildEventId = ({ vendorId, source, eventId }) => {
  if (eventId) return String(eventId).slice(0, 200);
  return `${source}:${vendorId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
};

const getVendorState = (vendor) => ({
  isOnline: Boolean(vendor?.isOnline),
  availability: vendor?.availability || 'OFFLINE'
});

const savePresenceEvent = async ({
  vendorId,
  eventId,
  source,
  requestedOnline,
  accepted,
  reason,
  effectiveOnline,
  dateKey,
  occurredAt
}) => {
  try {
    await VendorPresenceEvent.create({
      vendorId,
      eventId,
      source,
      requestedOnline,
      accepted,
      reason,
      effectiveOnline,
      dateKey,
      occurredAt
    });
  } catch (error) {
    // A duplicate event is expected when a request/socket retry reuses the
    // same id. All state updates below are idempotent, so this is non-fatal.
    if (error?.code !== 11000) {
      console.error('[VendorPresence] Failed to save event:', error.message);
    }
  }
};

const getExistingEvent = async (vendorId, eventId) => {
  return VendorPresenceEvent.findOne({ vendorId, eventId }).lean();
};

const upsertAttendanceStart = async ({ vendorId, dateKey, now, source }) => {
  const existing = await VendorAttendance.findOne({ vendorId, dateKey })
    .select('firstOnlineAt')
    .lean();

  const set = {
    dayStatus: 'OPEN',
    lastEventAt: now,
    lastEventSource: source
  };
  if (source === 'manual_toggle') {
    set.lastOfflineAt = null;
    set.manualOffAt = null;
    set.endReason = null;
  }
  if (!existing?.firstOnlineAt) set.firstOnlineAt = now;

  return VendorAttendance.findOneAndUpdate(
    { vendorId, dateKey },
    {
      $setOnInsert: { vendorId, dateKey },
      $set: set
    },
    { upsert: true, new: true }
  ).lean();
};

const upsertAttendanceEnd = async ({ vendorId, dateKey, now, source }) => {
  return VendorAttendance.findOneAndUpdate(
    { vendorId, dateKey },
    {
      $setOnInsert: { vendorId, dateKey },
      $set: {
        lastOfflineAt: now,
        manualOffAt: now,
        dayStatus: 'CLOSED',
        endReason: 'MANUAL_TOGGLE',
        lastEventAt: now,
        lastEventSource: source
      }
    },
    { upsert: true, new: true }
  ).lean();
};

/**
 * Centralized vendor presence handler.
 *
 * Login/socket are automatic sources. Only manual OFF closes attendance and
 * sets the same-day lock. A later manual ON explicitly clears that lock.
 */
const setVendorPresence = async ({
  vendorId,
  isOnline,
  source,
  eventId,
  socketId = null
}) => {
  const now = new Date();
  const dateKey = getPresenceDateKey(now);
  const requestedOnline = Boolean(isOnline);
  const normalizedSource = String(source || 'unknown');
  const normalizedEventId = buildEventId({ vendorId, source: normalizedSource, eventId });

  const existingEvent = await getExistingEvent(vendorId, normalizedEventId);
  if (existingEvent) {
    const vendor = await Vendor.findById(vendorId)
      .select('isOnline availability currentSocketId')
      .lean();
    return {
      duplicate: true,
      accepted: existingEvent.accepted,
      ignored: !existingEvent.accepted,
      reason: existingEvent.reason,
      eventId: normalizedEventId,
      ...getVendorState(vendor)
    };
  }

  const vendor = await Vendor.findById(vendorId)
    .select('isOnline availability manualOffDateKey currentSocketId')
    .lean();
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  // A stale socket cannot take a newer socket offline.
  if (
    normalizedSource === 'socket_disconnect' &&
    socketId &&
    vendor.currentSocketId &&
    vendor.currentSocketId !== socketId
  ) {
    const state = getVendorState(vendor);
    await savePresenceEvent({
      vendorId,
      eventId: normalizedEventId,
      source: normalizedSource,
      requestedOnline,
      accepted: false,
      reason: 'STALE_SOCKET',
      effectiveOnline: state.isOnline,
      dateKey,
      occurredAt: now
    });
    return {
      duplicate: false,
      accepted: false,
      ignored: true,
      reason: 'STALE_SOCKET',
      eventId: normalizedEventId,
      ...state
    };
  }

  const isManualOn = normalizedSource === 'manual_toggle' && requestedOnline;
  const isManualOff = normalizedSource === 'manual_toggle' && !requestedOnline;
  const isAutomaticOn = requestedOnline && !isManualOn;
  const isLockedForToday = vendor.manualOffDateKey === dateKey;

  if (isAutomaticOn && isLockedForToday) {
    const state = getVendorState(vendor);
    await savePresenceEvent({
      vendorId,
      eventId: normalizedEventId,
      source: normalizedSource,
      requestedOnline,
      accepted: false,
      reason: 'MANUAL_OFF_LOCK',
      effectiveOnline: state.isOnline,
      dateKey,
      occurredAt: now
    });
    return {
      duplicate: false,
      accepted: false,
      ignored: true,
      reason: 'MANUAL_OFF_LOCK',
      eventId: normalizedEventId,
      ...state
    };
  }

  const update = {
    isOnline: requestedOnline,
    availability: requestedOnline ? 'AVAILABLE' : 'OFFLINE',
    lastSeenAt: now
  };

  if (normalizedSource === 'socket_connect') {
    update.currentSocketId = socketId;
  } else if (normalizedSource === 'socket_disconnect' && socketId === vendor.currentSocketId) {
    update.currentSocketId = null;
  }

  if (isManualOn) {
    update.manualOffDateKey = null;
  }
  if (isManualOff) {
    update.manualOffDateKey = dateKey;
  }

  const savedVendor = await Vendor.findByIdAndUpdate(
    vendorId,
    { $set: update },
    { new: true }
  ).select('isOnline availability currentSocketId');

  const state = getVendorState(savedVendor);
  if (requestedOnline) {
    await upsertAttendanceStart({ vendorId, dateKey, now, source: normalizedSource });
  } else if (isManualOff) {
    // Manual OFF closes attendance even when a socket disconnect already
    // made the live vendor status false.
    await upsertAttendanceEnd({ vendorId, dateKey, now, source: normalizedSource });
  }

  await savePresenceEvent({
    vendorId,
    eventId: normalizedEventId,
    source: normalizedSource,
    requestedOnline,
    accepted: true,
    reason: null,
    effectiveOnline: state.isOnline,
    dateKey,
    occurredAt: now
  });

  return {
    duplicate: false,
    accepted: true,
    ignored: false,
    reason: null,
    eventId: normalizedEventId,
    ...state
  };
};

module.exports = {
  PRESENCE_TIME_ZONE,
  getPresenceDateKey,
  setVendorPresence
};

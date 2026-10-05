const Vendor = require('../models/Vendor');
const Booking = require('../models/Booking');
const VendorSlotAvailability = require('../models/VendorSlotAvailability');
const { calculateDistance } = require('./locationService');
const { VENDOR_STATUS, BOOKING_STATUS, MATCH_FAILURE_REASONS } = require('../utils/constants');

/**
 * Vendor matching is zone-only.
 *
 * A booking's resolved zone is the complete geographic boundary. Vendor
 * coordinates, serviceRadiusKm, global searchRadius and vendor serviceRange
 * must not be used as an eligibility fallback or filter here. The only
 * vendor-side runtime gates are (1) the vendor's live GPS presence inside
 * the booking's zone (currentZoneIds, maintained by
 * vendorZonePresenceService) and (2) whether the vendor is currently online
 * and AVAILABLE to receive a request.
 */

/**
 * Vendors assigned to a zone. zoneIds[] is the sole source of truth for
 * geographic eligibility.
 *
 * @param {Object} zone - resolved Zone document
 * @returns {Promise<string[]>} vendor _id strings assigned to this zone
 */
const findVendorsByZone = async (zone) => {
  if (!zone) return [];

  const vendors = await Vendor.find({ zoneIds: zone._id }).select('_id').lean();
  return vendors.map(v => v._id.toString());
};

/**
 * Approved and active vendors assigned to the resolved zone.
 *
 * The platform currently treats every approved/active vendor as a universal
 * service provider. Service availability is enforced separately through the
 * UserService.zoneIds check in serviceabilityService.
 */
const findServiceVendorsInZone = async (zoneVendorIds, serviceTitle) => {
  if (!zoneVendorIds || zoneVendorIds.length === 0) return [];

  return Vendor.find({
    _id: { $in: zoneVendorIds },
    approvalStatus: VENDOR_STATUS.APPROVED,
    isActive: true
  })
    .select('name businessName phone address location geoLocation isOnline availability rating currentZoneIds')
    .lean();
};

/**
 * Live presence gate: only vendors whose last GPS sync placed them inside
 * this zone. A vendor assigned to several zones only receives bookings for
 * the zone(s) they are physically in right now.
 */
const filterByLivePresence = (vendors, zone) => {
  if (!zone) return [];
  const zoneId = zone._id.toString();
  return vendors.filter(v =>
    Array.isArray(v.currentZoneIds) && v.currentZoneIds.some(id => id.toString() === zoneId)
  );
};

/**
 * Only vendors that can receive a booking request right now are returned.
 * Offline, BUSY, ON_JOB and explicitly OFFLINE vendors are not dispatched.
 */
const filterByAvailability = (vendors) => {
  return vendors.filter(v => v.isOnline === true && v.availability === 'AVAILABLE');
};

/**
 * Zone -> service availability -> vendor availability matching pipeline.
 * Distance/radius is intentionally not part of this function.
 *
 * @param {Object} params
 * @param {Object} params.zone - resolved Zone document
 * @param {string} params.serviceTitle - retained for API compatibility
 * @returns {Promise<{vendors: Array, reason: string|null, debug: Object}>}
 */
const findQualifiedVendors = async ({ zone, serviceTitle }) => {
  const debug = {
    zoneId: zone?._id || null,
    zoneName: zone?.name || null,
    zoneVendors: 0,
    serviceVendors: 0,
    presentInZone: 0,
    online: 0,
    available: 0
  };

  const zoneVendorIds = await findVendorsByZone(zone);
  debug.zoneVendors = zoneVendorIds.length;
  if (zoneVendorIds.length === 0) {
    return { vendors: [], reason: MATCH_FAILURE_REASONS.NO_ZONE_VENDOR, debug };
  }

  const serviceVendors = await findServiceVendorsInZone(zoneVendorIds, serviceTitle);
  debug.serviceVendors = serviceVendors.length;
  if (serviceVendors.length === 0) {
    return { vendors: [], reason: MATCH_FAILURE_REASONS.NO_SERVICE_VENDOR, debug };
  }

  const presentVendors = filterByLivePresence(serviceVendors, zone);
  debug.presentInZone = presentVendors.length;
  debug.online = presentVendors.filter(v => v.isOnline === true).length;
  if (presentVendors.length === 0) {
    return { vendors: [], reason: MATCH_FAILURE_REASONS.NO_VENDOR_IN_ZONE, debug };
  }

  const availableVendors = filterByAvailability(presentVendors);
  debug.available = availableVendors.length;
  if (availableVendors.length === 0) {
    return { vendors: [], reason: MATCH_FAILURE_REASONS.NO_AVAILABLE_VENDOR, debug };
  }

  // Preserve database order. There is deliberately no nearest-first sort.
  return { vendors: availableVendors, reason: null, debug };
};

const SLOT_BLOCKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.AWAITING_PAYMENT,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.WORK_DONE
];

const parseSlotTime = (value) => {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = 0;
    if (meridiem === 'PM') hours += 12;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
};

const getSlotRange = (timeSlot) => {
  const start = parseSlotTime(timeSlot?.start);
  const end = parseSlotTime(timeSlot?.end);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
};

const getUtcDayRange = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const dateKey = date.toISOString().slice(0, 10);
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const toDateKey = (dateValue) => {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const pad2 = (n) => String(n).padStart(2, '0');
const minutesToHHMM = (minutes) => `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;

/**
 * Slots a booking occupies, in whole slot units. Fixed-price services occupy one
 * slot; duration/hourly services occupy as many consecutive slots as their
 * booked duration needs (e.g. 90 min on 60-min slots = 2 slots).
 */
const getSlotSpan = (startMinutes, durationMins, unitMins) => {
  const slotCount = Math.max(1, Math.ceil((Number(durationMins) || 0) / unitMins));
  return {
    slotCount,
    starts: Array.from({ length: slotCount }, (_, i) => startMinutes + i * unitMins),
    range: { start: startMinutes, end: startMinutes + slotCount * unitMins }
  };
};

/**
 * Length (minutes) of the slots admin marked on a vendor-day. New records store
 * it (`slotMinutes`), so later changes to the global slot interval never change
 * what an already-marked slot means. Older records without it fall back to
 * 60 min when every marked slot starts on the hour, otherwise to the current
 * global interval.
 */
const resolveSlotUnit = (doc, markedStarts, fallbackMins) => {
  const stored = Number(doc.slotMinutes);
  if (stored > 0) return stored;
  const starts = [...markedStarts];
  if (starts.length > 0 && starts.every(start => start % 60 === 0)) return 60;
  return fallbackMins || 60;
};

/**
 * Candidate vendors for SLOT bookings: approved/active vendors assigned to the
 * zone. Unlike instant dispatch, live GPS presence and online/AVAILABLE status
 * are NOT required - SLOT availability is decided by the admin-marked
 * VendorSlotAvailability schedule instead.
 */
const findSlotCandidateVendors = async (zone) => {
  const zoneVendorIds = await findVendorsByZone(zone);
  const vendors = await findServiceVendorsInZone(zoneVendorIds);
  // Stable ordering keeps assignment deterministic while the unique booking
  // index still provides the atomic first-wins reservation under concurrency.
  return vendors.sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
};

const rangesOverlap = (a, b) => a.start < b.end && b.start < a.end;

/**
 * Select an assignable vendor for a scheduled/SLOT booking.
 * A vendor qualifies only if admin marked EVERY slot the booking needs (one for
 * fixed-price, several consecutive ones for duration/hourly) for that date AND
 * the vendor has no overlapping active booking. The booking's duration is
 * counted in that vendor's own slot length automatically.
 */
const findAvailableVendorForSlot = async ({ vendors, scheduledDate, timeSlot, durationMins = 0, intervalMins = 60 }) => {
  const requestedStart = parseSlotTime(timeSlot?.start);
  const dayRange = getUtcDayRange(scheduledDate);
  const dateKey = toDateKey(scheduledDate);

  if (requestedStart === null || !dayRange || !dateKey) {
    return { vendor: null, reason: 'INVALID_SLOT' };
  }

  const candidateIds = (vendors || []).map(vendor => vendor._id);
  if (candidateIds.length === 0) {
    return { vendor: null, reason: MATCH_FAILURE_REASONS.NO_AVAILABLE_VENDOR };
  }

  const docs = await VendorSlotAvailability.find({
    vendorId: { $in: candidateIds },
    date: dateKey
  }).select('vendorId slots slotMinutes').lean();

  const markedByVendor = new Map();
  docs.forEach(doc => {
    const starts = new Set((doc.slots || []).map(parseSlotTime).filter(value => value !== null));
    markedByVendor.set(doc.vendorId.toString(), { starts, unit: resolveSlotUnit(doc, starts, intervalMins) });
  });

  // Candidates that have every needed slot marked, each with its own span
  const qualified = [];
  vendors.forEach(vendor => {
    const marked = markedByVendor.get(vendor._id.toString());
    if (!marked) return;
    const span = getSlotSpan(requestedStart, durationMins, marked.unit);
    if (span.starts.every(start => marked.starts.has(start))) qualified.push({ vendor, span });
  });

  if (qualified.length === 0) {
    return { vendor: null, reason: MATCH_FAILURE_REASONS.NO_AVAILABLE_VENDOR };
  }

  const existingBookings = await Booking.find({
    vendorId: { $in: qualified.map(item => item.vendor._id) },
    scheduledDate: { $gte: dayRange.start, $lt: dayRange.end },
    status: { $in: SLOT_BLOCKING_STATUSES }
  }).select('vendorId timeSlot').lean();

  const bookedByVendor = new Map();
  existingBookings.forEach(booking => {
    const key = booking.vendorId.toString();
    if (!bookedByVendor.has(key)) bookedByVendor.set(key, []);
    // An existing active booking without a parseable slot is safest treated as
    // blocking the vendor for that day rather than risking an overlap.
    bookedByVendor.get(key).push(getSlotRange(booking.timeSlot) || { start: 0, end: 24 * 60 });
  });

  const match = qualified.find(({ vendor, span }) => {
    const booked = bookedByVendor.get(vendor._id.toString()) || [];
    return !booked.some(existing => rangesOverlap(span.range, existing));
  });

  return match
    ? { vendor: match.vendor, reason: null, slotEnd: minutesToHHMM(match.span.range.end) }
    : { vendor: null, reason: MATCH_FAILURE_REASONS.NO_AVAILABLE_VENDOR };
};

/**
 * Bookable slot starts ("HH:MM") per date for the given date keys: a start is
 * bookable when at least one candidate vendor has every slot the booking needs
 * marked by admin and no overlapping active booking. Returns
 * { 'YYYY-MM-DD': ['09:00', ...] } and omits dates with no bookable start.
 */
const getBookableSlotMap = async ({ vendors, dateKeys, intervalMins = 60, durationMins = 0 }) => {
  const candidateIds = (vendors || []).map(vendor => vendor._id);
  if (candidateIds.length === 0 || !dateKeys || dateKeys.length === 0) return {};

  const sortedKeys = [...dateKeys].sort();
  const rangeStart = new Date(`${sortedKeys[0]}T00:00:00.000Z`);
  const rangeEnd = new Date(`${sortedKeys[sortedKeys.length - 1]}T00:00:00.000Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const docs = await VendorSlotAvailability.find({
    vendorId: { $in: candidateIds },
    date: { $in: dateKeys }
  }).select('vendorId date slots slotMinutes').lean();
  if (docs.length === 0) return {};

  const bookings = await Booking.find({
    vendorId: { $in: candidateIds },
    scheduledDate: { $gte: rangeStart, $lt: rangeEnd },
    status: { $in: SLOT_BLOCKING_STATUSES }
  }).select('vendorId scheduledDate timeSlot').lean();

  const bookedRanges = new Map(); // `${vendorId}|${dateKey}` -> ranges[]
  bookings.forEach(booking => {
    const key = `${booking.vendorId}|${booking.scheduledDate.toISOString().slice(0, 10)}`;
    if (!bookedRanges.has(key)) bookedRanges.set(key, []);
    // Unparseable slot blocks the whole day for that vendor.
    bookedRanges.get(key).push(getSlotRange(booking.timeSlot) || { start: 0, end: 24 * 60 });
  });

  const byDate = {}; // dateKey -> Set<start minutes>
  docs.forEach(doc => {
    const markedStarts = new Set((doc.slots || []).map(parseSlotTime).filter(start => start !== null));
    const unit = resolveSlotUnit(doc, markedStarts, intervalMins);
    const booked = bookedRanges.get(`${doc.vendorId}|${doc.date}`) || [];
    markedStarts.forEach(start => {
      const span = getSlotSpan(start, durationMins, unit);
      if (!span.starts.every(s => markedStarts.has(s))) return;
      if (booked.some(existing => rangesOverlap(span.range, existing))) return;
      if (!byDate[doc.date]) byDate[doc.date] = new Set();
      byDate[doc.date].add(start);
    });
  });

  const result = {};
  Object.entries(byDate).forEach(([dateKey, starts]) => {
    result[dateKey] = [...starts].sort((x, y) => x - y).map(minutesToHHMM);
  });
  return result;
};

module.exports = {
  findVendorsByZone,
  findServiceVendorsInZone,
  filterByLivePresence,
  filterByAvailability,
  findQualifiedVendors,
  findAvailableVendorForSlot,
  findSlotCandidateVendors,
  getBookableSlotMap,
  parseSlotTime
};

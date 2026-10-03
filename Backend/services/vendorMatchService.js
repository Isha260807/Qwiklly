const Vendor = require('../models/Vendor');
const { VENDOR_STATUS, MATCH_FAILURE_REASONS } = require('../utils/constants');

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

module.exports = {
  findVendorsByZone,
  findServiceVendorsInZone,
  filterByLivePresence,
  filterByAvailability,
  findQualifiedVendors
};

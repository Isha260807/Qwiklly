const Vendor = require('../models/Vendor');
const { calculateDistance } = require('./locationService');
const { VENDOR_STATUS } = require('../utils/constants');

/**
 * Vendor Match Service
 * Zone assignment (WHO can serve this area) + radius (HOW CLOSE they must be)
 * are two separate filters and must both pass. Never skip the zone filter,
 * and never substitute it with radius alone.
 *
 * Matching order (do not reorder): zone assignment -> service offered ->
 * radius -> online -> availability. Booking/time-slot conflicts and
 * wave-based dispatch are handled downstream by bookingScheduler/BookingRequest.
 */

/**
 * Vendors assigned to a zone. zoneIds[] is the sole source of truth - a
 * vendor with no zoneIds assigned simply isn't eligible for zone-scoped
 * matching until an admin assigns them (see PATCH /api/admin/vendors/:id/zones).
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
 * Vendors from a given id set who are approved/active and offer the service
 * (free-text match against categories/service/skills, same convention as
 * locationService._buildVendorQuery). Radius/online/availability NOT applied yet.
 */
const findServiceVendorsInZone = async (zoneVendorIds, serviceTitle) => {
  if (!zoneVendorIds || zoneVendorIds.length === 0) return [];

  const query = {
    _id: { $in: zoneVendorIds },
    approvalStatus: VENDOR_STATUS.APPROVED,
    isActive: true
  };

  if (serviceTitle) {
    const escaped = serviceTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(escaped, 'i');
    query.$or = [
      { categories: { $in: [serviceTitle] } },
      { service: { $in: [serviceTitle] } },
      { categories: { $regex: reg } },
      { service: { $regex: reg } },
      { skills: { $regex: reg } }
    ];
  }

  return Vendor.find(query)
    .select('name businessName phone address location geoLocation settings isOnline availability rating')
    .lean();
};

/**
 * Distance is ALWAYS measured from the user's booking coordinates to the
 * vendor's coordinates - never from the zone center/boundary. A vendor's
 * own serviceRange further caps the effective radius (they won't travel
 * further than their own configured range either).
 */
const filterByRadius = (vendors, location, radiusKm) => {
  return vendors
    .map(v => {
      const vLat = v.geoLocation?.coordinates?.[1] || v.location?.lat || v.address?.lat;
      const vLng = v.geoLocation?.coordinates?.[0] || v.location?.lng || v.address?.lng;
      if (typeof vLat !== 'number' || typeof vLng !== 'number') {
        return { ...v, distance: null };
      }
      const distance = calculateDistance(location, { lat: vLat, lng: vLng });
      return { ...v, distance };
    })
    .filter(v => {
      if (v.distance === null) return false;
      const effectiveRadius = Math.min(radiusKm, v.settings?.serviceRange || radiusKm);
      return v.distance <= effectiveRadius;
    });
};

/**
 * Full zone -> service -> radius vendor matching pipeline. Returns every
 * approved/active vendor assigned to the zone, offering the service, and
 * within radius of the booking location - regardless of online/availability
 * status. That broader set becomes the booking's `potentialVendors` pool,
 * exactly like the pre-zone implementation did (vendors get notified and can
 * still come online within the wave-dispatch search window).
 *
 * `reason` is only set when NO candidate survives zone/service/radius
 * filtering at all (a deterministic "cannot possibly dispatch" case) - it is
 * never set just because everyone happens to be offline/busy right now.
 * `debug.online`/`debug.available` are diagnostic-only counts for the admin
 * pending-booking view (section 26 of the spec).
 *
 * @param {Object} params
 * @param {Object} params.zone - resolved Zone document
 * @param {string} params.serviceTitle - service title used for free-text vendor service match
 * @param {{lat:number,lng:number}} params.location - user's booking coordinates
 * @param {number} params.radiusKm - configured matching radius
 * @returns {Promise<{vendors: Array, reason: string|null, debug: Object}>}
 */
const findQualifiedVendors = async ({ zone, serviceTitle, location, radiusKm }) => {
  const debug = {
    zoneId: zone?._id || null,
    zoneName: zone?.name || null,
    radiusKm,
    zoneVendors: 0,
    serviceVendors: 0,
    withinRadius: 0,
    online: 0,
    available: 0
  };

  const zoneVendorIds = await findVendorsByZone(zone);
  debug.zoneVendors = zoneVendorIds.length;
  if (zoneVendorIds.length === 0) {
    return { vendors: [], reason: 'NO_ZONE_VENDOR', debug };
  }

  const serviceVendors = await findServiceVendorsInZone(zoneVendorIds, serviceTitle);
  debug.serviceVendors = serviceVendors.length;
  if (serviceVendors.length === 0) {
    return { vendors: [], reason: 'NO_SERVICE_VENDOR', debug };
  }

  const withinRadius = filterByRadius(serviceVendors, location, radiusKm);
  debug.withinRadius = withinRadius.length;
  debug.online = withinRadius.filter(v => v.isOnline).length;
  debug.available = withinRadius.filter(v => v.isOnline && v.availability === 'AVAILABLE').length;
  if (withinRadius.length === 0) {
    return { vendors: [], reason: 'NO_VENDOR_WITHIN_RADIUS', debug };
  }

  withinRadius.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return { vendors: withinRadius, reason: null, debug };
};

module.exports = {
  findVendorsByZone,
  findServiceVendorsInZone,
  filterByRadius,
  findQualifiedVendors
};

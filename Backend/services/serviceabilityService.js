const UserService = require('../models/UserService');
const { findZoneByLocation, findNearestZone } = require('./zoneService');
const { findQualifiedVendors } = require('./vendorMatchService');
const { MATCH_FAILURE_REASONS } = require('../utils/constants');

/**
 * Serviceability Service
 * Central, backend-only source of truth for "is this location/service
 * bookable right now, and who can serve it". Never trust zoneId/vendor
 * eligibility/distance/service-availability sent by the client - always
 * recompute here from raw lat/lng.
 */

/**
 * Zone-only serviceability check (no service/vendor matching) - used by the
 * public "resolve zone" endpoint and frontend address-selection flow.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object>} { inZone, zone, reason, nearestZone }
 */
const checkLocationServiceability = async (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { inZone: false, zone: null, reason: MATCH_FAILURE_REASONS.INVALID_LOCATION, nearestZone: null };
  }

  const zone = await findZoneByLocation(lat, lng);

  if (!zone) {
    const nearest = await findNearestZone(lat, lng);
    return {
      inZone: false,
      zone: null,
      reason: MATCH_FAILURE_REASONS.OUT_OF_SERVICE_ZONE,
      nearestZone: nearest ? {
        id: nearest.zone._id,
        name: nearest.zone.name,
        distanceKm: nearest.distanceKm
      } : null
    };
  }

  if (!zone.isActive) {
    return { inZone: false, zone, reason: MATCH_FAILURE_REASONS.ZONE_INACTIVE, nearestZone: null };
  }

  return { inZone: true, zone, reason: null, nearestZone: null };
};

/**
 * Whether a service is offered in a resolved zone. Empty service.zoneIds
 * means "available everywhere active".
 */
const checkServiceAvailabilityInZone = (service, zoneId) => {
  if (!service.zoneIds || service.zoneIds.length === 0) return true;
  return service.zoneIds.some(id => id.toString() === zoneId.toString());
};

/**
 * The full ZONE -> SERVICE -> VENDOR AVAILABILITY pipeline for a booking
 * attempt. This is what userBookingController.createBooking must call; it is
 * the single place where the zone-only booking rules live.
 *
 * @param {Object} params
 * @param {string} params.serviceId
 * @param {number} params.lat
 * @param {number} params.lng
 * @returns {Promise<Object>} {
 *   serviceable, zone, service, vendors, reason, debug
 * }
 */
const checkBookingServiceability = async ({ serviceId, lat, lng }) => {
  const locationCheck = await checkLocationServiceability(lat, lng);

  if (!locationCheck.inZone) {
    return {
      serviceable: false,
      zone: locationCheck.zone,
      service: null,
      vendors: [],
      reason: locationCheck.reason,
      nearestZone: locationCheck.nearestZone,
      debug: null
    };
  }

  const zone = locationCheck.zone;

  const service = await UserService.findById(serviceId).select('title zoneIds basePrice').lean();
  if (!service) {
    return {
      serviceable: false,
      zone,
      service: null,
      vendors: [],
      reason: 'SERVICE_NOT_FOUND',
      debug: null
    };
  }

  if (!checkServiceAvailabilityInZone(service, zone._id)) {
    return {
      serviceable: false,
      zone,
      service,
      vendors: [],
      reason: MATCH_FAILURE_REASONS.SERVICE_NOT_AVAILABLE_IN_ZONE,
      debug: null
    };
  }

  const { vendors, reason, debug } = await findQualifiedVendors({
    zone,
    serviceTitle: service.title
  });

  return {
    serviceable: vendors.length > 0,
    zone,
    service,
    vendors,
    reason,
    debug
  };
};

module.exports = {
  checkLocationServiceability,
  checkServiceAvailabilityInZone,
  checkBookingServiceability
};

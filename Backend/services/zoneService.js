const Zone = require('../models/Zone');

/**
 * Zone Service
 * Centralized zone resolution. This is the SINGLE source of truth for
 * "which zone is this point in" - never trust a zoneId sent by the client.
 */

/**
 * Resolve the zone containing a given point using MongoDB $geoIntersects.
 * If multiple zones contain the point (nested/overlapping zones), the most
 * specific (smallest approxArea) wins; ties broken by displayOrder, then _id.
 *
 * Deliberately does NOT filter by isActive - callers (e.g.
 * serviceabilityService) need to distinguish "no zone here at all"
 * (OUT_OF_SERVICE_ZONE) from "zone exists but is inactive" (ZONE_INACTIVE).
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object|null>} zone document or null if none matched
 */
const findZoneByLocation = async (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const matches = await Zone.find({
    coordinates: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat] // GeoJSON order: [lng, lat]
        }
      }
    }
  }).sort({ approxArea: 1, displayOrder: 1, _id: 1 });

  return matches.length > 0 ? matches[0] : null;
};

/**
 * Find the nearest active zone to a point that does NOT contain it
 * (informational only - must never be used as the booking zone).
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{zone: Object, distanceKm: number}|null>}
 */
const findNearestZone = async (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const results = await Zone.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        spherical: true,
        query: { isActive: true },
        key: 'coordinates'
      }
    },
    { $limit: 1 }
  ]);

  if (!results || results.length === 0) return null;

  const nearest = results[0];
  return {
    zone: nearest,
    distanceKm: Math.round((nearest.distanceMeters / 1000) * 100) / 100
  };
};

module.exports = {
  findZoneByLocation,
  findNearestZone
};

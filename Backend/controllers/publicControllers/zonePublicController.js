const { checkLocationServiceability } = require('../../services/serviceabilityService');

/**
 * @route GET /api/public/zones/resolve?lat={lat}&lng={lng}
 * @desc  Resolve which zone (if any) a coordinate falls in. Used by the
 *        frontend for UI/catalog purposes only - booking creation always
 *        re-resolves the zone server-side and ignores any zoneId the client
 *        may have cached from this response.
 */
exports.resolveZone = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Valid lat and lng query parameters are required'
      });
    }

    const result = await checkLocationServiceability(lat, lng);

    if (!result.inZone) {
      return res.status(200).json({
        success: true,
        zoneStatus: {
          inZone: false,
          reason: result.reason,
          zoneName: result.zone?.name || null,
          nearestZone: result.nearestZone || null
        }
      });
    }

    return res.status(200).json({
      success: true,
      zoneStatus: {
        inZone: true,
        zoneId: result.zone._id,
        zoneName: result.zone.name
      }
    });
  } catch (error) {
    console.error('Resolve zone error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve zone' });
  }
};

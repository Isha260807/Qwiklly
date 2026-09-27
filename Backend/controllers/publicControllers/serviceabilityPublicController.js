const { checkBookingServiceability } = require('../../services/serviceabilityService');

/**
 * @route GET /api/public/serviceability?serviceId={id}&lat={lat}&lng={lng}
 * @desc  Full zone -> service -> radius -> vendor check, for the frontend to
 *        show "no vendors nearby" / "not available here" before checkout.
 *        This is advisory only - createBooking independently re-validates
 *        everything server-side and is the actual source of truth.
 * @access Public
 */
exports.checkServiceability = async (req, res) => {
  try {
    const { serviceId, lat, lng } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required' });
    }
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng are required' });
    }

    const result = await checkBookingServiceability({ serviceId, lat: latNum, lng: lngNum });

    res.status(200).json({
      success: true,
      serviceable: result.serviceable,
      zone: result.zone ? { id: result.zone._id, name: result.zone.name } : null,
      radiusKm: result.radiusKm,
      vendorCount: result.vendors.length,
      reason: result.reason,
      nearestZone: result.nearestZone || null
    });
  } catch (error) {
    console.error('Check serviceability error:', error);
    res.status(500).json({ success: false, message: 'Failed to check serviceability' });
  }
};

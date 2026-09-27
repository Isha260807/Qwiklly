const Zone = require('../../models/Zone');
const Vendor = require('../../models/Vendor');
const UserService = require('../../models/UserService');

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validatePolygon = (coordinates) => {
  if (!coordinates || coordinates.type !== 'Polygon' || !Array.isArray(coordinates.coordinates)) {
    return 'coordinates must be a GeoJSON Polygon: { type: "Polygon", coordinates: [[[lng,lat], ...]] }';
  }
  const ring = coordinates.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return 'Polygon outer ring must have at least 4 points (first and last must match)';
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return 'Polygon outer ring must be closed (first point must equal last point)';
  }
  return null;
};

/**
 * @route GET /api/admin/zones
 */
exports.getAllZones = catchAsync(async (req, res) => {
  const { isActive, search } = req.query;
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) query.name = { $regex: search, $options: 'i' };

  const zones = await Zone.find(query).sort({ displayOrder: 1, createdAt: -1 });

  res.status(200).json({ success: true, count: zones.length, zones });
});

/**
 * @route GET /api/admin/zones/:id
 */
exports.getZone = catchAsync(async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  const [vendorCount, serviceCount] = await Promise.all([
    Vendor.countDocuments({ zoneIds: zone._id }),
    UserService.countDocuments({ zoneIds: zone._id })
  ]);

  res.status(200).json({ success: true, zone, vendorCount, serviceCount });
});

/**
 * @route POST /api/admin/zones
 * Admin-side warning (not a hard reject) when the new polygon overlaps an
 * existing zone - nested zones can be intentional (e.g. a locality inside a
 * wider zone), so we only surface it; smallest-zone-wins still applies.
 */
exports.createZone = catchAsync(async (req, res) => {
  const { name, coordinates, isActive, displayOrder } = req.body;

  const polygonError = validatePolygon(coordinates);
  if (polygonError) {
    return res.status(400).json({ success: false, message: polygonError });
  }

  const zone = await Zone.create({
    name,
    coordinates,
    isActive,
    displayOrder,
    createdBy: req.user.id
  });

  const overlaps = await Zone.find({
    _id: { $ne: zone._id },
    coordinates: { $geoIntersects: { $geometry: coordinates } }
  }).select('name').lean();

  res.status(201).json({
    success: true,
    message: 'Zone created successfully',
    zone,
    overlapWarning: overlaps.length > 0
      ? `This zone overlaps with: ${overlaps.map(z => z.name).join(', ')}. This may be intentional (nested zones); the smallest zone always wins for a given point.`
      : null
  });
});

/**
 * @route PUT /api/admin/zones/:id
 */
exports.updateZone = catchAsync(async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  if (req.body.coordinates) {
    const polygonError = validatePolygon(req.body.coordinates);
    if (polygonError) {
      return res.status(400).json({ success: false, message: polygonError });
    }
  }

  const allowedFields = ['name', 'coordinates', 'isActive', 'displayOrder'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) zone[field] = req.body[field];
  });

  await zone.save();

  res.status(200).json({ success: true, message: 'Zone updated successfully', zone });
});

/**
 * @route DELETE /api/admin/zones/:id
 */
exports.deleteZone = catchAsync(async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  const [vendorCount, bookingCount] = await Promise.all([
    Vendor.countDocuments({ zoneIds: zone._id }),
    require('../../models/Booking').countDocuments({ zoneId: zone._id })
  ]);

  if (vendorCount > 0 || bookingCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete zone: it has ${vendorCount} vendor(s) assigned and ${bookingCount} booking(s) referencing it. Deactivate it instead.`
    });
  }

  await zone.deleteOne();
  res.status(200).json({ success: true, message: 'Zone deleted successfully' });
});

/**
 * @route PATCH /api/admin/zones/:id/status
 */
exports.toggleZoneStatus = catchAsync(async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }
  zone.isActive = !zone.isActive;
  await zone.save();
  res.status(200).json({
    success: true,
    message: `Zone ${zone.isActive ? 'activated' : 'deactivated'} successfully`,
    zone
  });
});

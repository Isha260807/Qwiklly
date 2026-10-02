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

  const zones = await Zone.find(query).sort({ displayOrder: 1, createdAt: -1 }).lean();
  const zoneIdList = zones.map(z => z._id);
  const activeZoneIdList = zones.filter(z => z.isActive).map(z => z._id);

  // Aggregate vendor stats and service stats per zone
  const [vendorsInZones, allUserServices, totalOnlineVendors] = await Promise.all([
    Vendor.find({
      isActive: true,
      approvalStatus: 'approved',
      zoneIds: { $in: zoneIdList }
    }).select('name phone service isOnline availability zoneIds profilePhoto').lean(),
    UserService.find({}).select('title iconUrl basePrice categoryId status zoneIds').lean(),
    Vendor.countDocuments({
      isActive: true,
      approvalStatus: 'approved',
      isOnline: true,
      zoneIds: { $in: activeZoneIdList }
    })
  ]);

  const serviceByTitle = new Map();
  allUserServices.forEach(s => {
    if (s.title) serviceByTitle.set(s.title.toLowerCase().trim(), s);
  });

  const enrichedZones = zones.map(z => {
    const zIdStr = z._id.toString();
    const ring = z.coordinates?.coordinates?.[0] || [];
    const pointsCount = ring.length > 0 ? (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] ? ring.length - 1 : ring.length) : 0;

    const zoneVendors = vendorsInZones.filter(v =>
      (v.zoneIds || []).some(id => id.toString() === zIdStr)
    );
    const totalPartners = zoneVendors.length;
    const onlineVendors = zoneVendors.filter(v => v.isOnline).length;

    const vServices = zoneVendors.map(v => v.service || []).flat().filter(Boolean);

    const directUserServices = allUserServices.filter(s =>
      (s.zoneIds || []).some(id => id.toString() === zIdStr)
    );

    const serviceMap = new Map();

    // Direct services assigned to this zone
    directUserServices.forEach(s => {
      serviceMap.set(s.title.toLowerCase().trim(), {
        _id: s._id,
        title: s.title,
        iconUrl: s.iconUrl || null,
        basePrice: s.basePrice || 0,
        status: s.status || 'active'
      });
    });

    // Vendor provided services
    vServices.forEach(vName => {
      const key = vName.toLowerCase().trim();
      if (!serviceMap.has(key)) {
        const matched = serviceByTitle.get(key);
        serviceMap.set(key, {
          _id: matched?._id || null,
          title: matched?.title || vName,
          iconUrl: matched?.iconUrl || null,
          basePrice: matched?.basePrice || 0,
          status: matched?.status || 'active'
        });
      }
    });

    const services = Array.from(serviceMap.values());

    return {
      ...z,
      stats: {
        totalPartners,
        onlineVendors,
        pointsCount,
        servicesCount: services.length,
        services,
        vendors: zoneVendors
      }
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedZones.length,
    zones: enrichedZones,
    totalOnlineVendors,
    activeCount: enrichedZones.filter(z => z.isActive).length
  });
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
  const { name, coordinates, isActive, isComingSoon, isOrderingPaused, displayOrder } = req.body;

  const polygonError = validatePolygon(coordinates);
  if (polygonError) {
    return res.status(400).json({ success: false, message: polygonError });
  }

  const zone = await Zone.create({
    name,
    coordinates,
    isActive: isActive !== undefined ? isActive : true,
    isComingSoon: !!isComingSoon,
    isOrderingPaused: !!isOrderingPaused,
    displayOrder: displayOrder || 0,
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

  const allowedFields = ['name', 'coordinates', 'isActive', 'isComingSoon', 'isOrderingPaused', 'displayOrder'];
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

  const Booking = require('../../models/Booking');

  // Only block on active/pending bookings — completed/cancelled are safe to keep as history
  const activeBookingCount = await Booking.countDocuments({
    zoneId: zone._id,
    status: { $in: ['PENDING', 'SEARCHING', 'ACCEPTED', 'IN_PROGRESS', 'VENDOR_ARRIVED'] }
  });

  if (activeBookingCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete zone: it has ${activeBookingCount} active/ongoing booking(s). Complete or cancel them first.`
    });
  }

  // Auto-unassign all vendors from this zone before deleting
  await Vendor.updateMany(
    { zoneIds: zone._id },
    { $pull: { zoneIds: zone._id } }
  );

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

/**
 * @route PATCH /api/admin/zones/:id/coming-soon
 */
exports.toggleComingSoon = catchAsync(async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }
  zone.isComingSoon = !zone.isComingSoon;
  await zone.save();
  res.status(200).json({
    success: true,
    message: `Zone marked as ${zone.isComingSoon ? 'Coming Soon' : 'Standard'}`,
    zone
  });
});

/**
 * @route PATCH /api/admin/zones/:id/pause-ordering
 */
exports.togglePauseOrdering = catchAsync(async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }
  zone.isOrderingPaused = !zone.isOrderingPaused;
  await zone.save();
  res.status(200).json({
    success: true,
    message: `Ordering ${zone.isOrderingPaused ? 'paused' : 'resumed'} for ${zone.name}`,
    zone
  });
});

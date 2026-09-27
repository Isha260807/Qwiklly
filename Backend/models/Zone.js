const mongoose = require('mongoose');

/**
 * Zone Model
 * GeoJSON Polygon based service boundary. A user's location must fall inside
 * an active zone for the location to be serviceable at all. Radius-based
 * vendor matching (Vendor.settings.serviceRange / service.serviceRadiusKm)
 * is applied AFTER zone resolution, never instead of it.
 *
 * IMPORTANT: GeoJSON coordinates are always [lng, lat], never [lat, lng].
 */
const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a zone name'],
    trim: true,
    index: true
  },
  // GeoJSON Polygon boundary of the zone
  coordinates: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // [ [ [lng,lat], [lng,lat], ... ] ]
      required: [true, 'Zone polygon coordinates are required']
    }
  },
  // Precomputed planar area (deg^2), used only for "smallest zone wins" tie-breaking
  // when polygons overlap. Not a geodesic area - ranking heuristic only.
  approxArea: {
    type: Number,
    default: 0,
    index: true
  },
  // Only two states - no "coming soon" tier. Active means serviceable.
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

zoneSchema.index({ coordinates: '2dsphere' });
zoneSchema.index({ isActive: 1, displayOrder: 1 });

/**
 * Shoelace-formula planar area of the outer ring, used purely as a
 * "smallest polygon wins" ranking signal for overlapping/nested zones.
 */
function computeApproxArea(polygonCoordinates) {
  try {
    const ring = polygonCoordinates && polygonCoordinates[0];
    if (!ring || ring.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      area += (x1 * y2 - x2 * y1);
    }
    return Math.abs(area / 2);
  } catch (e) {
    return 0;
  }
}

zoneSchema.pre('validate', function (next) {
  if (this.coordinates && this.coordinates.coordinates) {
    this.approxArea = computeApproxArea(this.coordinates.coordinates);
  }
  next();
});

zoneSchema.statics.computeApproxArea = computeApproxArea;

module.exports = mongoose.model('Zone', zoneSchema);

/**
 * Backfill Vendor.zoneIds for existing vendors from their current geoLocation.
 *
 * Zone-based matching still works WITHOUT running this script, via the
 * legacy city-name fallback in vendorMatchService.findVendorsByZone (any
 * vendor with an empty zoneIds[] is matched by comparing vendor.address.city
 * to the zone's city name). This script is only for admins who want to
 * upgrade existing vendors to explicit, polygon-accurate zone assignment
 * once zones have been drawn - it never overwrites a vendor that already
 * has zoneIds set.
 *
 * Usage: node scripts/backfillVendorZones.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Vendor = require('../models/Vendor');
const { findZoneByLocation } = require('../services/zoneService');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Homster');
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

const run = async () => {
  await connectDB();

  const vendors = await Vendor.find({ zoneIds: { $size: 0 } }).select('_id geoLocation location address');
  console.log(`Found ${vendors.length} vendors with no zoneIds assigned.`);

  let assigned = 0;
  let skipped = 0;

  for (const vendor of vendors) {
    const lat = vendor.geoLocation?.coordinates?.[1] || vendor.location?.lat || vendor.address?.lat;
    const lng = vendor.geoLocation?.coordinates?.[0] || vendor.location?.lng || vendor.address?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      skipped++;
      continue;
    }

    const zone = await findZoneByLocation(lat, lng);
    if (!zone) {
      skipped++;
      continue;
    }

    vendor.zoneIds = [zone._id];
    await vendor.save();
    assigned++;
    console.log(`Vendor ${vendor._id} -> zone "${zone.name}"`);
  }

  console.log(`Done. Assigned: ${assigned}, Skipped (no coordinates / no matching zone): ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

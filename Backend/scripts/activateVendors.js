require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');

const activateVendors = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const vendors = await Vendor.find({});
    console.log(`\nFound ${vendors.length} vendor(s) in database:\n`);

    for (const v of vendors) {
      console.log(`- ID: ${v._id} | Name: ${v.name || v.ownerName || 'N/A'} | Phone: ${v.phone} | Status: ${v.approvalStatus} | isActive: ${v.isActive}`);
    }

    const result = await Vendor.updateMany(
      {},
      {
        $set: {
          isActive: true,
          approvalStatus: 'approved'
        }
      }
    );

    console.log(`\n✅ Successfully activated & approved ${result.modifiedCount} vendor(s).\n`);
  } catch (error) {
    console.error('❌ Error activating vendors:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

activateVendors();

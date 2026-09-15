const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const Category = require('../models/Category');
const City = require('../models/City');
const mongoose = require('mongoose');

dotenv.config();

const seedCredentials = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // 1. Seed / Update User: 8817921168
    console.log('👤 Seeding User (Phone: 8817921168)...');
    let user = await User.findOne({ phone: '8817921168' });
    if (user) {
      user.name = 'Qwiklly Customer';
      user.isPhoneVerified = true;
      user.isActive = true;
      if (!user.addresses || user.addresses.length === 0) {
        user.addresses = [{
          type: 'home',
          addressLine1: 'Vijay Nagar, Scheme No. 54',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
          landmark: 'Near Orbit Mall',
          isDefault: true
        }];
      }
      await user.save();
      console.log('✅ User updated successfully: 8817921168 (OTP: 123456)');
    } else {
      user = await User.create({
        name: 'Qwiklly Customer',
        phone: '8817921168',
        email: 'customer8817921168@qwiklly.com',
        role: 'user',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        addresses: [{
          type: 'home',
          addressLine1: 'Vijay Nagar, Scheme No. 54',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
          landmark: 'Near Orbit Mall',
          isDefault: true
        }]
      });
      console.log('✅ User created successfully: 8817921168 (OTP: 123456)');
    }

    // 2. Seed / Update Vendor: 8817921167
    console.log('\n🏪 Seeding Vendor / Provider (Phone: 8817921167)...');
    
    // Fetch available category or city if any
    const categories = await Category.find({ status: 'active' }).limit(3);
    const categoryTitles = categories.map(c => c.title);

    let vendor = await Vendor.findOne({ phone: '8817921167' });
    if (vendor) {
      vendor.name = 'Qwiklly Service Provider';
      vendor.businessName = 'Qwiklly Provider Hub';
      vendor.approvalStatus = 'approved';
      vendor.isPhoneVerified = true;
      vendor.isActive = true;
      vendor.isOnline = true;
      vendor.availability = 'AVAILABLE';
      vendor.categories = categoryTitles.length > 0 ? categoryTitles : ['AC Repair & Service', 'Electrician', 'Plumber'];
      vendor.service = categoryTitles.length > 0 ? categoryTitles : ['AC Repair & Service', 'Electrician'];
      vendor.address = {
        fullAddress: 'Geeta Bhawan, AB Road, Indore',
        addressLine1: 'Geeta Bhawan',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
        lat: 22.7196,
        lng: 75.8577
      };
      vendor.geoLocation = {
        type: 'Point',
        coordinates: [75.8577, 22.7196]
      };
      await vendor.save();
      console.log('✅ Vendor updated successfully: 8817921167 (OTP: 123456)');
    } else {
      vendor = await Vendor.create({
        name: 'Qwiklly Service Provider',
        phone: '8817921167',
        email: 'provider8817921167@qwiklly.com',
        businessName: 'Qwiklly Provider Hub',
        role: 'vendor',
        approvalStatus: 'approved',
        isPhoneVerified: true,
        isActive: true,
        isOnline: true,
        availability: 'AVAILABLE',
        categories: categoryTitles.length > 0 ? categoryTitles : ['AC Repair & Service', 'Electrician', 'Plumber'],
        service: categoryTitles.length > 0 ? categoryTitles : ['AC Repair & Service', 'Electrician'],
        aadhar: {
          number: '987654321098',
          document: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          backDocument: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
        },
        pan: {
          number: 'QWIKL1234P',
          document: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
        },
        address: {
          fullAddress: 'Geeta Bhawan, AB Road, Indore',
          addressLine1: 'Geeta Bhawan',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          lat: 22.7196,
          lng: 75.8577
        },
        geoLocation: {
          type: 'Point',
          coordinates: [75.8577, 22.7196]
        }
      });
      console.log('✅ Vendor created successfully: 8817921167 (OTP: 123456)');
    }

    // 3. Seed / Update Admin: qwikllyserviceprovider@gmail.com
    console.log('\n👑 Seeding Admin (Email: qwikllyserviceprovider@gmail.com)...');
    let admin = await Admin.findOne({ email: 'qwikllyserviceprovider@gmail.com' });
    if (admin) {
      admin.name = 'Qwiklly Admin';
      admin.password = '123456'; // Will be hashed by pre('save')
      admin.role = 'super_admin';
      admin.isActive = true;
      await admin.save();
      console.log('✅ Admin password reset to: 123456');
    } else {
      admin = await Admin.create({
        name: 'Qwiklly Super Admin',
        email: 'qwikllyserviceprovider@gmail.com',
        password: '123456',
        role: 'super_admin',
        isActive: true
      });
      console.log('✅ Admin created successfully with password: 123456');
    }

    console.log('\n=========================================');
    console.log('🎉 ALL CREDENTIALS SEEDED SUCCESSFULLY:');
    console.log('👤 User:   Phone: 8817921168   | OTP: 123456');
    console.log('🏪 Vendor: Phone: 8817921167   | OTP: 123456');
    console.log('👑 Admin:  Email: qwikllyserviceprovider@gmail.com | Password: 123456');
    console.log('=========================================\n');

  } catch (error) {
    console.error('❌ Error seeding credentials:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

seedCredentials();

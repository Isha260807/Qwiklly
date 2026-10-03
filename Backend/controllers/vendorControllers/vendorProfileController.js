const mongoose = require('mongoose');
const Vendor = require('../../models/Vendor');
const cloudinaryService = require('../../services/cloudinaryService');
const {
  PRESENCE_REASONS,
  syncVendorLocation,
  checkCanGoOnline
} = require('../../services/vendorZonePresenceService');

const PRESENCE_MESSAGES = {
  [PRESENCE_REASONS.NO_ZONE_ASSIGNED]: 'No service zone is assigned to you yet. Please contact admin.',
  [PRESENCE_REASONS.OUTSIDE_ASSIGNED_ZONE]: 'You are outside your assigned zone. Move inside your zone to go online.',
  [PRESENCE_REASONS.LOCATION_REQUIRED]: 'Please enable location (GPS) to go online.',
  [PRESENCE_REASONS.INVALID_LOCATION]: 'Could not read a valid location. Please try again.'
};

/**
 * Get vendor profile
 */
const getProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const vendor = await Vendor.findById(vendorId).select('-password -__v');
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Use stored rating if available (and > 0), otherwise calculate
    let rating = vendor.rating || 0;

    const Booking = require('../../models/Booking');

    if (rating === 0) {
      const [ratingData] = await Booking.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), rating: { $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]);
      rating = ratingData ? ratingData.avgRating : 0;
    }

    const totalJobs = await Booking.countDocuments({ vendorId });
    const completedJobs = await Booking.countDocuments({ vendorId, status: 'completed' });
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    res.status(200).json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName || null,
        email: vendor.email,
        phone: vendor.phone,
        service: vendor.service,
        skills: vendor.skills || [],
        address: vendor.address || null,
        bankDetails: vendor.bankDetails || {
          accountHolderName: '',
          accountNumber: '',
          ifscCode: '',
          bankName: '',
          upiId: '',
          upiQrCode: ''
        },
        rating: rating > 0 ? parseFloat(rating.toFixed(1)) : 0,
        totalJobs,
        completionRate,
        approvalStatus: vendor.approvalStatus,
        isPhoneVerified: vendor.isPhoneVerified || false,
        isEmailVerified: vendor.isEmailVerified || false,
        isOnline: vendor.isOnline || false,
        availability: vendor.availability || 'OFFLINE',
        profilePhoto: vendor.profilePhoto || null,
        aadharDocument: vendor.aadhar?.document || null,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt
      }
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile. Please try again.'
    });
  }
};

/**
 * Toggle vendor online/offline status
 */
const toggleOnlineStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { isOnline } = req.body;
    const lat = req.body.lat !== undefined ? parseFloat(req.body.lat) : undefined;
    const lng = req.body.lng !== undefined ? parseFloat(req.body.lng) : undefined;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const newStatus = isOnline !== undefined ? Boolean(isOnline) : !vendor.isOnline;

    // Zone gate: going ONLINE requires being physically inside an assigned,
    // active zone. Going OFFLINE is always allowed.
    if (newStatus) {
      const gate = await checkCanGoOnline(vendor, { lat, lng });
      if (!gate.allowed) {
        return res.status(403).json({
          success: false,
          reason: gate.reason,
          message: PRESENCE_MESSAGES[gate.reason] || 'You cannot go online right now.',
          isOnline: vendor.isOnline,
          availability: vendor.availability
        });
      }
      if (gate.freshReading) {
        vendor.location = { lat, lng, updatedAt: new Date() };
        vendor.geoLocation = { type: 'Point', coordinates: [lng, lat] };
        vendor.currentZoneIds = gate.zones.map(z => z._id);
        vendor.lastLocationSyncAt = new Date();
        vendor.zoneExitStrikes = 0;
      }
    }

    vendor.isOnline = newStatus;
    vendor.availability = newStatus ? 'AVAILABLE' : 'OFFLINE';
    vendor.lastSeenAt = new Date();
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `You are now ${newStatus ? 'Online' : 'Offline'}`,
      isOnline: vendor.isOnline,
      availability: vendor.availability
    });
  } catch (error) {
    console.error('Toggle online status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update online status' });
  }
};

/**
 * Update vendor profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const vendorId = req.user.id;
    const { 
      name, 
      businessName, 
      address, 
      profilePhoto, 
      serviceCategory, 
      services, 
      service, 
      skills, 
      aadharNumber, 
      aadharDocument, 
      panNumber, 
      panDocument, 
      serviceRange,
      bankDetails,
      upiId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName
    } = req.body;

    console.log('Update Vendor Profile Body:', JSON.stringify(req.body, null, 2));

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update fields
    if (name) vendor.name = name.trim();
    if (businessName !== undefined) vendor.businessName = businessName ? businessName.trim() : null;
    if (address) {
      if (typeof address === 'string') {
        // If address is coming as string from simple form
        vendor.address = {
          ...vendor.address,
          fullAddress: address
        };
      } else {
        // Address is an object from advanced picker
        vendor.address = {
          fullAddress: address.fullAddress || vendor.address?.fullAddress || '',
          addressLine1: address.addressLine1 || vendor.address?.addressLine1 || '',
          addressLine2: address.addressLine2 || vendor.address?.addressLine2 || '',
          city: address.city || vendor.address?.city || '',
          state: address.state || vendor.address?.state || '',
          pincode: address.pincode || vendor.address?.pincode || '',
          landmark: address.landmark || vendor.address?.landmark || '',
          lat: address.lat !== undefined ? address.lat : vendor.address?.lat,
          lng: address.lng !== undefined ? address.lng : vendor.address?.lng
        };

        // Sync GeoJSON geoLocation for fast geo queries
        if (vendor.address.lat && vendor.address.lng) {
          vendor.geoLocation = {
            type: 'Point',
            coordinates: [vendor.address.lng, vendor.address.lat] // [lng, lat]
          };
        }
      }
    }

    // Update profile photo - upload to Cloudinary if it's a base64 string
    if (profilePhoto !== undefined) {
      if (profilePhoto && profilePhoto.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(profilePhoto, { folder: 'vendors/profiles' });
        if (uploadRes.success) {
          vendor.profilePhoto = uploadRes.url;
        }
      } else {
        vendor.profilePhoto = profilePhoto;
      }
    }

    // Handle multiple services directly
    const targetServices = services !== undefined ? services : (service !== undefined ? service : serviceCategory);
    if (targetServices !== undefined) {
      if (Array.isArray(targetServices)) {
        vendor.service = targetServices;
        vendor.categories = targetServices;
      } else if (typeof targetServices === 'string') {
        vendor.service = [targetServices];
        vendor.categories = [targetServices];
      }
    }

    // Handle service range
    if (serviceRange !== undefined) {
      if (!vendor.settings) vendor.settings = {};
      vendor.settings.serviceRange = Number(serviceRange) || 10;
    }

    // Handle skills
    if (skills !== undefined) {
      vendor.skills = Array.isArray(skills) ? skills : [];
    }
    // If aadharDocument exists and is not empty, update it
    if (aadharDocument || aadharNumber) {
      let aadharUrl = aadharDocument || vendor.aadhar?.document;
      if (aadharUrl && aadharUrl.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(aadharUrl, { folder: 'vendors/documents' });
        if (uploadRes.success) aadharUrl = uploadRes.url;
      }

      if (vendor.aadhar) {
        if (aadharNumber) vendor.aadhar.number = aadharNumber;
        if (aadharDocument) vendor.aadhar.document = aadharUrl;
      } else {
        vendor.aadhar = {
          number: aadharNumber || '',
          document: aadharUrl || ''
        };
      }
    }

    // If panDocument exists and is not empty, update it
    if (panDocument || panNumber) {
      let panUrl = panDocument || vendor.pan?.document;
      if (panUrl && panUrl.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(panUrl, { folder: 'vendors/documents' });
        if (uploadRes.success) panUrl = uploadRes.url;
      }

      if (vendor.pan) {
        if (panNumber) vendor.pan.number = panNumber;
        if (panDocument) vendor.pan.document = panUrl;
      } else {
        vendor.pan = {
          number: panNumber || '',
          document: panUrl || ''
        };
      }
    }

    // Update Bank & UPI Details
    if (bankDetails || upiId !== undefined || accountNumber !== undefined || req.body.upiQrCode !== undefined) {
      const incomingBank = bankDetails || {};
      let qrCodeUrl = incomingBank.upiQrCode || req.body.upiQrCode || vendor.bankDetails?.upiQrCode || '';
      
      if (qrCodeUrl && qrCodeUrl.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(qrCodeUrl, { folder: 'vendors/qr_codes' });
        if (uploadRes.success) qrCodeUrl = uploadRes.url;
      }

      vendor.bankDetails = {
        accountHolderName: incomingBank.accountHolderName ?? accountHolderName ?? vendor.bankDetails?.accountHolderName ?? '',
        accountNumber: incomingBank.accountNumber ?? accountNumber ?? vendor.bankDetails?.accountNumber ?? '',
        ifscCode: (incomingBank.ifscCode ?? ifscCode ?? vendor.bankDetails?.ifscCode ?? '').toUpperCase().trim(),
        bankName: incomingBank.bankName ?? bankName ?? vendor.bankDetails?.bankName ?? '',
        upiId: (incomingBank.upiId ?? upiId ?? vendor.bankDetails?.upiId ?? '').toLowerCase().trim(),
        upiQrCode: qrCodeUrl
      };
      vendor.markModified('bankDetails');
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName,
        email: vendor.email,
        phone: vendor.phone,
        service: vendor.service,
        address: vendor.address,
        bankDetails: vendor.bankDetails,
        approvalStatus: vendor.approvalStatus,
        isPhoneVerified: vendor.isPhoneVerified,
        isEmailVerified: vendor.isEmailVerified,
        profilePhoto: vendor.profilePhoto,
        service: vendor.service,
        skills: vendor.skills,
        settings: vendor.settings
      }
    });
  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.'
    });
  }
};

/**
 * Update vendor address
 */
const updateAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const vendorId = req.user.id;
    const { fullAddress, lat, lng } = req.body;

    if (!fullAddress || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Full address and coordinates are required'
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update address with coordinates
    vendor.address = {
      ...vendor.address,
      fullAddress: fullAddress.trim(),
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    };

    // Sync GeoJSON geoLocation
    vendor.geoLocation = {
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)]
    };

    await vendor.save();

    // Immediately resolve zone presence with new address coordinates
    try {
      await syncVendorLocation(vendorId, { lat: parseFloat(lat), lng: parseFloat(lng) });
    } catch (zoneErr) {
      console.warn('Zone presence sync on address update failed:', zoneErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address: vendor.address
    });
  } catch (error) {
    console.error('Update vendor address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address. Please try again.'
    });
  }
};

/**
 * Update vendor real-time location
 */
const updateLocation = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    // Sync zone presence & location
    const presence = await syncVendorLocation(vendorId, { lat: parseFloat(lat), lng: parseFloat(lng) });

    res.status(200).json({ success: true, message: 'Location updated', presence });
  } catch (error) {
    console.error('Vendor location update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Sync live GPS and resolve zone presence.
 * Called by the vendor app on entry, on foreground and periodically.
 * Auto-offlines an idle vendor who has left all of their assigned zones.
 */
const syncLocation = async (req, res) => {
  try {
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    const accuracy = req.body.accuracy !== undefined ? parseFloat(req.body.accuracy) : undefined;

    const presence = await syncVendorLocation(req.user.id, { lat, lng, accuracy });

    res.status(200).json({
      success: true,
      ...presence,
      message: presence.message || null
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        reason: error.reason || null,
        message: error.message
      });
    }
    console.error('Vendor sync location error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync location' });
  }
};

/**
 * Get assigned zones with full polygon coordinates and current presence status
 */
const getAssignedZones = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId).select('zoneIds currentZoneIds location address isOnline availability').lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const Zone = require('../../models/Zone');
    const { findZoneByLocation } = require('../../services/zoneService');
    const zones = await Zone.find({ _id: { $in: vendor.zoneIds || [] }, isActive: true })
      .select('name coordinates approxArea isActive')
      .lean();

    let physicalZone = null;
    if (vendor.location?.lat && vendor.location?.lng) {
      physicalZone = await findZoneByLocation(vendor.location.lat, vendor.location.lng);
    }

    res.status(200).json({
      success: true,
      zones: zones.map(z => ({
        id: z._id,
        name: z.name,
        coordinates: z.coordinates,
        approxArea: z.approxArea
      })),
      currentZoneIds: (vendor.currentZoneIds || []).map(id => String(id)),
      currentPhysicalZone: physicalZone ? { id: physicalZone._id, name: physicalZone.name } : null,
      location: vendor.location || null,
      address: vendor.address || null,
      isOnline: Boolean(vendor.isOnline),
      availability: vendor.availability
    });
  } catch (error) {
    console.error('Get assigned zones error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned zones' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateAddress,
  updateLocation,
  syncLocation,
  getAssignedZones,
  toggleOnlineStatus
};


const Vendor = require('../../models/Vendor');
const VendorAttendance = require('../../models/VendorAttendance');
const Booking = require('../../models/Booking');
const VendorBill = require('../../models/VendorBill');
const VendorSalaryEarning = require('../../models/VendorSalaryEarning');
const { validationResult } = require('express-validator');
const { VENDOR_STATUS, BOOKING_STATUS, PAYMENT_STATUS, ADMIN_ROLES, ADMIN_PERMISSIONS } = require('../../utils/constants');
const { createNotification } = require('../notificationControllers/notificationController');
const { getAdminVendorCityFilter, getAdminBookingCityFilter } = require('../../utils/adminCityScope');
const { getPresenceDateKey, PRESENCE_TIME_ZONE } = require('../../services/vendorPresenceService');

/**
 * Get all vendors with filters and pagination
 */
const getAllVendors = async (req, res) => {
  try {
    const {
      search,
      approvalStatus,
      isActive,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { ...getAdminVendorCityFilter(req) };

    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
      if (approvalStatus === VENDOR_STATUS.PENDING) {
        query.registrationCompleted = true;
      }
    } else {
      // Do not expose incomplete pending registrations in the admin list.
      // Approved/rejected vendors remain visible regardless of this flag.
      query.$and = [{
        $or: [
          { approvalStatus: { $in: [VENDOR_STATUS.APPROVED, VENDOR_STATUS.REJECTED, VENDOR_STATUS.SUSPENDED] } },
          { approvalStatus: VENDOR_STATUS.PENDING, registrationCompleted: true }
        ]
      }];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Search by name, email, phone, or business name
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get vendors
    const vendors = await Vendor.find(query)
      .select('-password')
      .populate('zoneIds', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Vendor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors. Please try again.'
    });
  }
};

/**
 * Get a date-wise attendance overview for all vendors.
 */
const getVendorAttendanceOverview = async (req, res) => {
  try {
    const {
      date: requestedDate,
      search,
      approvalStatus,
      isActive,
      page = 1,
      limit = 20
    } = req.query;
    const dateKey = requestedDate || getPresenceDateKey();

    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateKey)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    const query = { ...getAdminVendorCityFilter(req) };
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search?.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
        { businessName: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (currentPage - 1) * pageSize;

    const [vendors, total, matchingVendorIds, currentlyOnline] = await Promise.all([
      Vendor.find(query)
        .select('_id name businessName phone email approvalStatus isActive isOnline availability lastSeenAt zoneIds')
        .populate('zoneIds', 'name')
        .sort({ name: 1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Vendor.countDocuments(query),
      Vendor.find(query).select('_id').lean(),
      Vendor.countDocuments({ ...query, isOnline: true })
    ]);

    const vendorIds = matchingVendorIds.map(vendor => vendor._id);
    const attendanceRecords = vendorIds.length
      ? await VendorAttendance.find({ vendorId: { $in: vendorIds }, dateKey }).lean()
      : [];
    const attendanceByVendor = new Map(
      attendanceRecords.map(record => [String(record.vendorId), record])
    );

    const rows = vendors.map(vendor => ({
      vendor,
      attendance: attendanceByVendor.get(String(vendor._id)) || null,
      currentPresence: {
        isOnline: Boolean(vendor.isOnline),
        availability: vendor.availability || 'OFFLINE',
        lastSeenAt: vendor.lastSeenAt || null
      }
    }));

    const openCount = attendanceRecords.filter(record => record.dayStatus === 'OPEN').length;
    const closedCount = attendanceRecords.filter(record => record.dayStatus === 'CLOSED').length;

    return res.status(200).json({
      success: true,
      data: {
        dateKey,
        timezone: PRESENCE_TIME_ZONE,
        rows,
        summary: {
          totalVendors: total,
          withAttendance: attendanceRecords.length,
          open: openCount,
          closed: closedCount,
          notStarted: Math.max(0, total - attendanceRecords.length),
          currentlyOnline
        },
        pagination: {
          page: currentPage,
          limit: pageSize,
          total,
          pages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    console.error('Get vendor attendance overview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor attendance overview'
    });
  }
};
/**
 * Get one vendor's daily attendance summary.
 * Attendance is deliberately separate from booking/job metrics.
 */
const getVendorAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedDate = req.query.date;
    const dateKey = requestedDate || getPresenceDateKey();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    const vendor = await Vendor.findOne({
      _id: id,
      ...getAdminVendorCityFilter(req)
    }).select('_id isOnline availability manualOffDateKey').lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const attendance = await VendorAttendance.findOne({
      vendorId: vendor._id,
      dateKey
    }).lean();

    const recentHistory = await VendorAttendance.find({
      vendorId: vendor._id
    })
      .sort({ dateKey: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        dateKey,
        timezone: PRESENCE_TIME_ZONE,
        attendance,
        recentHistory: recentHistory || [],
        currentPresence: {
          isOnline: Boolean(vendor.isOnline),
          availability: vendor.availability || 'OFFLINE',
          manualOffToday: vendor.manualOffDateKey === dateKey
        }
      }
    });
  } catch (error) {
    console.error('Get vendor attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor attendance'
    });
  }
};

/**
 * Get vendor details
 */
const getVendorDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findOne({ _id: id, ...getAdminVendorCityFilter(req) }).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get vendor stats from VendorBill (single source of truth)
    const totalBookings = await Booking.countDocuments({ vendorId: vendor._id, ...getAdminBookingCityFilter(req) });
    const completedBookings = await Booking.countDocuments({ vendorId: vendor._id, status: BOOKING_STATUS.COMPLETED, ...getAdminBookingCityFilter(req) });

    const earningsResult = await VendorSalaryEarning.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: { $ne: 'reversed' }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' }
        }
      }
    ]);

    const bookingStats = [{
      totalBookings,
      completedBookings,
      totalEarnings: earningsResult[0]?.totalEarnings || 0,
      totalRevenue: 0
    }];

    res.status(200).json({
      success: true,
      data: {
        vendor,
        stats: bookingStats[0] || {
          totalBookings: 0,
          completedBookings: 0,
          totalEarnings: 0
        }
      }
    });
  } catch (error) {
    console.error('Get vendor details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor details. Please try again.'
    });
  }
};

/**
 * Approve vendor registration
 */
const approveVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findOne({ _id: id, ...getAdminVendorCityFilter(req) });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (!vendor.registrationCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Vendor has not completed the registration details yet.'
      });
    }
    if (!Array.isArray(vendor.zoneIds) || vendor.zoneIds.filter(Boolean).length === 0) {
      return res.status(400).json({
        success: false,
        code: 'VENDOR_ZONE_REQUIRED',
        message: 'First assign a zone to the vendor, then approve.'
      });
    }


    vendor.approvalStatus = VENDOR_STATUS.APPROVED;
    vendor.approvalDate = new Date();
    await vendor.save();

    // Send notification to vendor
    await createNotification({
      vendorId: vendor._id,
      type: 'vendor_approved',
      title: 'Vendor Registration Approved',
      message: 'Your vendor registration has been approved. You can now start accepting bookings.',
      relatedId: vendor._id,
      relatedType: 'vendor'
    });

    // Emit live socket event for real-time unlock on vendor client
    try {
      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io) {
        io.to(`vendor_${vendor._id}`).emit('vendor_status_updated', {
          approvalStatus: VENDOR_STATUS.APPROVED,
          vendor
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit error on vendor approval:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Vendor approved successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve vendor. Please try again.'
    });
  }
};

/**
 * Reject vendor registration
 */
const rejectVendor = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findOne({ _id: id, ...getAdminVendorCityFilter(req) });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    vendor.approvalStatus = VENDOR_STATUS.REJECTED;
    vendor.rejectedReason = reason || 'Registration rejected by admin';
    await vendor.save();

    // Send notification to vendor
    await createNotification({
      vendorId: vendor._id,
      type: 'vendor_rejected',
      title: 'Vendor Registration Rejected',
      message: `Your vendor registration has been rejected. Reason: ${vendor.rejectedReason}`,
      relatedId: vendor._id,
      relatedType: 'vendor'
    });

    // Emit live socket event for vendor client
    try {
      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io) {
        io.to(`vendor_${vendor._id}`).emit('vendor_status_updated', {
          approvalStatus: VENDOR_STATUS.REJECTED,
          rejectedReason: vendor.rejectedReason,
          vendor
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit error on vendor rejection:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Vendor rejected successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject vendor. Please try again.'
    });
  }
};

/**
 * Suspend vendor
 */
const suspendVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findOne({ _id: id, ...getAdminVendorCityFilter(req) });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    vendor.approvalStatus = VENDOR_STATUS.SUSPENDED;
    vendor.isActive = false;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor suspended successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Suspend vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend vendor. Please try again.'
    });
  }
};

/**
 * View vendor bookings
 */
const getVendorBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Build query
    const scopedVendor = await Vendor.findOne({ _id: id, ...getAdminVendorCityFilter(req) }).select('_id');
    if (!scopedVendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const query = { vendorId: id, ...getAdminBookingCityFilter(req) };
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await Booking.find(query)
      .populate('userId', 'name phone')
      .populate('serviceId', 'title iconUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get vendor bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor bookings. Please try again.'
    });
  }
};

/**
 * View vendor earnings
 */
const getVendorEarnings = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const scopedVendor = await Vendor.findOne({ _id: id, ...getAdminVendorCityFilter(req) }).select('_id');
    if (!scopedVendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const earningQuery = {
      vendorId: require('mongoose').Types.ObjectId(id),
      status: { $ne: 'reversed' }
    };

    if (startDate || endDate) {
      earningQuery.earningDate = {};
      if (startDate) earningQuery.earningDate.$gte = new Date(startDate);
      if (endDate) earningQuery.earningDate.$lte = new Date(endDate);
    }

    const earnings = await VendorSalaryEarning.aggregate([
      { $match: earningQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          vendorEarnings: { $sum: '$amount' },
          platformCommission: { $sum: 0 },
          totalBookings: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: earnings[0] || {
        totalRevenue: 0,
        vendorEarnings: 0,
        platformCommission: 0,
        totalBookings: 0
      }
    });
  } catch (error) {
    console.error('Get vendor earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor earnings. Please try again.'
    });
  }
};

/**
 * Get all vendor bookings (global)
 */
const getAllVendorBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = { vendorId: { $exists: true, $ne: null }, ...getAdminBookingCityFilter(req) };
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // If search is provided, we need to find vendors by business name or name first
    if (search) {
      const vendors = await Vendor.find({
        ...getAdminVendorCityFilter(req),
        $or: [
          { businessName: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const vendorIds = vendors.map(v => v._id);
      query.vendorId = { $in: vendorIds };
    }

    const bookings = await Booking.find(query)
      .populate('vendorId', 'name businessName phone profileImage')
      .populate('userId', 'name phone')
      .populate('serviceId', 'title iconUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all vendor bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all vendor bookings.'
    });
  }
};

/**
 * Get vendor payments summary
 */
const getVendorPaymentsSummary = async (req, res) => {
  try {
    // Return vendors with their wallet balances and earnings
    const vendors = await Vendor.find({
      ...getAdminVendorCityFilter(req),
      'wallet.balance': { $exists: true }
    })
      .select('name businessName phone wallet email approvalStatus')
      .sort({ 'wallet.balance': -1 });

    res.status(200).json({
      success: true,
      data: vendors
    });
  } catch (error) {
    console.error('Get vendor payments summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor payments summary.'
    });
  }
};

/**
 * Toggle vendor active status (approve/disable login)
 */
const toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body; // Expecting { isActive: true/false }

    const vendor = await Vendor.findOne({ _id: id, ...getAdminVendorCityFilter(req) });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    vendor.isActive = isActive;
    await vendor.save();

    // Log the action (optional but recommended)
    // console.log(`Vendor ${vendor._id} status changed to ${isActive}`);

    res.status(200).json({
      success: true,
      message: `Vendor ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: vendor
    });
  } catch (error) {
    console.error('Toggle vendor status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor status'
    });
  }
};

/**
 * Delete vendor
 */
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findOneAndDelete({ _id: id, ...getAdminVendorCityFilter(req) });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor'
    });
  }
};

/**
 * Assign zones to a vendor (source of truth for zone-based vendor matching).
 * Replaces the vendor's entire zoneIds[] set with the provided list.
 */
const assignVendorZones = async (req, res) => {
  try {
    const { id } = req.params;
    const { zoneIds } = req.body;

    const canEditVendorZones =
      (req.user?.role || req.userRole) === ADMIN_ROLES.SUPER_ADMIN ||
      !Array.isArray(req.user?.permissions) ||
      req.user.permissions.includes(ADMIN_PERMISSIONS.VENDORS);
    if (!canEditVendorZones) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Vendor Management permission is required to change vendor zones.'
      });
    }

    if (!Array.isArray(zoneIds)) {
      return res.status(400).json({
        success: false,
        message: 'zoneIds must be an array of zone ids'
      });
    }

    const Zone = require('../../models/Zone');
    const validZones = await Zone.find({ _id: { $in: zoneIds } }).select('_id');
    if (validZones.length !== zoneIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more zoneIds do not exist'
      });
    }

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, ...getAdminVendorCityFilter(req) },
      { zoneIds },
      { new: true, runValidators: true }
    ).select('-password').populate('zoneIds', 'name');

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor zones updated successfully',
      vendor
    });
  } catch (error) {
    console.error('Assign vendor zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor zones'
    });
  }
};

module.exports = {
  getAllVendors,
  getVendorAttendanceOverview,
  getVendorAttendance,
  getVendorDetails,
  approveVendor,
  rejectVendor,
  suspendVendor,
  getVendorBookings,
  getVendorEarnings,
  getAllVendorBookings,
  getVendorPaymentsSummary,
  toggleVendorStatus,
  deleteVendor,
  assignVendorZones
};


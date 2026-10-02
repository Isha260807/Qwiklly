const Booking = require('../../models/Booking');
const Vendor = require('../../models/Vendor');
const Zone = require('../../models/Zone');
const Service = require('../../models/UserService');
const { validationResult } = require('express-validator');
const { BOOKING_STATUS, VENDOR_STATUS } = require('../../utils/constants');
const { calculateDistance } = require('../../services/locationService');
const { resolveRadiusKm } = require('../../services/serviceabilityService');
const { findQualifiedVendors, findServiceVendorsInZone } = require('../../services/vendorMatchService');

/**
 * Get all bookings with filters and search
 */
const getAllBookings = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      userId,
      vendorId,
      workerId,
      zoneId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    if (zoneId) query.zoneId = zoneId;

    if (status && status !== 'ALL_STATUS' && status !== 'ALL') {
      const s = status.toLowerCase();
      if (s === 'pending') {
        query.status = { $in: ['pending', 'searching', 'requested', 'awaiting_payment', 'pending_admin'] };
      } else if (s === 'confirmed') {
        query.status = { $in: ['confirmed', 'accepted', 'assigned'] };
      } else if (s === 'in_progress') {
        query.status = { $in: ['in_progress', 'journey_started', 'visited'] };
      } else if (s === 'completed') {
        query.status = { $in: ['completed', 'work_done'] };
      } else if (s === 'cancelled') {
        query.status = 'cancelled';
      } else if (s === 'rejected') {
        query.status = 'rejected';
      } else {
        query.status = { $regex: new RegExp(`^${status}$`, 'i') };
      }
    }

    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (userId) query.userId = userId;
    if (vendorId) query.vendorId = vendorId;
    if (workerId) query.workerId = workerId;

    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateRange.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      query.$or = [
        { createdAt: dateRange },
        { scheduledDate: dateRange }
      ];
    }

    // Search by booking number, service name, customer phone, or customer name
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchConditions = [
        { bookingNumber: searchRegex },
        { serviceName: searchRegex },
        { customerPhone: searchRegex },
        { customerName: searchRegex },
        { 'items.serviceName': searchRegex },
        { 'items.title': searchRegex }
      ];

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await Booking.find(query)
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone')
      .populate('serviceId', 'title iconUrl')
      .populate('categoryId', 'title slug')
      .populate('zoneId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
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
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings. Please try again.'
    });
  }
};

/**
 * Get booking details by ID
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');

    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { bookingNumber: id }] };
    } else {
      query = { bookingNumber: id };
    }

    const booking = await Booking.findOne(query)
      .populate('userId', 'name phone email addresses')
      .populate('vendorId', 'name businessName phone email address profilePhoto')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking. Please try again.'
    });
  }
};

/**
 * Cancel booking (admin)
 */
const cancelBooking = async (req, res) => {
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
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    // Update booking
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'admin';
    booking.cancellationReason = cancellationReason || 'Cancelled by admin';

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking. Please try again.'
    });
  }
};

/**
 * Get booking analytics
 */
const getBookingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Total bookings
    const totalBookings = await Booking.countDocuments(dateFilter);

    // Bookings by status
    const bookingsByStatusRaw = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $toLower: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = bookingsByStatusRaw.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const summaryStats = {
      pending: (statusMap['pending'] || 0) + (statusMap['searching'] || 0) + (statusMap['requested'] || 0) + (statusMap['awaiting_payment'] || 0),
      confirmed: (statusMap['confirmed'] || 0) + (statusMap['accepted'] || 0) + (statusMap['assigned'] || 0),
      inProgress: (statusMap['in_progress'] || 0) + (statusMap['journey_started'] || 0) + (statusMap['visited'] || 0),
      completed: (statusMap['completed'] || 0) + (statusMap['work_done'] || 0),
      cancelled: statusMap['cancelled'] || 0,
      rejected: statusMap['rejected'] || 0,
      total: totalBookings
    };

    // Bookings by payment status
    const bookingsByPaymentStatus = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);

    // Revenue analytics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          ...dateFilter,
          paymentStatus: 'success'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalAmount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$finalAmount' }
        }
      }
    ]);

    // Daily bookings trend (last 30 days)
    const dailyTrend = await Booking.aggregate([
      {
        $match: {
          ...dateFilter,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        summaryStats,
        bookingsByStatus: statusMap,
        bookingsByPaymentStatus: bookingsByPaymentStatus.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalAmount: item.totalAmount
          };
          return acc;
        }, {}),
        revenue: revenueStats[0] || {
          totalRevenue: 0,
          totalBookings: 0,
          averageBookingValue: 0
        },
        dailyTrend
      }
    });
  } catch (error) {
    console.error('Get booking analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics. Please try again.'
    });
  }
};

/**
 * Zone -> service -> radius candidate list for a specific booking, using
 * the SAME pipeline booking creation and wave dispatch use
 * (vendorMatchService.findQualifiedVendors). Lets an admin see exactly who
 * is eligible before manually assigning a vendor to a PENDING_ADMIN booking.
 */
const getEligibleVendorsForBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!booking.zoneId) {
      return res.status(400).json({ success: false, message: 'Booking has no resolved zone to match vendors against' });
    }

    const zone = await Zone.findById(booking.zoneId).lean();
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone referenced by this booking no longer exists' });
    }

    const serviceDoc = await Service.findById(booking.serviceId).select('serviceRadiusKm').lean();
    const radiusKm = await resolveRadiusKm(serviceDoc || {});

    if (typeof booking.address?.lat !== 'number' || typeof booking.address?.lng !== 'number') {
      return res.status(400).json({ success: false, message: 'Booking has no valid coordinates to match vendors against' });
    }

    const { vendors, reason, debug } = await findQualifiedVendors({
      zone,
      serviceTitle: booking.serviceName || booking.serviceCategory,
      location: { lat: booking.address.lat, lng: booking.address.lng },
      radiusKm
    });

    res.status(200).json({
      success: true,
      zone: { id: zone._id, name: zone.name },
      radiusKm,
      reason,
      debug,
      vendors: vendors.map(v => ({
        id: v._id,
        name: v.name,
        businessName: v.businessName,
        phone: v.phone,
        distance: v.distance,
        isOnline: v.isOnline,
        availability: v.availability,
        rating: v.rating
      }))
    });
  } catch (error) {
    console.error('Get eligible vendors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch eligible vendors' });
  }
};

/**
 * Manually assign a vendor to a booking (typically one parked as
 * PENDING_ADMIN because automatic zone/service/radius matching found no
 * candidates). Re-validates zone/service/radius/approval/active/conflict
 * server-side - never trusts that the admin's UI list is still accurate.
 */
const assignVendorToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'vendorId is required' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if ([BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot assign a vendor to a ${booking.status} booking` });
    }
    if (!booking.zoneId) {
      return res.status(400).json({ success: false, message: 'Booking has no resolved zone' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // 1. Zone assignment
    const vendorZoneIds = (vendor.zoneIds || []).map(z => z.toString());
    if (!vendorZoneIds.includes(booking.zoneId.toString())) {
      return res.status(400).json({ success: false, code: 'VENDOR_NOT_IN_ZONE', message: 'Vendor is not assigned to this booking\'s zone' });
    }

    // 2. Universal Model: All approved vendors in the zone provide all services

    // 3. Approval + active
    if (vendor.approvalStatus !== VENDOR_STATUS.APPROVED) {
      return res.status(400).json({ success: false, code: 'VENDOR_NOT_APPROVED', message: 'Vendor is not approved' });
    }
    if (!vendor.isActive) {
      return res.status(400).json({ success: false, code: 'VENDOR_INACTIVE', message: 'Vendor is not active' });
    }

    // 4. Radius (user booking location -> vendor location)
    if (typeof booking.address?.lat === 'number' && typeof booking.address?.lng === 'number') {
      const vLat = vendor.geoLocation?.coordinates?.[1] || vendor.location?.lat || vendor.address?.lat;
      const vLng = vendor.geoLocation?.coordinates?.[0] || vendor.location?.lng || vendor.address?.lng;
      if (typeof vLat === 'number' && typeof vLng === 'number') {
        const serviceDoc = await Service.findById(booking.serviceId).select('serviceRadiusKm').lean();
        const radiusKm = await resolveRadiusKm(serviceDoc || {});
        const effectiveRadius = Math.min(radiusKm, vendor.settings?.serviceRange || radiusKm);
        const distance = calculateDistance(
          { lat: booking.address.lat, lng: booking.address.lng },
          { lat: vLat, lng: vLng }
        );
        if (distance > effectiveRadius) {
          return res.status(400).json({
            success: false,
            code: 'VENDOR_OUTSIDE_RADIUS',
            message: `Vendor is ${distance.toFixed(1)}km away, outside the ${effectiveRadius}km matching radius`
          });
        }
      }
    }

    // 5. Booking conflict - same vendor, same scheduled date, already committed elsewhere
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      vendorId: vendor._id,
      scheduledDate: booking.scheduledDate,
      status: { $in: ['confirmed', 'accepted', 'assigned', 'journey_started', 'visited', 'in_progress'] }
    });
    if (conflict) {
      return res.status(400).json({ success: false, code: 'VENDOR_BOOKING_CONFLICT', message: `Vendor already has booking ${conflict.bookingNumber} on this date` });
    }

    booking.vendorId = vendor._id;
    booking.status = BOOKING_STATUS.ASSIGNED;
    booking.matchFailureReason = null;
    booking.assignedAt = new Date();
    await booking.save();

    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      await createNotification({
        vendorId: vendor._id,
        type: 'booking_request',
        title: 'New Booking Assigned',
        message: `An admin assigned booking ${booking.bookingNumber} (${booking.serviceName}) to you`,
        relatedId: booking._id,
        relatedType: 'booking'
      });
    } catch (notifyErr) {
      console.error('Assign vendor notification error:', notifyErr);
    }

    res.status(200).json({ success: true, message: 'Vendor assigned successfully', data: booking });
  } catch (error) {
    console.error('Assign vendor to booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign vendor' });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  cancelBooking,
  getBookingAnalytics,
  getEligibleVendorsForBooking,
  assignVendorToBooking
};


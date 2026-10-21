const Booking = require('../../models/Booking');
const Vendor = require('../../models/Vendor');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Zone = require('../../models/Zone');
const { validationResult } = require('express-validator');
const { BOOKING_STATUS, PAYMENT_STATUS, VENDOR_STATUS } = require('../../utils/constants');
const { findQualifiedVendors } = require('../../services/vendorMatchService');
const { cancelCouponUsage } = require('../../services/couponUsageService');
const { getAdminBookingCityFilter, getAdminVendorCityFilter } = require('../../utils/adminCityScope');

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
    const query = { ...getAdminBookingCityFilter(req) };

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

    const cityFilter = getAdminBookingCityFilter(req);
    const scopedQuery = Object.keys(cityFilter).length ? { $and: [query, cityFilter] } : query;
    const booking = await Booking.findOne(scopedQuery)
      .populate('userId', 'name phone email addresses')
      .populate('vendorId', 'name businessName phone email address approvalStatus profilePhoto')
      .populate('rejectedVendors', 'name businessName phone email')
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
    const now = new Date();
    const reason = cancellationReason || 'Cancelled by admin';
    const cityFilter = getAdminBookingCityFilter(req);

    // Atomically claim the cancellation. This prevents two admin requests from
    // both refunding the same paid booking.
    const previous = await Booking.findOneAndUpdate(
      {
        _id: id,
        ...cityFilter,
        status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED] }
      },
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledAt: now,
          cancelledBy: 'admin',
          cancellationReason: reason
        }
      },
      { new: false }
    ).lean();

    if (!previous) {
      const existing = await Booking.findOne({ _id: id, ...cityFilter }).lean();

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (existing.status === BOOKING_STATUS.CANCELLED) {
        return res.status(400).json({
          success: false,
          message: 'Booking is already cancelled'
        });
      }

      if (existing.status === BOOKING_STATUS.COMPLETED) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel completed booking'
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Booking could not be cancelled. Please refresh and try again.'
      });
    }

    // Paid bookings are refunded in full to the user's wallet. Unpaid and
    // plan-covered bookings are only cancelled and do not receive a refund.
    const isPaid = previous.paymentStatus === PAYMENT_STATUS.SUCCESS;
    const refundAmount = isPaid ? Number(previous.finalAmount || 0) : 0;
    let refundMessage = 'Booking cancelled successfully.';

    if (refundAmount > 0) {
      try {
        const user = await User.findByIdAndUpdate(
          previous.userId,
          { $inc: { 'wallet.balance': refundAmount } },
          { new: true }
        );

        if (!user) {
          throw new Error('User not found for refund');
        }

        const balanceAfter = Number(user.wallet?.balance || 0);
        await Transaction.create({
          userId: user._id,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          paymentMethod: 'wallet',
          description: `Refund for booking #${previous.bookingNumber} cancelled by admin`,
          bookingId: previous._id,
          balanceBefore: balanceAfter - refundAmount,
          balanceAfter,
          metadata: {
            cancelledBy: 'admin',
            cancellationReason: reason
          }
        });

        await Booking.updateOne(
          { _id: previous._id, status: BOOKING_STATUS.CANCELLED, cancelledBy: 'admin' },
          { $set: { paymentStatus: PAYMENT_STATUS.REFUNDED } }
        );

        refundMessage = `Booking cancelled successfully. ₹${refundAmount} has been added to the user's wallet.`;
      } catch (refundError) {
        console.error('[AdminCancelBooking] Refund failed, reverting cancellation:', refundError);
        await Booking.updateOne(
          { _id: previous._id, status: BOOKING_STATUS.CANCELLED, cancelledBy: 'admin' },
          {
            $set: { status: previous.status },
            $unset: { cancelledAt: '', cancelledBy: '', cancellationReason: '' }
          }
        );

        return res.status(500).json({
          success: false,
          message: 'Failed to refund the user payment, so the booking was not cancelled. Please try again.'
        });
      }
    }

    // Release the scheduled slot after the refund succeeds.
    if (previous.bookingType === 'scheduled' && previous.slotAssignment) {
      await Booking.updateOne(
        { _id: previous._id },
        { $set: { 'slotAssignment.state': 'RELEASED' } }
      );
    }

    // Remove pending vendor offers and make the vendor available when no other
    // active job is keeping them busy.
    try {
      const BookingRequest = require('../../models/BookingRequest');
      await BookingRequest.deleteMany({ bookingId: previous._id });

      if (previous.vendorId) {
        const stillBusy = await Booking.exists({
          _id: { $ne: previous._id },
          vendorId: previous.vendorId,
          $or: [
            {
              status: {
                $in: [
                  BOOKING_STATUS.JOURNEY_STARTED,
                  BOOKING_STATUS.VISITED,
                  BOOKING_STATUS.IN_PROGRESS,
                  BOOKING_STATUS.WORK_DONE
                ]
              }
            },
            {
              bookingType: { $ne: 'scheduled' },
              status: {
                $in: [
                  BOOKING_STATUS.CONFIRMED,
                  BOOKING_STATUS.ACCEPTED,
                  BOOKING_STATUS.ASSIGNED,
                  BOOKING_STATUS.AWAITING_PAYMENT
                ]
              }
            }
          ]
        });

        if (!stillBusy) {
          await Vendor.findByIdAndUpdate(previous.vendorId, { availability: 'AVAILABLE' });
        }
      }
    } catch (releaseError) {
      console.error('[AdminCancelBooking] Error releasing vendor/requests:', releaseError);
    }

    // Restore coupon capacity exactly once if a coupon was used.
    if (previous.coupon?.couponId) {
      try {
        await cancelCouponUsage(previous._id);
      } catch (couponError) {
        console.error('[AdminCancelBooking] Error restoring coupon usage:', couponError);
      }
    }

    // Inform the affected parties without allowing a notification failure to
    // turn a successful cancellation/refund into a failed API response.
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      await createNotification({
        userId: previous.userId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled by Admin',
        message: refundMessage,
        relatedId: previous._id,
        relatedType: 'booking',
        pushData: {
          type: 'booking_cancelled',
          bookingId: previous._id.toString(),
          link: `/user/booking/${previous._id}`
        }
      });

      if (previous.vendorId) {
        await createNotification({
          vendorId: previous.vendorId,
          type: 'booking_cancelled',
          title: 'Booking Cancelled by Admin',
          message: `Booking ${previous.bookingNumber} has been cancelled by admin.`,
          relatedId: previous._id,
          relatedType: 'booking',
          pushData: {
            type: 'booking_cancelled',
            bookingId: previous._id.toString(),
            link: `/vendor/bookings/${previous._id}`
          }
        });
      }

      if (previous.workerId) {
        await createNotification({
          workerId: previous.workerId,
          type: 'booking_cancelled',
          title: 'Booking Cancelled by Admin',
          message: `Job ${previous.bookingNumber} has been cancelled by admin.`,
          relatedId: previous._id,
          relatedType: 'booking',
          pushData: {
            type: 'job_cancelled',
            bookingId: previous._id.toString(),
            link: `/worker/job/${previous._id}`
          }
        });
      }
    } catch (notificationError) {
      console.error('[AdminCancelBooking] Notification error:', notificationError);
    }

    const booking = await Booking.findById(previous._id);

    res.status(200).json({
      success: true,
      message: refundMessage,
      refundAmount,
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
    const dateFilter = { ...getAdminBookingCityFilter(req) };
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
 * Zone -> service -> availability candidate list for a specific booking,
 * using the SAME pipeline booking creation and dispatch use
 * (vendorMatchService.findQualifiedVendors). Lets an admin see exactly who
 * is eligible before manually assigning a vendor to a PENDING_ADMIN booking.
 */
const getEligibleVendorsForBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, ...getAdminBookingCityFilter(req) }).lean();
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

    const { vendors, reason, debug } = await findQualifiedVendors({
      zone,
      serviceTitle: booking.serviceName || booking.serviceCategory
    });

    res.status(200).json({
      success: true,
      zone: { id: zone._id, name: zone.name },
      reason,
      debug,
      vendors: vendors.map(v => ({
        id: v._id,
        name: v.name,
        businessName: v.businessName,
        phone: v.phone,
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
 * PENDING_ADMIN because automatic zone/service/availability matching found no
 * candidates). Re-validates zone/service/approval/active/conflict
 * server-side - never trusts that the admin's UI list is still accurate.
 */
const assignVendorToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'vendorId is required' });
    }

    const booking = await Booking.findOne({ _id: id, ...getAdminBookingCityFilter(req) });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if ([BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot assign a vendor to a ${booking.status} booking` });
    }
    if (!booking.zoneId) {
      return res.status(400).json({ success: false, message: 'Booking has no resolved zone' });
    }

    const vendor = await Vendor.findOne({ _id: vendorId, ...getAdminVendorCityFilter(req) });
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

    // 4. Booking conflict - same vendor, same scheduled date, already committed elsewhere
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

      // Also notify user that vendor has been assigned
      await createNotification({
        userId: booking.userId,
        type: 'booking_accepted',
        title: 'Booking Assigned!',
        message: `Your booking ${booking.bookingNumber} has been assigned to ${vendor.businessName || vendor.name}.`,
        relatedId: booking._id,
        relatedType: 'booking'
      });

      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io && booking.userId) {
        io.to(`user_${booking.userId}`).emit('booking_accepted', {
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          vendor: {
            id: vendor._id,
            name: vendor.name,
            businessName: vendor.businessName
          },
          message: `Your booking ${booking.bookingNumber} has been assigned to ${vendor.businessName || vendor.name}.`
        });
        io.to(`user_${booking.userId}`).emit('booking_updated', {
          bookingId: booking._id,
          status: booking.status,
          message: `Your booking ${booking.bookingNumber} has been assigned to ${vendor.businessName || vendor.name}.`
        });
      }
    } catch (notifyErr) {
      console.error('Assign vendor notification/socket error:', notifyErr);
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


const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Booking = require('../../models/Booking');
const Withdrawal = require('../../models/Withdrawal');
const Settlement = require('../../models/Settlement');
const { BOOKING_STATUS, PAYMENT_STATUS, VENDOR_STATUS } = require('../../utils/constants');

/**
 * Get overall dashboard stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Total counts (filtered by creation date if provided)
    const totalUsers = await User.countDocuments({ isActive: true, ...dateFilter });
    const totalVendors = await Vendor.countDocuments({ isActive: true, ...dateFilter });
    const totalWorkers = await Vendor.countDocuments({ role: 'worker', ...dateFilter });
    const totalBookings = await Booking.countDocuments(dateFilter);

    // Booking stats
    const pendingBookings = await Booking.countDocuments({
      ...dateFilter,
      status: { $nin: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED, 'completed', 'cancelled', 'rejected'] }
    });
    const completedBookings = await Booking.countDocuments({
      ...dateFilter,
      status: { $in: [BOOKING_STATUS.COMPLETED, 'completed', 'work_done'] }
    });
    const cancelledBookings = await Booking.countDocuments({
      ...dateFilter,
      status: { $in: [BOOKING_STATUS.CANCELLED, 'cancelled', 'rejected'] }
    });

    // Revenue stats
    const revenueResult = await Booking.aggregate([
      {
        $match: {
          $or: [
            { status: { $in: [BOOKING_STATUS.COMPLETED, 'completed', 'work_done'] } },
            { paymentStatus: { $in: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.COLLECTED_BY_VENDOR, 'success', 'collected_by_vendor', 'collected_by_worker', 'paid'] } }
          ],
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$finalAmount', '$basePrice', 0] } },
          totalBookings: { $sum: 1 }
        }
      }
    ]);

    const revenue = revenueResult[0] || { totalRevenue: 0, totalBookings: 0 };
    const platformCommission = revenue.totalRevenue * 0.2; // 20% commission

    // Vendor approval stats
    const pendingVendors = await Vendor.countDocuments({ approvalStatus: VENDOR_STATUS.PENDING, ...dateFilter });
    const approvedVendors = await Vendor.countDocuments({ approvalStatus: VENDOR_STATUS.APPROVED, ...dateFilter });

    // Withdrawal & Settlement stats
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending', ...dateFilter });
    const pendingSettlementsCount = await Settlement.countDocuments({ status: 'pending', ...dateFilter });

    // Recent activities (filtered by period)
    const recentActivityDocs = await Booking.find(dateFilter)
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone')
      .populate('serviceId', 'title name')
      .sort({ createdAt: -1 })
      .limit(50);

    const recentBookings = recentActivityDocs.map(b => ({
      id: b.bookingNumber || String(b._id),
      _id: b._id,
      status: b.status,
      user: { name: b.userId?.name || 'Customer', phone: b.userId?.phone || '', email: b.userId?.email || '' },
      vendor: { name: b.vendorId?.name || b.vendorId?.businessName || 'Unassigned' },
      serviceType: b.serviceId?.title || b.serviceId?.name || b.serviceName || b.bookedItems?.[0]?.serviceName || b.serviceCategory || 'Service',
      price: b.finalAmount || b.basePrice || 0,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt,
      acceptedAt: b.acceptedAt,
      assignedAt: b.assignedAt,
      visitedAt: b.visitedAt,
      completedAt: b.completedAt || b.visitedAt || b.createdAt,
      workerPaymentStatus: b.workerPaymentStatus
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalVendors,
          totalWorkers,
          totalBookings,
          pendingBookings,
          completedBookings,
          cancelledBookings,
          totalRevenue: revenue.totalRevenue,
          platformCommission,
          pendingVendors,
          approvedVendors,
          pendingWithdrawals,
          pendingSettlements: pendingSettlementsCount
        },
        recentBookings
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats. Please try again.'
    });
  }
};

/**
 * Get revenue analytics
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    const groupFormat = period === 'monthly' || period === 'year' ? '%Y-%m' : '%Y-%m-%d';

    // Build date filter
    const matchFilter = {};
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchFilter.createdAt.$lte = end;
      }
    }

    // Revenue analytics aggregated from bookings
    const aggregated = await Booking.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt'
            }
          },
          revenue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $in: ['$status', [BOOKING_STATUS.COMPLETED, 'completed', 'work_done']] },
                    { $in: ['$paymentStatus', [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.COLLECTED_BY_VENDOR, 'success', 'collected_by_vendor', 'collected_by_worker', 'paid']] }
                  ]
                },
                { $ifNull: ['$finalAmount', '$basePrice', 0] },
                0
              ]
            }
          },
          bookings: { $sum: 1 },
          platformCommission: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $in: ['$status', [BOOKING_STATUS.COMPLETED, 'completed', 'work_done']] },
                    { $in: ['$paymentStatus', [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.COLLECTED_BY_VENDOR, 'success', 'collected_by_vendor', 'collected_by_worker', 'paid']] }
                  ]
                },
                { $multiply: [{ $ifNull: ['$finalAmount', '$basePrice', 0] }, 0.2] },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const resultMap = new Map();
    aggregated.forEach(item => {
      if (item._id) resultMap.set(item._id, item);
    });

    // Fill continuous series across the date range so charts render smoothly
    const revenueData = [];
    const curr = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = new Date(endDate || Date.now());

    if (groupFormat === '%Y-%m') {
      let d = new Date(curr.getFullYear(), curr.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (d <= endMonth) {
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        const existing = resultMap.get(key);
        revenueData.push({
          _id: key,
          revenue: existing ? existing.revenue : 0,
          bookings: existing ? existing.bookings : 0,
          platformCommission: existing ? existing.platformCommission : 0
        });
        d.setMonth(d.getMonth() + 1);
      }
    } else {
      let d = new Date(curr);
      d.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);

      while (d <= endDay) {
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const existing = resultMap.get(key);
        revenueData.push({
          _id: key,
          revenue: existing ? existing.revenue : 0,
          bookings: existing ? existing.bookings : 0,
          platformCommission: existing ? existing.platformCommission : 0
        });
        d.setDate(d.getDate() + 1);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        period,
        revenueData
      }
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics. Please try again.'
    });
  }
};

/**
 * Get booking trends
 */
const getBookingTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Daily booking trends
    const trends = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0]
            }
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        days: parseInt(days),
        trends
      }
    });
  } catch (error) {
    console.error('Get booking trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking trends. Please try again.'
    });
  }
};

/**
 * Get user growth metrics
 */
const getUserGrowthMetrics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // User growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Vendor growth
    const vendorGrowth = await Vendor.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        days: parseInt(days),
        userGrowth,
        vendorGrowth
      }
    });
  } catch (error) {
    console.error('Get user growth metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user growth metrics. Please try again.'
    });
  }
};

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getBookingTrends,
  getUserGrowthMetrics
};


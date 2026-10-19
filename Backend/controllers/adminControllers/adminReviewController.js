const Review = require('../../models/Review');
const Booking = require('../../models/Booking');
const mongoose = require('mongoose');

/**
 * Sync reviews from bookings if not already in Review collection
 */
const syncBookingReviews = async () => {
  try {
    const bookingsWithReviews = await Booking.find({
      rating: { $exists: true, $ne: null, $gt: 0 }
    });

    for (const booking of bookingsWithReviews) {
      const exists = await Review.findOne({ bookingId: booking._id });
      if (!exists) {
        await Review.create({
          bookingId: booking._id,
          userId: booking.userId,
          serviceId: booking.serviceId || null,
          vendorId: booking.vendorId || null,
          workerId: booking.workerId || null,
          rating: booking.rating,
          review: booking.review || '',
          images: booking.reviewImages || [],
          status: 'active',
          createdAt: booking.reviewedAt || booking.updatedAt || new Date()
        }).catch(err => console.error('Review sync item error:', err));
      }
    }
  } catch (err) {
    console.error('Error during auto-sync of reviews:', err);
  }
};

/**
 * Get all reviews with pagination, search, and filters
 */
exports.getAllReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      rating,
      search,
      vendorId,
      serviceId,
      userId
    } = req.query;

    await syncBookingReviews();

    const query = {};
    if (status && status !== 'All Status' && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $ne: 'deleted' };
    }

    if (rating && rating !== 'All Ratings') {
      query.rating = parseInt(rating);
    }
    if (vendorId) query.vendorId = vendorId;
    if (serviceId) query.serviceId = serviceId;
    if (userId) query.userId = userId;

    if (search) {
      const searchRegex = new RegExp(search, 'i');

      const User = require('../../models/User');
      const Vendor = require('../../models/Vendor');
      const Service = require('../../models/Service');

      const [matchingUserIds, matchingVendorIds, matchingServiceIds, matchingBookingIds] = await Promise.all([
        User.find({
          $or: [
            { name: searchRegex },
            { phone: searchRegex },
            { email: searchRegex }
          ]
        }).distinct('_id'),
        Vendor.find({
          $or: [
            { businessName: searchRegex },
            { name: searchRegex },
            { phone: searchRegex }
          ]
        }).distinct('_id'),
        Service.find({
          title: searchRegex
        }).distinct('_id'),
        Booking.find({
          $or: [
            { bookingNumber: searchRegex },
            { customerName: searchRegex },
            { serviceName: searchRegex }
          ]
        }).distinct('_id')
      ]);

      query.$or = [
        { review: searchRegex },
        { userId: { $in: matchingUserIds } },
        { vendorId: { $in: matchingVendorIds } },
        { serviceId: { $in: matchingServiceIds } },
        { bookingId: { $in: matchingBookingIds } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(query)
      .populate('userId', 'name phone email profilePhoto')
      .populate('vendorId', 'businessName name phone')
      .populate('serviceId', 'title iconUrl')
      .populate('bookingId', 'bookingNumber status serviceName customerName customerPhone scheduledDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)) || 1
      }
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

/**
 * Update review status (active, hidden, deleted)
 */
exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'hidden', 'deleted'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Review status updated to ${status}`,
      data: review
    });
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review status'
    });
  }
};

/**
 * Get review statistics
 */
exports.getReviewStats = async (req, res) => {
  try {
    await syncBookingReviews();

    const stats = await Review.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        }
      }
    ]);

    const activeCount = await Review.countDocuments({ status: 'active' });
    const hiddenCount = await Review.countDocuments({ status: 'hidden' });

    const defaultStats = {
      averageRating: 0,
      totalReviews: 0,
      star5: 0,
      star4: 0,
      star3: 0,
      star2: 0,
      star1: 0,
      activeReviews: 0,
      hiddenReviews: 0
    };

    const resultStats = stats[0] ? {
      ...stats[0],
      averageRating: Number((stats[0].averageRating || 0).toFixed(1)),
      activeReviews: activeCount,
      hiddenReviews: hiddenCount
    } : defaultStats;

    res.status(200).json({
      success: true,
      stats: resultStats
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review statistics'
    });
  }
};

/**
 * Get vendor rating trends for the admin analytics panel.
 * Week mode shows the last 8 weekly averages; month mode shows the last 6 monthly averages.
 * Custom mode accepts fromDate/toDate and uses a readable day/week/month grouping.
 */
exports.getVendorRatingAnalytics = async (req, res) => {
  try {
    const { vendorId, period = 'week', fromDate, toDate } = req.query;

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid vendor is required.'
      });
    }

    await syncBookingReviews();

    const selectedPeriod = ['month', 'custom'].includes(period) ? period : 'week';
    const now = new Date();
    let startDate;
    let endDate = now;

    if (selectedPeriod === 'custom') {
      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          message: 'fromDate and toDate are required for a custom range.'
        });
      }

      startDate = new Date(`${fromDate}T00:00:00.000+05:30`);
      endDate = new Date(`${toDate}T23:59:59.999+05:30`);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: 'A valid custom date range is required.'
        });
      }
      if (endDate > now) endDate = now;
    } else if (selectedPeriod === 'month') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 5, 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (8 * 7));
      startDate.setHours(0, 0, 0, 0);
    }

    const rangeDays = Math.max(1, Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)));
    const trendUnit = selectedPeriod === 'custom'
      ? (rangeDays <= 45 ? 'day' : rangeDays <= 180 ? 'week' : 'month')
      : selectedPeriod;
    const periodStartExpression = {
      date: '$createdAt',
      unit: trendUnit,
      binSize: 1,
      timezone: 'Asia/Kolkata'
    };
    if (trendUnit === 'week') {
      periodStartExpression.startOfWeek = 'monday';
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const rangeMatch = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const [result] = await Review.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          status: 'active',
          rating: { $gte: 1, $lte: 5 }
        }
      },
      {
        $facet: {
          overallSummary: [
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
              }
            }
          ],
          rangeSummary: [
            { $match: rangeMatch },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
              }
            }
          ],
          trend: [
            { $match: rangeMatch },
            {
              $group: {
                _id: {
                  $dateTrunc: {
                    ...periodStartExpression
                  }
                },
                averageRating: { $avg: '$rating' },
                reviews: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);

    const overallSummary = result?.overallSummary?.[0] || { averageRating: 0, totalReviews: 0 };
    const rangeSummary = result?.rangeSummary?.[0] || { averageRating: 0, totalReviews: 0 };
    const trend = (result?.trend || []).map(item => ({
      periodStart: item._id,
      averageRating: Number((item.averageRating || 0).toFixed(2)),
      reviews: item.reviews || 0
    }));

    const reviewDetails = await Review.find({
      vendorId: vendorObjectId,
      status: 'active',
      rating: { $gte: 1, $lte: 5 },
      ...rangeMatch
    })
      .populate('userId', 'name phone email profilePhoto')
      .populate('serviceId', 'title')
      .populate('bookingId', 'bookingNumber status serviceName scheduledDate')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      data: {
        vendorId,
        period: selectedPeriod,
        trendUnit,
        fromDate: startDate,
        toDate: endDate,
        averageRating: Number((rangeSummary.averageRating || 0).toFixed(1)),
        totalReviews: rangeSummary.totalReviews || 0,
        overallAverageRating: Number((overallSummary.averageRating || 0).toFixed(1)),
        overallTotalReviews: overallSummary.totalReviews || 0,
        trend,
        reviewDetails
      }
    });
  } catch (error) {
    console.error('Get vendor rating analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor rating analytics'
    });
  }
};

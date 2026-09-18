const Review = require('../../models/Review');
const Booking = require('../../models/Booking');

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
      query.$or = [
        { review: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(query)
      .populate('userId', 'name phone email profilePhoto')
      .populate('vendorId', 'businessName name phone')
      .populate('serviceId', 'title iconUrl')
      .populate('bookingId', 'bookingNumber status serviceName customerName customerPhone')
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

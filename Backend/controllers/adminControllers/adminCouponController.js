const Coupon = require('../../models/Coupon');
const CouponUsage = require('../../models/CouponUsage');
const Booking = require('../../models/Booking');
const User = require('../../models/User');

/**
 * Get all coupons with search, status filters, and pagination
 * GET /api/admin/coupons
 */
const getCoupons = async (req, res) => {
  try {
    const {
      search,
      status, // 'active', 'inactive', 'expired'
      discountType,
      page = 1,
      limit = 20
    } = req.query;

    const query = { isDeleted: false };

    // Search by code or title
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    const now = new Date();
    if (status === 'active') {
      query.isActive = true;
      query.expiresAt = { $gte: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.expiresAt = { $lt: now };
    }

    if (discountType) {
      query.discountType = discountType.toUpperCase();
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .populate('applicableCategories', 'title slug')
        .populate('applicableServices', 'title')
        .populate('applicableCities', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Coupon.countDocuments(query)
    ]);

    // Summary statistics
    const stats = await Coupon.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalCoupons: { $sum: 1 },
          activeCoupons: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $gte: ['$expiresAt', now] }] }, 1, 0]
            }
          },
          totalRedemptions: { $sum: '$usedCount' }
        }
      }
    ]);

    // Total discount given across all consumed usages
    const discountStats = await CouponUsage.aggregate([
      { $match: { status: 'CONSUMED' } },
      { $group: { _id: null, totalDiscountDistributed: { $sum: '$discountAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        coupons,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        },
        stats: {
          totalCoupons: stats[0]?.totalCoupons || 0,
          activeCoupons: stats[0]?.activeCoupons || 0,
          totalRedemptions: stats[0]?.totalRedemptions || 0,
          totalDiscountDistributed: discountStats[0]?.totalDiscountDistributed || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons',
      error: error.message
    });
  }
};

/**
 * Get coupon by ID
 * GET /api/admin/coupons/:id
 */
const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, isDeleted: false })
      .populate('applicableCategories', 'title slug icon')
      .populate('applicableServices', 'title basePrice')
      .populate('applicableCities', 'name');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon',
      error: error.message
    });
  }
};

/**
 * Create a new coupon
 * POST /api/admin/coupons
 */
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderAmount,
      usageLimit,
      perUserLimit,
      startAt,
      expiresAt,
      applicableServices,
      applicableCategories,
      applicableCities,
      applicableProviders,
      firstOrderOnly,
      newUserOnly,
      allowedPaymentMethods,
      stackable,
      isActive
    } = req.body;

    if (!code || !title || !discountType || discountValue === undefined || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required coupon fields (code, title, discountType, discountValue, expiresAt)'
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check duplicate code
    const existing = await Coupon.findOne({ code: normalizedCode, isDeleted: false });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Coupon with code "${normalizedCode}" already exists`
      });
    }

    if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount must be between 1% and 100%'
      });
    }

    if (discountType === 'FIXED' && discountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Fixed discount amount must be greater than 0'
      });
    }

    if (startAt && expiresAt && new Date(startAt) >= new Date(expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be after start date'
      });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      title: title.trim(),
      description: description ? description.trim() : '',
      discountType: discountType.toUpperCase(),
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
      startAt: startAt ? new Date(startAt) : new Date(),
      expiresAt: new Date(expiresAt),
      applicableServices: applicableServices || [],
      applicableCategories: applicableCategories || [],
      applicableCities: applicableCities || [],
      applicableProviders: applicableProviders || [],
      firstOrderOnly: Boolean(firstOrderOnly),
      newUserOnly: Boolean(newUserOnly),
      allowedPaymentMethods: allowedPaymentMethods || [],
      stackable: Boolean(stackable),
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create coupon',
      error: error.message
    });
  }
};

/**
 * Update existing coupon
 * PUT /api/admin/coupons/:id
 */
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, isDeleted: false });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderAmount,
      usageLimit,
      perUserLimit,
      startAt,
      expiresAt,
      applicableServices,
      applicableCategories,
      applicableCities,
      applicableProviders,
      firstOrderOnly,
      newUserOnly,
      allowedPaymentMethods,
      stackable,
      isActive
    } = req.body;

    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode !== coupon.code) {
        const existing = await Coupon.findOne({
          code: normalizedCode,
          _id: { $ne: coupon._id },
          isDeleted: false
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Coupon code "${normalizedCode}" is already taken`
          });
        }
        coupon.code = normalizedCode;
      }
    }

    if (title !== undefined) coupon.title = title.trim();
    if (description !== undefined) coupon.description = description ? description.trim() : '';
    if (discountType !== undefined) coupon.discountType = discountType.toUpperCase();
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount ? Number(minOrderAmount) : 0;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (perUserLimit !== undefined) coupon.perUserLimit = perUserLimit ? Number(perUserLimit) : 1;
    if (startAt !== undefined) coupon.startAt = new Date(startAt);
    if (expiresAt !== undefined) coupon.expiresAt = new Date(expiresAt);
    if (applicableServices !== undefined) coupon.applicableServices = applicableServices;
    if (applicableCategories !== undefined) coupon.applicableCategories = applicableCategories;
    if (applicableCities !== undefined) coupon.applicableCities = applicableCities;
    if (applicableProviders !== undefined) coupon.applicableProviders = applicableProviders;
    if (firstOrderOnly !== undefined) coupon.firstOrderOnly = Boolean(firstOrderOnly);
    if (newUserOnly !== undefined) coupon.newUserOnly = Boolean(newUserOnly);
    if (allowedPaymentMethods !== undefined) coupon.allowedPaymentMethods = allowedPaymentMethods;
    if (stackable !== undefined) coupon.stackable = Boolean(stackable);
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);

    await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon',
      error: error.message
    });
  }
};

/**
 * Toggle Active status
 * PATCH /api/admin/coupons/:id/toggle-status
 */
const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, isDeleted: false });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: coupon._id,
        code: coupon.code,
        isActive: coupon.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle coupon status',
      error: error.message
    });
  }
};

/**
 * Soft delete coupon
 * DELETE /api/admin/coupons/:id
 */
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, isDeleted: false });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isDeleted = true;
    coupon.isActive = false;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon archived / deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon',
      error: error.message
    });
  }
};

/**
 * Get usage history and audit records for a coupon
 * GET /api/admin/coupons/:id/usage
 */
const getCouponUsageHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const coupon = await Coupon.findById(req.params.id).select('code title discountType discountValue');
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const [usages, total] = await Promise.all([
      CouponUsage.find({ couponId: req.params.id })
        .populate('userId', 'name phone email')
        .populate('bookingId', 'bookingNumber status paymentStatus finalAmount createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CouponUsage.countDocuments({ couponId: req.params.id })
    ]);

    res.status(200).json({
      success: true,
      data: {
        coupon,
        usages,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching coupon usage history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon usage history',
      error: error.message
    });
  }
};

module.exports = {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCouponUsageHistory
};

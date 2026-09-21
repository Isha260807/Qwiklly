const Coupon = require('../../models/Coupon');
const CouponUsage = require('../../models/CouponUsage');
const User = require('../../models/User');
const { calculateBookingPrice, validateCouponApplicability } = require('../../services/pricingService');

/**
 * Get available active coupons for a user and optional cart context
 * GET /api/coupons/available
 */
const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const now = new Date();

    // 1. Run Coupon find and User CouponUsage find in parallel in ONE round-trip
    const [coupons, userUsages] = await Promise.all([
      Coupon.find({
        isActive: true,
        isDeleted: false,
        startAt: { $lte: now },
        expiresAt: { $gte: now }
      })
        .populate('applicableCategories', 'title slug icon')
        .populate('applicableServices', 'title basePrice')
        .populate('applicableCities', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      userId
        ? CouponUsage.find({
            userId,
            status: { $in: ['CONSUMED', 'APPLIED'] }
          })
            .select('couponId')
            .lean()
        : Promise.resolve([])
    ]);

    // 2. Build in-memory usage map: couponId -> count (O(1) lookup)
    const usageCountMap = new Map();
    for (const u of userUsages) {
      const idStr = u.couponId ? u.couponId.toString() : '';
      if (idStr) {
        usageCountMap.set(idStr, (usageCountMap.get(idStr) || 0) + 1);
      }
    }

    // 3. Fast in-memory evaluation for each coupon (0ms)
    const cartAmount = Number(req.query.amount) || 0;

    const enrichedCoupons = coupons.map((coupon) => {
      let isEligible = true;
      let reason = null;

      // Global limit check
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        isEligible = false;
        reason = 'Usage limit exhausted';
      }

      // User limit check (from memory map)
      if (isEligible && userId) {
        const userCount = usageCountMap.get(coupon._id.toString()) || 0;
        const perUserLimit = coupon.perUserLimit || 1;
        if (userCount >= perUserLimit) {
          isEligible = false;
          reason = `Limit of ${perUserLimit} use(s) reached`;
        }
      }

      // Min order check
      if (isEligible && cartAmount > 0 && cartAmount < (coupon.minOrderAmount || 0)) {
        isEligible = false;
        reason = `Add items worth ₹${(coupon.minOrderAmount - cartAmount)} more to use this coupon`;
      }

      return {
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        minOrderAmount: coupon.minOrderAmount,
        expiresAt: coupon.expiresAt,
        firstOrderOnly: coupon.firstOrderOnly,
        newUserOnly: coupon.newUserOnly,
        applicableCategories: coupon.applicableCategories,
        applicableServices: coupon.applicableServices,
        applicableCities: coupon.applicableCities,
        isEligible,
        ineligibilityReason: reason
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedCoupons.length,
      coupons: enrichedCoupons
    });
  } catch (error) {
    console.error('Error fetching available coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available coupons',
      error: error.message
    });
  }
};

/**
 * Apply a coupon and get verified server-side calculation
 * POST /api/coupons/apply
 */
const applyCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code, bookedItems, serviceId, address, paymentMethod, visitingCharges } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Execute verified calculation via pricingService
    const pricing = await calculateBookingPrice({
      user,
      bookedItems: bookedItems || [],
      serviceId,
      couponCode: code.trim().toUpperCase(),
      address,
      paymentMethod: paymentMethod || 'online',
      visitingChargesOverride: visitingCharges
    });

    if (pricing.couponValidationError) {
      return res.status(400).json({
        success: false,
        code: pricing.couponValidationError.code || 'COUPON_INVALID',
        message: pricing.couponValidationError.error || 'Coupon cannot be applied',
        pricing: {
          basePrice: pricing.basePrice,
          tax: pricing.tax,
          visitingCharges: pricing.visitingCharges,
          penalty: pricing.pendingPenalty,
          finalAmount: pricing.finalAmount
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `Coupon "${pricing.couponInfo.code}" applied successfully! You saved ₹${pricing.couponDiscount}`,
      coupon: pricing.couponInfo,
      pricing: {
        basePrice: pricing.basePrice,
        planDiscount: pricing.planDiscount,
        couponDiscount: pricing.couponDiscount,
        totalDiscount: pricing.totalDiscount,
        taxableAmount: pricing.taxableAmount,
        tax: pricing.tax,
        gstPercentage: pricing.gstPercentage,
        visitingCharges: pricing.visitingCharges,
        penalty: pricing.pendingPenalty,
        finalAmount: pricing.finalAmount,
        isFreeUnderPlan: pricing.isFreeUnderPlan
      }
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon',
      error: error.message
    });
  }
};

/**
 * Remove coupon and restore standard pricing calculation
 * POST /api/coupons/remove
 */
const removeCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookedItems, serviceId, address, paymentMethod, visitingCharges } = req.body;

    const user = await User.findById(userId);

    const pricing = await calculateBookingPrice({
      user,
      bookedItems: bookedItems || [],
      serviceId,
      couponCode: null, // No coupon
      address,
      paymentMethod: paymentMethod || 'online',
      visitingChargesOverride: visitingCharges
    });

    res.status(200).json({
      success: true,
      message: 'Coupon removed',
      pricing: {
        basePrice: pricing.basePrice,
        planDiscount: pricing.planDiscount,
        couponDiscount: 0,
        totalDiscount: pricing.planDiscount,
        taxableAmount: pricing.taxableAmount,
        tax: pricing.tax,
        gstPercentage: pricing.gstPercentage,
        visitingCharges: pricing.visitingCharges,
        penalty: pricing.pendingPenalty,
        finalAmount: pricing.finalAmount,
        isFreeUnderPlan: pricing.isFreeUnderPlan
      }
    });
  } catch (error) {
    console.error('Error removing coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove coupon',
      error: error.message
    });
  }
};

module.exports = {
  getAvailableCoupons,
  applyCoupon,
  removeCoupon
};

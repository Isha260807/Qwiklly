const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Booking = require('../models/Booking');
const Settings = require('../models/Settings');
const Service = require('../models/UserService');
const Category = require('../models/Category');
const Plan = require('../models/Plan');

// In-memory cache for Global Settings (60s TTL)
let cachedSettings = null;
let cachedSettingsExpiry = 0;

const getGlobalSettings = async () => {
  const now = Date.now();
  if (cachedSettings && now < cachedSettingsExpiry) {
    return cachedSettings;
  }
  try {
    const settings = await Settings.findOne({ type: 'global' }).lean();
    cachedSettings = settings || { visitedCharges: 29, serviceGstPercentage: 18 };
    cachedSettingsExpiry = now + 60 * 1000; // 60 seconds
  } catch (err) {
    cachedSettings = { visitedCharges: 29, serviceGstPercentage: 18 };
  }
  return cachedSettings;
};

/**
 * Validates whether a coupon can be applied to a specific user and order context
 * Returns { valid: boolean, error?: string, code?: string, discountAmount?: number }
 */
const validateCouponApplicability = async ({
  coupon,
  user,
  orderAmount,
  bookedItems = [],
  service = null,
  category = null,
  address = null,
  paymentMethod = null
}) => {
  if (!coupon) {
    return { valid: false, code: 'COUPON_NOT_FOUND', error: 'Coupon not found' };
  }

  if (coupon.isDeleted || !coupon.isActive) {
    return { valid: false, code: 'COUPON_INACTIVE', error: 'This coupon is no longer active' };
  }

  const now = new Date();
  if (coupon.startAt && new Date(coupon.startAt) > now) {
    return { valid: false, code: 'COUPON_NOT_STARTED', error: 'This coupon offer has not started yet' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return { valid: false, code: 'COUPON_EXPIRED', error: 'This coupon has expired' };
  }

  // 1. Check Global Usage Limit
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageLimit > 0) {
    if (coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, code: 'COUPON_USAGE_LIMIT_REACHED', error: 'Coupon usage limit has been exhausted' };
    }
  }

  // 2. Minimum Order Amount Check
  const minOrder = Number(coupon.minOrderAmount) || 0;
  if (orderAmount < minOrder) {
    return {
      valid: false,
      code: 'MINIMUM_AMOUNT_NOT_MET',
      error: `Minimum booking amount of ₹${minOrder} required to apply this coupon`
    };
  }

  // 3. Payment Method Restrictions
  if (coupon.allowedPaymentMethods && coupon.allowedPaymentMethods.length > 0) {
    if (!coupon.allowedPaymentMethods.includes('all') && paymentMethod) {
      const normalizedMethod = paymentMethod.toLowerCase();
      if (!coupon.allowedPaymentMethods.includes(normalizedMethod)) {
        return {
          valid: false,
          code: 'PAYMENT_METHOD_NOT_ALLOWED',
          error: `This coupon cannot be applied with ${paymentMethod} payment`
        };
      }
    }
  }

  // 4. Category Restrictions
  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    const allowedCatIds = coupon.applicableCategories.map(id => id.toString());
    let matchesCategory = false;

    if (category && category._id && allowedCatIds.includes(category._id.toString())) {
      matchesCategory = true;
    }

    if (service && service.categoryId && allowedCatIds.includes(service.categoryId.toString())) {
      matchesCategory = true;
    }

    if (!matchesCategory) {
      return {
        valid: false,
        code: 'CATEGORY_NOT_ELIGIBLE',
        error: 'This coupon is not applicable to the selected service category'
      };
    }
  }

  // 5. Service Restrictions
  if (coupon.applicableServices && coupon.applicableServices.length > 0) {
    const allowedServiceIds = coupon.applicableServices.map(id => id.toString());
    let matchesService = false;

    if (service && service._id && allowedServiceIds.includes(service._id.toString())) {
      matchesService = true;
    }

    if (bookedItems && bookedItems.length > 0) {
      const hasMatchingItem = bookedItems.some(item => {
        const itemSvcId = (item.serviceId?._id || item.serviceId || item.id || item._id)?.toString();
        return itemSvcId && allowedServiceIds.includes(itemSvcId);
      });
      if (hasMatchingItem) matchesService = true;
    }

    if (!matchesService) {
      return {
        valid: false,
        code: 'SERVICE_NOT_ELIGIBLE',
        error: 'This coupon is not applicable to the selected service'
      };
    }
  }

  // 6. Parallel async checks (User Usage, First Order, City) in ONE round-trip
  const asyncChecks = [];

  // Check Per-User Limit
  const checkUserLimit = user && user._id ? CouponUsage.countDocuments({
    couponId: coupon._id,
    userId: user._id,
    status: { $in: ['CONSUMED', 'APPLIED'] }
  }) : Promise.resolve(0);
  asyncChecks.push(checkUserLimit);

  // Check First Order
  const checkFirstOrder = (coupon.firstOrderOnly && user && user._id) ? Booking.countDocuments({
    userId: user._id,
    status: { $in: ['confirmed', 'completed', 'in_progress', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
    paymentStatus: { $in: ['paid', 'success'] }
  }) : Promise.resolve(0);
  asyncChecks.push(checkFirstOrder);

  // Check City if restricted
  const checkCity = (coupon.applicableCities && coupon.applicableCities.length > 0 && address && address.city)
    ? require('../models/City').find({ _id: { $in: coupon.applicableCities } }).select('name').lean()
    : Promise.resolve(null);
  asyncChecks.push(checkCity);

  const [userUsageCount, previousOrdersCount, allowedCities] = await Promise.all(asyncChecks);

  // Evaluate Per-User Limit
  const perUserLimit = coupon.perUserLimit || 1;
  if (userUsageCount >= perUserLimit) {
    return {
      valid: false,
      code: 'USER_COUPON_LIMIT_REACHED',
      error: `You have already used this coupon maximum (${perUserLimit}) time(s)`
    };
  }

  // Evaluate First Order
  if (coupon.firstOrderOnly && previousOrdersCount > 0) {
    return {
      valid: false,
      code: 'FIRST_ORDER_ONLY',
      error: 'This coupon is valid only on your first booking'
    };
  }

  // Evaluate New User (within 30 days)
  if (coupon.newUserOnly && user && user.createdAt) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (new Date(user.createdAt) < thirtyDaysAgo) {
      return {
        valid: false,
        code: 'NEW_USER_ONLY',
        error: 'This coupon is available for new users only'
      };
    }
  }

  // Evaluate City
  if (allowedCities && address && address.city) {
    const userCityName = address.city.trim().toLowerCase();
    const allowedNames = allowedCities.map(c => c.name.trim().toLowerCase());
    if (!allowedNames.includes(userCityName)) {
      return {
        valid: false,
        code: 'CITY_NOT_ELIGIBLE',
        error: `This coupon is not valid for bookings in ${address.city}`
      };
    }
  }

  // Calculate Discount Amount
  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    const rawDiscount = (orderAmount * Number(coupon.discountValue)) / 100;
    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined && coupon.maxDiscount > 0) {
      discountAmount = Math.min(rawDiscount, Number(coupon.maxDiscount));
    } else {
      discountAmount = rawDiscount;
    }
  } else if (coupon.discountType === 'FIXED') {
    discountAmount = Math.min(Number(coupon.discountValue), orderAmount);
  }

  discountAmount = Math.max(0, Math.round(discountAmount));

  return {
    valid: true,
    discountAmount,
    coupon
  };
};

/**
 * Master Pricing Engine - Single Source of Truth for all calculations
 */
const calculateBookingPrice = async ({
  user,
  bookedItems = [],
  serviceId = null,
  couponCode = null,
  address = null,
  paymentMethod = 'online',
  visitingChargesOverride = null
}) => {
  // 1. Fetch Global Settings (From in-memory cache)
  const settings = await getGlobalSettings();
  const gstPercentage = settings.serviceGstPercentage ?? 18;
  const standardVisitingFee = settings.visitedCharges ?? 29;

  // 2. Fetch Service and Category Details in parallel
  let service = null;
  let category = null;

  if (serviceId) {
    const resolvedId = typeof serviceId === 'object' && serviceId._id ? serviceId._id : serviceId;
    service = await Service.findById(resolvedId).lean();
    if (service) {
      const catId = service.categoryId || service.categoryIds?.[0];
      if (catId) {
        category = await Category.findById(catId).lean();
      }
    }
  }

  // 3. Compute Item Total / Base Price
  let basePrice = 0;
  if (Array.isArray(bookedItems) && bookedItems.length > 0) {
    basePrice = bookedItems.reduce((sum, item) => {
      const price = item.card?.price ?? item.price ?? 0;
      const count = item.quantity ?? item.serviceCount ?? 1;
      return sum + (Number(price) * Number(count));
    }, 0);
  }

  if (basePrice === 0 && service) {
    basePrice = service.basePrice || 500;
  }

  // 4. Check Plan Benefits
  let planDiscount = 0;
  let isFreeUnderPlan = false;

  if (paymentMethod === 'plan_benefit' && user?.plans?.isActive && user.plans.name) {
    const isPlanValid = !user.plans.expiry || new Date() <= new Date(user.plans.expiry);
    if (isPlanValid) {
      const userPlan = await Plan.findOne({ name: user.plans.name }).lean();
      if (userPlan) {
        const catIdStr = category?._id?.toString() || service?.categoryId?.toString();
        const svcIdStr = service?._id?.toString();

        const isCategoryCovered = catIdStr && userPlan.freeCategories &&
          userPlan.freeCategories.some(c => c.toString() === catIdStr);
        const isServiceCovered = svcIdStr && userPlan.freeServices &&
          userPlan.freeServices.some(s => s.toString() === svcIdStr);

        if (isCategoryCovered || isServiceCovered) {
          planDiscount = basePrice;
          isFreeUnderPlan = true;
        }
      }
    }
  }

  // 5. Check Coupon Discount
  let couponDiscount = 0;
  let couponInfo = null;
  let couponValidationError = null;

  const amountEligibleForCoupon = Math.max(0, basePrice - planDiscount);

  if (couponCode && !isFreeUnderPlan && amountEligibleForCoupon > 0) {
    const normalizedCode = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode, isDeleted: false }).lean();

    if (coupon) {
      const validationResult = await validateCouponApplicability({
        coupon,
        user,
        orderAmount: amountEligibleForCoupon,
        bookedItems,
        service,
        category,
        address,
        paymentMethod
      });

      if (validationResult.valid) {
        couponDiscount = validationResult.discountAmount || 0;
        couponInfo = {
          couponId: coupon._id,
          code: coupon.code,
          title: coupon.title,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: couponDiscount
        };
      } else {
        couponValidationError = validationResult;
      }
    } else {
      couponValidationError = { valid: false, code: 'COUPON_NOT_FOUND', error: 'Invalid coupon code' };
    }
  }

  // 6. Taxable Subtotal & GST Calculation
  const totalDiscount = Math.min(basePrice, planDiscount + couponDiscount);
  const taxableAmount = Math.max(0, basePrice - totalDiscount);
  const tax = isFreeUnderPlan ? 0 : Math.round((taxableAmount * gstPercentage) / 100);

  // 7. Visiting Charges / Convenience Fee
  let visitingCharges = 0;
  if (!isFreeUnderPlan) {
    visitingCharges = visitingChargesOverride !== null && visitingChargesOverride !== undefined
      ? Number(visitingChargesOverride)
      : standardVisitingFee;
  }

  // 8. Pending Penalty
  const pendingPenalty = user?.wallet?.penalty || 0;

  // 9. Final Payable Amount
  let finalAmount = taxableAmount + tax + visitingCharges + pendingPenalty;

  // For non-plan paid bookings, maintain Razorpay minimum ₹1 if positive
  if (finalAmount < 1 && !isFreeUnderPlan && (basePrice > 0 || pendingPenalty > 0)) {
    finalAmount = 1;
  }

  return {
    basePrice,
    planDiscount,
    couponDiscount,
    totalDiscount,
    taxableAmount,
    tax,
    gstPercentage,
    visitingCharges,
    pendingPenalty,
    finalAmount,
    isFreeUnderPlan,
    couponInfo,
    couponValidationError
  };
};

module.exports = {
  validateCouponApplicability,
  calculateBookingPrice
};

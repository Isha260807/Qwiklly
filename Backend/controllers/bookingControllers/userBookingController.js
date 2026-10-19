const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const Service = require('../../models/UserService');
const Category = require('../../models/Category');
const Cart = require('../../models/Cart');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Review = require('../../models/Review');
const Coupon = require('../../models/Coupon');
const CouponUsage = require('../../models/CouponUsage');
const { calculateBookingPrice } = require('../../services/pricingService');
const { validationResult } = require('express-validator');
const { BOOKING_STATUS, PAYMENT_STATUS, MATCH_FAILURE_REASONS } = require('../../utils/constants');
const { createNotification } = require('../notificationControllers/notificationController');
const { sendNotificationToUser, sendNotificationToVendor } = require('../../services/firebaseAdmin');
const { findAvailableVendorForSlot, findSlotCandidateVendors } = require('../../services/vendorMatchService');
const { commitSlotAssignmentAfterPayment, SLOT_ASSIGNMENT_STATE } = require('../../services/slotAssignmentService');
const { CANCELLATION_WINDOW_MS, USER_CANCELLABLE_STATUSES, getCancellationState } = require('../../utils/cancellationWindow');
const { getSlotRules, isDateWithinWindow, isSlotStartAllowed, isSlotStartInFuture } = require('../../services/slotSettingsService');
const { reserveCouponUsage, releaseCouponReservation, consumeCouponReservation, cancelCouponUsage } = require('../../services/couponUsageService');

const NORMAL_SLOT_BLOCKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.AWAITING_PAYMENT,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.WORK_DONE
];

const isVendorSlotReservationDuplicate = (error) => {
  if (error?.code !== 11000) return false;
  if (error.keyPattern?.vendorId || error.keyPattern?.scheduledDate || error.keyPattern?.['timeSlot.start']) return true;
  const duplicateIndex = String(error.index || error.message || '');
  return duplicateIndex.includes('vendorId_1_scheduledDate_1_timeSlot.start_1');
};

const isUserSlotReservationDuplicate = (error) => {
  if (error?.code !== 11000) return false;
  if (error.keyPattern?.userId && error.keyPattern?.scheduledDate) return true;
  const duplicateIndex = String(error.index || error.message || '');
  return duplicateIndex.includes('userId_1_serviceId_1_scheduledDate_1_timeSlot.start_1');
};

/**
 * Create a new booking
 */
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    let {
      serviceId,
      vendorId,
      address,
      scheduledDate,
      scheduledTime,
      timeSlot,
      userNotes,
      paymentMethod,
      useWalletPayment,
      amount,
      isPlusAdded,
      bookedItems, // Array of specific items from cart
      visitingCharges: reqVisitingCharges,
      visitationFee: reqVisitationFee, // Backward compatibility
      basePrice: reqBasePrice,
      discount: reqDiscount,
      tax: reqTax,
      // Metadata from frontend
      serviceCategory: reqServiceCategory,
      categoryIcon: reqCategoryIcon,
      brandName: reqBrandName,
      brandIcon: reqBrandIcon,
      bookingType, // Extract bookingType
      couponCode // Extract optional coupon code
    } = req.body;

    // This project represents the user-facing SLOT mode as `scheduled`.
    // Keep the alias isolated here so all existing instant behavior remains
    // unchanged.
    const requestedBookingType = String(bookingType || 'instant').toLowerCase();
    const effectiveBookingType = requestedBookingType === 'slot' ? 'scheduled' : requestedBookingType;
    const isScheduledBooking = effectiveBookingType === 'scheduled';

    if (isScheduledBooking && (!scheduledDate || !timeSlot?.start || !timeSlot?.end || Number.isNaN(new Date(scheduledDate).getTime()))) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SLOT',
        message: 'Please select a valid date and time slot.'
      });
    }

    let visitingCharges = reqVisitingCharges !== undefined ? reqVisitingCharges : (reqVisitationFee || 0);

    // Calculate total value from booked items or fallback to base (Move to top)
    let totalServiceValue = 0;
    if (bookedItems && bookedItems.length > 0) {
      totalServiceValue = bookedItems.reduce((sum, item) => {
        const itemPrice = item.card?.price || item.price || 0;
        return sum + (itemPrice * (item.quantity || 1));
      }, 0);
    }
    // Note: Fallback to service.basePrice is done later if totalServiceValue is 0 AND service is loaded.
    // But we need 'service' to define fallback.
    // 'service' is loaded at line 46.
    // So we must calculate it AFTER loading service but BEFORE usage.
    // Usage is at line 98. Service loaded at 46.
    // So distinct placement: AFTER line 52.

    // Handle serviceId if it's an object (from populated cart data)
    if (typeof serviceId === 'object' && serviceId._id) {
      serviceId = serviceId._id;
    }

    // 1. Parallel Fetching: Service and User
    const [service, user] = await Promise.all([
      Service.findById(serviceId).select('title basePrice discountPrice description images iconUrl categoryId category categoryIds hourlyRate pricingType pricePerUnit billingUnitMinutes durationStepMinutes pricePer30Minutes minDurationMinutes maxDurationMinutes estimatedDurationMinutes durationPricing').lean(),
      User.findById(userId).select('name phone wallet plans')
    ]);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const slotRules = await getSlotRules();
    // Every scheduled booking (fixed-price or duration/hourly) is silently assigned
    const bookedServiceIds = Array.isArray(bookedItems)
      ? [...new Set(bookedItems.map(item => {
        const id = typeof item?.serviceId === 'object' ? item.serviceId?._id : item?.serviceId;
        return id && mongoose.Types.ObjectId.isValid(id) ? String(id) : null;
      }).filter(Boolean))]
      : [];
    const relatedServices = bookedServiceIds.length > 0
      ? await Service.find({ _id: { $in: bookedServiceIds } })
        .select('title pricingType estimatedDurationMinutes hourlyRate pricePerUnit billingUnitMinutes pricePer30Minutes minDurationMinutes maxDurationMinutes')
        .lean()
      : [];
    const serviceById = new Map([[String(service._id), service], ...relatedServices.map(item => [String(item._id), item])]);
    const getItemService = (item) => {
      const id = typeof item?.serviceId === 'object' ? item.serviceId?._id : item?.serviceId;
      return id ? serviceById.get(String(id)) : null;
    };
    const getItemPricingType = (item) => {
      const itemService = getItemService(item);
      return String(item.pricingType || item.card?.pricingType || itemService?.pricingType || 'FIXED').toUpperCase();
    };
    const getItemServiceMinutes = (item) => {
      const itemService = getItemService(item);
      const pricingType = getItemPricingType(item);
      if (pricingType === 'DURATION' || pricingType === 'HOURLY') {
        return Number(
          item.durationMinutes || item.card?.durationMinutes
            || ((item.hours || item.card?.hours || 0) * 60)
        ) || Number(itemService?.minDurationMinutes || 0);
      }
      // All fixed-price services use the global Admin Settings duration.
      // Per-service/cart snapshots must not override this value.
      return Number(slotRules?.slotServiceDurationMins) || 45;
    };

    // from the admin-marked vendor slots. Duration/hourly bookings keep their timer
    // and extra-time billing; they just occupy as many consecutive slots as their
    // booked duration needs.
    const hasHourlyPricing = ['HOURLY', 'DURATION'].includes(String(service.pricingType || '').toUpperCase())
      || (Array.isArray(bookedItems) && bookedItems.some(item => ['HOURLY', 'DURATION'].includes(getItemPricingType(item))));
    const isSlotBooking = isScheduledBooking;
    // This is the only branch that owns the NORMAL SERVICE -> SLOT behavior.
    // Duration-based and hourly scheduled bookings keep their existing path.
    const isNormalSlotBooking = isSlotBooking && !hasHourlyPricing;
    let slotDurationMins = Array.isArray(bookedItems)
      ? bookedItems.reduce((sum, item) => sum + getItemServiceMinutes(item) * (item.quantity || 1), 0)
      : 0;
    if (hasHourlyPricing && slotDurationMins === 0) {
      slotDurationMins = service.minDurationMinutes || 30;
    }
    const requestedDateValue = new Date(scheduledDate);
    const storedScheduledDate = isSlotBooking
      ? new Date(`${requestedDateValue.toISOString().slice(0, 10)}T00:00:00.000Z`)
      : requestedDateValue;

    // Check if user already has an active booking for this date and time slot
    if (isSlotBooking && storedScheduledDate && timeSlot?.start) {
      const existingUserBooking = await Booking.findOne({
        userId,
        scheduledDate: storedScheduledDate,
        'timeSlot.start': timeSlot.start,
        status: {
          $in: [
            BOOKING_STATUS.PENDING,
            BOOKING_STATUS.AWAITING_PAYMENT,
            BOOKING_STATUS.CONFIRMED,
            BOOKING_STATUS.ACCEPTED,
            BOOKING_STATUS.ASSIGNED,
            BOOKING_STATUS.JOURNEY_STARTED,
            BOOKING_STATUS.VISITED,
            BOOKING_STATUS.IN_PROGRESS,
            BOOKING_STATUS.WORK_DONE
          ]
        }
      }).select('_id bookingNumber serviceName');

      if (existingUserBooking) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_BOOKING',
          message: `You already have an active booking (${existingUserBooking.bookingNumber || existingUserBooking.serviceName || 'Service'}) for this time slot. Please choose another slot.`
        });
      }
    }

    // 2. Fetch Category if exists
    const categoryId = service.categoryId || service.categoryIds?.[0];
    const category = categoryId ? await Category.findById(categoryId).select('title icon image slug').lean() : null;

    // Calculate total value from booked items or fallback to service base price
    if (totalServiceValue === 0) {
      totalServiceValue = service.basePrice || 500;
    }

    // Check for Pending Penalty
    const pendingPenalty = user.wallet?.penalty || 0;

    // --- ZONE -> SERVICE -> VENDOR AVAILABILITY CHECK ---
    // Backend is the sole source of truth for zone resolution: any zoneId
    // sent by the client is ignored, and the zone is always re-derived from
    // the booking's own coordinates.
    const { geocodeAddress } = require('../../services/locationService');
    const { checkBookingServiceability } = require('../../services/serviceabilityService');
    let bookingLocation;
    if (typeof address.lat === 'number' && typeof address.lng === 'number') {
      bookingLocation = { lat: address.lat, lng: address.lng };
    } else {
      bookingLocation = await geocodeAddress(
        `${address.addressLine1}, ${address.city}, ${address.state} ${address.pincode}`
      );
    }

    if (!bookingLocation || typeof bookingLocation.lat !== 'number' || typeof bookingLocation.lng !== 'number') {
      return res.status(400).json({
        success: false,
        code: MATCH_FAILURE_REASONS.INVALID_LOCATION,
        message: 'We could not determine your booking location. Please re-select your address.'
      });
    }

    const serviceability = await checkBookingServiceability({
      serviceId,
      lat: bookingLocation.lat,
      lng: bookingLocation.lng,
      bookingType: effectiveBookingType,
      serviceDurationMins: slotDurationMins || slotRules.slotServiceDurationMins,
      bookedItems,
      fixedDurationMins: slotRules.slotServiceDurationMins
    });

    // Hard-block reasons: the location/service itself is not bookable here,
    // regardless of vendor availability - no booking should be created.
    const HARD_BLOCK_REASONS = [
      MATCH_FAILURE_REASONS.OUT_OF_SERVICE_ZONE,
      MATCH_FAILURE_REASONS.ZONE_INACTIVE,
      MATCH_FAILURE_REASONS.SERVICE_NOT_AVAILABLE_IN_ZONE,
      MATCH_FAILURE_REASONS.INVALID_LOCATION,
      'SERVICE_NOT_FOUND'
    ];

    if (!serviceability.zone || HARD_BLOCK_REASONS.includes(serviceability.reason)) {
      return res.status(400).json({
        success: false,
        code: serviceability.reason || MATCH_FAILURE_REASONS.OUT_OF_SERVICE_ZONE,
        message: serviceability.reason === MATCH_FAILURE_REASONS.ZONE_INACTIVE
          ? 'Services are currently paused in this area.'
          : serviceability.reason === MATCH_FAILURE_REASONS.SERVICE_NOT_AVAILABLE_IN_ZONE
            ? 'This service is not available in your area yet.'
            : 'Sorry, services are not currently available at this location.',
        nearestZone: serviceability.nearestZone || null
      });
    }

    const resolvedZone = serviceability.zone;
    let nearbyVendors = serviceability.vendors; // zone + service + availability scoped candidates
    let matchFailureReason = nearbyVendors.length === 0 ? serviceability.reason : null;
    let assignedSlotVendor = null;
    let assignedSlotSelectionVersion = null;
    let reservedSlotEnd = null;

    if (isSlotBooking) {
      // SLOT bookings ignore live online/presence; availability comes from the
      // admin-marked vendor slot schedule instead.
      nearbyVendors = await findSlotCandidateVendors(resolvedZone);
      matchFailureReason = nearbyVendors.length === 0 ? MATCH_FAILURE_REASONS.NO_ZONE_VENDOR : null;
    }

    if (isSlotBooking && !matchFailureReason) {
      // The global slot setup (hours, interval, blocked slots, booking window) is
      // the master list; vendor availability only narrows it down.
      const requestedDateKey = requestedDateValue.toISOString().slice(0, 10);
      if (!isDateWithinWindow(requestedDateKey, slotRules)
        || !isSlotStartAllowed(timeSlot.start, slotRules)
        || !isSlotStartInFuture(requestedDateKey, timeSlot.start, new Date(), slotRules.leadTimeHours)) {
        return res.status(409).json({
          success: false,
          code: 'SLOT_UNAVAILABLE',
          message: 'This slot is currently unavailable. Please select another time slot.'
        });
      }

      if (isNormalSlotBooking) {
        const duplicateDateEnd = new Date(storedScheduledDate);
        duplicateDateEnd.setUTCDate(duplicateDateEnd.getUTCDate() + 1);
        const duplicateBooking = await Booking.exists({
          userId,
          serviceId,
          bookingType: 'scheduled',
          scheduledDate: { $gte: storedScheduledDate, $lt: duplicateDateEnd },
          'timeSlot.start': timeSlot.start,
          status: { $in: NORMAL_SLOT_BLOCKING_STATUSES }
        });

        if (duplicateBooking) {
          return res.status(409).json({
            success: false,
            code: 'DUPLICATE_BOOKING',
            message: 'You already have a booking for this service and slot.'
          });
        }
      }

      const slotMatch = await findAvailableVendorForSlot({
        vendors: nearbyVendors,
        scheduledDate,
        timeSlot,
        // Mixed carts use the sum of every item's execution time. If legacy
        // data has no duration metadata, retain the global fixed-service fallback.
        durationMins: slotDurationMins || slotRules.slotServiceDurationMins,
        intervalMins: slotRules.intervalMins,
        fixedDurationMins: slotRules.slotServiceDurationMins,
        zoneId: resolvedZone._id
      });

      if (slotMatch.reason === 'INVALID_SLOT') {
        return res.status(400).json({
          success: false,
          code: 'INVALID_SLOT',
          message: 'Please select a valid date and time slot.'
        });
      }

      assignedSlotVendor = slotMatch.vendor;
      assignedSlotSelectionVersion = slotMatch.selectionVersion;
      // Duration/hourly bookings reserve every slot they span, so store the full range.
      if (assignedSlotVendor && slotMatch.slotEnd) reservedSlotEnd = slotMatch.slotEnd;
      if (!assignedSlotVendor) {
        matchFailureReason = slotMatch.reason || MATCH_FAILURE_REASONS.NO_AVAILABLE_VENDOR;
      }
    }

    // NORMAL SLOT requests must fail cleanly when the slot is gone. They must
    // never create a cancelled/unassigned booking that could enter dispatch.
    if (isNormalSlotBooking && matchFailureReason) {
      return res.status(409).json({
        success: false,
        code: 'SLOT_UNAVAILABLE',
        message: 'This slot is currently unavailable. Please select another time slot.'
      });
    }

    console.log(`[CreateBooking] Zone=${resolvedZone.name} (${resolvedZone._id}), available zone vendors=${nearbyVendors.length}, reason=${matchFailureReason}`);
    // --- END SERVICEABILITY BLOCK ---

    // -------------------------------------------------------------------------
    // CENTRALIZED PRICING CALCULATION LOGIC
    // -------------------------------------------------------------------------
    const pricing = await calculateBookingPrice({
      user,
      bookedItems: (Array.isArray(bookedItems) && bookedItems.length > 0) ? bookedItems : [],
      serviceId,
      couponCode: couponCode || null,
      address,
      paymentMethod,
      bookingType: effectiveBookingType,
      visitingChargesOverride: reqVisitingCharges !== undefined ? reqVisitingCharges : (reqVisitationFee || null)
    });

    if (couponCode && pricing.couponValidationError) {
      return res.status(400).json({
        success: false,
        code: pricing.couponValidationError.code || 'COUPON_INVALID',
        message: pricing.couponValidationError.error || 'Invalid coupon code'
      });
    }

    if (pricing.hourlyValidationError) {
      return res.status(400).json({
        success: false,
        code: pricing.hourlyValidationError.code || 'INVALID_HOURS',
        message: pricing.hourlyValidationError.error || 'Invalid hours selected'
      });
    }

    let basePrice = pricing.basePrice;
    let discount = pricing.planDiscount;
    let couponDiscount = pricing.couponDiscount;
    let tax = pricing.tax;
    let visitingChargesCalculated = pricing.visitingCharges;
    let instantBookingChargesCalculated = pricing.instantBookingCharges || 0;
    let finalAmount = pricing.finalAmount;

    // Zero zone+service+availability candidates is treated as a dead end, not a
    // "wait for admin" case - the booking is created (for the user's
    // history/audit trail) but immediately auto-cancelled with a clear
    // reason, rather than being parked for manual assignment.
    const isImmediateSlotAssignment = isSlotBooking && assignedSlotVendor
      && ((pricing.isFreeUnderPlan && finalAmount <= 0) || paymentMethod === 'cash');
    let bookingStatus = matchFailureReason
      ? BOOKING_STATUS.CANCELLED
      : (isSlotBooking
        ? (isImmediateSlotAssignment ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.AWAITING_PAYMENT)
        : BOOKING_STATUS.SEARCHING);
    const NO_VENDOR_CANCELLATION_MESSAGES = {
      NO_ZONE_VENDOR: 'No service providers are currently registered in your area.',
      NO_SERVICE_VENDOR: 'No service providers in your area currently offer this service.',
      NO_AVAILABLE_VENDOR: 'No service providers are currently available in your area.'
    };
    const cancellationReason = matchFailureReason
      ? (isSlotBooking
        ? 'This slot is currently unavailable. Please select another time slot.'
        : (NO_VENDOR_CANCELLATION_MESSAGES[matchFailureReason] || 'No service providers are currently available for this booking.'))
      : null;
    let bookingPaymentStatus = pricing.isFreeUnderPlan
      ? (finalAmount > 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PLAN_COVERED)
      : PAYMENT_STATUS.PENDING;

    // Clear penalty from user wallet if we charged it
    if (pendingPenalty > 0) {
      user.wallet.penalty = 0;
      await user.save();
    }

    console.log(`[CreateBooking] Payment=${paymentMethod}, FinalAmount=${finalAmount}, InstantCharges=${instantBookingChargesCalculated}, CouponDiscount=${couponDiscount}, Penalty=${pendingPenalty}`);

    // Create booking
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Improve Category Fetching if ID is missing (Fallback to title match)
    let finalCategory = category;
    if (!finalCategory && service.category) {
      const Category = require('../../models/Category');
      finalCategory = await Category.findOne({ title: service.category });
    }

    // Map booked items to schema (preserving pricing snapshot & duration metadata)
    const formattedBookedItems = (Array.isArray(bookedItems) && bookedItems.length > 0) ? bookedItems.map(item => {
      const cardObj = item.card || item;
      const itemService = getItemService(item) || service;
      const effectiveType = getItemPricingType(item);
      const isDurationBased = ['DURATION', 'HOURLY'].includes(effectiveType);
      const durationMins = isDurationBased ? getItemServiceMinutes(item) : null;
      const estimatedMinutes = isDurationBased ? null : getItemServiceMinutes(item);
      const itemServiceId = typeof item.serviceId === 'object' ? item.serviceId?._id : item.serviceId;
      const billingUnit = Number(cardObj.billingUnitMinutes || item.billingUnitMinutes || itemService.billingUnitMinutes || 30);
      const pricePerUnit = cardObj.pricePerUnit || item.pricePerUnit || itemService.pricePerUnit || itemService.pricePer30Minutes || null;
      const pricePer30 = billingUnit === 30 ? pricePerUnit : (cardObj.pricePer30Minutes || item.pricePer30Minutes || itemService.pricePer30Minutes || null);

      return {
        serviceId: itemServiceId || itemService?._id || null,
        brandName: item.brandName || item.sectionTitle || item.brand || '',
        brandIcon: item.brandIcon || item.sectionIcon || item.icon || null,
        serviceName: item.serviceName || item.title || service.title || '',
        card: {
          title: cardObj.title || item.title || service.title,
          subtitle: cardObj.subtitle || item.description || '',
          price: cardObj.price ?? item.price ?? 0,
          originalPrice: cardObj.originalPrice ?? item.originalPrice ?? null,
          duration: cardObj.duration || (durationMins ? `${durationMins} mins` : ''),
          estimatedDurationMinutes: estimatedMinutes,
          description: cardObj.description || item.description || '',
          imageUrl: cardObj.imageUrl || item.icon || service.iconUrl || '',
          features: cardObj.features || [],
          pricingType: effectiveType,
          durationMinutes: durationMins,
          pricePerUnit,
          billingUnitMinutes: billingUnit,
          pricePer30Minutes: pricePer30,
          hours: isDurationBased ? (cardObj.hours || (durationMins ? durationMins / 60 : null)) : null
        },
        quantity: item.quantity || item.serviceCount || 1
      };
    }) : [];

    console.log('[CreateBooking] About to save with formatted items:', JSON.stringify(formattedBookedItems, null, 2));

    // Detect DURATION / HOURLY priced bookings and snapshot duration/rates for timer
    const totalBookedMinutes = formattedBookedItems.reduce((sum, item) => {
      const mins = item.card?.durationMinutes
        || (item.card?.hours ? item.card.hours * 60 : 0)
        || item.card?.estimatedDurationMinutes
        || 0;
      return sum + (mins * (item.quantity || 1));
    }, 0);
    const hasDurationBasedItems = formattedBookedItems.some(item =>
      ['DURATION', 'HOURLY'].includes(String(item.card?.pricingType || '').toUpperCase())
    );
    const durationService = [service, ...relatedServices].find(item =>
      ['DURATION', 'HOURLY'].includes(String(item?.pricingType || '').toUpperCase())
    ) || service;

    let hourlyTracking = { isHourly: false };
    if (hasDurationBasedItems || service.pricingType === 'DURATION' || service.pricingType === 'HOURLY') {
      const effectiveDuration = totalBookedMinutes > 0 ? totalBookedMinutes : (service.minDurationMinutes || 30);
      const effectiveHourlyRate = durationService.pricingType === 'DURATION'
        ? ((durationService.pricePerUnit || durationService.pricePer30Minutes || (durationService.basePrice || 0)) * (60 / (durationService.billingUnitMinutes || 30)))
        : (durationService.hourlyRate || 0);

      hourlyTracking = {
        isHourly: true,
        bookedHours: effectiveDuration / 60,
        bookedMinutes: effectiveDuration,
        hourlyRate: effectiveHourlyRate,
        extraHourlyRate: effectiveHourlyRate,
        phase: 'NOT_STARTED',
        extraPaymentStatus: 'NOT_REQUIRED',
        workDoneAllowed: true
      };
    }

    // Extract Visual Identity Details
    const categoryIcon = finalCategory?.icon || finalCategory?.image || service.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3500/3500833.png';
    let brandName = null;
    let brandIcon = null;

    if (formattedBookedItems.length > 0) {
      const distinctBrands = [...new Set(formattedBookedItems.map(item => item.brandName).filter(Boolean))];
      if (distinctBrands.length > 0) {
        brandName = distinctBrands.join(', ');
      }
      brandIcon = formattedBookedItems[0].brandIcon || null;
    }

    const bookingData = {
      bookingNumber,
      userId,
      vendorId: assignedSlotVendor?._id || null, // NORMAL SLOT vendors are assigned silently; other types wait for acceptance
      serviceId,
      categoryId: finalCategory?._id || categoryId,
      zoneId: resolvedZone._id,
      zoneName: resolvedZone.name,
      matchFailureReason,
      serviceName: service.title,
      serviceCategory: reqServiceCategory || finalCategory?.title || service.category || 'General',
      categoryIcon: reqCategoryIcon || categoryIcon,
      brandName: reqBrandName || brandName,
      brandIcon: reqBrandIcon || brandIcon,
      bookingType: effectiveBookingType,

      description: service.description,
      serviceImages: service.images || [],
      bookedItems: formattedBookedItems,
      basePrice,
      discount,
      couponDiscount,
      coupon: pricing.couponInfo || { couponId: null, code: null, discountType: null, discountValue: 0, discountAmount: 0 },
      tax,
      visitingCharges: visitingChargesCalculated,
      instantBookingCharges: instantBookingChargesCalculated,
      finalAmount,
      userPayableAmount: finalAmount,
      address: {
        type: address.type || 'home',
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark || '',
        lat: address.lat || null,
        lng: address.lng || null
      },
      scheduledDate: storedScheduledDate,
      scheduledTime,
      timeSlot: {
        start: timeSlot.start,
        end: reservedSlotEnd || timeSlot.end
      },
      // Do not persist a vendor list for NORMAL SLOT bookings. The user only
      // receives the selected vendor after assignment, never the availability
      // union used to make the slot bookable.
      potentialVendors: isNormalSlotBooking ? [] : nearbyVendors.map(v => ({
        vendorId: v._id,
        distance: null
      })),
      useWalletPayment: Boolean(useWalletPayment && finalAmount > 0 && !pricing.isFreeUnderPlan),
      paymentMethod: paymentMethod || null,
      status: bookingStatus,
      // A selected vendor is a temporary slot hold until payment is settled.
      // assignedAt is populated only by commitSlotAssignmentAfterPayment.
      assignedAt: null,
      ...(isImmediateSlotAssignment ? { vendorAssignmentStatus: 'PENDING' } : {}),
      paymentStatus: bookingPaymentStatus,
      ...(isSlotBooking && assignedSlotVendor ? {
        slotAssignment: {
          state: SLOT_ASSIGNMENT_STATE.TENTATIVE,
          selectionVersion: assignedSlotSelectionVersion,
          selectedAt: new Date()
        }
      } : {}),
      hourlyTracking,
      ...(matchFailureReason ? {
        cancelledAt: new Date(),
        cancelledBy: 'system',
        cancellationReason
      } : {})
    };

    let couponReservation = null;
    if (!matchFailureReason && pricing.couponInfo?.couponId) {
      couponReservation = await reserveCouponUsage(pricing.couponInfo.couponId);
      if (!couponReservation) {
        return res.status(400).json({
          success: false,
          code: 'COUPON_USAGE_LIMIT_REACHED',
          message: 'This coupon has reached its usage limit. Please choose another coupon.'
        });
      }
    }

    // The unique vendor/date/start index is the atomic reservation gate. If a
    // concurrent request wins the first candidate, re-read availability and
    // try the next eligible vendor before reporting that the slot is gone.
    let booking;
    const maxSlotAttempts = isNormalSlotBooking ? Math.max(1, nearbyVendors.length) : 1;
    try {
      for (let attempt = 0; attempt < maxSlotAttempts; attempt += 1) {
      try {
        booking = await Booking.create(bookingData);
        break;
      } catch (error) {
        if (isNormalSlotBooking && isUserSlotReservationDuplicate(error)) {
          const duplicateError = new Error('You already have a booking for this service and slot.');
          duplicateError.code = 'DUPLICATE_BOOKING';
          throw duplicateError;
        }

        if (!isNormalSlotBooking || !isVendorSlotReservationDuplicate(error) || attempt >= maxSlotAttempts - 1) {
          throw error;
        }

        const retryMatch = await findAvailableVendorForSlot({
          vendors: nearbyVendors,
          scheduledDate,
          timeSlot,
          durationMins: slotDurationMins || slotRules.slotServiceDurationMins,
          intervalMins: slotRules.intervalMins,
          fixedDurationMins: slotRules.slotServiceDurationMins,
          zoneId: resolvedZone._id
        });

        if (!retryMatch.vendor) {
          const unavailableError = new Error('This slot is currently unavailable. Please select another time slot.');
          unavailableError.code = 'SLOT_UNAVAILABLE';
          throw unavailableError;
        }

        assignedSlotVendor = retryMatch.vendor;
        assignedSlotSelectionVersion = retryMatch.selectionVersion;
        bookingData.vendorId = assignedSlotVendor._id;
        bookingData.timeSlot.end = retryMatch.slotEnd || timeSlot.end;
        bookingData.assignedAt = null;
        bookingData.slotAssignment.selectionVersion = assignedSlotSelectionVersion;
      }
    }

    } catch (bookingCreateError) {
      if (couponReservation) {
        await releaseCouponReservation(pricing.couponInfo.couponId);
      }
      throw bookingCreateError;
    }

    // Plan-covered and cash scheduled bookings do not have a separate online
    // payment-success callback. They are committed immediately after the
    // booking is persisted; normal online/wallet bookings commit in payment
    // verification instead.
    if (!matchFailureReason && isImmediateSlotAssignment && booking) {
      const commitResult = await commitSlotAssignmentAfterPayment(booking);
      if (!commitResult.committed) {
        throw new Error('Scheduled booking assignment could not be committed');
      }
      booking = commitResult.booking || booking;
    }

    // Create Audit / Coupon Usage Record if a coupon was used - skipped when
    // the booking was immediately auto-cancelled (no vendor available), so
    // the coupon isn't burned on a booking that never happened.
    if (!matchFailureReason && pricing.couponInfo && pricing.couponInfo.couponId) {
      const shouldConsumeImmediately = pricing.isFreeUnderPlan || paymentMethod === 'cash';
      try {
        await CouponUsage.create({
          couponId: pricing.couponInfo.couponId,
          couponCode: pricing.couponInfo.code,
          userId: user._id,
          bookingId: booking._id,
          discountAmount: pricing.couponDiscount,
          orderAmount: pricing.basePrice,
          finalAmount: pricing.finalAmount,
          status: shouldConsumeImmediately ? 'CONSUMED' : 'APPLIED'
        });

        // Cash/free bookings are settled immediately. Online and wallet
        // bookings keep the reservation until payment succeeds.
        if (shouldConsumeImmediately) {
          await consumeCouponReservation(pricing.couponInfo.couponId);
        }
      } catch (usageErr) {
        await releaseCouponReservation(pricing.couponInfo.couponId);
        console.error('[CreateBooking] CouponUsage logging error:', usageErr);
      }
    }
    // --- IMMEDIATE RESPONSE ---
    // Send immediate response to the client. All subsequent operations will run in the background.
    res.status(201).json({
      success: true,
      message: matchFailureReason
        ? cancellationReason
        : (isSlotBooking
          ? 'Booking created successfully. Please complete payment.'
          : 'Booking created successfully. We are finding vendors for you.'),
      data: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        useWalletPayment: booking.useWalletPayment,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        vendorId: booking.vendorId || null,
        finalAmount: booking.finalAmount,
        basePrice: booking.basePrice,
        discount: booking.discount,
        couponDiscount: booking.couponDiscount,
        coupon: booking.coupon,
        tax: booking.tax,
        visitingCharges: booking.visitingCharges,
        instantBookingCharges: booking.instantBookingCharges,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        address: booking.address,
        serviceName: booking.serviceName,
        categoryIcon: booking.categoryIcon,
        brandName: booking.brandName,
        brandIcon: booking.brandIcon,
        cancellationReason: booking.cancellationReason || null,
      }
    });

    // --- DEFERRED POST-BOOKING OPERATIONS ---
    setImmediate(async () => {
      try {
        const userForBackground = await User.findById(userId);
        const bookingForBackground = await Booking.findById(booking._id)
          .populate('userId', 'name phone email')
          .populate('serviceId', 'title iconUrl')
          .populate('categoryId', 'title slug');
        const serviceForBackground = await Service.findById(serviceId);

        if (!userForBackground || !bookingForBackground || !serviceForBackground) return;

        // If Plus membership was added, update user status - skip for a
        // booking that was immediately auto-cancelled (no vendor available),
        // since nothing was actually delivered.
        if (isPlusAdded && bookingForBackground.status !== BOOKING_STATUS.CANCELLED) {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          userForBackground.plans = {
            isActive: true,
            name: 'Plus Membership',
            expiry: expiryDate,
            price: 999
          };
          await userForBackground.save();
        }

        if (bookingForBackground.status !== BOOKING_STATUS.CANCELLED) {
          if (isSlotBooking && bookingForBackground.vendorId && [SLOT_ASSIGNMENT_STATE.TENTATIVE, SLOT_ASSIGNMENT_STATE.COMMITTED].includes(bookingForBackground.slotAssignment?.state)) {
            console.log(`[CreateBooking] Notifying assigned SLOT vendor for ${bookingForBackground.bookingNumber}.`);
            await notifyAssignedSlotVendor(bookingForBackground);
          } else if (!isSlotBooking) {
            console.log(`[CreateBooking] Broadcasting booking ${bookingForBackground.bookingNumber} to available vendors in its zone.`);
            await dispatchBookingToVendors(bookingForBackground._id);
          }
        } else {
          console.log(`[CreateBooking] Booking ${bookingForBackground.bookingNumber} auto-cancelled (reason=${bookingForBackground.matchFailureReason}).`);
        }
      } catch (bgErr) {
        console.error('[CreateBooking][bg] Background task failed:', bgErr);
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    const isSlotRequest = ['scheduled', 'slot'].includes(String(req.body?.bookingType || '').toLowerCase());
    if (isSlotRequest && (error?.code === 11000 || error?.code === 'SLOT_UNAVAILABLE' || error?.code === 'DUPLICATE_BOOKING')) {
      const isDuplicate = error.code === 'DUPLICATE_BOOKING' || isUserSlotReservationDuplicate(error) || (error?.code === 11000 && (error.keyPattern?.userId || String(error.message || '').includes('userId')));
      return res.status(409).json({
        success: false,
        code: isDuplicate ? 'DUPLICATE_BOOKING' : 'SLOT_UNAVAILABLE',
        message: isDuplicate
          ? (error.message || 'You already have an active booking for this time slot. Please choose another slot.')
          : 'This slot is currently unavailable. Please select another time slot.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create booking. Please try again.'
    });
  }
};

/**
 * Notify the vendor selected for a SLOT booking. This reuses the existing
 * notification/socket channels without creating a vendor-search request that
 * would require customer-facing acceptance UI.
 */
const notifyAssignedSlotVendor = async (booking) => {
  const vendorId = booking.vendorId?._id || booking.vendorId;
  if (!vendorId) return;

  try {
    const { getIO } = require('../../sockets');
    const io = getIO();
    if (io) {
      io.to(`vendor_${vendorId.toString()}`).emit('booking_updated', {
        bookingId: booking._id,
        status: booking.status,
        bookingType: 'scheduled',
        event: 'scheduled_booking_assigned',
        playSound: true,
        message: 'A scheduled booking has been assigned to you.'
      });
    }

    await createNotification({
      vendorId,
      type: 'scheduled_booking_assigned',
      title: 'Scheduled Booking Assigned',
      message: `A scheduled booking for ${booking.serviceName} has been assigned to you.`,
      relatedId: booking._id,
      relatedType: 'booking',
      data: {
        bookingId: booking._id,
        serviceName: booking.serviceName,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        location: booking.address,
        price: booking.finalAmount,
        paymentStatus: booking.paymentStatus
      },
      pushData: {
        type: 'scheduled_booking_assigned',
        bookingType: 'scheduled',
        link: `/vendor/booking/${booking._id}`
      }
    });
    // A scheduled vendor is selected before payment is completed. Notify the
    // customer at that point so they know payment is required before service
    // execution can begin. The committed-after-payment call will not send a
    // second payment prompt because paymentStatus is no longer pending.
    const paymentRequired = ![
      PAYMENT_STATUS.SUCCESS,
      PAYMENT_STATUS.PLAN_COVERED
    ].includes(booking.paymentStatus);
    const userId = booking.userId?._id || booking.userId;

    if (paymentRequired && userId) {
      const userMessage = `Your scheduled booking ${booking.bookingNumber || ''} has been assigned to a service provider. Please complete payment before the service can start.`;

      await createNotification({
        userId,
        type: 'booking_accepted',
        title: 'Vendor Assigned - Payment Required',
        message: userMessage,
        relatedId: booking._id,
        relatedType: 'booking',
        data: {
          bookingId: booking._id.toString(),
          bookingType: 'scheduled',
          paymentRequired: true,
          action: 'pay_booking'
        },
        pushData: {
          type: 'booking_accepted',
          bookingType: 'scheduled',
          paymentRequired: true,
          action: 'pay_booking',
          link: `/user/booking/${booking._id}`,
          priority: 'high'
        },
        priority: 'high'
      });
    }
  } catch (error) {
    console.error('[CreateBooking] SLOT vendor notification failed:', error);
  }
};

/**
 * Get user bookings with filters
 */
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { userId };
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    } else {
      // Default: Fetch all, including SEARCHING. Frontend will filter for active.
    }
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings and total count in parallel
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('vendorId', 'name businessName phone profilePhoto')
        .populate('serviceId', 'title iconUrl')
        .populate('categoryId', 'title slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Booking.countDocuments(query)
    ]);

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
    console.error('Get user bookings error:', error);
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
    const userId = req.user.id;
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, userId })
      .select('+visitOtp +paymentOtp') // Include secure OTPs for the user
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone email address profilePhoto')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Fetch Vendor Bill if exists
    const VendorBill = require('../../models/VendorBill');
    const bill = await VendorBill.findOne({ bookingId: booking._id });

    // Convert to object to attach bill
    const bookingData = booking;
    if (bill) {
      bookingData.bill = bill;
    }

    // Server-computed cancel eligibility (3-min window after vendor accepts)
    bookingData.cancellation = getCancellationState(bookingData);

    res.status(200).json({
      success: true,
      data: bookingData
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
 * Cancel booking (customer)
 *
 * Rules:
 *  - Before any vendor accepts: cancel anytime.
 *  - After a vendor accepts: cancel only within CANCELLATION_WINDOW (3 min from
 *    acceptedAt) and only before the vendor starts the journey.
 *  - A paid booking is refunded in full to the user's wallet.
 * The status transition is a single atomic update so double taps / a racing
 * journey-start can never produce a double refund or a cancelled+started booking.
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

    const userId = req.user.id;
    const { id } = req.params;
    const { cancellationReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - CANCELLATION_WINDOW_MS);

    // Atomic claim: only one request can move the booking to CANCELLED, and only
    // while the cancellation rules still hold at this exact moment.
    const previous = await Booking.findOneAndUpdate(
      {
        _id: id,
        userId,
        status: { $in: USER_CANCELLABLE_STATUSES },
        journeyStartedAt: null,
        $or: [{ acceptedAt: null }, { acceptedAt: { $gte: windowStart } }]
      },
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledAt: now,
          cancelledBy: 'user',
          cancellationReason: cancellationReason || 'Cancelled by user'
        }
      },
      { new: false }
    ).lean();

    if (previous?.bookingType === 'scheduled') {
      const releaseUpdate = { $set: { 'slotAssignment.state': SLOT_ASSIGNMENT_STATE.RELEASED } };
      await Booking.updateOne({ _id: previous._id }, releaseUpdate);
    }

    if (!previous) {
      const existing = await Booking.findOne({ _id: id, userId }).lean();
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      if (existing.status === BOOKING_STATUS.CANCELLED) {
        return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
      }
      const state = getCancellationState(existing, now);
      const messages = {
        WINDOW_EXPIRED: 'The 3-minute cancellation window has ended. Please contact support for help.',
        JOURNEY_STARTED: 'The service agent has already started the journey, so this booking can no longer be cancelled. Please contact support.',
        STATUS_NOT_CANCELLABLE: 'This booking can no longer be cancelled. Please contact support.'
      };
      return res.status(403).json({
        success: false,
        code: state.reason || 'NOT_CANCELLABLE',
        message: messages[state.reason] || 'This booking cannot be cancelled.',
        cancellation: state
      });
    }

    // --- REFUND (full amount, to wallet) ---
    const isPaid = previous.paymentStatus === PAYMENT_STATUS.SUCCESS;
    const refundAmount = isPaid ? Number(previous.finalAmount || 0) : 0;
    let refundMessage = 'Booking cancelled successfully.';

    if (refundAmount > 0) {
      try {
        const Transaction = require('../../models/Transaction');
        const user = await User.findByIdAndUpdate(
          userId,
          { $inc: { 'wallet.balance': refundAmount } },
          { new: true }
        );
        if (!user) throw new Error('User not found for refund');

        await Transaction.create({
          userId: user._id,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          paymentMethod: 'wallet',
          description: `Refund for booking #${previous.bookingNumber}`,
          bookingId: previous._id,
          balanceAfter: user.wallet.balance
        });

        await Booking.updateOne({ _id: previous._id }, { $set: { paymentStatus: PAYMENT_STATUS.REFUNDED } });
        refundMessage = `Booking cancelled successfully. ₹${refundAmount} has been added to your wallet.`;
      } catch (refundErr) {
        console.error('[CancelBooking] Refund failed, reverting cancellation:', refundErr);
        await Booking.updateOne(
          { _id: previous._id, status: BOOKING_STATUS.CANCELLED },
          {
            $set: { status: previous.status },
            $unset: { cancelledAt: '', cancelledBy: '', cancellationReason: '' }
          }
        );
        return res.status(500).json({
          success: false,
          message: 'Failed to refund your payment, so the booking was not cancelled. Please try again.'
        });
      }
    }

    const booking = await Booking.findById(previous._id);

    // ── Free the slot / vendor ──
    // The unique slot index only covers active statuses, so the user's and the
    // vendor's slot are released by the status change above. Reset the vendor.
    try {
      const BookingRequest = require('../../models/BookingRequest');
      await BookingRequest.deleteMany({ bookingId: previous._id });

      if (previous.vendorId) {
        const stillBusy = await Booking.exists({
          _id: { $ne: previous._id },
          vendorId: previous.vendorId,
          $or: [
            { status: { $in: [BOOKING_STATUS.JOURNEY_STARTED, BOOKING_STATUS.VISITED, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.WORK_DONE] } },
            {
              bookingType: { $ne: 'scheduled' },
              status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.ASSIGNED, BOOKING_STATUS.AWAITING_PAYMENT] }
            }
          ]
        });
        if (!stillBusy) {
          await Vendor.findByIdAndUpdate(previous.vendorId, { availability: 'AVAILABLE' });
        }
      }
    } catch (releaseErr) {
      console.error('[CancelBooking] Error releasing vendor/requests:', releaseErr);
    }

    // ── Restore Coupon if Applicable ──
    // Restore the reservation/usage exactly once when a booking is cancelled.
    if (previous.coupon && previous.coupon.couponId) {
      try {
        await cancelCouponUsage(previous._id);
      } catch (couponRestoreErr) {
        console.error('[CancelBooking] Error restoring coupon usage:', couponRestoreErr);
      }
    }


    // ── Real-time updates ──
    try {
      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io) {
        const payload = {
          bookingId: previous._id,
          status: BOOKING_STATUS.CANCELLED,
          message: 'Booking cancelled by the customer'
        };
        io.to(`user_${userId}`).emit('booking_updated', payload);
        if (previous.vendorId) {
          io.to(`vendor_${previous.vendorId.toString()}`).emit('booking_updated', payload);
          io.to(`vendor_${previous.vendorId.toString()}`).emit('booking_cancelled', payload);
        }
        // Vendors who were still being offered this job should drop it.
        (previous.notifiedVendors || []).forEach((vid) => {
          io.to(`vendor_${vid.toString()}`).emit('booking_taken', {
            bookingId: previous._id.toString(),
            message: 'This booking was cancelled by the customer.'
          });
        });
      }
    } catch (socketErr) {
      console.error('[CancelBooking] Socket emit failed:', socketErr);
    }

    // Send notification to user
    await createNotification({
      userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: refundMessage,
      relatedId: previous._id,
      relatedType: 'booking',
      pushData: {
        type: 'booking_cancelled',
        bookingId: previous._id.toString(),
        link: `/user/booking/${previous._id}`
      }
    });

    // Send notification to vendor
    if (previous.vendorId) {
      await createNotification({
        vendorId: previous.vendorId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Booking ${previous.bookingNumber} has been cancelled by the customer.`,
        relatedId: previous._id,
        relatedType: 'booking',
        pushData: {
          type: 'booking_cancelled',
          bookingId: previous._id.toString(),
          link: `/vendor/bookings/${previous._id}`
        }
      });
    }

    // Notify worker if assigned
    if (previous.workerId) {
      await createNotification({
        workerId: previous.workerId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Job ${previous.bookingNumber} has been cancelled by the customer.`,
        relatedId: previous._id,
        relatedType: 'booking',
        pushData: {
          type: 'job_cancelled',
          bookingId: previous._id.toString(),
          link: `/worker/job/${previous._id}`
        }
      });
    }

    res.status(200).json({
      success: true,
      message: refundMessage,
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
 * Reschedule booking
 */
const rescheduleBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { scheduledDate, scheduledTime, timeSlot } = req.body;

    const booking = await Booking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be rescheduled
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule completed booking'
      });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule cancelled booking'
      });
    }

    // Update booking
    booking.scheduledDate = new Date(scheduledDate);
    booking.scheduledTime = scheduledTime;
    booking.timeSlot = {
      start: timeSlot.start,
      end: timeSlot.end
    };

    // Reset status to pending if it was confirmed
    if (booking.status === BOOKING_STATUS.CONFIRMED) {
      booking.status = BOOKING_STATUS.PENDING;
    }

    await booking.save();

    // Send notification to vendor
    await createNotification({
      vendorId: booking.vendorId,
      type: 'booking_created', // Keeping type as is for now
      title: 'Booking Rescheduled',
      message: `Booking ${booking.bookingNumber} has been rescheduled.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: {
        type: 'booking_rescheduled',
        bookingId: booking._id.toString(),
        link: `/vendor/bookings/${booking._id}`
      }
    });

    res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Reschedule booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule booking. Please try again.'
    });
  }
};

/**
 * Add review and rating after completion
 */
const addReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { rating, review, reviewImages } = req.body;

    const booking = await Booking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is completed or work is done
    if (booking.status !== BOOKING_STATUS.COMPLETED && booking.status !== BOOKING_STATUS.WORK_DONE) {
      return res.status(400).json({
        success: false,
        message: 'Can only review bookings after work is done'
      });
    }

    // Check if already reviewed
    if (booking.rating) {
      return res.status(400).json({
        success: false,
        message: 'Booking already reviewed'
      });
    }

    // Update booking
    booking.rating = rating;
    booking.review = review || null;
    booking.reviewImages = reviewImages || [];
    booking.reviewedAt = new Date();

    await booking.save();

    // Create a new Review document for the Review model (used by Admin)
    try {
      await Review.create({
        bookingId: booking._id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        vendorId: booking.vendorId,
        workerId: booking.workerId,
        rating: rating,
        review: review || '',
        images: reviewImages || [],
        status: 'active'
      });
    } catch (reviewErr) {
      console.error('Error creating separate review document:', reviewErr);
      // We don't fail the request if the separate review creation fails
    }

    // Helper to update cumulative rating on Model
    const updateCumulativeRating = async (Model, docId, newRating) => {
      try {
        const doc = await Model.findById(docId);
        if (!doc) return;

        const oldTotal = doc.totalReviews || 0;
        const oldRating = doc.rating || 0;

        const newTotal = oldTotal + 1;
        const updatedRating = ((oldRating * oldTotal) + newRating) / newTotal;

        doc.rating = Number(updatedRating.toFixed(2));
        doc.totalReviews = newTotal;
        await doc.save();
      } catch (err) {
        console.error(`Error updating rating for ${Model.modelName}:`, err);
      }
    };

    // Update Vendor Rating (Always)
    if (booking.vendorId) {
      await updateCumulativeRating(Vendor, booking.vendorId, rating);
    }

    // Update Worker Rating (Only if worker was assigned)
    if (booking.workerId) {
      await updateCumulativeRating(Worker, booking.workerId, rating);
    }

    // Send notification to vendor
    await createNotification({
      vendorId: booking.vendorId,
      type: 'review_submitted',
      title: 'New Review Received',
      message: `You have received a ${rating}-star review for booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });

    res.status(200).json({
      success: true,
      message: 'Review added successfully',
      data: booking
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review. Please try again.'
    });
  }
};

/**
 * Get user ratings and reviews (given by the user)
 */
const getUserRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch bookings where rating is not null
    const bookings = await Booking.find({ userId, rating: { $ne: null } })
      .populate('vendorId', 'name businessName profilePhoto')
      .populate('serviceId', 'title iconUrl')
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments({ userId, rating: { $ne: null } });

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
    console.error('Get user ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your ratings'
    });
  }
};

/**
 * Broadcast a booking once to every currently available vendor in the
 * booking's resolved zone. There is no radius filter, nearest-first sort or
 * wave fallback. The vendor acceptance endpoint remains the first-accept-wins
 * gate for the booking.
 */
const dispatchBookingToVendors = async (bookingId) => {
  let dispatchClaimed = false;

  try {
    // Claim the dispatch atomically so payment callbacks/background retries
    // cannot broadcast the same booking twice.
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: BOOKING_STATUS.SEARCHING,
        vendorId: null,
        $or: [
          { dispatchState: { $exists: false } },
          { dispatchState: null },
          { dispatchState: 'PENDING' }
        ]
      },
      { $set: { dispatchState: 'DISPATCHING' } },
      { new: true }
    )
      .populate('userId', 'name phone email')
      .populate('serviceId', 'title iconUrl')
      .populate('categoryId', 'title slug');

    if (!booking) {
      console.log(`[dispatchBookingToVendors] Booking ${bookingId} was already dispatched, accepted, cancelled, or not found.`);
      return;
    }
    dispatchClaimed = true;

    const { findQualifiedVendors } = require('../../services/vendorMatchService');
    const Zone = require('../../models/Zone');
    const BookingRequest = require('../../models/BookingRequest');
    const bookedServiceTitle = booking.serviceName || booking.serviceId?.title || booking.serviceCategory || '';
    const slotRules = await getSlotRules();
    const instantDurationMins = Number(booking.hourlyTracking?.bookedMinutes) || 0;

    // zoneId was resolved at booking creation and is the permanent geographic
    // scope for this booking. Vendor coordinates are intentionally ignored.
    let zoneVendors = [];
    let matchReason = null;
    if (booking.zoneId) {
      const zone = await Zone.findById(booking.zoneId).lean();
      if (zone) {
        const matchResult = await findQualifiedVendors({
          zone,
          serviceTitle: bookedServiceTitle,
          bookingType: booking.bookingType,
          serviceDurationMins: instantDurationMins,
          bookedItems: booking.bookedItems,
          fixedDurationMins: slotRules.slotServiceDurationMins
        });
        zoneVendors = matchResult.vendors;
        matchReason = matchResult.reason;
      } else {
        matchReason = 'NO_ZONE_VENDOR';
      }
    } else {
      matchReason = 'NO_ZONE_VENDOR';
    }

    // Deduplicate while preserving the database order. No distance sorting.
    const uniqueVendorIds = new Set();
    const eligibleVendors = (zoneVendors || []).filter(vendor => {
      const idStr = (vendor._id || vendor.id).toString();
      if (uniqueVendorIds.has(idStr)) return false;
      uniqueVendorIds.add(idStr);
      return true;
    });

    const now = Date.now();
    const overallExpiryDate = new Date(now + 5 * 60 * 1000);
    const vendorIds = eligibleVendors.map(vendor => vendor._id);

    // Display-only distance (vendor's last synced location -> booking address).
    // Matching remains zone-based; distance never filters or orders vendors.
    const { getVendorBookingDistanceKm } = require('../../services/locationService');
    const distanceFor = (vendor) => getVendorBookingDistanceKm(vendor, booking.address);

    booking.potentialVendors = eligibleVendors.map(vendor => ({
      vendorId: vendor._id,
      distance: distanceFor(vendor)
    }));
    booking.currentWave = 1;
    booking.waveStartedAt = new Date(now);
    booking.expiresAt = overallExpiryDate;
    booking.notifiedVendors = vendorIds;

    if (eligibleVendors.length === 0) {
      const cancellationReason = matchReason === 'NO_ZONE_VENDOR'
        ? 'No service providers are currently registered in your area.'
        : 'No service providers are currently available in your area.';

      booking.status = BOOKING_STATUS.CANCELLED;
      booking.matchFailureReason = matchReason || 'NO_AVAILABLE_VENDOR';
      booking.cancelledAt = new Date();
      booking.cancelledBy = 'system';
      booking.cancellationReason = cancellationReason;
      booking.dispatchState = 'DISPATCHED';
      await booking.save();

      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io) {
        io.to(`user_${booking.userId?._id || booking.userId}`).emit('booking_search_failed', {
          bookingId: booking._id,
          message: cancellationReason
        });
      }
      console.warn(`[dispatchBookingToVendors] No available vendors in zone for booking ${booking.bookingNumber}`);
    } else {
      booking.status = BOOKING_STATUS.SEARCHING;
      booking.dispatchState = 'DISPATCHED';
      await booking.save();

      console.log(`[dispatchBookingToVendors] Broadcasting booking ${booking.bookingNumber} to ${eligibleVendors.length} available vendors in its zone`);

      const bookingRequests = eligibleVendors.map(vendor => ({
        bookingId: booking._id,
        vendorId: vendor._id,
        status: 'PENDING',
        wave: 1,
        distance: distanceFor(vendor),
        sentAt: new Date(now),
        expiresAt: overallExpiryDate
      }));

      try {
        await BookingRequest.insertMany(bookingRequests, { ordered: false });
      } catch (err) {
        if (err.code !== 11000) console.error('[dispatchBookingToVendors] BookingRequest insert error:', err);
      }

      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io) {
        eligibleVendors.forEach(vendor => {
          const vendorRoom = `vendor_${vendor._id.toString()}`;
          io.to(vendorRoom).emit('new_booking_request', {
            bookingId: booking._id,
            serviceName: booking.serviceName || booking.serviceId?.title,
            customerName: booking.userId?.name,
            customerPhone: booking.userId?.phone,
            scheduledDate: booking.scheduledDate,
            scheduledTime: booking.scheduledTime,
            price: booking.finalAmount,
            address: booking.address,
            distance: distanceFor(vendor),
            serviceCategory: booking.serviceCategory,
            brandName: booking.brandName,
            brandIcon: booking.brandIcon,
            categoryIcon: booking.categoryIcon,
            createdAt: booking.createdAt || new Date(now),
            waveStartedAt: new Date(now),
            expiresAt: overallExpiryDate.toISOString(),
            playSound: true,
            message: 'New booking request in your service zone!'
          });
        });
      }

      try {
        await Promise.all(eligibleVendors.map(vendor => createNotification({
          vendorId: vendor._id,
          type: 'booking_request',
          title: 'New Booking Request',
          message: `New service request for ${booking.serviceName} from ${booking.userId?.name}`,
          relatedId: booking._id,
          relatedType: 'booking',
          data: {
            bookingId: booking._id,
            serviceName: booking.serviceName,
            customerName: booking.userId?.name,
            customerPhone: booking.userId?.phone,
            scheduledDate: booking.scheduledDate,
            scheduledTime: booking.scheduledTime,
            location: booking.address,
            price: booking.finalAmount,
            distance: distanceFor(vendor)
          },
          pushData: {
            type: 'new_booking',
            dataOnly: false,
            link: `/vendor/bookings/${booking._id}`
          }
        })));
      } catch (notifError) {
        console.error('[dispatchBookingToVendors] Notification Error:', notifError.message);
      }
    }

    // Clear user cart after the one-shot dispatch decision.
    if (booking.userId?._id || booking.userId) {
      const Cart = require('../../models/Cart');
      await Cart.findOneAndUpdate({ userId: booking.userId._id || booking.userId }, { $set: { items: [] } });
    }
  } catch (error) {
    if (dispatchClaimed) {
      await Booking.findOneAndUpdate(
        { _id: bookingId, status: BOOKING_STATUS.SEARCHING, dispatchState: 'DISPATCHING' },
        { $set: { dispatchState: 'PENDING' } }
      ).catch(resetError => console.error('[dispatchBookingToVendors] Dispatch reset error:', resetError));
    }
    console.error('[dispatchBookingToVendors] Error dispatching to zone vendors:', error);
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  addReview,
  getUserRatings,
  dispatchBookingToVendors,
  notifyAssignedSlotVendor
};

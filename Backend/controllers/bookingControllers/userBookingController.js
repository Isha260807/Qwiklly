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
const { getSlotRules, isDateWithinWindow, isSlotStartAllowed } = require('../../services/slotSettingsService');

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
      Service.findById(serviceId).select('title basePrice discountPrice description images iconUrl categoryId category categoryIds hourlyRate pricingType pricePerUnit billingUnitMinutes durationStepMinutes pricePer30Minutes minDurationMinutes maxDurationMinutes durationPricing').lean(),
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

    // Every scheduled booking (fixed-price or duration/hourly) is silently assigned
    // from the admin-marked vendor slots. Duration/hourly bookings keep their timer
    // and extra-time billing; they just occupy as many consecutive slots as their
    // booked duration needs.
    const hasHourlyPricing = ['HOURLY', 'DURATION'].includes(String(service.pricingType || '').toUpperCase())
      || (Array.isArray(bookedItems) && bookedItems.some(item => {
        const itemType = item.pricingType || item.card?.pricingType;
        return ['HOURLY', 'DURATION'].includes(String(itemType || '').toUpperCase())
          || Boolean(item.hours || item.card?.hours);
      }));
    const isSlotBooking = isScheduledBooking;
    // This is the only branch that owns the NORMAL SERVICE -> SLOT behavior.
    // Duration-based and hourly scheduled bookings keep their existing path.
    const isNormalSlotBooking = isSlotBooking && !hasHourlyPricing;
    const itemMinutes = (item) => item.card?.durationMinutes || item.durationMinutes
      || ((item.card?.hours || item.hours || 0) * 60);
    let slotDurationMins = Array.isArray(bookedItems)
      ? bookedItems.reduce((sum, item) => sum + itemMinutes(item) * (item.quantity || 1), 0)
      : 0;
    if (hasHourlyPricing && slotDurationMins === 0) {
      slotDurationMins = service.minDurationMinutes || 30;
    }
    const requestedDateValue = new Date(scheduledDate);
    const storedScheduledDate = isSlotBooking
      ? new Date(`${requestedDateValue.toISOString().slice(0, 10)}T00:00:00.000Z`)
      : requestedDateValue;

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
      lng: bookingLocation.lng
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
      const slotRules = await getSlotRules();
      if (!isDateWithinWindow(requestedDateValue.toISOString().slice(0, 10), slotRules)
        || !isSlotStartAllowed(timeSlot.start, slotRules)) {
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
        // Fixed-price NORMAL scheduled services use the global approximate
        // service duration for slot blocking. Duration/hourly services keep
        // using the duration selected by the customer.
        durationMins: hasHourlyPricing ? slotDurationMins : slotRules.slotServiceDurationMins,
        intervalMins: slotRules.intervalMins
      });

      if (slotMatch.reason === 'INVALID_SLOT') {
        return res.status(400).json({
          success: false,
          code: 'INVALID_SLOT',
          message: 'Please select a valid date and time slot.'
        });
      }

      assignedSlotVendor = slotMatch.vendor;
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
    let bookingStatus = matchFailureReason
      ? BOOKING_STATUS.CANCELLED
      : (isSlotBooking ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.SEARCHING);
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
      const effectiveType = cardObj.pricingType || item.pricingType || (service.pricingType === 'DURATION' ? 'DURATION' : (item.hours ? 'HOURLY' : 'FIXED'));
      const durationMins = cardObj.durationMinutes || item.durationMinutes || (cardObj.hours ? cardObj.hours * 60 : (item.hours ? item.hours * 60 : null));
      const billingUnit = Number(cardObj.billingUnitMinutes || item.billingUnitMinutes || service.billingUnitMinutes || 30);
      const pricePerUnit = cardObj.pricePerUnit || item.pricePerUnit || service.pricePerUnit || service.pricePer30Minutes || null;
      const pricePer30 = billingUnit === 30 ? pricePerUnit : (cardObj.pricePer30Minutes || item.pricePer30Minutes || service.pricePer30Minutes || null);

      return {
        brandName: item.brandName || item.sectionTitle || item.brand || '',
        brandIcon: item.brandIcon || item.sectionIcon || item.icon || null,
        serviceName: item.serviceName || item.title || service.title || '',
        card: {
          title: cardObj.title || item.title || service.title,
          subtitle: cardObj.subtitle || item.description || '',
          price: cardObj.price ?? item.price ?? 0,
          originalPrice: cardObj.originalPrice ?? item.originalPrice ?? null,
          duration: cardObj.duration || (durationMins ? `${durationMins} mins` : ''),
          description: cardObj.description || item.description || '',
          imageUrl: cardObj.imageUrl || item.icon || service.iconUrl || '',
          features: cardObj.features || [],
          pricingType: effectiveType,
          durationMinutes: durationMins,
          pricePerUnit,
          billingUnitMinutes: billingUnit,
          pricePer30Minutes: pricePer30,
          hours: cardObj.hours || (durationMins ? durationMins / 60 : null)
        },
        quantity: item.quantity || item.serviceCount || 1
      };
    }) : [];

    console.log('[CreateBooking] About to save with formatted items:', JSON.stringify(formattedBookedItems, null, 2));

    // Detect DURATION / HOURLY priced bookings and snapshot duration/rates for timer
    const totalBookedMinutes = formattedBookedItems.reduce((sum, item) => {
      const mins = item.card?.durationMinutes || (item.card?.hours ? item.card.hours * 60 : 0);
      return sum + (mins * (item.quantity || 1));
    }, 0);

    let hourlyTracking = { isHourly: false };
    if (totalBookedMinutes > 0 || service.pricingType === 'DURATION' || service.pricingType === 'HOURLY') {
      const effectiveDuration = totalBookedMinutes > 0 ? totalBookedMinutes : (service.minDurationMinutes || 30);
      const effectiveHourlyRate = service.pricingType === 'DURATION'
        ? ((service.pricePerUnit || service.pricePer30Minutes || (service.basePrice || 0)) * (60 / (service.billingUnitMinutes || 30)))
        : (service.hourlyRate || 0);

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
      paymentMethod: paymentMethod || null,
      status: bookingStatus,
      assignedAt: assignedSlotVendor ? new Date() : null,
      ...(isNormalSlotBooking && assignedSlotVendor ? { vendorAssignmentStatus: 'ACCEPTED' } : {}),
      paymentStatus: bookingPaymentStatus,
      hourlyTracking,
      ...(matchFailureReason ? {
        cancelledAt: new Date(),
        cancelledBy: 'system',
        cancellationReason
      } : {})
    };

    // The unique vendor/date/start index is the atomic reservation gate. If a
    // concurrent request wins the first candidate, re-read availability and
    // try the next eligible vendor before reporting that the slot is gone.
    let booking;
    const maxSlotAttempts = isNormalSlotBooking ? Math.max(1, nearbyVendors.length) : 1;
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
          durationMins: hasHourlyPricing ? slotDurationMins : slotRules.slotServiceDurationMins,
          intervalMins: slotRules.intervalMins
        });

        if (!retryMatch.vendor) {
          const unavailableError = new Error('This slot is currently unavailable. Please select another time slot.');
          unavailableError.code = 'SLOT_UNAVAILABLE';
          throw unavailableError;
        }

        assignedSlotVendor = retryMatch.vendor;
        bookingData.vendorId = assignedSlotVendor._id;
        bookingData.timeSlot.end = retryMatch.slotEnd || timeSlot.end;
        bookingData.assignedAt = new Date();
      }
    }

    // Create Audit / Coupon Usage Record if a coupon was used - skipped when
    // the booking was immediately auto-cancelled (no vendor available), so
    // the coupon isn't burned on a booking that never happened.
    if (!matchFailureReason && pricing.couponInfo && pricing.couponInfo.couponId) {
      try {
        await CouponUsage.create({
          couponId: pricing.couponInfo.couponId,
          couponCode: pricing.couponInfo.code,
          userId: user._id,
          bookingId: booking._id,
          discountAmount: pricing.couponDiscount,
          orderAmount: pricing.basePrice,
          finalAmount: pricing.finalAmount,
          status: (pricing.isFreeUnderPlan || paymentMethod === 'cash') ? 'CONSUMED' : 'APPLIED'
        });

        // If free or COD cash, increment coupon usage count immediately
        if (pricing.isFreeUnderPlan || paymentMethod === 'cash') {
          await Coupon.findByIdAndUpdate(pricing.couponInfo.couponId, { $inc: { usedCount: 1 } });
        }
      } catch (usageErr) {
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
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        vendorId: booking.vendorId || null,
        finalAmount: booking.finalAmount,
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
          if (isSlotBooking && bookingForBackground.vendorId) {
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
      return res.status(409).json({
        success: false,
        code: error.code === 'DUPLICATE_BOOKING' ? 'DUPLICATE_BOOKING' : 'SLOT_UNAVAILABLE',
        message: error.code === 'DUPLICATE_BOOKING'
          ? 'You already have a booking for this service and slot.'
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
        message: 'A scheduled booking has been assigned to you.'
      });
    }

    await createNotification({
      vendorId,
      type: 'booking_request',
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
        type: 'booking_request',
        link: `/vendor/booking/${booking._id}`
      }
    });
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
 * Cancel booking
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

    const booking = await Booking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
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

    // --- REFUND & CANCELLATION FEE LOGIC ---
    let refundAmount = 0;
    let cancellationFee = 0;
    let refundMessage = '';

    // Fetch dynamic cancellation penalty from Settings
    const Settings = require('../../models/Settings');
    let settingsPenalty = 0; // Default — admin se set hoga
    try {
      const globalSettings = await Settings.findOne({ type: 'global' });
      if (globalSettings && globalSettings.cancellationPenalty !== undefined) {
        settingsPenalty = globalSettings.cancellationPenalty;
      }
    } catch (err) {
      console.error('Error fetching settings for cancellation penalty:', err);
    }

    const hasStartedJourney = !!booking.journeyStartedAt;
    const isPaid = booking.paymentStatus === PAYMENT_STATUS.SUCCESS;

    if (hasStartedJourney) {
      // SCENARIO: Worker/Vendor already started journey

      const hasReached = !!booking.visitedAt || booking.status === 'visited';

      if (hasReached) {
        // Professional Reached -> Full Visiting Charges
        cancellationFee = booking.visitingCharges || 49;
      } else {
        // Before Arrival (Journey Started) -> Dynamic Penalty
        cancellationFee = settingsPenalty;
      }

      if (isPaid) {
        // User paid upfront -> Refund (Total - Fee)
        refundAmount = Math.max(0, booking.finalAmount - cancellationFee);
        refundMessage = `Booking cancelled after ${hasReached ? 'professional arrival' : 'journey start'}. Refund of ₹${refundAmount} initiated (Cancellation Fee: ₹${cancellationFee} deducted).`;
      } else {
        // User hasn't paid (e.g. COD or pending) -> Add Penalty to Wallet for Next Booking
        refundAmount = 0;
        refundMessage = `Booking cancelled after ${hasReached ? 'professional arrival' : 'journey start'}. A cancellation fee of ₹${cancellationFee} has been added to your account and will be charged on your next booking.`;

        // We will add this to user.wallet.penalty below
      }
    } else {
      // SCENARIO: Cancelled before journey start
      // Policy: Full Refund
      cancellationFee = 0;

      if (isPaid) {
        refundAmount = booking.finalAmount;
        refundMessage = `Booking cancelled successfully. Full refund of ₹${refundAmount} initiated to your wallet.`;
      } else {
        refundAmount = 0;
        refundMessage = 'Booking cancelled successfully.';
      }
    }

    // Update User Wallet
    if (refundAmount > 0 || (cancellationFee > 0 && !isPaid)) {
      const User = require('../../models/User');
      const Transaction = require('../../models/Transaction');

      const user = await User.findById(userId);

      // 1. Process Refund
      if (refundAmount > 0) {
        user.wallet.balance = (user.wallet.balance || 0) + refundAmount;

        await Transaction.create({
          userId: user._id,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          paymentMethod: 'wallet',
          description: `Refund for booking #${booking.bookingNumber}`,
          bookingId: booking._id,
          balanceAfter: user.wallet.balance
        });

        booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
      }

      // 2. Process Cancellation Fee (Add to Penalty Bucket if Unpaid)
      if (cancellationFee > 0 && !isPaid) {
        // Use wallet.penalty bucket
        user.wallet.penalty = (user.wallet.penalty || 0) + cancellationFee;
        // Do NOT create a 'debit' transaction yet, as money hasn't left.
        // Or create a 'penalty_added' transaction?
        // User didn't ask for transaction record logic, just functionality.
        // We will skip transaction for penalty addition to keep it simple,
        // as the actual CHARGE happens on next booking creation.

        console.log(`[CancelBooking] Added penalty of ₹${cancellationFee} to user ${userId}. Total Penalty: ${user.wallet.penalty}`);
      }

      await user.save();
    }

    // Update booking status
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'user';
    booking.cancellationReason = cancellationReason || 'Cancelled by user';

    await booking.save();

    // ── Restore Coupon if Applicable ──
    if (booking.coupon && booking.coupon.couponId) {
      try {
        const usage = await CouponUsage.findOne({ bookingId: booking._id });
        if (usage) {
          if (usage.status === 'CONSUMED') {
            await Coupon.findByIdAndUpdate(usage.couponId, { $inc: { usedCount: -1 } });
          }
          usage.status = 'CANCELLED';
          await usage.save();
        }
      } catch (couponRestoreErr) {
        console.error('[CancelBooking] Error restoring coupon usage:', couponRestoreErr);
      }
    }

    // Send notification to user
    await createNotification({
      userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: refundMessage || `Your booking ${booking.bookingNumber} has been cancelled.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: {
        type: 'booking_cancelled',
        bookingId: booking._id.toString(),
        link: `/user/booking/${booking._id}`
      }
    });

    // Manual FCM push removed (handled by createNotification)

    // Send notification to vendor
    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Booking ${booking.bookingNumber} has been cancelled by the customer.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: {
          type: 'booking_cancelled',
          bookingId: booking._id.toString(),
          link: `/vendor/bookings/${booking._id}`
        }
      });
      // Manual FCM push removed
    }

    // Notify worker if assigned
    if (booking.workerId) {
      await createNotification({
        workerId: booking.workerId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Job ${booking.bookingNumber} has been cancelled by the customer.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: {
          type: 'job_cancelled',
          bookingId: booking._id.toString(),
          link: `/worker/job/${booking._id}`
        }
      });
      // Manual FCM push removed
    }

    res.status(200).json({
      success: true,
      message: refundMessage || 'Booking cancelled successfully',
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

    // zoneId was resolved at booking creation and is the permanent geographic
    // scope for this booking. Vendor coordinates are intentionally ignored.
    let zoneVendors = [];
    let matchReason = null;
    if (booking.zoneId) {
      const zone = await Zone.findById(booking.zoneId).lean();
      if (zone) {
        const matchResult = await findQualifiedVendors({
          zone,
          serviceTitle: bookedServiceTitle
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
  dispatchBookingToVendors
};

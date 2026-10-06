const { checkBookingServiceability } = require('../../services/serviceabilityService');
const Service = require('../../models/UserService');
const { findSlotCandidateVendors, getBookableSlotMap } = require('../../services/vendorMatchService');
const { getSlotRules, isDateWithinWindow, isSlotStartAllowed } = require('../../services/slotSettingsService');
const { MATCH_FAILURE_REASONS } = require('../../utils/constants');

const HARD_BLOCK_REASONS = [
  MATCH_FAILURE_REASONS.OUT_OF_SERVICE_ZONE,
  MATCH_FAILURE_REASONS.ZONE_INACTIVE,
  MATCH_FAILURE_REASONS.SERVICE_NOT_AVAILABLE_IN_ZONE,
  MATCH_FAILURE_REASONS.INVALID_LOCATION,
  'SERVICE_NOT_FOUND'
];

/**
 * @route GET /api/public/slot-availability?serviceId=&lat=&lng=&durationMins=
 *        (durationMins: booked duration for duration/hourly services; omit for fixed-price)
 * @desc  Bookable slot starts ("HH:MM") for every date in the booking window, as
 *        { availability: { 'YYYY-MM-DD': ['09:00', ...] } }; dates with no slot
 *        are omitted. A slot is bookable when at least one zone vendor has it
 *        marked by admin and is not already booked. Advisory - createBooking
 *        re-validates and is the source of truth.
 * @access Public
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { serviceId, lat, lng } = req.query;
    const durationMins = Math.max(0, parseInt(req.query.durationMins, 10) || 0);
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required' });
    }
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng are required' });
    }

    const serviceability = await checkBookingServiceability({ serviceId, lat: latNum, lng: lngNum });
    if (!serviceability.zone || HARD_BLOCK_REASONS.includes(serviceability.reason)) {
      return res.status(200).json({ success: true, availability: {}, reason: serviceability.reason });
    }

    const [rules, service] = await Promise.all([
      getSlotRules(),
      Service.findById(serviceId).select('pricingType').lean()
    ]);

    // The global approximate duration is only the occupancy duration for
    // fixed-price NORMAL scheduled bookings. Duration/hourly services use the
    // customer-selected durationMins query value exactly as before.
    const isDurationBased = ['HOURLY', 'DURATION'].includes(
      String(service?.pricingType || '').toUpperCase()
    );
    const effectiveDurationMins = durationMins > 0 || isDurationBased
      ? durationMins
      : rules.slotServiceDurationMins;

    // Window = today .. today + rules.maxDaysInAdvance (UTC date keys, same as bookings)
    const dateKeys = [];
    const today = new Date();
    for (let i = 0; i <= rules.maxDaysInAdvance; i++) {
      const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
      const key = day.toISOString().slice(0, 10);
      if (isDateWithinWindow(key, rules)) dateKeys.push(key);
    }

    const vendors = await findSlotCandidateVendors(serviceability.zone);
    const slotMap = await getBookableSlotMap({
      vendors,
      dateKeys,
      intervalMins: rules.intervalMins,
      durationMins: effectiveDurationMins
    });

    const availability = {};
    Object.entries(slotMap).forEach(([dateKey, starts]) => {
      const allowed = starts.filter(start => isSlotStartAllowed(start, rules));
      if (allowed.length > 0) availability[dateKey] = allowed;
    });

    res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available slots' });
  }
};

const Settings = require('../models/Settings');
const { parseSlotTime } = require('./vendorMatchService');

// Scheduled bookings are open for one month ahead.
const BOOKING_WINDOW_DAYS = 30;

const DEFAULT_LEAD_TIME_HOURS = 0.5;

const normalizeLeadTimeHours = (value) => {
  const parsed = Number(value);
  // `1` was the legacy default. The current product rule is 30 minutes.
  if (!Number.isFinite(parsed) || parsed < 0 || parsed === 1) return DEFAULT_LEAD_TIME_HOURS;
  return parsed;
};

const SLOT_TIME_ZONE = 'Asia/Kolkata';
const slotDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SLOT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

/**
 * The global booking-slot setup (Settings -> Booking Slots & Timing) is the
 * master list of bookable slots. Vendor availability can only narrow it down,
 * so SLOT booking checks both server-side.
 */
const getSlotRules = async () => {
  const settings = await Settings.findOne({ type: 'global' })
    .select('slotStartHour slotEndHour slotIntervalMins leadTimeHours slotServiceDurationMins disabledSlots')
    .lean();

  return {
    startMinutes: Number(settings?.slotStartHour ?? 9) * 60,
    endMinutes: Number(settings?.slotEndHour ?? 21) * 60,
    intervalMins: Number(settings?.slotIntervalMins) || 60,
    leadTimeHours: normalizeLeadTimeHours(settings?.leadTimeHours),
    // Used only by fixed-price NORMAL scheduled bookings. Duration/hourly
    // services provide their own selected duration and must not use this.
    slotServiceDurationMins: Number(settings?.slotServiceDurationMins) || 45,
    maxDaysInAdvance: BOOKING_WINDOW_DAYS,
    disabledSlots: settings?.disabledSlots || []
  };
};

/** Whether the booking date is within today..today+maxDaysInAdvance (UTC date keys). */
const isDateWithinWindow = (dateKey, rules) => {
  const today = new Date();
  const todayKey = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const target = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(target.getTime())) return false;
  const diffDays = Math.round((target - todayKey) / 86400000);
  return diffDays >= 0 && diffDays <= rules.maxDaysInAdvance;
};

/** Whether a slot start ("HH:MM") is an active slot in the global setup. */
const isSlotStartAllowed = (startValue, rules) => {
  const start = parseSlotTime(startValue);
  if (start === null) return false;
  if (start < rules.startMinutes || start >= rules.endMinutes) return false;
  if ((start - rules.startMinutes) % rules.intervalMins !== 0) return false;

  const pad = (n) => String(n).padStart(2, '0');
  const normalized = `${pad(Math.floor(start / 60))}:${pad(start % 60)}`;
  return !rules.disabledSlots.includes(normalized);
};

/** Whether a slot starts after the lead time in the Asia/Kolkata business timezone. */
const isSlotStartInFuture = (dateKey, startValue, now = new Date(), leadTimeHours = DEFAULT_LEAD_TIME_HOURS) => {
  const start = parseSlotTime(startValue);
  const current = new Date(now);
  if (start === null || Number.isNaN(current.getTime())) return false;

  const parts = Object.fromEntries(
    slotDateTimeFormatter.formatToParts(current)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );

  const currentDateKey = [parts.year, parts.month, parts.day].join('-');
  if (dateKey > currentDateKey) return true;
  if (dateKey < currentDateKey) return false;

  const currentMinutes = (Number(parts.hour) * 60) + Number(parts.minute);
  return start >= currentMinutes + (Number(leadTimeHours) * 60);
};

module.exports = {
  getSlotRules,
  isDateWithinWindow,
  isSlotStartAllowed,
  normalizeLeadTimeHours,
  isSlotStartInFuture
};

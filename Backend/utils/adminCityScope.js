// Zone scope helpers for admin controllers.
// The filename is kept for backwards compatibility with older imports; city
// names are intentionally no longer used as an authorization boundary.

const normalizeZoneIds = (req) => {
  if (!Array.isArray(req?.adminZoneIds)) return null;
  return req.adminZoneIds.map((id) => String(id));
};

const getAdminZoneIds = (req) => normalizeZoneIds(req);

const getAdminVendorZoneFilter = (req) => {
  const zoneIds = normalizeZoneIds(req);
  return zoneIds === null ? {} : { zoneIds: { $in: zoneIds } };
};

const getAdminBookingZoneFilter = (req) => {
  const zoneIds = normalizeZoneIds(req);
  return zoneIds === null ? {} : { zoneId: { $in: zoneIds } };
};

// User records do not have a canonical zone field. Their admin visibility is
// derived from bookings captured in the administrator's assigned zones.
const getAdminUserZoneFilter = (req) => {
  const userIds = Array.isArray(req?.adminUserIds) ? req.adminUserIds : null;
  return userIds === null ? {} : { _id: { $in: userIds } };
};

// Legacy exports prevent an accidental city-based filter from surviving in a
// controller that has not yet been migrated.
const getAdminCityRegex = () => null;
const getAdminUserCityFilter = getAdminUserZoneFilter;
const getAdminVendorCityFilter = getAdminVendorZoneFilter;
const getAdminBookingCityFilter = getAdminBookingZoneFilter;

module.exports = {
  getAdminZoneIds,
  getAdminVendorZoneFilter,
  getAdminBookingZoneFilter,
  getAdminUserZoneFilter,
  getAdminCityRegex,
  getAdminUserCityFilter,
  getAdminVendorCityFilter,
  getAdminBookingCityFilter
};

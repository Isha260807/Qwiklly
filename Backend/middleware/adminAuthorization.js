const { authenticate } = require('./authMiddleware');
const { isAdmin } = require('./roleMiddleware');
const {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  DEFAULT_SUB_ADMIN_PERMISSIONS
} = require('../utils/constants');

// Admin management itself remains Super Admin-only. All other sidebar
// modules are controlled by the permissions selected while creating the admin.
const SUPER_ADMIN_ONLY_PATHS = [
  ['/admins', ADMIN_PERMISSIONS.ADMIN_MANAGEMENT]
];

const PATH_PERMISSIONS = [
  ['/dashboard', ADMIN_PERMISSIONS.DASHBOARD],
  ['/users', ADMIN_PERMISSIONS.USERS],
  ['/vendor-services', ADMIN_PERMISSIONS.CATALOG],
  ['/vendor-parts', ADMIN_PERMISSIONS.CATALOG],
  ['/categories', ADMIN_PERMISSIONS.CATALOG],
  ['/services', ADMIN_PERMISSIONS.CATALOG],
  ['/brands', ADMIN_PERMISSIONS.CATALOG],
  ['/home-content', ADMIN_PERMISSIONS.CATALOG],
  ['/banners', ADMIN_PERMISSIONS.CATALOG],
  ['/upload', ADMIN_PERMISSIONS.CATALOG],
  ['/vendor-wallets', ADMIN_PERMISSIONS.SETTINGS],
  ['/salary-payments', ADMIN_PERMISSIONS.SETTINGS],
  ['/salary-earnings', ADMIN_PERMISSIONS.SETTINGS],
  ['/vendors', ADMIN_PERMISSIONS.VENDORS],
  ['/bookings', ADMIN_PERMISSIONS.BOOKINGS],
  ['/coupons', ADMIN_PERMISSIONS.COUPONS],
  ['/zones', ADMIN_PERMISSIONS.ZONES],
  ['/payments', ADMIN_PERMISSIONS.PAYMENTS],
  ['/transactions', ADMIN_PERMISSIONS.TRANSACTIONS],
  // Analytics pages are exposed from the Users and Vendors modules. Keep
  // their report APIs aligned with the permission used to open those pages;
  // otherwise a sub-admin can see the menu item but receives a 403 from the
  // report endpoint unless the unrelated global Reports permission is also
  // assigned.
  ['/reports/customers', ADMIN_PERMISSIONS.USERS],
  ['/reports/vendors', ADMIN_PERMISSIONS.VENDORS],
  ['/reports', ADMIN_PERMISSIONS.REPORTS],
  ['/reviews', ADMIN_PERMISSIONS.REVIEWS],
  ['/plans', ADMIN_PERMISSIONS.PLANS],
  ['/notifications', ADMIN_PERMISSIONS.NOTIFICATIONS],
  ['/settlements', ADMIN_PERMISSIONS.SETTLEMENTS],
  ['/support-tickets', ADMIN_PERMISSIONS.SUPPORT],
  ['/settings', ADMIN_PERMISSIONS.SETTINGS]
];

const startsWithPath = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

// Zone names are part of service/vendor records, so modules that can view
// those records need read-only zone metadata even when Zone Management is
// not assigned. Zone CRUD remains protected by the `zones` permission;
// service/vendor/banner assignments are controlled by their own modules.
const READ_ONLY_ZONE_VIEW_PERMISSIONS = [
  ADMIN_PERMISSIONS.CATALOG,
  ADMIN_PERMISSIONS.VENDORS,
  ADMIN_PERMISSIONS.BOOKINGS
];

const isReadOnlyZoneMetadataRequest = (req) => {
  if (req.method !== 'GET') return false;
  return req.path === '/zones' || /^\/zones\/[^/]+$/.test(req.path);
};

const getAdminPermissionForPath = (path) => {
  const normalizedPath = path || '/';

  for (const [prefix, permission] of SUPER_ADMIN_ONLY_PATHS) {
    if (startsWithPath(normalizedPath, prefix)) return permission;
  }

  for (const [prefix, permission] of PATH_PERMISSIONS) {
    if (startsWithPath(normalizedPath, prefix)) return permission;
  }

  return null;
};

const getAdminRole = (req) => req.user?.role || req.userRole;

const isSuperAdminUser = (req) => getAdminRole(req) === ADMIN_ROLES.SUPER_ADMIN;

const getAdminPermissions = (req) => {
  if (isSuperAdminUser(req)) return new Set(Object.values(ADMIN_PERMISSIONS));

  const storedPermissions = req.user?.permissions;

  // Older `admin` records have no permission array. Treat them as legacy
  // sub-admins until a super admin explicitly assigns a different set.
  return new Set(Array.isArray(storedPermissions) ? storedPermissions : DEFAULT_SUB_ADMIN_PERMISSIONS);
};

const PERMISSION_ALIASES = {
  [ADMIN_PERMISSIONS.ZONES]: [ADMIN_PERMISSIONS.SETTINGS_ZONES],
  [ADMIN_PERMISSIONS.ADMIN_MANAGEMENT]: [ADMIN_PERMISSIONS.SETTINGS_ADMINS],
  // Financial Info now includes the legacy Billing & Company Details access.
  [ADMIN_PERMISSIONS.SETTINGS_FINANCIAL]: [ADMIN_PERMISSIONS.SETTINGS_BILLING]
};

const hasAdminPermission = (req, permission) => {
  const permissions = getAdminPermissions(req);
  return permissions.has(permission) || (PERMISSION_ALIASES[permission] || []).some(alias => permissions.has(alias));
};

const requireAdminPermission = (req, res, next) => {
  const permission = getAdminPermissionForPath(req.path);

  // Unknown admin endpoints are denied for non-super-admins by default. This
  // prevents newly added APIs from accidentally becoming sub-admin accessible.
  if (!permission) {
    if (isSuperAdminUser(req)) return next();
    return res.status(403).json({
      success: false,
      message: 'Access denied. This admin module is restricted.'
    });
  }

  const canReadZoneMetadata =
    permission === ADMIN_PERMISSIONS.ZONES &&
    isReadOnlyZoneMetadataRequest(req) &&
    READ_ONLY_ZONE_VIEW_PERMISSIONS.some((viewPermission) => hasAdminPermission(req, viewPermission));

  if (!hasAdminPermission(req, permission) && !canReadZoneMetadata) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Permission required: ${permission}`
    });
  }

  if (
    !isSuperAdminUser(req) &&
    [ADMIN_PERMISSIONS.SETTINGS, ADMIN_PERMISSIONS.ADMIN_MANAGEMENT].includes(permission)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This module is available only to the Super Admin.'
    });
  }

  req.adminPermission = permission;
  next();
};

const requireAdminSettingsPermission = (permissionOrPermissions) => (req, res, next) => {
  if (isSuperAdminUser(req)) return next();
  const required = Array.isArray(permissionOrPermissions) ? permissionOrPermissions : [permissionOrPermissions];
  if (required.some(permission => hasAdminPermission(req, permission))) return next();
  return res.status(403).json({
    success: false,
    message: 'Access denied. This Settings section was not assigned to this admin.'
  });
};

const SETTINGS_FIELD_PERMISSIONS = [
  [ADMIN_PERMISSIONS.SETTINGS_FINANCIAL, ['visitedCharges', 'instantBookingCharges', 'serviceGstPercentage', 'partsGstPercentage', 'servicePayoutPercentage', 'partsPayoutPercentage', 'tdsPercentage', 'platformFeePercentage', 'cancellationPenalty', 'maxSearchTime', 'paymentTimeoutMinutes', 'isOnlinePaymentEnabled']],
  [ADMIN_PERMISSIONS.SETTINGS_REFERRAL, ['referralEnabled', 'referrerRewardAmount', 'referredRewardAmount']],
  [ADMIN_PERMISSIONS.SETTINGS_FINANCIAL, ['companyName', 'companyGSTIN', 'companyPAN', 'companyAddress', 'companyCity', 'companyState', 'companyPincode', 'companyPhone', 'companyEmail', 'invoicePrefix', 'sacCode']],
  [ADMIN_PERMISSIONS.SETTINGS_SUPPORT, ['supportEmail', 'supportPhone', 'supportWhatsapp']],
  [ADMIN_PERMISSIONS.SETTINGS_LEGAL, ['termsOfService', 'privacyPolicy']],
  [ADMIN_PERMISSIONS.SETTINGS_SLOTS, ['slotStartHour', 'slotEndHour', 'slotIntervalMins', 'maxDaysInAdvance', 'leadTimeHours', 'slotServiceDurationMins', 'disabledSlots', 'customSlots']]
];

const requireAdminSettingsUpdatePermission = (req, res, next) => {
  if (isSuperAdminUser(req)) return next();
  const bodyKeys = Object.keys(req.body || {});
  const requiredPermissions = SETTINGS_FIELD_PERMISSIONS
    .filter(([, fields]) => fields.some(field => bodyKeys.includes(field)))
    .map(([permission]) => permission);

  if (!requiredPermissions.length || requiredPermissions.every(permission => hasAdminPermission(req, permission))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. One or more Settings sections were not assigned to this admin.'
  });
};

/** All administrator accounts operate globally. ZoneIds remain only as a
 * backwards-compatible data field and are not used as an access boundary. */
const applyAdminZoneScope = async (req, res, next) => {
  req.adminZoneIds = null;
  req.adminUserIds = null;
  next();
};

// Applied once at the /api/admin mount. Individual route middleware remains
// in place for backwards compatibility, while this layer provides a single
// server-side permission boundary for every admin module.
const adminAccessControl = [
  authenticate,
  isAdmin,
  requireAdminPermission,
  applyAdminZoneScope
];

module.exports = {
  adminAccessControl,
  getAdminPermissionForPath,
  getAdminPermissions,
  hasAdminPermission,
  requireAdminPermission,
  requireAdminSettingsPermission,
  requireAdminSettingsUpdatePermission,
  applyAdminZoneScope,
  // Backwards-compatible export name for any route-level imports.
  applyAdminCityScope: applyAdminZoneScope
};

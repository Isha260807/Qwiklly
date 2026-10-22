export const DEFAULT_ADMIN_PERMISSIONS = [
  'dashboard',
  'users',
  'vendors',
  'bookings',
  'catalog',
  'coupons'
];

export const ADMIN_PERMISSION_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'users', label: 'Users' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'catalog', label: 'User Catalog' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'coupons', label: 'Coupons' },
  { value: 'zones', label: 'Zone Management' },
  { value: 'payments', label: 'Payments' },
  { value: 'settlements', label: 'Settlements' },
  { value: 'reports', label: 'Reports' },
  { value: 'support', label: 'Support & SOS' }
];

export const SETTINGS_PERMISSION_OPTIONS = [
  { value: 'settings_financial', label: 'Financial Info' },
  { value: 'settings_referral', label: 'Referral Settings' },
  { value: 'settings_slots', label: 'Booking Slots & Timing' },
  { value: 'settings_legal', label: 'Terms & Privacy Content' }
];

const SUPER_ADMIN_ONLY_PATHS = [['/admins', 'admin_management']];

const PATH_PERMISSIONS = [
  ['/dashboard', 'dashboard'],
  ['/users', 'users'],
  ['/vendors/wallets', 'settings'],
  ['/vendors', 'vendors'],
  ['/bookings', 'bookings'],
  ['/user-categories', 'catalog'],
  ['/banners', 'catalog'],
  ['/coupons', 'coupons'],
  ['/reviews', 'reviews'],
  ['/zones', 'zones'],
  ['/payments', 'payments'],
  ['/settlements', 'settlements'],
  ['/reports', 'reports'],
  ['/support', 'support'],
  ['/plans', 'plans'],
  ['/notifications', 'notifications'],
  ['/transactions', 'transactions'],
  ['/settings', 'settings']
];

const ADMIN_ENTRY_PATHS = [
  ['/admin/dashboard', 'dashboard'],
  ['/admin/users', 'users'],
  ['/admin/vendors', 'vendors'],
  ['/admin/bookings', 'bookings'],
  ['/admin/user-categories', 'catalog'],
  ['/admin/reviews', 'reviews'],
  ['/admin/coupons', 'coupons'],
  ['/admin/zones', 'zones'],
  ['/admin/payments', 'payments'],
  ['/admin/settlements', 'settlements'],
  ['/admin/reports', 'reports'],
  ['/admin/support', 'support']
];

const matchesPath = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

export const getAdminPermissionForPath = (pathname = '') => {
  const path = pathname.replace(/^\/admin/, '') || '/';

  for (const [prefix, permission] of SUPER_ADMIN_ONLY_PATHS) {
    if (matchesPath(path, prefix)) return permission;
  }

  for (const [prefix, permission] of PATH_PERMISSIONS) {
    if (matchesPath(path, prefix)) return permission;
  }

  return path === '/' ? 'dashboard' : null;
};

export const canAccessAdminPath = (pathname, adminData = {}) => {
  if (adminData.role === 'super_admin') return true;

  const permission = getAdminPermissionForPath(pathname);
  if (!permission) return false;

  // Settings are reserved for Super Admin. This also blocks older stored
  // permissions from exposing the Settings route to a sub-admin.
  if (permission === 'settings') return false;

  const permissions = Array.isArray(adminData.permissions)
    ? adminData.permissions
    : DEFAULT_ADMIN_PERMISSIONS;

  const aliases = {
    zones: ['settings_zones'],
    admin_management: ['settings_admins']
  };

  return permissions.includes(permission) || (aliases[permission] || []).some(alias => permissions.includes(alias));
};

// Send a sub-admin to the first module they were actually assigned instead of
// always sending them to Dashboard (which may not be part of their access).
export const getFirstAccessibleAdminPath = (adminData = {}) => {
  if (adminData.role === 'super_admin') return '/admin/dashboard';

  const accessiblePath = ADMIN_ENTRY_PATHS.find(([path]) => canAccessAdminPath(path, adminData));
  return accessiblePath?.[0] || null;
};

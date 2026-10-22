const Admin = require('../../models/Admin');
const { validationResult } = require('express-validator');
const {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  DEFAULT_SUB_ADMIN_PERMISSIONS
} = require('../../utils/constants');

const ADMIN_PERMISSION_VALUES = new Set(Object.values(ADMIN_PERMISSIONS));
const SUPER_ADMIN_ONLY_PERMISSIONS = new Set([
  ADMIN_PERMISSIONS.SETTINGS,
  ADMIN_PERMISSIONS.SETTINGS_PROFILE,
  ADMIN_PERMISSIONS.SETTINGS_SUPPORT,
  ADMIN_PERMISSIONS.SETTINGS_FINANCIAL,
  ADMIN_PERMISSIONS.SETTINGS_BILLING,
  ADMIN_PERMISSIONS.SETTINGS_REFERRAL,
  ADMIN_PERMISSIONS.SETTINGS_SLOTS,
  ADMIN_PERMISSIONS.SETTINGS_ZONES,
  ADMIN_PERMISSIONS.SETTINGS_ADMINS
]);

const normalizePermissions = (permissions, role) => {
  if (role === ADMIN_ROLES.SUPER_ADMIN) return [];
  if (!Array.isArray(permissions)) return [...DEFAULT_SUB_ADMIN_PERMISSIONS];
  return [...new Set(permissions.filter(permission => (
    ADMIN_PERMISSION_VALUES.has(permission) && !SUPER_ADMIN_ONLY_PERMISSIONS.has(permission)
  )))];
};

/**
 * Get all admins (Super Admin only)
 */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({ isDeleted: { $ne: true } })
      .select('-password')
      .populate('cityId', 'name')
      .populate('zoneIds', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
};

/**
 * Create new admin (Super Admin only)
 */
const createAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, cityId, cityName, permissions } = req.body;
    const resolvedRole = role || ADMIN_ROLES.SUB_ADMIN;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      password,
      role: resolvedRole,
      zoneIds: [],
      cityId: cityId || null,
      cityName: cityName || '',
      permissions: normalizePermissions(permissions, resolvedRole)
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        cityId: admin.cityId,
        cityName: admin.cityName,
        zoneIds: admin.zoneIds || [],
        permissions: admin.permissions || []
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
};

/**
 * Delete admin (Super Admin only)
 * Note: Primary super admin (admin@admin.com) cannot be deleted
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Protect primary super admin
    if (admin.email === 'admin@admin.com') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the primary super admin account'
      });
    }

    // Keep a tombstone instead of physically removing the record. This lets
    // login/session checks distinguish a deleted profile from a wrong email.
    admin.isDeleted = true;
    admin.isActive = false;
    admin.deletedAt = new Date();
    admin.deletedBy = req.user.id;
    await admin.save();

    try {
      const { getIO } = require('../../sockets');
      getIO().to(`admin_${admin._id.toString()}`).emit('admin_profile_deleted', {
        code: 'ADMIN_DELETED',
        message: 'Your profile was deleted by admin.'
      });
    } catch (socketError) {
      console.warn('Could not send admin deletion event:', socketError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete admin' });
  }
};

/**
 * Update admin role (Super Admin only)
 */
const updateAdminRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!Object.values(ADMIN_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be super_admin, sub_admin or admin'
      });
    }

    // Prevent self-demotion
    if (id === req.user.id && role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const currentAdmin = await Admin.findById(id).select('_id');
    if (!currentAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    const admin = await Admin.findByIdAndUpdate(
      id,
      {
        role,
        permissions: []
      },
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Admin role updated successfully',
      data: admin
    });
  } catch (error) {
    console.error('Update admin role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin role' });
  }
};

module.exports = {
  getAllAdmins,
  createAdmin,
  deleteAdmin,
  updateAdminRole,

  /**
   * Update admin details (Super Admin only)
   */
  updateAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, role, cityId, cityName, permissions } = req.body;

      // Find admin
      let admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      // Check email uniqueness if changed
      if (email && email !== admin.email) {
        const existing = await Admin.findOne({ email });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already in use' });
        }
      }

      // Update fields
      if (name) admin.name = name;
      if (email) admin.email = email;
      if (password) admin.password = password; // Pre-save hook will hash it
      if (cityId !== undefined) admin.cityId = cityId || null; // Allow clearing city
      if (cityName !== undefined) admin.cityName = cityName || '';

      if (role && Object.values(ADMIN_ROLES).includes(role)) {
        // Prevent self-demotion
        if (id === req.user.id && role !== 'super_admin' && admin.role === 'super_admin') {
          return res.status(400).json({ success: false, message: 'Cannot demote yourself' });
        }
        admin.role = role;
        admin.permissions = role === ADMIN_ROLES.SUPER_ADMIN
          ? []
          : normalizePermissions(permissions, role);
        admin.zoneIds = [];
      } else if (Array.isArray(permissions) && admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
        admin.permissions = normalizePermissions(permissions, admin.role);
      } else if (admin.role !== ADMIN_ROLES.SUPER_ADMIN && (!Array.isArray(admin.permissions) || admin.permissions.length === 0)) {
        admin.permissions = [...DEFAULT_SUB_ADMIN_PERMISSIONS];
      }

      // Zone assignment is retained only for backwards-compatible records;
      // administrator access is global.
      admin.zoneIds = [];

      await admin.save();

      // Populate city for response
      await admin.populate('cityId', 'name');
      await admin.populate('zoneIds', 'name');

      res.status(200).json({
        success: true,
        message: 'Admin updated successfully',
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          cityId: admin.cityId,
          cityName: admin.cityName,
          zoneIds: admin.zoneIds || [],
          permissions: admin.permissions || [],
          isActive: admin.isActive
        }
      });
    } catch (error) {
      console.error('Update admin error:', error);
      res.status(500).json({ success: false, message: 'Failed to update admin' });
    }
  },

  /**
   * Toggle admin status (Block/Unblock)
   */
  toggleAdminStatus: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent self-blocking
      if (id === req.user.id) {
        return res.status(400).json({ success: false, message: 'Cannot block yourself' });
      }

      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      // Protect primary super admin
      if (admin.email === 'admin@admin.com') {
        return res.status(400).json({ success: false, message: 'Cannot block primary super admin' });
      }

      admin.isActive = !admin.isActive;
      await admin.save();

      // End every active session immediately when an admin is blocked. The
      // HTTP middleware still protects the next request as a fallback.
      if (!admin.isActive) {
        try {
          const { getIO } = require('../../sockets');
          getIO().to(`admin_${admin._id.toString()}`).emit('admin_blocked', {
            code: 'ADMIN_BLOCKED',
            message: 'Blocked by admin.'
          });
        } catch (socketError) {
          console.warn('Could not send admin block event:', socketError.message);
        }
      }

      res.status(200).json({
        success: true,
        message: `Admin ${admin.isActive ? 'unblocked' : 'blocked'} successfully`,
        data: { isActive: admin.isActive }
      });
    } catch (error) {
      console.error('Toggle status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update status' });
    }
  }
};

const Admin = require('../../models/Admin');
const { generateTokenPair, verifyRefreshToken } = require('../../utils/tokenService');
const { USER_ROLES, ADMIN_ROLES } = require('../../utils/constants');
const { validationResult } = require('express-validator');

/**
 * Login admin with email and password
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find admin with password
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (admin.isDeleted) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_DELETED',
        message: 'Your profile was deleted by admin.'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_BLOCKED',
        message: 'Blocked by admin.'
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: admin._id,
      role: USER_ROLES.ADMIN // Force Uppercase ADMIN role from constants
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        cityId: admin.cityId,
        cityName: admin.cityName,
        zoneIds: admin.zoneIds || [],
        permissions: admin.permissions || []
      },
      ...tokens
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Logout admin
 */
const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { email, currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(adminId).select('+password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Verify current password
    if (currentPassword) {
      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
    } else if (newPassword) {
      // If setting new password, current password is required
      return res.status(400).json({ success: false, message: 'Current password is required to set new password' });
    }

    // Update fields
    if (email) admin.email = email;
    if (newPassword) admin.password = newPassword;

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
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
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id)
      .populate('cityId', 'name')
      .populate('zoneIds', 'name');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.status(200).json({
      success: true,
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
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

/**
 * Refresh an admin access token after verifying the refresh token and the
 * current database status of the admin account.
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: suppliedRefreshToken } = req.body;

    if (!suppliedRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(suppliedRefreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    if (![USER_ROLES.ADMIN, 'ADMIN', ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN, ADMIN_ROLES.LEGACY_ADMIN]
      .includes(decoded.role)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin refresh token'
      });
    }

    const admin = await Admin.findById(decoded.userId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.isDeleted) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_DELETED',
        message: 'Your profile was deleted by admin.'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_BLOCKED',
        message: 'Blocked by admin.'
      });
    }

    const tokens = generateTokenPair({
      userId: admin._id,
      role: USER_ROLES.ADMIN
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Admin refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

module.exports = {
  login,
  logout,
  updateProfile,
  getProfile,
  refreshToken
};


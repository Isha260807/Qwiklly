const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ADMIN_ROLES, ADMIN_PERMISSIONS, DEFAULT_SUB_ADMIN_PERMISSIONS } = require('../utils/constants');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    select: false
  },
  role: {
    type: String,
    enum: Object.values(ADMIN_ROLES),
    default: ADMIN_ROLES.SUB_ADMIN
  },
  permissions: {
    type: [String],
    enum: Object.values(ADMIN_PERMISSIONS),
    default: function () {
      return this.role === ADMIN_ROLES.SUPER_ADMIN
        ? []
        : [...DEFAULT_SUB_ADMIN_PERMISSIONS];
    }
  },
  // Kept for backwards compatibility with older records. Administrator access
  // is global and is controlled only by the permissions field.
  zoneIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
    default: [],
    index: true
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    default: null // Deprecated compatibility field; access is controlled by zoneIds.
  },
  cityName: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Keep a deletion tombstone so an already logged-in admin can be ended
  // immediately and a later login can show the correct reason.
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);


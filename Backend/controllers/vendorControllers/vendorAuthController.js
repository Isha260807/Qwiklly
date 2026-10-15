const crypto = require('crypto');
const Vendor = require('../../models/Vendor');
const { generateOTP, hashOTP, storeOTP, verifyOTP, checkRateLimit } = require('../../utils/redisOtp.util');
const { generateTokenPair, verifyRefreshToken, generateVerificationToken, verifyVerificationToken } = require('../../utils/tokenService');
const { sendOTP: sendSMSOTP } = require('../../services/smsService');
const cloudinaryService = require('../../services/cloudinaryService');
const { USER_ROLES, VENDOR_STATUS } = require('../../utils/constants');
const { validationResult } = require('express-validator');
const { setVendorPresence } = require('../../services/vendorPresenceService');
const createVendorSessionId = () => crypto.randomBytes(32).toString('hex');

const notifyPreviousVendorSession = (vendorId, loginSessionId) => {
  try {
    const { getIO } = require('../../sockets');
    const io = getIO();
    const vendorRoom = 'vendor_' + vendorId.toString();
    io.to(vendorRoom).emit('vendor_session_replaced', {
      code: 'VENDOR_SESSION_REPLACED',
      message: 'Your account was logged in on another device.',
      sessionId: loginSessionId
    });

    // Also close stale server-side sockets in case the browser misses the event.
    void io.in(vendorRoom).fetchSockets()
      .then(sockets => sockets.forEach(sessionSocket => {
        if (sessionSocket.loginSessionId !== loginSessionId) {
          sessionSocket.disconnect(true);
        }
      }))
      .catch(error => console.error('[AUTH] Failed to close previous vendor socket:', error));
  } catch (error) {
    if (!/not initialized/i.test(error?.message || '')) {
      console.error('[AUTH] Failed to notify previous vendor session:', error);
    }
  }
};

const createVendorLoginSession = async (vendorId) => {
  const loginSessionId = createVendorSessionId();
  await Vendor.findByIdAndUpdate(vendorId, {
    $set: { loginSessionId, fcmTokens: [], fcmTokenMobile: [] }
  });
  notifyPreviousVendorSession(vendorId, loginSessionId);
  return loginSessionId;
};

/**
 * Send OTP for vendor registration/login
 */
const sendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, email } = req.body;

    // Check existing vendor status to prevent OTP if restricted
    const existingVendor = await Vendor.findOne({ phone });
    if (existingVendor) {
      if (existingVendor.approvalStatus === VENDOR_STATUS.REJECTED) {
        return res.status(403).json({ success: false, message: 'Your vendor account has been rejected. Please contact support.' });
      }
      if (existingVendor.approvalStatus === VENDOR_STATUS.SUSPENDED) {
        return res.status(403).json({ success: false, message: 'Your vendor account has been suspended. Please contact support.' });
      }
      if (!existingVendor.isActive) {
        return res.status(403).json({ success: false, message: 'Your vendor account has been deactivated. Please contact support.' });
      }
    }

    // 1. Rate limit check
    const allowed = await checkRateLimit(phone);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after 10 minutes.'
      });
    }

    // 2. Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // 3. Store OTP (Redis primary, MongoDB fallback)
    await storeOTP(phone, otpHash);

    // 4. Trigger SMS delivery without blocking the API response.
    // OTP is already stored, so the vendor can open the OTP screen immediately
    // even if the SMS gateway is slow or temporarily unavailable.
    void sendSMSOTP(phone, otp)
      .then((smsResult) => {
        if (!smsResult.success) {
          console.warn(`[OTP] SMS failed for vendor ${phone}, but OTP stored`);
        }
      })
      .catch((smsError) => {
        console.error(`[OTP] SMS delivery error for vendor ${phone}:`, smsError.message);
      });

    // Log OTP in development mode
    if (process.env.NODE_ENV === 'development' || process.env.USE_DEFAULT_OTP === 'true') {
      console.log(`[DEV] Vendor OTP for ${phone}: ${otp}`);
    }


    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      token: 'verification-pending'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

/**
 * Verify OTP and Check Vendor Status (Unified Login/Signup Entry)
 */
const normalizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');

const isValidIndianMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

/**
 * Send OTP before changing a vendor's login mobile number.
 */
const sendPhoneChangeOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const phone = normalizePhoneNumber(req.body.phone);
    if (!isValidIndianMobile(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number'
      });
    }

    const vendor = await Vendor.findById(req.user.id).select('_id phone');
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.phone === phone) {
      return res.status(400).json({
        success: false,
        message: 'This is already your current mobile number'
      });
    }

    const existingVendor = await Vendor.findOne({ phone }).select('_id');
    if (existingVendor && existingVendor._id.toString() !== vendor._id.toString()) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered with another vendor'
      });
    }

    if (!(await checkRateLimit(phone))) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.'
      });
    }

    const otp = generateOTP(phone);
    await storeOTP(phone, hashOTP(otp));

    void sendSMSOTP(phone, otp)
      .then((smsResult) => {
        if (!smsResult.success) {
          console.warn('[OTP] Phone change SMS failed for ' + phone);
        }
      })
      .catch((smsError) => {
        console.error('[OTP] Phone change SMS error for ' + phone + ':', smsError.message);
      });

    if (process.env.NODE_ENV === 'development' || process.env.USE_DEFAULT_OTP === 'true') {
      console.log('[DEV] Phone change OTP for ' + phone + ': ' + otp);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your new mobile number'
    });
  } catch (error) {
    console.error('Send phone change OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

/**
 * Verify the new mobile number and update the vendor login number.
 */
const verifyPhoneChangeOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const phone = normalizePhoneNumber(req.body.phone);
    if (!isValidIndianMobile(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number'
      });
    }

    const vendor = await Vendor.findById(req.user.id).select('_id phone name email businessName');
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.phone === phone) {
      return res.status(400).json({
        success: false,
        message: 'This is already your current mobile number'
      });
    }

    const existingVendor = await Vendor.findOne({ phone }).select('_id');
    if (existingVendor && existingVendor._id.toString() !== vendor._id.toString()) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered with another vendor'
      });
    }

    const verification = await verifyOTP(phone, req.body.otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message || 'Invalid OTP'
      });
    }

    const updatedVendor = await Vendor.findOneAndUpdate(
      { _id: vendor._id, phone: vendor.phone },
      {
        $set: {
          phone,
          isPhoneVerified: true
        }
      },
      { new: true, runValidators: true }
    ).select('_id name email phone businessName');

    if (!updatedVendor) {
      return res.status(409).json({
        success: false,
        message: 'Profile changed while verifying. Please try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mobile number updated successfully',
      vendor: {
        id: updatedVendor._id,
        name: updatedVendor.name,
        email: updatedVendor.email,
        phone: updatedVendor.phone,
        businessName: updatedVendor.businessName
      }
    });
  } catch (error) {
    console.error('Verify phone change OTP error:', error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered with another vendor'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update mobile number. Please try again.'
    });
  }
};
const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // 1. Verify OTP
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // 2. Check if vendor exists
    const vendor = await Vendor.findOne({ phone });

    if (vendor) {
      // EXISTING VENDOR

      // Check status checks (Login Logic)
      if (vendor.approvalStatus === VENDOR_STATUS.REJECTED) {
        return res.status(403).json({ success: false, message: 'Your vendor account has been rejected. Please contact support.' });
      }
      if (vendor.approvalStatus === VENDOR_STATUS.SUSPENDED) {
        return res.status(403).json({ success: false, message: 'Your vendor account has been suspended. Please contact support.' });
      }
      if (!vendor.isActive) {
        return res.status(403).json({ success: false, message: 'Your vendor account has been deactivated. Please contact support.' });
      }

      const loginSessionId = await createVendorLoginSession(vendor._id);

      const presence = await setVendorPresence({
        vendorId: vendor._id,
        isOnline: true,
        source: 'login',
        sessionId: loginSessionId,
        eventId: `login:${vendor._id}:${loginSessionId}`
      });

      const tokens = generateTokenPair({
        userId: vendor._id,
        role: USER_ROLES.VENDOR,
        loginSessionId
      });

      return res.status(200).json({
        success: true,
        isNewUser: false,
        message: 'Login successful',
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          businessName: vendor.businessName,
          service: vendor.service,
          approvalStatus: vendor.approvalStatus,
          registrationCompleted: vendor.registrationCompleted === true,
          isOnline: presence.isOnline,
          availability: presence.availability
        },
        ...tokens
      });

    } else {
      // NEW VENDOR -> RETURN VERIFICATION TOKEN
      const verificationToken = generateVerificationToken(phone);

      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'OTP verified. Please complete registration.',
        verificationToken
      });
    }

  } catch (error) {
    console.error('Verify Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

/**
 * Register vendor with Verification Token (Service/Category Removed)
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    // Ignore service validation error if present (since removed)
    const validErrors = errors.array().filter(e => e.path !== 'service');

    if (validErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validErrors
      });
    }

    // verificationToken handling
    const { name, email, verificationToken, aadhar, pan } = req.body;
    let phone = req.body.phone;

    if (verificationToken) {
      const verifiedPhone = verifyVerificationToken(verificationToken);
      if (!verifiedPhone) return res.status(400).json({ success: false, message: 'Invalid verification session.' });
      phone = verifiedPhone;
    } else {
      // Fallback OTP
      if (!req.body.otp) return res.status(400).json({ success: false, message: 'Verification required.' });
      const ver = await verifyOTP(phone, req.body.otp);
      if (!ver.success) return res.status(400).json({ success: false, message: ver.message });
    }

    // Check existing
    const existing = await Vendor.findOne({ $or: [{ phone }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Vendor already exists. Login.' });
    }

    // Upload documents
    let aadharUrl = req.body.aadharDocument || null;
    let aadharBackUrl = req.body.aadharBackDocument || null;
    let panUrl = req.body.panDocument || null;
    let otherUrls = req.body.otherDocuments || [];

    const uploadDocument = async (document, folder) => {
      if (!document || !document.startsWith('data:')) return document;

      const uploadRes = await cloudinaryService.uploadFile(document, { folder });
      return uploadRes.success ? uploadRes.url : document;
    };


    const vendor = await Vendor.create({
      name, email, phone,
      service: [], // Default empty as requested
      aadhar: {
        number: aadhar,
        document: aadharUrl,
        backDocument: aadharBackUrl
      },
      pan: { number: pan, document: panUrl },
      otherDocuments: otherUrls,
      approvalStatus: VENDOR_STATUS.PENDING,
      registrationCompleted: true,
      isPhoneVerified: true
    });

    // Upload documents after the response path so external storage latency cannot block registration.
    void (async () => {
      try {
        const [uploadedAadharUrl, uploadedAadharBackUrl, uploadedPanUrl, uploadedOtherUrls] = await Promise.all([
          uploadDocument(aadharUrl, 'vendors/documents'),
          uploadDocument(aadharBackUrl, 'vendors/documents'),
          uploadDocument(panUrl, 'vendors/documents'),
          Promise.all((otherUrls || []).map(document => uploadDocument(document, 'vendors/documents/others')))
        ]);

        await Vendor.findByIdAndUpdate(vendor._id, {
          $set: {
            'aadhar.document': uploadedAadharUrl,
            'aadhar.backDocument': uploadedAadharBackUrl,
            'pan.document': uploadedPanUrl,
            otherDocuments: uploadedOtherUrls
          }
        });
      } catch (e) {
        console.error('Vendor document upload error', e);
      }
    })();

    // Notifications must not delay a completed registration response.
    void (async () => {
      try {
      const { createNotification } = require('../notificationControllers/notificationController');
      const Admin = require('../../models/Admin');
      const admins = await Admin.find({ isActive: true }).select('_id');
      for (const admin of admins) {
        await createNotification({
          adminId: admin._id,
          type: 'vendor_approval_request',
          title: '👤 New Vendor Registration',
          message: `${vendor.name} (${vendor.phone}) has registered`,
          relatedId: vendor._id,
          relatedType: 'vendor',
          data: { vendorId: vendor._id, vendorName: vendor.name, phone: vendor.phone },
          pushData: { type: 'admin_alert', link: '/admin/vendors/all' }
        });
      }
      } catch (e) {
        console.error('Notify error', e);
      }
    })();

    const loginSessionId = await createVendorLoginSession(vendor._id);


    const tokens = generateTokenPair({
      userId: vendor._id,
      role: USER_ROLES.VENDOR,
      loginSessionId
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Pending approval.',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        approvalStatus: vendor.approvalStatus,
        registrationCompleted: vendor.registrationCompleted === true,
      },
      ...tokens
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed.'
    });
  }
};

/**
 * Login vendor with OTP
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

    const { phone, otp } = req.body;

    // Verify OTP (checks Redis first, falls back to MongoDB)
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Find vendor
    const vendor = await Vendor.findOne({ phone });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found. Please sign up first.'
      });
    }

    if (vendor.approvalStatus === VENDOR_STATUS.REJECTED) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been rejected. Please contact support.'
      });
    }

    if (vendor.approvalStatus === VENDOR_STATUS.SUSPENDED) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    if (!vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    const loginSessionId = await createVendorLoginSession(vendor._id);
    const presence = await setVendorPresence({
      vendorId: vendor._id,
      isOnline: true,
      source: 'login',
      sessionId: loginSessionId,
      eventId: `login:${vendor._id}:${loginSessionId}`
    });

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: vendor._id,
      role: USER_ROLES.VENDOR,
      loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        service: vendor.service,
        approvalStatus: vendor.approvalStatus,
        registrationCompleted: vendor.registrationCompleted === true,
        isOnline: presence.isOnline,
        availability: presence.availability
      },
      ...tokens
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Logout vendor
 */
const logout = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;

    // Only the currently active session may log the vendor out.
    if (!req.user?.id || !req.authSessionId) {
      return res.status(401).json({
        success: false,
        code: 'VENDOR_SESSION_REPLACED',
        message: 'Your vendor session is no longer active. Please login again.'
      });
    }

    const presence = await setVendorPresence({
      vendorId: req.user.id,
      isOnline: false,
      source: 'logout',
      sessionId: req.authSessionId,
      eventId: req.headers['x-event-id'] || req.body.eventId || 'logout:' + req.user.id + ':' + req.authSessionId
    });

    if (presence.reason === 'STALE_SESSION') {
      return res.status(401).json({
        success: false,
        code: 'VENDOR_SESSION_REPLACED',
        message: 'Your vendor session is no longer active. Please login again.'
      });
    }

    const updateFields = platform === 'mobile'
      ? { fcmTokenMobile: [], loginSessionId: null }
      : { fcmTokens: [], loginSessionId: null };
    const clearedVendor = await Vendor.findOneAndUpdate(
      { _id: req.user.id, loginSessionId: req.authSessionId },
      { $set: updateFields },
      { new: false }
    ).select('_id');

    if (!clearedVendor) {
      return res.status(401).json({
        success: false,
        code: 'VENDOR_SESSION_REPLACED',
        message: 'Your vendor session is no longer active. Please login again.'
      });
    }

    console.log('[AUTH] ' + platform + ' session cleared and vendor set OFFLINE: ' + req.user.id);
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

/**
 * Refresh Access Token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if vendor exists
    const vendor = await Vendor.findById(decoded.userId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check status (only block if rejected, suspended, or inactive)
    if (vendor.approvalStatus === VENDOR_STATUS.REJECTED || vendor.approvalStatus === VENDOR_STATUS.SUSPENDED || !vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is restricted or inactive'
      });
    }

    // A refresh token is valid only for the currently active vendor session.
    if (!decoded.loginSessionId || !vendor.loginSessionId || decoded.loginSessionId !== vendor.loginSessionId) {
      return res.status(401).json({
        success: false,
        code: 'VENDOR_SESSION_REPLACED',
        message: 'Your account was logged in on another device. Please login again.'
      });
    }
    // Generate new token pair with same session ID
    const tokens = generateTokenPair({
      userId: vendor._id,
      role: USER_ROLES.VENDOR,
      loginSessionId: vendor.loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

module.exports = {
  sendOTP,
  sendPhoneChangeOTP,
  verifyPhoneChangeOTP,
  verifyLogin,
  register,
  login,
  logout,
  refreshToken
};

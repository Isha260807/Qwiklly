const Settings = require('../../models/Settings');
const { clearGlobalSettingsCache } = require('../../services/pricingService');

// Get Global Settings
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ type: 'global' });

    // If no settings exist yet, create default
    if (!settings) {
      settings = await Settings.create({ type: 'global' });
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};

// Update Global Settings
exports.updateSettings = async (req, res, next) => {
  try {
    const {
      visitedCharges,
      instantBookingCharges,
      serviceGstPercentage,
      partsGstPercentage,
      servicePayoutPercentage,
      partsPayoutPercentage,
      tdsPercentage,
      platformFeePercentage,
      cancellationPenalty,
      referralEnabled,
      referrerRewardAmount,
      referredRewardAmount,
      razorpayKeyId,
      razorpayKeySecret,
      razorpayWebhookSecret,
      cloudinaryCloudName,
      cloudinaryApiKey,
      cloudinaryApiSecret,
      // Billing Settings
      companyName, companyGSTIN, companyPAN, companyAddress, companyCity, companyState, companyPincode, companyPhone, companyEmail, invoicePrefix, sacCode,
      // Support Settings
      supportEmail, supportPhone, supportWhatsapp,
      // Booking Timing
      maxSearchTime, paymentTimeoutMinutes,
      // Payment Control
      isOnlinePaymentEnabled,
      // Dynamic Booking Slots Configuration
      slotStartHour, slotEndHour, slotIntervalMins, maxDaysInAdvance, leadTimeHours, slotServiceDurationMins, disabledSlots, customSlots
    } = req.body;

    let settings = await Settings.findOne({ type: 'global' });

    if (!settings) {
      settings = await Settings.create({
        type: 'global',
        visitedCharges,
        instantBookingCharges,
        serviceGstPercentage,
        partsGstPercentage,
        servicePayoutPercentage,
        partsPayoutPercentage,
        tdsPercentage,
        platformFeePercentage,
        cancellationPenalty,
        referralEnabled,
        referrerRewardAmount,
        referredRewardAmount,
        razorpayKeyId,
        razorpayKeySecret,
        razorpayWebhookSecret,
        cloudinaryCloudName,
        cloudinaryApiKey,
        cloudinaryApiSecret,
        maxSearchTime,
        paymentTimeoutMinutes,
        slotStartHour,
        slotEndHour,
        slotIntervalMins,
        maxDaysInAdvance,
        leadTimeHours,
        slotServiceDurationMins,
        disabledSlots,
        customSlots
      });
    } else {
      // Update fields if provided
      if (visitedCharges !== undefined) settings.visitedCharges = visitedCharges;
      if (instantBookingCharges !== undefined) settings.instantBookingCharges = instantBookingCharges;
      if (serviceGstPercentage !== undefined) settings.serviceGstPercentage = serviceGstPercentage;
      if (partsGstPercentage !== undefined) settings.partsGstPercentage = partsGstPercentage;
      if (servicePayoutPercentage !== undefined) settings.servicePayoutPercentage = servicePayoutPercentage;
      if (partsPayoutPercentage !== undefined) settings.partsPayoutPercentage = partsPayoutPercentage;
      if (tdsPercentage !== undefined) settings.tdsPercentage = tdsPercentage;
      if (platformFeePercentage !== undefined) settings.platformFeePercentage = platformFeePercentage;
      if (cancellationPenalty !== undefined) settings.cancellationPenalty = cancellationPenalty;
      if (referralEnabled !== undefined) settings.referralEnabled = referralEnabled;
      if (referrerRewardAmount !== undefined) settings.referrerRewardAmount = referrerRewardAmount;
      if (referredRewardAmount !== undefined) settings.referredRewardAmount = referredRewardAmount;
      if (razorpayKeyId !== undefined) settings.razorpayKeyId = razorpayKeyId;
      if (razorpayKeySecret !== undefined) settings.razorpayKeySecret = razorpayKeySecret;
      if (razorpayWebhookSecret !== undefined) settings.razorpayWebhookSecret = razorpayWebhookSecret;
      if (cloudinaryCloudName !== undefined) settings.cloudinaryCloudName = cloudinaryCloudName;
      if (cloudinaryApiKey !== undefined) settings.cloudinaryApiKey = cloudinaryApiKey;
      if (cloudinaryApiSecret !== undefined) settings.cloudinaryApiSecret = cloudinaryApiSecret;

      // Billing update
      if (companyName !== undefined) settings.companyName = companyName;
      if (companyGSTIN !== undefined) settings.companyGSTIN = companyGSTIN;
      if (companyPAN !== undefined) settings.companyPAN = companyPAN;
      if (companyAddress !== undefined) settings.companyAddress = companyAddress;
      if (companyCity !== undefined) settings.companyCity = companyCity;
      if (companyState !== undefined) settings.companyState = companyState;
      if (companyPincode !== undefined) settings.companyPincode = companyPincode;
      if (companyPhone !== undefined) settings.companyPhone = companyPhone;
      if (companyEmail !== undefined) settings.companyEmail = companyEmail;
      if (invoicePrefix !== undefined) settings.invoicePrefix = invoicePrefix;
      if (sacCode !== undefined) settings.sacCode = sacCode;

      // Support update
      if (supportEmail !== undefined) settings.supportEmail = supportEmail;
      if (supportPhone !== undefined) settings.supportPhone = supportPhone;
      if (supportWhatsapp !== undefined) settings.supportWhatsapp = supportWhatsapp;

      // Booking Timing update
      if (maxSearchTime !== undefined) settings.maxSearchTime = maxSearchTime;
      if (paymentTimeoutMinutes !== undefined) settings.paymentTimeoutMinutes = paymentTimeoutMinutes;
      if (isOnlinePaymentEnabled !== undefined) settings.isOnlinePaymentEnabled = isOnlinePaymentEnabled;

      // Dynamic Slots update
      if (slotStartHour !== undefined) settings.slotStartHour = slotStartHour;
      if (slotEndHour !== undefined) settings.slotEndHour = slotEndHour;
      if (slotIntervalMins !== undefined) settings.slotIntervalMins = slotIntervalMins;
      if (maxDaysInAdvance !== undefined) settings.maxDaysInAdvance = maxDaysInAdvance;
      if (leadTimeHours !== undefined) settings.leadTimeHours = leadTimeHours;
      if (slotServiceDurationMins !== undefined) settings.slotServiceDurationMins = slotServiceDurationMins;
      if (disabledSlots !== undefined) settings.disabledSlots = disabledSlots;
      if (customSlots !== undefined) settings.customSlots = customSlots;

      await settings.save();
    }

    clearGlobalSettingsCache();


    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};
// Get Public Settings (Visited Charges, GST, Slots)
exports.getPublicSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ type: 'global' }).select(
      'visitedCharges instantBookingCharges serviceGstPercentage partsGstPercentage supportEmail supportPhone supportWhatsapp cancellationPenalty companyName companyGSTIN companyPAN companyAddress companyCity companyState companyPincode companyPhone companyEmail invoicePrefix sacCode isOnlinePaymentEnabled slotStartHour slotEndHour slotIntervalMins maxDaysInAdvance leadTimeHours slotServiceDurationMins disabledSlots customSlots'
    );

    // Default if not found (fallback values)
    if (!settings) {
      settings = { visitedCharges: 0, instantBookingCharges: 0, serviceGstPercentage: 0, partsGstPercentage: 0 };
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};

const Service = require('../../models/UserService');
const Brand = require('../../models/Brand');
const { validationResult } = require('express-validator');
const { SERVICE_STATUS } = require('../../utils/constants');

const SUPPORTED_BILLING_UNITS = [15, 30, 60];

/**
 * Get all services (with optional filters)
 * GET /api/admin/services
 */
const getAllServices = async (req, res) => {
  try {
    const { status, brandId, categoryId, zoneId, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (brandId) query.brandId = brandId;
    if (categoryId) query.categoryId = categoryId;
    if (zoneId) {
      // A service with an empty zoneIds[] is available in every active
      // zone by design (see checkServiceAvailabilityInZone) - the filter
      // must include those "global" services alongside ones explicitly
      // assigned to this zone, not just the explicit matches.
      query.$or = [
        { zoneIds: zoneId },
        { zoneIds: { $size: 0 } },
        { zoneIds: { $exists: false } }
      ];
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const services = await Service.find(query)
      .populate('brandId', 'title')
      .populate('categoryId', 'title')
      .populate('zoneIds', 'name')
      .sort({ displayOrder: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

/**
 * Get single service by ID
 * GET /api/admin/services/:id
 */
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('brandId', 'title')
      .populate('categoryId', 'title')
      .populate('zoneIds', 'name');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service'
    });
  }
};

/**
 * Create new service (Direct Service)
 * POST /api/admin/services
 */
const createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      brandId,
      categoryId,
      title,
      basePrice,
      originalPrice,
      discountPrice,
      pricingType,
      fixedPrice,
      estimatedDurationMinutes,
      pricePer30Minutes,
      pricePerUnit,
      billingUnitMinutes,
      durationStepMinutes,
      minDurationMinutes,
      maxDurationMinutes,
      hourlyRate,
      minHours,
      maxHours,
      allowCustomHours,
      allowExtraHours,
      allowExtraParts,
      gstPercentage,
      rating,
      ratingCount,
      badge,
      tagline,
      heroBanner,
      inclusions,
      whyLoveTitle,
      whyLove,
      exclusionsTitle,
      exclusions,
      howItWorksTitle,
      howItWorks,
      faqs,
      zoneIds,
      description,
      status,
      iconUrl
    } = req.body;

    // Optional: If brandId is provided, verify it exists
    let validBrandId = null;
    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (brand) validBrandId = brand._id;
    }

    // Resolve pricing type: FIXED or DURATION
    const isDuration = pricingType === 'DURATION' || pricingType === 'HOURLY';
    const resolvedPricingType = isDuration ? 'DURATION' : 'FIXED';

    let resolvedFixedPrice = null;
    let resolvedEstimatedDuration = 30;
    let resolvedPricePerUnit = null;
    let resolvedBillingUnit = 30;
    let resolvedMinDuration = 30;
    let resolvedMaxDuration = 180;
    let resolvedBasePrice = 0;

    if (resolvedPricingType === 'DURATION') {
      resolvedBillingUnit = Number(billingUnitMinutes || 30);
      resolvedPricePerUnit = Number(pricePerUnit || pricePer30Minutes || (hourlyRate ? hourlyRate * (resolvedBillingUnit / 60) : 0) || basePrice || 0);
      resolvedMinDuration = Number(minDurationMinutes || (minHours ? minHours * 60 : resolvedBillingUnit) || resolvedBillingUnit);
      resolvedMaxDuration = Number(maxDurationMinutes || (maxHours ? maxHours * 60 : 180) || 180);

      if (!SUPPORTED_BILLING_UNITS.includes(resolvedBillingUnit)) {
        return res.status(400).json({
          success: false,
          message: `Billing unit must be one of: ${SUPPORTED_BILLING_UNITS.join(', ')} minutes`
        });
      }
      if (!resolvedPricePerUnit || resolvedPricePerUnit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price per billing unit must be greater than 0 for duration-based services'
        });
      }
      if (resolvedMinDuration < resolvedBillingUnit || resolvedMinDuration % resolvedBillingUnit !== 0) {
        return res.status(400).json({
          success: false,
          message: `Minimum duration must be at least ${resolvedBillingUnit} minutes and divisible by the billing unit`
        });
      }
      if (resolvedMaxDuration < resolvedMinDuration || resolvedMaxDuration % resolvedBillingUnit !== 0) {
        return res.status(400).json({
          success: false,
          message: `Maximum duration must be greater than or equal to minimum duration and divisible by ${resolvedBillingUnit}`
        });
      }
      resolvedBasePrice = resolvedPricePerUnit;
    } else {
      resolvedFixedPrice = Number(fixedPrice !== undefined && fixedPrice !== null && fixedPrice !== '' ? fixedPrice : (basePrice || 0));
      resolvedEstimatedDuration = Number(estimatedDurationMinutes || 30);
      resolvedBasePrice = resolvedFixedPrice;
      if (resolvedBasePrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Fixed price cannot be negative'
        });
      }
    }

    const service = await Service.create({
      brandId: validBrandId,
      categoryId: categoryId || null,
      title: title.trim(),
      basePrice: resolvedBasePrice,
      originalPrice: originalPrice ? Number(originalPrice) : 0,
      discountPrice: discountPrice ? Number(discountPrice) : null,
      pricingType: resolvedPricingType,
      fixedPrice: resolvedFixedPrice,
      estimatedDurationMinutes: resolvedEstimatedDuration,
      pricePerUnit: resolvedPricePerUnit,
      billingUnitMinutes: resolvedBillingUnit,
      // Backward compatibility fields
      pricePer30Minutes: resolvedBillingUnit === 30 ? resolvedPricePerUnit : null,
      minDurationMinutes: resolvedMinDuration,
      maxDurationMinutes: resolvedMaxDuration,
      durationStepMinutes: resolvedBillingUnit,
      durationPricing: {
        pricePerUnit: resolvedPricePerUnit,
        billingUnitMinutes: resolvedBillingUnit,
        pricePer30Minutes: resolvedBillingUnit === 30 ? resolvedPricePerUnit : null,
        minDurationMinutes: resolvedMinDuration,
        maxDurationMinutes: resolvedMaxDuration,
        durationStepMinutes: resolvedBillingUnit
      },
      // Backward compatibility fields
      hourlyRate: resolvedPricingType === 'DURATION' ? resolvedPricePerUnit * (60 / resolvedBillingUnit) : null,
      minHours: resolvedMinDuration / 60,
      maxHours: resolvedMaxDuration / 60,
      allowCustomHours: !!allowCustomHours,
      allowExtraHours: allowExtraHours !== undefined ? !!allowExtraHours : true,
      allowExtraParts: allowExtraParts !== undefined ? !!allowExtraParts : true,
      gstPercentage: gstPercentage !== undefined ? Number(gstPercentage) : 18,
      rating: rating !== undefined ? Number(rating) : 4.9,
      ratingCount: ratingCount || '4.9 (237.6k)',
      badge: badge ? badge.trim() : null,
      tagline: tagline ? tagline.trim() : null,
      heroBanner: heroBanner || { imageUrl: null, buttonText: 'BOOK NOW' },
      inclusions: Array.isArray(inclusions) ? inclusions : [],
      whyLoveTitle: whyLoveTitle ? whyLoveTitle.trim() : null,
      whyLove: Array.isArray(whyLove) ? whyLove : [],
      exclusionsTitle: exclusionsTitle ? exclusionsTitle.trim() : null,
      exclusions: Array.isArray(exclusions) ? exclusions : [],
      howItWorksTitle: howItWorksTitle ? howItWorksTitle.trim() : null,
      howItWorks: Array.isArray(howItWorks) ? howItWorks : [],
      faqs: Array.isArray(faqs) ? faqs : [],
      zoneIds: Array.isArray(zoneIds) ? zoneIds : [],
      description: description ? description.trim() : '',
      status: status || SERVICE_STATUS.ACTIVE,
      iconUrl: iconUrl || null
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create service'
    });
  }
};

/**
 * Update service
 * PUT /api/admin/services/:id
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (updates.title !== undefined) service.title = updates.title.trim();
    if (updates.originalPrice !== undefined) service.originalPrice = Number(updates.originalPrice);
    if (updates.discountPrice !== undefined) service.discountPrice = updates.discountPrice ? Number(updates.discountPrice) : null;

    // Pricing type & Duration logic
    const currentType = updates.pricingType !== undefined ? updates.pricingType : service.pricingType;
    const isDuration = currentType === 'DURATION' || currentType === 'HOURLY';
    const resolvedPricingType = isDuration ? 'DURATION' : 'FIXED';
    service.pricingType = resolvedPricingType;

    if (resolvedPricingType === 'DURATION') {
      const billingUnit = Number(
        updates.billingUnitMinutes !== undefined
          ? updates.billingUnitMinutes
          : (service.billingUnitMinutes || 30)
      );
      const pricePerUnit = Number(
        updates.pricePerUnit !== undefined
          ? updates.pricePerUnit
          : (updates.pricePer30Minutes !== undefined
            ? updates.pricePer30Minutes
            : (updates.hourlyRate ? updates.hourlyRate * (billingUnit / 60) : (service.pricePerUnit || service.pricePer30Minutes || (service.hourlyRate ? service.hourlyRate * (billingUnit / 60) : service.basePrice))))
      );
      const minDuration = Number(
        updates.minDurationMinutes !== undefined
          ? updates.minDurationMinutes
          : (updates.minHours ? updates.minHours * 60 : (service.minDurationMinutes || (service.minHours ? service.minHours * 60 : 30)))
      );
      const maxDuration = Number(
        updates.maxDurationMinutes !== undefined
          ? updates.maxDurationMinutes
          : (updates.maxHours ? updates.maxHours * 60 : (service.maxDurationMinutes || (service.maxHours ? service.maxHours * 60 : 180)))
      );

      if (!SUPPORTED_BILLING_UNITS.includes(billingUnit)) {
        return res.status(400).json({
          success: false,
          message: `Billing unit must be one of: ${SUPPORTED_BILLING_UNITS.join(', ')} minutes`
        });
      }
      if (!pricePerUnit || pricePerUnit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price per billing unit must be greater than 0 for duration-based services'
        });
      }
      if (minDuration < billingUnit || minDuration % billingUnit !== 0) {
        return res.status(400).json({
          success: false,
          message: `Minimum duration must be at least ${billingUnit} minutes and divisible by the billing unit`
        });
      }
      if (maxDuration < minDuration || maxDuration % billingUnit !== 0) {
        return res.status(400).json({
          success: false,
          message: `Maximum duration must be greater than or equal to minimum duration and divisible by ${billingUnit}`
        });
      }

      service.basePrice = pricePerUnit;
      service.pricePerUnit = pricePerUnit;
      service.billingUnitMinutes = billingUnit;
      service.pricePer30Minutes = billingUnit === 30 ? pricePerUnit : null;
      service.minDurationMinutes = minDuration;
      service.maxDurationMinutes = maxDuration;
      service.durationStepMinutes = billingUnit;
      service.durationPricing = {
        pricePerUnit,
        billingUnitMinutes: billingUnit,
        pricePer30Minutes: billingUnit === 30 ? pricePerUnit : null,
        minDurationMinutes: minDuration,
        maxDurationMinutes: maxDuration,
        durationStepMinutes: billingUnit
      };
      service.hourlyRate = pricePerUnit * (60 / billingUnit);
      service.minHours = minDuration / 60;
      service.maxHours = maxDuration / 60;
    } else {
      const fixedPriceVal = Number(
        updates.fixedPrice !== undefined
          ? updates.fixedPrice
          : (updates.basePrice !== undefined ? updates.basePrice : (service.fixedPrice || service.basePrice || 0))
      );
      if (fixedPriceVal < 0) {
        return res.status(400).json({
          success: false,
          message: 'Fixed price cannot be negative'
        });
      }
      service.basePrice = fixedPriceVal;
      service.fixedPrice = fixedPriceVal;
      if (updates.estimatedDurationMinutes !== undefined) {
        service.estimatedDurationMinutes = Number(updates.estimatedDurationMinutes);
      }
    }

    if (updates.gstPercentage !== undefined) service.gstPercentage = Number(updates.gstPercentage);
    if (updates.rating !== undefined) service.rating = Number(updates.rating);
    if (updates.ratingCount !== undefined) service.ratingCount = updates.ratingCount;
    if (updates.badge !== undefined) service.badge = updates.badge;
    if (updates.tagline !== undefined) service.tagline = updates.tagline;
    if (updates.heroBanner !== undefined) service.heroBanner = updates.heroBanner;
    if (updates.inclusions !== undefined) service.inclusions = updates.inclusions;
    if (updates.whyLoveTitle !== undefined) service.whyLoveTitle = updates.whyLoveTitle;
    if (updates.whyLove !== undefined) service.whyLove = updates.whyLove;
    if (updates.exclusionsTitle !== undefined) service.exclusionsTitle = updates.exclusionsTitle;
    if (updates.exclusions !== undefined) service.exclusions = updates.exclusions;
    if (updates.howItWorksTitle !== undefined) service.howItWorksTitle = updates.howItWorksTitle;
    if (updates.howItWorks !== undefined) service.howItWorks = updates.howItWorks;
    if (updates.faqs !== undefined) service.faqs = updates.faqs;
    if (updates.zoneIds !== undefined) service.zoneIds = updates.zoneIds;
    if (updates.description !== undefined) service.description = updates.description;
    if (updates.status !== undefined) service.status = updates.status;
    if (updates.iconUrl !== undefined) service.iconUrl = updates.iconUrl;
    if (updates.categoryId !== undefined) service.categoryId = updates.categoryId;
    if (updates.brandId !== undefined) service.brandId = updates.brandId;

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update service'
    });
  }
};

/**
 * Delete service
 * DELETE /api/admin/services/:id
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await service.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service'
    });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};

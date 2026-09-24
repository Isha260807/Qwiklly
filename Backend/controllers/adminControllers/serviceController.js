const Service = require('../../models/UserService');
const Brand = require('../../models/Brand');
const { validationResult } = require('express-validator');
const { SERVICE_STATUS } = require('../../utils/constants');

/**
 * Get all services (with optional filters)
 * GET /api/admin/services
 */
const getAllServices = async (req, res) => {
  try {
    const { status, brandId, categoryId, cityId, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (brandId) query.brandId = brandId;
    if (categoryId) query.categoryId = categoryId;
    if (cityId) {
      query.$or = [
        { cityId: cityId },
        { cityIds: cityId },
        { cityIds: { $size: 0 } },
        { cityIds: { $exists: false } }
      ];
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const services = await Service.find(query)
      .populate('brandId', 'title')
      .populate('categoryId', 'title')
      .populate('cityId', 'name')
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
      .populate('cityId', 'name');

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
      cityIds,
      cityId,
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

    // Validate hourly pricing configuration
    const resolvedPricingType = pricingType === 'HOURLY' ? 'HOURLY' : 'FIXED';
    if (resolvedPricingType === 'HOURLY') {
      if (!hourlyRate || Number(hourlyRate) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Hourly rate is required for hourly services'
        });
      }
      if (minHours !== undefined && maxHours !== undefined && Number(minHours) > Number(maxHours)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum hours cannot be greater than maximum hours'
        });
      }
    }

    const service = await Service.create({
      brandId: validBrandId,
      categoryId: categoryId || null,
      title: title.trim(),
      basePrice: Number(basePrice),
      originalPrice: originalPrice ? Number(originalPrice) : 0,
      discountPrice: discountPrice ? Number(discountPrice) : null,
      pricingType: resolvedPricingType,
      hourlyRate: resolvedPricingType === 'HOURLY' ? Number(hourlyRate) : null,
      minHours: minHours !== undefined ? Number(minHours) : 1,
      maxHours: maxHours !== undefined ? Number(maxHours) : 8,
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
      cityIds: Array.isArray(cityIds) ? cityIds : (cityId ? [cityId] : []),
      cityId: cityId || (Array.isArray(cityIds) && cityIds.length > 0 ? cityIds[0] : null),
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
    if (updates.basePrice !== undefined) service.basePrice = Number(updates.basePrice);
    if (updates.originalPrice !== undefined) service.originalPrice = Number(updates.originalPrice);
    if (updates.discountPrice !== undefined) service.discountPrice = updates.discountPrice ? Number(updates.discountPrice) : null;

    // Hourly pricing configuration
    if (updates.pricingType !== undefined) {
      const resolvedPricingType = updates.pricingType === 'HOURLY' ? 'HOURLY' : 'FIXED';
      const effectiveHourlyRate = updates.hourlyRate !== undefined ? updates.hourlyRate : service.hourlyRate;
      const effectiveMinHours = updates.minHours !== undefined ? updates.minHours : service.minHours;
      const effectiveMaxHours = updates.maxHours !== undefined ? updates.maxHours : service.maxHours;

      if (resolvedPricingType === 'HOURLY') {
        if (!effectiveHourlyRate || Number(effectiveHourlyRate) <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Hourly rate is required for hourly services'
          });
        }
        if (Number(effectiveMinHours) > Number(effectiveMaxHours)) {
          return res.status(400).json({
            success: false,
            message: 'Minimum hours cannot be greater than maximum hours'
          });
        }
      }
      service.pricingType = resolvedPricingType;
    }
    if (updates.hourlyRate !== undefined) service.hourlyRate = updates.hourlyRate ? Number(updates.hourlyRate) : null;
    if (updates.minHours !== undefined) service.minHours = Number(updates.minHours);
    if (updates.maxHours !== undefined) service.maxHours = Number(updates.maxHours);
    if (updates.allowCustomHours !== undefined) service.allowCustomHours = !!updates.allowCustomHours;
    if (updates.allowExtraHours !== undefined) service.allowExtraHours = !!updates.allowExtraHours;
    if (updates.allowExtraParts !== undefined) service.allowExtraParts = !!updates.allowExtraParts;

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
    if (updates.cityIds !== undefined) service.cityIds = updates.cityIds;
    if (updates.cityId !== undefined) service.cityId = updates.cityId;
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

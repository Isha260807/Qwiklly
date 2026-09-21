const Banner = require('../../models/Banner');
const Category = require('../../models/Category');
const Service = require('../../models/UserService');
const City = require('../../models/City');

/**
 * Get all banners with filtering and pagination
 * GET /api/admin/banners
 */
const getAllBanners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      bannerType = '',
      position = '',
      cityId = '',
      isActive = '',
      sortBy = 'order',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { badgeText: { $regex: search, $options: 'i' } }
      ];
    }

    if (bannerType && bannerType !== 'all') {
      query.bannerType = bannerType;
    }

    if (position && position !== 'all') {
      query.position = position;
    }

    if (isActive !== '' && isActive !== 'all') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (cityId && cityId !== 'all') {
      if (cityId === 'null' || cityId === 'all_cities') {
        query.cityId = null;
      } else {
        query.cityId = cityId;
      }
    }

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;
    if (sortBy !== 'createdAt') {
      sortOption.createdAt = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Banner.countDocuments(query);

    const banners = await Banner.find(query)
      .populate('cityId', 'name state')
      .populate('targetCategoryId', 'title slug homeIconUrl')
      .populate('targetServiceId', 'title slug iconUrl basePrice')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      banners,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: error.message
    });
  }
};

/**
 * Get banner statistics
 * GET /api/admin/banners/stats
 */
const getBannerStats = async (req, res) => {
  try {
    const [total, active, inactive, topCount, footerCount] = await Promise.all([
      Banner.countDocuments(),
      Banner.countDocuments({ isActive: true }),
      Banner.countDocuments({ isActive: false }),
      Banner.countDocuments({ bannerType: { $in: ['top', 'hero'] }, isActive: true }),
      Banner.countDocuments({ bannerType: { $in: ['footer', 'bottom'] }, isActive: true })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        topCount,
        heroCount: topCount,
        footerCount
      }
    });
  } catch (error) {
    console.error('Get banner stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner statistics',
      error: error.message
    });
  }
};

/**
 * Get single banner by ID
 * GET /api/admin/banners/:id
 */
const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id)
      .populate('cityId', 'name state')
      .populate('targetCategoryId', 'title slug')
      .populate('targetServiceId', 'title slug');

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.status(200).json({
      success: true,
      banner
    });
  } catch (error) {
    console.error('Get banner by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner details',
      error: error.message
    });
  }
};

/**
 * Create a new banner
 * POST /api/admin/banners
 */
const createBanner = async (req, res) => {
  try {
    const {
      title = '',
      subtitle = '',
      imageUrl,
      bannerType = 'hero',
      position = 'top',
      cityId = null,
      targetType = 'none',
      targetCategoryId = null,
      targetServiceId = null,
      targetUrl = '',
      buttonText = 'Book Now',
      badgeText = '',
      gradientClass = 'from-blue-600 to-indigo-700',
      order = 0,
      isActive = true,
      startDate = null,
      endDate = null
    } = req.body;

    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required'
      });
    }

    // Sanitize object IDs
    const bannerData = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      imageUrl: imageUrl.trim(),
      bannerType,
      position,
      cityId: cityId && cityId !== 'all' && cityId !== 'null' ? cityId : null,
      targetType,
      targetCategoryId: targetType === 'category' && targetCategoryId ? targetCategoryId : null,
      targetServiceId: targetType === 'service' && targetServiceId ? targetServiceId : null,
      targetUrl: targetType === 'url' ? targetUrl.trim() : '',
      buttonText: buttonText.trim() || 'Book Now',
      badgeText: badgeText.trim(),
      gradientClass,
      order: Number(order) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    const newBanner = await Banner.create(bannerData);

    const populatedBanner = await Banner.findById(newBanner._id)
      .populate('cityId', 'name state')
      .populate('targetCategoryId', 'title slug homeIconUrl')
      .populate('targetServiceId', 'title slug iconUrl');

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner: populatedBanner
    });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      error: error.message
    });
  }
};

/**
 * Update an existing banner
 * PUT /api/admin/banners/:id
 */
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      imageUrl,
      bannerType,
      position,
      cityId,
      targetType,
      targetCategoryId,
      targetServiceId,
      targetUrl,
      buttonText,
      badgeText,
      gradientClass,
      order,
      isActive,
      startDate,
      endDate
    } = req.body;

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    if (title !== undefined) banner.title = title.trim();
    if (subtitle !== undefined) banner.subtitle = subtitle.trim();
    if (imageUrl !== undefined) banner.imageUrl = imageUrl.trim();
    if (bannerType !== undefined) banner.bannerType = bannerType;
    if (position !== undefined) banner.position = position;
    if (cityId !== undefined) {
      banner.cityId = cityId && cityId !== 'all' && cityId !== 'null' ? cityId : null;
    }
    if (targetType !== undefined) {
      banner.targetType = targetType;
      if (targetType === 'category') {
        banner.targetCategoryId = targetCategoryId || null;
        banner.targetServiceId = null;
        banner.targetUrl = '';
      } else if (targetType === 'service') {
        banner.targetServiceId = targetServiceId || null;
        banner.targetCategoryId = null;
        banner.targetUrl = '';
      } else if (targetType === 'url') {
        banner.targetUrl = targetUrl ? targetUrl.trim() : '';
        banner.targetCategoryId = null;
        banner.targetServiceId = null;
      } else {
        banner.targetCategoryId = null;
        banner.targetServiceId = null;
        banner.targetUrl = '';
      }
    } else {
      if (targetCategoryId !== undefined) banner.targetCategoryId = targetCategoryId || null;
      if (targetServiceId !== undefined) banner.targetServiceId = targetServiceId || null;
      if (targetUrl !== undefined) banner.targetUrl = targetUrl.trim();
    }

    if (buttonText !== undefined) banner.buttonText = buttonText.trim();
    if (badgeText !== undefined) banner.badgeText = badgeText.trim();
    if (gradientClass !== undefined) banner.gradientClass = gradientClass;
    if (order !== undefined) banner.order = Number(order) || 0;
    if (isActive !== undefined) banner.isActive = Boolean(isActive);
    if (startDate !== undefined) banner.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) banner.endDate = endDate ? new Date(endDate) : null;

    await banner.save();

    const updatedBanner = await Banner.findById(id)
      .populate('cityId', 'name state')
      .populate('targetCategoryId', 'title slug homeIconUrl')
      .populate('targetServiceId', 'title slug iconUrl');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      banner: updatedBanner
    });
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      error: error.message
    });
  }
};

/**
 * Delete a banner
 * DELETE /api/admin/banners/:id
 */
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: error.message
    });
  }
};

/**
 * Toggle banner status (Active/Inactive)
 * PATCH /api/admin/banners/:id/status
 */
const toggleBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: banner.isActive
    });
  } catch (error) {
    console.error('Toggle banner status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle banner status',
      error: error.message
    });
  }
};

/**
 * Reorder multiple banners
 * PATCH /api/admin/banners/reorder
 */
const reorderBanners = async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Orders array is required'
      });
    }

    const updatePromises = orders.map(item =>
      Banner.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully'
    });
  } catch (error) {
    console.error('Reorder banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder banners',
      error: error.message
    });
  }
};

module.exports = {
  getAllBanners,
  getBannerStats,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners
};

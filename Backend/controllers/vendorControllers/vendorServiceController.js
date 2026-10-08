const Service = require('../../models/UserService');
const { SERVICE_STATUS } = require('../../utils/constants');

/**
 * Get vendor's accessible services / active services list
 */
const getVendorServices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const services = await Service.find({
      ...query,
      status: SERVICE_STATUS.ACTIVE
    })
      .populate('categoryId', 'title slug')
      .populate('categoryIds', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments({
      ...query,
      status: SERVICE_STATUS.ACTIVE
    });

    res.status(200).json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get vendor services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services. Please try again.'
    });
  }
};

module.exports = {
  getVendorServices
};

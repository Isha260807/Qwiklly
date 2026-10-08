const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const Service = require('../../models/UserService');
const HomeContent = require('../../models/HomeContent');
const Banner = require('../../models/Banner');

/**
 * Public Catalog Controllers
 * These endpoints are accessible without authentication for user app
 */

/**
 * Get all active categories for user app
 * GET /api/public/categories
 */
const getPublicCategories = async (req, res) => {
  try {
    const { cityId } = req.query;

    // Build query
    const query = { status: 'active' };
    if (cityId) {
      query.cityIds = cityId;
    }

    const categories = await Category.find(query)
      .select('title slug homeIconUrl homeBadge hasSaleBadge homeOrder showOnHome')
      .sort({ homeOrder: 1, createdAt: -1 })
      .lean();

    // Fetch only necessary fields for initial category list
    const initialCategories = categories.map(cat => ({
      id: cat._id.toString(),
      title: cat.title,
      slug: cat.slug,
      icon: cat.homeIconUrl || '',
      badge: cat.homeBadge || '',
      hasSaleBadge: cat.hasSaleBadge || false,
      showOnHome: cat.showOnHome || false
    }));

    res.status(200).json({
      success: true,
      categories: initialCategories
    });
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories. Please try again.'
    });
  }
};

/**
 * Get all active brands for user app (Formerly Services)
 * GET /api/public/brands
 */
const getPublicBrands = async (req, res) => {
  try {
    const { categoryId, categorySlug, search, cityId } = req.query;

    // Build query
    const query = { status: 'active' };
    if (categoryId) query.categoryIds = categoryId;
    if (cityId) query.cityIds = cityId;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: escapedSearch, $options: 'i' };
    }

    let brands = await Brand.find(query)
      .select('title slug iconUrl logo imageUrl badge categoryIds basePrice discountPrice sections')
      .sort({ createdAt: -1 })
      .lean();

    // If categorySlug is provided, filter by category
    if (categorySlug) {
      const catQuery = { slug: categorySlug, status: 'active' };
      if (cityId) {
        catQuery.cityIds = cityId;
      }

      let category = await Category.findOne(catQuery).lean();

      if (!category && cityId) {
        category = await Category.findOne({ slug: categorySlug, status: 'active' }).lean();
      }

      if (category) {
        brands = brands.filter(b =>
          Array.isArray(b.categoryIds) &&
          b.categoryIds.some(id => id.toString() === category._id.toString())
        );
      }
    }

    res.status(200).json({
      success: true,
      brands: brands.map(brand => ({
        id: brand._id.toString(),
        title: brand.title,
        slug: brand.slug,
        icon: brand.iconUrl || '',
        logo: brand.logo || brand.iconUrl || '',
        imageUrl: brand.imageUrl || brand.iconUrl || '',
        badge: brand.badge || '',
        price: brand.basePrice || 0, // Legacy support
        originalPrice: brand.discountPrice ? (brand.basePrice + brand.discountPrice) : (brand.basePrice || 0),
        categoryId: brand.categoryIds && brand.categoryIds.length > 0 ? brand.categoryIds[0].toString() : null,
        categoryIds: (brand.categoryIds || []).map(id => id.toString()),
        sections: brand.sections || []
      }))
    });
  } catch (error) {
    console.error('Get public brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands. Please try again.'
    });
  }
};

/**
 * Get brand by slug for user app
 * GET /api/public/brands/slug/:slug
 */
const getPublicBrandBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const brand = await Brand.findOne({ slug, status: 'active' })
      .populate('categoryIds', 'title slug')
      .lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Remove _id from nested objects
    const cleanBrand = JSON.parse(JSON.stringify(brand));
    const removeIds = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => {
          if (item && typeof item === 'object') {
            const { _id, ...rest } = item;
            return removeIds(rest);
          }
          return item;
        });
      } else if (obj && typeof obj === 'object') {
        const { _id, ...rest } = obj;
        return Object.keys(rest).reduce((acc, key) => {
          acc[key] = removeIds(rest[key]);
          return acc;
        }, {});
      }
      return obj;
    };

    // Fetch services associated with this brand
    const brandServices = await Service.find({ brandId: brand._id, status: 'active' }).lean();

    // Map services to a default section structure for the frontend
    const servicesSection = {
      title: brand.title,
      subtitle: 'Available Services',
      cards: brandServices.map(svc => ({
        id: svc._id.toString(),
        title: svc.title,
        subtitle: svc.description || '',
        price: svc.basePrice,
        rating: "4.8", // Default rating
        reviews: "1k+", // Default reviews
        imageUrl: svc.iconUrl || brand.iconUrl || '',
        features: svc.description ? [svc.description] : [],
        duration: "60 min" // Default duration
      }))
    };

    const formattedBrand = {
      id: brand._id.toString(),
      title: brand.title,
      slug: brand.slug,
      icon: brand.iconUrl || '',
      logo: brand.logo || '',
      badge: brand.badge || '',
      basePrice: brand.basePrice, // Legacy
      category: brand.categoryIds && brand.categoryIds[0] ? {
        id: brand.categoryIds[0]._id.toString(),
        title: brand.categoryIds[0].title,
        slug: brand.categoryIds[0].slug
      } : null,
      categories: (brand.categoryIds || []).map(cat => ({
        id: cat._id.toString(),
        title: cat.title,
        slug: cat.slug
      })),
      page: brand.page ? removeIds(brand.page) : {
        banners: brand.iconUrl ? [{ imageUrl: brand.iconUrl, text: brand.title }] : [],
        paymentOffers: [],
        paymentOffersEnabled: false
      },
      sections: brandServices.length > 0 ? [servicesSection] : []
    };

    res.status(200).json({
      success: true,
      brand: formattedBrand
    });
  } catch (error) {
    console.error('Get public brand by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand. Please try again.'
    });
  }
};

/**
 * Get services based on brand
 * GET /api/public/services
 */
const getPublicServices = async (req, res) => {
  try {
    const { brandId, brandSlug, categoryId, cityId, zoneId, search } = req.query;

    const query = { status: 'active' };

    if (brandId) {
      query.brandId = brandId;
    } else if (brandSlug) {
      const brand = await Brand.findOne({ slug: brandSlug });
      if (brand) {
        query.brandId = brand._id;
      } else {
        return res.status(200).json({ success: true, services: [] });
      }
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: escapedSearch, $options: 'i' };
    }

    const services = await Service.find(query)
      .populate('brandId', 'title iconUrl')
      .populate('frequentlyAddedTogether', 'title slug iconUrl basePrice originalPrice discountPrice pricingType estimatedDurationMinutes pricePerUnit billingUnitMinutes pricePer30Minutes minDurationMinutes maxDurationMinutes durationStepMinutes durationPricing hourlyRate minHours maxHours rating ratingCount status zoneIds')
      .populate('frequentlyAddedTogetherByZone.zoneId', 'name')
      .populate('frequentlyAddedTogetherByZone.serviceIds', 'title slug iconUrl basePrice originalPrice discountPrice pricingType estimatedDurationMinutes pricePerUnit billingUnitMinutes pricePer30Minutes minDurationMinutes maxDurationMinutes durationStepMinutes durationPricing hourlyRate minHours maxHours rating ratingCount status zoneIds')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      services: services.map(svc => {
        const zoneRecommendationGroup = zoneId
          ? (svc.frequentlyAddedTogetherByZone || []).find(entry =>
            String(entry.zoneId?._id || entry.zoneId) === String(zoneId)
          )
          : null;
        const recommendedServices = zoneRecommendationGroup
          ? zoneRecommendationGroup.serviceIds
          : (svc.frequentlyAddedTogether || []);

        return ({
        id: svc._id.toString(),
        title: svc.title,
        slug: svc.slug,
        tagline: svc.tagline || '',
        description: svc.description || '',
        icon: svc.iconUrl || '',
        iconUrl: svc.iconUrl || '',
        image: svc.iconUrl || '',
        imageUrl: svc.iconUrl || '',
        heroBanner: svc.heroBanner || { imageUrl: svc.iconUrl || '', buttonText: 'BOOK NOW' },
        price: svc.basePrice,
        basePrice: svc.basePrice,
        originalPrice: svc.originalPrice || 0,
        discountPrice: svc.discountPrice || null,
        gstPercentage: svc.gstPercentage ?? 18,
        pricingType: svc.pricingType || 'FIXED',
        estimatedDurationMinutes: svc.estimatedDurationMinutes ?? 45,
        pricePerUnit: svc.pricePerUnit ?? svc.durationPricing?.pricePerUnit ?? svc.pricePer30Minutes ?? (svc.hourlyRate ? svc.hourlyRate / 2 : null),
        billingUnitMinutes: svc.billingUnitMinutes ?? svc.durationPricing?.billingUnitMinutes ?? 30,
        durationStepMinutes: svc.durationStepMinutes ?? svc.durationPricing?.durationStepMinutes ?? svc.billingUnitMinutes ?? 30,
        // Legacy fields are retained for older clients.
        pricePer30Minutes: svc.pricePer30Minutes ?? (svc.billingUnitMinutes === 30 ? svc.pricePerUnit : null),
        minDurationMinutes: svc.minDurationMinutes ?? svc.durationPricing?.minDurationMinutes ?? (svc.minHours ? svc.minHours * 60 : 30),
        maxDurationMinutes: svc.maxDurationMinutes ?? svc.durationPricing?.maxDurationMinutes ?? (svc.maxHours ? svc.maxHours * 60 : 240),
        durationPricing: svc.durationPricing || null,
        hourlyRate: svc.hourlyRate ?? null,
        minHours: svc.minHours ?? 1,
        maxHours: svc.maxHours ?? 8,
        allowCustomHours: svc.allowCustomHours ?? false,
        allowExtraHours: svc.allowExtraHours ?? true,
        // Keep the service visible in every city/zone catalog. The client
        // uses this list only to label area availability; it is not a filter.
        zoneIds: (svc.zoneIds || []).map(zoneId => zoneId.toString()),
        rating: svc.rating || 4.9,
        reviews: svc.ratingCount || '4.9 (237.6k)',
        ratingCount: svc.ratingCount || '4.9 (237.6k)',
        badge: svc.badge || null,
        inclusions: svc.inclusions || [],
        whyLoveTitle: svc.whyLoveTitle || `Why Customers Love ${svc.title}`,
        whyLove: svc.whyLove || [],
        exclusionsTitle: svc.exclusionsTitle || 'Does not include',
        exclusions: svc.exclusions || [],
        howItWorksTitle: svc.howItWorksTitle || "How it's done?",
        howItWorks: svc.howItWorks || [],
        faqs: svc.faqs || [],
        frequentlyAddedTogether: recommendedServices
          .filter(recommended => {
            if (!recommended || recommended.status !== 'active') return false;
            if (!zoneId) return true;
            const recommendedZoneIds = (recommended.zoneIds || []).map(id => String(id?._id || id));
            return recommendedZoneIds.length === 0 || recommendedZoneIds.includes(String(zoneId));
          })
          .map(recommended => ({
            id: recommended._id.toString(),
            title: recommended.title,
            slug: recommended.slug,
            icon: recommended.iconUrl || '',
            iconUrl: recommended.iconUrl || '',
            image: recommended.iconUrl || '',
            imageUrl: recommended.iconUrl || '',
            price: recommended.basePrice || 0,
            basePrice: recommended.basePrice || 0,
            originalPrice: recommended.originalPrice || 0,
            discountPrice: recommended.discountPrice || null,
            pricingType: recommended.pricingType || 'FIXED',
            estimatedDurationMinutes: recommended.estimatedDurationMinutes ?? 45,
            pricePerUnit: recommended.pricePerUnit ?? recommended.durationPricing?.pricePerUnit ?? recommended.pricePer30Minutes ?? null,
            billingUnitMinutes: recommended.billingUnitMinutes ?? recommended.durationPricing?.billingUnitMinutes ?? 30,
            durationStepMinutes: recommended.durationStepMinutes ?? recommended.durationPricing?.durationStepMinutes ?? 30,
            minDurationMinutes: recommended.minDurationMinutes ?? recommended.durationPricing?.minDurationMinutes ?? 30,
            maxDurationMinutes: recommended.maxDurationMinutes ?? recommended.durationPricing?.maxDurationMinutes ?? 240,
            durationPricing: recommended.durationPricing || null,
            hourlyRate: recommended.hourlyRate ?? null,
            minHours: recommended.minHours ?? 1,
            maxHours: recommended.maxHours ?? 8,
            rating: recommended.rating || 4.9,
            ratingCount: recommended.ratingCount || '4.9 (237.6k)'
          })),
        brandId: svc.brandId?._id,
        brandName: svc.brandId?.title,
        brandIcon: svc.brandId?.iconUrl
      });
      })
    });
  } catch (error) {
    console.error('Get public services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

/**
 * Get home content
 */
const getPublicHomeContent = async (req, res) => {
  try {
    const { cityId } = req.query;
    const homeContent = await HomeContent.getHomeContent(cityId);

    if (!homeContent) {
      return res.status(200).json({
        success: true,
        homeContent: {
          banners: [],
          promos: [],
          curated: [],
          noteworthy: [],
          booked: [],
          categorySections: []
        }
      });
    }

    // Used for backwards compatibility, we might need to update this to refer to Brands?
    // For now keeping as is, but assuming targetServiceId will point to Brand ID essentially.

    const contentObj = homeContent.toObject();

    const formattedContent = {
      banners: (contentObj.banners || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      promos: (contentObj.promos || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      curated: (contentObj.curated || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      noteworthy: (contentObj.noteworthy || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      booked: (contentObj.booked || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      categorySections: (contentObj.categorySections || []).map(section => ({
        ...section,
        id: section._id ? section._id.toString() : section.id,
        seeAllTargetCategoryId: section.seeAllTargetCategoryId?.toString() || null,
        seeAllTargetServiceId: section.seeAllTargetServiceId?.toString() || null,
        cards: (section.cards || []).map(card => ({
          ...card,
          id: card._id ? card._id.toString() : card.id,
          targetCategoryId: card.targetCategoryId?.toString() || null,
          targetServiceId: card.targetServiceId?.toString() || null,
        }))
      })),
      isBannersVisible: contentObj.isBannersVisible ?? true,
      isPromosVisible: contentObj.isPromosVisible ?? true,
      isCuratedVisible: contentObj.isCuratedVisible ?? true,
      isNoteworthyVisible: contentObj.isNoteworthyVisible ?? true,
      isBookedVisible: contentObj.isBookedVisible ?? true,
      isCategorySectionsVisible: contentObj.isCategorySectionsVisible ?? true,
      isCategoriesVisible: contentObj.isCategoriesVisible ?? true
    };

    res.status(200).json({
      success: true,
      homeContent: formattedContent
    });

  } catch (error) {
    console.error('Get public home content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home content. Please try again.'
    });
  }
};

/**
 * Get consolidated home data (Categories + Services + Content)
 */
const getPublicHomeData = async (req, res) => {
  try {
    const { cityId, zoneId } = req.query;

    const serviceQuery = { status: 'active' };
    // Banners are zone-based - empty/missing zoneIds means shown everywhere
    const bannerQuery = { isActive: true };
    if (zoneId) {
      bannerQuery.$or = [
        { zoneIds: zoneId },
        { zoneIds: { $size: 0 } },
        { zoneIds: { $exists: false } }
      ];
    }

    // Fetch all in parallel
    const [categoriesRes, servicesRes, homeContent, globalHomeContent, bannersRes] = await Promise.all([
      Category.find({ status: 'active', cityIds: cityId ? cityId : { $exists: true } })
        .select('title slug homeIconUrl homeBadge hasSaleBadge')
        .sort({ homeOrder: 1 })
        .lean(),
      Service.find(serviceQuery)
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean(),
      HomeContent.getHomeContent(cityId),
      cityId ? HomeContent.getHomeContent(null) : null,
      Banner.find(bannerQuery)
        .populate('targetCategoryId', 'title slug homeIconUrl')
        .populate('targetServiceId', 'title slug iconUrl')
        .sort({ order: 1, createdAt: -1 })
        .lean()
    ]);

    const formattedCategories = categoriesRes.map(cat => ({
      id: cat._id.toString(),
      title: cat.title,
      slug: cat.slug,
      icon: cat.homeIconUrl || '',
      badge: cat.homeBadge || '',
      hasSaleBadge: cat.hasSaleBadge || false
    }));

    const formattedServices = servicesRes.map(svc => ({
      id: svc._id.toString(),
      title: svc.title,
      slug: svc.slug,
      tagline: svc.tagline || '',
      description: svc.description || '',
      icon: svc.iconUrl || '',
      iconUrl: svc.iconUrl || '',
      image: svc.iconUrl || '',
      imageUrl: svc.iconUrl || '',
      price: svc.basePrice,
      basePrice: svc.basePrice,
      originalPrice: svc.originalPrice || 0,
      discountPrice: svc.discountPrice || null,
      gstPercentage: svc.gstPercentage ?? 18,
      // Empty means available in every active zone. Non-empty is used by the
      // client to show an unavailable badge without hiding the service.
      zoneIds: (svc.zoneIds || []).map(zoneId => zoneId.toString()),
      rating: svc.rating || 4.9,
      reviews: svc.ratingCount || '4.9 (237.6k)',
      ratingCount: svc.ratingCount || '4.9 (237.6k)',
      badge: svc.badge || null,
      inclusions: svc.inclusions || []
    }));

    const formattedBanners = (bannersRes || []).map(b => ({
      id: b._id.toString(),
      title: b.title || '',
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl,
      bannerType: b.bannerType || 'hero',
      position: b.position || 'top',
      targetType: b.targetType || 'none',
      targetCategoryId: b.targetCategoryId?._id?.toString() || b.targetCategoryId?.toString() || null,
      targetCategory: b.targetCategoryId || null,
      targetServiceId: b.targetServiceId?._id?.toString() || b.targetServiceId?.toString() || null,
      targetService: b.targetServiceId || null,
      targetUrl: b.targetUrl || '',
      buttonText: b.buttonText || 'Book Now',
      badgeText: b.badgeText || '',
      gradientClass: b.gradientClass || 'from-blue-600 to-indigo-700',
      order: b.order || 0
    }));

    let formattedContent = null;
    if (homeContent) {
      const contentObj = homeContent.toObject();
      const globalContentObj = globalHomeContent?.toObject?.() || contentObj;
      formattedContent = {
        banners: formattedBanners.length > 0 ? formattedBanners : (contentObj.banners || []).map(item => ({
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          slug: item.slug,
          order: item.order
        })),
        promos: (contentObj.promos || []).map(item => ({
          title: item.title,
          subtitle: item.subtitle,
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          order: item.order
        })),
        curated: (contentObj.curated || []).map(item => ({
          title: item.title,
          gifUrl: item.gifUrl,
          order: item.order
        })),
        noteworthy: (contentObj.noteworthy || []).map(item => ({
          title: item.title,
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          order: item.order
        })),
        booked: (contentObj.booked || []).map(item => ({
          title: item.title,
          rating: item.rating,
          price: item.price,
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          order: item.order
        })),
        categorySections: (contentObj.categorySections || []).map(section => ({
          title: section.title,
          seeAllTargetCategoryId: section.seeAllTargetCategoryId?.toString() || null,
          cards: (section.cards || []).map(card => ({
            title: card.title,
            imageUrl: card.imageUrl,
            price: card.price,
            rating: card.rating,
            targetCategoryId: card.targetCategoryId?.toString() || null
          })),
          order: section.order
        })),
        trustSection: {
          isVisible: globalContentObj.trustSection?.isVisible ?? true,
          title: globalContentObj.trustSection?.title || 'Relax, your home is in professional hands',
          trustedBy: globalContentObj.trustSection?.trustedBy || '15 lakh',
          trustedLabel: globalContentObj.trustSection?.trustedLabel || 'Families',
          rating: globalContentObj.trustSection?.rating || '',
          ratingLabel: globalContentObj.trustSection?.ratingLabel || '3 Lakh+ Ratings',
          imageUrl: globalContentObj.trustSection?.imageUrl || '/Homster xpert .png',
          cartCta: globalContentObj.trustSection?.cartCta || 'Go to cart',
          emptyCartCta: globalContentObj.trustSection?.emptyCartCta || 'Browse services'
        },
        isBannersVisible: contentObj.isBannersVisible ?? true,
        isPromosVisible: contentObj.isPromosVisible ?? true,
        isCuratedVisible: contentObj.isCuratedVisible ?? true,
        isNoteworthyVisible: contentObj.isNoteworthyVisible ?? true,
        isBookedVisible: contentObj.isBookedVisible ?? true,
        isCategorySectionsVisible: contentObj.isCategorySectionsVisible ?? true,
        isCategoriesVisible: contentObj.isCategoriesVisible ?? true
      };
    }

    res.status(200).json({
      success: true,
      categories: formattedCategories,
      services: formattedServices,
      banners: formattedBanners,
      homeContent: formattedContent
    });
  } catch (error) {
    console.error('Get public home data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home data'
    });
  }
};

/**
 * Get public active banners
 * GET /api/public/banners
 */
const getPublicBanners = async (req, res) => {
  try {
    const { zoneId, bannerType, position } = req.query;
    const query = { isActive: true };

    if (bannerType && bannerType !== 'all') query.bannerType = bannerType;
    if (position && position !== 'all') query.position = position;

    // Empty/missing zoneIds means the banner is shown in every zone
    if (zoneId) {
      query.$or = [
        { zoneIds: zoneId },
        { zoneIds: { $size: 0 } },
        { zoneIds: { $exists: false } }
      ];
    } else {
      query.$or = [{ zoneIds: { $size: 0 } }, { zoneIds: { $exists: false } }];
    }

    const banners = await Banner.find(query)
      .populate('targetCategoryId', 'title slug homeIconUrl')
      .populate('targetServiceId', 'title slug iconUrl')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      banners: banners.map(b => ({
        id: b._id.toString(),
        title: b.title || '',
        subtitle: b.subtitle || '',
        imageUrl: b.imageUrl,
        bannerType: b.bannerType || 'hero',
        position: b.position || 'top',
        targetType: b.targetType || 'none',
        targetCategoryId: b.targetCategoryId?._id?.toString() || b.targetCategoryId?.toString() || null,
        targetCategory: b.targetCategoryId || null,
        targetServiceId: b.targetServiceId?._id?.toString() || b.targetServiceId?.toString() || null,
        targetService: b.targetServiceId || null,
        targetUrl: b.targetUrl || '',
        buttonText: b.buttonText || 'Book Now',
        badgeText: b.badgeText || '',
        gradientClass: b.gradientClass || 'from-blue-600 to-indigo-700',
        order: b.order || 0
      }))
    });
  } catch (error) {
    console.error('Get public banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: error.message
    });
  }
};

module.exports = {
  getPublicCategories,
  getPublicBrands,
  getPublicBrandBySlug,
  getPublicServices,
  getPublicHomeContent,
  getPublicHomeData,
  getPublicBanners
};

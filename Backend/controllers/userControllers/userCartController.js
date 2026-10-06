const Cart = require('../../models/Cart');
const Service = require('../../models/UserService');
const { validationResult } = require('express-validator');
const { checkBookingServiceability } = require('../../services/serviceabilityService');
const { MATCH_FAILURE_REASONS } = require('../../utils/constants');

const CART_HARD_BLOCK_REASONS = new Set([
  MATCH_FAILURE_REASONS.OUT_OF_SERVICE_ZONE,
  MATCH_FAILURE_REASONS.ZONE_INACTIVE,
  MATCH_FAILURE_REASONS.SERVICE_NOT_AVAILABLE_IN_ZONE,
  MATCH_FAILURE_REASONS.INVALID_LOCATION,
  'SERVICE_NOT_FOUND'
]);

/**
 * Get user's cart
 */
const getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId }).populate('items.serviceId', 'title iconUrl slug').populate('items.categoryId', 'title slug');

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = await Cart.create({ userId, items: [] });
    }

    res.status(200).json({
      success: true,
      data: cart.items || []
    });
  } catch (error) {
    console.error('Get user cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart. Please try again.'
    });
  }
};

/**
 * Add item to cart
 */
const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const {
      serviceId,
      categoryId,
      title,
      description,
      icon,
      category,
      price,
      originalPrice,
      unitPrice,
      serviceCount,
      rating,
      reviews,
      vendorId,
      sectionTitle, // Brand name
      sectionIcon,  // Brand logo URL
      card,         // Card details snapshot
      hours,        // Selected hours for legacy HOURLY
      pricingType: requestedPricingType,
      durationMinutes,
      pricePer30Minutes,
      pricePerUnit,
      billingUnitMinutes,
      latitude,
      longitude
    } = req.body;

    console.log(`[AddToCart] Request details - Title: ${title}, Section: ${sectionTitle}, PricingType: ${requestedPricingType}`);

    // Verify service exists (only if serviceId is provided)
    let service = null;
    if (serviceId) {
      try {
        service = await Service.findById(serviceId).populate('categoryId', 'title').populate('brandId', 'title');
      } catch (svcErr) {
        console.warn('[AddToCart] Service find error (non-fatal):', svcErr);
      }
    }

    // The catalog keeps unavailable services visible, but a cart add must
    // still be rejected when the client has a resolved location. Vendor
    // availability is intentionally not blocked here; only hard area/service
    // restrictions prevent adding the item.
    const bookingLatitude = Number(latitude);
    const bookingLongitude = Number(longitude);
    if (serviceId && Number.isFinite(bookingLatitude)) {
      if (Number.isFinite(bookingLongitude)) {
        const serviceability = await checkBookingServiceability({
          serviceId,
          lat: bookingLatitude,
          lng: bookingLongitude
        });

        if (CART_HARD_BLOCK_REASONS.has(serviceability.reason)) {
          return res.status(409).json({
            success: false,
            code: 'SERVICE_NOT_AVAILABLE_IN_AREA',
            message: 'This service is not available in your selected area.'
          });
        }
      }
    }

    const effectivePricingType = service?.pricingType || requestedPricingType || 'FIXED';
    const isDuration = effectivePricingType === 'DURATION';
    const isHourly = effectivePricingType === 'HOURLY';

    let itemDurationMinutes = null;
    let itemPricePerUnit = null;
    let itemBillingUnit = 30;
    let itemPricePer30 = null;
    let itemMinDuration = 30;
    let itemMaxDuration = 480;
    let itemHours = null;

    let itemUnitPrice = 0;
    let itemCount = 1;
    let itemTotalPrice = 0;

    if (isDuration) {
      itemBillingUnit = Number(service?.billingUnitMinutes ?? service?.durationPricing?.billingUnitMinutes ?? billingUnitMinutes ?? 30);
      itemPricePerUnit = Number(service?.pricePerUnit ?? service?.durationPricing?.pricePerUnit ?? service?.pricePer30Minutes ?? pricePerUnit ?? pricePer30Minutes ?? (service?.basePrice || 0));
      itemPricePer30 = itemBillingUnit === 30 ? itemPricePerUnit : null;
      itemMinDuration = Number(service?.minDurationMinutes ?? service?.durationPricing?.minDurationMinutes ?? itemBillingUnit);
      itemMaxDuration = Number(service?.maxDurationMinutes ?? service?.durationPricing?.maxDurationMinutes ?? 480);

      const requestedDuration = Number(durationMinutes || (hours ? Number(hours) * 60 : itemMinDuration));
      
      if (isNaN(requestedDuration) || requestedDuration < itemMinDuration || requestedDuration > itemMaxDuration || requestedDuration % itemBillingUnit !== 0) {
        return res.status(400).json({
          success: false,
          message: `Duration must be between ${itemMinDuration} and ${itemMaxDuration} minutes, in ${itemBillingUnit}-minute intervals.`
        });
      }

      itemDurationMinutes = requestedDuration;
      itemHours = requestedDuration / 60;
      itemUnitPrice = itemPricePerUnit;
      itemCount = 1;
      itemTotalPrice = (itemDurationMinutes / itemBillingUnit) * itemPricePerUnit;
    } else if (isHourly) {
      itemHours = Number(hours || 1);
      const minHours = service?.minHours || 1;
      const maxHours = service?.maxHours || 8;
      if (!itemHours || itemHours < minHours || itemHours > maxHours) {
        return res.status(400).json({
          success: false,
          message: `Hours must be between ${minHours} and ${maxHours}`
        });
      }
      itemUnitPrice = Number(service?.hourlyRate || 0);
      itemCount = 1;
      itemTotalPrice = itemUnitPrice * itemHours;
    } else {
      // FIXED Pricing
      itemUnitPrice = Number(unitPrice ?? price ?? service?.basePrice ?? 0);
      itemCount = Number(serviceCount || 1);
      itemTotalPrice = Number(price ?? (itemUnitPrice * itemCount));
    }

    const itemTitle = title || service?.title || 'Service Item';
    const itemCategory = category || service?.categoryId?.title || service?.brandId?.title || sectionTitle || 'General';
    const itemIcon = icon || service?.iconUrl || service?.image || '';
    const itemDescription = description || service?.description || service?.tagline || '';

    // Get or create cart
    let cart = await Cart.findOne({ userId });

    console.log(`[AddToCart] User: ${userId}, Cart Found: ${!!cart}`);

    if (!cart) {
      console.log('[AddToCart] Creating new cart');
      cart = await Cart.create({ userId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.title === itemTitle && (!serviceId || item.serviceId?.toString() === serviceId.toString())
    );

    if (existingItemIndex !== -1 && isDuration) {
      // Duration items: update duration and price rather than stacking quantity
      cart.items[existingItemIndex].pricingType = 'DURATION';
      cart.items[existingItemIndex].durationMinutes = itemDurationMinutes;
      cart.items[existingItemIndex].pricePerUnit = itemPricePerUnit;
      cart.items[existingItemIndex].billingUnitMinutes = itemBillingUnit;
      cart.items[existingItemIndex].pricePer30Minutes = itemPricePer30;
      cart.items[existingItemIndex].minDurationMinutes = itemMinDuration;
      cart.items[existingItemIndex].maxDurationMinutes = itemMaxDuration;
      cart.items[existingItemIndex].hours = itemHours;
      cart.items[existingItemIndex].unitPrice = itemUnitPrice;
      cart.items[existingItemIndex].price = itemTotalPrice;
      cart.items[existingItemIndex].serviceCount = 1;
    } else if (existingItemIndex !== -1 && isHourly) {
      // Hourly items: replace the hour count/price rather than stacking a "quantity"
      cart.items[existingItemIndex].hours = itemHours;
      cart.items[existingItemIndex].unitPrice = itemUnitPrice;
      cart.items[existingItemIndex].price = itemTotalPrice;
      cart.items[existingItemIndex].serviceCount = 1;
    } else if (existingItemIndex !== -1) {
      // Update quantity if item exists
      const existingItem = cart.items[existingItemIndex];
      const newCount = (existingItem.serviceCount || 1) + itemCount;
      const newPrice = (existingItem.unitPrice || itemUnitPrice) * newCount;

      cart.items[existingItemIndex].serviceCount = newCount;
      cart.items[existingItemIndex].price = newPrice;
    } else {
      // Add new item
      const newItem = {
        title: itemTitle,
        description: itemDescription,
        icon: itemIcon,
        category: itemCategory,
        pricingType: effectivePricingType,
        durationMinutes: itemDurationMinutes,
        pricePerUnit: itemPricePerUnit,
        billingUnitMinutes: itemBillingUnit,
        pricePer30Minutes: itemPricePer30,
        minDurationMinutes: itemMinDuration,
        maxDurationMinutes: itemMaxDuration,
        price: itemTotalPrice,
        originalPrice: originalPrice ? Number(originalPrice) : (service?.originalPrice || null),
        unitPrice: itemUnitPrice,
        serviceCount: itemCount,
        hours: itemHours,
        rating: rating || service?.rating?.toString() || '4.8',
        reviews: reviews || service?.ratingCount || '10k+',
        vendorId: vendorId || null,
        sectionTitle: sectionTitle || (service?.brandId?.title || ''),
        sectionIcon: sectionIcon || (service?.brandId?.iconUrl || null),
        card: card || null
      };

      // Only add serviceId and categoryId if they are provided
      if (serviceId) newItem.serviceId = serviceId;
      if (categoryId) newItem.categoryId = categoryId;

      console.log(`[AddToCart] Adding new item: ${itemTitle} in category: ${itemCategory}`);
      cart.items.push(newItem);
    }

    await cart.save();
    console.log(`[AddToCart] Cart saved. Total items: ${cart.items.length}`);

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart.items
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart. Please try again.'
    });
  }
};

/**
 * Update cart item quantity or duration
 */
const updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { itemId } = req.params;
    const { serviceCount, durationMinutes } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    if (item.pricingType === 'DURATION' || durationMinutes !== undefined) {
      const newDuration = Number(durationMinutes !== undefined ? durationMinutes : item.durationMinutes);
      const minMins = item.minDurationMinutes || item.billingUnitMinutes || 30;
      const maxMins = item.maxDurationMinutes || 480;
      const unitMins = item.billingUnitMinutes || 30;

      if (isNaN(newDuration) || newDuration < minMins || newDuration > maxMins || newDuration % unitMins !== 0) {
        return res.status(400).json({
          success: false,
          message: `Duration must be between ${minMins} and ${maxMins} minutes in ${unitMins}-minute intervals.`
        });
      }

      item.durationMinutes = newDuration;
      item.hours = newDuration / 60;
      const rate = item.pricePerUnit || item.pricePer30Minutes || item.unitPrice || 0;
      item.price = (newDuration / unitMins) * rate;
    } else {
      const count = Number(serviceCount || 1);
      if (count < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1'
        });
      }
      item.serviceCount = count;
      item.price = (item.unitPrice || 0) * count;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: cart.items
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item. Please try again.'
    });
  }
};

/**
 * Remove item from cart
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart.items
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart. Please try again.'
    });
  }
};

/**
 * Clear cart (remove all items)
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: []
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart. Please try again.'
    });
  }
};

/**
 * Remove items by category
 */
const removeCategoryItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(item => item.category !== category);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Category items removed from cart',
      data: cart.items
    });
  } catch (error) {
    console.error('Remove category items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove category items. Please try again.'
    });
  }
};

module.exports = {
  getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  removeCategoryItems
};

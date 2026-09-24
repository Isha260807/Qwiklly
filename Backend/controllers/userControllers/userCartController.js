const Cart = require('../../models/Cart');
const Service = require('../../models/UserService');
const { validationResult } = require('express-validator');

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
      hours         // Selected hours for HOURLY-priced services
    } = req.body;

    console.log(`[AddToCart] Request details - Title: ${title}, Section: ${sectionTitle}`);

    // Verify service exists (only if serviceId is provided)
    let service = null;
    if (serviceId) {
      try {
        service = await Service.findById(serviceId).populate('categoryId', 'title').populate('brandId', 'title');
      } catch (svcErr) {
        console.warn('[AddToCart] Service find error (non-fatal):', svcErr);
      }
    }

    // Hourly pricing: validate hours and recompute price server-side — never trust client price
    const isHourly = service?.pricingType === 'HOURLY';
    let itemHours = null;
    if (isHourly) {
      itemHours = Number(hours);
      const minHours = service.minHours || 1;
      const maxHours = service.maxHours || 8;
      if (!itemHours || itemHours < minHours || itemHours > maxHours) {
        return res.status(400).json({
          success: false,
          message: `Hours must be between ${minHours} and ${maxHours}`
        });
      }
    }

    const itemTitle = title || service?.title || 'Service Item';
    const itemCategory = category || service?.categoryId?.title || service?.brandId?.title || sectionTitle || 'General';
    const itemUnitPrice = isHourly ? Number(service.hourlyRate || 0) : Number(unitPrice ?? price ?? service?.basePrice ?? 0);
    const itemCount = isHourly ? 1 : Number(serviceCount || 1);
    const itemTotalPrice = isHourly ? (itemUnitPrice * itemHours) : Number(price ?? (itemUnitPrice * itemCount));
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

    if (existingItemIndex !== -1 && isHourly) {
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
 * Update cart item quantity
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
    const { serviceCount } = req.body;

    if (serviceCount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

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

    item.serviceCount = serviceCount;
    item.price = item.unitPrice * serviceCount;
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


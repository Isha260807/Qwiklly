import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiLoader, FiBell } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import BottomNav from '../../components/layout/BottomNav';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useCart } from '../../../../context/CartContext';
import electricianIcon from '../../../../assets/images/icons/services/electrician.png';
import womensSalonIcon from '../../../../assets/images/icons/services/womens-salon-spa-icon.png';
import massageMenIcon from '../../../../assets/images/icons/services/massage-men-icon.png';
import cleaningIcon from '../../../../assets/images/icons/services/cleaning-icon.png';
import acApplianceRepairIcon from '../../../../assets/images/icons/services/ac-appliance-repair-icon.png';
import NotificationBell from '../../components/common/NotificationBell';

const toAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, isLoading: loading, removeItem, removeCategoryItems, updateItem } = useCart();

  // Dynamic image resolver with fallback to exact category icon
  const getCategoryImage = (items, category) => {
    if (Array.isArray(items)) {
      for (const item of items) {
        const candidate = item?.icon || item?.iconUrl || item?.image || item?.imageUrl || item?.categoryIcon || item?.sectionIcon || item?.card?.imageUrl;
        if (candidate && typeof candidate === 'string' && candidate.trim() !== '') {
          return toAssetUrl(candidate);
        }
      }
    }

    const iconMap = {
      'Electrician': electricianIcon,
      'Electricity': electricianIcon,
      "Women's Salon & Spa": womensSalonIcon,
      'Salon for Women': womensSalonIcon,
      'Salon Prime': womensSalonIcon,
      'Massage for Men': massageMenIcon,
      'Cleaning': cleaningIcon,
      'Bathroom & Kitchen Cleaning': cleaningIcon,
      'Sofa & Carpet Cleaning': cleaningIcon,
      'AC Service and Repair': acApplianceRepairIcon,
      'AC & Appliance Repair': acApplianceRepairIcon,
    };

    if (category && iconMap[category]) {
      return iconMap[category];
    }

    return null;
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [cartItems]);

  const cartCount = cartItems.length;

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteCategory = async (category) => {
    try {
      const response = await removeCategoryItems(category);
      if (response.success) {
        toast.success('Category items removed');
      } else {
        toast.error(response.message || 'Failed to remove category items');
      }
    } catch (error) {
      toast.error('Failed to remove category items');
    }
  };

  const handleDelete = async (itemId) => {
    try {
      const response = await removeItem(itemId);
      if (response.success) {
        toast.success('Item removed from cart');
      } else {
        toast.error(response.message || 'Failed to remove item');
      }
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleQuantityChange = async (itemId, change) => {
    try {
      const item = cartItems.find(i => (i._id || i.id) === itemId);
      if (!item) return;

      const newCount = Math.max(1, (item.serviceCount || 1) + change);
      const response = await updateItem(itemId, newCount);

      if (!response.success) {
        toast.error(response.message || 'Failed to update quantity');
      }
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleAddServices = (category) => {
    // Navigate back to home with instructions to open the category modal
    const itemsInCategory = groupedItems[category];
    const categoryId = itemsInCategory?.[0]?.categoryId;

    navigate('/user', {
      state: {
        openCategoryId: categoryId,
        openCategoryName: category
      }
    });
  };

  const handleCategoryCheckout = (category) => {
    navigate('/user/checkout', { state: { category: category } });
  };

  const handleCartClick = () => {
    // Already on cart page
  };

  // Calculate totals for all items
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalOriginalPrice = cartItems.reduce((sum, item) => {
    const unitOriginalPrice = item.originalPrice || (item.unitPrice || (item.price / (item.serviceCount || 1)));
    return sum + (unitOriginalPrice * (item.serviceCount || 1));
  }, 0);
  return (
    <div className="min-h-screen pb-32 relative bg-white">
      {/* Refined Brand Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.teal || '#347989'}25 0%, transparent 70%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}20 0%, transparent 70%),
              radial-gradient(at 100% 100%, ${themeColors?.brand?.orange || '#BB5F36'}15 0%, transparent 75%),
              radial-gradient(at 0% 100%, ${themeColors?.brand?.teal || '#347989'}10 0%, transparent 70%),
              radial-gradient(at 50% 50%, ${themeColors?.brand?.teal || '#347989'}03 0%, transparent 100%),
              #FFFFFF
            `
          }}
        />
        {/* Elegant Dot Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.teal || '#347989'} 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Theme Gradient Header */}
        <header 
          className="sticky top-0 z-40 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
              title="Go Back"
            >
              <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <FiShoppingCart className="w-5 h-5 text-white" />
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Your Cart</h1>
              {cartCount > 0 && (
                <span className="bg-white text-[#720C3E] text-xs font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
          <NotificationBell 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
            iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2]"
            dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
          />
        </header>

        {/* Cart Items - Grouped by Category */}
        <main className="px-4 py-4" style={{ paddingBottom: cartItems.length > 0 ? '70px' : '100px' }}>
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                  {/* Category Header Skeleton */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  {/* Items Skeleton */}
                  <div className="space-y-3">
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                  </div>
                  {/* Buttons Skeleton */}
                  <div className="flex gap-2 mt-4">
                    <div className="flex-1 h-10 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1 h-10 bg-gray-300 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-[#FFF7FA] border border-[#E8D9DF] flex items-center justify-center mb-3 shadow-xs">
                <FiShoppingCart className="w-8 h-8 text-[#9A2459]" />
              </div>
              <p className="text-gray-800 text-base font-bold">Your cart is empty</p>
              <p className="text-gray-400 text-xs mt-1">Add services to get started</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-3.5">
              {Object.entries(groupedItems).map(([category, items]) => {
                const categoryTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
                const dynamicImage = getCategoryImage(items, category);
                const serviceCount = items.reduce((sum, item) => sum + (item.serviceCount || 1), 0);

                return (
                  <div
                    key={category}
                    className="bg-white rounded-2xl border border-[#E8D9DF]/70 shadow-[0_2px_10px_rgba(114,12,62,0.05)] p-3 sm:p-3.5 transition-all"
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Dynamic Image or Initials Badge */}
                        {dynamicImage ? (
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-[#FFF7FA] border border-[#E8D9DF]/80 shadow-2xs">
                            <img
                              src={dynamicImage}
                              alt={category}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextElementSibling) {
                                  e.target.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-[#720C3E] to-[#9A2459] text-white font-bold text-sm uppercase">
                              {category?.charAt(0) || 'S'}
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-[#720C3E] to-[#9A2459] text-white font-bold text-sm uppercase shadow-2xs">
                            {category?.charAt(0) || 'S'}
                          </div>
                        )}

                        {/* Category Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug capitalize truncate">{category}</h3>
                          <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                            {serviceCount} {serviceCount === 1 ? 'service' : 'services'} • <span className="font-bold text-[#720C3E]">₹{categoryTotal.toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                      </div>

                      {/* Delete Category Button */}
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                        title="Remove category"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Services List */}
                    <div className="my-2.5 bg-[#FAF7F8]/80 rounded-xl p-2 sm:p-2.5 border border-[#E8D9DF]/50 divide-y divide-gray-100">
                      {items.map((item) => (
                        <div key={item._id || item.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs sm:text-sm text-gray-800 font-bold capitalize truncate">
                                {item.title}
                              </p>
                              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 bg-white px-1.5 py-0.2 rounded border border-gray-200/80 shrink-0">
                                × {item.serviceCount || 1}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-[#720C3E]">
                              ₹{(item.price || 0).toLocaleString('en-IN')}
                            </span>
                            <button
                              onClick={() => handleDelete(item._id || item.id)}
                              className="p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete item"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                      <button
                        onClick={() => handleAddServices(category)}
                        className="py-2 px-3 bg-[#FFF7FA] hover:bg-[#FCEBF3] border border-[#E8D9DF] text-[#720C3E] rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 text-center"
                      >
                        Add Services
                      </button>
                      <button
                        onClick={() => handleCategoryCheckout(category)}
                        className="py-2 px-3 rounded-xl text-xs sm:text-sm font-bold text-white transition-all active:scale-95 shadow-xs text-center"
                        style={{
                          background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)',
                        }}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

      </div>
    </div>
  );
};

export default Cart;

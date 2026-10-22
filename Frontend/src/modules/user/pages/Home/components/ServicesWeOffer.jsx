import React from 'react';
import { motion } from 'framer-motion';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';
import { FiMinus, FiPlus } from 'react-icons/fi';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const formatRatingDisplay = (rating, ratingCount) => {
  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating) || numericRating <= 0) return '';
  const r = String(rating);
  if (!ratingCount) return `${r}`;
  const countStr = String(ratingCount).trim();
  if (countStr.includes('(')) return countStr;
  const cleanCount = countStr.replace(/ratings?/gi, '').trim();
  return `${r} (${cleanCount})`;
};

const ServicesWeOffer = ({ services = [], onServiceClick, onAddClick, cartItems = [], onUpdateItem, onRemoveItem }) => {
  if (!services || services.length === 0) return null;

  return (
    <section className="px-2 sm:px-4 md:px-6 mb-4 max-w-screen-xl mx-auto">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[16px] sm:text-[18px] md:text-xl font-bold text-slate-900 tracking-tight">
          Services we offer
        </h2>
      </div>

      {/* Responsive Grid: 3 columns on mobile, 4-5 on tablet, 6 on desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4">
        {services.map((service, index) => {
          const serviceId = service.serviceId || service._id || service.id;
          const cartItem = cartItems.find((item) => {
            const itemServiceId = typeof item.serviceId === 'object'
              ? item.serviceId?._id || item.serviceId?.id
              : item.serviceId;
            return itemServiceId && serviceId && String(itemServiceId) === String(serviceId);
          });
          const isDurationBased = service.pricingType === 'DURATION' || service.pricingType === 'HOURLY';
          const billingUnitMinutes = Number(service.billingUnitMinutes ?? service.durationPricing?.billingUnitMinutes ?? 30);
          const pricePerUnit = Number(
            service.pricePerUnit ??
            service.durationPricing?.pricePerUnit ??
            service.pricePer30Minutes ??
            (service.hourlyRate ? service.hourlyRate * (billingUnitMinutes / 60) : (service.basePrice || service.price || 0))
          );
          const minDurationMinutes = Number(
            service.minDurationMinutes ??
            service.durationPricing?.minDurationMinutes ??
            (service.minHours ? service.minHours * 60 : billingUnitMinutes)
          );
          const maxDurationMinutes = Number(
            service.maxDurationMinutes ??
            service.durationPricing?.maxDurationMinutes ??
            (service.maxHours ? service.maxHours * 60 : 240)
          );
          const durationStepMinutes = Number(service.durationStepMinutes ?? service.durationPricing?.durationStepMinutes ?? billingUnitMinutes);
          const currentDurationMinutes = Number(cartItem?.durationMinutes || minDurationMinutes);
          const currentQuantity = Number(cartItem?.serviceCount || cartItem?.quantity || 1);
          const fixedUnitPrice = Number(service.discountPrice ?? service.price ?? service.basePrice ?? 0);
          const displayPrice = isDurationBased
            ? (currentDurationMinutes / billingUnitMinutes) * pricePerUnit
            : fixedUnitPrice * currentQuantity;
          const originalPrice = isDurationBased
            ? null
            : (service.originalPrice || (service.discountPrice && service.basePrice ? service.basePrice * currentQuantity : null));
          const hasDiscount = originalPrice && Number(originalPrice) > Number(displayPrice);
          const isAvailableInArea = service.isAvailableInArea !== false;
          const ratingDisplay = formatRatingDisplay(service.rating, service.ratingCount);
          const badge = service.badge?.trim();
          const rawImage = service.image || service.icon || service.imageUrl || service.iconUrl;
          const originalImageSrc = toAssetUrl(rawImage);
          const imageSrc = optimizeCloudinaryUrl(originalImageSrc, {
            width: 240,
            quality: 'auto:eco',
            crop: 'limit',
            dpr: 'auto'
          });
          const isAboveFold = index < 3;
          const cartItemId = cartItem?._id || cartItem?.id;

          const handleQuantityOrDurationChange = (event, direction) => {
            event.stopPropagation();
            if (!cartItemId) return;

            if (isDurationBased) {
              const requestedDuration = currentDurationMinutes + (direction * durationStepMinutes);
              if (requestedDuration < minDurationMinutes && direction < 0) {
                onRemoveItem?.(cartItemId);
                return;
              }
              const nextDuration = Math.max(
                minDurationMinutes,
                Math.min(maxDurationMinutes, requestedDuration)
              );
              if (nextDuration === currentDurationMinutes) return;
              onUpdateItem?.(cartItemId, 1, nextDuration);
              return;
            }

            const nextQuantity = currentQuantity + direction;
            if (nextQuantity <= 0) {
              onRemoveItem?.(cartItemId);
              return;
            }
            onUpdateItem?.(cartItemId, nextQuantity);
          };

          return (
            <motion.div
              key={service.id || service._id || index}
              whileTap={{ scale: 0.97 }}
              onClick={() => onServiceClick && onServiceClick(service)}
              className="w-full bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              {/* Image & Badges Container */}
              <div className="relative w-full aspect-[1/0.92] sm:aspect-square bg-[#F5F6F8] flex items-center justify-center overflow-hidden border-b border-slate-100">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={service.title}
                    className="w-full h-full object-contain p-1.5 sm:p-2 group-hover:scale-105 transition-transform duration-300"
                    width="240"
                    height="240"
                    loading={isAboveFold ? 'eager' : 'lazy'}
                    fetchPriority={isAboveFold ? 'high' : 'low'}
                    decoding="async"
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (image.dataset.originalFallback === 'true') return;
                      image.dataset.originalFallback = 'true';
                      image.src = originalImageSrc;
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-400 font-bold text-base">
                    {service.title?.charAt(0) || 'S'}
                  </div>
                )}

                {/* Red Badge (e.g. NEW) on Top-Left */}
                {badge && (
                  <span className="absolute top-1.5 left-1.5 bg-[#E50914] text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[3px] shadow-xs uppercase tracking-wider leading-none z-10">
                    {badge}
                  </span>
                )}

                {/* Rating Badge (e.g. ★ 4.9 (237.6k)) on Top-Right */}
                {!badge && ratingDisplay && (
                  <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-[4px] flex items-center gap-0.5 shadow-xs border border-slate-200/80 leading-none z-10">
                    <span className="text-[#F59E0B] text-[8px] sm:text-[9px] leading-none">★</span>
                    <span className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-700 leading-none">
                      {ratingDisplay}
                    </span>
                  </div>
                )}

                {isAvailableInArea && !cartItem && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddClick?.(service);
                    }}
                    className="absolute bottom-1.5 right-1.5 z-20 flex h-8 w-8 items-center justify-center rounded-xl border border-[#E8D9DF] bg-white text-[#720C3E] shadow-md transition-all active:scale-90"
                    aria-label={`Add ${service.title}`}
                  >
                    <FiPlus className="h-4 w-4" />
                  </button>
                )}

                {isAvailableInArea && cartItem && (
                  <div
                    className="absolute bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 scale-90 items-center gap-0.5 rounded-lg border border-[#E8D9DF] bg-white/95 p-0.5 shadow-md backdrop-blur-sm"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(event) => handleQuantityOrDurationChange(event, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-[#720C3E] active:scale-90"
                      aria-label={`Decrease ${isDurationBased ? 'duration' : 'quantity'} for ${service.title}`}
                    >
                      <FiMinus className="h-3 w-3" />
                    </button>
                    <div className="min-w-[28px] text-center leading-none">
                      <div className="text-[11px] font-black text-[#720C3E]">
                        {isDurationBased ? currentDurationMinutes : currentQuantity}
                      </div>
                      <div className="mt-0.5 text-[7px] font-semibold text-slate-400">
                        {isDurationBased ? 'Minutes' : 'Qty'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => handleQuantityOrDurationChange(event, 1)}
                      disabled={isDurationBased && currentDurationMinutes >= maxDurationMinutes}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-[#720C3E] text-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Increase ${isDurationBased ? 'duration' : 'quantity'} for ${service.title}`}
                    >
                      <FiPlus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title & Price Container */}
              <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1 bg-white">
                <h3
                  className="font-bold text-slate-800 text-[12px] sm:text-[13px] md:text-[13.5px] leading-[1.25] line-clamp-2 min-h-[30px] sm:min-h-[34px] flex items-start tracking-tight capitalize"
                  title={service.title}
                >
                  {service.title}
                </h3>

                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-[14px] sm:text-[15.5px] font-black text-slate-900 leading-none tracking-tight">
                    ₹{displayPrice}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] sm:text-[11px] text-slate-400 line-through font-medium leading-none">
                      ₹{originalPrice}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default ServicesWeOffer;

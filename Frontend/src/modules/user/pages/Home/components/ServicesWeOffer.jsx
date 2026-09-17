import React from 'react';
import { motion } from 'framer-motion';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const formatRatingDisplay = (rating, ratingCount) => {
  const r = rating || '4.9';
  if (!ratingCount) return `${r}`;
  const countStr = String(ratingCount).trim();
  if (countStr.includes('(')) return countStr;
  const cleanCount = countStr.replace(/ratings?/gi, '').trim();
  return `${r} (${cleanCount})`;
};

const ServicesWeOffer = ({ services = [], onServiceClick }) => {
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
          const displayPrice = service.price || service.basePrice || service.discountPrice || 0;
          const originalPrice = service.originalPrice || (service.discountPrice && service.basePrice ? service.basePrice : null);
          const hasDiscount = originalPrice && Number(originalPrice) > Number(displayPrice);

          const ratingDisplay = formatRatingDisplay(service.rating, service.ratingCount);
          const badge = service.badge?.trim();

          return (
            <motion.div
              key={service.id || service._id || index}
              whileTap={{ scale: 0.97 }}
              onClick={() => onServiceClick && onServiceClick(service)}
              className="w-full bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              {/* Image & Badges Container */}
              <div className="relative w-full aspect-[1/0.92] sm:aspect-square bg-[#F5F6F8] flex items-center justify-center overflow-hidden border-b border-slate-100">
                {service.image || service.icon || service.imageUrl || service.iconUrl ? (
                  <img
                    src={toAssetUrl(service.image || service.icon || service.imageUrl || service.iconUrl)}
                    alt={service.title}
                    className="w-full h-full object-contain p-1.5 sm:p-2 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
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
                {!badge && (
                  <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-[4px] flex items-center gap-0.5 shadow-xs border border-slate-200/80 leading-none z-10">
                    <span className="text-[#F59E0B] text-[8px] sm:text-[9px] leading-none">★</span>
                    <span className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-700 leading-none">
                      {ratingDisplay}
                    </span>
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

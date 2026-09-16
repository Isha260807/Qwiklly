import React from 'react';
import { FiStar } from 'react-icons/fi';
import { motion } from 'framer-motion';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const ServicesWeOffer = ({ services = [], onServiceClick }) => {
  if (!services || services.length === 0) return null;

  return (
    <section className="px-4 sm:px-6">
      <div className="flex items-center justify-center text-center mb-2.5 sm:mb-3">
        <h2 className="text-[15px] sm:text-base text-slate-900 tracking-tight text-center font-semibold" style={{ fontWeight: 600 }}>
          Services we offer
        </h2>
      </div>

      {/* 3-column Grid matching the reference UI */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {services.map((service, index) => {
          const hasDiscount = service.originalPrice && service.originalPrice > service.price;
          const displayPrice = service.price || service.basePrice || 0;

          return (
            <motion.div
              key={service.id || service._id || index}
              whileTap={{ scale: 0.97 }}
              onClick={() => onServiceClick && onServiceClick(service)}
              className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              {/* Image & Badges */}
              <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden mb-2.5 flex items-center justify-center">
                {service.image || service.icon || service.imageUrl ? (
                  <img
                    src={toAssetUrl(service.image || service.icon || service.imageUrl)}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                    {service.title?.charAt(0) || 'S'}
                  </div>
                )}

                {/* Badge (e.g. NEW) */}
                {service.badge && (
                  <span className="absolute top-1.5 left-1.5 bg-[#EF4444] text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wide">
                    {service.badge}
                  </span>
                )}

                {/* Rating (e.g. 4.9 (237.6k)) */}
                <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                  <FiStar className="text-amber-500 fill-amber-500 text-[9px]" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-800">
                    {service.rating || '4.9'}
                  </span>
                  {service.ratingCount && (
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-normal hidden sm:inline">
                      ({service.ratingCount})
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Price */}
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2" title={service.title}>
                  {service.title}
                </h3>
                
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-sm sm:text-base font-black text-slate-900">
                    ₹{displayPrice}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] sm:text-xs text-slate-400 line-through font-medium">
                      ₹{service.originalPrice}
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

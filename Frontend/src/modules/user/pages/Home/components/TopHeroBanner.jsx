import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { themeColors } from '../../../../../theme';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const TopHeroBanner = memo(({
  banners = [],
  onBannerClick,
  onCategoryClick,
  onServiceClick,
  categories = []
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Filter only Top Hero banners
  const heroBanners = (banners || []).filter(
    b => b.bannerType === 'top' || b.bannerType === 'hero' || (!b.bannerType && b.bannerType !== 'footer' && b.bannerType !== 'bottom')
  );
  const displayBanners = heroBanners;

  // Auto-slide effect every 4.5 seconds
  useEffect(() => {
    if (displayBanners.length <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % displayBanners.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [displayBanners.length, isHovered]);

  if (!displayBanners || displayBanners.length === 0) {
    return null;
  }

  const currentBanner = displayBanners[currentIndex] || displayBanners[0];

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % displayBanners.length);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + displayBanners.length) % displayBanners.length);
  };

  const handleClick = (banner) => {
    if (onBannerClick) {
      onBannerClick(banner);
      return;
    }

    // Default handling if onBannerClick not provided
    if (banner.targetType === 'category' || banner.targetCategoryId) {
      const catId = banner.targetCategoryId?._id || banner.targetCategoryId;
      const foundCat = categories.find(c => c.id === catId || c._id === catId);
      if (foundCat && onCategoryClick) {
        onCategoryClick(foundCat);
        return;
      }
    }

    if (banner.targetType === 'service' && banner.targetServiceId && onServiceClick) {
      onServiceClick(banner.targetServiceId);
      return;
    }

    if (banner.targetType === 'url' && banner.targetUrl) {
      if (banner.targetUrl.startsWith('http')) {
        window.open(banner.targetUrl, '_blank');
      } else {
        window.location.href = banner.targetUrl;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative px-2.5 sm:px-4 md:px-6 mb-3 sm:mb-4 select-none group w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Banner Carousel Card */}
      <div
        onClick={() => handleClick(currentBanner)}
        className="relative overflow-hidden rounded-2xl md:rounded-3xl cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 bg-slate-100 h-[150px] sm:h-[190px] md:h-[230px] lg:h-[260px] xl:h-[280px] w-full border border-black/5"
        style={{
          boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.1), 0 3px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id || currentBanner._id || currentIndex}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full h-full relative"
          >
            {/* Banner Image */}
            <img
              src={optimizeCloudinaryUrl(toAssetUrl(currentBanner.imageUrl), { quality: 'auto:best', dpr: '2.0' })}
              alt={currentBanner.title || 'Special Offer'}
              className="w-full h-full object-cover object-center rounded-2xl md:rounded-3xl"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
              loading="eager"
              decoding="async"
              onError={(e) => {
                e.target.src = 'https://placehold.co/1200x500/720C3E/white?text=Special+Offers';
              }}
            />

            {/* Optional Badge Overlay */}
            {currentBanner.badgeText && (
              <div
                className="absolute top-2.5 sm:top-3 md:top-4 left-2.5 sm:left-3 md:left-4 text-white text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-full shadow-lg uppercase tracking-wider border border-white/30 backdrop-blur-md"
                style={{
                  background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)',
                  boxShadow: '0 4px 14px rgba(114, 12, 62, 0.4)'
                }}
              >
                {currentBanner.badgeText}
              </div>
            )}

            {/* Subtle Gradient & Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
          </motion.div>
        </AnimatePresence>

        {/* Previous / Next Arrows (Desktop hover) */}
        {displayBanners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 cursor-pointer"
              aria-label="Previous banner"
            >
              <FiChevronLeft className="text-base md:text-lg" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 cursor-pointer"
              aria-label="Next banner"
            >
              <FiChevronRight className="text-base md:text-lg" />
            </button>
          </>
        )}
      </div>

      {/* Pagination Indicator Dots */}
      {displayBanners.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2">
          {displayBanners.map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(dotIdx);
              }}
              className={`rounded-full transition-all duration-300 ${
                dotIdx === currentIndex
                  ? 'w-6 h-1.5 bg-[#720C3E] shadow-sm shadow-[#720C3E]/40'
                  : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TopHeroBanner.displayName = 'TopHeroBanner';

export default TopHeroBanner;

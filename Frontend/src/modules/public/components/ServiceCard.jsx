import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

const ServiceCard = ({ 
  title, 
  description, 
  tag, 
  imageUrl, 
  iconUrl,
  price,
  duration,
  category,
  onBook
}) => {
  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group relative bg-white rounded-3xl p-4 sm:p-5 border border-[#E8D9DF] hover:border-[#E8A0B8] shadow-sm hover:shadow-xl hover:shadow-[#720C3E]/10 transition-all duration-300 flex flex-col justify-between overflow-hidden"
    >
      <div className="relative w-full h-44 sm:h-48 rounded-2xl bg-gradient-to-br from-[#FFF7FA] to-[#FCEEF2] overflow-hidden mb-4 flex items-center justify-center p-3 border border-[#E8D9DF]/50 group-hover:border-[#E8A0B8]/60 transition-colors">
        {tag && (
          <div className="absolute top-3 right-3 z-10">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/95 text-[#720C3E] shadow-sm border border-[#E8A0B8]/40 backdrop-blur-xs">
              {tag}
            </span>
          </div>
        )}
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-contain rounded-xl transform group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-[#24151D] tracking-tight truncate group-hover:text-[#720C3E] transition-colors">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-[#6F5A64] mt-0.5 line-clamp-1 font-medium">
            {description}
          </p>
          {(price || duration) && (
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-[#720C3E]">
              {price && <span>From {price}</span>}
              {price && duration && <span>-</span>}
              {duration && <span className="text-[#6F5A64] font-normal">{duration}</span>}
            </div>
          )}
        </div>
        <button
          onClick={onBook}
          aria-label={`Book ${title}`}
          className="shrink-0 w-10 h-10 rounded-full bg-[#720C3E] text-white flex items-center justify-center shadow-md shadow-[#720C3E]/20 group-hover:bg-[#4D082A] group-hover:scale-110 group-hover:rotate-[-10deg] transition-all duration-300 cursor-pointer"
        >
          <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};

export default ServiceCard;

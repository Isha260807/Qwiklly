import React, { useState, useEffect } from 'react';
import { FiX, FiStar, FiClock, FiCheck, FiShield, FiCheckCircle, FiShare2, FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../../../../context/CartContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const DirectServiceDetailModal = ({ isOpen, onClose, service }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !service) return null;

  const displayPrice = service.price || service.basePrice || 0;
  const hasDiscount = service.originalPrice && service.originalPrice > displayPrice;
  const inclusions = service.inclusions || [];

  const handleBookNow = async () => {
    try {
      setAddingToCart(true);
      const cartItemData = {
        serviceId: service.id || service._id,
        title: service.title,
        description: service.tagline || service.description || '',
        icon: service.image || service.icon || service.imageUrl || '',
        price: displayPrice,
        originalPrice: service.originalPrice || null,
        unitPrice: displayPrice,
        serviceCount: 1,
        rating: service.rating || '4.9',
        reviews: service.ratingCount || '237.6k',
        inclusions: inclusions
      };

      const response = await addToCart(cartItemData);
      if (response.success) {
        toast.success(`${service.title} added to cart!`);
        onClose();
        navigate('/user/cart');
      } else {
        toast.error(response.message || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Failed to book service');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Drawer / Popup */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-lg max-h-[92vh] bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-y-auto z-10 flex flex-col"
        >
          {/* Top Banner / Image Area */}
          <div className="relative w-full h-56 sm:h-64 bg-slate-900 overflow-hidden">
            {service.image || service.icon || service.imageUrl ? (
              <img
                src={toAssetUrl(service.image || service.icon || service.imageUrl)}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-2xl">
                {service.title}
              </div>
            )}

            {/* Top Navigation Bar inside Header */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
              >
                <FiArrowLeft className="text-lg" />
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: service.title, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied to clipboard');
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                >
                  <FiShare2 className="text-base" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Body Content */}
          <div className="p-5 sm:p-6 space-y-6 flex-1">
            {/* Title & Price Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">
                  {service.title}
                </h1>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-slate-900">
                    ₹{displayPrice}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-slate-400 line-through font-medium">
                      ₹{service.originalPrice}
                    </span>
                  )}
                </div>
                
                {/* Rating */}
                <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-700">
                  <FiStar className="text-amber-500 fill-amber-500 text-xs" />
                  <span>{service.rating || '4.9'}</span>
                  <span className="text-slate-400 font-normal">
                    ({service.ratingCount || service.reviews || '237.6k ratings'})
                  </span>
                </div>
              </div>

              {/* Quick Book Button */}
              <button
                onClick={handleBookNow}
                disabled={addingToCart}
                className="px-6 py-2.5 bg-[#E6F4EA] hover:bg-[#d4edd9] text-[#137333] border border-[#137333]/20 rounded-xl text-sm font-extrabold uppercase tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {addingToCart ? 'Booking...' : 'Book'}
              </button>
            </div>

            {/* Description & Tagline */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">
                {service.tagline || 'One Booking. Countless Tasks.'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {service.description ||
                  'Let our professionals take care of everyday household tasks while you focus on work, family and everything else on your schedule.'}
              </p>
            </div>

            {/* "How long does it take?" Included Tasks Section */}
            {inclusions && inclusions.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      How long does it take?
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Estimations are based on 2BHK
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#137333]">
                    How it's done?
                  </span>
                </div>

                {/* Grid of Task Inclusions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {inclusions.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between space-y-2 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                        {item.iconUrl ? (
                          <img src={toAssetUrl(item.iconUrl)} alt={item.title || item.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <FiCheckCircle className="text-xl text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs leading-tight">
                          {item.title || item.name}
                        </h4>
                        {item.duration && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-white text-[10px] font-semibold text-slate-500 rounded-md shadow-xs">
                            {item.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why Customers Love Our Services */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 space-y-2.5">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <FiShield className="text-emerald-600" /> Why Customers Love Our Services
              </h3>
              <ul className="text-xs text-slate-700 space-y-1.5">
                <li className="flex items-center gap-2">
                  <FiCheck className="text-emerald-600 font-bold shrink-0" />
                  <span>Verified & Background-checked service professionals</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheck className="text-emerald-600 font-bold shrink-0" />
                  <span>On-time arrival guarantee or service fee waived</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheck className="text-emerald-600 font-bold shrink-0" />
                  <span>Hassle-free transparent pricing with no hidden fees</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 px-5 flex items-center justify-between gap-4 z-20 shadow-lg">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Price</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">₹{displayPrice}</span>
                {hasDiscount && (
                  <span className="text-xs text-slate-400 line-through">₹{service.originalPrice}</span>
                )}
              </div>
            </div>

            <button
              onClick={handleBookNow}
              disabled={addingToCart}
              className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {addingToCart ? 'Adding to Cart...' : 'Book Service Now'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DirectServiceDetailModal;

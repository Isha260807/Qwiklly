import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft,
  FiShare2,
  FiStar,
  FiClock,
  FiCheckCircle,
  FiPlus,
  FiMinus,
  FiShield,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../../../context/CartContext';
import { useCity } from '../../../../context/CityContext';
import { publicCatalogService, serviceService } from '../../../../services/catalogService';
import { toast } from 'react-hot-toast';
import LogoLoader from '../../../../components/common/LogoLoader';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const defaultInclusions = [
  { title: 'Bathroom Cleaning', duration: '40 mins', iconUrl: '' },
  { title: 'Utensils', duration: '20 mins', iconUrl: '' },
  { title: 'Balcony', duration: '30 mins', iconUrl: '' },
  { title: 'Fan Cleaning', duration: '20 mins', iconUrl: '' },
  { title: 'Sweeping and Mopping', duration: '30 mins', iconUrl: '' },
  { title: 'Dusting & Wiping', duration: '30 mins', iconUrl: '' },
  { title: 'Kitchen Cleaning', duration: '30 mins', iconUrl: '' },
  { title: 'Window Cleaning', duration: '25 mins', iconUrl: '' }
];

const defaultWhyLove = [
  { text: 'Book only the help you need' },
  { text: 'No recurring commitment required' },
  { text: 'Multiple household tasks covered' },
  { text: 'Flexible duration options' },
  { text: 'Trained & verified professionals' },
  { text: 'Convenient scheduling' }
];

const defaultExclusions = [
  { text: 'Dry wiping of walls' },
  { text: 'Complete wardrobe cleaning and organization' },
  { text: 'Kitchen cabinet cleaning (interior and exterior)' },
  { text: 'Shower cubicle deep cleaning' },
  { text: 'Bathtub scrubbing and cleaning' },
  { text: 'Any other services like Deep Steam Cleaning, Car Washing or Plant Care.' },
  { text: 'Chandelier cleaning and fragile glass work are excluded from this service.' },
  { text: 'Commercial properties or ongoing construction work' },
  { text: 'Ironing & Folding' }
];

const defaultHowItWorks = [
  {
    stepNumber: 1,
    title: 'Plan the Work',
    description: 'Your professional plans the tasks as per your needs and time booked.',
    iconUrl: ''
  },
  {
    stepNumber: 2,
    title: 'Start Cleaning',
    description: "They'll begin with the tasks you want like sweeping, mopping, or bathroom cleaning.",
    iconUrl: ''
  },
  {
    stepNumber: 3,
    title: 'Final Checks',
    description: "Before finishing, they'll give a quick wipe and make sure everything looks clean and tidy.",
    iconUrl: ''
  }
];

const defaultFaqs = [
  {
    question: "What if the cleaning isn't completed within the selected time?",
    answer: "You can place a new booking for the additional time you need, and it will be assigned to the same professional."
  },
  {
    question: 'How can I trust your service?',
    answer: 'All our professionals undergo strict background verification, government ID validation, and professional training.'
  },
  {
    question: 'Do I need to provide all the cleaning equipment?',
    answer: 'Our professionals bring standard tools and supplies. You may also specify any custom materials at booking.'
  },
  {
    question: 'How are the prices calculated?',
    answer: 'Pricing is completely transparent with flat or hourly rates and no hidden surge charges.'
  },
  {
    question: 'How do I contact support?',
    answer: 'Our customer support team is available 24/7 via the in-app Help & Support section or WhatsApp.'
  }
];

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { currentCity } = useCity();

  const [service, setService] = useState(location.state?.service || null);
  const [loading, setLoading] = useState(!location.state?.service);
  const [addingToCart, setAddingToCart] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [selectedHours, setSelectedHours] = useState(location.state?.service?.minHours || 1);
  const [customHoursMode, setCustomHoursMode] = useState(false);

  const howItWorksRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchServiceData = async () => {
      try {
        setLoading(true);
        const cityId = currentCity?._id || currentCity?.id;
        const res = await publicCatalogService.getServices({ cityId });

        let found = null;
        if (res.success && res.services) {
          found = res.services.find(s => (s._id === id || s.id === id || s.slug === id));
        }

        if (!found) {
          try {
            const singleRes = await serviceService.getById(id);
            if (singleRes.success && (singleRes.service || singleRes.data)) {
              found = singleRes.service || singleRes.data;
            }
          } catch (e) {
            // silent fallback
          }
        }

        if (found) {
          setService(found);
          if (found.pricingType === 'HOURLY') {
            setSelectedHours(found.minHours || 1);
          }
        } else if (!service) {
          toast.error('Service details not found');
        }
      } catch (error) {
        console.error('Error fetching service:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, [id, currentCity]);

  if (loading && !service) {
    return <LogoLoader />;
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Service not found</h2>
        <p className="text-xs text-slate-500 mb-6">The requested service could not be located.</p>
        <button
          onClick={() => navigate('/user')}
          className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const isHourly = service.pricingType === 'HOURLY';
  const minHours = service.minHours || 1;
  const maxHours = service.maxHours || 8;
  const hourlyRate = Number(service.hourlyRate || 0);
  const hourOptions = isHourly
    ? Array.from({ length: Math.max(0, maxHours - minHours + 1) }, (_, i) => minHours + i)
    : [];

  const displayPrice = isHourly ? hourlyRate * selectedHours : (service.price || service.basePrice || service.discountPrice || 0);
  const originalPrice = isHourly ? null : (service.originalPrice || (service.discountPrice && service.basePrice ? service.basePrice : null));
  const hasDiscount = originalPrice && Number(originalPrice) > Number(displayPrice);

  const handleHoursSelect = (h) => {
    const clamped = Math.min(maxHours, Math.max(minHours, Number(h) || minHours));
    setSelectedHours(clamped);
  };

  const inclusions = service.inclusions && service.inclusions.length > 0 ? service.inclusions : defaultInclusions;
  const whyLove = service.whyLove && service.whyLove.length > 0 ? service.whyLove : defaultWhyLove;
  const whyLoveTitle = service.whyLoveTitle || `Why Customers Love ${service.title || 'Hourly Services'}`;
  const exclusions = service.exclusions && service.exclusions.length > 0 ? service.exclusions : defaultExclusions;
  const exclusionsTitle = service.exclusionsTitle || 'Does not include';
  const howItWorks = service.howItWorks && service.howItWorks.length > 0 ? service.howItWorks : defaultHowItWorks;
  const howItWorksTitle = service.howItWorksTitle || "How it's done?";
  const faqs = service.faqs && service.faqs.length > 0 ? service.faqs : defaultFaqs;

  const handleBookNow = async () => {
    try {
      setAddingToCart(true);
      const cartItemData = {
        serviceId: service.id || service._id,
        title: service.title,
        category: service.category?.title || service.category || service.brandName || service.title || 'General',
        sectionTitle: service.brandName || service.title || '',
        description: service.tagline || service.description || '',
        icon: service.image || service.icon || service.imageUrl || service.iconUrl || '',
        price: Number(displayPrice),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        unitPrice: isHourly ? hourlyRate : Number(displayPrice),
        serviceCount: 1,
        rating: service.rating || '4.9',
        reviews: service.ratingCount || '237.6k',
        inclusions: inclusions,
        ...(isHourly ? { hours: selectedHours } : {})
      };

      const response = await addToCart(cartItemData);
      if (response.success) {
        toast.success(`${service.title} added to cart!`);
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: service.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const scrollToHowItWorks = () => {
    if (howItWorksRef.current) {
      howItWorksRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const bannerImage = service.heroBanner?.imageUrl || service.iconUrl || service.image || service.imageUrl;

  return (
    <div className="min-h-screen bg-transparent text-slate-900 pb-28 font-sans antialiased">
      {/* Top Banner / Hero Image Section */}
      <div className="relative w-full bg-white/40 border-b border-[#E8D9DF]/60 overflow-hidden">
        {/* Top Floating Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-xs border border-slate-200/80 text-slate-800 flex items-center justify-center hover:bg-white active:scale-95 transition-all cursor-pointer"
            aria-label="Go Back"
          >
            <FiArrowLeft className="text-lg" />
          </button>

          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-xs border border-slate-200/80 text-slate-800 flex items-center justify-center hover:bg-white transition-all cursor-pointer"
            aria-label="Share"
          >
            <FiShare2 className="text-base" />
          </button>
        </div>

        {/* Hero Visual Area */}
        <div 
          className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden flex items-center justify-center border-b border-[#E8D9DF]/60"
          style={{
            background: `
              radial-gradient(circle at 50% 25%, rgba(154, 36, 89, 0.12) 0%, transparent 60%),
              radial-gradient(circle at 15% 85%, rgba(114, 12, 62, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 85% 85%, rgba(232, 160, 184, 0.18) 0%, transparent 50%),
              #FFF9FB
            `
          }}
        >
          {/* Subtle Dot Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#720C3E 0.8px, transparent 0.8px)',
              backgroundSize: '24px 24px'
            }}
          />

          {bannerImage ? (
            <img
              src={toAssetUrl(bannerImage)}
              alt={service.title}
              className="w-full h-full object-contain sm:object-cover relative z-0"
            />
          ) : (
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-sm relative z-0"
              style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
            >
              {service.title?.charAt(0) || 'S'}
            </div>
          )}

          {/* Optional Overlay "BOOK NOW" badge on hero banner */}
          {service.heroBanner?.buttonText && (
            <div className="absolute top-3.5 left-14 z-10 hidden sm:block">
              <span className="bg-white/95 backdrop-blur-xs text-slate-800 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                {service.heroBanner.buttonText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Service Title & Pricing Header */}
        <div className="space-y-1.5 pb-3 border-b border-slate-100">
          {service.title && (
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug truncate capitalize" title={service.title}>
              {service.title}
            </h1>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 leading-none">
                  ₹{displayPrice}
                </span>
                {isHourly && (
                  <span className="text-xs sm:text-sm text-slate-400 font-medium leading-none">
                    ({hourlyRate}/hr × {selectedHours} {selectedHours === 1 ? 'hr' : 'hrs'})
                  </span>
                )}
                {hasDiscount && (
                  <span className="text-xs sm:text-sm text-slate-400 line-through font-medium leading-none">
                    ₹{originalPrice}
                  </span>
                )}
              </div>

              {/* Rating in same line */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#F59E0B]">★</span>
                <span className="font-bold text-slate-800">
                  {service.rating || '4.9'}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({service.ratingCount ? String(service.ratingCount).replace(/ratings?|\(|\)/gi, '').trim() : '237.6k'} ratings)
                </span>
              </div>
            </div>

            {/* Brand Theme BOOK Button */}
            <button
              onClick={handleBookNow}
              disabled={addingToCart}
              className="px-5 py-2 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-[#720C3E]/20 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {addingToCart ? 'Booking...' : 'BOOK'}
            </button>
          </div>
        </div>

        {/* Select Hours (HOURLY-priced services only) */}
        {isHourly && (
          <div className="space-y-2.5 pb-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Select Hours
            </h3>
            <div className="flex flex-wrap gap-2">
              {hourOptions.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setCustomHoursMode(false);
                    handleHoursSelect(h);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer ${
                    !customHoursMode && selectedHours === h
                      ? 'bg-[#720C3E] border-[#720C3E] text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {h} {h === 1 ? 'Hour' : 'Hours'}
                </button>
              ))}

              {service.allowCustomHours && (
                <button
                  type="button"
                  onClick={() => setCustomHoursMode(true)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer ${
                    customHoursMode
                      ? 'bg-[#720C3E] border-[#720C3E] text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Custom
                </button>
              )}
            </div>

            {customHoursMode && (
              <input
                type="number"
                min={minHours}
                max={maxHours}
                value={selectedHours}
                onChange={(e) => handleHoursSelect(e.target.value)}
                placeholder={`Enter hours (${minHours}-${maxHours})`}
                className="w-full sm:w-48 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#720C3E]"
              />
            )}
          </div>
        )}

        {/* Tagline & Description */}
        <div className="space-y-1.5 pb-2">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {service.tagline || 'One Booking. Countless Tasks.'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {service.description ||
              'Let our professionals take care of everyday household tasks while you focus on work, family and everything else on your schedule.'}
          </p>
        </div>

        {/* "How long does it take?" Included Tasks Grid */}
        {inclusions && inclusions.length > 0 && (
          <div className="space-y-3.5 pt-2">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  How long does it take?
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Estimations are based on 2BHK
                </p>
              </div>
              <button
                onClick={scrollToHowItWorks}
                className="text-xs font-bold text-[#137333] hover:underline cursor-pointer"
              >
                How it's done?
              </button>
            </div>

            {/* 3D / Realistic Task Cards Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
              {inclusions.map((task, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center space-y-1.5 group cursor-pointer"
                >
                  <div className="w-full aspect-square bg-[#F4F5F7] rounded-2xl p-2 flex items-center justify-center border border-slate-100/90 shadow-2xs group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                    {task.iconUrl ? (
                      <img
                        src={toAssetUrl(task.iconUrl)}
                        alt={task.title || task.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#137333] font-bold text-sm">
                        {(task.title || task.name || 'T').charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-0.5">
                    <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-tight min-h-[26px]">
                      {task.title || task.name}
                    </h4>
                    {task.duration && (
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-[9px] sm:text-[10px] font-semibold text-slate-500 rounded-md">
                        {task.duration}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* "Why Customers Love [Service Name]" Section */}
        {whyLove && whyLove.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {whyLoveTitle}
            </h3>

            <ul className="space-y-2.5">
              {whyLove.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-[#137333] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs">
                    ✓
                  </span>
                  <span>{item.text || item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* "Does not include" (Exclusions) Section */}
        {exclusions && exclusions.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {exclusionsTitle}
            </h3>

            <ul className="space-y-2.5">
              {exclusions.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-[#E50914] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs">
                    ✕
                  </span>
                  <span>{item.text || item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* "How it's done?" (Steps) Section */}
        {howItWorks && howItWorks.length > 0 && (
          <div ref={howItWorksRef} className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {howItWorksTitle}
            </h3>

            <div className="space-y-3.5">
              {howItWorks.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F8F5] flex items-center justify-center text-[#137333] shrink-0 border border-[#E6F4EA] overflow-hidden p-1.5">
                    {step.iconUrl ? (
                      <img src={toAssetUrl(step.iconUrl)} alt={step.title} className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-black text-sm text-[#137333]">0{idx + 1}</span>
                    )}
                  </div>

                  <div className="space-y-0.5 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* "FAQs" Collapsible Accordion Section */}
        {faqs && faqs.length > 0 && (
          <div className="space-y-3.5 pt-4 border-t border-slate-100 pb-6">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              FAQs
            </h3>

            <div className="space-y-2.5">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-[#F8F9FB] rounded-2xl border border-slate-100/90 overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left gap-3 cursor-pointer"
                    >
                      <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                        {faq.question}
                      </span>
                      <span className="text-slate-500 text-lg font-bold shrink-0">
                        {isOpen ? <FiMinus /> : <FiPlus />}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/50">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Price</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                ₹{displayPrice}
              </span>
              {hasDiscount && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{originalPrice}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleBookNow}
            disabled={addingToCart}
            className="flex-1 max-w-xs py-3 px-6 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md shadow-[#720C3E]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-center"
          >
            {addingToCart ? 'Booking...' : 'Book Service Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;

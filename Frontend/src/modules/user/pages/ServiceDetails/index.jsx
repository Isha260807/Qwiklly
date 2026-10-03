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
import { zoneService } from '../../../../services/zoneService';
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
  // true until proven otherwise - only hides the Book button for the
  // hard-block reasons the backend also refuses at booking creation
  // (out of zone / zone inactive / service not offered here). Vendor
  // availability (offline/busy/no-one-in-radius) is NOT one of these -
  // those bookings still go through and get parked for admin assignment.
  const [canBook, setCanBook] = useState(true);

  const isDurationBased = service?.pricingType === 'DURATION' || service?.pricingType === 'HOURLY';
  const pricePer30Minutes = Number(service?.pricePer30Minutes ?? service?.durationPricing?.pricePer30Minutes ?? (service?.hourlyRate ? Math.round(service.hourlyRate / 2) : (service?.basePrice || 0)));
  const minDurationMinutes = Number(service?.minDurationMinutes ?? service?.durationPricing?.minDurationMinutes ?? (service?.minHours ? service.minHours * 60 : 30));
  const maxDurationMinutes = Number(service?.maxDurationMinutes ?? service?.durationPricing?.maxDurationMinutes ?? (service?.maxHours ? service.maxHours * 60 : 240));

  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(minDurationMinutes || 30);

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
          const isDur = found.pricingType === 'DURATION' || found.pricingType === 'HOURLY';
          const minM = Number(found.minDurationMinutes ?? found.durationPricing?.minDurationMinutes ?? (found.minHours ? found.minHours * 60 : 30));
          if (isDur) {
            setSelectedDurationMinutes(minM || 30);
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

  // Zone-level serviceability check for this exact service at the user's
  // last known location - mirrors the hard-block reasons the backend
  // enforces at booking creation (see HARD_BLOCK_REASONS in
  // userBookingController.js). Vendor-availability reasons are excluded on
  // purpose: those bookings still succeed server-side (parked pending_admin).
  useEffect(() => {
    const lat = parseFloat(localStorage.getItem('userLat'));
    const lng = parseFloat(localStorage.getItem('userLng'));
    if (!id || Number.isNaN(lat) || Number.isNaN(lng)) return;

    const HARD_BLOCK_REASONS = [
      'OUT_OF_SERVICE_ZONE',
      'ZONE_INACTIVE',
      'SERVICE_NOT_AVAILABLE_IN_ZONE',
      'INVALID_LOCATION',
      'SERVICE_NOT_FOUND'
    ];

    let cancelled = false;
    zoneService.checkServiceability(id, lat, lng)
      .then(res => {
        if (cancelled || !res?.success) return;
        const blocked = res.reason && HARD_BLOCK_REASONS.includes(res.reason);
        setCanBook(!blocked);
      })
      .catch(() => {
        // silent - fail open, let checkout's own validation be the backstop
      });

    return () => { cancelled = true; };
  }, [id]);

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

  const displayPrice = isDurationBased 
    ? (selectedDurationMinutes / 30) * pricePer30Minutes 
    : (service.price || service.basePrice || service.discountPrice || 0);

  const originalPrice = isDurationBased ? null : (service.originalPrice || (service.discountPrice && service.basePrice ? service.basePrice : null));
  const hasDiscount = originalPrice && Number(originalPrice) > Number(displayPrice);

  const handleDurationDecrement = () => {
    setSelectedDurationMinutes((prev) => Math.max(minDurationMinutes, prev - 30));
  };

  const handleDurationIncrement = () => {
    setSelectedDurationMinutes((prev) => Math.min(maxDurationMinutes, prev + 30));
  };

  const inclusions = service.inclusions && service.inclusions.length > 0 ? service.inclusions : defaultInclusions;
  const whyLove = service.whyLove && service.whyLove.length > 0 ? service.whyLove : defaultWhyLove;
  const whyLoveTitle = service.whyLoveTitle || `Why Customers Love ${service.title || 'Our Services'}`;
  const exclusions = service.exclusions && service.exclusions.length > 0 ? service.exclusions : defaultExclusions;
  const exclusionsTitle = service.exclusionsTitle || 'Does not include';
  const howItWorks = service.howItWorks && service.howItWorks.length > 0 ? service.howItWorks : defaultHowItWorks;
  const howItWorksTitle = service.howItWorksTitle || "How it's done?";
  const faqs = service.faqs && service.faqs.length > 0 ? service.faqs : defaultFaqs;

  const handleBookNow = async () => {
    if (!canBook) {
      toast.error('This service is not available at your location yet.');
      return;
    }

    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
      toast.error('Please login to book this service');
      navigate('/user/login', { state: { from: location } });
      return;
    }

    try {
      setAddingToCart(true);
      const cartItemData = {
        serviceId: service.id || service._id,
        title: service.title,
        category: service.category?.title || service.category || service.brandName || service.title || 'General',
        sectionTitle: service.brandName || service.title || '',
        description: service.tagline || service.description || '',
        icon: service.image || service.icon || service.imageUrl || service.iconUrl || '',
        pricingType: isDurationBased ? 'DURATION' : 'FIXED',
        price: Number(displayPrice),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        unitPrice: isDurationBased ? pricePer30Minutes : Number(displayPrice),
        serviceCount: 1,
        rating: service.rating || '4.9',
        reviews: service.ratingCount || '237.6k',
        inclusions: inclusions,
        ...(isDurationBased ? {
          durationMinutes: selectedDurationMinutes,
          pricePer30Minutes: pricePer30Minutes,
          minDurationMinutes: minDurationMinutes,
          maxDurationMinutes: maxDurationMinutes,
          hours: selectedDurationMinutes / 60
        } : {})
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
    <div className="min-h-screen bg-[#FFF9FB] text-slate-900 pb-28 md:pb-16 font-sans antialiased relative">
      {/* Background Mesh and Dot Grid for all screens (matches reference screenshots) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, rgba(114, 12, 62, 0.03) 0%, transparent 60%),
              radial-gradient(at 100% 0%, rgba(214, 143, 53, 0.03) 0%, transparent 60%),
              radial-gradient(at 50% 100%, rgba(52, 121, 137, 0.03) 0%, transparent 70%),
              #FFF9FB
            `
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(#720C3E 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* =========================================================================
            MOBILE LAYOUT (< md / < 768px) - 100% EXACT MATCH TO ORIGINAL DESIGN
        ========================================================================= */}
        <div className="md:hidden">
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
              className="relative w-full h-64 sm:h-80 overflow-hidden flex items-center justify-center border-b border-[#E8D9DF]/60"
              style={{
                background: `
                  radial-gradient(circle at 50% 25%, rgba(154, 36, 89, 0.12) 0%, transparent 60%),
                  radial-gradient(circle at 15% 85%, rgba(114, 12, 62, 0.08) 0%, transparent 50%),
                  radial-gradient(circle at 85% 85%, rgba(232, 160, 184, 0.18) 0%, transparent 50%),
                  #FFF9FB
                `
              }}
            >
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

              {service.heroBanner?.buttonText && (
                <div className="absolute top-3.5 left-14 z-10 hidden sm:block">
                  <span className="bg-white/95 backdrop-blur-xs text-slate-800 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                    {service.heroBanner.buttonText}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Main Mobile Content Flow */}
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
            {/* Service Title & Pricing Header */}
            <div className="space-y-1 pb-3 border-b border-slate-100">
              {service.title && (
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug truncate capitalize" title={service.title}>
                  {service.title}
                </h1>
              )}

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                      ₹{displayPrice}
                    </span>
                    {isDurationBased && (
                      <span className="text-xs sm:text-sm text-slate-500 font-semibold leading-none">
                        (₹{pricePer30Minutes}/30m × {selectedDurationMinutes}m)
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="text-xs sm:text-sm text-slate-400 line-through font-medium leading-none">
                        ₹{originalPrice}
                      </span>
                    )}
                  </div>

                  {/* Rating in same line */}
                  <div className="flex items-center gap-1 text-xs pl-1">
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
                {canBook ? (
                  <button
                    onClick={handleBookNow}
                    disabled={addingToCart}
                    className="px-5 py-1.5 bg-[#831843] hover:bg-[#720C3E] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-[#831843]/20 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {addingToCart ? 'Booking...' : 'BOOK'}
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0">
                    Not in your area
                  </span>
                )}
              </div>
            </div>

            {/* Select Duration (DURATION-priced services) */}
            {isDurationBased && (
              <div className="p-4 bg-[#FFF7FA] rounded-2xl border border-[#E8D9DF] space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                      Select Duration
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Scales in 30-minute blocks (₹{pricePer30Minutes} per 30 mins)
                    </p>
                  </div>

                  <span className="px-2.5 py-1 bg-white border border-[#E8D9DF] text-[#720C3E] text-xs font-black rounded-lg shadow-2xs">
                    ₹{displayPrice}
                  </span>
                </div>

                {/* Interactive Stepper */}
                <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-[#E8D9DF] shadow-xs">
                  <button
                    type="button"
                    onClick={handleDurationDecrement}
                    disabled={selectedDurationMinutes <= minDurationMinutes}
                    className="w-10 h-10 rounded-lg bg-[#FFF7FA] hover:bg-[#FCEBF3] active:scale-95 border border-[#E8D9DF] text-[#720C3E] flex items-center justify-center font-black transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    title="Decrease 30 minutes"
                  >
                    <FiMinus className="text-base" />
                  </button>

                  <div className="text-center px-4">
                    <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {selectedDurationMinutes} Mins
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">
                      {selectedDurationMinutes >= 60 
                        ? `${(selectedDurationMinutes / 60).toFixed(1).replace('.0', '')} ${selectedDurationMinutes === 60 ? 'Hour' : 'Hours'}`
                        : '30 Minutes Help'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDurationIncrement}
                    disabled={selectedDurationMinutes >= maxDurationMinutes}
                    className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#720C3E] to-[#9A2459] active:scale-95 text-white flex items-center justify-center font-black transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs"
                    title="Increase 30 minutes"
                  >
                    <FiPlus className="text-base" />
                  </button>
                </div>

                {/* Quick Select Preset Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[30, 60, 90, 120, 180, 240, 300, 360, 480]
                    .filter((mins) => mins >= minDurationMinutes && mins <= maxDurationMinutes)
                    .map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSelectedDurationMinutes(mins)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedDurationMinutes === mins
                            ? 'bg-[#720C3E] text-white shadow-2xs'
                            : 'bg-white border border-[#E8D9DF] text-slate-700 hover:bg-[#FFF7FA]'
                        }`}
                      >
                        {mins >= 60 ? `${mins / 60}h (${mins}m)` : `${mins}m`} • ₹{(mins / 30) * pricePer30Minutes}
                      </button>
                    ))}
                </div>
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
        </div>

        {/* =========================================================================
            TABLET & DESKTOP LAYOUT (>= md / >= 768px) - 2-COLUMN SPLIT WITH STICKY BAR
        ========================================================================= */}
        <div className="hidden md:block">
          {/* Header Nav */}
          <div className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Go Back"
                >
                  <FiArrowLeft className="text-lg" />
                </button>
                <div>
                  <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/user')}>Home</span>
                    <span>/</span>
                    <span className="text-slate-600 capitalize">{service.category?.title || service.category || 'Service'}</span>
                    <span>/</span>
                    <span className="text-[#720C3E] font-bold truncate max-w-[200px]">{service.title}</span>
                  </nav>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none mt-0.5">{service.title}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleShare}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FiShare2 className="text-sm" /> Share Service
                </button>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet 2-Column Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* Left Column */}
              <div className="col-span-7 xl:col-span-8 space-y-6">
                {/* Hero Banner */}
                <div className="relative w-full h-72 lg:h-80 xl:h-96 rounded-3xl overflow-hidden border border-[#E8D9DF]/70 shadow-sm bg-white">
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: `
                        radial-gradient(circle at 50% 25%, rgba(154, 36, 89, 0.12) 0%, transparent 60%),
                        radial-gradient(circle at 15% 85%, rgba(114, 12, 62, 0.08) 0%, transparent 50%),
                        radial-gradient(circle at 85% 85%, rgba(232, 160, 184, 0.18) 0%, transparent 50%),
                        #FFF9FB
                      `
                    }}
                  >
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
                        className="w-full h-full object-contain p-4 relative z-0"
                      />
                    ) : (
                      <div 
                        className="w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-md relative z-0"
                        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
                      >
                        {service.title?.charAt(0) || 'S'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tagline & Description Card */}
                <div className="space-y-2 p-6 bg-white rounded-3xl border border-slate-100 shadow-2xs">
                  <h2 className="text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">
                    {service.tagline || 'One Booking. Countless Tasks.'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {service.description ||
                      'Let our professionals take care of everyday household tasks while you focus on work, family and everything else on your schedule.'}
                  </p>
                </div>

                {/* Included Tasks Grid */}
                {inclusions && inclusions.length > 0 && (
                  <div className="space-y-3.5 p-6 bg-white rounded-3xl border border-slate-100 shadow-2xs">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                          How long does it take?
                        </h3>
                        <p className="text-xs text-slate-400">
                          Estimations are based on 2BHK
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3.5">
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
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight min-h-[26px]">
                              {task.title || task.name}
                            </h4>
                            {task.duration && (
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-[10px] font-semibold text-slate-500 rounded-md">
                                {task.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side-by-side Why love & Exclusions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {whyLove && whyLove.length > 0 && (
                    <div className="space-y-3 p-6 bg-white rounded-3xl border border-slate-100 shadow-2xs">
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

                  {exclusions && exclusions.length > 0 && (
                    <div className="space-y-3 p-6 bg-white rounded-3xl border border-slate-100 shadow-2xs">
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
                </div>

                {/* How it's done? */}
                {howItWorks && howItWorks.length > 0 && (
                  <div className="space-y-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-2xs">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                      {howItWorksTitle}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {howItWorks.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-start gap-3 p-4 bg-[#F9FBFA] rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs transition-shadow"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#137333] shrink-0 border border-[#E6F4EA] shadow-2xs overflow-hidden p-1">
                            {step.iconUrl ? (
                              <img src={toAssetUrl(step.iconUrl)} alt={step.title} className="w-full h-full object-contain" />
                            ) : (
                              <span className="font-black text-xs text-[#137333]">0{idx + 1}</span>
                            )}
                          </div>

                          <div className="space-y-1 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {step.title}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQs */}
                {faqs && faqs.length > 0 && (
                  <div className="space-y-3.5 p-6 bg-white rounded-3xl border border-slate-100 shadow-2xs pb-6">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                      Frequently Asked Questions
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

              {/* Right Column (Sticky Booking Card) */}
              <div className="col-span-5 xl:col-span-4 sticky top-20 lg:top-24 space-y-5">
                <div className="bg-white rounded-3xl p-6 border border-[#E8D9DF]/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-[#FFF7FA] text-[#720C3E] border border-[#E8D9DF] rounded-md text-[10px] font-black uppercase tracking-wider">
                        {service.category?.title || service.category || 'Home Service'}
                      </span>
                      <div className="flex items-center gap-1 text-xs bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                        <span className="text-[#F59E0B]">★</span>
                        <span className="font-bold text-slate-800">{service.rating || '4.9'}</span>
                        <span className="text-[10px] text-slate-400">({service.ratingCount ? String(service.ratingCount).replace(/ratings?|\(|\)/gi, '').trim() : '237.6k'})</span>
                      </div>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                      {service.title}
                    </h2>
                  </div>

                  {/* Pricing summary */}
                  <div className="p-4 rounded-2xl bg-[#FFF7FA] border border-[#E8D9DF]/80 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Price</span>
                      <div className="flex items-baseline gap-2">
                        {hasDiscount && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{originalPrice}
                          </span>
                        )}
                        <span className="text-2xl font-black text-slate-900">
                          ₹{displayPrice}
                        </span>
                      </div>
                    </div>

                    {isDurationBased && (
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-[#E8D9DF]/60">
                        <span>Rate Breakdown</span>
                        <span className="font-semibold text-slate-700">₹{pricePer30Minutes} / 30 mins</span>
                      </div>
                    )}
                  </div>

                  {/* Duration Picker (if duration based) */}
                  {isDurationBased && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Choose Duration</h4>
                        <span className="text-xs font-bold text-[#720C3E]">{selectedDurationMinutes} Minutes</span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2 border border-slate-200">
                        <button
                          type="button"
                          onClick={handleDurationDecrement}
                          disabled={selectedDurationMinutes <= minDurationMinutes}
                          className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[#720C3E] flex items-center justify-center font-black transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                        >
                          <FiMinus />
                        </button>

                        <div className="text-center">
                          <p className="text-sm font-black text-slate-900">{selectedDurationMinutes} Mins</p>
                          <p className="text-[10px] text-slate-500 font-semibold">
                            {selectedDurationMinutes >= 60 
                              ? `${(selectedDurationMinutes / 60).toFixed(1).replace('.0', '')} Hours` 
                              : 'Quick Help'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleDurationIncrement}
                          disabled={selectedDurationMinutes >= maxDurationMinutes}
                          className="w-9 h-9 rounded-lg bg-[#720C3E] hover:bg-[#5b0931] text-white flex items-center justify-center font-black transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                        >
                          <FiPlus />
                        </button>
                      </div>

                      {/* Quick Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {[30, 60, 90, 120, 180, 240]
                          .filter((mins) => mins >= minDurationMinutes && mins <= maxDurationMinutes)
                          .map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setSelectedDurationMinutes(mins)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                selectedDurationMinutes === mins
                                  ? 'bg-[#720C3E] text-white'
                                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Book Action Button */}
                  {canBook ? (
                    <button
                      onClick={handleBookNow}
                      disabled={addingToCart}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-md shadow-[#720C3E]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-center"
                    >
                      {addingToCart ? 'Booking...' : 'Book Service Now'}
                    </button>
                  ) : (
                    <div className="w-full py-3 px-4 bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-2xl text-center">
                      Service not available in your area
                    </div>
                  )}

                  {/* Trust Badges */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <FiShield className="text-[#137333] shrink-0" />
                      <span>Verified & Background-Checked Experts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="text-[#137333] shrink-0" />
                      <span>Transparent Pricing & No Hidden Charges</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="text-[#720C3E] shrink-0" />
                      <span>Hassle-free Rescheduling & Support</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Bar (Mobile ONLY < md / < 768px) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 px-4 py-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOTAL PRICE</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  ₹{displayPrice}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-slate-400 line-through">
                    ₹{originalPrice}
                  </span>
                )}
              </div>
            </div>

            {canBook ? (
              <button
                onClick={handleBookNow}
                disabled={addingToCart}
                className="flex-1 max-w-xs py-3 px-6 bg-[#831843] hover:bg-[#720C3E] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md shadow-[#831843]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-center"
              >
                {addingToCart ? 'Booking...' : 'BOOK SERVICE NOW'}
              </button>
            ) : (
              <div className="flex-1 max-w-xs py-3 px-6 bg-slate-100 text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl text-center">
                Not available in your area
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;


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
  FiChevronUp,
  FiShoppingBag,
  FiX,
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

const FlyingCartItem = ({ item, onComplete }) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimating(true);
    });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 620);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  const dx = item.endX - item.startX;
  const dy = item.endY - item.startY;

  return (
    <div
      className="fixed pointer-events-none z-[99999]"
      style={{
        left: `${item.startX}px`,
        top: `${item.startY}px`,
        transform: animating ? `translateX(${dx}px)` : 'translateX(0px)',
        transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
      }}
    >
      <div
        style={{
          transform: animating
            ? `translateY(${dy}px) scale(0.22) rotate(15deg)`
            : 'translateY(0px) scale(1) rotate(0deg)',
          opacity: animating ? 0.35 : 1,
          transition: 'transform 0.6s cubic-bezier(0.5, 0.05, 0.8, 0.4), opacity 0.6s ease-in',
          willChange: 'transform, opacity',
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white shadow-[0_12px_32px_rgba(114,12,62,0.38)] border-2 border-[#720C3E] p-1.5 flex items-center justify-center overflow-hidden ring-4 ring-[#720C3E]/20">
          {item.image ? (
            <img src={toAssetUrl(item.image)} alt={item.title} className="w-full h-full object-contain" />
          ) : (
            <span className="text-2xl font-black text-[#720C3E]">{item.title?.charAt(0) || 'S'}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { currentCity } = useCity();

  const [service, setService] = useState(location.state?.service || null);
  const [loading, setLoading] = useState(!location.state?.service);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showBookingOptions, setShowBookingOptions] = useState(false);
  const [showReviewServices, setShowReviewServices] = useState(false);
  const [selectedFrequentlyAdded, setSelectedFrequentlyAdded] = useState([]);
  const [flyingItems, setFlyingItems] = useState([]);
  const [cartBounced, setCartBounced] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  // true until proven otherwise - only hides the Book button for the
  // hard-block reasons the backend also refuses at booking creation
  // (out of zone / zone inactive / service not offered here). Vendor
  // availability (offline/busy/no-one-in-radius) is NOT one of these -
  // those bookings still go through and get parked for admin assignment.
  const [canBook, setCanBook] = useState(
    location.state?.service?.isAvailableInArea !== false
  );

  const isDurationBased = service?.pricingType === 'DURATION' || service?.pricingType === 'HOURLY';
  const billingUnitMinutes = Number(service?.billingUnitMinutes ?? service?.durationPricing?.billingUnitMinutes ?? 30);
  const pricePerUnit = Number(service?.pricePerUnit ?? service?.durationPricing?.pricePerUnit ?? service?.pricePer30Minutes ?? (service?.hourlyRate ? service.hourlyRate * (billingUnitMinutes / 60) : (service?.basePrice || 0)));
  const minDurationMinutes = Number(service?.minDurationMinutes ?? service?.durationPricing?.minDurationMinutes ?? (service?.minHours ? service.minHours * 60 : billingUnitMinutes));
  const maxDurationMinutes = Number(service?.maxDurationMinutes ?? service?.durationPricing?.maxDurationMinutes ?? (service?.maxHours ? service.maxHours * 60 : 240));
  const durationStepMinutes = Number(service?.durationStepMinutes ?? service?.durationPricing?.durationStepMinutes ?? billingUnitMinutes);

  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(minDurationMinutes || billingUnitMinutes);

  const howItWorksRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchServiceData = async () => {
      try {
        setLoading(true);
        const cityId = currentCity?._id || currentCity?.id;
        const latitude = parseFloat(localStorage.getItem('userLat'));
        const longitude = parseFloat(localStorage.getItem('userLng'));
        let zoneId = '';

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          try {
            const zoneResponse = await zoneService.resolve(latitude, longitude);
            zoneId = zoneResponse?.zoneStatus?.zoneId || '';
          } catch (zoneError) {
            // Recommendations fall back to the global mapping if the zone cannot be resolved.
          }
        }

        const res = await publicCatalogService.getServices({ cityId, zoneId });

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
          if (found.isAvailableInArea === false) setCanBook(false);
          const isDur = found.pricingType === 'DURATION' || found.pricingType === 'HOURLY';
          const foundUnit = Number(found.billingUnitMinutes ?? found.durationPricing?.billingUnitMinutes ?? 30);
          const minM = Number(found.minDurationMinutes ?? found.durationPricing?.minDurationMinutes ?? (found.minHours ? found.minHours * 60 : foundUnit));
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
    ? (selectedDurationMinutes / billingUnitMinutes) * pricePerUnit
    : (service.price || service.basePrice || service.discountPrice || 0);

  const originalPrice = isDurationBased ? null : (service.originalPrice || (service.discountPrice && service.basePrice ? service.basePrice : null));
  const hasDiscount = originalPrice && Number(originalPrice) > Number(displayPrice);

  const handleDurationDecrement = () => {
    setSelectedDurationMinutes((prev) => Math.max(minDurationMinutes, prev - durationStepMinutes));
  };

  const handleDurationIncrement = () => {
    setSelectedDurationMinutes((prev) => Math.min(maxDurationMinutes, prev + durationStepMinutes));
  };

  const inclusions = service.inclusions && service.inclusions.length > 0 ? service.inclusions : defaultInclusions;
  const whyLove = service.whyLove && service.whyLove.length > 0 ? service.whyLove : defaultWhyLove;
  const whyLoveTitle = service.whyLoveTitle || `Why Customers Love ${service.title || 'Our Services'}`;
  const exclusions = service.exclusions && service.exclusions.length > 0 ? service.exclusions : defaultExclusions;
  const exclusionsTitle = service.exclusionsTitle || 'Does not include';
  const howItWorks = service.howItWorks && service.howItWorks.length > 0 ? service.howItWorks : defaultHowItWorks;
  const howItWorksTitle = service.howItWorksTitle || "How it's done?";
  const faqs = service.faqs && service.faqs.length > 0 ? service.faqs : defaultFaqs;

  const frequentlyAddedServices = Array.isArray(service.frequentlyAddedTogether)
    ? service.frequentlyAddedTogether.filter((item) => item && item.status !== 'inactive')
    : [];

  const buildCartItemData = (serviceItem, durationOverride = null, quantityOverride = 1) => {
    const itemIsDuration = serviceItem.pricingType === 'DURATION' || serviceItem.pricingType === 'HOURLY';
    const itemBillingUnit = Number(serviceItem.billingUnitMinutes ?? serviceItem.durationPricing?.billingUnitMinutes ?? 30);
    const itemPricePerUnit = Number(
      serviceItem.pricePerUnit ??
      serviceItem.durationPricing?.pricePerUnit ??
      serviceItem.pricePer30Minutes ??
      (serviceItem.hourlyRate ? serviceItem.hourlyRate * (itemBillingUnit / 60) : (serviceItem.basePrice || serviceItem.price || 0))
    );
    const itemMinDuration = Number(
      serviceItem.minDurationMinutes ??
      serviceItem.durationPricing?.minDurationMinutes ??
      (serviceItem.minHours ? serviceItem.minHours * 60 : itemBillingUnit)
    );
    const itemMaxDuration = Number(
      serviceItem.maxDurationMinutes ??
      serviceItem.durationPricing?.maxDurationMinutes ??
      (serviceItem.maxHours ? serviceItem.maxHours * 60 : 240)
    );
    const itemDuration = Number(durationOverride || itemMinDuration);
    const itemQuantity = Number(quantityOverride || 1);
    const itemDisplayPrice = itemIsDuration
      ? (itemDuration / itemBillingUnit) * itemPricePerUnit
      : (Number(serviceItem.basePrice ?? serviceItem.price ?? serviceItem.discountPrice ?? 0)) * itemQuantity;
    const itemOriginalPrice = itemIsDuration
      ? null
      : (serviceItem.originalPrice || (serviceItem.discountPrice && serviceItem.basePrice ? serviceItem.basePrice * itemQuantity : null));
    const latitude = parseFloat(localStorage.getItem('userLat'));
    const longitude = parseFloat(localStorage.getItem('userLng'));

    return {
      serviceId: serviceItem.id || serviceItem._id,
      title: serviceItem.title,
      category: serviceItem.category?.title || serviceItem.category || serviceItem.brandName || serviceItem.title || 'General',
      sectionTitle: serviceItem.brandName || serviceItem.title || '',
      description: serviceItem.tagline || serviceItem.description || '',
      icon: serviceItem.image || serviceItem.icon || serviceItem.imageUrl || serviceItem.iconUrl || '',
      pricingType: itemIsDuration ? 'DURATION' : 'FIXED',
      price: Number(itemDisplayPrice),
      originalPrice: itemOriginalPrice ? Number(itemOriginalPrice) : null,
      unitPrice: itemIsDuration ? itemPricePerUnit : Number(serviceItem.basePrice ?? serviceItem.price ?? 0),
      pricePerUnit: itemIsDuration ? itemPricePerUnit : null,
      billingUnitMinutes: itemIsDuration ? itemBillingUnit : null,
      estimatedDurationMinutes: itemIsDuration ? null : Number(serviceItem.estimatedDurationMinutes || 45),
      serviceCount: itemQuantity,
      quantity: itemQuantity,
      rating: serviceItem.rating || '4.9',
      reviews: serviceItem.ratingCount || '237.6k',
      inclusions: serviceItem.inclusions || [],
      ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {}),
      ...(itemIsDuration ? {
        durationMinutes: itemDuration,
        pricePer30Minutes: itemBillingUnit === 30 ? itemPricePerUnit : null,
        minDurationMinutes: itemMinDuration,
        maxDurationMinutes: itemMaxDuration,
        hours: itemDuration / 60
      } : {})
    };
  };

  const addSelectedServicesToCart = async (selectedServices = selectedFrequentlyAdded) => {
    setAddingToCart(true);
    try {
      const cartItems = [
        buildCartItemData(service, isDurationBased ? selectedDurationMinutes : null, 1),
        ...selectedServices.map((item) =>
          buildCartItemData(
            item,
            item.selectedDurationMinutes || item.durationMinutes || null,
            item.quantity || 1
          )
        )
      ];

      for (const item of cartItems) {
        const response = await addToCart(item);
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to add a service to cart');
        }
      }

      setShowBookingOptions(false);
      setShowReviewServices(false);
      setSelectedFrequentlyAdded([]);
      toast.success(cartItems.length + ' service' + (cartItems.length > 1 ? 's' : '') + ' added to cart');
      navigate('/user/cart');
    } catch (error) {
      toast.error(error.message || 'Failed to add services to cart');
    } finally {
      setAddingToCart(false);
    }
  };

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

    if ((isDurationBased || frequentlyAddedServices.length > 0) && !showBookingOptions) {
      setShowBookingOptions(true);
      return;
    }

    await addSelectedServicesToCart();
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
  const reviewServices = [
    { ...service, isPrimary: true },
    ...selectedFrequentlyAdded.map((item) => ({ ...item, isPrimary: false }))
  ];

  const getReviewItemDuration = (reviewItem) => {
    if (reviewItem.isPrimary) return selectedDurationMinutes;
    return Number(
      reviewItem.selectedDurationMinutes ??
      reviewItem.durationMinutes ??
      reviewItem.minDurationMinutes ??
      reviewItem.durationPricing?.minDurationMinutes ??
      reviewItem.billingUnitMinutes ??
      30
    );
  };

  const getReviewItemPrice = (reviewItem) => {
    if (reviewItem.isPrimary) return Number(displayPrice);
    const itemIsDurationBased = reviewItem.pricingType === 'DURATION' || reviewItem.pricingType === 'HOURLY';
    if (!itemIsDurationBased) {
      const qty = reviewItem.quantity || 1;
      return Number(reviewItem.basePrice ?? reviewItem.price ?? reviewItem.discountPrice ?? 0) * qty;
    }
    const itemBillingUnit = Number(reviewItem.billingUnitMinutes ?? reviewItem.durationPricing?.billingUnitMinutes ?? 30);
    const itemPricePerUnit = Number(
      reviewItem.pricePerUnit ??
      reviewItem.durationPricing?.pricePerUnit ??
      reviewItem.pricePer30Minutes ??
      (reviewItem.hourlyRate ? reviewItem.hourlyRate * (itemBillingUnit / 60) : (reviewItem.basePrice || reviewItem.price || 0))
    );
    return (getReviewItemDuration(reviewItem) / itemBillingUnit) * itemPricePerUnit;
  };

  const handleIncrementFrequentlyAdded = (e, item) => {
    e.stopPropagation();
    const itemId = item.id || item._id;
    const existingIndex = selectedFrequentlyAdded.findIndex(
      (selectedItem) => (selectedItem.id || selectedItem._id) === itemId
    );

    const isItemDuration = item.pricingType === 'DURATION' || item.pricingType === 'HOURLY';
    const billingUnit = Number(item.billingUnitMinutes ?? item.durationPricing?.billingUnitMinutes ?? 30);
    const minDuration = Number(
      item.minDurationMinutes ??
      item.durationPricing?.minDurationMinutes ??
      (item.minHours ? item.minHours * 60 : billingUnit)
    );
    const maxDuration = Number(
      item.maxDurationMinutes ??
      item.durationPricing?.maxDurationMinutes ??
      (item.maxHours ? item.maxHours * 60 : 240)
    );
    const stepMinutes = Number(item.durationStepMinutes ?? item.durationPricing?.durationStepMinutes ?? billingUnit);

    if (existingIndex === -1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      const targetEl = isMobile
        ? (document.getElementById('mobile-cart-btn-action') || document.getElementById('mobile-cart-btn') || document.getElementById('mobile-cart-target'))
        : (document.getElementById('desktop-cart-btn') || document.getElementById('desktop-cart-target'));

      if (targetEl) {
        const targetRect = targetEl.getBoundingClientRect();
        const startX = rect.left + rect.width / 2 - 32;
        const startY = rect.top + rect.height / 2 - 32;
        const endX = targetRect.left + targetRect.width / 2 - 32;
        const endY = targetRect.top + targetRect.height / 2 - 32;

        const flyId = `${Date.now()}_${Math.random()}`;
        setFlyingItems((current) => [
          ...current,
          {
            id: flyId,
            startX,
            startY,
            endX,
            endY,
            image: item.image || item.icon || item.iconUrl,
            title: item.title,
          },
        ]);
      }

      setSelectedFrequentlyAdded((current) => [
        ...current,
        {
          ...item,
          selectedDurationMinutes: isItemDuration ? minDuration : null,
          quantity: 1
        }
      ]);
    } else {
      setSelectedFrequentlyAdded((current) => {
        const updated = [...current];
        const target = { ...updated[existingIndex] };
        if (isItemDuration) {
          const currentDur = target.selectedDurationMinutes || minDuration;
          target.selectedDurationMinutes = Math.min(maxDuration, currentDur + stepMinutes);
        } else {
          target.quantity = (target.quantity || 1) + 1;
        }
        updated[existingIndex] = target;
        return updated;
      });
    }
  };

  const handleDecrementFrequentlyAdded = (e, item) => {
    e.stopPropagation();
    const itemId = item.id || item._id;
    const existingIndex = selectedFrequentlyAdded.findIndex(
      (selectedItem) => (selectedItem.id || selectedItem._id) === itemId
    );

    if (existingIndex === -1) return;

    const isItemDuration = item.pricingType === 'DURATION' || item.pricingType === 'HOURLY';
    const billingUnit = Number(item.billingUnitMinutes ?? item.durationPricing?.billingUnitMinutes ?? 30);
    const minDuration = Number(
      item.minDurationMinutes ??
      item.durationPricing?.minDurationMinutes ??
      (item.minHours ? item.minHours * 60 : billingUnit)
    );
    const stepMinutes = Number(item.durationStepMinutes ?? item.durationPricing?.durationStepMinutes ?? billingUnit);

    setSelectedFrequentlyAdded((current) => {
      const target = current[existingIndex];
      if (isItemDuration) {
        const currentDur = target.selectedDurationMinutes || minDuration;
        if (currentDur - stepMinutes < minDuration) {
          return current.filter((selectedItem) => (selectedItem.id || selectedItem._id) !== itemId);
        }
        const updated = [...current];
        updated[existingIndex] = { ...target, selectedDurationMinutes: currentDur - stepMinutes };
        return updated;
      } else {
        const currentQty = target.quantity || 1;
        if (currentQty <= 1) {
          return current.filter((selectedItem) => (selectedItem.id || selectedItem._id) !== itemId);
        }
        const updated = [...current];
        updated[existingIndex] = { ...target, quantity: currentQty - 1 };
        return updated;
      }
    });
  };

  const frequentlyAddedSection = showBookingOptions && frequentlyAddedServices.length > 0 ? (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
          Frequently added together
        </h3>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Add more
        </span>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {frequentlyAddedServices.map((item) => {
          const itemId = item.id || item._id;
          const selectedItem = selectedFrequentlyAdded.find((selected) => (selected.id || selected._id) === itemId);
          const isItemDuration = item.pricingType === 'DURATION' || item.pricingType === 'HOURLY';
          const billingUnit = Number(item.billingUnitMinutes ?? item.durationPricing?.billingUnitMinutes ?? 30);
          const pricePerUnit = Number(
            item.pricePerUnit ??
            item.durationPricing?.pricePerUnit ??
            item.pricePer30Minutes ??
            (item.hourlyRate ? item.hourlyRate * (billingUnit / 60) : (item.basePrice || item.price || 0))
          );
          const minDuration = Number(
            item.minDurationMinutes ??
            item.durationPricing?.minDurationMinutes ??
            (item.minHours ? item.minHours * 60 : billingUnit)
          );
          const maxDuration = Number(
            item.maxDurationMinutes ??
            item.durationPricing?.maxDurationMinutes ??
            (item.maxHours ? item.maxHours * 60 : 240)
          );

          const currentDuration = selectedItem?.selectedDurationMinutes || minDuration;
          const currentQty = selectedItem?.quantity || 1;

          const calculatedPrice = isItemDuration
            ? (currentDuration / billingUnit) * pricePerUnit
            : (Number(item.basePrice ?? item.price ?? item.discountPrice ?? 0)) * currentQty;

          const itemOriginalPrice = isItemDuration
            ? null
            : (item.originalPrice || (item.discountPrice && item.basePrice ? item.basePrice * currentQty : null));

          return (
            <div
              key={itemId}
              onClick={(e) => handleToggleFrequentlyAdded(e, item)}
              style={{ flex: "0 0 calc((100% - 24px) / 2.3)" }}
              className="relative min-w-0 snap-start rounded-2xl border border-slate-200/90 p-2.5 text-left transition-all bg-white flex flex-col justify-between cursor-pointer active:scale-95 hover:border-slate-300"
            >
              {/* Rating badge */}
              {item.rating && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-slate-100 shadow-2xs text-[9px] font-bold text-slate-700 pointer-events-none">
                  <span className="text-[#F59E0B]">★</span>
                  <span>{item.rating}</span>
                  {item.ratingCount && (
                    <span className="text-slate-400 font-normal">({String(item.ratingCount).replace(/ratings?|\(|\)/gi, '').trim()})</span>
                  )}
                </div>
              )}

              {/* Image box with action button */}
              <div className="relative h-24 sm:h-28 rounded-xl bg-[#F8F9FA] border border-slate-100 flex items-center justify-center mb-2 p-2">
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                  {item.image || item.icon || item.iconUrl ? (
                    <img src={toAssetUrl(item.image || item.icon || item.iconUrl)} alt={item.title} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl font-black text-[#720C3E]">{item.title?.charAt(0) || 'S'}</span>
                  )}
                </div>

                {/* Plus (+) or Tick (✓) Button positioned on bottom right */}
                <div className="absolute bottom-1.5 right-1.5 z-10">
                  {selectedItem ? (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFrequentlyAdded(e, item)}
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-[#831843] text-white shadow-md hover:bg-[#720C3E] transition-all active:scale-90 cursor-pointer"
                      aria-label={`Remove ${item.title}`}
                    >
                      <FiCheckCircle className="text-base font-bold" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFrequentlyAdded(e, item)}
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-white border border-[#E8D9DF] text-[#831843] shadow-md hover:bg-[#831843] hover:text-white transition-all active:scale-90 cursor-pointer"
                      aria-label={`Add ${item.title}`}
                    >
                      <FiPlus className="text-base font-bold" />
                    </button>
                  )}
                </div>
              </div>

              {/* Text content */}
              <div>
                <p className="text-xs font-bold text-slate-900 line-clamp-2 min-h-[30px] leading-snug">{item.title}</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-slate-900">&#8377;{Math.round(calculatedPrice)}</span>
                  {itemOriginalPrice && Number(itemOriginalPrice) > Number(calculatedPrice) && (
                    <span className="text-[11px] text-slate-400 line-through">&#8377;{Math.round(itemOriginalPrice)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">
        {selectedFrequentlyAdded.length > 0
          ? `${selectedFrequentlyAdded.length} add-on${selectedFrequentlyAdded.length > 1 ? 's' : ''} selected`
          : 'Tap + to add another service'}
      </p>
    </section>
  ) : null;

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
                {/* Compact duration selector, matching the service card pattern */}
                {showBookingOptions && isDurationBased ? (
                  <div className="flex items-center gap-1 rounded-xl border border-[#E8D9DF] bg-white px-1.5 py-1 shadow-sm shrink-0">
                    <button
                      type="button"
                      onClick={handleDurationDecrement}
                      disabled={selectedDurationMinutes <= minDurationMinutes}
                      className="w-7 h-7 rounded-lg text-[#831843] text-lg leading-none hover:bg-[#FFF7FA] disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Decrease duration by ${durationStepMinutes} minutes`}
                    >
                      −
                    </button>
                    <div className="min-w-[42px] text-center leading-none">
                      <div className="text-base font-black text-[#831843]">{selectedDurationMinutes}</div>
                      <div className="text-[9px] font-semibold text-slate-400 mt-0.5">Minutes</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDurationIncrement}
                      disabled={selectedDurationMinutes >= maxDurationMinutes}
                      className="w-7 h-7 rounded-lg bg-[#831843] text-white text-lg leading-none hover:bg-[#720C3E] disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Increase duration by ${durationStepMinutes} minutes`}
                    >
                      +
                    </button>
                  </div>
                ) : canBook ? (
                  <button
                    onClick={handleBookNow}
                    disabled={addingToCart}
                    className="px-5 py-1.5 bg-[#831843] hover:bg-[#720C3E] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-[#831843]/20 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {addingToCart ? 'Booking...' : showBookingOptions ? 'GO TO CART' : 'BOOK'}
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0">
                    Not in your area
                  </span>
                )}
              </div>
            </div>

            {frequentlyAddedSection}

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
                    className="text-xs font-bold text-[#831843] hover:text-[#720C3E] hover:underline cursor-pointer"
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
                          <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#831843] font-bold text-sm">
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
                      <span className="w-5 h-5 rounded-full bg-[#831843] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs">
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
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF7FA] flex items-center justify-center text-[#831843] shrink-0 border border-[#E8D9DF] overflow-hidden p-1.5">
                        {step.iconUrl ? (
                          <img src={toAssetUrl(step.iconUrl)} alt={step.title} className="w-full h-full object-contain" />
                        ) : (
                          <span className="font-black text-sm text-[#831843]">0{idx + 1}</span>
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

                {frequentlyAddedSection}

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
                              <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#831843] font-bold text-sm">
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
                            <span className="w-5 h-5 rounded-full bg-[#831843] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs">
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
                          className="flex flex-col items-start gap-3 p-4 bg-[#FFF7FA] rounded-2xl border border-[#E8D9DF]/60 shadow-2xs hover:shadow-xs transition-shadow"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#831843] shrink-0 border border-[#E8D9DF] shadow-2xs overflow-hidden p-1">
                            {step.iconUrl ? (
                              <img src={toAssetUrl(step.iconUrl)} alt={step.title} className="w-full h-full object-contain" />
                            ) : (
                              <span className="font-black text-xs text-[#831843]">0{idx + 1}</span>
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
              <div
                id="desktop-cart-target"
                className={`col-span-5 xl:col-span-4 sticky top-20 lg:top-24 space-y-5 transition-transform duration-300 ${
                  cartBounced ? 'scale-[1.02]' : ''
                }`}
              >
                <div className={`bg-white rounded-3xl p-6 border border-[#E8D9DF]/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-5 transition-all duration-300 ${
                  cartBounced ? 'ring-4 ring-[#720C3E]/20 shadow-xl' : ''
                }`}>
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
                        <span className="font-semibold text-slate-700">₹{pricePerUnit} / {billingUnitMinutes} mins</span>
                      </div>
                    )}
                  </div>
                  {/* Compact duration selector */}
                  {showBookingOptions && isDurationBased && (
                    <div className="flex items-center justify-between rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] p-2">
                      <span className="text-[11px] font-bold text-slate-500">Duration</span>
                      <div className="flex items-center gap-1 rounded-lg border border-[#E8D9DF] bg-white px-1 py-1">
                        <button
                          type="button"
                          onClick={handleDurationDecrement}
                          disabled={selectedDurationMinutes <= minDurationMinutes}
                          className="w-7 h-7 rounded-md text-[#831843] text-lg leading-none hover:bg-[#FFF7FA] disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Decrease duration by ${durationStepMinutes} minutes`}
                        >
                          −
                        </button>
                        <div className="min-w-[48px] text-center leading-none">
                          <div className="text-sm font-black text-[#831843]">{selectedDurationMinutes}</div>
                          <div className="text-[9px] font-semibold text-slate-400 mt-0.5">Minutes</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDurationIncrement}
                          disabled={selectedDurationMinutes >= maxDurationMinutes}
                          className="w-7 h-7 rounded-md bg-[#831843] text-white text-lg leading-none hover:bg-[#720C3E] disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Increase duration by ${durationStepMinutes} minutes`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Book Action Button */}
                  {canBook ? (
                    <button
                      id="desktop-cart-btn"
                      onClick={handleBookNow}
                      disabled={addingToCart}
                      className={`w-full py-3.5 px-6 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-md shadow-[#720C3E]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-center ${
                        cartBounced ? 'scale-105 shadow-xl ring-2 ring-[#720C3E]/40' : ''
                      }`}
                    >
                      {addingToCart ? 'Booking...' : showBookingOptions ? 'Go to cart' : 'Book Service Now'}
                    </button>
                  ) : (
                    <div className="w-full py-3 px-4 bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-2xl text-center">
                      Service not available in your area
                    </div>
                  )}

                  {/* Trust Badges */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <FiShield className="text-[#831843] shrink-0" />
                      <span>Verified & Background-Checked Experts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="text-[#831843] shrink-0" />
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
        <div
          id="mobile-cart-target"
          className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 px-4 py-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 ${
            cartBounced ? 'ring-4 ring-[#720C3E]/20 bg-[#FFF7FA]' : ''
          }`}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {showBookingOptions ? (
            <button
              type="button"
              id="mobile-cart-btn"
              onClick={() => setShowReviewServices(true)}
              className={`flex items-center gap-1.5 text-left text-slate-900 transition-transform duration-200 ${
                cartBounced ? 'scale-110' : ''
              }`}
              aria-label="Review selected services"
            >
              <FiShoppingBag className={`text-sm text-[#831843] transition-transform duration-200 ${cartBounced ? 'scale-125 rotate-[-12deg]' : ''}`} />
              <span className="text-sm font-extrabold">{selectedFrequentlyAdded.length + 1} services</span>
              <FiChevronUp className="text-sm text-[#831843]" />
            </button>
          ) : (
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOTAL PRICE</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  &#8377;{displayPrice}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-slate-400 line-through">
                    &#8377;{originalPrice}
                  </span>
                )}
              </div>
            </div>
          )}

            {canBook ? (
              <button
                id="mobile-cart-btn-action"
                onClick={handleBookNow}
                disabled={addingToCart}
                className={`flex-1 max-w-xs py-3 px-6 text-white font-extrabold text-xs sm:text-sm tracking-wider rounded-xl shadow-md bg-[#831843] hover:bg-[#720C3E] shadow-[#831843]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-center ${
                  cartBounced ? 'scale-105 shadow-xl shadow-[#831843]/40' : ''
                } ${showBookingOptions ? 'normal-case' : 'uppercase'}`}
              >
                {addingToCart ? 'Booking...' : showBookingOptions ? 'Go to cart' : 'BOOK SERVICE NOW'}
              </button>
            ) : (
              <div className="flex-1 max-w-xs py-3 px-6 bg-slate-100 text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl text-center">
                Not available in your area
              </div>
            )}
          </div>
        </div>

        {showReviewServices && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-end justify-center p-0 md:p-6">
            <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-[#FFF9FB] shadow-2xl">
              <div className="sticky top-0 z-10 bg-[#FFF9FB] border-b border-[#E8D9DF] px-4 py-4 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">Review Services</h3>
                <button
                  type="button"
                  onClick={() => setShowReviewServices(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center"
                  aria-label="Close review services"
                >
                  <FiX />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="space-y-3">
                  {reviewServices.map((reviewItem, reviewIndex) => {
                    const itemIsDurationBased = reviewItem.pricingType === 'DURATION' || reviewItem.pricingType === 'HOURLY';
                    const itemDuration = getReviewItemDuration(reviewItem);
                    const itemPrice = getReviewItemPrice(reviewItem);
                    const itemOriginalPrice = reviewItem.isPrimary
                      ? originalPrice
                      : (reviewItem.originalPrice || (reviewItem.discountPrice && reviewItem.basePrice ? reviewItem.basePrice : null));
                    const itemImage = reviewItem.image || reviewItem.icon || reviewItem.iconUrl || reviewItem.imageUrl;

                    return (
                      <div key={reviewItem.id || reviewItem._id || reviewIndex} className="rounded-2xl bg-white border border-slate-100 p-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] flex items-center justify-center overflow-hidden shrink-0">
                            {itemImage ? (
                              <img src={toAssetUrl(itemImage)} alt={reviewItem.title} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-lg font-black text-[#831843]">{reviewItem.title?.charAt(0) || 'S'}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-slate-400">{reviewItem.isPrimary ? 'Main service' : 'Added service'}</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{reviewItem.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {itemOriginalPrice && Number(itemOriginalPrice) > Number(itemPrice) && (
                                <span className="text-xs text-slate-400 line-through">&#8377;{itemOriginalPrice}</span>
                              )}
                              <span className="text-sm font-black text-[#831843]">&#8377;{Math.round(itemPrice)}</span>
                            </div>
                          </div>

                          {reviewItem.isPrimary && itemIsDurationBased ? (
                            <div className="flex items-center gap-1 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] px-1 py-1 shrink-0">
                              <button
                                type="button"
                                onClick={handleDurationDecrement}
                                disabled={selectedDurationMinutes <= minDurationMinutes}
                                className="w-7 h-7 rounded-lg text-[#831843] text-lg leading-none disabled:opacity-30"
                                aria-label="Decrease duration"
                              >
                                −
                              </button>
                              <div className="min-w-[42px] text-center leading-none">
                                <div className="text-sm font-black text-[#831843]">{selectedDurationMinutes}</div>
                                <div className="text-[8px] font-semibold text-slate-400 mt-0.5">Minutes</div>
                              </div>
                              <button
                                type="button"
                                onClick={handleDurationIncrement}
                                disabled={selectedDurationMinutes >= maxDurationMinutes}
                                className="w-7 h-7 rounded-lg bg-[#831843] text-white text-lg leading-none disabled:opacity-30"
                                aria-label="Increase duration"
                              >
                                +
                              </button>
                            </div>
                          ) : itemIsDurationBased ? (
                            <div className="flex items-center gap-1 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] px-1 py-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleDecrementFrequentlyAdded(e, reviewItem)}
                                className="w-7 h-7 rounded-lg text-[#831843] text-lg leading-none hover:bg-white flex items-center justify-center cursor-pointer"
                                aria-label="Decrease duration"
                              >
                                −
                              </button>
                              <div className="min-w-[42px] text-center leading-none">
                                <div className="text-sm font-black text-[#831843]">{itemDuration}</div>
                                <div className="text-[8px] font-semibold text-slate-400 mt-0.5">Minutes</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleIncrementFrequentlyAdded(e, reviewItem)}
                                className="w-7 h-7 rounded-lg bg-[#831843] text-white text-lg leading-none hover:bg-[#720C3E] flex items-center justify-center cursor-pointer"
                                aria-label="Increase duration"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] px-1 py-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleDecrementFrequentlyAdded(e, reviewItem)}
                                className="w-7 h-7 rounded-lg text-[#831843] text-lg leading-none hover:bg-white flex items-center justify-center cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <div className="min-w-[32px] text-center leading-none">
                                <div className="text-sm font-black text-[#831843]">{reviewItem.quantity || 1}</div>
                                <div className="text-[8px] font-semibold text-slate-400 mt-0.5">Qty</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleIncrementFrequentlyAdded(e, reviewItem)}
                                className="w-7 h-7 rounded-lg bg-[#831843] text-white text-lg leading-none hover:bg-[#720C3E] flex items-center justify-center cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-[#FFF9FB] border-t border-[#E8D9DF] p-4">
                <button
                  type="button"
                  onClick={() => addSelectedServicesToCart()}
                  disabled={addingToCart}
                  className="w-full rounded-xl bg-[#831843] hover:bg-[#720C3E] py-3.5 text-sm font-extrabold text-white shadow-md shadow-[#831843]/20 disabled:opacity-50"
                >
                  {addingToCart ? 'Adding...' : 'Go to cart'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Flying Cart Items (Fly to cart animation) */}
        {flyingItems.map((item) => (
          <FlyingCartItem
            key={item.id}
            item={item}
            onComplete={() => {
              setFlyingItems((current) => current.filter((f) => f.id !== item.id));
              setCartBounced(true);
              setTimeout(() => setCartBounced(false), 450);
            }}
          />
        ))}

      </div>
    </div>
  );
};

export default ServiceDetails;

import React, { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import flutterBridge from '../../../../utils/flutterBridge';
import { themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import SearchBar from './components/SearchBar';
import ServiceCategories from './components/ServiceCategories';
import { publicCatalogService } from '../../../../services/catalogService';
import { zoneService } from '../../../../services/zoneService';
import { useCart } from '../../../../context/CartContext';
import { useCity } from '../../../../context/CityContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiMapPin, FiBell } from 'react-icons/fi';

import PromoCarousel from './components/PromoCarousel';
import TopHeroBanner from './components/TopHeroBanner';
import ServicesWeOffer from './components/ServicesWeOffer';
import TrustFooterSection from './components/TrustFooterSection';
import DirectServiceDetailModal from './components/DirectServiceDetailModal';
// Lazy load OTHER heavy components
const NewAndNoteworthy = lazy(() => import('./components/NewAndNoteworthy'));
const MostBookedServices = lazy(() => import('./components/MostBookedServices'));
const CuratedServices = lazy(() => import('./components/CuratedServices'));
const ServiceSectionWithRating = lazy(() => import('./components/ServiceSectionWithRating'));
const Banner = lazy(() => import('./components/Banner'));
const ReferEarnSection = lazy(() => import('./components/ReferEarnSection'));
import CategoryModal from './components/CategoryModal';
import SearchOverlay from './components/SearchOverlay';
import LogoLoader from '../../../../components/common/LogoLoader';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';
import EnableLocationModal from '../../components/common/EnableLocationModal';
import CitySelectorModal from '../../components/common/CitySelectorModal';
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let autoLocationAttemptedInApp = false;



const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const markAreaAvailability = (items, zoneStatus) => (items || []).map(service => {
  let isAvailableInArea = true;

  if (zoneStatus) {
    if (!zoneStatus.inZone) {
      isAvailableInArea = false;
    } else if (Array.isArray(service.zoneIds) && service.zoneIds.length > 0) {
      isAvailableInArea = Boolean(zoneStatus.zoneId) && service.zoneIds.some(zoneId => (
        String(zoneId) === String(zoneStatus.zoneId)
      ));
    }
  }

  return { ...service, isAvailableInArea };
});

const reverseGeocodeCoords = async (lat, lng, availableCities = []) => {
  // Check if we can find a matching city by coordinate distance directly as instant fallback
  let nearestCity = null;
  if (Array.isArray(availableCities) && availableCities.length > 0) {
    let minDist = Infinity;
    availableCities.forEach(c => {
      const cLat = c.location?.coordinates?.[1] || c.lat;
      const cLng = c.location?.coordinates?.[0] || c.lng;
      if (typeof cLat === 'number' && typeof cLng === 'number') {
        const d = Math.hypot(cLat - lat, cLng - lng);
        if (d < minDist && d < 0.8) { // within ~80km
          minDist = d;
          nearestCity = c.name;
        }
      }
    });
  }

  try {
    // 1. Google Maps Geocoder if loaded
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      });

      if (result) {
        const components = result.address_components || [];
        const getComponent = (type) => components.find(c => c.types.includes(type))?.long_name || '';
        const city = getComponent('locality') || getComponent('administrative_area_level_2') || nearestCity || '';
        const subLocality = getComponent('sublocality') || getComponent('sublocality_level_1') || getComponent('neighborhood') || '';
        const readable = [subLocality, city].filter(Boolean).join(', ') || result.formatted_address?.split(',').slice(0, 3).join(', ');

        return {
          address: readable || result.formatted_address,
          city: city
        };
      }
    }

    // 2. OpenStreetMap Nominatim fallback with timeout
    const fetchPromise = fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
      { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
    ).then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      const addressObj = data.address || {};
      const detectedCity =
        addressObj.city ||
        addressObj.town ||
        addressObj.village ||
        addressObj.suburb ||
        addressObj.state_district ||
        nearestCity ||
        '';

      const readableAddress =
        data.display_name?.split(',').slice(0, 3).join(', ') ||
        (detectedCity ? `${detectedCity}, India` : `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);

      return {
        address: readableAddress,
        city: detectedCity
      };
    });

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), 2500)
    );

    const geo = await Promise.race([fetchPromise, timeoutPromise]);
    if (geo) return geo;
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }

  return {
    address: nearestCity ? `${nearestCity}, India` : `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
    city: nearestCity || ''
  };
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [address, setAddress] = useState(() => {
    const saved = localStorage.getItem('currentAddress');
    // If saved address contains Devanagari/Hindi characters, ignore it so fresh English is fetched
    if (saved && !/[\u0900-\u097F]/.test(saved)) {
      return saved;
    }
    if (saved && /[\u0900-\u097F]/.test(saved)) {
      localStorage.removeItem('currentAddress');
      localStorage.removeItem('currentCity');
    }
    return 'Select Location';
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [detectedCityName, setDetectedCityName] = useState(() => {
    const saved = localStorage.getItem('currentCity');
    return (saved && !/[\u0900-\u097F]/.test(saved)) ? saved : null;
  });
  const [userCoords, setUserCoords] = useState(() => {
    const lat = parseFloat(localStorage.getItem('userLat'));
    const lng = parseFloat(localStorage.getItem('userLng'));
    return (!Number.isNaN(lat) && !Number.isNaN(lng)) ? { lat, lng } : null;
  });
  // null = not yet checked, { inZone, zoneName, nearestZone } once resolved.
  // Browsing is never blocked by this - it only drives the informational
  // "coming soon in this location" banner.
  const [zoneStatus, setZoneStatus] = useState(null);
  const [zoneResolved, setZoneResolved] = useState(false);

  const { cartCount, addToCart } = useCart();
  const { currentCity, cities, selectCity, loading: cityLoading } = useCity();
  const [isLocating, setIsLocating] = useState(false);
  const [isEnableLocationModalOpen, setIsEnableLocationModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [locationErrorType, setLocationErrorType] = useState(null);
  const autoLocationAttemptedRef = useRef(false);

  // Initialize Google Maps API for geocoding
  useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: 'en'
  });

  // Clean up legacy storage keys on mount
  useEffect(() => {
    ['userAddress', 'detectedCity', 'user_formatted_address', 'user_city'].forEach(key => localStorage.removeItem(key));
    const curAddr = localStorage.getItem('currentAddress');
    if (curAddr && /[\u0900-\u097F]/.test(curAddr)) {
      localStorage.removeItem('currentAddress');
      localStorage.removeItem('currentCity');
    }
  }, []);

  const fetchUserLocation = async (isManualRetry = false) => {
    setIsLocating(true);
    try {
      const pos = await flutterBridge.getCurrentLocation();
      const lat = pos?.coords?.latitude || pos?.latitude;
      const lng = pos?.coords?.longitude || pos?.longitude;

      if (!lat || !lng) {
        throw new Error('Coordinates missing');
      }

      const geo = await reverseGeocodeCoords(lat, lng, cities);
      const newAddress = geo?.address || `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
      const newCity = geo?.city || '';

      setAddress(newAddress);
      setUserCoords({ lat, lng });
      localStorage.setItem('currentAddress', newAddress);
      localStorage.setItem('userLat', String(lat));
      localStorage.setItem('userLng', String(lng));
      localStorage.setItem('location_granted', 'true');

      if (newCity) {
        setDetectedCityName(newCity);
        localStorage.setItem('currentCity', newCity);

        if (cities && cities.length > 0) {
          const matched = cities.find(c =>
            c.name.toLowerCase() === newCity.toLowerCase() ||
            c.name.toLowerCase().includes(newCity.toLowerCase()) ||
            newCity.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matched) {
            selectCity(matched);
          }
        }
      }

      setIsEnableLocationModalOpen(false);
      window.dispatchEvent(new CustomEvent('locationUpdate', { detail: { lat, lng, address: newAddress } }));
      toast.success(`Location detected: ${newCity || newAddress}`, { id: 'auto-location-toast' });
    } catch (err) {
      console.warn('Auto location detection failed/unavailable:', err);
      const isPermissionDenied = err?.code === 1;
      setLocationErrorType(isPermissionDenied ? 'denied' : 'unavailable');
      setIsEnableLocationModalOpen(true);
    } finally {
      setIsLocating(false);
    }
  };

  // Automatically fetch GPS location if skipped from login or if not yet set
  useEffect(() => {
    const isExplicitAutoFetch = Boolean(location.state?.autoFetchLocation);
    const hasSavedAddress = localStorage.getItem('currentAddress') && localStorage.getItem('currentAddress') !== 'Select Location';
    const isPermissionGranted = localStorage.getItem('location_granted') === 'true';

    const shouldAutoFetch = isExplicitAutoFetch || !hasSavedAddress || !isPermissionGranted;

    if (autoLocationAttemptedRef.current || autoLocationAttemptedInApp || !shouldAutoFetch) return;
    autoLocationAttemptedRef.current = true;
    autoLocationAttemptedInApp = true;

    fetchUserLocation();
  }, [location.state?.autoFetchLocation, cities, selectCity]);

  const handleCitySelectedFromModal = (city) => {
    if (city) {
      selectCity(city);
      const formatted = `${city.name}${city.state ? `, ${city.state}` : ''}`;
      setAddress(formatted);
      setDetectedCityName(city.name);
      localStorage.setItem('currentAddress', formatted);
      localStorage.setItem('currentCity', city.name);
      localStorage.setItem('location_granted', 'true');
      toast.success(`Location set to ${city.name}`);
      setIsCityModalOpen(false);
      setIsEnableLocationModalOpen(false);
    }
  };

  // Sync detectedCityName with Address on mount/update if not already set
  useEffect(() => {
    if (address && address !== 'Select Location' && cities && cities.length > 0) {
      const foundCity = cities.find(c =>
        address.toLowerCase().includes(c.name.toLowerCase())
      );
      if (foundCity) {
        if (detectedCityName !== foundCity.name) {
          setDetectedCityName(foundCity.name);
          localStorage.setItem('currentCity', foundCity.name);
        }
      } else {
        // Address is present but doesn't contain any supported city name
        // Try to parse ANY city from the address string (e.g. "Bhopal")
        const parts = address.split(',').map(p => p.trim());
        // Usually city is 2nd or 3rd to last in Google address strings
        const cityCandidate = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);

        if (detectedCityName !== cityCandidate) {
          setDetectedCityName(cityCandidate);
          localStorage.setItem('currentCity', cityCandidate);
        }
      }
    }
  }, [address, cities, detectedCityName]);

  // Validate city whenever detected name or cities list changes
  useEffect(() => {
    if (!detectedCityName || !cities || cities.length === 0) return;

    const matchedCity = cities.find(c =>
      c.name.toLowerCase() === detectedCityName.toLowerCase() ||
      c.name.toLowerCase().includes(detectedCityName.toLowerCase()) ||
      detectedCityName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (matchedCity) {
      const matchedId = matchedCity._id || matchedCity.id;
      const currentId = currentCity?._id || currentCity?.id;

      if (!cityLoading && currentId && matchedId !== currentId) {
        selectCity(matchedCity);
        toast.success(`Location updated to ${matchedCity.name}`);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
    // No matching City record is no longer treated as "unserviceable" - the
    // catalog still renders for every location. Zone-based booking
    // eligibility is enforced server-side at checkout instead (see
    // serviceabilityService.checkBookingServiceability on the backend).
  }, [detectedCityName, cities, currentCity, cityLoading]);

  // Resolve the actual serviceable zone for the "coming soon" banner. This
  // is informational only - it never hides or blocks the catalog, it just
  // lets the user know before they try to book.
  useEffect(() => {
    if (!userCoords) {
      setZoneStatus(null);
      setZoneResolved(true);
      return undefined;
    }

    let cancelled = false;
    setZoneResolved(false);

    zoneService.resolve(userCoords.lat, userCoords.lng)
      .then(res => {
        if (cancelled) return;
        if (res?.success) setZoneStatus(res.zoneStatus);
        setZoneResolved(true);
      })
      .catch(() => {
        if (!cancelled) setZoneResolved(true);
      });

    return () => { cancelled = true; };
  }, [userCoords]);


  const handleAddressSave = (savedHouseNumber, locationObj) => {
    let fullAddr = locationObj?.address || savedHouseNumber || '';
    if (savedHouseNumber && fullAddr && !fullAddr.toLowerCase().includes(savedHouseNumber.toLowerCase())) {
      fullAddr = `${savedHouseNumber}, ${fullAddr}`;
    }

    if (fullAddr) {
      setAddress(fullAddr);
      localStorage.setItem('currentAddress', fullAddr);
      // A manually selected address is already a valid location choice;
      // don't force GPS detection again when the user returns to Home.
      localStorage.setItem('location_granted', 'true');

      if (typeof locationObj?.lat === 'number' && typeof locationObj?.lng === 'number') {
        setUserCoords({ lat: locationObj.lat, lng: locationObj.lng });
        localStorage.setItem('userLat', String(locationObj.lat));
        localStorage.setItem('userLng', String(locationObj.lng));
      }

      // Try to parse city from location object (Google Places)
      const components = locationObj?.components || locationObj?.address_components;
      let city = '';
      if (components) {
        const getComponent = (type) => components.find(c => c.types.includes(type))?.long_name || '';
        city = getComponent('locality') || getComponent('administrative_area_level_2');
      }

      // Fallback city parsing from address string if components failed
      if (!city && fullAddr) {
        const parts = fullAddr.split(',').map(p => p.trim());
        city = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);
      }

      if (city) {
        setDetectedCityName(city);
        localStorage.setItem('currentCity', city);

        // Immediate update of selected city if supported
        if (cities && cities.length > 0) {
          const matchedCity = cities.find(c =>
            c.name.toLowerCase() === city.toLowerCase() ||
            c.name.toLowerCase().includes(city.toLowerCase()) ||
            city.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCity) {
            selectCity(matchedCity);
          } else {
            selectCity(null);
          }
        }

        toast.success(`Location set to ${city}`);
      } else {
        toast.success(`Location updated`);
      }
    }
    setHouseNumber(savedHouseNumber || '');
    setIsAddressModalOpen(false);
  };


  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [banners, setBanners] = useState([]);
  const [selectedDirectService, setSelectedDirectService] = useState(null);
  const [isDirectServiceModalOpen, setIsDirectServiceModalOpen] = useState(false);
  const [homeContent, setHomeContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle scroll separately (only when needed)
  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state?.scrollToTop, location.pathname]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Fetch categories, services and home content on mount (and when city changes)
  useEffect(() => {
    // Wait for the stable city and one-time zone lookup before requesting catalog data.
    if (cityLoading || (userCoords && !zoneResolved)) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const cityId = currentCity?._id || currentCity?.id;

        const response = await publicCatalogService.getHomeData(cityId, zoneStatus?.zoneId);

        if (response.success) {
          if (response.categories) {
            const mappedCategories = response.categories.map(cat => ({
              id: cat.id,
              title: cat.title,
              slug: cat.slug,
              icon: toAssetUrl(cat.icon),
              hasSaleBadge: cat.hasSaleBadge,
              badge: cat.badge
            }));
            setCategories(mappedCategories);
          }

          if (response.services) {
            setServices(markAreaAvailability(response.services, zoneStatus));
          }

          if (response.banners && response.banners.length > 0) {
            setBanners(response.banners);
          } else if (response.homeContent?.banners && response.homeContent.banners.length > 0) {
            setBanners(response.homeContent.banners);
          }

          if (response.homeContent) {
            setHomeContent(response.homeContent);
          }
        }

        // Fallback: If services not returned in getHomeData, fetch directly
        if (!response.services || response.services.length === 0) {
          try {
            const svcRes = await publicCatalogService.getServices({ cityId });
            if (svcRes.success && svcRes.services) {
              setServices(markAreaAvailability(svcRes.services, zoneStatus));
            }
          } catch (e) {
            console.error("Direct services fetch fallback error:", e);
          }
        }

        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentCity, cityLoading, userCoords, zoneResolved, zoneStatus?.zoneId, zoneStatus?.inZone]);
  // Open category modal from navigation state (e.g. from Cart 'Add Services')
  useEffect(() => {
    if (!loading && categories.length > 0 && (location.state?.openCategoryId || location.state?.openCategoryName)) {
      const targetId = location.state.openCategoryId;
      const targetName = location.state.openCategoryName;

      const cat = categories.find(c =>
        (targetId && (c.id === targetId || c._id === targetId)) ||
        (targetName && c.title === targetName)
      );

      if (cat) {
        handleCategoryClick(cat);
        // Clear state to prevent reopening on subsequent renders/refreshes
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [loading, categories, location.state]);

  const handleSearch = (query) => {
    // Navigate to search results page
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handlePromoClick = (promo) => {
    if (promo.targetCategoryId) {
      const cat = categories.find(c => (c.id === promo.targetCategoryId || c._id === promo.targetCategoryId));
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
    }
    if (promo.route && !promo.slug) {
      if (promo.scrollToSection) {
        navigate(promo.route, {
          state: { scrollToSection: promo.scrollToSection }
        });
      } else {
        navigate(promo.route);
      }
    }
  };

  const handleServiceClick = (service) => {
    if (!service) return;
    if (service.targetCategoryId) {
      const cat = categories.find(c => (c.id === service.targetCategoryId || c._id === service.targetCategoryId));
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
    }
    // Fallback if no targetCategoryId but has slug/title, we no longer navigate to slug
  };

  const handleAddClick = async (service) => {
    try {
      if (service.isAvailableInArea === false) {
        toast.error('This service is not available in your selected area.');
        return;
      }

      if (service.targetCategoryId) {
        const cat = categories.find(c => c.id === service.targetCategoryId);
        if (cat) {
          handleCategoryClick(cat);
          return;
        }
      }

      if (service.serviceId && service.categoryId) {
        const latitude = parseFloat(localStorage.getItem('userLat'));
        const longitude = parseFloat(localStorage.getItem('userLng'));
        const cartItemData = {
          serviceId: service.serviceId,
          categoryId: service.categoryId,
          title: service.title,
          description: service.subtitle || service.description || '',
          icon: service.image || '',
          category: service.category || 'Service',
          price: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          originalPrice: service.originalPrice ? parseInt(service.originalPrice.toString().replace(/,/g, '')) : null,
          unitPrice: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          serviceCount: 1,
          rating: service.rating || "4.8",
          reviews: service.reviews || "10k+",
          vendorId: service.vendorId || null,
          sectionId: service.sectionId || null, // VITAL: Added for plan benefits
          ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {})
        };

        const response = await addToCart(cartItemData);
        if (response.success) {
          toast.success(`${service.title} added to cart!`);
          navigate('/user/cart');
        } else {
          toast.error(response.message || 'Failed to add to cart');
        }
      } else {
        if (service.targetCategoryId) {
          const cat = categories.find(c => (c.id === service.targetCategoryId || c._id === service.targetCategoryId));
          if (cat) {
            handleCategoryClick(cat);
          } else {
            toast.error('Unable to add this service to cart.');
          }
        } else {
          toast.error('Unable to add this service to cart.');
        }
      }
    } catch (error) {
      toast.error('Failed to add to cart. Please try again.');
    }
  };

  const handleReferClick = () => {
    navigate('/user/rewards');
  };

  const handleLocationClick = () => {
    setIsAddressModalOpen(true);
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen relative bg-white">
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

      <motion.div
        className="relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={itemVariants}
          className="sticky top-0 z-50 transition-all duration-300 shadow-sm"
        >
          <Header
            location={isLocating ? 'Detecting location...' : address}
            onLocationClick={handleLocationClick}
            onSearchClick={() => setIsSearchOpen(true)}
          />
        </motion.div>

        {/* Informational only - never blocks browsing, just flags that
            booking may not go through from this exact location yet. */}
        {zoneStatus && !zoneStatus.inZone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="px-5 py-4 flex flex-col items-center text-center"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2"
              style={{ background: 'linear-gradient(135deg, #FFF7FA 0%, #FCEBF3 100%)' }}
            >
              <FiMapPin className="w-5 h-5 text-[#720C3E]" />
            </div>

            <h2 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight">
              <span className="text-slate-300">WE ARE</span>{' '}
              <span className="text-[#720C3E]">COMING SOON</span>
            </h2>

            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-xs">
              We're currently live in select areas and expanding quickly. Get notified when we are near you!
            </p>

            <button
              onClick={() => toast.success("We'll notify you as soon as we launch in your area!")}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
            >
              <FiBell className="w-3.5 h-3.5" />
              Notify me!
            </button>

            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="mt-2 text-xs sm:text-sm font-bold text-[#720C3E] underline underline-offset-2"
            >
              Change location
            </button>
          </motion.div>
        )}

        <main className="pt-2 sm:pt-3 space-y-4 sm:space-y-6 max-w-screen-xl mx-auto w-full">
          <>
            {/* Top Hero Banner Carousel */}
              {banners.filter(b => b.bannerType === 'top' || b.bannerType === 'hero' || (!b.bannerType && b.bannerType !== 'footer' && b.bannerType !== 'bottom')).length > 0 && (
                <motion.section variants={itemVariants} className="relative z-0">
                  <TopHeroBanner
                    banners={banners.filter(b => b.bannerType === 'top' || b.bannerType === 'hero' || (!b.bannerType && b.bannerType !== 'footer' && b.bannerType !== 'bottom'))}
                    categories={categories}
                    onCategoryClick={handleCategoryClick}
                    onServiceClick={(svc) => {
                      const serviceId = svc?._id || svc?.id || svc?.slug || svc;
                      const matched = services.find(s => s._id === serviceId || s.id === serviceId || s.slug === serviceId);
                      if (serviceId) navigate(`/user/service/${serviceId}`, { state: { service: matched || svc } });
                    }}
                    onBannerClick={(b) => {
                      if (!b) return;

                      // 1. Direct Service Redirection
                      if (b.targetType === 'service' || b.targetServiceId || b.targetService) {
                        const svcId = b.targetServiceId?._id || b.targetServiceId?.id || b.targetServiceId || b.targetService?._id || b.targetService?.id;
                        let matchedSvc = services.find(s => s._id === svcId || s.id === svcId);
                        
                        // Fallback: If service wasn't explicitly selected in dropdown, match by banner title
                        if (!matchedSvc && b.title) {
                          matchedSvc = services.find(s => 
                            s.title?.toLowerCase().trim() === b.title?.toLowerCase().trim() ||
                            b.title?.toLowerCase().includes(s.title?.toLowerCase()) ||
                            s.title?.toLowerCase().includes(b.title?.toLowerCase())
                          );
                        }

                        const finalId = matchedSvc?._id || matchedSvc?.id || svcId;
                        if (finalId) {
                          navigate(`/user/service/${finalId}`, { state: { service: matchedSvc } });
                          return;
                        }
                      }

                      // 2. Category Redirection
                      if (b.targetType === 'category' || b.targetCategoryId || b.targetCategory) {
                        const catId = b.targetCategoryId?._id || b.targetCategoryId?.id || b.targetCategoryId || b.targetCategory?._id;
                        const cat = categories.find(c => c.id === catId || c._id === catId);
                        if (cat) {
                          handleCategoryClick(cat);
                          return;
                        }
                      }

                      // 3. Custom URL Redirection
                      if (b.targetType === 'url' && b.targetUrl) {
                        if (b.targetUrl.startsWith('http')) {
                          window.open(b.targetUrl, '_blank');
                        } else {
                          navigate(b.targetUrl);
                        }
                        return;
                      }

                      // 4. Smart fallback if title matches a service directly
                      if (b.title) {
                        const matched = services.find(s => 
                          s.title?.toLowerCase().trim() === b.title?.toLowerCase().trim() ||
                          b.title?.toLowerCase().includes(s.title?.toLowerCase()) ||
                          s.title?.toLowerCase().includes(b.title?.toLowerCase())
                        );
                        if (matched) {
                          navigate(`/user/service/${matched._id || matched.id}`, { state: { service: matched } });
                        }
                      }
                    }}
                  />
                </motion.section>
              )}

              {/* Hero Section - Promo Carousel */}
              {homeContent?.isPromosVisible !== false && homeContent?.promos && homeContent.promos.length > 0 && (
                <motion.section variants={itemVariants} className="relative z-0">
                  <PromoCarousel
                    promos={(homeContent?.promos || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(promo => ({
                      id: promo.id || promo._id,
                      title: promo.title || '',
                      subtitle: promo.subtitle || promo.description || '',
                      buttonText: promo.buttonText || 'Book now',
                      className: promo.gradientClass || 'from-[#00A6A6] to-[#008a8a]',
                      image: toAssetUrl(promo.imageUrl),
                      targetCategoryId: promo.targetCategoryId,
                      slug: promo.slug,
                      scrollToSection: promo.scrollToSection,
                      route: '/'
                    }))}
                    onPromoClick={handlePromoClick}
                  />
                </motion.section>
              )}

              {/* Direct Services We Offer Grid */}
              {services && services.length > 0 && (
                <motion.section variants={itemVariants}>
                  <ServicesWeOffer
                    services={services}
                    onServiceClick={(svc) => {
                      const serviceId = svc._id || svc.id || svc.slug;
                      navigate(`/user/service/${serviceId}`, { state: { service: svc } });
                    }}
                  />
                </motion.section>
              )}

              {/* Categories Section */}
              {homeContent?.isCategoriesVisible !== false && (
                <motion.section variants={itemVariants} className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent pointer-events-none -z-10" />
                  <ServiceCategories
                    categories={categories}
                    onCategoryClick={handleCategoryClick}
                    onSeeAllClick={() => { }}
                  />
                </motion.section>
              )}


              {/* Curated Services */}
              {homeContent?.isCuratedVisible !== false && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <CuratedServices
                      services={(homeContent?.curated || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        gif: toAssetUrl(item.gifUrl),
                        slug: item.slug,
                        targetCategoryId: item.targetCategoryId
                      }))}
                      onServiceClick={handleServiceClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* New & Noteworthy */}
              {homeContent?.isNoteworthyVisible !== false && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <NewAndNoteworthy
                      services={(homeContent?.noteworthy || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        image: toAssetUrl(item.imageUrl),
                        slug: item.slug,
                        targetCategoryId: item.targetCategoryId
                      }))}
                      onServiceClick={handleServiceClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Most Booked */}
              {homeContent?.isBookedVisible !== false && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <MostBookedServices
                      services={(homeContent?.booked || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        rating: item.rating,
                        reviews: item.reviews,
                        price: item.price,
                        originalPrice: item.originalPrice,
                        discount: item.discount,
                        image: toAssetUrl(item.imageUrl),
                        targetCategoryId: item.targetCategoryId,
                        slug: item.slug
                      }))}
                      onServiceClick={handleServiceClick}
                      onAddClick={handleAddClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Dynamic Sections */}
              {homeContent?.isCategorySectionsVisible !== false && (homeContent?.categorySections || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((section, sIdx) => (
                <motion.div key={section._id || sIdx} variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <ServiceSectionWithRating
                      title={section.title}
                      subtitle={section.subtitle}
                      services={section.cards?.map((card, cIdx) => {
                        const processedImage = toAssetUrl(card.imageUrl);
                        return {
                          id: card._id || cIdx,
                          title: card.title,
                          rating: card.rating || "4.8",
                          reviews: card.reviews || "10k+",
                          price: card.price,
                          originalPrice: card.originalPrice,
                          discount: card.discount,
                          image: processedImage,
                          targetCategoryId: card.targetCategoryId,
                          slug: card.slug
                        };
                      }) || []}
                      onSeeAllClick={() => {
                        if (section.seeAllTargetCategoryId) {
                          const cat = categories.find(c => (c.id === section.seeAllTargetCategoryId || c._id === section.seeAllTargetCategoryId));
                          if (cat) handleCategoryClick(cat);
                        }
                      }}
                      onServiceClick={(service) => handleServiceClick(service)}
                      onAddClick={handleAddClick}
                    />
                  </Suspense>
                </motion.div>
              ))}

              {/* Footer / Bottom Banners (Only shown if configured as Footer Banner) */}
              {banners.filter(b => b.bannerType === 'footer' || b.bannerType === 'bottom').length > 0 && (
                <motion.section variants={itemVariants} className="px-4 mb-6">
                  {banners.filter(b => b.bannerType === 'footer' || b.bannerType === 'bottom').map(fb => (
                    <div
                      key={fb.id || fb._id}
                      onClick={() => {
                        if (fb.targetType === 'category' || fb.targetCategoryId) {
                          const catId = fb.targetCategoryId?._id || fb.targetCategoryId;
                          const cat = categories.find(c => c.id === catId || c._id === catId);
                          if (cat) handleCategoryClick(cat);
                        } else if (fb.targetType === 'service' || fb.targetServiceId) {
                          const svcId = fb.targetServiceId?._id || fb.targetServiceId?.id || fb.targetServiceId;
                          if (svcId) navigate(`/user/service/${svcId}`);
                        } else if (fb.targetType === 'url' && fb.targetUrl) {
                          if (fb.targetUrl.startsWith('http')) {
                            window.open(fb.targetUrl, '_blank');
                          } else {
                            navigate(fb.targetUrl);
                          }
                        }
                      }}
                      className="cursor-pointer overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all mb-4 h-[130px] sm:h-[160px] md:h-[190px] lg:h-[220px] w-full bg-gray-100"
                    >
                      <img
                        src={toAssetUrl(fb.imageUrl)}
                        alt={fb.title || 'Special Promotion'}
                        className="w-full h-full object-cover object-center rounded-2xl"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </motion.section>
              )}
          <TrustFooterSection
            config={homeContent ? homeContent.trustSection : undefined}
            services={services}
          />
          </>
        </main>
      </motion.div>

      {/* Bottom Navigation */}
      {!isAddressModalOpen && <BottomNav />}

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        location={address}
        cartCount={cartCount}
        currentCity={currentCity}
        zoneStatus={zoneStatus}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        categories={categories}
        onCategoryClick={handleCategoryClick}
      />

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleAddressSave}
      />

      {/* Direct Service Detail Modal */}
      <DirectServiceDetailModal
        isOpen={isDirectServiceModalOpen}
        onClose={() => {
          setIsDirectServiceModalOpen(false);
          setSelectedDirectService(null);
        }}
        service={selectedDirectService}
      />

      {/* Enable Location Permission/Device Location Modal */}
      <EnableLocationModal
        isOpen={isEnableLocationModalOpen}
        onClose={() => setIsEnableLocationModalOpen(false)}
        onRetry={() => fetchUserLocation(true)}
        onSelectManually={() => {
          setIsEnableLocationModalOpen(false);
          setIsCityModalOpen(true);
        }}
        isLoading={isLocating}
        errorType={locationErrorType}
      />

      {/* City Selector Modal for manual selection fallback */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        onCitySelected={handleCitySelectedFromModal}
      />
    </div>
  );
};

export default Home;

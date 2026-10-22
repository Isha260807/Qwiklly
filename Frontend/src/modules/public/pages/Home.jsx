import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiArrowRight, 
  FiCheckCircle, 
  FiShield, 
  FiClock, 
  FiStar, 
  FiZap, 
  FiCalendar, 
  FiMapPin, 
  FiUserCheck, 
  FiHelpCircle,
  FiPhoneCall,
  FiTrendingUp,
  FiAward
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ServiceCard from '../components/ServiceCard';
import { publicCatalogService } from '../../../services/catalogService';

const Home = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [backendCategories, setBackendCategories] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const handleBookingCTA = () => {
    navigate('/user/login');
  };

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const res = await publicCatalogService.getCategories();
        if (res?.success && Array.isArray(res.categories)) {
          setBackendCategories(res.categories);
        }
      } catch (e) {
        console.log('Using curated public catalog showcase');
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  // Curated showcase matching the screenshot and Qwiklly's official service offerings
  const curatedServices = [
    {
      id: 'hourly-cleaning',
      title: 'Hourly bookings',
      description: 'Flexible domestic assistance on demand',
      tag: 'Popular',
      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
      price: '199',
      duration: 'Per Hour',
      category: 'cleaning'
    },
    {
      id: 'bathroom-cleaning',
      title: 'Bathroom Cleaning',
      description: 'Tiles, descaling, sanitaryware & fixtures',
      tag: 'Top Rated',
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
      price: '349',
      duration: '45 mins',
      category: 'cleaning'
    },
    {
      id: 'kitchen-cleaning',
      title: 'Kitchen Cleaning',
      description: 'Degreasing, sink, gas stove & backsplash',
      tag: 'Popular',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
      price: '399',
      duration: '60 mins',
      category: 'cleaning'
    },
    {
      id: 'fridge-cleaning',
      title: 'Fridge Cleaning',
      description: 'Interior defogging, shelf scrub & odor care',
      tag: 'Special Care',
      imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&auto=format&fit=crop&q=80',
      price: '249',
      duration: '30 mins',
      category: 'kitchen'
    },
    {
      id: 'kitchen-prep',
      title: 'Kitchen Prep',
      description: 'Vegetable chopping & counter sanitation',
      tag: 'Daily Help',
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop&q=80',
      price: '179',
      duration: '45 mins',
      category: 'kitchen'
    },
    {
      id: 'dusting-wiping',
      title: 'Dusting & Wiping',
      description: 'Furniture, glass frames, ledges & artifacts',
      tag: 'Essential',
      imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
      price: '199',
      duration: '45 mins',
      category: 'cleaning'
    },
    {
      id: 'sweeping-mopping',
      title: 'Sweeping & Mopping',
      description: 'Disinfectant floor scrub & stain removal',
      tag: 'Daily Help',
      imageUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600&auto=format&fit=crop&q=80',
      price: '149',
      duration: '30 mins',
      category: 'cleaning'
    },
    {
      id: 'fan-fixtures',
      title: 'Fan & Fixtures',
      description: 'Ceiling fan blades, switchboards & lights',
      tag: 'Quick Fix',
      imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&auto=format&fit=crop&q=80',
      price: '129',
      duration: '20 mins',
      category: 'home'
    },
    {
      id: 'sofa-cleaning',
      title: 'Sofa & Upholstery',
      description: 'Deep foam shampooing & dust mite extraction',
      tag: 'Deep Clean',
      imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80',
      price: '499',
      duration: '90 mins',
      category: 'cleaning'
    },
    {
      id: 'deep-cleaning',
      title: 'Full Home Deep Clean',
      description: 'Intense 360° sanitization for entire apartment',
      tag: 'Comprehensive',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
      price: '1,499',
      duration: '3-4 hrs',
      category: 'cleaning'
    }
  ];

  const filteredServices = activeCategory === 'all' 
    ? curatedServices 
    : curatedServices.filter(s => s.category === activeCategory);

  const trustCards = [
    {
      icon: <FiShield className="w-6 h-6 text-[#720C3E]" />,
      title: 'Verified Professionals',
      description: 'Background checked, trained and highly rated experts for all your domestic requirements.'
    },
    {
      icon: <FiZap className="w-6 h-6 text-[#720C3E]" />,
      title: 'Easy Booking',
      description: 'Book instant assistance in 45 mins or schedule seamless time slots with zero hassle.'
    },
    {
      icon: <FiCheckCircle className="w-6 h-6 text-[#720C3E]" />,
      title: 'Transparent Experience',
      description: 'Upfront pricing, no hidden costs, clear duration estimates, and live service status tracking.'
    },
    {
      icon: <FiPhoneCall className="w-6 h-6 text-[#720C3E]" />,
      title: 'Dedicated Support',
      description: 'Prompt resolution team and customer support ready to assist you every step of the journey.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Choose Your Service',
      description: 'Pick from deep cleaning, hourly assistance, kitchen prep or customized household maintenance.'
    },
    {
      number: '02',
      title: 'Select Your Preferred Time',
      description: 'Choose instant booking for prompt arrival or pick your convenient date and time slot.'
    },
    {
      number: '03',
      title: 'Get Connected',
      description: 'Qwiklly connects your booking with an approved professional nearest to your doorstep.'
    },
    {
      number: '04',
      title: 'Get Your Service',
      description: 'Your verified expert arrives on time, completes the job with excellence, and ensures a clean home.'
    }
  ];

  const whyUsFeatures = [
    {
      title: 'Professional Service',
      desc: 'Standardized SOPs, premium supplies, and skilled workmanship on every single visit.'
    },
    {
      title: 'Convenient Booking',
      desc: 'Seamless user experience with instant digital checkout and schedule flexibility.'
    },
    {
      title: 'Reliable Professionals',
      desc: 'Punctual, vetted experts with rigorous identity and skill verifications.'
    },
    {
      title: 'Secure Payments',
      desc: 'Protected Razorpay online transactions with 100% satisfaction assurance.'
    },
    {
      title: 'Transparent Experience',
      desc: 'Clear itemized billing, real-time OTP tracking, and complete billing integrity.'
    },
    {
      title: 'Customer Support',
      desc: 'Fast, caring support for booking updates, questions, and immediate query resolution.'
    }
  ];

  const testimonials = [
    {
      name: 'Pooja Sharma',
      location: 'Indore',
      rating: 5,
      comment: 'The bathroom cleaning and dusting service was top notch! The partner arrived right on time and did a thorough job. Qwiklly is my go-to service now.',
      service: 'Deep Cleaning'
    },
    {
      name: 'Rohit Verma',
      location: 'Indore',
      rating: 5,
      comment: 'Hourly booking is an absolute lifesaver for busy professionals. Booked a slot for kitchen prep and mopping, very clean and hassle-free!',
      service: 'Hourly Assistance'
    },
    {
      name: 'Ananya Mehta',
      location: 'Indore',
      rating: 5,
      comment: 'Super smooth booking. Love that I can pay securely and track everything without constant calls. Truly a modern home services platform!',
      service: 'Full Home Clean'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF7FA] text-[#24151D] font-sans selection:bg-[#720C3E] selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* =========================================================================
            1. HERO SECTION
        ========================================================================= */}
        <section className="relative overflow-hidden pt-8 pb-16 sm:pb-24 lg:pt-14 lg:pb-32">
          {/* Ambient background gradients */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[550px] h-[550px] bg-gradient-to-br from-[#E8A0B8]/40 via-[#720C3E]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 w-[450px] h-[450px] bg-[#9A2459]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Hero Left Content */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
                {/* Live Pill Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8D9DF] shadow-xs"
                >
                  <span className="flex h-2 w-2 rounded-full bg-[#720C3E] animate-pulse" />
                  <span className="text-xs font-bold text-[#720C3E] uppercase tracking-wider">
                    On-Demand Home Services Platform
                  </span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#24151D] leading-[1.15] font-heading"
                >
                  Professional Services.{' '}
                  <span className="bg-gradient-to-r from-[#720C3E] via-[#9A2459] to-[#720C3E] bg-clip-text text-transparent">
                    Right When You Need Them.
                  </span>
                </motion.h1>

                {/* Supporting Paragraph */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-base sm:text-lg lg:text-xl text-[#6F5A64] max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed"
                >
                  Book trusted professionals for cleaning and everyday home services with Qwiklly. Transparent pricing, verified experts, and spotless results delivered right to your doorstep.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2"
                >
                  <Link
                    to="/user/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] shadow-xl shadow-[#720C3E]/25 hover:shadow-2xl hover:shadow-[#720C3E]/35 active:scale-95 transition-all duration-300 group"
                  >
                    <HiSparkles className="w-5 h-5 text-[#E8A0B8] group-hover:rotate-12 transition-transform" />
                    <span>Book a Service</span>
                    <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <a
                    href="#services"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-[#720C3E] bg-white hover:bg-[#FFF7FA] border-2 border-[#E8D9DF] hover:border-[#E8A0B8] shadow-xs active:scale-95 transition-all duration-300"
                  >
                    Explore Services
                  </a>
                </motion.div>

                {/* Social Proof Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="pt-6 border-t border-[#E8D9DF]/60 flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-10 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#E8D9DF]">
                      <FiStar className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#24151D]">4.9 / 5.0</p>
                      <p className="text-xs text-[#6F5A64]">Customer Rating</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#E8D9DF]">
                      <FiUserCheck className="w-5 h-5 text-[#720C3E]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#24151D]">100% Vetted</p>
                      <p className="text-xs text-[#6F5A64]">Verified Experts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#E8D9DF]">
                      <FiClock className="w-5 h-5 text-[#2E8B57]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#24151D]">~45 Mins</p>
                      <p className="text-xs text-[#6F5A64]">Prompt Arrival</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Hero Right — Premium Service Image */}
              <div className="lg:col-span-5 relative flex justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="relative w-full max-w-md"
                >
                  {/* Glowing backdrop */}
                  <div className="absolute -inset-2 bg-gradient-to-br from-[#720C3E]/30 via-[#E8A0B8]/20 to-transparent rounded-[2.5rem] blur-2xl" />

                  {/* Image container */}
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-[#E8D9DF]">
                    <img
                      src="/hero-cleaning.jpg"
                      alt="Qwiklly professional home cleaning expert"
                      className="w-full h-[480px] sm:h-[540px] object-cover object-top"
                    />

                    {/* Gradient overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#4D082A]/80 via-[#720C3E]/30 to-transparent" />

                    {/* Floating badge — top left */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                      className="absolute top-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-[#E8D9DF]"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#2E8B57] animate-pulse" />
                      <span className="text-xs font-bold text-[#24151D]">Professionals Online</span>
                    </motion.div>

                    {/* Floating stats — top right */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7, duration: 0.5 }}
                      className="absolute top-4 right-4 bg-[#720C3E]/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg text-center"
                    >
                      <p className="text-white font-black text-sm">4.9 ★</p>
                      <p className="text-[#E8A0B8] text-[10px] font-semibold">Top Rated</p>
                    </motion.div>

                    {/* Bottom CTA strip */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-sm">Ready to Book?</p>
                        <p className="text-[#E8A0B8] text-xs font-medium">~45 min arrival • ₹149 onwards</p>
                      </div>
                      <Link
                        to="/user/login"
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#720C3E] font-bold text-xs shadow-md hover:bg-[#FFF7FA] active:scale-95 transition-all"
                      >
                        Book Now
                        <FiArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================================
            2. TRUST FEATURE CARDS
        ========================================================================= */}
        <section className="py-12 sm:py-16 bg-white border-y border-[#E8D9DF]/70 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trustCards.map((card, idx) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="bg-[#FFF7FA] rounded-2xl p-6 border border-[#E8D9DF] hover:border-[#E8A0B8] hover:shadow-md transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#E8D9DF] mb-4 group-hover:scale-110 transition-transform">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-bold text-[#24151D] mb-1.5 font-heading">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium">
                    {card.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. SERVICES SECTION (MATCHING SCREENSHOT AESTHETICS)
        ========================================================================= */}
        <section id="services" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-white border border-[#E8D9DF] shadow-2xs">
              Explore Offerings
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#24151D] mt-3 font-heading tracking-tight">
              Curated Professional Services for Your Home
            </h2>
            <p className="text-sm sm:text-base text-[#6F5A64] mt-2 font-medium">
              Select your required service category below. Every booking is backed by vetted professionals and guaranteed satisfaction.
            </p>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {[
                { id: 'all', label: 'All Services' },
                { id: 'cleaning', label: 'Cleaning & Deep Scrub' },
                { id: 'kitchen', label: 'Kitchen & Meal Prep' },
                { id: 'home', label: 'Fixtures & Domestic' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-[#720C3E] text-white shadow-md shadow-[#720C3E]/20'
                      : 'bg-white text-[#6F5A64] hover:text-[#720C3E] border border-[#E8D9DF]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Service Cards Grid (Exact modern screenshot styling) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                title={service.title}
                description={service.description}
                tag={service.tag}
                imageUrl={service.imageUrl}
                price={service.price}
                duration={service.duration}
                category={service.category}
                onBook={handleBookingCTA}
              />
            ))}
          </div>

          {/* Bottom Banner inside Services */}
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#720C3E] to-[#9A2459] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-[#720C3E]/20">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold font-heading">Need a customized cleaning plan?</h3>
              <p className="text-xs sm:text-sm text-[#E8A0B8] max-w-xl">
                Choose hourly bookings to have a trusted professional assist you with multiple chores simultaneously.
              </p>
            </div>
            <Link
              to="/user/login"
              className="px-6 py-3.5 rounded-xl bg-white text-[#720C3E] font-bold text-sm hover:bg-[#FFF7FA] shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-2"
            >
              <span>Book Hourly Assistance</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* =========================================================================
            4. HOW IT WORKS SECTION
        ========================================================================= */}
        <section id="how-it-works" className="py-16 sm:py-24 bg-white border-y border-[#E8D9DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-[#FFF7FA] border border-[#E8D9DF]">
                Simple & Seamless
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#24151D] mt-3 font-heading tracking-tight">
                How Qwiklly Works
              </h2>
              <p className="text-sm sm:text-base text-[#6F5A64] mt-2 font-medium">
                Four easy steps to a clean, stress-free home.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="relative bg-[#FFF7FA] rounded-3xl p-7 border border-[#E8D9DF] hover:border-[#E8A0B8] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-2xl font-black text-[#720C3E] font-heading bg-white px-3 py-1 rounded-xl border border-[#E8D9DF] shadow-xs">
                        {step.number}
                      </span>
                      <span className="w-3 h-3 rounded-full bg-[#E8A0B8]/60" />
                    </div>

                    <h3 className="text-lg font-bold text-[#24151D] mb-2 font-heading">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium">
                      {step.description}
                    </p>
                  </div>

                  <div className="pt-6 mt-4 border-t border-[#E8D9DF]/60 text-xs font-semibold text-[#720C3E] flex items-center gap-1">
                    <span>Step {step.number} of 04</span>
                    <FiArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. WHY QWIKLLY SECTION
        ========================================================================= */}
        <section id="why-us" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-white border border-[#E8D9DF]">
              The Qwiklly Advantage
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#24151D] mt-3 font-heading tracking-tight">
              Why Customers Trust Qwiklly
            </h2>
            <p className="text-sm sm:text-base text-[#6F5A64] mt-2 font-medium">
              We focus on standard quality, safety, and transparent execution in every service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyUsFeatures.map((feat, idx) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-white rounded-3xl p-7 border border-[#E8D9DF] hover:border-[#E8A0B8] shadow-xs hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFF7FA] border border-[#E8A0B8]/60 flex items-center justify-center text-[#720C3E] mb-4 font-bold text-sm">
                  <FiCheckCircle className="w-5 h-5 text-[#720C3E]" />
                </div>
                <h3 className="text-lg font-bold text-[#24151D] mb-2 font-heading">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            6. CUSTOMER TESTIMONIALS
        ========================================================================= */}
        <section className="py-16 sm:py-24 bg-white border-y border-[#E8D9DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-[#FFF7FA] border border-[#E8D9DF]">
                Loved By Households
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#24151D] mt-3 font-heading tracking-tight">
                What Our Customers Say
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, idx) => (
                <div 
                  key={t.name}
                  className="bg-[#FFF7FA] rounded-3xl p-7 border border-[#E8D9DF] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1 text-amber-500 mb-3">
                      {[...Array(t.rating)].map((_, i) => (
                        <FiStar key={i} className="w-4 h-4 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-sm text-[#24151D] italic leading-relaxed font-medium">
                      "{t.comment}"
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#E8D9DF]/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#24151D]">{t.name}</h4>
                      <p className="text-[11px] text-[#6F5A64]">{t.location} • {t.service}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-white border border-[#E8D9DF] font-semibold text-[#2E8B57]">
                      Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. FINAL PRE-FOOTER CTA
        ========================================================================= */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-[#720C3E] via-[#9A2459] to-[#720C3E] p-8 sm:p-14 text-white text-center overflow-hidden shadow-2xl shadow-[#720C3E]/30">
            {/* Ambient lighting inside CTA */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#E8A0B8]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#E8A0B8] px-3.5 py-1 rounded-full bg-white/10 border border-white/20">
                Book in 60 Seconds
              </span>
              <h2 className="text-2xl sm:text-4xl font-black font-heading leading-tight">
                Ready for a Clean, Sparkling & Stress-Free Home?
              </h2>
              <p className="text-sm sm:text-base text-gray-200 font-medium">
                Experience hassle-free booking and verified expert service at transparent rates.
              </p>
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/user/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#720C3E] font-bold text-base hover:bg-[#FFF7FA] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <HiSparkles className="w-4 h-4 text-[#720C3E]" />
                  <span>Book a Service Now</span>
                  <FiArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/user/login"
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold text-base transition-all active:scale-95"
                >
                  Customer Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;

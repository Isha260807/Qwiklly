import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMenu, 
  FiX, 
  FiArrowRight, 
  FiUser, 
  FiShield, 
  FiClock, 
  FiPhoneCall, 
  FiCheckCircle
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { brand } from '../../../theme/colors';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/#services' },
    { label: 'How It Works', path: '/#how-it-works' },
    { label: 'Why Us', path: '/#why-us' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNavClick = (path) => {
    setMobileMenuOpen(false);
    if (path.startsWith('/#')) {
      const sectionId = path.replace('/#', '');
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-xl shadow-md border-b border-[#E8D9DF]/60 py-3' 
          : 'bg-white/70 backdrop-blur-md py-4 sm:py-5 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#720C3E] to-[#9A2459] flex items-center justify-center shadow-md shadow-[#720C3E]/20 group-hover:scale-105 transition-transform duration-300 p-0.5">
              <img 
                src="/cleaning-expert-logo.png" 
                alt="Qwiklly Logo" 
                className="w-full h-full object-cover rounded-[14px]"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8A0B8] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#720C3E]"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-[#24151D] flex items-center gap-1 font-heading">
              Qwiklly
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#FFF7FA] text-[#720C3E] border border-[#E8A0B8] font-bold">
                PRO
              </span>
            </span>
            <span className="text-[10px] text-[#6F5A64] font-medium tracking-wider uppercase -mt-0.5">
              Expert Home Services
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.path.startsWith('/#')) {
                    handleNavClick(item.path);
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'text-[#720C3E] bg-[#FFF7FA] font-bold shadow-xs' 
                    : 'text-[#24151D]/80 hover:text-[#720C3E] hover:bg-[#FFF7FA]/70'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop Action Buttons (Login + Book a Service) */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/user/login"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-bold text-[#720C3E] hover:bg-[#FFF7FA] border border-[#E8D9DF] transition-all duration-200 shadow-xs hover:border-[#E8A0B8] active:scale-95"
          >
            <FiUser className="w-4 h-4 text-[#720C3E]" />
            <span>Login</span>
          </Link>

          <Link
            to="/user/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs lg:text-sm font-bold text-white bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] shadow-md shadow-[#720C3E]/25 hover:shadow-lg hover:shadow-[#720C3E]/30 transition-all duration-200 active:scale-95 group"
          >
            <HiSparkles className="w-4 h-4 text-[#E8A0B8] group-hover:rotate-12 transition-transform" />
            <span>Book a Service</span>
            <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to="/user/login"
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#720C3E] to-[#9A2459] shadow-xs"
          >
            Book Now
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-xl bg-[#FFF7FA] text-[#720C3E] border border-[#E8D9DF] flex items-center justify-center focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="sm:hidden bg-white/95 backdrop-blur-xl border-b border-[#E8D9DF] shadow-xl overflow-hidden"
          >
            <div className="px-4 pt-3 pb-6 space-y-2">
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.path)}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-[#24151D] hover:bg-[#FFF7FA] hover:text-[#720C3E] flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <FiArrowRight className="w-3.5 h-3.5 text-[#E8A0B8]" />
                </button>
              ))}

              <div className="pt-3 border-t border-[#E8D9DF] flex flex-col gap-2.5">
                <Link
                  to="/user/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-[#720C3E] bg-[#FFF7FA] border border-[#E8D9DF]"
                >
                  <FiUser className="w-4 h-4" />
                  <span>Customer Login</span>
                </Link>

                <Link
                  to="/user/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#720C3E] to-[#9A2459] shadow-md shadow-[#720C3E]/20"
                >
                  <HiSparkles className="w-4 h-4 text-[#E8A0B8]" />
                  <span>Book a Service</span>
                </Link>

                <Link
                  to="/vendor/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs text-[#6F5A64] hover:text-[#720C3E] font-medium pt-1"
                >
                  Are you a service partner? <span className="font-bold underline text-[#720C3E]">Vendor Portal</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;

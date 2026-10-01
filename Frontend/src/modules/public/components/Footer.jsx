import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiArrowRight, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiShield, 
  FiCheckCircle, 
  FiHeart
} from 'react-icons/fi';
import { FaWhatsapp, FaInstagram, FaLinkedin, FaFacebook } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-[#24151D] text-white pt-16 pb-12 border-t border-[#4D082A] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#720C3E]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#9A2459]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-white/10">
          
          {/* Brand Column (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#720C3E] to-[#9A2459] flex items-center justify-center p-0.5 shadow-md shadow-[#720C3E]/30">
                <img 
                  src="/cleaning-expert-logo.png" 
                  alt="Qwiklly Logo" 
                  className="w-full h-full object-cover rounded-[14px]"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white font-heading">
                  Qwiklly
                </span>
                <span className="block text-[10px] text-[#E8A0B8] uppercase tracking-widest font-semibold">
                  Professional Home Services
                </span>
              </div>
            </Link>

            <p className="text-sm text-gray-300 leading-relaxed max-w-sm">
              Your trusted on-demand platform for professional home cleaning, deep sanitization, hourly assistance, and everyday domestic maintenance.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#720C3E] text-white flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-[#E8A0B8]"
                aria-label="Instagram"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#720C3E] text-white flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-[#E8A0B8]"
                aria-label="Facebook"
              >
                <FaFacebook className="w-4 h-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#720C3E] text-white flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-[#E8A0B8]"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-4 h-4" />
              </a>
              <a 
                href="https://wa.me" 
                target="_blank" 
                rel="noreferrer" 
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#720C3E] text-white flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-[#E8A0B8]"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E8A0B8]" />
              Company
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link to="/" className="hover:text-[#E8A0B8] transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#E8A0B8] transition-colors">About Qwiklly</Link>
              </li>
              <li>
                <Link to="/#services" className="hover:text-[#E8A0B8] transition-colors">Our Services</Link>
              </li>
              <li>
                <Link to="/#why-us" className="hover:text-[#E8A0B8] transition-colors">Why Choose Us</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#E8A0B8] transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Support & Portals */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E8A0B8]" />
              Support & Apps
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link to="/contact" className="hover:text-[#E8A0B8] transition-colors">Help & Support</Link>
              </li>
              <li>
                <Link to="/contact#faqs" className="hover:text-[#E8A0B8] transition-colors">Frequently Asked Questions</Link>
              </li>
              <li>
                <Link to="/user/login" className="hover:text-[#E8A0B8] transition-colors">User Login</Link>
              </li>
              <li>
                <Link to="/vendor/login" className="hover:text-[#E8A0B8] transition-colors">Partner / Vendor Login</Link>
              </li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E8A0B8]" />
              Legal Policies
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link to="/privacy-policy" className="hover:text-[#E8A0B8] transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="hover:text-[#E8A0B8] transition-colors">Terms & Conditions</Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-[#E8A0B8] transition-colors">Refund & Cancellation</Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/5 text-gray-300 mt-2 border border-white/10">
                  <FiShield className="w-3 h-3 text-emerald-400" />
                  100% Secure Platform
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© 2026 Qwiklly. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/refund-policy" className="hover:text-white transition-colors">Refunds</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

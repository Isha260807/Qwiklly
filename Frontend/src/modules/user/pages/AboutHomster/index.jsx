import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiShield, FiClock, FiAward, FiGlobe, FiSmile, FiSmartphone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Logo from '../../../../components/common/Logo';
import { themeColors } from '../../../../theme';

const AboutQwiklly = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    }
  };

  const brandGradient = 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)';
  const brandTextGradient = {
    background: brandGradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const features = [
    {
      icon: FiUsers,
      title: 'Expert Providers',
      description: 'Verified professionals for all your needs'
    },
    {
      icon: FiShield,
      title: 'Safe & Secure',
      description: 'Your safety is our top priority'
    },
    {
      icon: FiClock,
      title: 'On-Time Service',
      description: 'Punctual delivery at your convenience'
    },
    {
      icon: FiAward,
      title: 'Quality Assured',
      description: 'Service with 100% satisfaction guarantee'
    }
  ];

  const stats = [
    { number: '10K+', label: 'Happy Customers' },
    { number: '500+', label: 'Service Partners' },
    { number: '4.9', label: 'App Rating' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-transparent pb-12"
    >
      {/* Theme Gradient Header */}
      <header 
        className="sticky top-0 z-40 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
            title="Go Back"
          >
            <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">About Qwiklly</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="relative w-20 h-20 mx-auto mb-3">
            {/* Spinning Border */}
            <div
              className="absolute inset-[-3px] rounded-full opacity-80"
              style={{
                background: 'conic-gradient(from 0deg, #720C3E, #9A2459, #E8A0B8, #720C3E)',
                animation: 'spin 4s linear infinite',
              }}
            />
            {/* White Background */}
            <div className="absolute inset-0 bg-white rounded-full shadow-sm flex items-center justify-center p-1">
              <Logo className="w-14 h-14 object-contain" />
            </div>
          </div>

          <h2 className="text-xl font-black text-gray-900 mb-1">
            Welcome to <span style={brandTextGradient}>Qwiklly</span>
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            Your trusted partner for on-demand premium home & personal care services.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="flex justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100 divide-x divide-gray-100">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex-1 text-center px-1">
              <div className="text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-[#720C3E] to-[#9A2459]">
                {stat.number}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Mission Statement */}
        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-br from-[#720C3E]/5 to-[#9A2459]/5 rounded-2xl p-4 border border-[#720C3E]/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
              <FiGlobe className="w-20 h-20" />
            </div>
            <h3 className="text-xs font-black text-[#720C3E] uppercase tracking-wider mb-1.5">Our Mission</h3>
            <p className="text-xs text-gray-600 leading-relaxed relative z-10 font-normal">
              Qwiklly is dedicated to revolutionizing how you experience home services. We connect you with verified professionals to deliver safe, reliable, and high-quality services right at your doorstep.
            </p>
          </div>
        </motion.div>

        {/* Why Choose Us Grid */}
        <motion.div variants={itemVariants}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Why Choose Qwiklly?</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 hover:border-[#720C3E]/20 transition-all group"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${themeColors.primary || '#720C3E'}15`, color: themeColors.primary || '#720C3E' }}
                >
                  <feature.icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-gray-900 mb-0.5">{feature.title}</h4>
                <p className="text-[10px] text-gray-500 leading-snug">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div variants={itemVariants}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">How We Work</h3>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {[
              { title: 'Book Details', desc: 'Select service & schedule time', icon: FiSmartphone },
              { title: 'Get Matched', desc: 'We assign a top-rated pro', icon: FiUsers },
              { title: 'Relax', desc: 'Enjoy high-quality service at doorstep', icon: FiSmile },
            ].map((step, i) => (
              <div key={i} className="flex items-center p-3 gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-black text-xs shadow-xs"
                  style={{ backgroundColor: themeColors.primary || '#720C3E' }}
                >
                  {i + 1}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{step.title}</h4>
                  <p className="text-[10px] text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div variants={itemVariants} className="text-center pt-2 pb-4">
          <p className="text-[10px] text-gray-400 mb-0.5">Designed & Developed by</p>
          <span className="text-xs font-bold tracking-wide" style={brandTextGradient}>Qwiklly Team</span>
          <p className="text-[9px] text-gray-400 mt-2">v7.6.27 • Made with ❤️ in India</p>
        </motion.div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default AboutQwiklly;

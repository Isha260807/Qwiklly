import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiUsers, FiShield, FiClock, FiAward, FiHeart, FiGlobe, FiSmile, FiSmartphone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Logo from '../../../../components/common/Logo';

const AboutQwiklly = () => {
  const navigate = useNavigate();

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  // Gradient Definition for re-use in inline styles
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
      className="min-h-screen bg-[#FFF7FA] pb-10"
    >
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-xs sticky top-0 z-30 border-b border-[#E8D9DF]/60">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[#FCEBF3] rounded-full transition-colors active:scale-95"
          >
            <FiArrowLeft className="w-5 h-5 text-[#720C3E]" />
          </button>
          <span className="text-xl font-bold" style={brandTextGradient}>About Qwiklly</span>
        </div>
      </header>

      <main className="px-5 py-6 space-y-8">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="relative w-28 h-28 mx-auto mb-6">
            {/* Spinning Border */}
            <div
              className="absolute inset-[-3px] rounded-full opacity-70"
              style={{
                background: 'conic-gradient(from 0deg, #720C3E, #9A2459, #E8A0B8, #720C3E)',
                animation: 'spin 4s linear infinite',
              }}
            />
            {/* White Background */}
            <div className="absolute inset-0 bg-white rounded-full shadow-lg flex items-center justify-center">
              <Logo className="w-16 h-16 object-contain" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-[#24151D] mb-2">
            Welcome to <span style={brandTextGradient}>Qwiklly</span>
          </h1>
          <p className="text-[#6F5A64] max-w-xs mx-auto leading-relaxed text-sm">
            Your trusted partner for on-demand professional home services.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="flex justify-between bg-white rounded-2xl p-6 shadow-xs border border-[#E8D9DF]/60 divide-x divide-[#E8D9DF]/60">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex-1 text-center px-2">
              <div className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#720C3E] to-[#9A2459]">
                {stat.number}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#6F5A64] font-semibold mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Mission Statement */}
        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-br from-[#720C3E]/5 to-[#9A2459]/5 rounded-2xl p-6 border border-[#720C3E]/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <FiGlobe className="w-24 h-24" />
            </div>
            <h3 className="text-lg font-bold text-[#24151D] mb-3">Our Mission</h3>
            <p className="text-sm text-[#6F5A64] leading-relaxed relative z-10">
              Qwiklly is dedicated to revolutionizing how you experience home services. We connect you with top-tier verified professionals to deliver safe, reliable, and high-quality services right at your doorstep. We believe in making life simpler, one service at a time.
            </p>
          </div>
        </motion.div>

        {/* Why Choose Us Grid */}
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-[#24151D] mb-4 px-1">Why Choose Qwiklly?</h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 shadow-xs border border-[#E8D9DF]/60 hover:shadow-md transition-shadow group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 bg-[#FCEBF3]">
                  <feature.icon className="w-5 h-5 text-[#720C3E]" />
                </div>
                <h4 className="text-sm font-bold text-[#24151D] mb-1">{feature.title}</h4>
                <p className="text-xs text-[#6F5A64] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-[#24151D] mb-4 px-1">How We Work</h3>
          <div className="bg-white rounded-2xl p-1 shadow-xs border border-[#E8D9DF]/60">
            {[
              { title: 'Book Details', desc: 'Select service & schedule time', icon: FiSmartphone },
              { title: 'Get Matched', desc: 'We assign a top-rated pro', icon: FiUsers },
              { title: 'Relax', desc: 'Enjoy high-quality service', icon: FiSmile },
            ].map((step, i) => (
              <div key={i} className="flex items-center p-4 border-b last:border-0 border-[#E8D9DF]/40 relative">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4 shadow-xs text-white font-bold text-lg relative overflow-hidden bg-gradient-to-br from-[#720C3E] to-[#9A2459]">
                  <span className="relative z-10">{i + 1}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#24151D]">{step.title}</h4>
                  <p className="text-xs text-[#6F5A64]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div variants={itemVariants} className="text-center pt-4 border-t border-[#E8D9DF]/60">
          <p className="text-xs text-[#6F5A64] mb-1">Designed & Developed by</p>
          <span className="text-sm font-bold tracking-wide" style={brandTextGradient}>Qwiklly Team</span>
          <p className="text-[10px] text-[#6F5A64]/60 mt-4">v1.0.0 • Made with ❤️ in India</p>
        </motion.div>
      </main>
    </motion.div>
  );
};

export default AboutQwiklly;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiUsers, FiShield, FiClock, FiAward, FiHeart, FiGlobe, FiSmile, FiSmartphone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Logo from '../../../../components/common/Logo';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

const AboutQwiklly = () => {
  const navigate = useNavigate();

  // Container animation variants
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
      description: 'Verified professionals for all needs'
    },
    {
      icon: FiShield,
      title: 'Safe & Secure',
      description: 'Your safety is our top priority'
    },
    {
      icon: FiClock,
      title: 'On-Time Service',
      description: 'Punctual delivery at your doorstep'
    },
    {
      icon: FiAward,
      title: 'Quality Assured',
      description: '100% satisfaction guarantee'
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
      className="min-h-screen bg-[#FFF7FA] pb-24"
    >
      <Header title="About Qwiklly" />

      <main className="max-w-md mx-auto px-4 pt-3 pb-6 space-y-3.5">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center pt-1">
          <div className="relative w-18 h-18 mx-auto mb-2" style={{ width: '72px', height: '72px' }}>
            {/* Spinning Border */}
            <div
              className="absolute inset-[-2px] rounded-full opacity-70"
              style={{
                background: 'conic-gradient(from 0deg, #720C3E, #9A2459, #E8A0B8, #720C3E)',
                animation: 'spin 4s linear infinite',
              }}
            />
            {/* White Background */}
            <div className="absolute inset-0 bg-white rounded-full shadow-sm flex items-center justify-center">
              <Logo className="w-11 h-11 object-contain" />
            </div>
          </div>

          <h1 className="text-xl font-extrabold text-[#24151D] mb-1">
            Welcome to <span style={brandTextGradient}>Qwiklly</span>
          </h1>
          <p className="text-[#6F5A64] max-w-xs mx-auto text-xs leading-normal">
            Your trusted partner for on-demand professional home services.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="flex justify-between bg-white rounded-xl p-3 shadow-xs divide-x divide-gray-100">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex-1 text-center px-1">
              <div className="text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-[#720C3E] to-[#9A2459]">
                {stat.number}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#6F5A64] font-semibold mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Mission Statement */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-xl p-3.5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5">
              <FiGlobe className="w-16 h-16 text-[#720C3E]" />
            </div>
            <h3 className="text-xs font-bold text-[#24151D] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#720C3E]" />
              Our Mission
            </h3>
            <p className="text-xs text-[#6F5A64] leading-relaxed relative z-10">
              Qwiklly is dedicated to revolutionizing home services. We connect you with top-tier verified professionals to deliver safe, reliable, and high-quality services right at your doorstep.
            </p>
          </div>
        </motion.div>

        {/* Why Choose Us Grid */}
        <motion.div variants={itemVariants}>
          <h3 className="text-xs font-bold text-[#24151D] mb-2 px-1">Why Choose Qwiklly?</h3>
          <div className="grid grid-cols-2 gap-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-2.5 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 bg-[#FCEBF3]">
                  <feature.icon className="w-4 h-4 text-[#720C3E]" />
                </div>
                <h4 className="text-xs font-bold text-[#24151D] mb-0.5">{feature.title}</h4>
                <p className="text-[10px] text-[#6F5A64] leading-tight">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div variants={itemVariants}>
          <h3 className="text-xs font-bold text-[#24151D] mb-2 px-1">How We Work</h3>
          <div className="bg-white rounded-xl p-1 shadow-xs divide-y divide-gray-100">
            {[
              { title: 'Book Details', desc: 'Select service & schedule time', icon: FiSmartphone },
              { title: 'Get Matched', desc: 'We assign a top-rated pro', icon: FiUsers },
              { title: 'Relax', desc: 'Enjoy high-quality service', icon: FiSmile },
            ].map((step, i) => (
              <div key={i} className="flex items-center p-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-3 text-white font-bold text-xs bg-gradient-to-br from-[#720C3E] to-[#9A2459]">
                  {i + 1}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#24151D] leading-none mb-1">{step.title}</h4>
                  <p className="text-[10px] text-[#6F5A64] leading-none">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div variants={itemVariants} className="text-center pt-2">
          <p className="text-[10px] text-[#6F5A64]">Designed & Developed with ❤️ by <span className="font-bold text-[#720C3E]">Qwiklly Team</span></p>
          <p className="text-[9px] text-[#6F5A64]/60 mt-0.5">v1.0.0 • India</p>
        </motion.div>
      </main>
    </motion.div>
  );
};

export default AboutQwiklly;

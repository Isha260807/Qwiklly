import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiShield, 
  FiHeart, 
  FiAward, 
  FiCheckCircle, 
  FiUsers, 
  FiArrowRight,
  FiTarget,
  FiEye,
  FiClock
} from 'react-icons/fi';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const About = () => {
  const values = [
    {
      title: 'Trust',
      desc: 'Rigorous background vetting and transparency in every booking and transaction.',
      icon: <FiShield className="w-6 h-6 text-[#720C3E]" />
    },
    {
      title: 'Convenience',
      desc: 'Seamless digital platform enabling doorstep services in just a few taps.',
      icon: <FiClock className="w-6 h-6 text-[#720C3E]" />
    },
    {
      title: 'Quality',
      desc: 'High standards of workmanship, thorough execution, and customer delight.',
      icon: <FiAward className="w-6 h-6 text-[#720C3E]" />
    },
    {
      title: 'Transparency',
      desc: 'Clear upfront pricing with no hidden charges, honest time estimates, and real-time tracking.',
      icon: <FiCheckCircle className="w-6 h-6 text-[#720C3E]" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF7FA] text-[#24151D] font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* Hero Header */}
        <section className="py-12 sm:py-16 bg-white border-b border-[#E8D9DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-[#FFF7FA] border border-[#E8D9DF]">
              About Qwiklly
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#24151D] mt-4 font-heading tracking-tight">
              Empowering Homes with Trusted, Professional Care
            </h1>
            <p className="text-base sm:text-lg text-[#6F5A64] mt-3 font-medium leading-relaxed">
              Qwiklly is modernizing how households discover, book, and experience on-demand cleaning, domestic maintenance, and hourly household assistance.
            </p>
          </div>
        </section>

        {/* Mission & Vision Bento */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E8D9DF] shadow-sm hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7FA] border border-[#E8A0B8] flex items-center justify-center text-[#720C3E] mb-6">
                <FiTarget className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase text-[#720C3E] tracking-wider">Purpose Driven</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#24151D] mt-1 mb-3 font-heading">
                Our Mission
              </h2>
              <p className="text-sm sm:text-base text-[#6F5A64] leading-relaxed font-medium">
                To make professional home services simple, reliable, and accessible for every household while empowering skilled service professionals with fair income opportunities and digital reach.
              </p>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E8D9DF] shadow-sm hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7FA] border border-[#E8A0B8] flex items-center justify-center text-[#720C3E] mb-6">
                <FiEye className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase text-[#720C3E] tracking-wider">Future Outlook</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#24151D] mt-1 mb-3 font-heading">
                Our Vision
              </h2>
              <p className="text-sm sm:text-base text-[#6F5A64] leading-relaxed font-medium">
                To build the most trusted on-demand service ecosystem connecting customers with verified domestic experts seamlessly, elevating living standards through technology and dependable service delivery.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-16 bg-white border-y border-[#E8D9DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-[#FFF7FA] border border-[#E8D9DF]">
                Our Principles
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#24151D] mt-3 font-heading tracking-tight">
                What We Believe
              </h2>
              <p className="text-sm sm:text-base text-[#6F5A64] mt-2 font-medium">
                These core pillars guide every customer interaction and every service we fulfill.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((val) => (
                <div 
                  key={val.title}
                  className="bg-[#FFF7FA] rounded-2xl p-6 border border-[#E8D9DF] hover:border-[#E8A0B8] transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E8D9DF] flex items-center justify-center mb-4">
                    {val.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#24151D] mb-1.5 font-heading">
                    {val.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium">
                    {val.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quality Commitment CTA */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#720C3E] via-[#9A2459] to-[#720C3E] rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl shadow-[#720C3E]/20 space-y-4">
            <h3 className="text-2xl sm:text-3xl font-bold font-heading">Ready to experience the Qwiklly standard?</h3>
            <p className="text-sm sm:text-base text-[#E8A0B8] max-w-xl mx-auto">
              Book your next cleaning or household service in less than a minute.
            </p>
            <div className="pt-2">
              <Link
                to="/user/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#720C3E] font-bold text-sm hover:bg-[#FFF7FA] transition-all active:scale-95 shadow-md"
              >
                <span>Book a Service</span>
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;

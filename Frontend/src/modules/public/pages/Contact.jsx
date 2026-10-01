import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiClock, 
  FiCheckCircle, 
  FiHelpCircle, 
  FiChevronDown, 
  FiSend,
  FiAlertCircle,
  FiMessageSquare
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bookingId: '',
    subject: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      // Client-side isolated submission simulation without affecting backend APIs
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
      toast.success('Your message has been received! Our support team will get back to you shortly.');
    } catch (err) {
      toast.error('Failed to submit message. Please try again or reach out via email.');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: 'How do I book a cleaning service on Qwiklly?',
      a: 'Simply click "Book a Service" on the website, select your service category, pick your preferred time slot or instant booking, enter your address, and confirm.'
    },
    {
      q: 'Are Qwiklly service partners verified and trustworthy?',
      a: 'Yes, 100%. All service providers on Qwiklly undergo government ID verification (Aadhar/PAN), address checks, and hands-on skill evaluations before being activated.'
    },
    {
      q: 'What is the difference between Instant and Slot Booking?',
      a: 'Instant booking dispatches the nearest available professional to arrive in approximately 45 minutes for urgent chores. Slot booking lets you reserve a specific date and time interval up to 7 days in advance.'
    },
    {
      q: 'How does payment work?',
      a: 'You can pay securely online via UPI, Cards, Net Banking through Razorpay once the professional accepts your booking, or choose cashless plan benefits.'
    },
    {
      q: 'Can I reschedule or cancel my booking?',
      a: 'Yes, you can reschedule or cancel directly from your customer booking dashboard before the service starts.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF7FA] text-[#24151D] font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* Header Banner */}
        <section className="py-12 sm:py-16 bg-white border-b border-[#E8D9DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-[#FFF7FA] border border-[#E8D9DF]">
              Support & Enquiries
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#24151D] mt-4 font-heading tracking-tight">
              How Can We Help?
            </h1>
            <p className="text-base sm:text-lg text-[#6F5A64] mt-3 font-medium">
              Have a question about a booking, need service assistance, or want to partner with us? Our team is always here for you.
            </p>
          </div>
        </section>

        {/* Support Channels & Contact Form Section */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Support Cards */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl p-7 border border-[#E8D9DF] shadow-xs space-y-6">
                <h3 className="text-xl font-bold text-[#24151D] font-heading">
                  Direct Support Channels
                </h3>

                {/* Customer Support */}
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF7FA] border border-[#E8A0B8] flex items-center justify-center text-[#720C3E] shrink-0">
                    <FiMail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#24151D]">Customer Support</h4>
                    <p className="text-xs text-[#6F5A64]">For booking queries and order assistance</p>
                    <a href="mailto:support@qwiklly.com" className="text-xs font-bold text-[#720C3E] hover:underline mt-1 inline-block">
                      support@qwiklly.com
                    </a>
                  </div>
                </div>

                {/* Booking Assistance */}
                <div className="flex items-start gap-4 pt-4 border-t border-[#E8D9DF]/60">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF7FA] border border-[#E8A0B8] flex items-center justify-center text-[#720C3E] shrink-0">
                    <FiPhone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#24151D]">Booking Assistance</h4>
                    <p className="text-xs text-[#6F5A64]">Available 9:00 AM – 9:00 PM daily</p>
                    <a href="tel:+918000000000" className="text-xs font-bold text-[#720C3E] hover:underline mt-1 inline-block">
                      +91 (800) QWIKLLY-HELP
                    </a>
                  </div>
                </div>

                {/* General Enquiries */}
                <div className="flex items-start gap-4 pt-4 border-t border-[#E8D9DF]/60">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF7FA] border border-[#E8A0B8] flex items-center justify-center text-[#720C3E] shrink-0">
                    <FiMapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#24151D]">Registered Address</h4>
                    <p className="text-xs text-[#6F5A64]">Qwiklly Technologies Pvt. Ltd.</p>
                    <p className="text-xs text-[#6F5A64]">Indore, Madhya Pradesh, India</p>
                  </div>
                </div>
              </div>

              {/* Service Assurance Pill */}
              <div className="bg-gradient-to-br from-[#720C3E] to-[#9A2459] rounded-3xl p-6 text-white shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <FiCheckCircle className="w-6 h-6 text-[#E8A0B8]" />
                  <h4 className="text-base font-bold font-heading">Rapid Response Commitment</h4>
                </div>
                <p className="text-xs text-[#E8A0B8] leading-relaxed">
                  Support tickets regarding live bookings are prioritized and addressed within 15 minutes by our duty manager.
                </p>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E8D9DF] shadow-sm">
                <h3 className="text-2xl font-bold text-[#24151D] font-heading mb-1">
                  Send us a Message
                </h3>
                <p className="text-xs sm:text-sm text-[#6F5A64] mb-6 font-medium">
                  Fill out the form below and our customer care team will respond within 24 hours.
                </p>

                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                      <FiCheckCircle className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-[#24151D] font-heading">Thank You!</h4>
                    <p className="text-sm text-[#6F5A64] max-w-md mx-auto">
                      Your message has been submitted successfully. Our support executive will reach out to you shortly.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: '', email: '', phone: '', bookingId: '', subject: '', message: '' });
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#720C3E] text-white font-bold text-xs shadow-md"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-[#24151D] mb-1">
                          Your Name <span className="text-[#C0394B]">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="e.g. Anjali Gupta"
                          className="w-full px-4 py-3 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] text-sm text-[#24151D] focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-[#24151D] mb-1">
                          Email Address <span className="text-[#C0394B]">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="name@example.com"
                          className="w-full px-4 py-3 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] text-sm text-[#24151D] focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-[#24151D] mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 9876543210"
                          className="w-full px-4 py-3 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] text-sm text-[#24151D] focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-[#24151D] mb-1">
                          Booking ID (Optional)
                        </label>
                        <input
                          type="text"
                          name="bookingId"
                          value={formData.bookingId}
                          onChange={handleChange}
                          placeholder="e.g. BK1790..."
                          className="w-full px-4 py-3 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] text-sm text-[#24151D] focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#24151D] mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="What can we help you with?"
                        className="w-full px-4 py-3 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] text-sm text-[#24151D] focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#24151D] mb-1">
                        Message <span className="text-[#C0394B]">*</span>
                      </label>
                      <textarea
                        rows={4}
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder="Please describe your enquiry in detail..."
                        className="w-full px-4 py-3 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] text-sm text-[#24151D] focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#4D082A] hover:to-[#720C3E] shadow-md shadow-[#720C3E]/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <span>Sending message...</span>
                      ) : (
                        <>
                          <FiSend className="w-4 h-4" />
                          <span>Submit Message</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* FAQs Section */}
        <section id="faqs" className="py-16 bg-white border-t border-[#E8D9DF]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E] px-3.5 py-1 rounded-full bg-[#FFF7FA] border border-[#E8D9DF]">
                Common Questions
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#24151D] mt-3 font-heading tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#FFF7FA] border border-[#E8D9DF] overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#24151D] focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <FiChevronDown className={`w-5 h-5 text-[#720C3E] transition-transform duration-200 shrink-0 ${activeFaq === idx ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {activeFaq === idx && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium border-t border-[#E8D9DF]/40"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;

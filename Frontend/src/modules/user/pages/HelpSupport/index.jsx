import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiSearch, FiMessageCircle, FiMail, FiPhone,
  FiChevronRight, FiHelpCircle, FiBook, FiAlertCircle,
  FiCheckCircle, FiClock, FiSend
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

const HelpSupport = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [supportInfo, setSupportInfo] = useState({
    email: 'support@homestr.com',
    phone: '',
    whatsapp: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/public/config');
        if (response.data?.success && response.data?.settings) {
          const { supportEmail, supportPhone, supportWhatsapp } = response.data.settings;
          setSupportInfo({
            email: supportEmail || 'support@homestr.com',
            phone: supportPhone || '',
            whatsapp: supportWhatsapp || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch support settings:', error);
      }
    };
    fetchSettings();
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  // FAQ Categories
  const categories = [
    {
      id: 'booking',
      title: 'Booking & Services',
      icon: FiBook,
      color: '#3B82F6',
      questions: [
        {
          q: 'How do I book a service?',
          a: 'Navigate to the home page, select your desired service category, choose a service provider, select time slot, and confirm booking.'
        },
        {
          q: 'Can I cancel or reschedule my booking?',
          a: 'Yes, you can cancel or reschedule your booking from the My Bookings page up to 2 hours before the scheduled time.'
        },
        {
          q: 'What payment methods are accepted?',
          a: 'We accept all major payment methods including UPI, Credit/Debit cards, Net Banking, and Wallets.'
        },
      ]
    },
    {
      id: 'payment',
      title: 'Payments & Wallet',
      icon: FiClock,
      color: '#10B981',
      questions: [
        {
          q: 'How do I add money to my wallet?',
          a: 'Go to Wallet page, click on "Add Money", enter amount, and complete the payment using your preferred method.'
        },
        {
          q: 'Is my payment information secure?',
          a: 'Yes, we use industry-standard encryption and never store your complete card details on our servers.'
        },
        {
          q: 'How long does refund take?',
          a: 'Refunds are processed within 5-7 business days and will be credited to your original payment method or wallet.'
        },
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: FiAlertCircle,
      color: '#F59E0B',
      questions: [
        {
          q: 'How do I update my profile?',
          a: 'Go to Account page, tap on the edit icon next to your name, update your details, and save changes.'
        },
        {
          q: 'How do I change my phone number?',
          a: 'Phone number can be changed from Settings > Update Phone Number. OTP verification will be required.'
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes, you can request account deletion from Settings > Account Management > Delete Account.'
        },
      ]
    },
  ];

  // Quick actions
  const quickActions = [
    {
      id: 'chat',
      title: 'WhatsApp Chat',
      subtitle: 'Chat with our support team',
      icon: FiMessageCircle,
      color: '#25D366',
      action: () => {
        if (supportInfo.whatsapp) {
          const cleanNumber = supportInfo.whatsapp.replace(/\D/g, '');
          window.location.href = `whatsapp://send?phone=${cleanNumber}`;
        } else {
          toast('WhatsApp support is currently unavailable');
        }
      }
    },
    {
      id: 'email',
      title: 'Email Us',
      subtitle: supportInfo.email,
      icon: FiMail,
      color: '#10B981',
      action: () => {
        window.location.href = `mailto:${supportInfo.email}`;
      }
    },
    {
      id: 'call',
      title: 'Call Us',
      subtitle: supportInfo.phone || 'Not Available',
      icon: FiPhone,
      color: '#F59E0B',
      action: () => {
        if (supportInfo.phone) {
          window.location.href = `tel:${supportInfo.phone}`;
        } else {
          toast('Phone support is currently unavailable');
        }
      }
    },
  ];

  const handleContactSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill all fields');
      return;
    }

    // TODO: Send to backend
    toast.success('Your message has been sent! We\'ll get back to you soon.');
    setShowContactForm(false);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const filteredQuestions = categories.flatMap(cat =>
    cat.questions.filter(q =>
      searchQuery === '' ||
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ).map(q => ({ ...q, category: cat.title, color: cat.color }))
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-2xs">
        <div className="px-3.5 py-2.5 flex items-center gap-2.5 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <FiArrowLeft className="w-4 h-4 text-gray-800" />
          </button>
          <h1 className="text-sm font-bold text-gray-900 tracking-tight">Help & Support</h1>
        </div>
      </header>

      <main className="px-3.5 py-3 max-w-lg mx-auto">
        {/* Quick Actions / Contact Us */}
        <div className="mb-3.5">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Contact Us</h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
            {quickActions.map(action => {
              let href = null;
              if (action.id === 'chat' && supportInfo.whatsapp) {
                href = `whatsapp://send?phone=${supportInfo.whatsapp.replace(/\D/g, '')}`;
              } else if (action.id === 'email' && supportInfo.email) {
                href = `mailto:${supportInfo.email}`;
              } else if (action.id === 'call' && supportInfo.phone) {
                href = `tel:${supportInfo.phone.replace(/\D/g, '')}`;
              }

              const Component = href ? 'a' : 'button';

              return (
                <Component
                  key={action.id}
                  href={href}
                  onClick={!href ? action.action : undefined}
                  className="p-2.5 flex items-center gap-2.5 hover:bg-gray-50 active:scale-[0.99] transition-all w-full text-left"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="w-3.5 h-3.5" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-gray-900 truncate">{action.title}</h3>
                    <p className="text-[10px] text-gray-500 truncate">{action.subtitle}</p>
                  </div>
                  <FiChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </Component>
              );
            })}
          </div>
        </div>

        {/* Submit a Request Button */}
        <button
          onClick={() => setShowContactForm(true)}
          className="w-full text-white font-bold py-2.5 px-4 text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-[0.99] transition-all mb-3.5 flex items-center justify-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)',
            boxShadow: '0 2px 8px rgba(114, 12, 62, 0.2)'
          }}
        >
          <FiSend className="w-3.5 h-3.5" />
          <span>Submit a Request</span>
        </button>

        {/* FAQ Categories */}
        <div className="mb-3.5">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Browse by Category</h2>
          <div className="space-y-2">
            {categories.map(category => (
              <div
                key={category.id}
                className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden"
              >
                <button
                  onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                  className="w-full p-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${category.color}15` }}
                    >
                      <category.icon className="w-3 h-3" style={{ color: category.color }} />
                    </div>
                    <h3 className="text-xs font-semibold text-gray-900">{category.title}</h3>
                  </div>
                  <FiChevronRight
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${selectedCategory === category.id ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Expanded Questions */}
                {selectedCategory === category.id && (
                  <div className="p-2.5 pt-0 space-y-2.5 border-t border-gray-100 mt-1 bg-gray-50/30">
                    {category.questions.map((item, idx) => (
                      <div key={idx} className="pt-2">
                        <div className="flex items-start gap-1.5 mb-1">
                          <FiHelpCircle className="w-3 h-3 text-[#720C3E] mt-0.5 shrink-0" />
                          <p className="font-semibold text-gray-900 text-xs">{item.q}</p>
                        </div>
                        <p className="text-[11px] text-gray-600 pl-4.5 leading-relaxed">{item.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <h2 className="text-sm font-bold text-gray-900">Submit a Request</h2>
              <button
                onClick={() => setShowContactForm(false)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <FiArrowLeft className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] outline-none"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] outline-none"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] outline-none resize-none"
                  placeholder="Describe your issue in detail..."
                />
              </div>

              <button
                type="submit"
                className="w-full text-white font-bold py-2.5 px-4 text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 mt-2"
                style={{
                  background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)',
                }}
              >
                <FiSend className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupport;

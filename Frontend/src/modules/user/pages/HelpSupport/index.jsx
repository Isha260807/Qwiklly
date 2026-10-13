import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiMessageCircle, FiMail, FiPhone,
  FiChevronRight, FiSend, FiList
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

const HelpSupport = () => {
  const navigate = useNavigate();
  const [showContactForm, setShowContactForm] = useState(false);
  const [showTickets, setShowTickets] = useState(true);
  const [supportInfo, setSupportInfo] = useState({
    email: 'support@Qwiklly.com',
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
            email: supportEmail || 'support@Qwiklly.com',
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
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      try {
        const response = await api.get('/users/support-tickets');
        if (isMounted && response.data?.success) {
          setTickets(response.data.data || []);
        }
      } catch (error) {
        if (isMounted) console.error('Failed to load support tickets:', error);
      } finally {
        if (isMounted) setTicketsLoading(false);
      }
    };

    loadTickets();
    const interval = setInterval(loadTickets, 30000);
    const handleTicketUpdate = () => loadTickets();
    window.addEventListener('userNotificationsUpdated', handleTicketUpdate);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('userNotificationsUpdated', handleTicketUpdate);
    };
  }, []);

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

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const response = await api.post('/users/support-tickets', {
        subject: formData.subject,
        message: formData.message
      });
      if (response.data?.data) {
        setTickets(previous => [response.data.data, ...previous]);
      }
      toast.success('Support ticket created successfully.');
      setShowContactForm(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to submit support ticket.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-12">
      {/* Theme Gradient Header */}
      <header 
        className="sticky top-0 z-30 text-white shadow-md select-none px-4 py-2.5 sm:py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
      >
        <div className="flex items-center gap-2.5 max-w-lg mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
            title="Go Back"
          >
            <FiArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-base font-bold text-white tracking-tight">Help & Support</h1>
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
                  className="p-2.5 flex items-center gap-2.5 hover:bg-[#FCEBF3]/60 active:scale-[0.99] transition-all w-full text-left"
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

        {/* Support Actions */}
        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <button
            onClick={() => setShowContactForm(true)}
            className="text-white font-bold py-2.5 px-3 text-[11px] uppercase tracking-wide rounded-xl shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)',
              boxShadow: '0 2px 8px rgba(114, 12, 62, 0.2)'
            }}
          >
            <FiSend className="w-3.5 h-3.5" />
            <span>Submit Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTickets(current => !current)}
            aria-pressed={showTickets}
            className={`font-bold py-2.5 px-3 text-[11px] uppercase tracking-wide rounded-xl border active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 ${
              showTickets
                ? 'bg-[#FCEBF3] text-[#720C3E] border-[#E8A0B8]'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <FiList className="w-3.5 h-3.5" />
            <span>My Tickets</span>
            <span className="min-w-4 h-4 px-1 rounded-full bg-white/80 text-[9px] flex items-center justify-center">
              {tickets.length}
            </span>
          </button>
        </div>

        {/* Submitted Support Tickets */}
        {showTickets && <section className="mb-3.5">
          <div className="mb-1.5 ml-1 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">My Support Tickets</h2>
            {!ticketsLoading && tickets.length > 0 && (
              <span className="text-[10px] font-semibold text-[#720C3E]">{tickets.length} total</span>
            )}
          </div>
          <div className="space-y-2">
            {ticketsLoading ? (
              <div className="rounded-xl border border-gray-100 bg-white p-4 text-center text-[11px] text-gray-500 shadow-2xs">
                Loading your tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-[11px] text-gray-500 shadow-2xs">
                Your submitted support tickets will appear here.
              </div>
            ) : tickets.map(ticket => {
              const status = ticket.status || 'open';
              const statusStyle = status === 'open'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : status === 'in_progress'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';
              return (
                <article key={ticket._id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black tracking-wide text-[#720C3E]">{ticket.ticketNumber}</p>
                      <h3 className="mt-0.5 truncate text-xs font-bold text-gray-900">{ticket.subject}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${statusStyle}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-600">{ticket.message}</p>
                  {ticket.adminResponse && (
                    <div className="mt-2 rounded-lg border border-[#E8A0B8]/50 bg-[#FFF7FA] p-2.5">
                      <p className="text-[9px] font-black uppercase tracking-wide text-[#720C3E]">Admin reply</p>
                      <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-700">{ticket.adminResponse}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>}

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

import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FiShield, FiLock, FiFileText } from 'react-icons/fi';

const PrivacyPolicy = () => {
  const sections = [
    {
      title: '1. Introduction',
      content: 'Welcome to Qwiklly ("Company", "we", "our", or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you visit our website or use our application for domestic and home service bookings.'
    },
    {
      title: '2. Information We Collect',
      content: 'We collect personal information that you provide directly to us when you register for an account, book a service, contact our support team, or fill out a form. This includes your name, phone number, email address, physical service address, and specific booking preferences.'
    },
    {
      title: '3. How We Use Information',
      content: 'We use the collected information to: (a) facilitate and dispatch your home service bookings, (b) calculate serviceability and match nearby qualified service professionals, (c) process secure payments and generate bills, (d) communicate booking status updates, OTPs, and notifications, and (e) improve platform functionality and customer support.'
    },
    {
      title: '4. Location Information',
      content: 'With your permission, we collect precise or approximate GPS coordinates and address details to determine service area availability (geofenced zones), match candidate professionals within your vicinity, and guide service providers to your doorstep.'
    },
    {
      title: '5. Booking Information',
      content: 'Details regarding your booked items, scheduled dates, time intervals, service history, cancellations, and ratings are maintained to ensure service fulfillment, resolve disputes, and maintain service quality records.'
    },
    {
      title: '6. Payment Information',
      content: 'Payment transactions are processed securely through certified third-party payment gateways (such as Razorpay). Qwiklly does not store your full debit/credit card numbers or CVV codes on our servers.'
    },
    {
      title: '7. Device Information',
      content: 'We may automatically collect device details including IP address, browser type, operating system, and push notification tokens (FCM) to deliver real-time booking alerts and maintain platform security.'
    },
    {
      title: '8. Data Sharing & Disclosures',
      content: 'We only share necessary contact and address details with the assigned service professional solely for fulfilling your requested service. We do not sell, rent, or trade your personal data to third parties for commercial marketing.'
    },
    {
      title: '9. Data Security',
      content: 'We implement industry-standard administrative, technical, and physical security measures, including HTTPS encryption and token-based authentication, to protect your personal information against unauthorized access, alteration, or disclosure.'
    },
    {
      title: '10. Data Retention',
      content: 'We retain your personal information for as long as necessary to maintain your active account, fulfill bookings, comply with legal and tax obligations, and resolve any disputes.'
    },
    {
      title: '11. User Rights',
      content: 'You have the right to review, update, or correct your personal profile information and address book at any time directly within the user account settings, or request account closure through our support team.'
    },
    {
      title: '12. Cookies and Tracking',
      content: 'We use essential cookies and session storage to maintain authentication tokens, cart states, and browsing location preferences for a consistent checkout experience.'
    },
    {
      title: '13. Children’s Privacy',
      content: 'Our services are intended for adult individuals capable of entering legally binding contracts. We do not knowingly collect personal data from individuals under 18 years of age.'
    },
    {
      title: '14. Policy Changes & Contact Information',
      content: 'We may update this Privacy Policy periodically to reflect operational, legal, or regulatory modifications. For questions regarding this policy, please contact our privacy desk at support@qwiklly.com.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF7FA] text-[#24151D] font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D9DF] shadow-xs mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-[#FFF7FA] border border-[#E8A0B8] flex items-center justify-center text-[#720C3E]">
                <FiShield className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E]">
                Legal Documentation
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#24151D] font-heading tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-[#6F5A64] mt-2 font-medium">
              Last Updated: October 2026 • Official Privacy Guidelines for Qwiklly Platform
            </p>
          </div>

          {/* Sections List */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D9DF] shadow-xs space-y-8">
            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-2 pb-6 border-b border-[#E8D9DF]/50 last:border-0 last:pb-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#24151D] font-heading flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#720C3E]" />
                  {sec.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium pl-4">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;

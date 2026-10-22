import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FiFileText, FiShield } from 'react-icons/fi';

const TermsConditions = () => {
  const terms = [
    {
      title: '1. User Eligibility',
      content: 'By creating an account or requesting services on Qwiklly, you represent and warrant that you are at least 18 years old, possess the legal capacity to enter into binding agreements, and that all information provided during registration is accurate.'
    },
    {
      title: '2. Account Registration & Security',
      content: 'You are responsible for maintaining the confidentiality of your account credentials, login OTPs, and access tokens. You agree to notify us immediately of any unauthorized access or breach of security.'
    },
    {
      title: '3. Booking Creation & Confirmation',
      content: 'Bookings may be placed under Instant or Scheduled slot modalities. A booking is confirmed once an eligible service professional is matched and assigned. Qwiklly reserves the right to decline or cancel a booking if serviceability requirements or partner availability cannot be met.'
    },
    {
      title: '4. Service Availability & Geofenced Zones',
      content: 'Services are offered strictly within defined active zones. Entering an address outside active operational boundaries will result in a serviceability notice.'
    },
    {
      title: '5. Pricing & Itemized Billing',
      content: 'All service prices, visiting fees, taxes (GST), and promotional discounts are clearly itemized during checkout prior to confirmation. Prices are subject to periodic review and adjustment by the platform.'
    },
    {
      title: '6. Payment Processing',
      content: 'Payments must be completed through supported electronic payment gateways (Razorpay) or designated plan benefits. Service professionals are not authorized to demand undocumented cash charges beyond finalized platform bills.'
    },
    {
      title: '7. Cancellation Policy',
      content: 'Customers may cancel bookings in accordance with our posted cancellation terms. Free cancellations apply if done before professional assignment or beyond minimum notice windows.'
    },
    {
      title: '8. Refunds & Adjustments',
      content: 'Eligible refunds resulting from approved cancellations or verified service failures will be processed back to the original payment source within standard banking timelines.'
    },
    {
      title: '9. Service Provider Responsibilities',
      content: 'Service providers are independent professionals who agree to perform requested tasks in a safe, courteous, and professional manner in adherence with platform standards.'
    },
    {
      title: '10. Customer Responsibilities',
      content: 'Customers must provide safe, unobstructed access to the service premises, ensure water/electrical utility availability where necessary, and treat service professionals with respect and dignity.'
    },
    {
      title: '11. Prohibited Activities',
      content: 'Users shall not misuse the platform for fraudulent bookings, harass service partners, attempt off-platform private arrangements, or introduce harmful software.'
    },
    {
      title: '12. Limitation of Liability',
      content: 'Qwiklly acts as a digital marketplace facilitator. To the maximum extent permitted by law, Qwiklly shall not be liable for indirect, incidental, or consequential damages arising from service execution.'
    },
    {
      title: '13. Intellectual Property',
      content: 'All logos, graphics, trademarks, and user interfaces on Qwiklly belong exclusively to Qwiklly Technologies Pvt. Ltd. and are protected under intellectual property laws.'
    },
    {
      title: '14. Dispute Resolution & Governing Law',
      content: 'Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the competent courts in Indore, Madhya Pradesh, India.'
    },
    {
      title: '15. Modifications to Terms',
      content: 'We reserve the right to modify these terms at any time. Continued use of Qwiklly following any posted revisions constitutes acceptance of the updated terms.'
    },
    {
      title: '16. Contact Information',
      content: 'For questions or clarifications regarding these terms and conditions, please reach out to our legal compliance team at support@qwiklly.com.'
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
                <FiFileText className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E]">
                Terms of Service
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#24151D] font-heading tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-xs sm:text-sm text-[#6F5A64] mt-2 font-medium">
              Effective Date: October 2026 • User Agreement for Qwiklly Platform
            </p>
          </div>

          {/* Terms List */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D9DF] shadow-xs space-y-8">
            {terms.map((term, idx) => (
              <div key={idx} className="space-y-2 pb-6 border-b border-[#E8D9DF]/50 last:border-0 last:pb-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#24151D] font-heading flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#720C3E]" />
                  {term.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium pl-4">
                  {term.content}
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

export default TermsConditions;

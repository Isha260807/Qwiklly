import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FiRefreshCw, FiDollarSign, FiClock, FiCheckCircle } from 'react-icons/fi';

const RefundPolicy = () => {
  const policies = [
    {
      title: '1. Cancellation Before Service Start',
      content: 'You may cancel any requested or scheduled booking free of charge prior to a service professional beginning their journey or before the designated cancellation window. In such cases, 100% of the prepaid amount is eligible for a full refund.'
    },
    {
      title: '2. Cancellation After Professional Assignment',
      content: 'If you cancel after a service provider has been assigned and has commenced travel toward your service address, a nominal visiting / convenience fee may be deducted to compensate the partner for travel time and fuel expenses.'
    },
    {
      title: '3. Late Cancellation',
      content: 'Cancellations initiated within 30 minutes of the scheduled time or after the professional arrives at the location may incur a standard dispatch charge. The remaining balance will be credited back to your account.'
    },
    {
      title: '4. Customer No-Show',
      content: 'If our verified professional arrives at the designated location and is unable to gain access or reach the customer after a 15-minute grace period, the booking may be marked as cancelled due to customer absence, and the visiting fee will apply.'
    },
    {
      title: '5. Payment Failure & Pending Deductions',
      content: 'In the event of a network disruption during checkout where an amount is debited from your bank but the booking status fails to confirm, the payment gateway automatically initiates an auto-reversal within 24 to 48 banking hours.'
    },
    {
      title: '6. Duplicate Payment',
      content: 'If an account is inadvertently charged twice for a single booking number due to multiple transaction attempts, the duplicate payment will be identified and refunded to the source account immediately upon reconciliation.'
    },
    {
      title: '7. Refund Processing & Source Mode',
      content: 'Approved refunds are always credited back to the original mode of payment used during checkout (UPI, Debit/Credit Card, Net Banking, or Qwiklly Wallet).'
    },
    {
      title: '8. Standard Refund Timelines',
      content: '• UPI / Instant Reversals: 24 to 48 business hours\n• Net Banking / Debit Cards: 3 to 5 business days\n• Credit Cards: 5 to 7 business days (depending on your issuing bank billing cycle).'
    },
    {
      title: '9. Additional & Spare Charges',
      content: 'Any optional add-ons or physical spare materials purchased during service delivery with mutual consent are non-refundable once installed and verified by the customer.'
    },
    {
      title: '10. How to Request a Refund',
      content: 'For assistance with any cancellation, refund status tracking, or dispute resolution, please reach out to support@qwiklly.com with your Booking ID and payment reference number.'
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
                <FiRefreshCw className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#720C3E]">
                Financial Guidelines
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#24151D] font-heading tracking-tight">
              Refund & Cancellation Policy
            </h1>
            <p className="text-xs sm:text-sm text-[#6F5A64] mt-2 font-medium">
              Effective Date: October 2026 • Transparent Cancellation & Refund Guidelines
            </p>
          </div>

          {/* Policy List */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D9DF] shadow-xs space-y-8">
            {policies.map((p, idx) => (
              <div key={idx} className="space-y-2 pb-6 border-b border-[#E8D9DF]/50 last:border-0 last:pb-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#24151D] font-heading flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#720C3E]" />
                  {p.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#6F5A64] leading-relaxed font-medium pl-4 whitespace-pre-line">
                  {p.content}
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

export default RefundPolicy;

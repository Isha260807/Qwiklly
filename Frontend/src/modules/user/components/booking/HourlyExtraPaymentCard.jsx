import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiAlertTriangle } from 'react-icons/fi';
import { themeColors } from '../../../../theme';
import { bookingService } from '../../../../services/bookingService';

const formatMinutes = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${String(rem).padStart(2, '0')}m`;
};

/**
 * Shown on the user's booking details page when an hourly-service booking has
 * run beyond its booked duration and an extra-time charge is due. Pays ONLY
 * the extra amount (never re-charges the full booking amount).
 */
export default function HourlyExtraPaymentCard({ booking, onPaid }) {
  const [paying, setPaying] = useState(false);
  const tracking = booking?.hourlyTracking;

  if (!tracking?.isHourly || tracking.extraPaymentStatus === 'PAID' || tracking.extraPaymentStatus === 'NOT_REQUIRED') {
    return null;
  }
  if (!tracking.extraAmount || tracking.extraAmount <= 0) return null;

  const handlePay = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const orderResponse = await bookingService.createHourlyExtraPaymentOrder(booking._id || booking.id);
      if (!orderResponse.success) {
        toast.error(orderResponse.message || 'Failed to create payment order');
        setPaying(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round(orderResponse.data.amount * 100),
        currency: orderResponse.data.currency || 'INR',
        order_id: orderResponse.data.orderId,
        name: 'Homestr',
        description: `Extra time charge for ${booking.serviceName}`,
        handler: async function (response) {
          toast.loading('Verifying payment...');
          const verifyResponse = await bookingService.verifyHourlyExtraPayment(booking._id || booking.id, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          toast.dismiss();

          if (verifyResponse.success) {
            toast.success('Extra payment successful!');
            onPaid?.();
          } else {
            toast.error('Payment verification failed');
          }
          setPaying(false);
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        },
        prefill: { name: 'User', contact: '' },
        theme: { color: themeColors.button }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error('Failed to process payment');
      setPaying(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-200 space-y-3">
      <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
        <FiAlertTriangle className="w-4 h-4" />
        <span>Additional Service Payment</span>
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span className="flex items-center gap-1"><FiClock className="w-3.5 h-3.5" /> Booked Duration</span>
          <span>{formatMinutes(tracking.bookedMinutes)}</span>
        </div>
        <div className="flex justify-between">
          <span>Actual Duration</span>
          <span>{formatMinutes(tracking.actualDurationMinutes)}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-800">
          <span>Extra Duration</span>
          <span>{formatMinutes(tracking.extraDurationMinutes)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
          <span>Extra Charge</span>
          <span>₹{tracking.extraAmount}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="w-full py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
        style={{ background: themeColors.button }}
      >
        {paying ? 'Processing...' : `Pay ₹${tracking.extraAmount}`}
      </button>
    </div>
  );
}

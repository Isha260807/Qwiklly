import React from 'react';
import { FiStar } from 'react-icons/fi';
import { themeColors } from '../../../../theme';

const ReviewCard = ({ booking, onWriteReview }) => {
  // Logic to determine if card should be shown
  // Show if status is work_done/completed OR if there is already a rating
  const isCompleted = ['work_done', 'completed', 'COMPLETED'].includes(booking.status);
  const isPaid = ['success', 'paid', 'collected_by_vendor'].includes(booking.paymentStatus?.toLowerCase());
  const hasRating = !!booking.rating;

  if (!hasRating && (!isCompleted || !isPaid)) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-xs border border-[#E8D9DF] relative group mb-3">
      {/* Top Accent Gradient */}
      <div className="h-1 bg-gradient-to-r from-[#720C3E] via-[#9A2459] to-[#E8A0B8]" />

      <div className="p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] flex items-center justify-center text-[#720C3E] shrink-0">
            <FiStar className="w-4 h-4 fill-[#720C3E]/10" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs sm:text-sm text-[#24151D] leading-tight">How was your experience?</h3>
            <p className="text-[#6F5A64] text-[11px] leading-tight mt-0.5">Your feedback helps us improve.</p>
          </div>
        </div>

        {!hasRating ? (
          <button
            onClick={onWriteReview}
            className="w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all hover:opacity-95 cursor-pointer"
            style={{
              background: themeColors.brand?.gradient || 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)'
            }}
          >
            Write a Review
          </button>
        ) : (
          <div className="bg-[#FFF7FA] rounded-xl p-2.5 border border-[#E8D9DF] text-center">
            <p className="text-[10px] font-bold text-[#720C3E] uppercase tracking-wider mb-1.5">Your Rating</p>
            <div className="flex justify-center gap-1.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${star <= (booking.rating?.rating || booking.rating)
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : 'text-gray-300'
                    }`}
                />
              ))}
            </div>
            {(booking.rating?.review || booking.review) && (
              <div className="bg-white rounded-lg p-2 border border-[#E8D9DF] shadow-2xs relative my-1.5 text-left">
                <p className="text-[#24151D] italic font-normal text-xs leading-relaxed">
                  "{booking.rating?.review || booking.review}"
                </p>
              </div>
            )}

            <div className="text-[10px] text-[#720C3E] font-semibold">
              Thank you for your feedback!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiX, FiCheck, FiMessageSquare, FiArrowRight } from 'react-icons/fi';
import { themeColors } from '../../../../theme';

const RatingModal = ({ isOpen, onClose, onSubmit, bookingName, workerName }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ rating, review });
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Top Bar (Mobile Drag Handle) */}
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="p-4 sm:p-5">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Rate your experience</h2>
                <p className="text-gray-500 text-xs mt-0.5">How was the {bookingName} service?</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3">
              {/* Stars Card */}
              <div className="bg-gray-50/80 rounded-xl p-3 text-center border border-gray-100 shadow-inner">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tap to rate</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      className="focus:outline-none cursor-pointer"
                    >
                      <FiStar
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-200 ${star <= (hover || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                          }`}
                      />
                    </motion.button>
                  ))}
                </div>
                {rating > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 text-xs font-bold text-gray-700"
                  >
                    {rating === 5 ? 'Excellent! 🌟' :
                      rating === 4 ? 'Good! 👍' :
                        rating === 3 ? 'Average OK' :
                          rating === 2 ? 'Disappointed' : 'Needs Improvement'}
                  </motion.p>
                )}
              </div>

              {/* Review Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#24151D] text-xs font-bold">
                  <FiMessageSquare className="w-3.5 h-3.5 text-[#720C3E]" />
                  <span>Share your feedback</span>
                </div>
                <div className="relative group">
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Tell us what you liked or what could be better..."
                    className="w-full bg-[#FFF7FA] border border-[#E8D9DF] focus:border-[#720C3E] rounded-xl p-2.5 text-xs min-h-[72px] transition-all outline-none resize-none placeholder:text-[#6F5A64]"
                    disabled={isSubmitting}
                    rows={3}
                  />
                  <div className="absolute bottom-2 right-2.5 text-[9px] font-bold text-[#6F5A64] uppercase letter-spacing-1">
                    {review.length} characters
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 cursor-pointer"
                style={{ background: rating > 0 ? themeColors.brand.gradient : '#CBD5E1' }}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <>
                    <span>Submit Review</span>
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RatingModal;


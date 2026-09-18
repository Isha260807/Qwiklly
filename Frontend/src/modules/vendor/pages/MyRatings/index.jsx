import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar, FiUser, FiCalendar, FiMessageSquare, FiFilter, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import { getRatings } from '../../services/bookingService';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

const MyRatings = () => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  const fetchRatings = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await getRatings({ page, limit: 10 });
      if (response.success) {
        setRatings(response.data);
        setStats(response.stats);
        setPagination(response.pagination);
      } else {
        toast.error(response.message || 'Failed to fetch ratings');
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      toast.error('Failed to load ratings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const RatingBar = ({ star, count, total }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 w-6">
          <span className="text-[10px] font-bold text-gray-600">{star}</span>
          <FiStar className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
        </div>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-gray-400 w-5 text-right">{count}</span>
      </div>
    );
  };

  if (isLoading && pagination.page === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <div className="text-center">
          <FiLoader className="w-8 h-8 animate-spin mx-auto mb-2 text-[#720C3E]" />
          <p className="text-gray-500 text-xs font-medium">Loading ratings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Ratings" />

      <main className="max-w-md mx-auto px-4 pt-3 pb-6 space-y-3">
        {/* Overall Rating Stats */}
        {stats && (
          <div className="bg-white rounded-xl p-3.5 shadow-xs">
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2 flex flex-col items-center justify-center border-r border-gray-100 pr-2">
                <h2 className="text-3xl font-black text-gray-900 mb-0.5">
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </h2>
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FiStar
                      key={s}
                      className={`w-3 h-3 ${s <= Math.round(stats.averageRating) ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {stats.totalReviews} Reviews
                </p>
              </div>
              <div className="col-span-3 space-y-1 py-0.5">
                <RatingBar star={5} count={stats.star5} total={stats.totalReviews} />
                <RatingBar star={4} count={stats.star4} total={stats.totalReviews} />
                <RatingBar star={3} count={stats.star3} total={stats.totalReviews} />
                <RatingBar star={2} count={stats.star2} total={stats.totalReviews} />
                <RatingBar star={1} count={stats.star1} total={stats.totalReviews} />
              </div>
            </div>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900">Recent Feedback</h3>
            <button className="p-1.5 bg-white rounded-lg shadow-xs hover:bg-gray-50 text-gray-600 cursor-pointer">
              <FiFilter className="w-3.5 h-3.5" />
            </button>
          </div>

          {ratings.length > 0 ? (
            ratings.map((rating, idx) => (
              <div key={idx} className="bg-white rounded-xl p-3 shadow-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#FCEBF3] flex items-center justify-center overflow-hidden shrink-0">
                      {rating.userId?.profilePhoto ? (
                        <img src={rating.userId.profilePhoto} alt={rating.userId.name} className="w-full h-full object-cover" />
                      ) : (
                        <FiUser className="w-4 h-4 text-[#720C3E]" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">{rating.userId?.name || 'Customer'}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <FiStar
                              key={s}
                              className={`w-2.5 h-2.5 ${s <= rating.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-semibold text-gray-400">{formatDate(rating.reviewedAt)}</span>
                      </div>
                    </div>
                  </div>
                  {(rating.serviceId?.title || rating.serviceName) && (
                    <div className="bg-[#FCEBF3] px-2 py-0.5 rounded-md">
                      <span className="text-[9px] font-bold text-[#720C3E]">{rating.serviceId?.title || rating.serviceName}</span>
                    </div>
                  )}
                </div>

                {rating.review && (
                  <p className="text-gray-600 text-xs leading-relaxed font-medium pl-2 border-l-2 border-[#720C3E]">
                    "{rating.review}"
                  </p>
                )}

                {rating.reviewImages && rating.reviewImages.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {rating.reviewImages.map((img, i) => (
                      <img key={i} src={img} className="w-14 h-14 rounded-lg object-cover shrink-0" alt="Review" />
                    ))}
                  </div>
                )}

                {rating.workerId && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 font-medium">Service by:</span>
                      <span className="font-bold text-[#720C3E]">{rating.workerId.name}</span>
                    </div>
                    <span className="font-semibold text-gray-400">#{rating.bookingNumber}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-xl shadow-xs">
              <div className="w-10 h-10 bg-[#FCEBF3] rounded-full flex items-center justify-center mx-auto mb-2">
                <FiMessageSquare className="w-5 h-5 text-[#720C3E]" />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">No ratings yet</p>
            </div>
          )}

          {/* Load More */}
          {pagination.total > ratings.length && (
            <button
              onClick={() => fetchRatings(pagination.page + 1)}
              className="w-full py-2.5 bg-white rounded-xl text-gray-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-xs"
            >
              {isLoading ? <FiLoader className="animate-spin w-3.5 h-3.5" /> : 'Load More Reviews'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyRatings;

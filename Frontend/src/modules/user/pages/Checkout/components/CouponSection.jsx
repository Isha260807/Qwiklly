import React, { useState, useEffect } from 'react';
import { FiTag, FiCheck, FiX, FiChevronRight, FiPercent, FiClock, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../../theme';
import { couponService } from '../../../../../services/couponService';

const CouponSection = ({
  appliedCoupon,
  onCouponApplied,
  onCouponRemoved,
  cartItems = [],
  serviceId = null,
  address = null,
  paymentMethod = 'online',
  visitingCharges = 29,
  disabled = false
}) => {
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Calculate rough cart subtotal for available coupons check
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.card?.price || item.price || 0;
    const count = item.quantity || item.serviceCount || 1;
    return sum + (price * count);
  }, 0);

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await couponService.getAvailableCoupons({
        amount: subtotal,
        serviceId: serviceId
      });
      if (res.success) {
        setAvailableCoupons(res.coupons || []);
      }
    } catch (error) {
      console.error('Failed to load coupons:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (showOffersModal) {
      fetchCoupons();
    }
  }, [showOffersModal, subtotal, serviceId]);

  const handleApply = async (codeToApply) => {
    const targetCode = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!targetCode) {
      toast.error('Please enter a coupon code');
      return;
    }

    setLoading(true);
    try {
      const res = await couponService.applyCoupon({
        code: targetCode,
        bookedItems: cartItems,
        serviceId,
        address,
        paymentMethod,
        visitingCharges
      });

      if (res.success) {
        toast.success(res.message || `Coupon "${targetCode}" applied!`);
        onCouponApplied(res.coupon, res.pricing);
        setCouponCodeInput('');
        setShowOffersModal(false);
      } else {
        toast.error(res.message || 'Failed to apply coupon');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Invalid or expired coupon code';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await couponService.removeCoupon({
        bookedItems: cartItems,
        serviceId,
        address,
        paymentMethod,
        visitingCharges
      });

      if (res.success) {
        toast.success('Coupon removed');
        onCouponRemoved(res.pricing);
      }
    } catch (error) {
      toast.error('Failed to remove coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <FiTag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Coupons & Offers</h4>
            <p className="text-[11px] text-gray-500">Save more on this booking</p>
          </div>
        </div>

        {!appliedCoupon && (
          <button
            type="button"
            onClick={() => setShowOffersModal(true)}
            disabled={disabled || loading}
            className="text-xs font-bold hover:underline flex items-center gap-0.5"
            style={{ color: themeColors.button }}
          >
            <span>View Offers</span>
            <FiChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Applied Coupon Banner */}
      {appliedCoupon ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <FiCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-green-900 tracking-wider uppercase bg-green-200/70 px-2 py-0.5 rounded">
                  {appliedCoupon.code}
                </span>
                <span className="text-xs font-bold text-green-700">Applied</span>
              </div>
              <p className="text-[11px] text-green-700 mt-0.5 font-medium">
                You saved ₹{(appliedCoupon.discountAmount || 0).toLocaleString('en-IN')} with this coupon!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors border border-red-200"
          >
            Remove
          </button>
        </div>
      ) : (
        /* Coupon Input Box */
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Enter coupon code"
              disabled={disabled || loading}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider placeholder:normal-case placeholder:font-normal placeholder:tracking-normal outline-none focus:border-teal-500 focus:bg-white transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={() => handleApply()}
            disabled={!couponCodeInput.trim() || disabled || loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 shadow-sm flex items-center gap-1.5"
            style={{ backgroundColor: themeColors.button }}
          >
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Apply'}
          </button>
        </div>
      )}

      {/* Available Coupons Modal / Bottom Sheet */}
      {showOffersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPercent className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-gray-900">Available Coupons</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOffersModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {loadingCoupons ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs">Finding best offers for you...</p>
                </div>
              ) : availableCoupons.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <FiTag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-gray-600">No coupons available right now</p>
                  <p className="text-xs text-gray-400 mt-1">Check back later for new promotional offers</p>
                </div>
              ) : (
                availableCoupons.map((coupon) => (
                  <div
                    key={coupon._id}
                    className={`border rounded-xl p-3.5 transition-all relative ${
                      coupon.isEligible
                        ? 'border-teal-200 bg-teal-50/20 hover:border-teal-400'
                        : 'border-gray-200 bg-gray-50/70 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                            {coupon.code}
                          </span>
                          {coupon.discountType === 'PERCENTAGE' ? (
                            <span className="text-xs font-bold text-green-600">
                              {coupon.discountValue}% OFF {coupon.maxDiscount ? `(Up to ₹${coupon.maxDiscount})` : ''}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-green-600">
                              FLAT ₹{coupon.discountValue} OFF
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-gray-800 mt-1">{coupon.title}</h5>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApply(coupon.code)}
                        disabled={!coupon.isEligible || loading}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 disabled:cursor-not-allowed"
                        style={
                          coupon.isEligible
                            ? { backgroundColor: themeColors.button, color: 'white' }
                            : { backgroundColor: '#e5e7eb', color: '#9ca3af' }
                        }
                      >
                        Apply
                      </button>
                    </div>

                    {coupon.description && (
                      <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{coupon.description}</p>
                    )}

                    {/* Terms / Restrictions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
                      {coupon.minOrderAmount > 0 && (
                        <span>• Min order ₹{coupon.minOrderAmount}</span>
                      )}
                      {coupon.firstOrderOnly && (
                        <span className="text-amber-600 font-semibold">• 1st booking only</span>
                      )}
                      {coupon.expiresAt && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <FiClock className="w-2.5 h-2.5" />
                          Expires {new Date(coupon.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {!coupon.isEligible && coupon.ineligibilityReason && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        <FiAlertCircle className="w-3 h-3 shrink-0" />
                        <span>{coupon.ineligibilityReason}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponSection;

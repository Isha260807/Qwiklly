import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart, FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import BottomNav from '../../components/layout/BottomNav';
import { useCart } from '../../../../context/CartContext';
import electricianIcon from '../../../../assets/images/icons/services/electrician.png';
import womensSalonIcon from '../../../../assets/images/icons/services/womens-salon-spa-icon.png';
import massageMenIcon from '../../../../assets/images/icons/services/massage-men-icon.png';
import cleaningIcon from '../../../../assets/images/icons/services/cleaning-icon.png';
import acApplianceRepairIcon from '../../../../assets/images/icons/services/ac-appliance-repair-icon.png';
import NotificationBell from '../../components/common/NotificationBell';

const toAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const iconMap = {
  'Electrician': electricianIcon,
  'Electricity': electricianIcon,
  "Women's Salon & Spa": womensSalonIcon,
  'Salon for Women': womensSalonIcon,
  'Salon Prime': womensSalonIcon,
  'Massage for Men': massageMenIcon,
  'Cleaning': cleaningIcon,
  'Bathroom & Kitchen Cleaning': cleaningIcon,
  'Sofa & Carpet Cleaning': cleaningIcon,
  'AC Service and Repair': acApplianceRepairIcon,
  'AC & Appliance Repair': acApplianceRepairIcon,
};

const getItemImage = (item) => {
  const candidate = item?.icon || item?.iconUrl || item?.image || item?.imageUrl || item?.categoryIcon || item?.sectionIcon || item?.card?.imageUrl;
  if (candidate && typeof candidate === 'string' && candidate.trim() !== '') return toAssetUrl(candidate);
  return iconMap[item?.category] || null;
};

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, isLoading: loading, removeItem, updateItem } = useCart();

  const cartCount = cartItems.length;

  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

  const handleDelete = async (itemId) => {
    try {
      const response = await removeItem(itemId);
      if (!response.success) toast.error(response.message || 'Failed to remove item');
      else toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleQuantityChange = async (itemId, change) => {
    try {
      const item = cartItems.find(i => (i._id || i.id) === itemId);
      if (!item) return;
      const newCount = Math.max(1, (item.serviceCount || 1) + change);
      const response = await updateItem(itemId, newCount);
      if (!response.success) toast.error(response.message || 'Failed to update quantity');
    } catch {
      toast.error('Failed to update quantity');
    }
  };

  const handleBookAll = () => navigate('/user/checkout');

  return (
    <div className="min-h-screen bg-[#FAF7F8] relative">
      {/* Header */}
      <header
        className="sticky top-0 z-40 text-white shadow-md select-none px-4 py-2.5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition-all border border-white/20"
          >
            <FiArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <FiShoppingCart className="w-5 h-5 text-white" />
            <h1 className="text-base font-bold text-white tracking-tight">Your Cart</h1>
            {cartCount > 0 && (
              <span className="bg-white text-[#720C3E] text-xs font-bold px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </div>
        </div>
        <NotificationBell
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition-all border border-white/20 relative shrink-0 cursor-pointer"
          iconClassName="w-4 h-4 text-white stroke-[2]"
          dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90"
        />
      </header>

      {/* Main Content */}
      <main className="px-4 py-4" style={{ paddingBottom: cartItems.length > 0 ? '140px' : '90px' }}>
        {loading ? (
          /* Skeleton */
          <div className="bg-white rounded-2xl border border-[#E8D9DF]/70 shadow-sm p-4 animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="h-2.5 w-20 bg-gray-100 rounded" />
                </div>
                <div className="h-8 w-24 bg-gray-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : cartItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-full bg-[#FFF7FA] border border-[#E8D9DF] flex items-center justify-center mb-3">
              <FiShoppingCart className="w-8 h-8 text-[#9A2459]" />
            </div>
            <p className="text-gray-800 text-base font-bold">Your cart is empty</p>
            <p className="text-gray-400 text-xs mt-1">Add services to get started</p>
            <button
              onClick={() => navigate('/user')}
              className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
            >
              Browse Services
            </button>
          </div>
        ) : (
          /* Single Unified Card */
          <div className="bg-white rounded-2xl border border-[#E8D9DF]/70 shadow-[0_2px_12px_rgba(114,12,62,0.07)] overflow-hidden">
            {/* Card Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #720C3E08 0%, #9A245908 100%)', borderBottom: '1px solid #E8D9DF60' }}
            >
              <div>
                <p className="text-xs font-semibold text-gray-500">
                  {cartCount} {cartCount === 1 ? 'Service' : 'Services'} Selected
                </p>
              </div>
              <span className="text-sm font-extrabold text-[#720C3E]">
                ₹{totalPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Services List */}
            <div className="divide-y divide-[#F0E8EC]">
              {cartItems.map((item, index) => {
                const img = getItemImage(item);
                const qty = item.serviceCount || 1;
                const itemKey = item._id || item.id || `cart-item-${index}`;
                return (
                  <div key={itemKey} className="flex items-start gap-3 px-4 py-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#FFF7FA] border border-[#E8D9DF]/60 flex items-center justify-center mt-0.5">
                      {img ? (
                        <img src={img} alt={item.title} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span className="text-sm font-bold text-[#720C3E] uppercase">{(item.title || item.category || 'S').charAt(0)}</span>
                      )}
                    </div>

                    {/* Info — full name, detail on one line */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-snug">{item.title}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.category}{item.durationMinutes ? ` · ${item.durationMinutes} mins` : item.hours ? ` · ${item.hours} hr` : ''}{item.description ? ` · ${item.description}` : ''}
                      </p>
                    </div>

                    {/* Right: quantity for fixed items; duration items are selected on the service page */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {/* Row 1: quantity/delete */}
                      <div className="flex items-center gap-1.5">
                        {item.pricingType === 'DURATION' || item.pricingType === 'HOURLY' ? (
                          <span className="text-[11px] font-extrabold text-[#720C3E] px-1">
                            {item.durationMinutes ? `${item.durationMinutes} mins` : `${item.hours || 0} hr`}
                          </span>
                        ) : (
                          <div className="flex items-center bg-[#FFF7FA] border border-[#E8D9DF] rounded-lg overflow-hidden">
                            <button
                              onClick={() => handleQuantityChange(item._id || item.id, -1)}
                              className="w-5 h-5 flex items-center justify-center text-[#720C3E] hover:bg-[#F8E8EF] active:scale-95 transition-all"
                            >
                              <FiMinus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-[11px] font-extrabold text-[#720C3E] min-w-[14px] text-center px-0.5">{qty}</span>
                            <button
                              onClick={() => handleQuantityChange(item._id || item.id, +1)}
                              className="w-5 h-5 flex items-center justify-center text-[#720C3E] hover:bg-[#F8E8EF] active:scale-95 transition-all"
                            >
                              <FiPlus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(item._id || item.id)}
                          className="p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Row 2: ₹price below */}
                      <span className="text-sm font-extrabold text-[#720C3E]">
                        ₹{(item.price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Buttons — above BottomNav */}
      {cartItems.length > 0 && (
        <div
          className="fixed left-0 right-0 z-40 px-4 pt-2 pb-2"
          style={{
            bottom: '64px',
            background: 'linear-gradient(to top, rgba(250,247,248,1) 60%, rgba(250,247,248,0))',
          }}
        >
          <div className="flex gap-2">
            {/* Add Services */}
            <button
              onClick={() => navigate('/user')}
              className="flex-1 py-2.5 rounded-xl font-semibold text-xs active:scale-[0.98] transition-all border"
              style={{
                borderColor: '#720C3E',
                color: '#720C3E',
                background: '#FFF7FA',
              }}
            >
              + Add Services
            </button>

            {/* Book */}
            <button
              onClick={handleBookAll}
              className="flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              style={{
                background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)',
                boxShadow: '0 4px 14px rgba(114,12,62,0.3)',
              }}
            >
              <span className="text-white">Book</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[11px] font-bold text-white">
                ₹{totalPrice.toLocaleString('en-IN')}
              </span>
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Cart;

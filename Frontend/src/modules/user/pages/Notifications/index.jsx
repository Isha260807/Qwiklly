import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiArrowLeft, FiTrash2, FiX, FiSend } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import BottomNav from '../../components/layout/BottomNav';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} from '../../services/notificationService';
import { testPushNotification } from '../../../../services/pushNotificationService';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filter, setFilter] = useState('all'); // all, alerts, jobs, payments
  const [isTesting, setIsTesting] = useState(false);

  useLayoutEffect(() => {
    // Optional: Set background color if needed, similar to Vendor
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient || '#f9fafb';

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen for real-time updates (if implemented via window event or socket)
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('userNotificationsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('userNotificationsUpdated', handleUpdate);
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      // Update local state to reflect change immediately
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch (error) {
      console.error('Failed to mark all as read', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      // Professional confirmation could be a custom modal, but native confirm is robust for now
      // Or just delete with undo toast.
      // User asked for "professionally". Often direct delete is preferred for single items, confirmation for "Clear All".
      // But let's add no confirm for single item for speed, or a simple one.
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification removed');
    } catch (error) {
      console.error('Failed to delete notification', error);
      toast.error('Failed to delete');
    }
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
      toast.success('All notifications cleared');
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear notifications', error);
      toast.error('Failed to clear');
      setShowClearConfirm(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTesting(true);
    const toastId = toast.loading('Sending test push notification...');
    try {
      const res = await testPushNotification('user');
      if (res.success) {
        toast.success('Test notification sent! Check your notification tray.', {
          id: toastId,
          duration: 4000
        });
        setTimeout(() => {
          fetchNotifications();
        }, 800);
      } else {
        toast.error(res.error || 'Failed to send test notification', {
          id: toastId,
          duration: 5000
        });
      }
    } catch (err) {
      toast.error(err.message || 'Error sending test notification', { id: toastId });
    } finally {
      setIsTesting(false);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;

    const type = (notif.type || '').toLowerCase();

    if (filter === 'payments') {
      return ['payment_', 'refund_', 'wallet_'].some(prefix => type.includes(prefix));
    }

    if (filter === 'jobs') { // Mapped to 'Bookings' in UI
      return ['booking_', 'job_', 'worker_', 'visit_', 'work_', 'journey_', 'vendor_'].some(prefix => type.includes(prefix));
    }

    if (filter === 'alerts') {
      return ['alert', 'general', 'security', 'account'].some(prefix => type.includes(prefix));
    }

    return type === filter;
  });

  const getNotificationIcon = (originalType) => {
    const type = (originalType || '').toLowerCase();

    if (['payment', 'refund', 'wallet'].some(t => type.includes(t))) return '💰';
    if (['booking', 'job', 'work', 'visit', 'journey', 'vendor'].some(t => type.includes(t))) return '📋';
    if (['alert', 'general'].some(t => type.includes(t))) return '🔔';

    return '📢';
  };

  const getNotificationColor = (originalType) => {
    const type = (originalType || '').toLowerCase();

    if (['payment', 'refund', 'wallet'].some(t => type.includes(t))) return '#10B981'; // Green
    if (['booking', 'job', 'work', 'visit', 'journey', 'vendor'].some(t => type.includes(t))) return '#3B82F6'; // Blue
    if (['alert', 'general'].some(t => type.includes(t))) return themeColors.button;

    return '#6B7280'; // Gray
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50/50">
      {/* Theme Gradient Header */}
      <header 
        className="sticky top-0 z-50 text-white shadow-sm select-none px-3.5 py-2.5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
            title="Go Back"
          >
            <FiArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </button>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">Notifications</h1>
        </div>
        {notifications.length > 0 && (
          <span className="text-[10px] font-semibold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-white/90">
            {notifications.filter(n => !n.read).length > 0 ? `${notifications.filter(n => !n.read).length} new` : 'All caught up'}
          </span>
        )}
      </header>

      <main className="px-3 py-3 sm:px-4 sm:py-3.5 max-w-lg mx-auto">
        {/* Quick Test Push Notification Card */}
        <div className="mb-3 p-2.5 bg-gradient-to-r from-pink-50/70 via-white to-pink-50/30 rounded-xl border border-pink-100 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-100/70 flex items-center justify-center text-[#720C3E] shrink-0">
              <FiBell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Test Push Notification</p>
              <p className="text-[10px] text-gray-500">Send an instant test alert to this device</p>
            </div>
          </div>
          <button
            onClick={handleSendTestNotification}
            disabled={isTesting}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
          >
            {isTesting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <FiSend className="w-3 h-3" />
                <span>Test Push</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'All' },
            { id: 'jobs', label: 'Bookings' },
            { id: 'payments', label: 'Payments' },
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`px-3 py-1 rounded-full font-medium text-xs whitespace-nowrap transition-all ${
                filter === filterOption.id
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
              }`}
              style={
                filter === filterOption.id
                  ? {
                      background: themeColors.button,
                      boxShadow: `0 2px 6px ${themeColors.button}35`,
                    }
                  : {}
              }
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        {/* Action Buttons Toolbar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between mb-2 px-1 text-[11px] text-gray-400">
            <span>{filteredNotifications.length} {filteredNotifications.length === 1 ? 'item' : 'items'}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAllRead}
                className="font-medium text-gray-500 hover:text-gray-800 transition-colors"
              >
                Mark All Read
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleClearAll}
                className="font-medium text-red-500 hover:text-red-700 transition-colors flex items-center gap-0.5"
              >
                <FiTrash2 className="w-2.5 h-2.5" />
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-2.5 sm:p-3 border border-gray-100 shadow-sm animate-pulse">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 shrink-0"></div>
                  <div className="flex-1 space-y-1.5 py-0.5">
                    <div className="h-3.5 w-28 bg-gray-100 rounded"></div>
                    <div className="h-2.5 w-full bg-gray-100 rounded"></div>
                    <div className="h-2 w-16 bg-gray-50 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100/80 my-4">
            <FiBell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-700 font-semibold text-xs mb-0.5">No notifications</p>
            <p className="text-[11px] text-gray-400 mb-3">You're all caught up!</p>
            <button
              onClick={handleSendTestNotification}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
            >
              {isTesting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending Test...</span>
                </>
              ) : (
                <>
                  <FiSend className="w-3.5 h-3.5" />
                  <span>Send Test Notification</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-white rounded-xl p-2.5 sm:p-3 shadow-sm border transition-all relative ${
                  !notif.read
                    ? 'border-l-[3px] border-y-gray-100 border-r-gray-100 bg-white'
                    : 'border-gray-100/90 bg-white/80 opacity-80 hover:opacity-100'
                }`}
                style={{
                  borderLeftColor: !notif.read ? getNotificationColor(notif.type) : undefined,
                }}
              >
                <div className="flex items-start gap-2.5">
                  {/* Icon */}
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm sm:text-base flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${getNotificationColor(notif.type)}15` }}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Main text content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <p className={`text-xs sm:text-sm leading-tight text-gray-800 truncate ${!notif.read ? 'font-bold' : 'font-semibold'}`}>
                        {notif.title}
                      </p>
                      
                      {/* Actions: Mark Read & Delete inline */}
                      <div className="flex items-center gap-1 shrink-0 -mt-0.5">
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="w-5 h-5 rounded-full bg-gray-50 hover:bg-green-50 text-green-600 flex items-center justify-center transition-colors"
                            title="Mark as read"
                          >
                            <FiCheck className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, notif.id)}
                          className="w-5 h-5 rounded-full bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                          title="Delete"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed break-words">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-gray-50">
                      <p className="text-[10px] text-gray-400 font-medium">
                        {notif.time || (notif.createdAt && new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}
                      </p>
                      {notif.action && (
                        <button
                          onClick={() => {
                            if (notif.action === 'view_booking') {
                              navigate(`/user/booking/${notif.bookingId}`);
                            } else if (notif.action === 'view_wallet') {
                              navigate('/user/wallet');
                            }
                          }}
                          className="text-[11px] font-bold flex items-center gap-0.5 hover:underline"
                          style={{ color: themeColors.button }}
                        >
                          View Details
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xs rounded-xl p-4 shadow-xl">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-2.5">
                <FiTrash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Clear All Notifications?</h3>
              <p className="text-xs text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="py-2 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAll}
                className="py-2 rounded-lg text-xs font-semibold text-white bg-red-500 shadow-sm active:scale-95 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

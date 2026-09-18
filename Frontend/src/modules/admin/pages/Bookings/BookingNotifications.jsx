import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell, FiCheck, FiX, FiInfo, FiTrash2, FiExternalLink,
  FiShoppingBag, FiCheckCircle, FiXCircle, FiAlertTriangle, FiRefreshCw
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

const BookingNotifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications', { params: { limit: 50 } });
      if (res.data.success && res.data.data) {
        setNotifications(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
    toast.success('Notifications refreshed');
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const markAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    }
  };

  const deleteNotification = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notification removed');
    } catch (error) {
      setNotifications(prev => prev.filter(n => n._id !== id));
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.isRead;
    if (filter === 'Bookings') return n.type?.includes('booking') || n.type?.includes('order') || n.title?.toLowerCase().includes('booking');
    if (filter === 'Cancelled') return n.type?.includes('cancel') || n.title?.toLowerCase().includes('cancel');
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type, title = '') => {
    const t = (type || '').toLowerCase();
    const titleL = title.toLowerCase();
    if (t.includes('cancel') || titleL.includes('cancel')) {
      return <FiXCircle className="text-red-500 w-4 h-4" />;
    }
    if (t.includes('complete') || titleL.includes('complete') || titleL.includes('done')) {
      return <FiCheckCircle className="text-emerald-500 w-4 h-4" />;
    }
    if (t.includes('pay') || titleL.includes('pay')) {
      return <FiAlertTriangle className="text-amber-500 w-4 h-4" />;
    }
    return <FiShoppingBag className="text-blue-500 w-4 h-4" />;
  };

  const getBgColor = (type, title = '') => {
    const t = (type || '').toLowerCase();
    const titleL = title.toLowerCase();
    if (t.includes('cancel') || titleL.includes('cancel')) return 'bg-red-50 text-red-600';
    if (t.includes('complete') || titleL.includes('complete')) return 'bg-emerald-50 text-emerald-600';
    if (t.includes('pay') || titleL.includes('pay')) return 'bg-amber-50 text-amber-600';
    return 'bg-blue-50 text-blue-600';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    const bookingId = notification.data?.bookingId || notification.bookingId || notification.metadata?.bookingId;
    if (bookingId) {
      navigate(`/admin/bookings/${bookingId}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-primary-500 cursor-pointer"
          >
            <option value="All">All Notifications</option>
            <option value="Unread">Unread Only</option>
            <option value="Bookings">Bookings Only</option>
            <option value="Cancelled">Cancellations</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 text-xs transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <span className="bg-primary-100 text-primary-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {unreadCount} unread
            </span>
          )}
          <button
            onClick={markAllRead}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all shadow-xs active:scale-95"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading notifications...</span>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            <FiBell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-600">No notifications found</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Booking alerts and status updates will appear here.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const bookingId = notification.data?.bookingId || notification.bookingId || notification.metadata?.bookingId;
            return (
              <div
                key={notification._id || notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors cursor-pointer group ${
                  !notification.isRead ? 'bg-primary-50/20' : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getBgColor(notification.type, notification.title)}`}>
                    {getIcon(notification.type, notification.title)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs font-bold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{notification.message || notification.body}</p>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <span className="text-[10px] text-gray-400 font-medium">
                        {notification.createdAt ? new Date(notification.createdAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : notification.time}
                      </span>
                      {bookingId && (
                        <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded flex items-center gap-1">
                          #{bookingId.slice(-6).toUpperCase()} <FiExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.isRead && (
                    <button
                      title="Mark as read"
                      onClick={(e) => markAsRead(notification._id || notification.id, e)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <FiCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    title="Delete"
                    onClick={(e) => deleteNotification(notification._id || notification.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default BookingNotifications;

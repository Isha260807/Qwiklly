import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import api from '../../../../services/api';

const NotificationBell = ({ notificationCount }) => {
  const navigate = useNavigate();
  const [count, setCount] = useState(notificationCount || 0);

  // Sync prop changes
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Fetch unread count on mount & periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        if (!token) return;

        const res = await api.get('/notifications/user');
        if (res.data?.success && typeof res.data.unreadCount === 'number') {
          setCount(res.data.unreadCount);
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate('/user/notifications');
      }}
      className="w-9 h-9 rounded-full bg-white border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center justify-center relative active:scale-95 hover:bg-gray-50 transition-all shrink-0 cursor-pointer"
      title="Notifications"
    >
      <FiBell className="w-[18px] h-[18px] text-[#1E293B] stroke-[2.2]" />

      {/* Unread indicator dot/badge */}
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
      )}
    </button>
  );
};

export default NotificationBell;

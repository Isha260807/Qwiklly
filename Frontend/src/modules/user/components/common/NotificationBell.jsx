import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import api from '../../../../services/api';

const NotificationBell = ({ notificationCount, className, iconClassName, dotClassName }) => {
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
      className={className || "w-9 h-9 rounded-full bg-white border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center justify-center relative active:scale-95 hover:bg-gray-50 transition-all shrink-0 cursor-pointer"}
      title="Notifications"
    >
      <FiBell className={iconClassName || "w-[18px] h-[18px] text-[#1E293B] stroke-[2.2]"} />

      {/* Unread indicator dot/badge - compact and subtle */}
      {count > 0 && (
        <span className={dotClassName || "absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF3366] rounded-full ring-1 ring-white shadow-xs"} />
      )}
    </button>
  );
};

export default NotificationBell;

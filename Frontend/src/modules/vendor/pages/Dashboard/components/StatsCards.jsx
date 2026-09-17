import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiBriefcase, FiCheckCircle } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';

const StatsCards = memo(({ stats }) => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Today's Earnings",
      value: `₹${stats.todayEarnings.toLocaleString()}`,
      icon: FaWallet,
      bg: 'linear-gradient(135deg, #FFFFFF 0%, #FDF2F7 100%)',
      border: '#F3D5E2',
      titleColor: '#8A4565',
      valueColor: '#720C3E',
      iconBg: '#FCEBF3',
      iconColor: '#720C3E',
      onClick: () => navigate('/vendor/wallet')
    },
    {
      title: 'Pending Alerts',
      value: stats.pendingAlerts,
      icon: FiClock,
      bg: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%)',
      border: '#FED7AA',
      titleColor: '#9A3412',
      valueColor: '#C2410C',
      iconBg: '#FFEDD5',
      iconColor: '#C2410C',
      onClick: () => navigate('/vendor/booking-alerts')
    },
    {
      title: 'Active Jobs',
      value: stats.activeJobs,
      icon: FiBriefcase,
      bg: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
      border: '#BFDBFE',
      titleColor: '#1E40AF',
      valueColor: '#2563EB',
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      onClick: () => navigate('/vendor/jobs')
    },
    {
      title: 'Completed',
      value: stats.completedJobs,
      icon: FiCheckCircle,
      bg: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
      border: '#BBF7D0',
      titleColor: '#166534',
      valueColor: '#15803D',
      iconBg: '#DCFCE7',
      iconColor: '#15803D',
      onClick: () => navigate('/vendor/jobs')
    }
  ];

  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-2 gap-3 mb-2">
        {cards.map((card, index) => {
          const IconComponent = card.icon;

          return (
            <div
              key={index}
              onClick={card.onClick}
              className="rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
              style={{
                background: card.bg,
                border: `1.5px solid ${card.border}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <p 
                    className="text-[11px] font-bold mb-1 uppercase tracking-wider truncate"
                    style={{ color: card.titleColor }}
                  >
                    {card.title}
                  </p>
                  <p 
                    className="text-2xl font-black leading-tight truncate"
                    style={{ color: card.valueColor }}
                  >
                    {card.value}
                  </p>
                </div>
                <div
                  className="p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center shadow-xs"
                  style={{
                    background: card.iconBg,
                  }}
                >
                  <IconComponent className="w-5 h-5" style={{ color: card.iconColor }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StatsCards.displayName = 'VendorStatsCards';

export default StatsCards;

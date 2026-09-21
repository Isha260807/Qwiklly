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
      onClick: () => navigate('/vendor/wallet')
    },
    {
      title: 'Pending Alerts',
      value: stats.pendingAlerts,
      icon: FiClock,
      onClick: () => navigate('/vendor/booking-alerts')
    },
    {
      title: 'Active Jobs',
      value: stats.activeJobs,
      icon: FiBriefcase,
      onClick: () => navigate('/vendor/jobs')
    },
    {
      title: 'Completed',
      value: stats.completedJobs,
      icon: FiCheckCircle,
      onClick: () => navigate('/vendor/jobs')
    }
  ];

  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-2 gap-3 mb-2 items-stretch">
        {cards.map((card, index) => {
          const IconComponent = card.icon;

          return (
            <div
              key={index}
              onClick={card.onClick}
              className="bg-white rounded-xl p-3 sm:p-3.5 relative overflow-hidden cursor-pointer active:scale-95 transition-all duration-200 border border-gray-200/90 shadow-sm hover:shadow-md hover:border-[#720C3E]/20 flex flex-col justify-between h-full"
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#6F5A64] uppercase tracking-wider leading-tight min-h-[26px] flex items-center">
                    {card.title}
                  </p>
                  <p className="text-lg sm:text-xl font-black text-[#24151D] leading-none mt-1 truncate">
                    {card.value}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex-shrink-0 flex items-center justify-center bg-[#FCEBF3] text-[#720C3E] self-start mt-0.5">
                  <IconComponent className="w-4 h-4" />
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

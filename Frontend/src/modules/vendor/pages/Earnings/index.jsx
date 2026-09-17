import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiTrendingUp, FiCalendar, FiArrowRight, FiArrowDown, FiArrowUp } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import LogoLoader from '../../../../components/common/LogoLoader';
import vendorWalletService from '../../../../services/vendorWalletService';
import { toast } from 'react-hot-toast';

const Earnings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState({
    balance: 0,
    dues: 0,
    earnings: 0,
    totalCashCollected: 0,
    totalSettled: 0,
    totalWithdrawn: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all'); // all, today, week, month

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

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      const [walletRes, txnRes] = await Promise.all([
        vendorWalletService.getWallet(),
        vendorWalletService.getTransactions({ limit: 50 })
      ]);

      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data);
      }

      if (txnRes.success && txnRes.data) {
        setTransactions(txnRes.data);
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarningsData();
  }, []);

  // Compute stats from transactions and wallet
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.createdAt || t.date);
      const amount = Number(t.amount || 0);

      // Only count positive earning credits or cash collections
      if (t.type === 'earnings_credit' || t.type === 'commission' || amount > 0) {
        if (tDate >= todayStart) todayTotal += amount;
        if (tDate >= weekStart) weekTotal += amount;
        if (tDate >= monthStart) monthTotal += amount;
      }
    });

    return {
      today: todayTotal,
      week: weekTotal || wallet.earnings || 0,
      month: monthTotal || wallet.earnings || 0,
      total: wallet.earnings || wallet.balance || 0,
    };
  }, [transactions, wallet]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    const now = new Date();
    return transactions.filter(t => {
      const tDate = new Date(t.createdAt || t.date);
      if (filter === 'today') {
        return tDate.toDateString() === now.toDateString();
      }
      if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return tDate >= weekAgo;
      }
      if (filter === 'month') {
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, filter]);

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Earnings & Analytics" />

      <main className="px-4 py-6 space-y-5">
        {/* Earnings Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl p-4 shadow-xs border border-[#F3D5E2]"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FDF2F7 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-[#8A4565] uppercase tracking-wider">Today</p>
              <div className="p-1.5 rounded-lg bg-[#FCEBF3] text-[#720C3E]">
                <FiCalendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#720C3E]">
              ₹{stats.today.toLocaleString()}
            </p>
          </div>

          <div
            className="rounded-2xl p-4 shadow-xs border border-[#FED7AA]"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-[#9A3412] uppercase tracking-wider">This Week</p>
              <div className="p-1.5 rounded-lg bg-[#FFEDD5] text-[#C2410C]">
                <FiTrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#C2410C]">
              ₹{stats.week.toLocaleString()}
            </p>
          </div>

          <div
            className="rounded-2xl p-4 shadow-xs border border-[#BFDBFE]"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider">This Month</p>
              <div className="p-1.5 rounded-lg bg-[#DBEAFE] text-[#2563EB]">
                <FiDollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#2563EB]">
              ₹{stats.month.toLocaleString()}
            </p>
          </div>

          <div
            className="rounded-2xl p-4 shadow-xs border border-[#BBF7D0]"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-[#166534] uppercase tracking-wider">Total Earnings</p>
              <div className="p-1.5 rounded-lg bg-[#DCFCE7] text-[#15803D]">
                <FaWallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#15803D]">
              ₹{stats.total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'All History' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`px-4 py-2 rounded-xl font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                filter === filterOption.id
                  ? 'bg-[#720C3E] text-white shadow-xs'
                  : 'bg-white text-[#6F5A64] hover:bg-gray-50 border border-[#E8D9DF]/60'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        {/* Earnings & Transactions History */}
        <div>
          <h3 className="font-bold text-[#24151D] text-base mb-3">Earnings History</h3>
          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-xs border border-[#E8D9DF]/60">
              <FaWallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-[#24151D] font-bold text-sm mb-1">No transactions found</p>
              <p className="text-xs text-[#6F5A64]">Completed jobs & earnings will appear here</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTransactions.map((item, index) => {
                const isCredit = item.type === 'earnings_credit' || item.type === 'settlement' || (item.amount > 0 && item.type !== 'cash_collected');
                return (
                  <div
                    key={item._id || item.id || index}
                    className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E8D9DF]/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isCredit ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-[#24151D] text-sm capitalize">
                          {item.description || item.serviceType || (item.type?.replace(/_/g, ' ') || 'Transaction')}
                        </p>
                        <p className="text-xs text-[#6F5A64]">
                          {new Date(item.createdAt || item.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-black ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : '-'}₹{Math.abs(item.amount || 0).toLocaleString()}
                      </p>
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        {item.status || 'Completed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View Wallet Button */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/vendor/wallet')}
            className="w-full py-3.5 rounded-2xl font-bold text-white bg-[#720C3E] hover:bg-[#4D082A] flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md shadow-[#720C3E]/20 cursor-pointer"
          >
            <span>Open Wallet & Dues</span>
            <FiArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default Earnings;

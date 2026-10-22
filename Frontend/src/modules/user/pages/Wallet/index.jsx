import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiLoader } from 'react-icons/fi';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../../services/walletService';
import LogoLoader from '../../../../components/common/LogoLoader';
import NotificationBell from '../../components/common/NotificationBell';
import { themeColors } from '../../../../theme';

const PAGE_SIZE = 8;

const Wallet = () => {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [transactionSummary, setTransactionSummary] = useState(null);

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setLoading(true);
        const [balanceResponse, transactionsResponse] = await Promise.all([
          walletService.getBalance(),
          walletService.getTransactions({
            page,
            limit: PAGE_SIZE,
            startDate: dateFilter.startDate,
            endDate: dateFilter.endDate
          })
        ]);

        if (balanceResponse.success) {
          setWalletBalance(balanceResponse.data.balance || 0);
        }

        if (transactionsResponse.success) {
          setTransactions(transactionsResponse.data || []);
          setPagination(transactionsResponse.pagination || { page, limit: PAGE_SIZE, total: 0, pages: 0 });
          setTransactionSummary(transactionsResponse.summary || null);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    };

    loadWalletData();
  }, [page, dateFilter]);

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const clearDateFilter = () => {
    setDateFilter({ startDate: '', endDate: '' });
    setPage(1);
  };

  const totalSpent = transactionSummary?.totalSpent ?? transactions
    .filter(t => ['payment', 'withdrawal', 'platform_fee', 'convenience_fee', 'gst', 'worker_payment', 'cash_collected'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEarned = transactionSummary?.totalEarned ?? transactions
    .filter(t => ['credit', 'referral', 'refund', 'topup', 'cashback'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen pb-20 relative bg-white">
      {/* Refined Brand Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.teal || '#347989'}25 0%, transparent 70%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}20 0%, transparent 70%),
              radial-gradient(at 100% 100%, ${themeColors?.brand?.orange || '#BB5F36'}15 0%, transparent 75%),
              radial-gradient(at 0% 100%, ${themeColors?.brand?.teal || '#347989'}10 0%, transparent 70%),
              radial-gradient(at 50% 50%, ${themeColors?.brand?.teal || '#347989'}03 0%, transparent 100%),
              #FFFFFF
            `
          }}
        />
        {/* Elegant Dot Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.teal || '#347989'} 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Compact Header */}
        <header 
          className="sticky top-0 z-40 text-white shadow-md select-none px-3.5 py-2.5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm"
              title="Go Back"
            >
              <FiArrowLeft className="w-4 h-4 text-white" />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">Wallet</h1>
          </div>
          <NotificationBell 
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/20 shadow-sm relative shrink-0 cursor-pointer"
            iconClassName="w-4 h-4 text-white stroke-[2]"
            dotClassName="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF2D55] rounded-full ring-1 ring-white/90 shadow-xs"
          />
        </header>

        <main className="px-3.5 py-3 max-w-lg mx-auto">
          {/* Referral Banner */}
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border border-purple-100/70 rounded-xl p-3 mb-3 relative overflow-hidden flex items-center justify-between shadow-xs">
            <div className="relative z-10 pr-2">
              <h2 className="text-xs font-bold text-gray-900 mb-0.5">Refer your friends and earn</h2>
              <p className="text-[11px] text-gray-600">They get ₹100 and you get ₹100</p>
            </div>
            {/* Gift Box Icon */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 bg-purple-500/10 border border-purple-200/50 rounded-xl flex items-center justify-center shadow-xs">
                <span className="text-xl">🎁</span>
              </div>
            </div>
          </div>

          {/* Main Wallet Balance Card */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 rounded-xl p-3.5 mb-3 text-white shadow-md relative overflow-hidden border border-gray-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.03] rounded-full -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/[0.02] rounded-full -ml-8 -mb-8 pointer-events-none"></div>

            <div className="relative z-10">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">Wallet Balance</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <h2 className="text-2xl font-bold text-emerald-400 tracking-tight">
                  ₹{walletBalance.toLocaleString('en-IN')}
                </h2>
                <span className="text-[11px] font-medium text-emerald-300">Available</span>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mb-1.5">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-[10px] font-medium">Total Spent</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                ₹{totalSpent.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mb-1.5">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 3 3 3 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16c1.11 0 2.08-.402 2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-[10px] font-medium">Wallet Earned</p>
              <p className="text-sm font-bold text-green-600 mt-0.5">
                ₹{totalEarned.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Transaction Date Filter */}
          <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-800">Filter by date</p>
              {(dateFilter.startDate || dateFilter.endDate) && (
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="text-[10px] font-semibold text-pink-700"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-medium text-gray-500">
                From
                <input
                  type="date"
                  value={dateFilter.startDate}
                  max={dateFilter.endDate || undefined}
                  onChange={(event) => handleDateFilterChange('startDate', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-pink-400"
                />
              </label>
              <label className="text-[10px] font-medium text-gray-500">
                To
                <input
                  type="date"
                  value={dateFilter.endDate}
                  min={dateFilter.startDate || undefined}
                  onChange={(event) => handleDateFilterChange('endDate', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-pink-400"
                />
              </label>
            </div>
          </div>

          {/* Recent Transactions List */}
          <div>
            <h3 className="text-xs font-bold text-gray-900 mb-2">Recent Transactions</h3>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-12">
                  <LogoLoader fullScreen={false} />
                  <p className="text-xs text-gray-400 mt-2">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/80 border border-dashed border-gray-200 rounded-xl">
                  <p className="text-xs font-medium text-gray-400">No transactions found for the selected dates</p>
                </div>
              ) : (
                transactions.map((item, index) => {
                  const date = new Date(item.date);
                  const formattedDate = date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  // Determine styles based on transaction type
                  let typeStyle = { color: 'text-gray-600', bg: 'bg-gray-100', icon: '•', sign: '' };

                  if (['credit', 'refund', 'topup', 'referral', 'cashback', 'cash_collected'].includes(item.type)) {
                    typeStyle = { color: 'text-green-600', bg: 'bg-green-50', icon: '↓', sign: '' };
                  } else if (['payment', 'withdrawal'].includes(item.type)) {
                    typeStyle = { color: 'text-red-600', bg: 'bg-red-50', icon: '↑', sign: '-' };
                  } else if (['penalty', 'fine', 'cancellation_fee', 'debit'].includes(item.type)) {
                    typeStyle = { color: 'text-orange-600', bg: 'bg-orange-50', icon: '!', sign: '-' };
                  }

                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeStyle.bg}`}
                        >
                          <span className={`text-xs font-bold ${typeStyle.color}`}>
                            {item.type === 'penalty' ? '!' : typeStyle.sign || '•'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {item.description || item.title || 'Transaction'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-gray-400">{formattedDate}</p>
                            {item.type && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded capitalize font-medium ${typeStyle.bg} ${typeStyle.color}`}>
                                {item.type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <p className={`text-xs font-bold ${typeStyle.color}`}>
                          {typeStyle.sign}₹{item.amount.toLocaleString('en-IN')}
                        </p>
                        {item.balanceAfter !== undefined && (
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            Bal: ₹{item.balanceAfter.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {!loading && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => setPage(currentPage => currentPage - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronLeft className="w-3 h-3" />
                  Previous
                </button>
                <span className="text-[10px] font-medium text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage => currentPage + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <FiChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Wallet;

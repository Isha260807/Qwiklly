import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiDollarSign, 
  FiArrowUp, 
  FiArrowRight, 
  FiClock, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiTrendingUp,
  FiCreditCard
} from 'react-icons/fi';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LogoLoader from '../../../../components/common/LogoLoader';
import vendorWalletService from '../../../../services/vendorWalletService';
import { toast } from 'react-hot-toast';

const Wallet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState({
    balance: 0,
    earnings: 0,
    totalWithdrawn: 0,
    pendingSettlements: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');

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

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletRes, txnRes] = await Promise.all([
        vendorWalletService.getWallet(),
        vendorWalletService.getTransactions({ limit: 50 })
      ]);

      if (walletRes.success) {
        setWallet(walletRes.data);
      }

      if (txnRes.success) {
        setTransactions(txnRes.data || []);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    if (filter === 'all') return true;
    return txn.type === filter;
  });

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earnings_credit':
        return <FiArrowUp className="w-5 h-5 text-emerald-600" />;
      case 'withdrawal':
        return <FiDollarSign className="w-5 h-5 text-purple-600" />;
      case 'tds_deduction':
        return <FiAlertCircle className="w-5 h-5 text-amber-600" />;
      case 'commission':
        return <FiDollarSign className="w-5 h-5 text-orange-600" />;
      case 'platform_fee':
        return <FiAlertCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <FiDollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'earnings_credit':
        return 'Earnings Credited';
      case 'withdrawal':
        return 'Withdrawal Payout';
      case 'tds_deduction':
        return 'TDS Deduction';
      case 'commission':
        return 'Commission';
      case 'platform_fee':
        return 'Platform Charge';
      default:
        return type?.replace(/_/g, ' ') || 'Transaction';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return <LogoLoader />;
  }

  const lifetimeEarnings = (wallet.earnings || 0) + (wallet.totalWithdrawn || 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Wallet" />

      <main className="px-4 py-3 max-w-lg mx-auto">
        {/* Available Earnings Card */}
        <div 
          className="rounded-2xl p-4 shadow-sm relative overflow-hidden mb-3 border border-[#E8D9DF]" 
          style={{ background: 'linear-gradient(135deg, #FCEBF3 0%, #FFF5F9 100%)' }}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[#6F5A64] text-xs font-semibold mb-1 uppercase tracking-wider">Available Balance</p>
                <p className="text-3xl font-extrabold text-[#720C3E]">₹{(wallet.earnings || 0).toLocaleString()}</p>
                <p className="text-[11px] text-[#6F5A64]/80 mt-1">Available for immediate payout</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white shadow-xs border border-[#E8D9DF]">
                <FiDollarSign className="w-6 h-6 text-[#720C3E]" />
              </div>
            </div>
            
            <button
              onClick={() => navigate('/vendor/wallet/withdraw')}
              disabled={(wallet.earnings || 0) <= 0}
              className="w-full py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all text-white shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)' }}
            >
              <FiCreditCard className="w-3.5 h-3.5" />
              <span>Request Withdrawal</span>
            </button>
          </div>
        </div>

        {/* Lifetime Earnings & Withdrawn Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3.5 shadow-xs border border-[#E8D9DF]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <FiTrendingUp className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-[#6F5A64] font-semibold">Total Earned</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              ₹{lifetimeEarnings.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Lifetime earnings</p>
          </div>

          <div className="bg-white rounded-xl p-3.5 shadow-xs border border-[#E8D9DF]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <FiCheckCircle className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-[#6F5A64] font-semibold">Total Withdrawn</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              ₹{(wallet.totalWithdrawn || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Paid out to bank</p>
          </div>
        </div>

        {/* Filter Tags */}
        <div className="flex gap-2 mb-3.5 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'All' },
            { id: 'earnings_credit', label: 'Earnings' },
            { id: 'withdrawal', label: 'Withdrawals' },
            { id: 'tds_deduction', label: 'TDS' },
            { id: 'platform_fee', label: 'Platform Fees' },
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`px-3.5 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                filter === filterOption.id
                  ? 'text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
              style={
                filter === filterOption.id
                  ? {
                      background: themeColors.button,
                    }
                  : {}
              }
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        {/* Transactions / Ledger */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Transaction History</h3>
            <span className="text-[11px] text-gray-400 font-medium">{filteredTransactions.length} records</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-xs border border-gray-100">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiDollarSign className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-700 font-bold text-xs mb-1">No transactions found</p>
              <p className="text-[11px] text-gray-400">Your completed booking payouts will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((txn) => {
                const isDebit = ['tds_deduction', 'withdrawal', 'platform_fee'].includes(txn.type);
                return (
                  <div
                    key={txn._id}
                    className="bg-white rounded-xl p-3 shadow-xs border border-gray-100 flex items-center gap-3 transition-all"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background:
                          txn.type === 'earnings_credit' ? '#ECFDF5' :
                          txn.type === 'withdrawal' ? '#F5F3FF' :
                          txn.type === 'tds_deduction' ? '#FFFBEB' :
                          txn.type === 'platform_fee' ? '#FFF1F2' : '#F3F4F6'
                      }}
                    >
                      {getTransactionIcon(txn.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-bold text-gray-900 text-xs truncate">
                          {getTransactionLabel(txn.type)}
                        </p>
                        <p className={`text-sm font-extrabold ${isDebit ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isDebit ? '-' : '+'}₹{Math.abs(txn.amount).toLocaleString()}
                        </p>
                      </div>

                      <p className="text-[11px] text-gray-500 truncate mb-1">
                        {txn.description || txn.bookingId?.bookingNumber || 'Transaction details'}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(txn.createdAt)}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                          txn.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          txn.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                          'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}>
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Wallet;

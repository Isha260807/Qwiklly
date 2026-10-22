import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiDownload,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiRefreshCw,
  FiBriefcase,
  FiCreditCard,
  FiFilter,
  FiX
} from 'react-icons/fi';
import { adminSalaryService } from '../../../../services/salaryService';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../../../utils/csvExport';

const emptyEarningsSummary = {
  totalEarning: 0,
  pendingEarning: 0,
  paidEarning: 0,
  bookingEarning: 0,
  salaryAmount: 0,
  bonusAmount: 0,
  incentiveAmount: 0,
  adjustmentAmount: 0,
  customAmount: 0,
  recordCount: 0
};

const emptyPaymentsSummary = {
  totalAmount: 0,
  bookingEarningsAmount: 0,
  salaryAmount: 0,
  bonusAmount: 0,
  incentiveAmount: 0,
  adjustmentAmount: 0,
  paymentCount: 0
};

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
}).format(Number(value) || 0);

const dateText = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const dateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

const rangeFor = (preset) => {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(start);

  if (preset === 'this_week') {
    const mondayOffset = start.getDay() === 0 ? -6 : 1 - start.getDay();
    start.setDate(start.getDate() + mondayOffset);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (preset === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (preset === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  }

  return { startDate: dateInput(start), endDate: dateInput(end) };
};

const typeLabel = (type) => ({
  booking_earning: 'Booking earning',
  salary: 'Salary',
  bonus: 'Bonus',
  incentive: 'Incentive',
  adjustment: 'Adjustment',
  custom: 'Custom earning'
}[type] || String(type || 'Earning').replaceAll('_', ' '));

const statusLabel = (status) => ({
  pending_rate: 'Pending rate',
  accrued: 'Pending payment',
  paid: 'Paid',
  reversed: 'Reversed',
  processing: 'Processing',
  cancelled: 'Cancelled'
}[status] || status || '-');

const statusClass = (status) => {
  if (status === 'paid') return 'bg-green-100 text-green-700';
  if (status === 'accrued' || status === 'processing') return 'bg-yellow-100 text-yellow-700';
  if (status === 'reversed' || status === 'cancelled') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const VendorPayments = () => {
  const [view, setView] = useState('earnings');
  const [earnings, setEarnings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(emptyEarningsSummary);
  const [paymentsSummary, setPaymentsSummary] = useState(emptyPaymentsSummary);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    paymentMethod: 'all',
    preset: 'custom',
    startDate: '',
    endDate: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPagination((current) => ({ ...current, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchData();
  }, [
    view,
    pagination.page,
    debouncedSearch,
    filters.status,
    filters.type,
    filters.paymentMethod,
    filters.startDate,
    filters.endDate
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const commonParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const [earningsResponse, paymentsResponse] = await Promise.all([
        adminSalaryService.getAllEarnings({
          ...commonParams,
          status: view === 'earnings' ? filters.status : 'all',
          type: view === 'earnings' ? filters.type : 'all'
        }),
        adminSalaryService.getAllPayments({
          ...commonParams,
          status: view === 'payments' ? filters.status : 'all',
          paymentMethod: view === 'payments' ? filters.paymentMethod : 'all'
        })
      ]);

      if (!earningsResponse.success || !paymentsResponse.success) {
        throw new Error(earningsResponse.message || paymentsResponse.message || 'Failed to load salary data');
      }

      setEarnings(earningsResponse.data || []);
      setPayments(paymentsResponse.data || []);
      setEarningsSummary({ ...emptyEarningsSummary, ...(earningsResponse.summary || {}) });
      setPaymentsSummary({ ...emptyPaymentsSummary, ...(paymentsResponse.summary || {}) });

      const activePagination = view === 'earnings'
        ? earningsResponse.pagination
        : paymentsResponse.pagination;

      setPagination((current) => ({
        ...current,
        total: activePagination?.total || 0,
        pages: activePagination?.pages || 1
      }));
    } catch (error) {
      console.error('Error fetching vendor salary data:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const changePreset = (event) => {
    const preset = event.target.value;
    if (preset === 'custom') {
      setFilters((current) => ({ ...current, preset, startDate: '', endDate: '' }));
    } else {
      const range = rangeFor(preset);
      setFilters((current) => ({ ...current, preset, ...range }));
    }
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      type: 'all',
      paymentMethod: 'all',
      preset: 'custom',
      startDate: '',
      endDate: ''
    });
    setDebouncedSearch('');
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const changeView = (nextView) => {
    setView(nextView);
    setFilters((current) => ({ ...current, status: 'all', type: 'all', paymentMethod: 'all' }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const exportCurrent = () => {
    const rows = view === 'earnings' ? earnings : payments;
    if (!rows.length) {
      toast.error('No salary records to export');
      return;
    }

    if (view === 'earnings') {
      exportToCSV(rows, 'vendor_salary_earnings', [
        { key: '_id', label: 'Earning ID' },
        { key: 'vendorId.businessName', label: 'Business Name' },
        { key: 'vendorId.name', label: 'Vendor Name' },
        { key: 'vendorId.phone', label: 'Phone' },
        { key: 'bookingId.bookingNumber', label: 'Booking Number' },
        { key: 'type', label: 'Earning Type' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'status', label: 'Status' },
        { key: 'earningDate', label: 'Earning Date', type: 'datetime' }
      ]);
    } else {
      exportToCSV(rows, 'vendor_salary_payments', [
        { key: '_id', label: 'Payment ID' },
        { key: 'vendorId.businessName', label: 'Business Name' },
        { key: 'vendorId.name', label: 'Vendor Name' },
        { key: 'vendorId.phone', label: 'Phone' },
        { key: 'periodType', label: 'Period' },
        { key: 'periodStart', label: 'Period Start', type: 'datetime' },
        { key: 'periodEnd', label: 'Period End', type: 'datetime' },
        { key: 'bookingEarningsAmount', label: 'Booking Earning', type: 'currency' },
        { key: 'salaryAmount', label: 'Salary', type: 'currency' },
        { key: 'bonusAmount', label: 'Bonus', type: 'currency' },
        { key: 'incentiveAmount', label: 'Incentive', type: 'currency' },
        { key: 'totalAmount', label: 'Total Paid', type: 'currency' },
        { key: 'paymentMethod', label: 'Payment Method' },
        { key: 'status', label: 'Status' },
        { key: 'paidAt', label: 'Paid Date', type: 'datetime' }
      ]);
    }
    toast.success('Salary report exported');
  };

  const activeRows = view === 'earnings' ? earnings : payments;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Salary Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">Track salary earnings and admin payroll payments. No vendor withdrawal or settlement flow.</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-50"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center mb-4"><FiDollarSign /></div>
          <p className="text-sm text-gray-500">Total salary earned</p>
          <p className="text-2xl font-bold text-[#720C3E] mt-1">{money(earningsSummary.totalEarning)}</p>
          <p className="text-xs text-gray-400 mt-1">{earningsSummary.recordCount || 0} ledger records</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7FA] text-[#9E2A2B] flex items-center justify-center mb-4"><FiClock /></div>
          <p className="text-sm text-gray-500">Pending salary</p>
          <p className="text-2xl font-bold text-[#9E2A2B] mt-1">{money(earningsSummary.pendingEarning)}</p>
          <p className="text-xs text-gray-400 mt-1">Accrued and awaiting payroll</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4"><FiCheckCircle /></div>
          <p className="text-sm text-gray-500">Salary paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{money(paymentsSummary.totalAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">{paymentsSummary.paymentCount || 0} payroll payments</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center mb-4"><FiBriefcase /></div>
          <p className="text-sm text-gray-500">Booking earnings</p>
          <p className="text-2xl font-bold text-[#720C3E] mt-1">{money(earningsSummary.bookingEarning)}</p>
          <p className="text-xs text-gray-400 mt-1">Duration-based vendor earning</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => changeView('earnings')}
              className={'px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ' + (view === 'earnings' ? 'bg-[#720C3E] text-white shadow-sm' : 'text-gray-600 hover:bg-white')}
            >
              <FiDollarSign /> Salary earnings
            </button>
            <button
              type="button"
              onClick={() => changeView('payments')}
              className={'px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ' + (view === 'payments' ? 'bg-[#720C3E] text-white shadow-sm' : 'text-gray-600 hover:bg-white')}
            >
              <FiCreditCard /> Salary payments
            </button>
          </div>
          <button
            type="button"
            onClick={exportCurrent}
            className="px-4 py-2 bg-[#720C3E] text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-[#5e0932]"
          >
            <FiDownload /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <label className="text-xs font-semibold text-gray-600">
            Search vendor
            <div className="relative mt-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Name, phone, email..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/10"
              />
            </div>
          </label>
          <label className="text-xs font-semibold text-gray-600">
            Quick range
            <select value={filters.preset} onChange={changePreset} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="custom">Custom range</option>
              <option value="this_week">This week</option>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-600">
            From
            <input type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold text-gray-600">
            To
            <input type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </label>
          <div className="flex items-end gap-2">
            {view === 'earnings' ? (
              <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="all">All earning types</option>
                <option value="booking_earning">Booking earning</option>
                <option value="salary">Salary</option>
                <option value="bonus">Bonus</option>
                <option value="incentive">Incentive</option>
                <option value="adjustment">Adjustment</option>
                <option value="custom">Custom earning</option>
              </select>
            ) : (
              <select value={filters.paymentMethod} onChange={(event) => updateFilter('paymentMethod', event.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="all">All payment methods</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1"><FiFilter /> Status</span>
          {(view === 'earnings'
            ? [['all', 'All'], ['accrued', 'Pending'], ['paid', 'Paid'], ['pending_rate', 'Pending rate']]
            : [['all', 'All'], ['paid', 'Paid'], ['processing', 'Processing'], ['cancelled', 'Cancelled']]
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => updateFilter('status', value)}
              className={'px-3 py-1.5 rounded-full text-xs font-semibold ' + (filters.status === value ? 'bg-[#720C3E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            >
              {label}
            </button>
          ))}
          {(filters.search || filters.startDate || filters.endDate || filters.type !== 'all' || filters.paymentMethod !== 'all' || filters.status !== 'all') && (
            <button type="button" onClick={clearFilters} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center gap-1">
              <FiX /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{view === 'earnings' ? 'Salary earning ledger' : 'Salary payment history'}</h2>
            <p className="text-xs text-gray-500 mt-1">Only salary-based vendor records are shown here.</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{pagination.total} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                {view === 'earnings' ? (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Breakdown</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total paid</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={view === 'earnings' ? 5 : 6} className="py-12 text-center text-gray-500"><FiRefreshCw className="inline animate-spin mr-2" />Loading salary records...</td></tr>
              ) : activeRows.length === 0 ? (
                <tr><td colSpan={view === 'earnings' ? 5 : 6} className="py-12 text-center text-gray-500">No salary records found</td></tr>
              ) : view === 'earnings' ? (
                earnings.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center"><FiBriefcase /></div>
                        <div><p className="text-sm font-semibold text-gray-800">{entry.vendorId?.businessName || entry.vendorId?.name || 'Vendor'}</p><p className="text-xs text-gray-500">{entry.vendorId?.phone || '-'}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-800">{typeLabel(entry.type)}</p>
                      <p className="text-xs text-gray-500">{entry.bookingId?.bookingNumber || entry.description || '-'}</p>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600">+{money(entry.amount)}</td>
                    <td className="px-5 py-3"><span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + statusClass(entry.status)}>{statusLabel(entry.status)}</span></td>
                    <td className="px-5 py-3 text-sm text-gray-500">{dateText(entry.earningDate)}</td>
                  </tr>
                ))
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center"><FiBriefcase /></div>
                        <div><p className="text-sm font-semibold text-gray-800">{payment.vendorId?.businessName || payment.vendorId?.name || 'Vendor'}</p><p className="text-xs text-gray-500">{payment.vendorId?.phone || '-'}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><p className="text-sm font-semibold capitalize">{payment.periodType} salary</p><p className="text-xs text-gray-500">{dateText(payment.periodStart)} - {dateText(payment.periodEnd)}</p></td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-bold text-[#720C3E]">{money(payment.totalAmount)}</p>
                      <p className="text-xs text-gray-500">Salary {money(payment.salaryAmount)} · Bonus {money(payment.bonusAmount)} · Incentive {money(payment.incentiveAmount)}</p>
                    </td>
                    <td className="px-5 py-3"><span className="text-sm capitalize">{String(payment.paymentMethod || '-').replaceAll('_', ' ')}</span><span className={'block w-fit mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ' + statusClass(payment.status)}>{statusLabel(payment.status)}</span></td>
                    <td className="px-5 py-3 text-sm text-gray-500">{dateText(payment.paidAt || payment.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && activeRows.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Showing page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} disabled={pagination.page <= 1} className="px-3 py-1.5 text-xs font-semibold rounded border bg-white disabled:opacity-50">Previous</button>
              <button type="button" onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} disabled={pagination.page >= pagination.pages} className="px-3 py-1.5 text-xs font-semibold rounded border bg-white disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default VendorPayments;
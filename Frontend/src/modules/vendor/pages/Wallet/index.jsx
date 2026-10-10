import React, { useEffect, useState } from 'react';
import { FiCreditCard, FiDollarSign, FiFilter, FiChevronDown } from 'react-icons/fi';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LogoLoader from '../../../../components/common/LogoLoader';
import { vendorSalaryService } from '../../../../services/salaryService';
import { toast } from 'react-hot-toast';

const money = (v) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dateText = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const durationText = (v) => {
  const n = Number(v || 0); const h = Math.floor(n / 60); const m = n % 60;
  return h ? h + 'h' + (m ? ' ' + m + 'm' : '') : (m ? m + 'm' : '');
};
const labelFor = (v) => ({ booking_earning: 'Booking earning', salary: 'Salary', bonus: 'Performance bonus', incentive: 'Incentive', adjustment: 'Adjustment', custom: 'Custom earning' }[v] || 'Earning');
const paymentBreakdown = (payment) => {
  const items = [];
  const add = (label, amount) => {
    if (Number(amount || 0) > 0) items.push({ label, amount });
  };

  add('Booking earning', payment.bookingEarningsAmount);
  add('Salary', payment.salaryAmount);
  add('Bonus', payment.bonusAmount);
  add('Incentive', payment.incentiveAmount);
  add('Adjustment', payment.adjustmentAmount);
  (Array.isArray(payment.customItems) ? payment.customItems : []).forEach((item) => {
    add(item.label || 'Other earning', item.amount);
  });

  return items;
};

function PaymentHistory({ payments = [] }) {
  if (!payments.length) return <div className={'px-5 py-10 text-center'}><p className={'text-xs'}>No payments yet</p></div>;
  return payments.map((payment) => (
    <div key={payment._id} className={'px-4 py-3 border-b border-gray-100'}>
      <div className={'flex items-start justify-between gap-2'}>
        <div>
          <b className={'text-xs capitalize block text-[#24151D]'}>{payment.periodType} payment</b>
          <span className={'text-[10px] text-gray-500 block'}>{dateText(payment.periodStart)} - {dateText(payment.periodEnd)}</span>
        </div>
        <strong className={'text-sm text-blue-600 shrink-0'}>{money(payment.totalAmount)}</strong>
      </div>
      <div className={'mt-2 rounded-lg bg-[#FAF6F8] border border-[#F0E3E8] px-2.5 py-2'}>
        <p className={'text-[9px] uppercase tracking-wide font-bold text-[#8A6C79] mb-1'}>Payment breakdown</p>
        <div className={'grid grid-cols-2 gap-x-3 gap-y-1'}>{paymentBreakdown(payment).map((item, index) => (
        <div key={item.label + index} className={'flex items-center justify-between gap-1 text-[10px]'}><span className={'text-[#6F5A64] truncate'}>{item.label}</span> <b className={'text-[#24151D] shrink-0'}>{money(item.amount)}</b></div>
        ))}</div>
      </div>
    </div>
  ));
}

export default function Wallet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [historyTab, setHistoryTab] = useState('earnings');
  const [adminSalaryOpen, setAdminSalaryOpen] = useState(false);
  const load = async (params = {}) => {
    try {
      setLoading(true);
      const res = await vendorSalaryService.getWallet(params);
      if (!res.success) throw new Error(res.message || 'Failed to load earnings');
      setData(res.data);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to load earnings');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  if (loading && !data) return <LogoLoader />;
  const summary = data?.summary || {};
  const config = data?.salaryConfig || {};
  const cards = [['Total earning', summary.totalEarning], ['Paid amount', summary.paidEarning], ['Pending payment', summary.pendingEarning], ['Booking earning', summary.bookingEarning]];
  return <div className="min-h-screen pb-24 bg-[#FFF8FB]">
    <Header title="Earning" />
    <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <section className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#720C3E,#A62D64)' }}>
        <p className="text-xs uppercase tracking-wider text-white/75">Earning</p><p className="text-3xl font-black mt-1">{money(summary.todayEarn)}</p>
        <p className="text-[11px] text-white/75 mt-1">Calculated from completed bookings</p>
        <div className="mt-4 pt-3 border-t border-white/20 flex justify-between text-xs"><span>Current rate</span><b>{config.rateAmount ? money(config.rateAmount) + ' / ' + (config.rateUnitMinutes || 60) + ' min' : 'Rate not configured'}</b></div>
      </section>
      <section className="grid grid-cols-2 gap-3">{cards.map(([title, value]) => <div key={title} className="bg-white rounded-xl p-3.5 border border-[#E8D9DF]"><p className="text-[11px] text-gray-500 font-semibold">{title}</p><p className="text-lg font-black mt-1">{money(value)}</p></div>)}</section>
      <form onSubmit={(e) => { e.preventDefault(); load(filters); }} className="bg-white rounded-xl p-3.5 border border-gray-100">
        <div className="flex items-center gap-2 mb-3"><FiFilter className="text-[#720C3E]" /><b className="text-xs">Filter earning by date</b></div>
        <div className="grid grid-cols-2 gap-2"><input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="border rounded-lg px-2 py-2 text-xs" /><input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="border rounded-lg px-2 py-2 text-xs" /></div>
        <div className="flex gap-2 mt-2"><button className="flex-1 rounded-lg py-2 text-xs font-bold text-white bg-[#720C3E]">Apply filter</button><button type="button" onClick={() => { const x = { startDate: '', endDate: '' }; setFilters(x); load(x); }} className="px-4 rounded-lg bg-gray-100 text-xs font-bold">Clear</button></div>
      </form>
      <section className="bg-white rounded-2xl border border-[#E8D9DF]/80 shadow-[0_6px_20px_rgba(114,12,62,0.05)] overflow-hidden">
        <div className="p-4 pb-3 border-b border-[#E8D9DF]/70">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#24151D]">Earnings & payments</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Track your salary records</p>
            </div>
            <span className="px-2 py-1 rounded-full bg-[#FCEBF3] text-[#720C3E] text-[10px] font-bold">
              {historyTab === 'earnings' ? (data?.earningsPagination?.total || 0) + ' records' : (data?.paymentsPagination?.total || 0) + ' payments'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F8F2F5] border border-[#E8D9DF]/70">
            <button type="button" onClick={() => setHistoryTab('earnings')} className={'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[10px] font-bold transition-all ' + (historyTab === 'earnings' ? 'bg-[#720C3E] text-white shadow-sm' : 'text-[#6F5A64]') }><FiDollarSign className="w-3.5 h-3.5" /> Earnings</button>
            <button type="button" onClick={() => setHistoryTab('payments')} className={'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[10px] font-bold transition-all ' + (historyTab === 'payments' ? 'bg-[#720C3E] text-white shadow-sm' : 'text-[#6F5A64]') }><FiCreditCard className="w-3.5 h-3.5" /> Payments</button>
          </div>
        </div>
        {historyTab === 'earnings' ? (
          <>
            {!data?.earnings?.length ? <div className="px-5 py-10 text-center"><div className="w-11 h-11 mx-auto rounded-full bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center"><FiDollarSign className="w-5 h-5" /></div><p className="text-xs font-semibold text-[#3D2B34] mt-3">No earnings yet</p><p className="text-[10px] text-gray-400 mt-1">Completed booking earnings will appear here.</p></div> : data.earnings.map((e) => <div key={e._id} className="px-4 py-3 border-b border-gray-100 flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><FiDollarSign className="w-4 h-4" /></div><div className="flex-1 min-w-0"><b className="text-xs block truncate text-[#24151D]">{labelFor(e.type)}</b><span className="text-[10px] text-gray-500 block truncate">{e.bookingId?.bookingNumber || e.description}</span><span className="text-[10px] text-gray-400">{dateText(e.earningDate)}{e.durationMinutes ? ' • ' + durationText(e.durationMinutes) : ''}</span></div><strong className="text-sm text-emerald-600">+{money(e.amount)}</strong></div>)}
          </>
        ) : (
          <>
            <div className={'hidden'}>
            {!data?.payments?.length ? <div className="px-5 py-10 text-center"><div className="w-11 h-11 mx-auto rounded-full bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center"><FiCreditCard className="w-5 h-5" /></div><p className="text-xs font-semibold text-[#3D2B34] mt-3">No payments yet</p><p className="text-[10px] text-gray-400 mt-1">Your salary payment records will appear here.</p></div> : data.payments.map((p) => <div key={p._id} className="px-4 py-3 border-b border-gray-100 flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FiCreditCard className="w-4 h-4" /></div><div className="flex-1 min-w-0"><b className="text-xs capitalize block text-[#24151D]">{p.periodType} payment</b><span className="text-[10px] text-gray-500 block">{dateText(p.periodStart)} - {dateText(p.periodEnd)}</span>{p.customItems?.length ? <div className="text-[10px] text-gray-400 block truncate">{p.customItems.map((item, index) => <span key={item.label + index} className="mr-2">{item.label}: {money(item.amount)}</span>)}</div> : <span className="text-[10px] text-gray-400 block">Salary {money(p.salaryAmount)} • Bonus {money(p.bonusAmount)} • Incentive {money(p.incentiveAmount)}</span>}</div><strong className="text-sm text-blue-600">{money(p.totalAmount)}</strong></div>)}
            </div>
            <PaymentHistory payments={data?.payments} />
          </>
        )}
      </section>
      <div className={'hidden'}>
      <section className={'bg-white rounded-2xl border border-[#E8D9DF] overflow-hidden'}>
        <div className={'p-4 border-b border-[#E8D9DF] flex items-center justify-between'}>
          <div><h3 className={'text-sm font-bold text-[#24151D]'}>Earning history</h3><p className={'text-[10px] text-gray-500 mt-0.5'}>Completed booking earnings</p></div>
          <span className={'px-2 py-1 rounded-full bg-[#FCEBF3] text-[#720C3E] text-[10px] font-bold'}>{data?.earningsPagination?.total || 0} records</span>
        </div>
        {!data?.earnings?.length ? <div className={'px-5 py-8 text-center text-xs text-gray-400'}>No booking earnings yet.</div> : data.earnings.map((entry) => <div key={entry._id} className={'px-4 py-3 border-b border-gray-100 flex items-center gap-3'}><div className={'w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center'}><FiDollarSign className={'w-4 h-4'} /></div><div className={'flex-1 min-w-0'}><b className={'text-xs block truncate text-[#24151D]'}>{labelFor(entry.type)}</b><span className={'text-[10px] text-gray-500 block truncate'}>{entry.bookingId?.bookingNumber || entry.description}</span><span className={'text-[10px] text-gray-400'}>{dateText(entry.earningDate)}{entry.durationMinutes ? ' • ' + durationText(entry.durationMinutes) : ''}</span></div><strong className={'text-sm text-emerald-600'}>+{money(entry.amount)}</strong></div>)}
      </section>
      <section className={'bg-white rounded-2xl border border-[#E8D9DF] overflow-hidden'}>
        <button type={'button'} onClick={() => setAdminSalaryOpen((open) => !open)} className={'w-full p-4 flex items-center justify-between text-left'}>
          <span className={'flex items-center gap-3'}><span className={'w-9 h-9 rounded-lg bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center'}><FiCreditCard className={'w-4 h-4'} /></span><span><b className={'text-sm block text-[#24151D]'}>Admin salary</b><span className={'text-[10px] text-gray-500'}>{data?.paymentsPagination?.total || 0} payment records</span></span></span>
          <FiChevronDown className={'text-[#720C3E]'} style={{ transform: adminSalaryOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
        {adminSalaryOpen && <PaymentHistory payments={data?.payments} />}
      </section>
      </div>
    </main>
    <BottomNav />
  </div>;
}

import React, { useEffect, useState } from 'react';
import { FiCreditCard, FiRefreshCw, FiSettings } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminSalaryService } from '../../../../services/salaryService';

const money = (value) => '\u20B9' + Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dateText = (value) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '-';
const inputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};
const presetRange = (preset) => {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(start);
  if (preset === 'this_week') {
    const mondayOffset = start.getDay() === 0 ? -6 : 1 - start.getDay();
    start.setDate(start.getDate() + mondayOffset);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (preset === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (preset === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  return { startDate: inputDate(start), endDate: inputDate(end) };
};

const today = new Date();
const firstDay = inputDate(new Date(today.getFullYear(), today.getMonth(), 1));
const lastDay = inputDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
const defaultCustomItems = () => [
  { label: 'Salary', amount: '' },
  { label: 'Bonus', amount: '' },
  { label: 'Incentive', amount: '' }
];

export default function VendorSalaryWallets() {
  const [wallets, setWallets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const filterCardTitle = 'Filter total earning';
  const [earningFilter, setEarningFilter] = useState({ startDate: '', endDate: '' });
  const [earningPreset, setEarningPreset] = useState('custom');
  const [rate, setRate] = useState({
    rateAmount: '',
    rateUnitMinutes: 60,
    effectiveFrom: new Date().toISOString().slice(0, 10)
  });
  const [payment, setPayment] = useState({
    periodType: 'month',
    periodStart: firstDay,
    periodEnd: lastDay,
    customItems: defaultCustomItems(),
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: ''
  });

  const loadWallets = async () => {
    try {
      setLoading(true);
      const response = await adminSalaryService.getWallets({ limit: 100 });
      if (!response.success) throw new Error(response.message || 'Failed to load vendor wallets');
      setWallets(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load vendor wallets');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (vendorId, filter = earningFilter) => {
    try {
      setDetail(null);
      const response = await adminSalaryService.getVendorWallet(vendorId, { limit: 100, ...filter });
      if (!response.success) throw new Error(response.message || 'Failed to load wallet');
      setDetail(response.data);
      setRate({
        rateAmount: response.data.vendor.salaryConfig?.rateAmount || '',
        rateUnitMinutes: response.data.vendor.salaryConfig?.rateUnitMinutes || 60,
        effectiveFrom: new Date().toISOString().slice(0, 10)
      });
    } catch (error) {
      toast.error(error.message || 'Failed to load wallet');
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const handleVendorChange = (event) => {
    const vendor = wallets.find((item) => item._id === event.target.value);
    setSelected(vendor || null);
    if (vendor) loadDetail(vendor._id);
    else setDetail(null);
  };

  const applyEarningFilter = async (event) => {
    event.preventDefault();
    if (!selected) return;
    await loadDetail(selected._id, earningFilter);
  };

  const clearEarningFilter = async () => {
    const cleared = { startDate: '', endDate: '' };
    setEarningPreset('custom');
    setEarningFilter(cleared);
    if (selected) await loadDetail(selected._id, cleared);
  };

  const changeEarningPreset = (event) => {
    const preset = event.target.value;
    setEarningPreset(preset);
    if (preset !== 'custom') {
      const range = presetRange(preset);
      setEarningFilter(range);
      if (selected) loadDetail(selected._id, range);
    }
  };

  const refresh = async () => {
    await loadWallets();
    if (selected) await loadDetail(selected._id);
  };

  const updateRate = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await adminSalaryService.updateRate(selected._id, rate);
      if (!response.success) throw new Error(response.message || 'Rate update failed');
      toast.success('Salary rate updated');
      await Promise.all([loadWallets(), loadDetail(selected._id)]);
    } catch (error) {
      toast.error(error.message || 'Rate update failed');
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await adminSalaryService.markPaymentDone(selected._id, payment);
      if (!response.success) throw new Error(response.message || 'Payment failed');
      toast.success(response.message || 'Payment marked as done');
      setPayment((current) => ({
        ...current,
        customItems: defaultCustomItems(),
        paymentReference: '',
        notes: ''
      }));
      await Promise.all([loadWallets(), loadDetail(selected._id)]);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  const changePayment = (event) => {
    setPayment((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateCustomItem = (index, field, value) => {
    setPayment((current) => ({
      ...current,
      customItems: current.customItems.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const addCustomItem = () => {
    setPayment((current) => ({
      ...current,
      customItems: [...current.customItems, { label: '', amount: '' }]
    }));
  };

  const removeCustomItem = (index) => {
    setPayment((current) => ({
      ...current,
      customItems: current.customItems.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const vendor = detail?.vendor;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Salary Wallets</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hourly earnings, salary, bonus, incentive and payments.</p>
        </div>
        <button onClick={refresh} className="px-3 py-2 rounded-lg border bg-white text-sm flex items-center gap-2">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <label htmlFor="vendor-wallet-select" className="block text-sm font-bold text-gray-700 mb-2">Select vendor</label>
        <select id="vendor-wallet-select" value={selected?._id || ''} onChange={handleVendorChange} disabled={loading} className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm outline-none focus:border-rose-600">
          <option value="">{loading ? 'Loading vendors...' : 'Select a vendor'}</option>
          {wallets.map((item) => (
            <option key={item._id} value={item._id}>
              {(item.businessName || item.name || 'Vendor') + (item.phone ? ' - ' + item.phone : '')}
            </option>
          ))}
        </select>
        {!loading && wallets.length === 0 && <p className="text-xs text-gray-500 mt-2">No vendors found.</p>}
      </section>

      {!vendor ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
          Select a vendor to view and manage their salary wallet.
        </div>
      ) : (
        <>
          <form onSubmit={applyEarningFilter} className={'bg-white rounded-2xl border border-gray-100 p-5 space-y-3'}>
            <label className={'block text-xs font-semibold text-gray-600'}>Quick range<select value={earningPreset} onChange={changeEarningPreset} className={'mt-1 w-full border rounded-lg px-3 py-2 text-sm'}><option value={'custom'}>Custom range</option><option value={'this_week'}>This week</option><option value={'this_month'}>This month</option><option value={'last_month'}>Last month</option></select></label>
            <div className={'flex items-center justify-between gap-3'}><div><h3 className={'font-bold text-gray-900'}>Filter total earning</h3><p className={'text-xs text-gray-500 mt-1'}>View earning for a custom date range.</p></div>{(earningFilter.startDate || earningFilter.endDate) && <span className={'text-[11px] font-semibold text-rose-600'}>Filtered</span>}</div>
            <div className={'grid md:grid-cols-2 gap-3'}>
              <label className={'text-xs font-semibold text-gray-600'}>From<input type={'date'} value={earningFilter.startDate} onChange={(event) => setEarningFilter({ ...earningFilter, startDate: event.target.value })} className={'mt-1 w-full border rounded-lg px-3 py-2 text-sm'} /></label>
              <label className={'text-xs font-semibold text-gray-600'}>To<input type={'date'} value={earningFilter.endDate} onChange={(event) => setEarningFilter({ ...earningFilter, endDate: event.target.value })} className={'mt-1 w-full border rounded-lg px-3 py-2 text-sm'} /></label>
            </div>
            <div className={'flex gap-2'}><button type={'submit'} disabled={loading} className={'px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold disabled:opacity-50'}>Apply filter</button><button type={'button'} onClick={clearEarningFilter} disabled={loading} className={'px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold disabled:opacity-50'}>Clear</button></div>
          </form>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{vendor.businessName || vendor.name}</h2>
                <p className="text-xs text-gray-500">{vendor.phone} {'\u2022'} {vendor.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total earning</p>
                <p className="text-2xl font-black text-emerald-600">{money(detail.summary?.totalEarning)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500">Today</p><b>{money(detail.summary?.todayEarn)}</b></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500">Pending</p><b>{money(detail.summary?.pendingEarning)}</b></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500">Paid</p><b>{money(detail.summary?.paidEarning)}</b></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <form onSubmit={updateRate} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h3 className="font-bold flex items-center gap-2"><FiSettings /> Earning rate</h3>
              <label className="block text-xs font-semibold text-gray-600">Amount per unit
                <input required min="1" type="number" value={rate.rateAmount} onChange={(event) => setRate({ ...rate, rateAmount: event.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-gray-600">Billing unit
                <select value={rate.rateUnitMinutes} onChange={(event) => setRate({ ...rate, rateUnitMinutes: Number(event.target.value) })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="60">Per 60 minutes</option><option value="30">Per 30 minutes</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-600">Effective from
                <input required type="date" value={rate.effectiveFrom} onChange={(event) => setRate({ ...rate, effectiveFrom: event.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </label>
              <button disabled={saving} className="w-full py-2 rounded-lg bg-rose-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save rate'}</button>
            </form>

            <form onSubmit={markPaid} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h3 className="font-bold flex items-center gap-2"><FiCreditCard /> Mark payment done</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold">Period
                  <select name="periodType" value={payment.periodType} onChange={changePayment} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm">
                    <option value="week">Week</option><option value="month">Month</option><option value="custom">Custom</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">Method
                  <select name="paymentMethod" value={payment.paymentMethod} onChange={changePayment} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm">
                    <option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="other">Other</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required name="periodStart" type="date" value={payment.periodStart} onChange={changePayment} className="border rounded-lg px-2 py-2 text-sm" />
                <input required name="periodEnd" type="date" value={payment.periodEnd} onChange={changePayment} className="border rounded-lg px-2 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600">Earning fields</p>
                  <button type="button" onClick={addCustomItem} className="text-xs font-bold text-rose-600">+ Add field</button>
                </div>
                {payment.customItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input required value={item.label} onChange={(event) => updateCustomItem(index, 'label', event.target.value)} placeholder="Field name" className="min-w-0 flex-1 border rounded-lg px-2 py-2 text-sm" />
                    <input required min="0" type="number" value={item.amount} onChange={(event) => updateCustomItem(index, 'amount', event.target.value)} placeholder="Amount" className="w-32 border rounded-lg px-2 py-2 text-sm" />
                    <button type="button" onClick={() => removeCustomItem(index)} className="px-2 text-gray-400 hover:text-red-600" aria-label="Remove earning field">x</button>
                  </div>
                ))}
              </div>
              <input name="paymentReference" value={payment.paymentReference} onChange={changePayment} placeholder="Transaction/reference number" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <button disabled={saving} className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Processing...' : 'Payment Done'}</button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b flex justify-between"><h3 className="font-bold">Earning ledger</h3><span className="text-xs text-gray-500">{detail.earnings?.length || 0} records</span></div>
            {!detail.earnings?.length ? <p className="p-6 text-sm text-gray-400">No earnings yet.</p> : detail.earnings.map((entry) => (
              <div key={entry._id} className="p-3 border-b flex justify-between gap-3 text-sm">
                <div><p className="font-semibold">{entry.description}</p><p className="text-xs text-gray-500">{dateText(entry.earningDate)} {entry.durationMinutes ? ' - ' + entry.durationMinutes + ' min' : ''}</p></div>
                <div className="text-right"><b className="text-emerald-600">{money(entry.amount)}</b><p className="text-[10px] uppercase text-gray-400">{entry.status}</p></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiClock, FiSave, FiSlash, FiAlertTriangle } from 'react-icons/fi';
import adminVendorService from '../../../../services/adminVendorService';

// Same one-month window the customer calendar shows.
const BOOKING_WINDOW_DAYS = 30;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const buildDates = (days) => {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return { key: toKey(d), day: d.getDay(), date: d.getDate(), month: MONTHS[d.getMonth()] };
  });
};

/**
 * Per-vendor slot availability, driven by the same slotSettings the parent
 * Settings page edits (hours, interval, blocked slots, advance window) so the
 * two always stay in sync. Vendor slots can only be picked from slots that are
 * currently active in the global setup.
 */
const VendorSlotAvailabilityPanel = ({ slotSettings }) => {
  const days = BOOKING_WINDOW_DAYS;
  const dates = useMemo(() => buildDates(days), [days]);

  const slots = useMemo(() => {
    const start = Number(slotSettings.slotStartHour ?? 9) * 60;
    const end = Number(slotSettings.slotEndHour ?? 21) * 60;
    const interval = Number(slotSettings.slotIntervalMins || 60);
    const blocked = slotSettings.disabledSlots || [];
    const list = [];
    for (let t = start; t < end; t += interval) {
      const value = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
      const h = Math.floor(t / 60);
      list.push({
        value,
        blocked: blocked.includes(value),
        label: `${h % 12 === 0 ? 12 : h % 12}:${pad(t % 60)} ${h >= 12 ? 'PM' : 'AM'}`
      });
    }
    return list;
  }, [slotSettings.slotStartHour, slotSettings.slotEndHour, slotSettings.slotIntervalMins, slotSettings.disabledSlots]);

  const activeValues = useMemo(() => new Set(slots.filter(s => !s.blocked).map(s => s.value)), [slots]);

  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [saved, setSaved] = useState({}); // dateKey -> slots[]
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminVendorService.getAllVendors();
        if (res.success) setVendors(res.data.filter(v => v.approvalStatus === 'approved'));
      } catch (error) {
        toast.error('Failed to load vendors');
      }
    })();
  }, []);

  const loadAvailability = useCallback(async (id) => {
    setSelectedDates([]);
    setSelectedSlots([]);
    if (!id) {
      setSaved({});
      return;
    }
    try {
      const res = await adminVendorService.getSlotAvailability(id, dates[0].key, dates[dates.length - 1].key);
      const map = {};
      (res.availability || []).forEach(a => { map[a.date] = a.slots; });
      setSaved(map);
    } catch (error) {
      toast.error('Failed to load availability');
    }
  }, [dates]);

  useEffect(() => { loadAvailability(vendorId); }, [vendorId, loadAvailability]);

  // Saved vendor slots that no longer exist (or are now blocked) in the global setup
  const staleDates = useMemo(() => (
    Object.entries(saved).filter(([, list]) => list.some(s => !activeValues.has(s)))
  ), [saved, activeValues]);

  const toggleDate = (key) => {
    const next = selectedDates.includes(key)
      ? selectedDates.filter(k => k !== key)
      : [...selectedDates, key];
    setSelectedDates(next);
    // Prefill the slot grid from the day's saved slots when a single day is picked
    if (next.length === 1) setSelectedSlots((saved[next[0]] || []).filter(s => activeValues.has(s)));
  };

  const toggleWeekday = (weekday) => {
    const keys = dates.filter(d => d.day === weekday).map(d => d.key);
    const allSelected = keys.length > 0 && keys.every(k => selectedDates.includes(k));
    setSelectedDates(prev => allSelected
      ? prev.filter(k => !keys.includes(k))
      : [...new Set([...prev, ...keys])]);
  };

  const toggleSlot = (slot) => {
    if (slot.blocked) return;
    setSelectedSlots(prev => prev.includes(slot.value) ? prev.filter(s => s !== slot.value) : [...prev, slot.value]);
  };

  const apply = async (slotValues) => {
    if (!vendorId) return toast.error('Select a vendor first');
    if (selectedDates.length === 0) return toast.error('Select at least one date');
    if (slotValues.length === 0 && !window.confirm('Mark the selected dates as unavailable for this vendor?')) return;

    setSaving(true);
    try {
      await adminVendorService.setSlotAvailability(vendorId, selectedDates, slotValues);
      toast.success(slotValues.length ? 'Availability saved' : 'Dates marked unavailable');
      await loadAvailability(vendorId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const clearStale = async () => {
    setSaving(true);
    try {
      await Promise.all(staleDates.map(([date, list]) =>
        adminVendorService.setSlotAvailability(vendorId, [date], list.filter(s => activeValues.has(s)))
      ));
      toast.success('Removed slots that no longer exist in the slot setup');
      await loadAvailability(vendorId);
    } catch (error) {
      toast.error('Failed to clean up slots');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-800">Vendor Slot Availability</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Choose the dates and slots each vendor is available for scheduled bookings. Slots, interval and blocked slots
          above apply here automatically. Unmarked dates are unavailable. Save slot settings first if
          you changed them.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor</label>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select a vendor</option>
          {vendors.map(v => (
            <option key={v._id} value={v._id}>{v.name}{v.businessName ? ` — ${v.businessName}` : ''}</option>
          ))}
        </select>
      </div>

      {vendorId && (
        <>
          {staleDates.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <FiAlertTriangle className="shrink-0" />
              <span className="flex-1">
                This vendor has saved slots on {staleDates.length} day(s) that are now blocked or no longer match the
                slot setup. They will not be bookable.
              </span>
              <button
                disabled={saving}
                onClick={clearStale}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white font-semibold disabled:opacity-50"
              >
                Remove invalid slots
              </button>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiCalendar /> Dates (next {days} days)
              </h4>
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleWeekday(i)}
                    className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                  >
                    All {name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedDates([])}
                  className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-2">
              {dates.map(d => {
                const isSelected = selectedDates.includes(d.key);
                const count = (saved[d.key] || []).filter(s => activeValues.has(s)).length;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDate(d.key)}
                    className={`rounded-lg border px-1 py-2 text-center transition-colors ${isSelected
                      ? 'bg-[#720C3E] text-white border-[#720C3E]'
                      : count > 0
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className="text-[10px] uppercase">{WEEKDAYS[d.day]}</div>
                    <div className="text-base font-bold leading-tight">{d.date}</div>
                    <div className="text-[10px]">{d.month}</div>
                    <div className="text-[10px] mt-0.5">{count > 0 ? `${count} slots` : 'Off'}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiClock /> Available time slots
              </h4>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedSlots([...activeValues])}
                  className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlots([])}
                  className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {slots.map(s => (
                <button
                  key={s.value}
                  type="button"
                  disabled={s.blocked}
                  onClick={() => toggleSlot(s)}
                  title={s.blocked ? 'Blocked in the slot setup above' : ''}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${s.blocked
                    ? 'bg-gray-100 border-gray-200 text-gray-400 line-through cursor-not-allowed'
                    : selectedSlots.includes(s.value)
                      ? 'bg-[#720C3E] text-white border-[#720C3E]'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => apply(selectedSlots)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#720C3E] text-white text-sm font-semibold disabled:opacity-50"
            >
              <FiSave /> Apply to {selectedDates.length} selected date{selectedDates.length === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => apply([])}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold disabled:opacity-50"
            >
              <FiSlash /> Mark selected dates unavailable
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorSlotAvailabilityPanel;

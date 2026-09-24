import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiPlay, FiSquare, FiAlertTriangle } from 'react-icons/fi';
import { startHourlyService, getHourlyServiceStatus, endHourlyService } from '../../services/bookingService';

// Formats minutes into "Hh MMm"
const formatMinutes = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${String(rem).padStart(2, '0')}m`;
};

/**
 * Vendor-side hourly service timer.
 * Server timestamps (serviceStartedAt) are the source of truth for elapsed time —
 * this component only re-derives elapsed = now - serviceStartedAt for display,
 * and periodically resyncs with the backend via getHourlyServiceStatus.
 */
export default function HourlyServiceTimer({ bookingId, hourlyTracking, onEnded, onStarted, displayOnly = false, actionOnly = false }) {
  const [tracking, setTracking] = useState(hourlyTracking);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endResult, setEndResult] = useState(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    setTracking(hourlyTracking);
  }, [hourlyTracking]);

  // Display-only tick, recomputed from the server-provided start timestamp
  useEffect(() => {
    if (!tracking?.serviceStartedAt) return;
    const started = new Date(tracking.serviceStartedAt).getTime();
    const tick = () => setElapsedMinutes(Math.floor((Date.now() - started) / 60000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tracking?.serviceStartedAt]);

  // Periodic resync with backend (authoritative), also flips phase server-side
  // the first time booked duration is crossed.
  useEffect(() => {
    if (!tracking?.serviceStartedAt || tracking.phase === 'EXTRA_TIME' || tracking.phase === 'ENDED') return;
    const poll = async () => {
      try {
        const res = await getHourlyServiceStatus(bookingId);
        if (res.success) {
          setTracking(prev => ({ ...prev, ...res.data }));
          if (res.data.phase === 'BOOKED_TIME_COMPLETED' && !notifiedRef.current) {
            notifiedRef.current = true;
            toast('Booked service duration completed. Extra time will now be charged.', { icon: '⚠️', duration: 6000 });
          }
        }
      } catch (_) { /* non-fatal, retried on next tick */ }
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [bookingId, tracking?.serviceStartedAt, tracking?.phase]);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await startHourlyService(bookingId);
      if (res.success) {
        setTracking(res.data.hourlyTracking || { ...tracking, serviceStartedAt: new Date().toISOString(), phase: 'SERVICE_STARTED' });
        toast.success('Service started');
        onStarted?.();
      } else {
        toast.error(res.message || 'Failed to start service');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start service');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
    try {
      const res = await endHourlyService(bookingId);
      if (res.success) {
        setTracking(prev => ({ ...prev, ...res.data }));
        setEndResult(res.data);
        onEnded?.(res.data);
      } else {
        toast.error(res.message || 'Failed to end service');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end service');
    } finally {
      setEnding(false);
    }
  };

  if (!tracking?.isHourly) return null;

  // DISPLAY-ONLY MODE (Timer Banner)
  if (displayOnly) {
    if (tracking.phase === 'EXTRA_TIME') {
      return (
        <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-2.5">
          <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs mb-0.5">
            <FiAlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Extra Time Detected</span>
          </div>
          <div className="text-[10px] text-amber-800 space-y-0.5">
            <div>Booked: {formatMinutes(tracking.bookedMinutes)} · Actual: {formatMinutes(tracking.actualDurationMinutes)}</div>
            <div>Extra: {formatMinutes(tracking.extraDurationMinutes)} · Amount: ₹{tracking.extraAmount}</div>
            <div className="italic text-[9px]">Waiting for customer payment before Work Done unlocks.</div>
          </div>
        </div>
      );
    }

    if (tracking.phase === 'SERVICE_STARTED' || tracking.phase === 'BOOKED_TIME_COMPLETED') {
      return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-700 truncate">Active Service Timer</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-slate-900 shrink-0">
            <FiClock className={`w-3.5 h-3.5 ${tracking.phase === 'BOOKED_TIME_COMPLETED' ? 'text-amber-600' : 'text-slate-500'}`} />
            <span>{formatMinutes(elapsedMinutes)}</span>
            <span className="text-slate-400 font-normal text-[11px]">/ {formatMinutes(tracking.bookedMinutes)}</span>
            {tracking.phase === 'BOOKED_TIME_COMPLETED' && (
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1 py-0.5 rounded font-bold ml-0.5">Extra</span>
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  // ACTION-ONLY MODE (Single action button alongside Timeline)
  if (actionOnly) {
    if (tracking.phase === 'NOT_STARTED') {
      return (
        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-60 whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
        >
          <FiPlay className="w-3.5 h-3.5 shrink-0" />
          <span>{starting ? 'Starting...' : 'Start Service'}</span>
        </button>
      );
    }

    if (tracking.phase === 'EXTRA_TIME') {
      return (
        <div className="flex-1 py-2 px-2.5 rounded-xl font-bold text-[11px] text-amber-700 bg-amber-50 border border-amber-200 flex items-center justify-center text-center">
          <span>Extra Time Pending</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleEnd}
        disabled={ending}
        className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-60 whitespace-nowrap"
        style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
      >
        <FiSquare className="w-3.5 h-3.5 shrink-0" />
        <span>{ending ? 'Ending...' : 'End Service'}</span>
      </button>
    );
  }

  // DEFAULT INTEGRATED MODE (Timer Banner + Action Button stacked)
  if (tracking.phase === 'NOT_STARTED') {
    return (
      <button
        type="button"
        onClick={handleStart}
        disabled={starting}
        className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
      >
        <FiPlay className="w-3.5 h-3.5 shrink-0" />
        <span>{starting ? 'Starting...' : 'Start Service'}</span>
      </button>
    );
  }

  if (tracking.phase === 'EXTRA_TIME') {
    return (
      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-2.5">
        <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs mb-0.5">
          <FiAlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Extra Time Detected</span>
        </div>
        <div className="text-[10px] text-amber-800 space-y-0.5">
          <div>Booked: {formatMinutes(tracking.bookedMinutes)} · Actual: {formatMinutes(tracking.actualDurationMinutes)}</div>
          <div>Extra: {formatMinutes(tracking.extraDurationMinutes)} · Amount: ₹{tracking.extraAmount}</div>
          <div className="italic text-[9px]">Waiting for customer payment before Work Done unlocks.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-slate-700">Active Service Timer</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
          <FiClock className={`w-3.5 h-3.5 ${tracking.phase === 'BOOKED_TIME_COMPLETED' ? 'text-amber-600' : 'text-slate-500'}`} />
          <span>{formatMinutes(elapsedMinutes)}</span>
          <span className="text-slate-400 font-normal text-[11px]">/ {formatMinutes(tracking.bookedMinutes)}</span>
          {tracking.phase === 'BOOKED_TIME_COMPLETED' && (
            <span className="text-[10px] text-amber-700 bg-amber-100 px-1 py-0.5 rounded font-bold ml-0.5">Extra</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleEnd}
        disabled={ending}
        className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
      >
        <FiSquare className="w-3.5 h-3.5 shrink-0" />
        <span>{ending ? 'Ending...' : 'End Service'}</span>
      </button>
    </div>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiPlay, FiSquare, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
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
 * Automatically ends service when booked duration finishes, and transitions to the next step.
 */
export default function HourlyServiceTimer({ bookingId, hourlyTracking, onEnded, onStarted, displayOnly = false, actionOnly = false }) {
  const [tracking, setTracking] = useState(hourlyTracking);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const autoEndedRef = useRef(false);

  useEffect(() => {
    setTracking(hourlyTracking);
  }, [hourlyTracking]);

  const handleEnd = useCallback(async (isAuto = false) => {
    if (ending) return;
    setEnding(true);
    try {
      const res = await endHourlyService(bookingId);
      if (res.success) {
        setTracking(prev => ({ ...prev, ...res.data, phase: 'ENDED', workDoneAllowed: true }));
        if (isAuto) {
          toast.success('Booked service time completed! Service ended automatically.');
        } else {
          toast.success('Service ended successfully');
        }
        onEnded?.(res.data);
      } else {
        if (!isAuto) {
          toast.error(res.message || 'Failed to end service');
        }
      }
    } catch (err) {
      if (!isAuto) {
        toast.error(err.response?.data?.message || 'Failed to end service');
      }
    } finally {
      setEnding(false);
    }
  }, [bookingId, ending, onEnded]);

  // Display tick & auto-end check when booked duration is reached
  useEffect(() => {
    if (!tracking?.serviceStartedAt || tracking.phase !== 'SERVICE_STARTED') return;
    const started = new Date(tracking.serviceStartedAt).getTime();
    const bookedMins = Number(tracking.bookedMinutes) || 0;
    const totalMs = bookedMins * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const elapsedMs = Math.max(0, now - started);
      const elapsedM = Math.floor(elapsedMs / 60000);
      setElapsedMinutes(Math.min(elapsedM, bookedMins));

      // If time is up, trigger auto-end
      if (elapsedMs >= totalMs && !autoEndedRef.current && bookedMins > 0) {
        autoEndedRef.current = true;
        handleEnd(true);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tracking?.serviceStartedAt, tracking?.phase, tracking?.bookedMinutes, handleEnd]);

  // Periodic resync with backend
  useEffect(() => {
    if (!tracking?.serviceStartedAt || tracking.phase === 'ENDED') return;
    const poll = async () => {
      try {
        const res = await getHourlyServiceStatus(bookingId);
        if (res.success && res.data) {
          setTracking(prev => ({ ...prev, ...res.data }));
          if (res.data.phase === 'ENDED') {
            onEnded?.(res.data);
          }
        }
      } catch (_) { /* non-fatal, retried on next tick */ }
    };
    const interval = setInterval(poll, 12000);
    return () => clearInterval(interval);
  }, [bookingId, tracking?.serviceStartedAt, tracking?.phase, onEnded]);

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

  if (!tracking?.isHourly) return null;

  // If already ended, don't show timer controls
  if (tracking.phase === 'ENDED') {
    return null;
  }

  // DISPLAY-ONLY MODE (Timer Banner)
  if (displayOnly) {
    if (tracking.phase === 'SERVICE_STARTED') {
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
            <FiClock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatMinutes(elapsedMinutes)}</span>
            <span className="text-slate-400 font-normal text-[11px]">/ {formatMinutes(tracking.bookedMinutes)}</span>
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

    return (
      <button
        type="button"
        onClick={() => handleEnd(false)}
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
          <FiClock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatMinutes(elapsedMinutes)}</span>
          <span className="text-slate-400 font-normal text-[11px]">/ {formatMinutes(tracking.bookedMinutes)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => handleEnd(false)}
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

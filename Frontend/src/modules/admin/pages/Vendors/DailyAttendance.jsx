import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLoader,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiXCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import adminVendorService from '../../../../services/adminVendorService';

const PAGE_SIZE = 10;

const getDateKey = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

const formatClock = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateLabel = (dateKey) => {
  if (!dateKey) return '';
  const date = new Date(dateKey + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatDuration = (attendance, dateKey) => {
  if (!attendance?.firstOnlineAt) return '—';

  const start = new Date(attendance.firstOnlineAt).getTime();
  let end = attendance.lastOfflineAt
    ? new Date(attendance.lastOfflineAt).getTime()
    : null;

  if (!end && attendance.dayStatus === 'OPEN' && dateKey === getDateKey()) {
    end = Date.now();
  }

  if (!Number.isFinite(start) || !end || end < start) return '—';

  const totalMinutes = Math.floor((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
};

const getAttendanceStatus = (row) => {
  if (row?.attendance?.dayStatus === 'OPEN') return 'open';
  if (row?.attendance?.dayStatus === 'CLOSED') return 'closed';
  return 'not_started';
};

const getStatusLabel = (status) => {
  if (status === 'open') return 'Open';
  if (status === 'closed') return 'Closed';
  return 'Not started';
};

const statusClasses = {
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  not_started: 'bg-amber-50 text-amber-700 border-amber-200'
};

const DailyAttendance = () => {
  const [dateKey, setDateKey] = useState(getDateKey());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overview, setOverview] = useState({
    dateKey: getDateKey(),
    timezone: 'Asia/Kolkata',
    rows: [],
    summary: {
      totalVendors: 0,
      withAttendance: 0,
      open: 0,
      closed: 0,
      notStarted: 0,
      currentlyOnline: 0
    },
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, pages: 0 }
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminVendorService.getVendorAttendanceOverview({
        date: dateKey,
        page,
        limit: PAGE_SIZE,
        search: searchQuery.trim() || undefined
      });

      if (response.success) {
        setOverview(response.data);
      } else {
        toast.error(response.message || 'Failed to load daily attendance');
      }
    } catch (error) {
      console.error('Daily attendance load error:', error);
      toast.error('Failed to load daily attendance');
    } finally {
      setLoading(false);
    }
  }, [dateKey, page, searchQuery]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return overview.rows || [];
    return (overview.rows || []).filter(row => getAttendanceStatus(row) === statusFilter);
  }, [overview.rows, statusFilter]);

  const summary = overview.summary || {};
  const pagination = overview.pagination || {};

  const handleDateChange = (value) => {
    if (!value) return;
    setDateKey(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <CardShell
        icon={FiActivity}
        title="Daily Attendance"
        subtitle={
          'Date-wise vendor duty hours · ' +
          formatDateLabel(overview.dateKey || dateKey) +
          ' · ' +
          (overview.timezone || 'Asia/Kolkata')
        }
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search vendor by name, phone or business..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDateChange(getDateKey())}
              className={dateKey === getDateKey()
                ? 'rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white'
                : 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-blue-300'}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDateChange(getDateKey(-1))}
              className={dateKey === getDateKey(-1)
                ? 'rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white'
                : 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-blue-300'}
            >
              Yesterday
            </button>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <input
                type="date"
                value={dateKey}
                max={getDateKey()}
                onChange={(event) => handleDateChange(event.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={loadAttendance}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
              title="Refresh attendance"
            >
              <FiRefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-600">
              <FiUsers /> Total Vendors
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.totalVendors || 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-600">
              <FiCheckCircle /> Open
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.open || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
              <FiXCircle /> Closed
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.closed || 0}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-600">
              <FiClock /> Not Started
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.notStarted || 0}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-purple-100 bg-purple-50 p-4 lg:col-span-1">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-600">
              <FiActivity /> Live Online
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.currentlyOnline || 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              ['all', 'All'],
              ['open', 'Open'],
              ['closed', 'Closed'],
              ['not_started', 'Not started']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={statusFilter === value
                  ? 'rounded-full bg-[#720C3E] px-3 py-1.5 text-xs font-bold text-white'
                  : 'rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-[#720C3E]'}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Showing {visibleRows.length} of {pagination.total || 0} vendors
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Day Start</th>
                  <th className="px-4 py-3">Day End</th>
                  <th className="px-4 py-3">Duty Hours</th>
                  <th className="px-4 py-3">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-16 text-center">
                      <FiLoader className="mx-auto mb-2 h-7 w-7 animate-spin text-blue-600" />
                      <p className="text-sm text-gray-500">Loading attendance...</p>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-16 text-center">
                      <FiCalendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                      <p className="font-semibold text-gray-600">No attendance records found</p>
                      <p className="mt-1 text-xs text-gray-400">Try another date, search, or status filter.</p>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const vendor = row.vendor || {};
                    const status = getAttendanceStatus(row);
                    const attendance = row.attendance;
                    const liveOnline = row.currentPresence?.isOnline;

                    return (
                      <tr key={vendor._id} className="transition hover:bg-blue-50/40">
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-900">
                            {vendor.name || vendor.businessName || 'Unnamed vendor'}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {vendor.businessName && vendor.businessName !== vendor.name ? (
                              <span>{vendor.businessName} {vendor.phone ? '· ' + vendor.phone : ''}</span>
                            ) : (
                              <span>{vendor.phone || '—'}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={'inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ' + statusClasses[status]}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {formatClock(attendance?.firstOnlineAt)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {attendance?.lastOfflineAt
                            ? formatClock(attendance.lastOfflineAt)
                            : status === 'open'
                              ? (liveOnline ? 'Still online' : (vendor.lastSeenAt ? formatClock(vendor.lastSeenAt) : 'Offline'))
                              : 'Not recorded'}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-blue-700">
                          {formatDuration(attendance, overview.dateKey || dateKey)}
                          {status === 'open' && liveOnline && <span className="ml-1 text-[10px] font-semibold text-emerald-600">ACTIVE</span>}
                        </td>
                        <td className="px-4 py-4">
                          <span className={liveOnline
                            ? 'inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600'
                            : 'inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400'}>
                            <span className={liveOnline ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-gray-300'} />
                            {liveOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(pagination.pages || 0) > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {pagination.page || page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage(current => Math.max(1, current - 1))}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage(current => Math.min(pagination.pages, current + 1))}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </CardShell>
    </div>
  );
};

export default DailyAttendance;
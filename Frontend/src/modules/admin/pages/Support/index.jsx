import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiMessageSquare,
  FiPhone,
  FiRefreshCw,
  FiSend,
  FiUser
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

const statusLabels = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed'
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const emptyPagination = { page: 1, limit: 5, total: 0, pages: 0 };

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  const pages = Array.from({ length: pagination.pages }, (_, index) => index + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500">
        Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pagination.page === 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <FiChevronLeft />
        </button>
        {pages.map(page => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold ${page === pagination.page ? 'bg-[#720C3E] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          disabled={pagination.page === pagination.pages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

const Support = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketFilter, setTicketFilter] = useState('all');
  const [responseDrafts, setResponseDrafts] = useState({});
  const [sosPage, setSosPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);
  const [sosPagination, setSosPagination] = useState(emptyPagination);
  const [ticketPagination, setTicketPagination] = useState(emptyPagination);

  const activeTab = location.pathname.endsWith('/tickets') ? 'tickets' : 'sos';

  const fetchSupportData = useCallback(async () => {
    try {
      setLoading(true);
      const [notificationResponse, ticketResponse] = await Promise.all([
        api.get('/notifications/admin', { params: { type: 'emergency_sos', page: sosPage, limit: 5 } }),
        api.get('/admin/support-tickets', { params: { status: ticketFilter, page: ticketPage, limit: 5 } })
      ]);

      if (notificationResponse.data?.success) {
        setNotifications(notificationResponse.data.data || []);
        setSosPagination(notificationResponse.data.pagination || emptyPagination);
      }
      if (ticketResponse.data?.success) {
        setTickets(ticketResponse.data.data || []);
        setTicketPagination(ticketResponse.data.pagination || emptyPagination);
        setCounts(ticketResponse.data.counts || { total: 0, open: 0, inProgress: 0, resolved: 0 });
      }
    } catch (error) {
      console.error('Failed to load support data:', error);
      toast.error(error.response?.data?.message || 'Failed to load support data');
    } finally {
      setLoading(false);
    }
  }, [sosPage, ticketFilter, ticketPage]);

  useEffect(() => {
    fetchSupportData();
    const handleUpdate = () => fetchSupportData();
    window.addEventListener('adminNotificationsUpdated', handleUpdate);
    return () => window.removeEventListener('adminNotificationsUpdated', handleUpdate);
  }, [fetchSupportData]);

  const sosRequests = useMemo(
    () => [...notifications]
      .filter(notification => notification.type === 'emergency_sos')
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0)),
    [notifications]
  );

  const refresh = async () => {
    setRefreshing(true);
    await fetchSupportData();
    setRefreshing(false);
  };

  const markSosRead = async (notification) => {
    if (notification.isRead) return;
    try {
      await api.put(`/notifications/${notification._id}/read`);
      setNotifications(previous => previous.map(item => (
        item._id === notification._id ? { ...item, isRead: true } : item
      )));
    } catch (error) {
      toast.error('Unable to mark SOS as read');
    }
  };

  const updateTicket = async (ticketId, updates) => {
    try {
      const response = await api.patch(`/admin/support-tickets/${ticketId}`, updates);
      if (response.data?.success) {
        setTickets(previous => previous.map(ticket => (
          ticket._id === ticketId ? { ...ticket, ...response.data.data } : ticket
        )));
        setResponseDrafts(previous => ({ ...previous, [ticketId]: '' }));
        toast.success('Support ticket updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update support ticket');
    }
  };

  const tabButton = (tab, label, count) => (
    <button
      type="button"
      onClick={() => navigate(tab === 'sos' ? '/admin/support/sos' : '/admin/support/tickets')}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
        activeTab === tab ? 'bg-[#720C3E] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab ? 'bg-white/20' : 'bg-gray-100'}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#720C3E]">
              <FiMessageSquare className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Support & SOS</h2>
              <p className="text-sm text-gray-500">Handle emergency alerts and customer support requests</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {tabButton('sos', 'SOS Requests', sosPagination.total)}
          {tabButton('tickets', 'Support Tickets', counts.open + counts.inProgress)}
        </div>
      </div>

      {activeTab === 'sos' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm">Loading SOS requests…</div>
          ) : sosRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
              <FiCheckCircle className="mx-auto mb-3 text-4xl text-emerald-500" />
              <p className="font-semibold text-gray-800">No SOS requests</p>
              <p className="mt-1 text-sm text-gray-500">New vendor emergency alerts will appear here.</p>
            </div>
          ) : sosRequests.map(notification => {
            const sos = notification.data || notification;
            const lat = sos.location?.lat;
            const lng = sos.location?.lng;
            return (
              <div
                key={notification._id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${notification.isRead ? 'border-gray-100' : 'border-red-200 bg-red-50/30'}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      <FiAlertTriangle className="text-xl" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900">{sos.vendorName || 'Vendor Partner'}</h3>
                        <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">Emergency SOS</span>
                        {!notification.isRead && <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold text-white">Unread</span>}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sos.phone && <a href={`tel:${sos.phone}`} className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><FiPhone /> Call Vendor</a>}
                    {!notification.isRead && <button type="button" onClick={() => markSosRead(notification)} className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"><FiCheck /> Mark read</button>}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 sm:grid-cols-2">
                  <div className="flex items-center gap-2"><FiPhone className="text-gray-400" /> {sos.phone || 'Phone unavailable'}</div>
                  <div className="flex items-center gap-2"><FiMapPin className="text-gray-400" /> {lat && lng ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : sos.location?.address || 'Location unavailable'}</div>
                </div>
                {sos.note && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-900"><strong>Note:</strong> {sos.note}</p>}
              </div>
            );
          })}
          <Pagination pagination={sosPagination} onPageChange={setSosPage} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map(status => (
              <button
                type="button"
                key={status}
                onClick={() => {
                  setTicketFilter(status);
                  setTicketPage(1);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${ticketFilter === status ? 'bg-[#720C3E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {status === 'all' ? 'All tickets' : statusLabels[status]}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-500">{counts.total} total tickets</span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm">Loading support tickets…</div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
              <FiMessageSquare className="mx-auto mb-3 text-4xl text-gray-300" />
              <p className="font-semibold text-gray-800">No support tickets found</p>
              <p className="mt-1 text-sm text-gray-500">User-submitted requests will appear here.</p>
            </div>
          ) : tickets.map(ticket => (
            <div key={ticket._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black tracking-wider text-[#720C3E]">{ticket.ticketNumber}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : ticket.status === 'resolved' || ticket.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{statusLabels[ticket.status] || ticket.status}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-gray-900">{ticket.subject}</h3>
                  <p className="mt-1 text-xs text-gray-500">{formatDate(ticket.createdAt)} {ticket.bookingId ? `• Booking ${ticket.bookingId}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><FiUser className="text-gray-400" /> {ticket.requesterName}</div>
              </div>

              <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-[1fr_280px]">
                <div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{ticket.message}</p>
                  <p className="mt-3 text-xs text-gray-500">{ticket.requesterEmail || 'No email'} {ticket.requesterPhone ? `• ${ticket.requesterPhone}` : ''}</p>
                </div>
                <div className="space-y-2">
                  <select
                    value={ticket.status}
                    onChange={(event) => updateTicket(ticket._id, { status: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#720C3E]"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <textarea
                    rows={3}
                    value={responseDrafts[ticket._id] ?? ''}
                    onChange={(event) => setResponseDrafts(previous => ({ ...previous, [ticket._id]: event.target.value }))}
                    placeholder={ticket.adminResponse || 'Add an internal response...'}
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#720C3E]"
                  />
                  <button
                    type="button"
                    disabled={!responseDrafts[ticket._id]?.trim()}
                    onClick={() => updateTicket(ticket._id, { adminResponse: responseDrafts[ticket._id] })}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#720C3E] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FiSend /> Save response
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Pagination pagination={ticketPagination} onPageChange={setTicketPage} />
        </div>
      )}
    </div>
  );
};

export default Support;

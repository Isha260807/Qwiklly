import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { BookingAlertModal } from '../bookings';
import { acceptBooking, rejectBooking, assignWorker } from '../../services/bookingService';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';

export default function GlobalBookingAlert() {
  const [activeAlertBookings, setActiveAlertBookings] = useState([]);
  const ignoredBookingIds = useRef(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  const [maxSearchTime, setMaxSearchTime] = useState(1);

  useEffect(() => {
    // 1. Logic to sync with localStorage and optionally Server
    const syncAlerts = async (forceServerSync = false) => {
      try {
        const now = Date.now();
        let pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        if (vendorData.approvalStatus && vendorData.approvalStatus.toLowerCase() !== 'approved') {
          setActiveAlertBookings([]);
          return;
        }

        const token = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
        if (token && (forceServerSync || (Math.random() > 0.8))) {
          try {
            const { getBookings } = await import('../../services/bookingService');
            const response = await getBookings();
            if (response.success && response.data) {
              const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
              const vId = String(vendorData._id || vendorData.id);
              
              const serverJobs = response.data
                .filter(b => {
                  const status = b.status?.toLowerCase();
                  const isRelevant = status === 'searching' || status === 'requested' || (status === 'confirmed' && !b.vendorId);
                  const isMine = !b.vendorId || String(b.vendorId?._id || b.vendorId) === vId;
                  return isRelevant && isMine;
                })
                .map(b => ({
                  ...b,
                  id: b._id || b.id,
                  serviceType: b.serviceName || b.serviceId?.title,
                  customerName: b.userId?.name || 'Customer'
                }));

              const serverJobIds = new Set(serverJobs.map(sj => String(sj.id || sj._id)));
              // Reconcile: keep server-confirmed jobs or very recent socket jobs (<15s)
              pendingJobs = pendingJobs.filter(pj => {
                const pId = String(pj.id || pj._id);
                if (ignoredBookingIds.current.has(pId)) return false;
                if (serverJobIds.has(pId)) return true;
                const isVeryRecent = pj.receivedAt && (now - pj.receivedAt < 15000);
                return isVeryRecent;
              });

              // Add any new server jobs not in pending
              const currentPendingIds = new Set(pendingJobs.map(pj => String(pj.id || pj._id)));
              serverJobs.forEach(sj => {
                const sId = String(sj.id || sj._id);
                if (!currentPendingIds.has(sId) && !ignoredBookingIds.current.has(sId)) {
                  pendingJobs.unshift(sj);
                }
              });
              localStorage.setItem('vendorPendingJobs', JSON.stringify(pendingJobs));
            }
          } catch (e) { console.error("Server sync error:", e); }
        }

        const validJobs = pendingJobs.filter(job => {
          const idStr = String(job.id || job._id);
          if (ignoredBookingIds.current.has(idStr)) return false;
          if (job.expiresAt) {
            return new Date(job.expiresAt).getTime() > now;
          }
          if (job.createdAt) {
            const elapsed = now - new Date(job.createdAt).getTime();
            return elapsed < 5 * 60 * 1000;
          }
          return false;
        });

        // Sync back cleaned validJobs to localStorage
        if (validJobs.length !== pendingJobs.length) {
          localStorage.setItem('vendorPendingJobs', JSON.stringify(validJobs));
        }

        setActiveAlertBookings(prev => {
          const validIds = new Set(validJobs.map(v => String(v.id || v._id)));
          // Remove anything not in validJobs or in ignored
          const filteredPrev = prev.filter(b => {
            const bId = String(b.id || b._id);
            return validIds.has(bId) && !ignoredBookingIds.current.has(bId);
          });
          const existingInPrev = new Set(filteredPrev.map(b => String(b.id || b._id)));
          const newJobsToAdd = validJobs.filter(v => !existingInPrev.has(String(v.id || v._id)));
          return [...filteredPrev, ...newJobsToAdd];
        });
      } catch (err) {
        console.error('[GlobalAlert] Sync error:', err);
      }
    };

    // 2. Foreground Sync: Sync immediately when vendor resumes app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAlerts(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fetch global config for accurate timer
    const fetchConfig = async () => {
      const token = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
      if (!token) return;

      try {
        const { vendorDashboardService } = await import('../../services/dashboardService');
        const response = await vendorDashboardService.getDashboardStats();
        if (response.success && response.data.config) {
          setMaxSearchTime(response.data.config.maxSearchTime || 1);
        }
      } catch (error) {
        console.error('Failed to fetch config for GlobalAlert:', error);
      }
    };

    syncAlerts(true);
    fetchConfig();

    // 3. Heartbeat: Periodic sync
    const heartbeat = setInterval(() => syncAlerts(false), 5000);

    // Listen for custom dashboard events from SocketContext
    const handleShowAlert = (e) => {
      if (e.detail) {
        setActiveAlertBookings(prev => {
          const bId = String(e.detail.id || e.detail._id);
          if (prev.find(b => String(b.id || b._id) === bId)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    const handleRemoveBooking = (e) => {
      if (e.detail?.id) {
        const idToRemove = String(e.detail.id);
        ignoredBookingIds.current.add(idToRemove);
        setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));
      }
    };

    window.addEventListener('showDashboardBookingAlert', handleShowAlert);
    window.addEventListener('removeVendorBooking', handleRemoveBooking);

    return () => {
      window.removeEventListener('showDashboardBookingAlert', handleShowAlert);
      window.removeEventListener('removeVendorBooking', handleRemoveBooking);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeat);
    };
  }, []);

  // Effect to manage sound based on pending bookings
  useEffect(() => {
    if (activeAlertBookings.length > 0) {
      playAlertRing(true); // Always loop for vendor until actioned
    } else {
      stopAlertRing();
    }
    return () => stopAlertRing();
  }, [activeAlertBookings.length]);

  if (activeAlertBookings.length === 0) return null;

  return (
    <BookingAlertModal
      isOpen={activeAlertBookings.length > 0}
      bookings={activeAlertBookings}
      maxSearchTimeMins={maxSearchTime}
      onAccept={async (id) => {
        const idStr = String(id);
        ignoredBookingIds.current.add(idStr);
        try {
          await acceptBooking(id);
          await assignWorker(id, 'SELF');

          // Remove from local storage
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== idStr);
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

          // Dispatch remove event
          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== idStr));

          window.dispatchEvent(new Event('vendorJobsUpdated'));
          window.dispatchEvent(new Event('vendorStatsUpdated'));
          toast.success('Job accepted successfully!');
        } catch (e) {
          toast.error('Failed to accept job');
        }
      }}
      onReject={async (id) => {
        const idStr = String(id);
        ignoredBookingIds.current.add(idStr);
        try {
          // Reject via API
          await rejectBooking(id);
        } catch (error) {
          console.error("Failed to reject job via API, removing locally");
        } finally {
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== idStr);
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== idStr));

          toast.success('Booking application rejected');
          window.dispatchEvent(new Event('vendorJobsUpdated'));
        }
      }}
      onMinimize={() => {
        setActiveAlertBookings([]); // simply minimizes current visible ones. We can fetch them later from pending.
      }}
    />
  );
}

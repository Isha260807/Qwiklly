import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiMapPin, FiClock, FiUser, FiFilter, FiSearch, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LogoLoader from '../../../../components/common/LogoLoader';

import { getBookings, assignWorker as assignWorkerApi } from '../../services/bookingService';
import { ConfirmDialog } from '../../components/common';

const ActiveJobs = memo(() => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('in_progress'); // Default to showing active jobs
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

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

  // Memoize loadJobs to prevent recreation
  const loadJobs = useCallback(async (currentFilter, currentSearch) => {
    try {
      setLoading(true);
      const response = await getBookings({
        status: currentFilter,
        q: currentSearch,
        limit: 50 // Fetch more than default since we removed client-side filter
      });
      const jobsData = response.data || [];
      // Map API response to Component State structure
      const mappedJobs = jobsData.map(job => ({
        id: job._id || job.id,
        serviceType: job.serviceName || 'Service',
        user: {
          name: job.userId?.name || 'Customer'
        },
        location: {
          address: job.address?.addressLine1 || 'Address not available'
        },
        price: (job.finalAmount ? job.finalAmount * 0.9 : 0).toFixed(2),
        status: job.status,
        assignedTo: job.workerId ? { name: job.workerId.name } : (job.assignedAt ? { name: 'You (Self)' } : null),
        timeSlot: {
          date: job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'Date',
          time: job.scheduledTime || 'Time'
        }
      }));
      setJobs(mappedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use a debounced search to avoid spamming the API
  useEffect(() => {
    const timer = setTimeout(() => {
      loadJobs(filter, searchQuery);
    }, filter === 'all' && searchQuery === '' ? 0 : 500); // Only debounce if active searching

    return () => clearTimeout(timer);
  }, [filter, searchQuery, loadJobs]);

  useEffect(() => {
    window.addEventListener('vendorJobsUpdated', () => loadJobs(filter, searchQuery));
    return () => {
      window.removeEventListener('vendorJobsUpdated', () => loadJobs(filter, searchQuery));
    };
  }, [loadJobs, filter, searchQuery]);

  // filteredJobs is now just the jobs from the server
  const filteredJobs = jobs;

  const handleAssignToSelf = async (jobId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Assign to Self',
      message: 'Are you sure you want to do this job yourself?',
      onConfirm: async () => {
        try {
          const response = await assignWorkerApi(jobId, 'SELF');
          if (response && response.success) {
            toast.success("Assigned to yourself!");
            // Refresh jobs list instead of full page reload
            loadJobs(filter, searchQuery);
          }
        } catch (error) {
          console.error("Error assigning to self:", error);
          toast.error("Failed to assign to yourself");
        }
      }
    });
  };

  const hexToRgba = useCallback((hex, alpha) => {
    if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  const getStatusColor = useCallback((status) => {
    const colors = {
      'ACCEPTED': '#F59E0B',
      'ASSIGNED': '#3B82F6',
      'JOURNEY_STARTED': '#F59E0B',
      'VISITED': '#8B5CF6',
      'WORK_DONE': '#10B981',
      'WORKER_PAID': '#06B6D4',
      'SETTLEMENT_PENDING': '#F97316',
      'COMPLETED': '#059669',
    };
    return colors[status?.toUpperCase()] || '#6B7280';
  }, []);

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header showBack={false} showSearch={false} />

      <main className="px-4 py-3">

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'All' },
            { id: 'assigned', label: 'Assigned' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all ${filter === filterOption.id
                ? 'text-white'
                : 'bg-white text-gray-700'
                }`}
              style={
                filter === filterOption.id
                  ? {
                    background: themeColors.button,
                    boxShadow: `0 2px 8px ${themeColors.button}40`,
                  }
                  : {
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }
              }
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse">
                <div className="flex justify-between mb-4 pb-4 border-b border-slate-50">
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-slate-100 rounded"></div>
                    <div className="h-5 w-48 bg-slate-100 rounded"></div>
                  </div>
                  <div className="h-10 w-20 bg-slate-100 rounded-lg"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                    <div className="h-4 w-32 bg-slate-100 rounded"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                    <div className="h-4 w-40 bg-slate-100 rounded"></div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex gap-3">
                  <div className="h-10 flex-1 bg-slate-100 rounded-lg"></div>
                  <div className="h-10 flex-1 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div
            className="bg-white rounded-xl p-8 text-center shadow-md"
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <FiBriefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-semibold mb-2">No jobs found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Try a different search term' : 'No active jobs at the moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const statusColor = getStatusColor(job.status);

              return (
                <div
                  key={job.id}
                  onClick={() => navigate(`/vendor/booking/${job.id}`)}
                  className="bg-white rounded-xl p-3 cursor-pointer active:scale-[0.99] transition-all duration-200 relative overflow-hidden"
                  style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ background: statusColor }}
                  />

                  <div className="relative z-10 pl-2">
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-1 rounded-md flex-shrink-0" style={{ background: `${statusColor}15` }}>
                          <FiBriefcase className="w-3.5 h-3.5" style={{ color: statusColor }} />
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm truncate">{job.serviceType}</h3>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                          style={{
                            background: `${statusColor}18`,
                            color: statusColor,
                          }}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div
                        className="ml-2 px-2 py-1 rounded-md text-sm font-bold flex-shrink-0 flex items-center justify-center min-w-[56px]"
                        style={{
                          background: `${themeColors.button}10`,
                          color: themeColors.button,
                        }}
                      >
                        {job.status?.toLowerCase() === 'completed' ? `₹${job.price}` : <FiClock className="w-4 h-4 opacity-40" />}
                      </div>
                    </div>

                    {/* Info Rows */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiUser className="w-3 h-3 flex-shrink-0" style={{ color: statusColor }} />
                        <span>{job.user?.name || 'Customer'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiMapPin className="w-3 h-3 flex-shrink-0" style={{ color: statusColor }} />
                        <span className="truncate">{job.location?.address || 'Address not available'}</span>
                      </div>
                      {job.assignedTo && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <FiUser className="w-3 h-3 flex-shrink-0" style={{ color: statusColor }} />
                          <span>Assigned to: <span className="font-semibold">{job.assignedTo === 'SELF' ? 'You (Self)' : job.assignedTo.name}</span></span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiClock className="w-3 h-3 flex-shrink-0" style={{ color: statusColor }} />
                        <span>{job.timeSlot?.date} • {job.timeSlot?.time}</span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    {['ACCEPTED', 'CONFIRMED'].includes(job.status?.toUpperCase()) && !job.assignedTo && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAssignToSelf(job.id); }}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                          style={{ background: 'white', color: themeColors.button, border: `1.5px solid ${themeColors.button}` }}
                        >
                          <FiUser className="w-3 h-3" />
                          Do it Myself
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/vendor/booking/${job.id}/assign-worker`); }}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-1"
                          style={{ background: themeColors.button }}
                        >
                          <FiUser className="w-3 h-3" />
                          Assign Worker
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

      <BottomNav />
    </div>
  );
});

export default ActiveJobs;


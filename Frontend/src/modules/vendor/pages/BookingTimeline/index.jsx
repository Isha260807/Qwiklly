import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCheck, FiClock, FiUser, FiMapPin, FiTool, FiDollarSign, FiFileText, FiCheckCircle, FiX } from 'react-icons/fi';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import { getBookingById, updateBookingStatus, startSelfJob, verifySelfVisit, completeSelfJob, collectSelfCash, payWorker } from '../../services/bookingService';
import { CashCollectionModal, ConfirmDialog, WorkCompletionModal } from '../../components/common';
import vendorWalletService from '../../../../services/vendorWalletService';
import HourlyServiceTimer from '../../components/booking/HourlyServiceTimer';
import { toast } from 'react-hot-toast';

const BookingTimeline = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [currentStage, setCurrentStage] = useState(1);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isWorkDoneModalOpen, setIsWorkDoneModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });
  const [workPhotos, setWorkPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isWorkApproved, setIsWorkApproved] = useState(false);

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

  const loadBooking = async () => {
      try {
        const response = await getBookingById(id);
        const apiData = response.data || response;

        const isSelfJob = apiData.assignedAt && !apiData.workerId;
        const mappedBooking = {
          ...apiData,
          id: apiData._id || apiData.id,
          isSelfJob,
          assignedTo: apiData.workerId ? { name: apiData.workerId.name } : (apiData.assignedAt ? { name: 'You (Self)' } : null),
          location: {
            address: apiData.address?.addressLine1 || apiData.location?.address || 'Address not available',
            lat: apiData.address?.lat || apiData.location?.lat,
            lng: apiData.address?.lng || apiData.location?.lng
          },
          status: apiData.status,
          // Timeline mapping if backend supports it, otherwise derived from status/timestamps
          timeline: [
            { stage: 1, timestamp: apiData.createdAt },
            { stage: 2, timestamp: apiData.acceptedAt },
            { stage: 3, timestamp: apiData.assignedAt },
            { stage: 4, timestamp: apiData.startedAt }, // Assuming started means visited for now? Or keep null
            { stage: 5, timestamp: apiData.completedAt }, // Simplified mapping
          ]
        };
        setBooking(mappedBooking);

        // Determine current stage based on status
        // Determine current stage based on status
        const statusMap = {
          'requested': 1,
          'searching': 1,
          'confirmed': 2,
          'assigned': 3,
          'journey_started': 4,
          'visited': 5,
          'in_progress': 5,
          'work_done': 7,
          'completed': 8,
        };

        const isActuallyPaid = apiData.isWorkerPaid || apiData.workerPaymentStatus === 'PAID' || apiData.workerPaymentStatus === 'SUCCESS';
        const isSettled = apiData.finalSettlementStatus === 'DONE';

        // Custom logic for later stages
        let stage = statusMap[apiData.status] || 2;
        if (apiData.status === 'completed') {
          if (isSettled) stage = 10; // Booking Complete
          else if (isActuallyPaid || isSelfJob) stage = 9; // Final Settlement (Skip Pay Worker for self)
          else stage = 8; // Pay Worker
        }

        setCurrentStage(stage);
      } catch (error) {
        console.error('Error loading booking:', error);
      }
  };

  useEffect(() => {
    loadBooking();

    const handleUpdate = () => {
      loadBooking();
    };

    window.addEventListener('vendorJobsUpdated', handleUpdate);
    return () => window.removeEventListener('vendorJobsUpdated', handleUpdate);
  }, [id, isWorkApproved]);

  // Handle modal closing if payment is detected
  useEffect(() => {
    if (booking?.paymentStatus === 'SUCCESS') {
      // payment was successful
    }
  }, [booking?.paymentStatus]);

  /* Handlers */
  const handleWorkerPayment = async () => {
    // Determine payment type
    const confirmMsg = booking?.cashCollected
      ? `Worker has collected ₹${booking.finalAmount}. Confirm payment of ₹${booking.vendorEarnings} to worker?`
      : `Confirm payment of ₹${booking.vendorEarnings} to the worker?`;

    setConfirmDialog({
      isOpen: true,
      title: 'Pay Worker',
      message: confirmMsg,
      type: 'info',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await payWorker(id);
          toast.success('Worker payment processed successfully');
          window.location.reload();
        } catch (e) {
          toast.error(e.response?.data?.message || 'Payment failed');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleApproveWork = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Work',
      message: "Approve worker's work and proceed to settlement?",
      type: 'info',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await updateBookingStatus(id, 'completed');
          toast.success('Work approved successfully');
          window.location.reload();
        } catch (e) {
          toast.error(e.response?.data?.message || 'Approval failed');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleFinalSettlement = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Final Settlement',
      message: 'Mark final settlement as done? This will allow you to complete the booking.',
      type: 'warning',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          // Using existing updateBookingStatus to mark settlement
          await updateBookingStatus(id, booking.status, { finalSettlementStatus: 'DONE' });
          toast.success('Final settlement completed!');
          window.location.reload();
        } catch (e) {
          toast.error(e.response?.data?.message || 'Final settlement failed');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };



  // Journey can only start once the customer's payment has gone through (or the plan covers it)
  const isPaymentComplete = booking?.paymentStatus === 'success' || booking?.paymentStatus === 'plan_covered';

  /* Handlers for Vendor Self-Job */
  const handleStartSelfJob = async () => {
    if (!isPaymentComplete) {
      toast.error('Waiting for customer payment. You can start the journey once payment is completed.');
      return;
    }
    try {
      setActionLoading(true);
      await startSelfJob(id);
      toast.success('Journey Started');
      navigate(`/vendor/booking/${id}/map`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start journey');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyVisit = async () => {
    const otp = otpInput.join('');
    if (otp.length !== 4) return toast.error('Enter 4-digit OTP');

    setActionLoading(true);
    // Location check for vendor? Optional or same as worker.
    if (!navigator.geolocation) return toast.error('Geolocation required');

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
        await verifySelfVisit(id, otp, location);
        toast.success('Visit Verified');
        setIsVisitModalOpen(false);
        window.location.reload();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Verification failed');
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleCompleteWork = async (data = {}) => {
    try {
      setActionLoading(true);
      const photos = Array.isArray(data) ? data : (data.photos || []);
      const notes = data.notes || '';
      await completeSelfJob(id, { workPhotos: photos, workDoneDetails: { notes } });
      toast.success('Work marked done');
      setIsWorkDoneModalOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete work');
    } finally {
      setActionLoading(false);
    }
  };

  const timelineStages = [
    {
      id: 1,
      title: 'Booking Requested',
      icon: FiClock,
      action: null,
      description: 'Booking request received',
    },
    {
      id: 2,
      title: 'Booking Accepted',
      icon: FiCheck,
      action: null,
      description: 'You accepted the booking',
    },
    {
      id: 3,
      title: 'Assigned',
      icon: FiUser,
      action: currentStage === 2 ? () => navigate(`/vendor/booking/${id}/assign-worker`) : null,
      description: booking?.assignedTo ? `Assigned to ${booking.assignedTo.name}` : 'Assign worker or start yourself',
    },
    {
      id: 4,
      title: 'Journey Started',
      icon: FiMapPin,
      action: (currentStage === 3 && booking?.isSelfJob) ? handleStartSelfJob : null,
      description: (currentStage === 3 && booking?.isSelfJob && !isPaymentComplete)
        ? 'Waiting for customer payment before journey can start'
        : booking?.isSelfJob ? 'You started journey' : (booking?.assignedTo ? 'Worker started journey' : 'Waiting for journey start'),
    },
    {
      id: 5,
      title: 'Visited Site',
      icon: FiMapPin,
      action: (currentStage === 4 && booking?.isSelfJob) ? () => setIsVisitModalOpen(true) : null,
      description: 'Arrived at location',
    },
    {
      id: 6,
      title: 'Work Done',
      icon: FiTool,
      action: (currentStage === 5 && booking?.isSelfJob) ? () => setIsWorkDoneModalOpen(true) : null,
      description: 'Service work completed',
    },
    {
      id: 7,
      title: booking?.isSelfJob ? 'Complete Booking' : 'Approve Worker Work',
      icon: FiCheckCircle,
      action: (() => {
        if (booking?.status === 'completed' || booking?.status === 'COMPLETED') return null;

        if (booking?.isSelfJob && currentStage === 7) {
          return () => navigate(`/vendor/booking/${id}/billing`);
        }

        if (!booking?.isSelfJob && currentStage === 7) {
          return handleApproveWork;
        }
        return null;
      })(),
      description: booking?.isSelfJob ? 'Confirm service completion' : 'Review and approve worker work',
    },
    {
      id: 8,
      title: 'Pay Worker',
      icon: FiDollarSign,
      action: (currentStage === 8 && !(booking?.isWorkerPaid || booking?.workerPaymentStatus === 'PAID' || booking?.workerPaymentStatus === 'SUCCESS')) ? handleWorkerPayment : null,
      description: (booking?.isWorkerPaid || booking?.workerPaymentStatus === 'PAID' || booking?.workerPaymentStatus === 'SUCCESS') ? 'Worker Paid' : 'Settle payment with worker',
    },
    {
      id: 9,
      title: 'Final Settlement',
      icon: FiFileText,
      action: (currentStage === 9) ? handleFinalSettlement : null,
      description: booking?.finalSettlementStatus === 'DONE' ? 'Settlement Done' : 'Complete final settlement',
    },
    {
      id: 10,
      title: 'Booking Complete',
      icon: FiCheckCircle,
      action: null,
      description: 'Booking successfully finalized',
    },
  ].filter(stage => {
    // Hide worker-specific stages for self jobs
    if (booking?.isSelfJob && stage.id === 8) return false;
    return true;
  });

  // Auto-verify as last digit enters
  useEffect(() => {
    const otpValue = otpInput.join('');
    if (otpValue.length === 4 && !actionLoading && isVisitModalOpen) {
      handleVerifyVisit();
    }
  }, [otpInput]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);
    if (value && index < 3) document.getElementById(`otp-${index + 1}`).focus();
  };

  async function handleVisitSite() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.location?.lat || 22.7196},${booking.location?.lng || 75.8577}`;
    window.open(url, '_blank');

    try {
      await updateBookingStatus(id, 'visited');
      setCurrentStage(4);
      // Reload booking to get latest state
      const response = await getBookingById(id);
      setBooking(prev => ({ ...prev, status: response.data.status }));
    } catch (error) {
      console.error('Error updating status to visited:', error);
      // alert('Failed to update status');
    }
  }

  async function handleWorkDone() {
    try {
      // Try to mark as completed or work_done if backend supports it
      await updateBookingStatus(id, 'work_done');
      setCurrentStage(5); // Update to stage 5
      window.location.reload();
    } catch (error) {
      console.error('Error updating status to work done:', error);
      toast.error('Failed to update status. Please follow valid status flow.');
    }
  }



  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-4" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Timeline" />

      <main className="max-w-md mx-auto px-4 pt-3 pb-6">
        <div className="bg-white rounded-xl p-3.5 shadow-xs">
          {/* Timeline */}
          <div className="relative">
            {timelineStages.map((stage, index) => {
              const IconComponent = stage.icon;
              const isCompleted = stage.id < currentStage;
              const isCurrent = stage.id === currentStage;
              const isPending = stage.id > currentStage;
              const isSkipped = false;

              return (
                <div key={stage.id} className="relative pb-4 last:pb-0">
                  {/* Timeline Line */}
                  {index < timelineStages.length - 1 && (
                    <div
                      className="absolute left-4 top-8 w-0.5 h-full"
                      style={{
                        background: isCompleted ? themeColors.button : '#E5E7EB',
                      }}
                    />
                  )}

                  {/* Timeline Item */}
                  <div className="flex items-start gap-3">
                    {/* Icon Circle */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-white' : isCurrent ? 'bg-white' : 'bg-gray-100'
                        }`}
                      style={{
                        border: `2px solid ${isCompleted || isCurrent ? themeColors.button : '#E5E7EB'}`,
                        boxShadow: isCurrent ? `0 0 0 3px ${themeColors.button}20` : 'none',
                      }}
                    >
                      {isCompleted ? (
                        <FiCheck className="w-4 h-4" style={{ color: themeColors.button }} />
                      ) : (
                        <IconComponent
                          className="w-3.5 h-3.5"
                          style={{
                            color: isCurrent ? themeColors.button : '#9CA3AF',
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-0.5 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3
                          className={`text-xs font-bold leading-tight ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                            }`}
                        >
                          {stage.title}
                        </h3>
                        {isSkipped && (
                          <span className="text-[10px] text-gray-400">Skipped</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mb-1 leading-snug">{stage.description}</p>

                      {/* Hourly Service Timer / End Service — replaces "Mark Work Done" for hourly bookings */}
                      {stage.id === 6 && booking?.hourlyTracking?.isHourly && (currentStage === 5 || currentStage === 6) &&
                        !(booking.hourlyTracking.phase === 'ENDED' && booking.hourlyTracking.workDoneAllowed) && (
                          <div className="my-1">
                            <HourlyServiceTimer
                              bookingId={id}
                              hourlyTracking={booking.hourlyTracking}
                              onStarted={loadBooking}
                              onEnded={loadBooking}
                            />
                          </div>
                        )}

                      {/* Action Button */}
                      {stage.action && !isSkipped &&
                        !(stage.id === 6 && booking?.hourlyTracking?.isHourly && !(booking.hourlyTracking.phase === 'ENDED' && booking.hourlyTracking.workDoneAllowed)) &&
                        (() => {
                        const isJourneyPaymentBlocked = stage.id === 4 && booking?.isSelfJob && !isPaymentComplete;
                        return (
                          <button
                            onClick={isJourneyPaymentBlocked ? undefined : stage.action}
                            disabled={isJourneyPaymentBlocked}
                            className={`px-3 py-1.5 rounded-lg font-bold text-white text-xs transition-all shadow-xs my-1 ${isJourneyPaymentBlocked ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 cursor-pointer'
                              }`}
                            style={{
                              background: isJourneyPaymentBlocked ? '#9CA3AF' : themeColors.button,
                            }}
                          >
                            {stage.id === 3 ? 'Assign Worker' :
                              stage.id === 4 ? (isJourneyPaymentBlocked ? 'Payment Pending' : 'Start Journey') :
                                stage.id === 5 ? 'Mark Arrived' :
                                  stage.id === 6 ? 'Mark Work Done' :
                                    stage.id === 7 ? (
                                      booking?.isSelfJob ? 'Complete Booking' : 'Approve Work'
                                    ) :
                                      stage.id === 8 ? 'Pay Worker' :
                                        stage.id === 9 ? 'Final Settlement' : 'Continue'}
                          </button>
                        );
                      })()}

                      {/* Online Payment Status Badge for Stage 7 */}
                      {stage.id === 7 && (booking?.paymentStatus === 'SUCCESS' || booking?.paymentStatus === 'paid') && !isCompleted && (
                        <div className="mt-1 flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ONLINE PAYMENT RECEIVED
                        </div>
                      )}

                      {/* Timestamp */}
                      {isCompleted && booking.timeline && booking.timeline.find(t => t.stage === stage.id) && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(booking.timeline.find(t => t.stage === stage.id).timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Visit OTP Modal */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Verify Self Visit</h3>
              <button onClick={() => setIsVisitModalOpen(false)}><FiX /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Enter user OTP to verify arrival.</p>
            <div className="flex gap-2 justify-center mb-4">
              {[0, 1, 2, 3].map((i) => (
                <input key={i} id={`otp-${i}`} type="number" value={otpInput[i]} onChange={(e) => handleOtpChange(i, e.target.value)} className="w-10 h-10 border rounded text-center" maxLength={1} />
              ))}
            </div>
            <button onClick={handleVerifyVisit} disabled={actionLoading} className="w-full bg-blue-600 text-white py-2 rounded-lg">{actionLoading ? 'Verifying...' : 'Verify'}</button>
          </div>
        </div>
      )}

      {/* Work Done Modal */}
      <WorkCompletionModal
        isOpen={isWorkDoneModalOpen}
        onClose={() => setIsWorkDoneModalOpen(false)}
        job={booking}
        onComplete={handleCompleteWork}
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
};

export default BookingTimeline;


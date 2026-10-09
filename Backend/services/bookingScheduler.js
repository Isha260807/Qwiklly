/**
 * Booking Scheduler Service — Optimized
 * Handles zone-broadcast booking expiry and payment timeout recovery.
 *
 * OPTIMIZATIONS:
 * - All active bookings processed in PARALLEL (Promise.all, not serial for-loop)
 * - Circuit breaker: if no searching bookings exist, extend check interval to 30s
 * - Single Vendor.find per wave instead of per booking
 */

const Booking = require('../models/Booking');
const Vendor = require('../models/Vendor');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { createNotification } = require('../controllers/notificationControllers/notificationController');

const Settings = require('../models/Settings');

let MAX_SEARCH_TIME_MS = 5 * 60 * 1000; // 5 mins fallback

const ACTIVE_INTERVAL_MS = 5000;  // Poll every 5s when bookings exist
const IDLE_INTERVAL_MS = 30000;   // Poll every 30s when no active bookings (circuit breaker)

class BookingScheduler {
  constructor(io) {
    this.io = io;
    this.intervalId = null;
    this.isRunning = false;
    this.isIdle = false; // Circuit breaker state
  }

  start() {
    if (this.isRunning) {
      console.log('[BookingScheduler] Already running.');
      return;
    }
    this.isRunning = true;
    console.log('[BookingScheduler] Started — active interval: 5s, idle interval: 30s');
    this.scheduleNext(ACTIVE_INTERVAL_MS);
  }

  scheduleNext(intervalMs) {
    if (this.intervalId) clearTimeout(this.intervalId);
    this.intervalId = setTimeout(async () => {
      const [hadWaveWork, hadTimeoutWork, hadSlotWork] = await Promise.all([
        this.processWaves(),
        this.processPaymentTimeouts(),
        this.processSlotPaymentTimeouts()
      ]);
      // Adaptive interval: if idle, slow down; if active, stay fast
      this.scheduleNext((hadWaveWork || hadTimeoutWork || hadSlotWork) ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS);
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('[BookingScheduler] Stopped.');
    }
  }

  /**
   * Expire zone-broadcast searches in PARALLEL.
   * Vendors are all notified at dispatch time; this method must never send a
   * second wave or use distance/radius as a fallback.
   * @returns {boolean} true if active searches exist, false if idle
   */
  async processWaves() {
    try {
      try {
        const globalSettings = await Settings.findOne({ type: 'global' }).select('maxSearchTime').lean();
        if (globalSettings) {
          MAX_SEARCH_TIME_MS = (globalSettings.maxSearchTime || 5) * 60 * 1000;
        }
      } catch (sErr) {
        console.error('[BookingScheduler] Settings fetch error:', sErr);
      }

      const activeBookings = await Booking.find(
        {
          status: BOOKING_STATUS.SEARCHING,
          dispatchState: { $in: ['DISPATCHED', null] },
          waveStartedAt: { $ne: null },
          potentialVendors: { $exists: true, $not: { $size: 0 } }
        },
        '_id waveStartedAt potentialVendors notifiedVendors bookingNumber createdAt userId expiresAt dispatchState'
      ).lean();

      if (activeBookings.length === 0) {
        return false; // Idle — caller will use longer interval
      }

      const now = Date.now();

      await Promise.all(
        activeBookings.map(async (booking) => {
          try {
            const startTime = new Date(booking.waveStartedAt || booking.createdAt).getTime();
            const totalElapsed = now - startTime;

            // --- PERSISTENCE: Save expiresAt to DB if missing ---
            if (!booking.expiresAt) {
              const expiresAtDate = new Date(startTime + MAX_SEARCH_TIME_MS);
              await Booking.findByIdAndUpdate(booking._id, { $set: { expiresAt: expiresAtDate } });
            }

            // --- EXPIRY CHECK ---
            if (totalElapsed > MAX_SEARCH_TIME_MS) {
              console.log(`[BookingScheduler] ${booking.bookingNumber}: Search timed out. Cancelling.`);

              const expiredBooking = await Booking.findOneAndUpdate(
                {
                  _id: booking._id,
                  status: BOOKING_STATUS.SEARCHING,
                  vendorId: null
                },
                {
                  $set: {
                    status: BOOKING_STATUS.NO_VENDORS,
                    cancellationReason: 'No vendor accepted within time limit'
                  }
                },
                { new: true }
              ).lean();

              if (!expiredBooking) return;

              // Notify User
              if (this.io) {
                this.io.to(`user_${booking.userId}`).emit('booking_search_failed', {
                  bookingId: booking._id,
                  message: 'No vendors available at the moment. Please try again later.'
                });
              }

              // Remove from all notified vendors
              if (this.io && booking.notifiedVendors && booking.notifiedVendors.length > 0) {
                booking.notifiedVendors.forEach(vId => {
                  this.io.to(`vendor_${vId}`).emit('removeVendorBooking', { id: booking._id });
                });
              }

              return;
            }

          } catch (bookingErr) {
            console.error(`[BookingScheduler] Error expiring booking ${booking._id}:`, bookingErr);
          }
        })
      );

      return true; // Had work to do
    } catch (error) {
      console.error('[BookingScheduler] Error processing waves:', error);
      return false;
    }
  }

  /**
   * Cancel bookings whose online payment was not completed within the
   * admin-configured window after a vendor accepted them.
   * @returns {boolean} true if any booking was cancelled, false if idle
   */
  async processPaymentTimeouts() {
    try {
      const globalSettings = await Settings.findOne({ type: 'global' }).select('paymentTimeoutMinutes').lean();
      const timeoutMs = (globalSettings?.paymentTimeoutMinutes || 15) * 60 * 1000;
      const cutoff = new Date(Date.now() - timeoutMs);
      const acceptedPaymentTimeoutStatuses = [
        BOOKING_STATUS.ACCEPTED,
        BOOKING_STATUS.ASSIGNED,
        BOOKING_STATUS.CONFIRMED
      ];

      const timedOutBookings = await Booking.find({
        status: { $in: acceptedPaymentTimeoutStatuses },
        vendorId: { $ne: null },
        paymentMethod: 'online',
        paymentStatus: PAYMENT_STATUS.PENDING,
        // Fixed NORMAL SLOT bookings have their own createdAt-based timeout
        // path below. This path handles instant and Duration/Hourly bookings
        // after a vendor has accepted them.
        $or: [
          { bookingType: { $ne: 'scheduled' } },
          { bookingType: 'scheduled', 'hourlyTracking.isHourly': true }
        ],
        acceptedAt: { $lte: cutoff }
      }).select('_id vendorId userId bookingNumber');

      if (timedOutBookings.length === 0) return false;

      await Promise.all(timedOutBookings.map(async (booking) => {
        try {
          const releasedVendorId = booking.vendorId;

          // Conditional update prevents a late scheduler tick from cancelling
          // a booking whose payment was completed in the meantime.
          const cancelled = await Booking.findOneAndUpdate(
            {
              _id: booking._id,
              status: { $in: acceptedPaymentTimeoutStatuses },
              vendorId: releasedVendorId,
              paymentMethod: 'online',
              paymentStatus: PAYMENT_STATUS.PENDING,
              acceptedAt: { $lte: cutoff }
            },
            {
              $set: {
                status: BOOKING_STATUS.CANCELLED,
                vendorAssignmentStatus: 'FAILED',
                cancelledAt: new Date(),
                cancelledBy: 'system',
                cancellationReason: 'Payment was not completed in time'
              }
            },
            { new: true }
          ).lean();

          if (!cancelled) return;

          const BookingRequest = require('../models/BookingRequest');
          await BookingRequest.deleteMany({ bookingId: cancelled._id });

          // The accepted vendor is free for a new booking after cancellation.
          await Vendor.findByIdAndUpdate(releasedVendorId, { availability: 'AVAILABLE' });

          await createNotification({
            vendorId: releasedVendorId,
            type: 'booking_cancelled',
            title: 'Booking Cancelled',
            message: 'Booking ' + cancelled.bookingNumber + ' was cancelled because the customer did not complete payment in time.',
            relatedId: cancelled._id,
            relatedType: 'booking'
          });

          await createNotification({
            userId: cancelled.userId,
            type: 'booking_cancelled',
            title: 'Booking Cancelled',
            message: 'Booking ' + cancelled.bookingNumber + ' was cancelled because payment was not completed in time.',
            relatedId: cancelled._id,
            relatedType: 'booking'
          });

          if (this.io) {
            this.io.to('user_' + cancelled.userId).emit('booking_updated', {
              bookingId: cancelled._id,
              status: BOOKING_STATUS.CANCELLED,
              message: 'Booking cancelled - payment not completed in time'
            });
            this.io.to('vendor_' + releasedVendorId).emit('booking_updated', {
              bookingId: cancelled._id,
              status: BOOKING_STATUS.CANCELLED,
              message: 'Booking cancelled because payment was not completed in time'
            });
          }

          console.log('[BookingScheduler] ' + cancelled.bookingNumber + ': Payment timeout - booking cancelled and vendor ' + releasedVendorId + ' released.');
        } catch (err) {
          console.error('[BookingScheduler] Error cancelling timed-out booking ' + booking._id + ':', err);
        }
      }));

      return true;
    } catch (error) {
      console.error('[BookingScheduler] Error processing payment timeouts:', error);
      return false;
    }
  }

  /**
   * Cancel SLOT bookings (system-assigned scheduled bookings) whose online
   * payment was not completed within the admin-configured window, so the
   * vendor's slot becomes bookable again. Bookings a vendor accepted manually
   * are handled by processPaymentTimeouts (they always have acceptedAt set).
   * @returns {boolean} true if any booking was cancelled
   */
  async processSlotPaymentTimeouts() {
    try {
      const globalSettings = await Settings.findOne({ type: 'global' }).select('paymentTimeoutMinutes').lean();
      const timeoutMs = (globalSettings?.paymentTimeoutMinutes || 15) * 60 * 1000;
      const cutoff = new Date(Date.now() - timeoutMs);

      const unpaid = await Booking.find({
        bookingType: 'scheduled',
        status: BOOKING_STATUS.CONFIRMED,
        vendorId: { $ne: null },
        acceptedAt: null,
        paymentMethod: 'online',
        paymentStatus: PAYMENT_STATUS.PENDING,
        createdAt: { $lte: cutoff }
      }).select('_id');

      if (unpaid.length === 0) return false;

      await Promise.all(unpaid.map(async ({ _id }) => {
        try {
          // Conditional update: skip if payment landed in the meantime
          const cancelled = await Booking.findOneAndUpdate(
            { _id, status: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PENDING },
            {
              $set: {
                status: BOOKING_STATUS.CANCELLED,
                cancelledAt: new Date(),
                cancelledBy: 'system',
                cancellationReason: 'Payment was not completed in time'
              }
            },
            { new: true }
          ).lean();

          if (!cancelled) return;

          await createNotification({
            userId: cancelled.userId,
            type: 'booking_cancelled',
            title: 'Booking Cancelled',
            message: `Booking ${cancelled.bookingNumber} was cancelled because payment was not completed in time.`,
            relatedId: cancelled._id,
            relatedType: 'booking'
          });

          if (this.io) {
            this.io.to(`user_${cancelled.userId}`).emit('booking_updated', {
              bookingId: cancelled._id,
              status: BOOKING_STATUS.CANCELLED,
              message: 'Booking cancelled - payment not completed in time'
            });
            this.io.to(`vendor_${cancelled.vendorId}`).emit('booking_updated', {
              bookingId: cancelled._id,
              status: BOOKING_STATUS.CANCELLED,
              message: 'An unpaid scheduled booking was released'
            });
          }

          console.log(`[BookingScheduler] ${cancelled.bookingNumber}: Slot booking unpaid after timeout — cancelled, slot released.`);
        } catch (err) {
          console.error(`[BookingScheduler] Error cancelling unpaid slot booking ${_id}:`, err);
        }
      }));

      return true;
    } catch (error) {
      console.error('[BookingScheduler] Error processing slot payment timeouts:', error);
      return false;
    }
  }

  async notifyVendors(booking, vendors) {
    try {
      // Fetch booking details for notification (single query for the whole wave)
      const populatedBooking = await Booking.findById(booking._id)
        .populate('serviceId', 'title')
        .populate('userId', 'name phone')
        .lean();

      if (!populatedBooking) return;

      const serviceName = populatedBooking.serviceId?.title || populatedBooking.serviceName;
      const customerName = populatedBooking.userId?.name || 'Customer';

      // Send all vendor notifications in parallel
      await Promise.all(
        vendors.map(async (v) => {
          // Fire socket immediately (synchronous, non-blocking)
          if (this.io) {
            this.io.to(`vendor_${v.vendorId}`).emit('new_booking_request', {
              bookingId: booking._id,
              serviceName,
              customerName,
              scheduledDate: populatedBooking.scheduledDate,
              scheduledTime: populatedBooking.scheduledTime,
              price: populatedBooking.finalAmount,
              address: populatedBooking.address,
              distance: v.distance,
              serviceCategory: populatedBooking.serviceCategory,
              brandName: populatedBooking.brandName,
              brandIcon: populatedBooking.brandIcon,
              categoryIcon: populatedBooking.categoryIcon,
              createdAt: populatedBooking.createdAt,
              waveStartedAt: populatedBooking.waveStartedAt,
              expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
              playSound: true,
              message: `New booking request within ${v.distance?.toFixed(1) || '?'}km!`
            });
          }

          // Create DB notification + FCM push
          await createNotification({
            vendorId: v.vendorId,
            type: 'booking_request',
            title: 'New Booking Request',
            message: `New service request for ${serviceName} from ${customerName}`,
            relatedId: booking._id,
            relatedType: 'booking',
            data: {
              bookingId: booking._id,
              serviceName,
              customerName,
              scheduledDate: populatedBooking.scheduledDate,
              scheduledTime: populatedBooking.scheduledTime,
              location: populatedBooking.address,
              price: populatedBooking.finalAmount,
              distance: v.distance
            },
            pushData: {
              type: 'new_booking',
              dataOnly: false,
              link: `/vendor/bookings/${booking._id}`
            }
          });
        })
      );

      console.log(`[BookingScheduler] Notified ${vendors.length} vendors for booking ${booking.bookingNumber}`);
    } catch (error) {
      console.error('[BookingScheduler] Error notifying vendors:', error);
    }
  }
}

// Singleton instance
let schedulerInstance = null;

const initializeScheduler = (io) => {
  if (!schedulerInstance) {
    schedulerInstance = new BookingScheduler(io);
    schedulerInstance.start();
  }
  return schedulerInstance;
};

const getScheduler = () => schedulerInstance;

module.exports = { BookingScheduler, initializeScheduler, getScheduler };

const Transaction = require('../../models/Transaction');
const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const PlatformEarning = require('../../models/PlatformEarning');
const VendorPayrollPayment = require('../../models/VendorPayrollPayment');

/**
 * Auto-sync paid/completed bookings to Transaction collection
 */
const syncBookingTransactions = async () => {
  try {
    const bookings = await Booking.find({
      $or: [
        { paymentStatus: 'success' },
        { status: { $in: ['completed', 'work_done'] } }
      ]
    });

    for (const booking of bookings) {
      const exists = await Transaction.findOne({
        $or: [
          { bookingId: booking._id },
          { referenceId: `PAY-${booking.bookingNumber}` }
        ]
      });

      if (!exists) {
        await Transaction.create({
          userId: booking.userId,
          vendorId: booking.vendorId,
          bookingId: booking._id,
          referenceId: `PAY-${booking.bookingNumber || booking._id.toString().slice(-6).toUpperCase()}`,
          razorpayOrderId: booking.razorpayOrderId || null,
          type: booking.paymentMethod === 'pay_at_home' || booking.paymentMethod === 'cod' ? 'cash_collected' : 'payment',
          amount: booking.finalAmount || 0,
          status: booking.paymentStatus === 'success' || booking.status === 'completed' || booking.status === 'work_done' ? 'completed' : 'pending',
          paymentMethod: booking.paymentMethod || 'online',
          description: `Payment for booking #${booking.bookingNumber || booking._id}`,
          createdAt: booking.createdAt || new Date()
        }).catch(err => console.error('Transaction sync item error:', err));
      }
    }
  } catch (err) {
    console.error('Error during auto-sync of transactions:', err);
  }
};

/**
 * Get all transactions with pagination and filtering
 */
const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type, entity } = req.query;

    await syncBookingTransactions();

    // --- SPECIAL HANDLING FOR ADMIN REVENUE (Extract from Bookings) ---
    if (entity === 'admin') {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      let bookingQuery = {
        status: { $in: ['COMPLETED', 'completed', 'paid', 'PAID', 'WORK_DONE', 'work_done'] }
      };

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const [users, vendors] = await Promise.all([
          User.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select('_id'),
          Vendor.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select('_id'),
        ]);

        bookingQuery.$or = [
          { bookingNumber: searchRegex },
          { userId: { $in: users.map(u => u._id) } },
          { vendorId: { $in: vendors.map(v => v._id) } }
        ];
      }

      const shouldInclude = (t) => !type || type === 'all' || type === t;

      const bookings = await Booking.find(bookingQuery)
        .populate('userId', 'name email phone')
        .populate('vendorId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalBookings = await Booking.countDocuments(bookingQuery);

      let virtualTransactions = [];

      bookings.forEach(booking => {

        if (shouldInclude('payment')) {
          virtualTransactions.push({
            _id: `${booking._id}_pay`,
            referenceId: `PAY-${booking.bookingNumber}`,
            bookingId: booking,
            userId: booking.userId,
            vendorId: booking.vendorId,
            type: 'payment',
            amount: booking.finalAmount || 0,
            status: 'completed',
            paymentMethod: booking.paymentMethod || 'online',
            createdAt: booking.createdAt,
            description: 'Booking payment received by admin for ' + booking.bookingNumber
          });
        }
      });

      return res.status(200).json({
        success: true,
        data: virtualTransactions,
        pagination: {
          total: shouldInclude('payment') ? totalBookings : 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((shouldInclude('payment') ? totalBookings : 0) / parseInt(limit)) || 1
        }
      });
    }

    // --- STANDARD LOGIC FOR OTHERS (User, Vendor, Worker, All) ---
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const { startDate, endDate } = req.query;
    let andConditions = [];

    if (status && status !== 'all' && status !== 'All Status') {
      andConditions.push({ status });
    }

    if (type && type !== 'all' && type !== 'All Types') {
      andConditions.push({ type });
    }

    if (startDate || endDate) {
      let dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      andConditions.push({ createdAt: dateFilter });
    }

    if (entity) {
      if (entity === 'user') {
        andConditions.push({
          $or: [
            { userId: { $ne: null } },
            { type: 'cash_collected' },
            { type: 'payment' }
          ]
        });
      } else if (entity === 'vendor') {
        andConditions.push({ vendorId: { $ne: null } });
      } else if (entity === 'worker') {
        andConditions.push({ workerId: { $ne: null } });
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const [users, vendors, bookings] = await Promise.all([
        User.find({ $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }] }).select('_id'),
        Vendor.find({ $or: [{ name: searchRegex }, { email: searchRegex }, { businessName: searchRegex }] }).select('_id'),
        Booking.find({ $or: [{ bookingNumber: searchRegex }, { customerPhone: searchRegex }] }).select('_id')
      ]);

      const userIds = users.map(u => u._id);
      const vendorIds = vendors.map(v => v._id);
      const bookingIds = bookings.map(b => b._id);

      const searchOr = [
        { referenceId: searchRegex },
        { razorpayOrderId: searchRegex },
        { description: searchRegex },
        { userId: { $in: userIds } },
        { vendorId: { $in: vendorIds } },
        { bookingId: { $in: bookingIds } }
      ];

      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        searchOr.push({ _id: search });
      }

      andConditions.push({ $or: searchOr });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email phone')
      .populate('vendorId', 'businessName name email phone')
      .populate({
        path: 'bookingId',
        select: 'bookingNumber userId serviceName finalAmount customerPhone customerName',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)) || 1
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

/**
 * Get transaction statistics for dashboard
 */
const getTransactionStats = async (req, res) => {
  try {
    const { entity } = req.query;

    await syncBookingTransactions();

    // --- SPECIAL HANDLING FOR ADMIN REVENUE ---
    if (entity === 'admin') {
      const [stats, payrollStats] = await Promise.all([
        PlatformEarning.aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalRevenue' },
              totalGST: { $sum: '$totalGST' }
            }
          }
        ]),
        VendorPayrollPayment.aggregate([
          { $match: { status: 'paid' } },
          { $group: { _id: null, totalSalaryPaid: { $sum: '$totalAmount' } } }
        ])
      ]);

      const data = stats[0] || { totalRevenue: 0, totalGST: 0 };
      const totalSalaryPaid = payrollStats[0]?.totalSalaryPaid || 0;
      return res.status(200).json({
        success: true,
        data: {
          totalRevenue: data.totalRevenue,
          totalBookingRevenue: data.totalRevenue,
          totalSalaryPaid,
          totalGST: data.totalGST,
          netRevenue: data.totalRevenue - totalSalaryPaid
        }
      });
    }

    // --- STANDARD LOGIC FOR OTHERS ---
    let matchQuery = {
      status: { $in: ['completed', 'success'] }
    };

    if (entity) {
      if (entity === 'user') {
        matchQuery.$or = [
          { userId: { $ne: null } },
          { type: { $in: ['payment', 'cash_collected', 'credit', 'debit'] } }
        ];
      }
      if (entity === 'vendor') matchQuery.vendorId = { $ne: null };
      if (entity === 'worker') matchQuery.workerId = { $ne: null };
    }

    const revenueStats = await Transaction.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $ne: ['$type', 'refund'] }, '$amount', 0]
            }
          },
          totalRefunds: {
            $sum: {
              $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const stats = revenueStats[0] || { totalRevenue: 0, totalRefunds: 0 };
    const netRevenue = stats.totalRevenue - stats.totalRefunds;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: stats.totalRevenue,
        totalRefunds: stats.totalRefunds,
        netRevenue
      }
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics'
    });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionStats
};

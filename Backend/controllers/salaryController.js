const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const VendorSalaryEarning = require('../models/VendorSalaryEarning');
const VendorPayrollPayment = require('../models/VendorPayrollPayment');
const Transaction = require('../models/Transaction');
const { createNotification } = require('./notificationControllers/notificationController');
const {
  refreshPendingSalaryEarnings,
  refreshAccruedSalaryEarnings
} = require('../services/salaryEarningService');

const asObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error('Invalid vendor id');
    error.statusCode = 400;
    throw error;
  }
  return new mongoose.Types.ObjectId(value);
};

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Invalid date');
    error.statusCode = 400;
    throw error;
  }
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
};

const getDateFilter = (startDate, endDate, field = 'earningDate') => {
  const filter = {};
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  if (start || end) {
    filter[field] = {};
    if (start) filter[field].$gte = start;
    if (end) filter[field].$lte = end;
  }
  return filter;
};

const getSummary = async (vendorId, dateFilter = {}) => {
  const match = {
    vendorId,
    status: { $ne: 'reversed' },
    ...dateFilter
  };

  const [summary] = await VendorSalaryEarning.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalEarning: { $sum: '$amount' },
        paidEarning: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
        },
        pendingEarning: {
          $sum: { $cond: [{ $in: ['$status', ['accrued', 'pending_rate']] }, '$amount', 0] }
        },
        bookingEarning: {
          $sum: { $cond: [{ $eq: ['$type', 'booking_earning'] }, '$amount', 0] }
        },
        manualEarning: {
          $sum: { $cond: [{ $ne: ['$type', 'booking_earning'] }, '$amount', 0] }
        },
        recordCount: { $sum: 1 }
      }
    }
  ]);

  return summary || {
    totalEarning: 0,
    paidEarning: 0,
    pendingEarning: 0,
    bookingEarning: 0,
    manualEarning: 0,
    recordCount: 0
  };
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

const listEarnings = async (vendorId, query = {}) => {
  const {
    startDate,
    endDate,
    type,
    status,
    page = 1,
    limit = 50
  } = query;
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const filter = {
    vendorId,
    status: status || { $ne: 'reversed' },
    ...getDateFilter(startDate, endDate)
  };
  if (type) filter.type = type;

  const [data, total] = await Promise.all([
    VendorSalaryEarning.find(filter)
      .populate('bookingId', 'bookingNumber serviceName completedAt scheduledDate')
      .sort({ earningDate: -1, createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    VendorSalaryEarning.countDocuments(filter)
  ]);

  return {
    data,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit)
    }
  };
};

const listPayments = async (vendorId, query = {}) => {
  const { startDate, endDate, page = 1, limit = 20 } = query;
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const filter = { vendorId };
  const dateFilter = getDateFilter(startDate, endDate, 'paidAt');
  Object.assign(filter, dateFilter);

  const [data, total] = await Promise.all([
    VendorPayrollPayment.find(filter)
      .populate('paidBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    VendorPayrollPayment.countDocuments(filter)
  ]);

  return {
    data,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit)
    }
  };
};

const getVendorSalaryWallet = async (req, res) => {
  try {
    const vendorId = asObjectId(req.user.id);
    const vendor = await Vendor.findById(vendorId)
      .select('name businessName email phone bankDetails salaryConfig')
      .lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    await Promise.all([
      refreshPendingSalaryEarnings(vendorId),
      refreshAccruedSalaryEarnings(vendorId)
    ]);

    const dateFilter = getDateFilter(req.query.startDate, req.query.endDate);
    const [summary, today, earnings, payments] = await Promise.all([
      getSummary(vendorId, dateFilter),
      getSummary(vendorId, { earningDate: getTodayRange() }),
      listEarnings(vendorId, req.query),
      listPayments(vendorId, req.query)
    ]);

    res.json({
      success: true,
      data: {
        vendor,
        salaryConfig: vendor.salaryConfig || {},
        summary: {
          ...summary,
          todayEarn: today.totalEarning || 0
        },
        earnings: earnings.data,
        earningsPagination: earnings.pagination,
        payments: payments.data,
        paymentsPagination: payments.pagination
      }
    });
  } catch (error) {
    console.error('Get vendor salary wallet error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch salary wallet' });
  }
};

const getVendorSalaryEarnings = async (req, res) => {
  try {
    const vendorId = asObjectId(req.user.id);
    const result = await listEarnings(vendorId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get vendor salary earnings error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch earnings' });
  }
};

const getVendorSalaryPayments = async (req, res) => {
  try {
    const vendorId = asObjectId(req.user.id);
    const result = await listPayments(vendorId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get vendor salary payments error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch payments' });
  }
};

const getAdminSalaryWallets = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .select('name businessName email phone bankDetails salaryConfig approvalStatus isActive')
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      Vendor.countDocuments(query)
    ]);

    const vendorIds = vendors.map((vendor) => vendor._id);
    const todayRange = getTodayRange();
    const aggregates = await VendorSalaryEarning.aggregate([
      {
        $match: {
          vendorId: { $in: vendorIds },
          status: { $ne: 'reversed' }
        }
      },
      {
        $group: {
          _id: '$vendorId',
          totalEarning: { $sum: '$amount' },
          pendingEarning: {
            $sum: { $cond: [{ $in: ['$status', ['accrued', 'pending_rate']] }, '$amount', 0] }
          },
          todayEarn: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$earningDate', todayRange.$gte] }, { $lte: ['$earningDate', todayRange.$lte] }] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const payments = await VendorPayrollPayment.aggregate([
      { $match: { vendorId: { $in: vendorIds }, status: 'paid' } },
      { $group: { _id: '$vendorId', paidAmount: { $sum: '$totalAmount' }, lastPaidAt: { $max: '$paidAt' } } }
    ]);
    const earningsByVendor = new Map(aggregates.map((item) => [String(item._id), item]));
    const paymentsByVendor = new Map(payments.map((item) => [String(item._id), item]));

    res.json({
      success: true,
      data: vendors.map((vendor) => ({
        ...vendor,
        summary: earningsByVendor.get(String(vendor._id)) || { totalEarning: 0, pendingEarning: 0, todayEarn: 0 },
        paidAmount: paymentsByVendor.get(String(vendor._id))?.paidAmount || 0,
        lastPaidAt: paymentsByVendor.get(String(vendor._id))?.lastPaidAt || null
      })),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Get admin salary wallets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor salary wallets' });
  }
};

const getAdminVendorSalaryWallet = async (req, res) => {
  try {
    const vendorId = asObjectId(req.params.vendorId);
    const vendor = await Vendor.findById(vendorId)
      .select('-password')
      .lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    await Promise.all([
      refreshPendingSalaryEarnings(vendorId),
      refreshAccruedSalaryEarnings(vendorId)
    ]);

    const dateFilter = getDateFilter(req.query.startDate, req.query.endDate);
    const [summary, today, earnings, payments] = await Promise.all([
      getSummary(vendorId, dateFilter),
      getSummary(vendorId, { earningDate: getTodayRange() }),
      listEarnings(vendorId, req.query),
      listPayments(vendorId, req.query)
    ]);

    res.json({
      success: true,
      data: {
        vendor,
        summary: {
          ...summary,
          todayEarn: today.totalEarning || 0
        },
        earnings: earnings.data,
        earningsPagination: earnings.pagination,
        payments: payments.data,
        paymentsPagination: payments.pagination
      }
    });
  } catch (error) {
    console.error('Get admin vendor salary wallet error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch vendor salary wallet' });
  }
};

const updateSalaryRate = async (req, res) => {
  try {
    const vendorId = asObjectId(req.params.vendorId);
    const rateAmount = Number(req.body.rateAmount);
    const rateUnitMinutes = Number(req.body.rateUnitMinutes);
    const effectiveFrom = parseDate(req.body.effectiveFrom) || new Date();

    if (!Number.isFinite(rateAmount) || rateAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A positive rate amount is required' });
    }
    if (![30, 60].includes(rateUnitMinutes)) {
      return res.status(400).json({ success: false, message: 'Rate unit must be 30 or 60 minutes' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    if (!vendor.salaryConfig) vendor.salaryConfig = {};
    vendor.salaryConfig.rateAmount = rateAmount;
    vendor.salaryConfig.rateUnitMinutes = rateUnitMinutes;
    vendor.salaryConfig.effectiveFrom = effectiveFrom;
    vendor.salaryConfig.rateHistory = vendor.salaryConfig.rateHistory || [];
    vendor.salaryConfig.rateHistory.push({
      rateAmount,
      rateUnitMinutes,
      effectiveFrom,
      updatedBy: req.user.id
    });
    await vendor.save();

    const [refreshedPending, refreshedAccrued] = await Promise.all([
      refreshPendingSalaryEarnings(vendorId),
      refreshAccruedSalaryEarnings(vendorId)
    ]);

    res.json({
      success: true,
      message: 'Salary rate updated successfully',
      data: {
        salaryConfig: vendor.salaryConfig,
        refreshedPending,
        refreshedAccrued
      }
    });
  } catch (error) {
    console.error('Update salary rate error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to update salary rate' });
  }
};

const createPayrollPayment = async (req, res) => {
  try {
    const vendorId = asObjectId(req.params.vendorId);
    const {
      periodType = 'month',
      periodStart,
      periodEnd,
      salaryAmount = 0,
      bonusAmount = 0,
      incentiveAmount = 0,
      adjustmentAmount = 0,
      customItems = [],
      paymentMethod = 'bank_transfer',
      paymentReference = '',
      notes = ''
    } = req.body;

    if (!['week', 'month', 'custom'].includes(periodType)) {
      return res.status(400).json({ success: false, message: 'Invalid payment period' });
    }

    const start = parseDate(periodStart);
    const end = parseDate(periodEnd, true);
    if (!start || !end || start > end) {
      return res.status(400).json({ success: false, message: 'Valid payment period is required' });
    }

    const numeric = {
      salaryAmount: Number(salaryAmount) || 0,
      bonusAmount: Number(bonusAmount) || 0,
      incentiveAmount: Number(incentiveAmount) || 0,
      adjustmentAmount: Number(adjustmentAmount) || 0
    };
    if (Object.values(numeric).some((value) => value < 0)) {
      return res.status(400).json({ success: false, message: 'Payment amounts cannot be negative' });
    }
    if (!Array.isArray(customItems)) {
      return res.status(400).json({ success: false, message: 'Custom earning fields must be an array' });
    }
    const normalizedCustomItems = customItems
      .map((item) => ({
        label: String(item?.label || '').trim(),
        amount: Number(item?.amount) || 0
      }))
      .filter((item) => item.label || item.amount > 0);
    if (normalizedCustomItems.some((item) => !item.label || item.amount < 0)) {
      return res.status(400).json({ success: false, message: 'Each custom earning needs a field name and valid amount' });
    }
    const customItemsAmount = normalizedCustomItems.reduce((sum, item) => sum + item.amount, 0);
    if (!['bank_transfer', 'upi', 'cash', 'other'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const vendor = await Vendor.findById(vendorId).select('name businessName bankDetails');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const existingPayment = await VendorPayrollPayment.findOne({
      vendorId,
      periodType,
      periodStart: start
    });
    if (existingPayment) {
      if (existingPayment.status === 'paid') {
        return res.status(200).json({
          success: true,
          alreadyProcessed: true,
          message: 'Payment for this vendor and period is already marked as done',
          data: existingPayment
        });
      }
      return res.status(409).json({ success: false, message: 'Payment for this vendor and period already exists', data: existingPayment });
    }

    const bookingEntries = await VendorSalaryEarning.find({
      vendorId,
      type: 'booking_earning',
      status: 'accrued',
      earningDate: { $gte: start, $lte: end }
    });
    const bookingEarningsAmount = bookingEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalAmount = Number((
      bookingEarningsAmount +
      numeric.salaryAmount +
      numeric.bonusAmount +
      numeric.incentiveAmount +
      numeric.adjustmentAmount +
      customItemsAmount
    ).toFixed(2));

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'There is no earning amount to mark as paid' });
    }

    const payment = await VendorPayrollPayment.create({
      vendorId,
      periodType,
      periodStart: start,
      periodEnd: end,
      bookingEarningsAmount,
      ...numeric,
      customItems: normalizedCustomItems,
      totalAmount,
      paymentMethod,
      paymentReference: String(paymentReference || '').trim(),
      notes: String(notes || '').trim(),
      status: 'processing',
      paidBy: req.user.id
    });

    const ledgerEntryIds = bookingEntries.map((entry) => entry._id);
    const manualEntries = [
      ['salary', numeric.salaryAmount, 'Salary payment'],
      ['bonus', numeric.bonusAmount, 'Performance bonus'],
      ['incentive', numeric.incentiveAmount, 'Performance incentive'],
      ['adjustment', numeric.adjustmentAmount, 'Salary adjustment']
    ];

    normalizedCustomItems.forEach((item, index) => {
      manualEntries.push(['custom', item.amount, item.label, index]);
    });

    for (const [type, amount, label, customIndex] of manualEntries) {
      if (amount <= 0) continue;
      const entry = await VendorSalaryEarning.create({
        vendorId,
        payrollPaymentId: payment._id,
        sourceKey: 'payroll:' + payment._id.toString() + ':' + type + (customIndex !== undefined ? ':' + customIndex : ''),
        type,
        amount,
        status: 'paid',
        earningDate: end,
        description: label + ' for ' + periodType,
        metadata: { periodStart: start, periodEnd: end, customField: type === 'custom' }
      });
      ledgerEntryIds.push(entry._id);
    }

    if (bookingEntries.length > 0) {
      await VendorSalaryEarning.updateMany(
        { _id: { $in: bookingEntries.map((entry) => entry._id) } },
        { $set: { status: 'paid', payrollPaymentId: payment._id } }
      );
    }

    payment.ledgerEntryIds = ledgerEntryIds;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    await Transaction.findOneAndUpdate(
      {
        type: 'salary_payment',
        'metadata.payrollPaymentId': payment._id.toString()
      },
      {
        $setOnInsert: {
          vendorId,
          amount: totalAmount,
          type: 'salary_payment',
          status: 'completed',
          paymentMethod,
          description: 'Salary payment of ₹' + totalAmount + ' for ' + periodType,
          referenceId: paymentReference || null,
          metadata: {
            payrollPaymentId: payment._id.toString(),
            bookingEarningsAmount,
            salaryAmount: numeric.salaryAmount,
            bonusAmount: numeric.bonusAmount,
            incentiveAmount: numeric.incentiveAmount,
            adjustmentAmount: numeric.adjustmentAmount,
            customItems: normalizedCustomItems
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await createNotification({
      vendorId,
      type: 'salary_payment_received',
      title: 'Salary Payment Received',
      message: '₹' + totalAmount + ' was paid for your ' + periodType + ' salary period.',
      relatedId: payment._id,
      relatedType: 'payroll',
      data: {
        payrollPaymentId: payment._id,
        periodType,
        periodStart: start,
        periodEnd: end,
        bookingEarningsAmount,
        salaryAmount: numeric.salaryAmount,
        bonusAmount: numeric.bonusAmount,
        incentiveAmount: numeric.incentiveAmount,
        adjustmentAmount: numeric.adjustmentAmount,
        customItems: normalizedCustomItems,
        totalAmount,
        paymentMethod,
        paymentReference
      },
      pushData: {
        type: 'salary_payment_received',
        link: '/vendor/wallet'
      },
      priority: 'high'
    });

    res.status(201).json({
      success: true,
      message: 'Salary payment marked as done',
      data: payment
    });
  } catch (error) {
    console.error('Create payroll payment error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to mark salary payment' });
  }
};

const getAdminVendorPayrollPayments = async (req, res) => {
  try {
    const vendorId = asObjectId(req.params.vendorId);
    const result = await listPayments(vendorId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get admin payroll payments error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch payroll payments' });
  }
};

const getAdminSalaryEarnings = async (req, res) => {
  try {
    const { search, status, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const filter = {
      ...getDateFilter(startDate, endDate, 'earningDate'),
      status: status && status !== 'all' ? status : { $ne: 'reversed' }
    };

    if (type && type !== 'all') filter.type = type;

    if (search) {
      const vendors = await Vendor.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      filter.vendorId = { $in: vendors.map((vendor) => vendor._id) };
    }

    const [data, total, summary] = await Promise.all([
      VendorSalaryEarning.find(filter)
        .populate('vendorId', 'name businessName email phone')
        .populate('bookingId', 'bookingNumber serviceName')
        .sort({ earningDate: -1, createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      VendorSalaryEarning.countDocuments(filter),
      VendorSalaryEarning.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEarning: { $sum: '$amount' },
            pendingEarning: { $sum: { $cond: [{ $in: ['$status', ['accrued', 'pending_rate']] }, '$amount', 0] } },
            paidEarning: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            bookingEarning: { $sum: { $cond: [{ $eq: ['$type', 'booking_earning'] }, '$amount', 0] } },
            salaryAmount: { $sum: { $cond: [{ $eq: ['$type', 'salary'] }, '$amount', 0] } },
            bonusAmount: { $sum: { $cond: [{ $eq: ['$type', 'bonus'] }, '$amount', 0] } },
            incentiveAmount: { $sum: { $cond: [{ $eq: ['$type', 'incentive'] }, '$amount', 0] } },
            adjustmentAmount: { $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$amount', 0] } },
            customAmount: { $sum: { $cond: [{ $eq: ['$type', 'custom'] }, '$amount', 0] } },
            recordCount: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data,
      summary: summary[0] || {
        totalEarning: 0,
        pendingEarning: 0,
        paidEarning: 0,
        bookingEarning: 0,
        salaryAmount: 0,
        bonusAmount: 0,
        incentiveAmount: 0,
        adjustmentAmount: 0,
        customAmount: 0,
        recordCount: 0
      },
      pagination: { page: parsedPage, limit: parsedLimit, total, pages: Math.ceil(total / parsedLimit) }
    });
  } catch (error) {
    console.error('Get admin salary earnings error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch salary earnings' });
  }
};
const getAdminSalaryPayments = async (req, res) => {
  try {
    const {
      search,
      status,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const filter = { ...getDateFilter(startDate, endDate, 'paidAt') };

    filter.status = status && status !== 'all' ? status : 'paid';
    if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;

    if (search) {
      const vendors = await Vendor.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      filter.vendorId = { $in: vendors.map((vendor) => vendor._id) };
    }

    const [data, total, summary] = await Promise.all([
      VendorPayrollPayment.find(filter)
        .populate('vendorId', 'name businessName email phone')
        .populate('paidBy', 'name email')
        .sort({ paidAt: -1, createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      VendorPayrollPayment.countDocuments(filter),
      VendorPayrollPayment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            bookingEarningsAmount: { $sum: '$bookingEarningsAmount' },
            salaryAmount: { $sum: '$salaryAmount' },
            bonusAmount: { $sum: '$bonusAmount' },
            incentiveAmount: { $sum: '$incentiveAmount' },
            adjustmentAmount: { $sum: '$adjustmentAmount' },
            paymentCount: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data,
      summary: summary[0] || {
        totalAmount: 0,
        bookingEarningsAmount: 0,
        salaryAmount: 0,
        bonusAmount: 0,
        incentiveAmount: 0,
        adjustmentAmount: 0,
        paymentCount: 0
      },
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Get admin salary payments error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch salary payments' });
  }
};

module.exports = {
  getVendorSalaryWallet,
  getVendorSalaryEarnings,
  getVendorSalaryPayments,
  getAdminSalaryWallets,
  getAdminVendorSalaryWallet,
  getAdminVendorPayrollPayments,
  getAdminSalaryPayments,
  getAdminSalaryEarnings,
  updateSalaryRate,
  createPayrollPayment
};

const mongoose = require('mongoose');
const Vendor = require('../../models/Vendor');
const VendorSlotAvailability = require('../../models/VendorSlotAvailability');

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_START = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * @route GET /api/admin/vendors/:vendorId/slot-availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @desc  Admin-marked slot availability for a vendor in a date range
 */
exports.getVendorSlotAvailability = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { from, to } = req.query;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor id' });
    }
    if (!DATE_KEY.test(from || '') || !DATE_KEY.test(to || '')) {
      return res.status(400).json({ success: false, message: 'from and to (YYYY-MM-DD) are required' });
    }

    const availability = await VendorSlotAvailability.find({
      vendorId,
      date: { $gte: from, $lte: to }
    }).select('date slots').sort({ date: 1 }).lean();

    res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error('Get vendor slot availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch slot availability' });
  }
};

/**
 * @route PUT /api/admin/vendors/:vendorId/slot-availability
 * @body  { dates: ['YYYY-MM-DD', ...], slots: ['09:00', ...] }
 * @desc  Replace the available slots for each given date. An empty `slots`
 *        array marks those dates as unavailable (the day's record is removed).
 */
exports.setVendorSlotAvailability = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { dates, slots } = req.body;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor id' });
    }
    if (!Array.isArray(dates) || dates.length === 0 || dates.length > 366 || !dates.every(d => DATE_KEY.test(d))) {
      return res.status(400).json({ success: false, message: 'dates must be a list of YYYY-MM-DD values' });
    }
    if (!Array.isArray(slots) || !slots.every(s => SLOT_START.test(s))) {
      return res.status(400).json({ success: false, message: 'slots must be a list of HH:MM values' });
    }

    const vendor = await Vendor.findById(vendorId).select('_id');
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const uniqueDates = [...new Set(dates)];
    const uniqueSlots = [...new Set(slots)].sort();

    if (uniqueSlots.length === 0) {
      await VendorSlotAvailability.deleteMany({ vendorId, date: { $in: uniqueDates } });
    } else {
      await VendorSlotAvailability.bulkWrite(uniqueDates.map(date => ({
        updateOne: {
          filter: { vendorId, date },
          update: { $set: { slots: uniqueSlots, updatedBy: req.user?._id || null } },
          upsert: true
        }
      })));
    }

    res.status(200).json({
      success: true,
      message: `Slot availability updated for ${uniqueDates.length} day(s)`
    });
  } catch (error) {
    console.error('Set vendor slot availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to update slot availability' });
  }
};

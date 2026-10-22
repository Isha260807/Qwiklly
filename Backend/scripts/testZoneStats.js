require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Zone = require('../models/Zone');
const UserService = require('../models/UserService');

const test = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const zones = await Zone.find({}).lean();
  const zoneIdList = zones.map(z => z._id);

  const [vendorStats, allUserServices] = await Promise.all([
    Vendor.aggregate([
      {
        $match: {
          isActive: true,
          approvalStatus: 'approved',
          zoneIds: { $in: zoneIdList }
        }
      },
      { $unwind: '$zoneIds' },
      {
        $group: {
          _id: '$zoneIds',
          totalPartners: { $sum: 1 },
          onlineVendors: {
            $sum: { $cond: [{ $eq: ['$isOnline', true] }, 1, 0] }
          },
          vendorServices: { $addToSet: '$service' }
        }
      }
    ]),
    UserService.find({}).select('title iconUrl basePrice categoryId status zoneIds').lean()
  ]);

  const serviceByTitle = new Map();
  allUserServices.forEach(s => {
    if (s.title) serviceByTitle.set(s.title.toLowerCase().trim(), s);
  });

  zones.forEach(z => {
    const zIdStr = z._id.toString();
    const vStat = vendorStats.find(s => s._id.toString() === zIdStr);
    const vServices = (vStat?.vendorServices || []).flat().filter(Boolean);

    const directUserServices = allUserServices.filter(s =>
      (s.zoneIds || []).some(id => id.toString() === zIdStr)
    );

    const serviceMap = new Map();

    // Add direct user services assigned to this zone
    directUserServices.forEach(s => {
      serviceMap.set(s.title.toLowerCase().trim(), {
        _id: s._id,
        title: s.title,
        iconUrl: s.iconUrl || null,
        basePrice: s.basePrice || 0,
        status: s.status || 'active'
      });
    });

    // Add vendor provided services
    vServices.forEach(vName => {
      const key = vName.toLowerCase().trim();
      if (!serviceMap.has(key)) {
        const matched = serviceByTitle.get(key);
        serviceMap.set(key, {
          _id: matched?._id || null,
          title: matched?.title || vName,
          iconUrl: matched?.iconUrl || null,
          basePrice: matched?.basePrice || 0,
          status: matched?.status || 'active'
        });
      }
    });

    const services = Array.from(serviceMap.values());
    console.log(`Zone: ${z.name}, count: ${services.length}, items:`, services);
  });

  process.exit(0);
};

test();

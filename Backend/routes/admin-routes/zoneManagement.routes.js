const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllZones,
  getZone,
  createZone,
  updateZone,
  deleteZone,
  toggleZoneStatus
} = require('../../controllers/adminControllers/zoneController');

router.use(authenticate);
router.use(isAdmin);

router.get('/zones', getAllZones);
router.get('/zones/:id', getZone);
router.post('/zones', createZone);
router.put('/zones/:id', updateZone);
router.delete('/zones/:id', deleteZone);
router.patch('/zones/:id/status', toggleZoneStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllZones,
  getZone,
  getZoneImpact,
  createZone,
  updateZone,
  deleteZone,
  toggleZoneStatus,
  toggleComingSoon,
  togglePauseOrdering
} = require('../../controllers/adminControllers/zoneController');

router.use(authenticate);
router.use(isAdmin);

router.get('/zones', getAllZones);
router.get('/zones/:id/impact', getZoneImpact);
router.get('/zones/:id', getZone);
router.post('/zones', createZone);
router.put('/zones/:id', updateZone);
router.delete('/zones/:id', deleteZone);
router.patch('/zones/:id/status', toggleZoneStatus);
router.patch('/zones/:id/coming-soon', toggleComingSoon);
router.patch('/zones/:id/pause-ordering', togglePauseOrdering);

module.exports = router;

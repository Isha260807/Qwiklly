const express = require('express');
const router = express.Router();
const { getAvailableSlots } = require('../../controllers/publicControllers/slotAvailabilityPublicController');

router.get('/slot-availability', getAvailableSlots);

module.exports = router;

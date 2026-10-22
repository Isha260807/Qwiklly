const express = require('express');
const router = express.Router();
const { resolveZone } = require('../../controllers/publicControllers/zonePublicController');
const { checkServiceability } = require('../../controllers/publicControllers/serviceabilityPublicController');

/**
 * @route GET /api/public/zones/resolve
 * @desc  Public zone resolution by coordinates
 * @access Public
 */
router.get('/resolve', resolveZone);

/**
 * @route GET /api/public/zones/serviceability
 * @desc  Full zone+service+radius+vendor availability check (advisory)
 * @access Public
 */
router.get('/serviceability', checkServiceability);

module.exports = router;

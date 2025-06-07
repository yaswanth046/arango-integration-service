const express = require('express');
const router = express.Router();

const pingRoutes = require('./ping');
const airportRoutes = require('./airport');
const migrateRoutes = require('./migrate');

router.use('/ping', pingRoutes);
router.use('/airport', airportRoutes);
router.use('/migrate', migrateRoutes);

module.exports = router;

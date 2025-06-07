const express = require('express');
const router = express.Router();

const pingRoutes = require('./ping');
const airportRoutes = require('./airport');
const flightRoutes = require('./flight');
const bookingRoutes = require('./booking');
const migrationRoutes = require('./migration');

router.use('/ping', pingRoutes);
router.use('/airport', airportRoutes);
router.use('/flight', flightRoutes);
router.use('/webhook', bookingRoutes);
router.use('/migrate', migrationRoutes);

module.exports = router;

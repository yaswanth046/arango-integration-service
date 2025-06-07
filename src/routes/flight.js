const express = require('express');
const router = express.Router();

const flightController = require('../controllers/flightController');
const commonController = require('../controllers/commonMethodController');

router.route('/')
  .get(flightController.getFlights)
  // .post(flightController.addAirport)
  // .put(flightController.updateAirport)
  // .delete(flightController.deleteAirport)
  .all(commonController.notFoundHandler);

router.route('/:id')
  .get(flightController.getFlightById)
  .all(commonController.notFoundHandler);



module.exports = router;
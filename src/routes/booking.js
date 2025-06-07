const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');
const commonController = require('../controllers/commonMethodController');

router.route('/flight-booking')
  .post(bookingController.receiveBooking)
  .all(commonController.notFoundHandler);

module.exports = router;
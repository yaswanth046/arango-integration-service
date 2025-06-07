const { logger } = require('../middlewares/loggerMiddleware');
const { bookingQueue } = require('../queues/bookingQueue');
const { validateBookingDetails } = require('../utils/validator');
const { checkBookingExists } = require('../services/bookingService');

const receiveBooking = async (req, res, next) => {
  try {
    const bookingDetails = req.body;
    logger.log({
      level: 'info',
      message: 'bookingController - receiveBooking - input',
      meta: { reqBody: bookingDetails }
    });
    const { error } = validateBookingDetails(bookingDetails);
    if (error) {
      logger.log({
        level: 'error',
        message: 'bookingController - receiveBooking - validation error',
        meta: { message: error.message }
      });
      throw error;
    }
    await checkBookingExists(bookingDetails);
    
    await bookingQueue.add('newBooking', bookingDetails);
    res.status(200).json({ message: 'BookingDetails received and queued!' });
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'bookingController - receiveBooking - error',
      meta: { message: error.message }
    });
    next(error);
  }
};

module.exports = {
  receiveBooking
};
const { logger } = require('../middlewares/loggerMiddleware');
const flightService = require('../services/flightService');

const { validateId } = require('../utils/validator');

const getFlights = async (req, res, next) => {
  try {
    const flightsList = await flightService.getFlights();
    logger.log({
      level: 'info',
      message: 'flightController - getFlights - flightsList',
      meta: { count: flightsList.length }
    });

    res.json(flightsList);
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'flightController - getFlights - error',
      meta: { error: error.message }
    });
    next(error);
  }
};

const getFlightById = async (req, res, next) => {
  try {
    const flightId = req.params.id;

    const { error } = validateId(flightId);
    if (error) {
      logger.log({
        level: 'error',
        message: 'flightController - getFlightById - validation error',
        meta: { error: error.message }
      });
      throw error;
    }

    const flightInfo = await flightService.getFlightById(flightId);
    logger.log({
      level: 'info',
      message: 'flightController - getFlightById - flightInfo',
      meta: { flightInfo }
    });

    res.json(flightInfo);
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'flightController - getFlightById - error',
      meta: { error: error.message }
    });
    next(error);
  }
};

module.exports = {
  getFlights,
  getFlightById
};

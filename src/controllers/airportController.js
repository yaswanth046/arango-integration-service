const { logger } = require('../middlewares/loggerMiddleware');
const airportService = require('../services/airportService');

const { validateId } = require('../utils/validator');

const getAirports = async (req, res, next) => {
  try {
    const airportsList = await airportService.getAirports();
    logger.log({
      level: 'info',
      message: 'airportController - getAirports - airportsList',
      meta: { count: airportsList.length }
    });

    res.json(airportsList);
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'airportController - getAirports - error',
      meta: { error: error.message }
    });
    next(error);
  }
};

const getAirportById = async (req, res, next) => {
  try {
    const airportId = req.params.id;

    const { error } = validateId(airportId);
    if (error) {
      logger.log({
        level: 'error',
        message: 'airportController - getAirportById - validation error',
        meta: { error: error.message }
      });
      throw error;
    }

    const airportInfo = await airportService.getAirportById(airportId);
    logger.log({
      level: 'info',
      message: 'airportController - getAirportById - airportInfo',
      meta: { airportInfo }
    });

    res.json(airportInfo);
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'airportController - getAirportById - error',
      meta: { error: error.message }
    });
    next(error);
  }
};

module.exports = {
  getAirports,
  getAirportById
};

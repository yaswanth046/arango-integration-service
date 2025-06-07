const { logger } = require('../middlewares/loggerMiddleware');
const executeAQL = require('../database/queryExecutor');
const queries = require('../database/airportQueries');

const getAirports = async () => {
  try {
    const airportsDbList = await executeAQL(...Object.values(queries.getAllAirports()));
    logger.log({
      level: 'info',
      message: 'airportService - getAirports - airportsDbList',
      meta: { count: airportsDbList.length }
    });

    return airportsDbList;
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'airportService - getAirports - error',
      meta: { message: error.message }
    });
    throw error;
  }
};

const getAirportById = async (airportId) => {
  try {
    const [airportsDetails] = await executeAQL(...Object.values(queries.getAirportById(airportId)));
    logger.log({
      level: 'info',
      message: 'airportService - getAirportById - airportsDetails',
      meta: { airportsDetails }
    });

    return airportsDetails;
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'airportService - getAirportById - error',
      meta: { message: error.message }
    });
    throw error;
  }
};
module.exports = {
  getAirports,
  getAirportById
};

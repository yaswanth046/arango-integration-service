const { logger } = require('../middlewares/loggerMiddleware');
const executeAQL = require('../database/queryExecutor');
const queries = require('../database/flightQueries');

const getFlights = async () => {
  try {
    const flightsDbList = await executeAQL(...Object.values(queries.getAllFlights()));
    logger.log({
      level: 'info',
      message: 'flightService - getFlights - flightsDbList',
      meta: { count: flightsDbList.length }
    });

    return flightsDbList;
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'flightService - getFlights - error',
      meta: { message: error.message }
    });
    throw error;
  }
};

const getFlightById = async (flightId) => {
  try {
    const [flightDetails] = 
await executeAQL(...Object.values(queries.getFlightById(flightId)));
    logger.log({
      level: 'info',
      message: 'flightService - getFlightById - flightDetails',
      meta: { flightDetails }
    });

    return flightDetails;
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'flightService - getFlightById - error',
      meta: { message: error.message }
    });
    throw error;
  }
};

const insertFlights = async (flightId) => {
  try {
    const insertedflightList = 
await executeAQL(...Object.values(queries.insertFlights(flightId)));
    logger.log({
      level: 'info',
      message: 'flightService - insertFlights - insertedflightList',
      meta: { insertedflightList }
    });

    return insertedflightList;
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'flightService - insertFlights - error',
      meta: { message: error.message }
    });
    throw error;
  }
};

module.exports = {
  getFlights,
  getFlightById,
  insertFlights
};

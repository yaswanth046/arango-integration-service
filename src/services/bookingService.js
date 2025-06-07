const { logger } = require('../middlewares/loggerMiddleware');
const executeAQL = require('../database/queryExecutor');
const queries = require('../database/flightQueries');

const checkBookingExists = async (bookingDetails) =>{
  try {
    const bookingExists = 
await executeAQL(...Object.values(queries.fetchFlightDetails({
  passengerEmail: bookingDetails.passengerEmail,
  departure: bookingDetails.departure,
  arrival: bookingDetails.arrival,
  departureTime: bookingDetails.departureTime,
  arrivalTime: bookingDetails.arrivalTime
})));

    if (bookingExists.length > 0) {
      logger.log({
        level: 'info',
        message: 'bookingService - checkBookingExists - bookingExists',
        meta: { bookingExists }
      });
      const badRequest = 
      new Error('Duplicate booking: same passenger, route, and time already exists');
      badRequest.status = 400;
      throw badRequest;
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'bookingService - checkBookingExists - error',
      meta: { message: error.message }
    });
    throw error;
  }
};

const constructBookingParams = (bookingData) => ({
  _from: `airports/${bookingData.departure}`,
  _to: `airports/${bookingData.arrival}`,
  Year: bookingData.year,
  Month: bookingData.month,
  Day: bookingData.day,
  DayOfWeek: bookingData.dayOfWeek,
  DepTimeUTC: bookingData.departureTime,
  ArrTimeUTC: bookingData.arrivalTime,
  UniqueCarrier: bookingData.uniqueCarrier,
  FlightNum: bookingData.flightNumber,
  TailNum: bookingData.tailNum,
  Distance: bookingData.distance,
  PassName: bookingData.passengerName,
  PassEmail: bookingData.passengerEmail,
  createdAt: new Date().toISOString(),
});

const saveBooking = async (bookingDetails) =>{
  try {
    logger.log({
      level: 'info',
      message: 'bookingService - saveBooking - input',
      meta: { bookingDetails }
    });
    const insertBookingParams = constructBookingParams(bookingDetails);
    const insertedBookingDetailsResp = 
  await executeAQL(...Object.values(queries.insertFlights([insertBookingParams])));
    
    logger.log({
      level: 'info',
      message: 'bookingService - saveBooking - insertedBookingDetailsResp',
      meta: { insertedBookingDetailsResp }
    });
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'bookingService - saveBooking - error',
      meta: { message: error.message }
    });
    throw error;
  }
};

module.exports = {
  checkBookingExists,
  saveBooking
};

const collections  = require('./collections');
const { FLIGHT_COLLECTION } = collections;

// CREATE
const insertFlight = (flight) => ({
  query: `
    INSERT @flight INTO ${FLIGHT_COLLECTION} 
    RETURN NEW
  `,
  bindVars: { flight }
});

// READ
const getFlightById = (flightId) => ({
  query: `
    FOR flight IN ${FLIGHT_COLLECTION}
      FILTER flight._key == @flightId
      RETURN flight
  `,
  bindVars: { flightId }
});

const getAllFlights = () => ({
  query: `
    FOR flight IN ${FLIGHT_COLLECTION}
      SORT flight.createdAt DESC
      RETURN flight
  `,
  bindVars: {}
});

// UPDATE
const updateFlight = (flightId, updatedFields) => ({
  query: `
    FOR flight IN ${FLIGHT_COLLECTION}
      FILTER flight._key == @flightId
      UPDATE flight WITH @updatedFields IN ${FLIGHT_COLLECTION}
      RETURN NEW
  `,
  bindVars: { flightId, updatedFields }
});

// DELETE
const deleteFlight = (flightId) => ({
  query: `
    FOR flight IN ${FLIGHT_COLLECTION}
      FILTER flight._key == @flightId
      REMOVE flight IN ${FLIGHT_COLLECTION}
  `,
  bindVars: { flightId }
});

// BULK INSERT
const insertFlights = (flights) => ({
  query: `
    FOR flight IN @flights
    INSERT flight INTO ${FLIGHT_COLLECTION}
    Return NEW
  `,
  bindVars: { flights }
});

const fetchFlightDetails = (filterParams) => ({
  query: `
    FOR flight IN flights
      FILTER flight.PassEmail == @filterParams.passengerEmail
      AND flight._from == CONCAT('airports/', @filterParams.departure)
      AND flight._to == CONCAT('airports/', @filterParams.arrival)
      AND flight.DepTimeUTC == @filterParams.departureTime
      AND flight.ArrTimeUTC == @filterParams.arrivalTime
     RETURN flight
  `,
  bindVars: { filterParams }
});

// EXPORTs
module.exports = {
  insertFlight,
  getFlightById,
  getAllFlights,
  updateFlight,
  deleteFlight,
  insertFlights,
  fetchFlightDetails
};


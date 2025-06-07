const joi = require('joi');

const validateId = (id) => joi.string().regex(/^[a-zA-Z0-9]+$/)
  .required()
  .validate(id);

const validateBookingDetails = (bookingDetails) => joi.object({
  passengerName: joi.string().required(),
  flightNumber: joi.string().required(),
  departure: joi.string().required(), // Airport code
  arrival: joi.string().required(),   // Airport code
  departureTime: joi.date().iso().required(),
  arrivalTime: joi.date().iso().required(),
  year: joi.number().integer().required(),
  month: joi.number().integer().min(1).max(12).required(),
  day: joi.number().integer().min(1).max(31).required(),
  dayOfWeek: joi.number().integer().min(1).max(7).required(),
  tailNum: joi.string().required(),
  distance: joi.number().required(),
  uniqueCarrier: joi.string().required(),
  passengerEmail: joi.string().email().required()
}).validate(bookingDetails);

const validateDataSourceParams = (dataSourceParams) => {
  const baseSchema = {
    host: joi.string().required(),
    user: joi.string().required(),
    password: joi.string().required(),
    database: joi.string().required(),
    port: joi.number().integer().required(),
  };

  const schema = joi.object({
    dbType: joi.string().valid('sql', 'nosql').required(),
    sourceType: joi.string().valid('mysql', 'postgres', 'mongodb').required(),
    sourceConfig: joi.when('sourceType', {
      switch: [
        {
          is: 'mongodb',
          then: joi.object({
            url: joi.string().regex(/^mongodb:\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/)
              .messages({
                'string.pattern.base': 
                `Invalid MongoDB URL format. 
                Expected format: mongodb://<user>:<password>@<host>:<port>`,
                'any.required': 'MongoDB URL is required',
              }).required(),
            database: joi.string().required()
          }).required()
        },
        {
          is: 'postgres',
          then: joi.object({
            ...baseSchema,
            schema: joi.string().required()
          }).required()
        },
        {
          is: 'mysql',
          then: joi.object({
            ...baseSchema,
            schema: joi.string().optional()
          }).required()
        }
      ],
      otherwise: joi.forbidden()
    })
  });

  return schema.validate(dataSourceParams);
};

module.exports = {
  validateId,
  validateBookingDetails,
  validateDataSourceParams
};
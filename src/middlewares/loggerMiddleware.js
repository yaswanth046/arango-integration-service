const winston = require('winston');
const createSplunkTransport = require('../services/clients/splunkTransport');

const transports = [new winston.transports.Console()];

// Add Splunk transport if available
const splunkTransport = createSplunkTransport();
if (splunkTransport) {
  transports.push(splunkTransport);
}

// Create logger
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
});

// Catch unhandled Winston-level errors too
logger.on('error', (err) => {
  console.log({
    level: 'error',
    message: 'Winston Logger Error',
    meta: { error: err.message }
  });
});


// Express middleware for logging requests
const reqLoggerMiddleware = (req, res, next) => {
  logger.log({
    level: 'info',
    message: 'Incoming request',
    meta: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    }
  });
  next();
};

module.exports = {
  logger,
  reqLoggerMiddleware
};

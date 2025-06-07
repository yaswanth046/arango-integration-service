const { logger } = require('../middlewares/loggerMiddleware');
const { Queue } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config/index');

const connection = new Redis({
  host: config.redis.host, // or 'redis-server' if inside Docker network
  port: config.redis.port, // default Redis port is 6379
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  logger.log({
    level: 'info',
    message: 'Connected to Redis'
  });
});

connection.on('error', (err) => {
  logger.log({
    level: 'error',
    message: 'Redis Error',
    meta: { error: err.message }
  });
});

const bookingQueue = new Queue(config.queue.name, { connection });

// console.log('Booking queue created:', bookingQueue);
module.exports = { bookingQueue, connection };
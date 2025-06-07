const { Worker } = require('bullmq');
const { connection } = require('../queues/bookingQueue');
const bookingService = require('../services/bookingService');
const { logger } = require('../middlewares/loggerMiddleware');

const bookingWorker = new Worker(
  'flightBookings',
  async (job) => {
    await bookingService.saveBooking(job.data);
  },
  { connection, concurrency: 5 }
);

bookingWorker.on('failed', (job, err) => {
  logger.log({
    level: 'error',
    message: `Job ${job.id} failed: ${err.message}`,
  });
});

bookingWorker.on('completed', (job) => {
  logger.log({
    level: 'info',
    message: `Job ${job.id} completed successfully.`,
  });
});

module.exports = bookingWorker;
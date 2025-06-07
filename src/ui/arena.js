// eslint-disable-next-line node/no-unpublished-require
const Arena = require('bull-arena');
const { Queue } = require('bullmq'); // <-- Add this line
const config = require('../config/index');
const arenaConfig = Arena(
  {
    BullMQ: Queue,
    queues: [
      {
        type: 'bullmq',
        name: config.queue.name,
        hostId: config.queue.hostId,
        redis: {
          host: config.redis.host,
          port: config.redis.port,
        },
      },
    ],
  },
  {
    basePath: '/arena',
    disableListen: true
  }
);
module.exports = arenaConfig;
// eslint-disable-next-line node/no-extraneous-require
const { eachLimit } = require('async');

const processInBatches = async (items, batchSize, concurrency, processor) => {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  // Ensure processor is async
  await eachLimit(batches, concurrency, async (batch) => {
    await processor(batch);
  });
};

module.exports = { processInBatches };
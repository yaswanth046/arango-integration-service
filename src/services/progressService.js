/**
 * Progress Service: Tracks migration progress, status, and errors.
 * @module progressService
 */
const { logger } = require('../middlewares/loggerMiddleware');
const migrations = {};

/**
 * Initializes a new migration and returns its ID.
 * @returns {string} migrationId
 */
const initMigration = () => {
  const id = Date.now().toString();
  migrations[id] = {
    status: 'running',
    progress: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: null
  };
  logger.log({ level: 'info', message: 'progressService - initMigration', meta: { id } });
  return id;
};

/**
 * Updates progress for a table in a migration.
 * @param {string} id - Migration ID
 * @param {string} table - Table name
 * @param {number} count - Number of rows processed
 */
const update = (id, table, count) => {
  if (!migrations[id]) {
    return;
  }
  migrations[id].progress[table] = (migrations[id].progress[table] || 0) + count;
  migrations[id].updatedAt = new Date().toISOString();
  logger.log({ level: 'info', message: 'progressService - update', meta: { id, table, count } });
};

/**
 * Marks a migration as completed.
 * @param {string} id - Migration ID
 */
const complete = (id) => {
  if (migrations[id]) {
    migrations[id].status = 'completed';
    migrations[id].completedAt = new Date().toISOString();
    migrations[id].updatedAt = new Date().toISOString();
    logger.log({ level: 'info', message: 'progressService - complete', meta: {...migrations } });
  }
};

/**
 * Marks a migration as failed and logs the error.
 * @param {string} id - Migration ID
 * @param {Error} error - Error object
 */
const fail = (id, error) => {
  if (migrations[id]) {
    migrations[id].status = 'failed';
    migrations[id].error = error.message;
    migrations[id].failedAt = new Date().toISOString();
    migrations[id].updatedAt = new Date().toISOString();
    logger.log({
      level: 'error',
      message: 'progressService - fail',
      meta: { id, error: error.message }
    });
  }
};

/**
 * Gets the status and progress of a migration.
 * @param {string} id - Migration ID
 * @returns {object|null}
 */
const getStatus = (id) => migrations[id] || null;

/**
 * Gets all migrations (for admin/monitoring).
 * @returns {object}
 */
const getAllMigrations = () => ({ ...migrations });

module.exports = {
  initMigration,
  update,
  complete,
  fail,
  getStatus,
  getAllMigrations
};
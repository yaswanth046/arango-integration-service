const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const { DB_TYPES, mongoDbOptions } = require('../utils/constants');
const { logger } = require('../middlewares/loggerMiddleware');
/**
 * Create a dynamic DB connection
 * @param {Object} config
 * @param {'mysql'|'postgres'|'mongodb'} config.sourceType
 * @returns {Promise<Connection|Pool|Db>}
 */
const connectToDatabase = async (config) => {
  const { sourceType, sourceConfig } = config || {};
  const dbType = sourceType.toLowerCase();

  try {
    switch (dbType) {
    case DB_TYPES.MYSQL: {
      const mysqlConn = await mysql.createConnection(sourceConfig);
      logger.log({ level: 'info', message: 'MySQL connection established' });
      return mysqlConn;
    }

    case DB_TYPES.POSTGRES: {
      const pgPool = new Pool(sourceConfig);
      await pgPool.query('SELECT 1'); // Connection validation
      logger.log({ level: 'info', message: 'PostgreSQL connection established' });
      return pgPool;
    }

    case DB_TYPES.MONGODB: {
      const { url, database } = sourceConfig;
      const client = new MongoClient(url, mongoDbOptions);
      await client.connect();
      logger.log({ level: 'info', message: 'MongoDB connection established' });
      const db = client.db(database);
      db.client = client; // So we can disconnect later
      return db;
    }

    default:
      throw new Error(`Unsupported database type: "${sourceType}"`);
    }
  } catch (err) {
    logger.log({
      level: 'error',
      message: `Error connecting to ${dbType.toUpperCase()}: ${err.message}`,
      meta: { error: err }
    });
    throw err;
  }
};

module.exports = {
  connectToDatabase
};
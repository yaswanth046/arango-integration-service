const sqlAdapter = require('../adapters/sqlAdapter');
const noSqlAdapter = require('../adapters/noSqlAdapter');
const { processInBatches } = require('../utils/batchProcessor');
const { Database } = require('arangojs');
const config = require('../config');
const { system } = config.arango;
const { logger } = require('../middlewares/loggerMiddleware');
const { sourceTypes } = require('../utils/constants');
const regex = /^mongodb:\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/;

const validateSourceType = (sourceType) => {
  if (!sourceTypes.includes(sourceType)) {
    logger.log({
      level: 'error',
      message: 'migrationService - validateSourceType - error',
      meta: {
        message: `Invalid sourceType: 
        ${sourceType}. Supported types are: ${sourceTypes.join(', ')}`
      }
    });
    const badRequest = new Error(`Invalid sourceType: 
      ${sourceType}. Supported types are: ${sourceTypes.join(', ')}`);
    badRequest.status = 400;
    throw badRequest;
  }
};

const ensureDatabaseExists = async (sysDb, sourceConfig) => {
  const { user, password, database: dbName } = sourceConfig;
  const dbList = await sysDb.listDatabases();

  if (!dbList.includes(dbName)) {
    await sysDb.createDatabase(dbName, [{
      username: user, // or any username you want to grant access
      passwd: password,
      active: true
    }
    ]);
    // Optionally, grant permissions to a user (if needed)
    // await sysDb.grantDatabaseAccess(dbName, dbConfig.username);
    logger.log({
      level: 'info',
      message: 'migrationService - ensureDatabaseExists - database created',
      meta: { dbName }
    });
  } else {
    logger.log({
      level: 'info',
      message: 'migrationService - ensureDatabaseExists - database already exists',
      meta: { dbName }
    });
  }
  return new Database({
    url: system.url,
    databaseName: dbName,
    auth: {
      username: user,
      password,
    }
  });
};

const sqlMigration = async (sourceDetails) => {
  let conn;
  try {
    const { sourceType, sourceConfig } = sourceDetails;
    const { database, schema } = sourceConfig;

    conn = await sqlAdapter.connect(sourceDetails);

    /* Log the Source db details */
    const { tableNames, primaryKeys, foreignKeys, indexes } =
      await sqlAdapter.fetchMetadata(conn, database, schema, sourceType);
    logger.log({
      level: 'info',
      message: 'migrationService - sqlMigration - metadata fetched',
      meta: { tableNames, primaryKeys, foreignKeys, indexes }
    });

    /* Create a connection to the system database in ArangoDB
     * This is usually "_system" database where we can create new databases */
    const sysDb = new Database({
      url: system.url,
      databaseName: system.database,
      auth: {
        username: system.username,
        password: system.password,
      }
    });
    /* Ensure the target database exists in ArangoDB */
    const dbInstance = await ensureDatabaseExists(sysDb, sourceConfig);

    // Create collections in parallel for performance
    const docColls = {};
    await Promise.all(tableNames.map(async (table) => {
      const coll = dbInstance.collection(table);
      try {
        await coll.create();
        logger.log({ level: 'info', message: `Collection created: ${table}` });
      } catch (err) {
        if (err.errorNum !== 1207) { // 1207: duplicate name
          logger.log({
            level: 'error',
            message: `Failed to create collection: ${table}`, meta: { error: err.message }
          });
          throw err;
        }
        logger.log({ level: 'info', message: `${err.message} ${table}` });
      }
      docColls[table] = coll;
    }));

    // Create hash indexes in parallel, skip system fields
    await Promise.all(tableNames.map(async (table) => {
      if (!indexes[table]) 
      { return; }
      const coll = docColls[table];
      await Promise.all(Object.entries(indexes[table]).map(async ([indexName, idx]) => {
        if (indexName === 'PRIMARY') 
        { return; }
        const fields = idx.columns.filter(f => !['_key', '_id', '_rev'].includes(f));
        if (!fields.length) 
        { return; }
        try {
          await coll.ensureIndex({ type: 'hash', fields, unique: idx.unique });
          logger.log({
            level: 'info',
            message: `Hash index created on ${table}: [${fields.join(', ')}]`
          });
        } catch (err) {
          if (err.errorNum !== 1210) { // 1210: duplicate index
            logger.log({
              level: 'error',
              message: `Failed to create index on ${table}`, meta: { error: err.message }
            });
            throw err;
          }
        }
      }));
    }));

    // Migrate data in batches, log progress
    for (const table of tableNames) {
      const rows = await sqlAdapter.fetchTableData(conn, table, sourceType);
      const pk = primaryKeys[table];
      const docs = rows.map(row => {
        const copy = { ...row };
        copy._key = String(copy[pk]);
        delete copy[pk];
        return copy;
      });

      // Truncate the collection before importing batches
      await docColls[table].truncate();

      await processInBatches(docs, 1000, 5, async batch => {
        try {
          await docColls[table].import(batch);
        } catch (err) {
          logger.log({
            level: 'error',
            message: `Failed to import batch for ${table}`, meta: { error: err.message }
          });
          throw err;
        }
      });
      logger.log({
        level: 'info',
        message: `Data migrated for table: ${table}`, meta: { count: docs.length }
      });
    }

    // Create edge collections and migrate edges in parallel for performance
    await Promise.all(foreignKeys.map(async (fk) => {
      const edgeName = `${fk.fromTable}_to_${fk.toTable}`;
      try {
        await dbInstance.createEdgeCollection(edgeName);
        logger.log({ level: 'info', message: `Edge collection created: ${edgeName}` });
      } catch (err) {
        if (err.errorNum !== 1207) { // 1207: duplicate name
          logger.log({
            level: 'error',
            message: `Failed to create edge collection: ${edgeName}`,
            meta: { error: err.message }
          });
          throw err;
        }
        logger.log({ level: 'info', message: `${err.message} ${edgeName}` });
      }
      const edgeColl = dbInstance.collection(edgeName);
      const rows = await sqlAdapter.fetchTableData(conn, fk.fromTable, sourceType);
      const edges = rows.map(r => {
        const fromKey = String(r[primaryKeys[fk.fromTable]]);
        const toKey = String(r[fk.fromColumn]);
        if (!toKey) 
        { return null; }
        return { _from: `${fk.fromTable}/${fromKey}`, _to: `${fk.toTable}/${toKey}` };
      }).filter(Boolean);

      // Truncate the edge collection before importing batches
      await edgeColl.truncate();

      await processInBatches(edges, 1000, 5, async batch => {
        try {
          await edgeColl.import(batch);
        } catch (err) {
          logger.log({
            level: 'error',
            message: `Failed to import edge batch for ${edgeName}`, meta: { error: err.message }
          });
          throw err;
        }
      });
      logger.log({
        level: 'info',
        message: `Edges migrated for: ${edgeName}`, meta: { count: edges.length }
      });
    }));

    await sqlAdapter.disconnect(conn);
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'migrationService - sqlMigration - error',
      meta: { message: error.message, stack: error.stack }
    });
    if (conn) 
    { await sqlAdapter.disconnect(conn); }
    throw error;
  }
};

const noSqlMigration = async (sourceDetails) => {
  let conn;
  try {
    const { sourceConfig } = sourceDetails;
    conn = await noSqlAdapter.connect(sourceDetails);

    // Fetch collections and metadata
    const { tableNames, primaryKeys, foreignKeys, indexes } = 
    await noSqlAdapter.fetchMetadata(conn);
    logger.log({
      level: 'info',
      message: 'migrationService - noSqlMigration - metadata fetched',
      meta: { tableNames, primaryKeys, foreignKeys, indexes }
    });

    // Connect to system db in ArangoDB
    const sysDb = new Database({
      url: system.url,
      databaseName: system.database,
      auth: {
        username: system.username,
        password: system.password,
      }
    });
    const url = sourceConfig.url;
    const match = url.match(regex);

    const user = match[1];
    const password = match[2];
    const dbInstance = await ensureDatabaseExists(sysDb, { user, password, ...sourceConfig });

    // 1. Create collections in parallel
    const docColls = {};
    await Promise.all(tableNames.map(async (table) => {
      const coll = dbInstance.collection(table);
      try {
        await coll.create();
        logger.log({ level: 'info', message: `Collection created: ${table}` });
      } catch (err) {
        if (err.errorNum !== 1207) {
          logger.log({
            level: 'error',
            message: `Failed to create collection: ${table}`,
            meta: { error: err.message }
          });
          throw err;
        }
        logger.log({ level: 'info', message: `${err.message} ${table}` });
      }
      docColls[table] = coll;
    }));

    // 2. Create primary key and other indexes
    await Promise.all(tableNames.map(async (table) => {
      const coll = docColls[table];
      // Primary key (_key) is always indexed in ArangoDB, so skip explicit PK index

      // Create additional indexes
      if (indexes[table]) {
        await Promise.all(Object.values(indexes[table]).map(async (idx) => {
          // Skip _id or _key as ArangoDB handles these
          const fields = idx.columns.filter(f => !['_key', '_id', '_rev'].includes(f));
          if (!fields.length) 
          {return;}
          try {
            await coll.ensureIndex({ type: 'hash', fields, unique: idx.unique });
            logger.log({
              level: 'info',
              message: `Hash index created on ${table}: [${fields.join(', ')}]`
            });
          } catch (err) {
            if (err.errorNum !== 1210) { // 1210: duplicate index
              logger.log({
                level: 'error',
                message: `Failed to create index on ${table}`,
                meta: { error: err.message }
              });
              throw err;
            }
          }
        }));
      }
    }));

    // 3. Create edge collections for foreign keys (if any)
    if (foreignKeys && foreignKeys.length > 0) {
      await Promise.all(foreignKeys.map(async (fk) => {
        const edgeName = `${fk.fromTable}_to_${fk.toTable}`;
        try {
          await dbInstance.createEdgeCollection(edgeName);
          logger.log({ level: 'info', message: `Edge collection created: ${edgeName}` });
        } catch (err) {
          if (err.errorNum !== 1207) {
            logger.log({
              level: 'error',
              message: `Failed to create edge collection: ${edgeName}`,
              meta: { error: err.message }
            });
            throw err;
          }
          logger.log({ level: 'info', message: `${err.message} ${edgeName}` });
        }
      }));
    }

    // 4. Migrate data
    for (const table of tableNames) {
      const docs = await noSqlAdapter.fetchCollectionData(conn, table);

      // Ensure _key format
      const finalDocs = docs.map(doc => {
        const cloned = { ...doc };
        cloned._key = doc._id ? String(doc._id) : undefined;
        delete cloned._id;
        return cloned;
      });

      await docColls[table].truncate();

      await processInBatches(finalDocs, 1000, 5, async (batch) => {
        try {
          await docColls[table].import(batch);
        } catch (err) {
          logger.log({
            level: 'error',
            message: `Failed to import batch for ${table}`,
            meta: { error: err.message }
          });
          throw err;
        }
      });

      logger.log({
        level: 'info',
        message: `Data migrated for collection: ${table}`,
        meta: { count: finalDocs.length }
      });
    }

    await noSqlAdapter.disconnect(conn);

  } catch (error) {
    logger.log({
      level: 'error',
      message: 'migrationService - noSqlMigration - error',
      meta: { message: error.message, stack: error.stack }
    });
    if (conn) 
    {await noSqlAdapter.disconnect(conn);}
    throw error;
  }
};

const migrate = async (sourceDetails) => {
  try {
    const { dbType, sourceType } = sourceDetails;
    /* Validate the source type */
    validateSourceType(sourceType);

    if (dbType === 'sql') {
      await sqlMigration(sourceDetails);
    } else if (dbType === 'nosql') {
      await noSqlMigration(sourceDetails);
    } else {
      logger.log({
        level: 'error',
        message: 'migrationService - migrate - error',
        meta: { message: `Invalid dbType: ${dbType}` }
      });
      const badRequest = new Error(`Invalid dbType: ${dbType}`);
      badRequest.status = 400;
      throw badRequest;
    }
    logger.log({ level: 'info', message: 'Migration completed successfully.' });
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'migrationService - migrate - error',
      meta: { message: error.message, stack: error.stack }
    });
    throw error;
  }
};

module.exports = { migrate };
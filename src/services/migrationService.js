/**
 * Migration Service: Handles migration from PostgreSQL to ArangoDB.
 * - Streams data in batches for large tables
 * - Tracks progress and errors
 * - Logs all major steps
 * - Cleans up resources
 * @module migrationService
 */
const pgExtractor = require('../database/migrator/pgExtractor');
const arangoImporter = require('../database/migrator/arangoImporter');
const progressService = require('./progressService');
const { logger } = require('../middlewares/loggerMiddleware');

/**
 * Initiates migration from PostgreSQL to ArangoDB.
 * @param {object} pgConfig - PostgreSQL connection config
 * @param {string} schema - Schema name to migrate
 * @returns {Promise<string>} migrationId
 */


const migrate = async (pgConfig, schema) => {
  logger.log({
    level: 'info',
    message: 'migrationService - migrate - started',
    meta: { schema }
  });
  const migrationId = progressService.initMigration();

  let pgClient;
  try {
    // 1. Connect to PG
    pgClient = await pgExtractor.connect(pgConfig);
    logger.log({
      level: 'info',
      message: 'migrationService - migrate - connected to PG',
      meta: { migrationId }
    });

    // 2. Extract schema metadata
    const schemaStart = Date.now();
    const schemaMeta = await pgExtractor.extractSchema(pgClient, schema);
    const schemaEnd = Date.now();
    const schemaDurationMs = schemaEnd - schemaStart;
    logger.log({
      level: 'info',
      message: 'migrationService - migrate - extracted schema',
      meta: { migrationId, tables: schemaMeta.tables.length, durationMs: schemaDurationMs }
    });
    
    // 3. Create collections/graphs in Arango
    await arangoImporter.createSchema(schemaMeta);
    logger.log({
      level: 'info',
      message: 'migrationService - migrate - created Arango schema',
      meta: { migrationId }
    });

    // 4. Stream data table by table (batching for large tables)
    for (const table of schemaMeta.tables) {
      logger.log({
        level: 'info',
        message: 'migrationService - migrate - migrating table',
        meta: { migrationId, table }
      });
      await pgExtractor.streamTableData(pgClient, table, async (rows) => {
        try {
          await arangoImporter.insertDocuments(table, rows);
          progressService.update(migrationId, table, rows.length);
        } catch (batchErr) {
          logger.log({
            level: 'error',
            message: 'migrationService - migrate - batch insert error',
            meta: { migrationId, table, error: batchErr.message }
          });
          // Optionally: implement retry logic here
        }
      });
    }

    // 5. Insert edge documents for foreign key relationships
    for (const [table, fks] of Object.entries(schemaMeta.foreignKeys)) {
      for (const fk of fks) {
        const edgeCollectionName = `${table}_${fk.column}_to_${fk.refTable}_${fk.refColumn}`;
        // Fetch all rows from the source table with the foreign key
        await pgExtractor.streamTableData(pgClient, table, async (rows) => {
          // For each row, create an edge document if the foreign key is not null
          const edgeDocs = rows
            .filter(row => row[fk.column] !== null && row[fk.column] !== undefined)
            .map(row => ({
              _from: `${table}/${row.id || row[Object.keys(row)[0]]}`,
              _to: `${fk.refTable}/${row[fk.column]}`
            }));
          if (edgeDocs.length > 0) {
            try {
              await arangoImporter.insertDocuments(edgeCollectionName, edgeDocs);
              logger.log({
                level: 'info',
                message: 'migrationService - migrate - inserted edges',
                meta: { migrationId, edgeCollectionName, count: edgeDocs.length }
              });
            } catch (edgeErr) {
              logger.log({
                level: 'error',
                message: 'migrationService - migrate - edge insert error',
                meta: { migrationId, edgeCollectionName, error: edgeErr.message }
              });
            }
          }
        });
      }
    }

    progressService.complete(migrationId);
    logger.log({
      level: 'info',
      message: 'migrationService - migrate - completed',
      meta: { migrationId }
    });
    return migrationId;
  } catch (err) {
    progressService.fail(migrationId, err);
    logger.log({
      level: 'error',
      message: 'migrationService - migrate - failed',
      meta: { migrationId, error: err.message }
    });
    throw err;
  } finally {
    // Clean up PG client if needed
    if (pgClient && typeof pgClient.end === 'function') {
      try {
        await pgClient.end();
      } catch (closeErr) {
        logger.log({
          level: 'warn',
          message: 'migrationService - migrate - error closing PG client',
          meta: { migrationId, error: closeErr.message }
        });
      }
    }
  }
};

module.exports = { migrate };
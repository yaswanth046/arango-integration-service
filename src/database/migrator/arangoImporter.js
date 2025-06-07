const db = require('../database');
const { logger } = require('../../middlewares/loggerMiddleware');

/**
 * Creates collections (document and edge) and indexes in ArangoDB based on schemaMeta.
 * @param {object} schemaMeta - Extracted schema metadata from PostgreSQL
 */
const createSchema = async (schemaMeta) => {
  try {
    // 1. Create document collections for each table
    for (const table of schemaMeta.tables) {
      const collection = db.collection(table);
      const exists = await collection.exists();
      if (!exists) {
        await db.createCollection(table);
        logger.log({
          level: 'info',
          message: 'arangoImporter - createSchema - created collection',
          meta: { table }
        });
      }
    }

    // 2. Create edge collections for foreign key relationships (optional, for graph modeling)
    for (const [table, fks] of Object.entries(schemaMeta.foreignKeys)) {
      for (const fk of fks) {
        const edgeCollectionName = `${table}_${fk.column}_to_${fk.refTable}_${fk.refColumn}`;
        const edgeCollection = db.collection(edgeCollectionName);
        const exists = await edgeCollection.exists();
        if (!exists) {
          await db.createEdgeCollection(edgeCollectionName);
          logger.log({
            level: 'info',
            message: 'arangoImporter - createSchema - created edge collection',
            meta: { edgeCollectionName }
          });
        }
      }
    }

    // 3. Create indexes (unique, regular) for each collection
    for (const [table, indexes] of Object.entries(schemaMeta.indexes)) {
      const collection = db.collection(table);
      for (const [indexName, columns] of Object.entries(indexes)) {
        // Create hash index for unique constraints, skip if already exists
        await collection.ensureIndex({ type: 'hash', fields: columns, unique: false });
        logger.log({
          level: 'info',
          message: 'arangoImporter - createSchema - created index',
          meta: { table, indexName, columns }
        });
      }
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'arangoImporter - createSchema - error',
      meta: { error: error.message }
    });
    throw error;
  }
};

/**
 * Inserts documents into a collection in ArangoDB.
 * @param {string} table - Collection name
 * @param {object[]} rows - Array of row objects to insert
 */
const insertDocuments = async (table, rows) => {
  try {
    const collection = db.collection(table);
    await collection.import(rows, { overwrite: false });
    logger.log({
      level: 'info',
      message: 'arangoImporter - insertDocuments - imported rows',
      meta: { table, count: rows.length }
    });
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'arangoImporter - insertDocuments - error',
      meta: { table, error: error.message }
    });
    throw error;
  }
};

module.exports = {
  createSchema,
  insertDocuments,
};
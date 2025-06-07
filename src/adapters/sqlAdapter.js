const { connectToDatabase } = require('./dbConnections');
const { logger } = require('../middlewares/loggerMiddleware');
const connect = async (config) => await connectToDatabase(config);

const fetchMySQLMetadata = async (conn, dbName) => {
  
  const [tables] = await conn.execute(
    'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
    [dbName]
  );

  const tableNames = tables.map(t => t.TABLE_NAME);
  const primaryKeys = {};
  const foreignKeys = [];
  const indexes = {};

  for (const table of tableNames) {
    const [pkRes] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'`,
    [dbName, table]
    );
    primaryKeys[table] = pkRes[0]?.COLUMN_NAME || 'id';

    const [fkRes] = await conn.execute(`
      SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [dbName, table]
    );
    fkRes.forEach(fk => {
      foreignKeys.push({
        fromTable: table,
        fromColumn: fk.COLUMN_NAME,
        toTable: fk.REFERENCED_TABLE_NAME,
        toColumn: fk.REFERENCED_COLUMN_NAME,
      });
    });

    const [idxRes] = await conn.execute(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    [dbName, table]
    );
    indexes[table] = {};
    idxRes.forEach(idx => {
      if (!indexes[table][idx.INDEX_NAME]) {
        indexes[table][idx.INDEX_NAME] = {
          columns: [],
          unique: idx.NON_UNIQUE === 0
        };
      }
      indexes[table][idx.INDEX_NAME].columns.push(idx.COLUMN_NAME);
    });
  }

  return { tableNames, primaryKeys, foreignKeys, indexes };
};

const fetchPostgresMetadata = async (conn, schema) => {
  await conn.query(`SET search_path TO ${schema}`);

  const res = await conn.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
    [schema]
  );

  const tableNames = res.rows.map(r => r.table_name);
  const primaryKeys = {};
  const foreignKeys = [];
  const indexes = {};

  for (const table of tableNames) {
    const pkRes = await conn.query(`
      SELECT a.attname AS column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    [table]
    );
    primaryKeys[table] = pkRes.rows[0]?.column_name || 'id';

    const fkRes = await conn.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name = $1`,
    [table]
    );
    fkRes.rows.forEach(fk => {
      foreignKeys.push({
        fromTable: fk.from_table,
        fromColumn: fk.from_column,
        toTable: fk.to_table,
        toColumn: fk.to_column
      });
    });
    const idxRes = await conn.query(`
      SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
      WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = $1`,
    [table]
    );
    indexes[table] = {};
    idxRes.rows.forEach(idx => {
      if (!indexes[table][idx.index_name]) {
        indexes[table][idx.index_name] = {
          columns: [],
          unique: idx.is_unique
        };
      }
      indexes[table][idx.index_name].columns.push(idx.column_name);
    });
  }

  return { tableNames, primaryKeys, foreignKeys, indexes };
};

const fetchMetadata = async (conn, dbName, schema, type) => {
  switch (type) {
  case 'mysql':
    return await fetchMySQLMetadata(conn, dbName);
  case 'postgres':
    return await fetchPostgresMetadata(conn, schema);
  default:
    throw new Error(`Unsupported database type: ${type}`);
  }
};

const fetchTableData = async (conn, tableName, type) => {
  switch (type) {
  case 'mysql': {
    const [rows] = await conn.execute(`SELECT * FROM \`${tableName}\``);
    return rows;
  }

  case 'postgres': {
    const res = await conn.query(`SELECT * FROM "${tableName}"`);
    return res.rows;
  }

  default:
    throw new Error(`Unsupported database type: ${type}`);
  }
};

const disconnect = async (conn) => {
  await conn.end();
  logger.log({
    level: 'info',
    message: 'Connection closed'
  });
};

module.exports = { connect, fetchMetadata, fetchTableData, disconnect };
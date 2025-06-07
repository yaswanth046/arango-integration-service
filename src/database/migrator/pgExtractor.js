const { Pool } = require('pg');
const QueryStream = require('pg-query-stream');

const connect = async (pgConfig) => {
  const pool = new Pool(pgConfig);
  return pool;
};

const extractSchema = async (pgClient, schema) => {
  // Fetch tables
  const tablesRes = await pgClient.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
    [schema]
  );

  const tables = tablesRes.rows.map(r => r.table_name);

  // Fetch columns
  const columnsRes = await pgClient.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
     FROM information_schema.columns WHERE table_schema = $1`,
    [schema]
  );
  const columns = {};
  columnsRes.rows.forEach(row => {
    if (!columns[row.table_name]) {
      columns[row.table_name] = [];
    }
    columns[row.table_name].push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default
    });
  });

  // Fetch primary keys
  const pkRes = await pgClient.query(
    `SELECT tc.table_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = $1`,
    [schema]
  );
  const primaryKeys = {};
  pkRes.rows.forEach(row => {
    if (!primaryKeys[row.table_name]) {
      primaryKeys[row.table_name] = [];
    }
    primaryKeys[row.table_name].push(row.column_name);
  });

  // Fetch foreign keys
  const fkRes = await pgClient.query(
    `SELECT tc.table_name, kcu.column_name,
     ccu.table_name AS foreign_table_name, 
    ccu.column_name AS foreign_column_name
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1`,
    [schema]
  );
  const foreignKeys = {};
  fkRes.rows.forEach(row => {
    if (!foreignKeys[row.table_name]) {
      foreignKeys[row.table_name] = [];
    }
    foreignKeys[row.table_name].push({
      column: row.column_name,
      refTable: row.foreign_table_name,
      refColumn: row.foreign_column_name
    });
  });

  // Fetch unique constraints
  const uniqueRes = await pgClient.query(
    `SELECT tc.table_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = $1`,
    [schema]
  );
  const uniqueConstraints = {};
  uniqueRes.rows.forEach(row => {
    if (!uniqueConstraints[row.table_name]) {
      uniqueConstraints[row.table_name] = [];
    }
    uniqueConstraints[row.table_name].push(row.column_name);
  });

  // Fetch indexes
  const indexRes = await pgClient.query(
    `SELECT t.relname AS table_name, i.relname AS index_name, a.attname AS column_name
     FROM pg_class t, pg_class i, pg_index ix, pg_attribute a, pg_namespace n
     WHERE t.oid = ix.indrelid
       AND i.oid = ix.indexrelid
       AND a.attrelid = t.oid
       AND a.attnum = ANY(ix.indkey)
       AND t.relnamespace = n.oid
       AND n.nspname = $1
     ORDER BY t.relname, i.relname`,
    [schema]
  );
  const indexes = {};
  indexRes.rows.forEach(row => {
    if (!indexes[row.table_name]) {
      indexes[row.table_name] = {};
    }
    if (!indexes[row.table_name][row.index_name]) {
      indexes[row.table_name][row.index_name] = [];
    }
    indexes[row.table_name][row.index_name].push(row.column_name);
  });

  return {
    tables,
    columns,
    primaryKeys,
    foreignKeys,
    uniqueConstraints,
    indexes
  };
};

const streamTableData = async (pgClient, table, onRows) => {
  const client = await pgClient.connect();
  try {
    const stream = client.query(new QueryStream(`SELECT * FROM "${table}"`));
    let batch = [];
    for await (const row of stream) {
      batch.push(row);
      if (batch.length >= 1000) {
        await onRows(batch);
        batch = [];
      }
    }
    if (batch.length) {
      await onRows(batch);
    }
  } finally {
    client.release();
  }
};

module.exports = {
  connect,
  extractSchema,
  streamTableData
};
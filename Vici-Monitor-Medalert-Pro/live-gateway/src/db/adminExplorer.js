const { initDb, getDb, persist } = require('./core');

let clearNonce = null;

function ensureTableName(name) {
  const n = String(name || '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(n)) return null;
  return n;
}

function buildFilterSql({ column, op }) {
  const safeOp = String(op || '').toLowerCase();
  if (safeOp === 'eq') return `${column} = ?`;
  if (safeOp === 'like') return `${column} LIKE ?`;
  if (safeOp === 'gt') return `${column} > ?`;
  if (safeOp === 'lt') return `${column} < ?`;
  return null;
}

async function listTables() {
  await initDb();
  const db = getDb();
  const stmt = db.prepare(
    `SELECT name
     FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name ASC`
  );
  const tables = [];
  while (stmt.step()) tables.push(stmt.getAsObject().name);
  stmt.free();
  return tables;
}

async function getTableInfo(tableName) {
  await initDb();
  const db = getDb();
  const table = ensureTableName(tableName);
  if (!table) return null;
  const colsStmt = db.prepare(`PRAGMA table_info(${table});`);
  const columns = [];
  while (colsStmt.step()) {
    const r = colsStmt.getAsObject();
    columns.push({
      name: r.name,
      type: r.type,
      notnull: !!r.notnull,
      pk: !!r.pk
    });
  }
  colsStmt.free();

  const countStmt = db.prepare(`SELECT COUNT(*) AS count FROM ${table};`);
  let count = 0;
  if (countStmt.step()) count = Number(countStmt.getAsObject().count || 0);
  countStmt.free();

  return { table, columns, count };
}

async function queryTable({ tableName, limit = 100, offset = 0, filter }) {
  await initDb();
  const db = getDb();
  const table = ensureTableName(tableName);
  if (!table) return null;

  const info = await getTableInfo(table);
  if (!info) return null;

  const lim = Math.min(500, Math.max(1, Number(limit) || 100));
  const off = Math.max(0, Number(offset) || 0);

  let whereSql = '';
  const bind = [];

  if (filter?.column && filter?.op) {
    const col = info.columns.find((c) => c.name === filter.column);
    if (col) {
      const clause = buildFilterSql({ column: filter.column, op: filter.op });
      if (clause) {
        whereSql = ` WHERE ${clause} `;
        bind.push(filter.op === 'like' ? `%${String(filter.value ?? '')}%` : String(filter.value ?? ''));
      }
    }
  }

  const sql = `SELECT * FROM ${table}${whereSql} LIMIT ? OFFSET ?;`;
  bind.push(lim, off);

  const stmt = db.prepare(sql);
  stmt.bind(bind);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  return { table, columns: info.columns, rows, limit: lim, offset: off, count: info.count };
}

async function prepareClear() {
  await initDb();
  clearNonce = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return { nonce: clearNonce, phrase: 'CLEAR_DATA' };
}

async function confirmClear({ nonce, phrase }) {
  await initDb();
  const db = getDb();
  if (!clearNonce || nonce !== clearNonce) return { success: false, error: 'invalid_nonce' };
  if (String(phrase || '').trim().toUpperCase() !== 'CLEAR_DATA') return { success: false, error: 'invalid_phrase' };

  db.run('BEGIN');
  try {
    db.run('DELETE FROM app_settings;');
    db.run('DELETE FROM raw_snapshots;');
    db.run('DELETE FROM callflow_snapshots;');
    db.run('DELETE FROM shift_buckets;');
    db.run('DELETE FROM callflow_hourly;');
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  } finally {
    clearNonce = null;
    persist();
  }

  return { success: true };
}

module.exports = {
  listTables,
  getTableInfo,
  queryTable,
  prepareClear,
  confirmClear
};


const path = require('path');
const fs = require('fs');

// Pure JS SQLite (WASM) to avoid native build tooling on Windows.
// This removes the need for Visual Studio C++ during `npm install`.
const initSqlJs = require('sql.js');

const DB_PATH =
  process.env.SHIFT_DB_PATH || path.join(__dirname, '..', 'data', 'vici_shift.sqlite');

let SQL;
let db;
let isInitialized = false;
let clearNonce = null;

async function initDb() {
  if (isInitialized) return;
  SQL = await initSqlJs();

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const fileBuf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(fileBuf));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS raw_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      local_hour INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS callflow_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      local_hour INTEGER NOT NULL,
      active_calls INTEGER NOT NULL DEFAULT 0,
      calls_waiting INTEGER NOT NULL DEFAULT 0,
      ringing_calls INTEGER NOT NULL DEFAULT 0,
      calls_in_ivr INTEGER NOT NULL DEFAULT 0,
      calls_today INTEGER NOT NULL DEFAULT 0,
      dropped REAL NOT NULL DEFAULT 0,
      answered REAL NOT NULL DEFAULT 0,
      dropped_percent REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shift_buckets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      state_bucket TEXT NOT NULL,
      agent_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS callflow_hourly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      samples INTEGER NOT NULL DEFAULT 0,
      active_calls_avg REAL NOT NULL DEFAULT 0,
      active_calls_max INTEGER NOT NULL DEFAULT 0,
      calls_waiting_avg REAL NOT NULL DEFAULT 0,
      calls_waiting_max INTEGER NOT NULL DEFAULT 0,
      calls_in_ivr_avg REAL NOT NULL DEFAULT 0,
      calls_in_ivr_max INTEGER NOT NULL DEFAULT 0,
      ringing_calls_avg REAL NOT NULL DEFAULT 0,
      ringing_calls_max INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_raw_shift_date_ts
      ON raw_snapshots (shift_date, ts);
    CREATE INDEX IF NOT EXISTS idx_raw_shift_date_local_hour
      ON raw_snapshots (shift_date, local_hour);

    CREATE INDEX IF NOT EXISTS idx_callflow_snap_shift_ts
      ON callflow_snapshots (shift_date, ts);
    CREATE INDEX IF NOT EXISTS idx_callflow_snap_shift_hour
      ON callflow_snapshots (shift_date, local_hour);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_callflow_hourly_key
      ON callflow_hourly (shift_date, hour);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_bucket_key
      ON shift_buckets (shift_date, hour, state_bucket);
  `);

  // Lightweight migrations for existing DB files.
  try {
    const colsStmt = db.prepare(`PRAGMA table_info(raw_snapshots);`);
    const cols = [];
    while (colsStmt.step()) cols.push(colsStmt.getAsObject().name);
    colsStmt.free();
    if (!cols.includes('local_hour')) {
      db.run(`ALTER TABLE raw_snapshots ADD COLUMN local_hour INTEGER NOT NULL DEFAULT 0;`);
      persist();
    }
  } catch {
    // Ignore migration failures; schema will be correct on fresh DBs.
  }

  // Defaults (Asia/Karachi, 19:00 -> 04:30, retention 14 days)
  const hasDefaultsStmt = db.prepare(`SELECT COUNT(*) AS count FROM app_settings;`);
  let count = 0;
  if (hasDefaultsStmt.step()) count = Number(hasDefaultsStmt.getAsObject().count || 0);
  hasDefaultsStmt.free();
  if (count === 0) {
    db.run(`INSERT INTO app_settings (key, value_json) VALUES (?, ?)`, [
      'shift',
      JSON.stringify({
        tzOffsetMinutes: 300,
        start: '19:00',
        end: '04:30'
      })
    ]);
    db.run(`INSERT INTO app_settings (key, value_json) VALUES (?, ?)`, [
      'retention',
      JSON.stringify({
        rawSnapshotsDays: 14,
        bucketsDays: 60
      })
    ]);
    persist();
  }

  isInitialized = true;
}

function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function getSettings() {
  await initDb();
  const stmt = db.prepare(`SELECT key, value_json FROM app_settings;`);
  const out = {};
  while (stmt.step()) {
    const r = stmt.getAsObject();
    try {
      out[r.key] = JSON.parse(r.value_json);
    } catch {
      out[r.key] = null;
    }
  }
  stmt.free();

  // Ensure defaults exist even if the table was cleared.
  if (!out.shift) {
    out.shift = { tzOffsetMinutes: 300, start: '19:00', end: '04:30' };
    await upsertSetting('shift', out.shift);
  }
  if (!out.retention) {
    out.retention = { rawSnapshotsDays: 14, bucketsDays: 60 };
    await upsertSetting('retention', out.retention);
  }
  return out;
}

async function upsertSetting(key, value) {
  await initDb();
  const k = String(key || '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) return false;
  db.run(`UPDATE app_settings SET value_json = ? WHERE key = ?`, [JSON.stringify(value), k]);
  if (db.getRowsModified() === 0) {
    db.run(`INSERT INTO app_settings (key, value_json) VALUES (?, ?)`, [k, JSON.stringify(value)]);
  }
  persist();
  return true;
}

function parseHm(hm) {
  const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, m: mi };
}

function toLocalParts(tsIso, tzOffsetMinutes) {
  const d = new Date(tsIso || Date.now());
  const utcMs = d.getTime();
  const local = new Date(utcMs + Number(tzOffsetMinutes || 0) * 60 * 1000);
  return {
    ymd: local.toISOString().slice(0, 10),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes()
  };
}

function computeShiftDateWithSettings(tsIso, shift) {
  const offset = Number(shift?.tzOffsetMinutes ?? 0);
  const end = parseHm(shift?.end) || { h: 4, m: 30 };
  const local = toLocalParts(tsIso, offset);

  // If local time is before shift end, it belongs to previous date.
  if (local.hour < end.h || (local.hour === end.h && local.minute < end.m)) {
    const dt = new Date(`${local.ymd}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  }
  return local.ymd;
}

async function cleanupRetention(settings) {
  await initDb();
  const retention = settings?.retention || {};
  const rawDays = Math.max(1, Number(retention.rawSnapshotsDays ?? 14));
  const bucketDays = Math.max(1, Number(retention.bucketsDays ?? 60));

  const rawCutoff = new Date(Date.now() - rawDays * 24 * 60 * 60 * 1000).toISOString();
  db.run(`DELETE FROM raw_snapshots WHERE ts < ?`, [rawCutoff]);
  db.run(`DELETE FROM callflow_snapshots WHERE ts < ?`, [rawCutoff]);

  // shift_date is YYYY-MM-DD; lexicographic compare works.
  const bdt = new Date(Date.now() - bucketDays * 24 * 60 * 60 * 1000);
  const bucketCutoff = bdt.toISOString().slice(0, 10);
  db.run(`DELETE FROM shift_buckets WHERE shift_date < ?`, [bucketCutoff]);
  db.run(`DELETE FROM callflow_hourly WHERE shift_date < ?`, [bucketCutoff]);
  persist();
}

function ensureTableName(name) {
  const n = String(name || '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(n)) return null;
  return n;
}

async function listTables() {
  await initDb();
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

function buildFilterSql({ column, op }) {
  const safeOp = String(op || '').toLowerCase();
  if (safeOp === 'eq') return `${column} = ?`;
  if (safeOp === 'like') return `${column} LIKE ?`;
  if (safeOp === 'gt') return `${column} > ?`;
  if (safeOp === 'lt') return `${column} < ?`;
  return null;
}

async function queryTable({ tableName, limit = 100, offset = 0, filter }) {
  await initDb();
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

async function computeShiftDate(tsIso) {
  const settings = await getSettings();
  return computeShiftDateWithSettings(tsIso, settings.shift);
}

function upsertBucket(shiftDate, hour, stateBucket, count) {
  // sql.js doesn't support ON CONFLICT in all builds reliably; do a simple upsert.
  db.run(
    `UPDATE shift_buckets
     SET agent_count = ?
     WHERE shift_date = ? AND hour = ? AND state_bucket = ?`,
    [count, shiftDate, hour, stateBucket]
  );
  const changes = db.getRowsModified();
  if (changes === 0) {
    db.run(
      `INSERT INTO shift_buckets (shift_date, hour, state_bucket, agent_count)
       VALUES (?, ?, ?, ?)`,
      [shiftDate, hour, stateBucket, count]
    );
  }
}

function toNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(x, min = 0, max = 1_000_000) {
  const n = Math.trunc(toNum(x, 0));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function getHourlyRow(shiftDate, hour) {
  const stmt = db.prepare(
    `SELECT samples, active_calls_avg, active_calls_max,
            calls_waiting_avg, calls_waiting_max,
            calls_in_ivr_avg, calls_in_ivr_max,
            ringing_calls_avg, ringing_calls_max
     FROM callflow_hourly
     WHERE shift_date = ? AND hour = ?
     LIMIT 1`
  );
  stmt.bind([shiftDate, hour]);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function upsertHourly(shiftDate, hour, next) {
  db.run(
    `UPDATE callflow_hourly
     SET samples = ?,
         active_calls_avg = ?, active_calls_max = ?,
         calls_waiting_avg = ?, calls_waiting_max = ?,
         calls_in_ivr_avg = ?, calls_in_ivr_max = ?,
         ringing_calls_avg = ?, ringing_calls_max = ?
     WHERE shift_date = ? AND hour = ?`,
    [
      next.samples,
      next.active_calls_avg,
      next.active_calls_max,
      next.calls_waiting_avg,
      next.calls_waiting_max,
      next.calls_in_ivr_avg,
      next.calls_in_ivr_max,
      next.ringing_calls_avg,
      next.ringing_calls_max,
      shiftDate,
      hour
    ]
  );
  if (db.getRowsModified() === 0) {
    db.run(
      `INSERT INTO callflow_hourly (
        shift_date, hour, samples,
        active_calls_avg, active_calls_max,
        calls_waiting_avg, calls_waiting_max,
        calls_in_ivr_avg, calls_in_ivr_max,
        ringing_calls_avg, ringing_calls_max
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shiftDate,
        hour,
        next.samples,
        next.active_calls_avg,
        next.active_calls_max,
        next.calls_waiting_avg,
        next.calls_waiting_max,
        next.calls_in_ivr_avg,
        next.calls_in_ivr_max,
        next.ringing_calls_avg,
        next.ringing_calls_max
      ]
    );
  }
}

function updateAvg(prevAvg, prevN, nextValue) {
  const n = prevN + 1;
  const avg = (prevAvg * prevN + nextValue) / n;
  return { avg, n };
}

function updateHourlyCallflow(shiftDate, hour, metrics) {
  const prev = getHourlyRow(shiftDate, hour);
  const prevN = prev ? Number(prev.samples || 0) : 0;
  const a = updateAvg(prev ? toNum(prev.active_calls_avg) : 0, prevN, metrics.active_calls);
  const w = updateAvg(prev ? toNum(prev.calls_waiting_avg) : 0, prevN, metrics.calls_waiting);
  const ivr = updateAvg(prev ? toNum(prev.calls_in_ivr_avg) : 0, prevN, metrics.calls_in_ivr);
  const r = updateAvg(prev ? toNum(prev.ringing_calls_avg) : 0, prevN, metrics.ringing_calls);

  const next = {
    samples: a.n,
    active_calls_avg: a.avg,
    active_calls_max: Math.max(prev ? clampInt(prev.active_calls_max) : 0, metrics.active_calls),
    calls_waiting_avg: w.avg,
    calls_waiting_max: Math.max(prev ? clampInt(prev.calls_waiting_max) : 0, metrics.calls_waiting),
    calls_in_ivr_avg: ivr.avg,
    calls_in_ivr_max: Math.max(prev ? clampInt(prev.calls_in_ivr_max) : 0, metrics.calls_in_ivr),
    ringing_calls_avg: r.avg,
    ringing_calls_max: Math.max(prev ? clampInt(prev.ringing_calls_max) : 0, metrics.ringing_calls)
  };

  upsertHourly(shiftDate, hour, next);
  return next;
}

async function storeSnapshot(snapshot) {
  await initDb();
  const settings = await getSettings();
  const ts = snapshot.timestamp || new Date().toISOString();
  const shiftDate = computeShiftDateWithSettings(ts, settings.shift);
  const local = toLocalParts(ts, settings.shift?.tzOffsetMinutes ?? 0);
  const hour = local.hour;

  db.run(
    `INSERT INTO raw_snapshots (ts, shift_date, local_hour, payload_json)
     VALUES (?, ?, ?, ?)`,
    [ts, shiftDate, hour, JSON.stringify(snapshot)]
  );

  const summary = snapshot?.summary || {};
  const meta = snapshot?.meta || {};
  const droppedAnswered = meta?.droppedAnswered || {};
  const callMetrics = {
    active_calls: clampInt(summary.activeCalls),
    calls_waiting: clampInt(summary.callsWaiting),
    ringing_calls: clampInt(summary.ringingCalls),
    calls_in_ivr: clampInt(summary.callsInIvr),
    calls_today: clampInt(meta.callsToday),
    dropped: toNum(droppedAnswered.dropped, 0),
    answered: toNum(droppedAnswered.answered, 0),
    dropped_percent: toNum(meta.droppedPercent, 0)
  };

  db.run(
    `INSERT INTO callflow_snapshots (
      ts, shift_date, local_hour,
      active_calls, calls_waiting, ringing_calls, calls_in_ivr,
      calls_today, dropped, answered, dropped_percent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ts,
      shiftDate,
      hour,
      callMetrics.active_calls,
      callMetrics.calls_waiting,
      callMetrics.ringing_calls,
      callMetrics.calls_in_ivr,
      callMetrics.calls_today,
      callMetrics.dropped,
      callMetrics.answered,
      callMetrics.dropped_percent
    ]
  );

  const agents = Array.isArray(snapshot.agents) ? snapshot.agents : [];
  const counts = {};
  for (const a of agents) {
    const b = a?.stateBucket || 'unknown';
    counts[b] = (counts[b] || 0) + 1;
  }

  db.run('BEGIN');
  try {
    for (const [bucket, count] of Object.entries(counts)) {
      upsertBucket(shiftDate, hour, bucket, count);
    }
    const hourly = updateHourlyCallflow(shiftDate, hour, callMetrics);
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  } finally {
    // Opportunistic retention cleanup (cheap enough for small DBs)
    try {
      await cleanupRetention(settings);
    } catch {
      // ignore retention errors
    }
    persist();
  }

  return { ts, shiftDate, hour, counts, callMetrics };
}

async function getShiftSummary(shiftDate) {
  await initDb();
  const stmt = db.prepare(
    `SELECT hour, state_bucket, agent_count
     FROM shift_buckets
     WHERE shift_date = ?
     ORDER BY hour ASC`
  );
  stmt.bind([shiftDate]);
  const hours = {};
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const hour = Number(row.hour);
    if (!hours[hour]) hours[hour] = {};
    hours[hour][row.state_bucket] = Number(row.agent_count);
  }
  stmt.free();
  return hours;
}

async function getPeakHour(shiftDate) {
  await initDb();
  const stmt = db.prepare(
    `SELECT hour, SUM(agent_count) AS total_agents
     FROM shift_buckets
     WHERE shift_date = ?
     GROUP BY hour
     ORDER BY total_agents DESC
     LIMIT 1`
  );
  stmt.bind([shiftDate]);
  let result = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    result = { hour: Number(row.hour), total_agents: Number(row.total_agents) };
  }
  stmt.free();
  return result;
}

async function getCallflowHourly(shiftDate) {
  await initDb();
  const stmt = db.prepare(
    `SELECT hour, samples,
            active_calls_avg, active_calls_max,
            calls_waiting_avg, calls_waiting_max,
            calls_in_ivr_avg, calls_in_ivr_max,
            ringing_calls_avg, ringing_calls_max
     FROM callflow_hourly
     WHERE shift_date = ?
     ORDER BY hour ASC`
  );
  stmt.bind([shiftDate]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function getCallflowPeakHour(shiftDate) {
  await initDb();
  const stmt = db.prepare(
    `SELECT hour, calls_waiting_max
     FROM callflow_hourly
     WHERE shift_date = ?
     ORDER BY calls_waiting_max DESC
     LIMIT 1`
  );
  stmt.bind([shiftDate]);
  let result = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    result = { hour: Number(row.hour), calls_waiting_max: Number(row.calls_waiting_max) };
  }
  stmt.free();
  return result;
}

module.exports = {
  storeSnapshot,
  getShiftSummary,
  getPeakHour,
  getCallflowHourly,
  getCallflowPeakHour,
  computeShiftDate,
  listTables,
  getTableInfo,
  queryTable,
  prepareClear,
  confirmClear,
  getSettings,
  upsertSetting
};


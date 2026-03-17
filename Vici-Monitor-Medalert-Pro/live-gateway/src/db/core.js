const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH =
  process.env.SHIFT_DB_PATH || path.join(__dirname, '..', 'data', 'vici_shift.sqlite');

let SQL;
let db;
let isInitialized = false;

function getDb() {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

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

    CREATE TABLE IF NOT EXISTS generated_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      kind TEXT NOT NULL,
      format TEXT NOT NULL,
      file_path TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_shift_created
      ON generated_reports (shift_date, created_at);

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      details_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      acked_at TEXT,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_shift_ts
      ON alerts (shift_date, ts);
    CREATE INDEX IF NOT EXISTS idx_alerts_status
      ON alerts (status, ts);

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

  // Lightweight migration for older DB files.
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

  // Defaults (Asia/Karachi, 19:00 -> 04:30, retention 14/60 days)
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

module.exports = {
  initDb,
  getDb,
  persist
};


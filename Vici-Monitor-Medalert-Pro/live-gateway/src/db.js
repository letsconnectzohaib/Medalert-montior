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
    CREATE TABLE IF NOT EXISTS raw_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_buckets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      state_bucket TEXT NOT NULL,
      agent_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_raw_shift_date_ts
      ON raw_snapshots (shift_date, ts);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_bucket_key
      ON shift_buckets (shift_date, hour, state_bucket);
  `);

  isInitialized = true;
}

function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function computeShiftDate(tsIso) {
  const d = new Date(tsIso || Date.now());
  // Use Asia/Karachi-like simple offset (UTC+5) and 19:00–04:30 window.
  const utc = d.getTime();
  const local = new Date(utc + 5 * 60 * 60 * 1000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  if (h < 4 || (h === 4 && m < 30)) {
    local.setUTCDate(local.getUTCDate() - 1);
  }
  return local.toISOString().slice(0, 10);
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

async function storeSnapshot(snapshot) {
  await initDb();
  const ts = snapshot.timestamp || new Date().toISOString();
  const shiftDate = computeShiftDate(ts);
  const hour = new Date(ts).getHours();

  db.run(
    `INSERT INTO raw_snapshots (ts, shift_date, payload_json)
     VALUES (?, ?, ?)`,
    [ts, shiftDate, JSON.stringify(snapshot)]
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
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  } finally {
    persist();
  }

  return { ts, shiftDate, hour, counts };
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

module.exports = {
  storeSnapshot,
  getShiftSummary,
  getPeakHour,
  computeShiftDate
};


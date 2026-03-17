const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.SHIFT_DB_PATH ||
  path.join(__dirname, '..', 'data', 'vici_shift.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
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
  }
  return db;
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
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO shift_buckets (shift_date, hour, state_bucket, agent_count)
    VALUES (@shift_date, @hour, @state_bucket, @agent_count)
    ON CONFLICT(shift_date, hour, state_bucket)
    DO UPDATE SET agent_count = excluded.agent_count;
  `);
  stmt.run({
    shift_date: shiftDate,
    hour,
    state_bucket: stateBucket,
    agent_count: count
  });
}

function storeSnapshot(snapshot) {
  const db = getDb();
  const ts = snapshot.timestamp || new Date().toISOString();
  const shiftDate = computeShiftDate(ts);
  const hour = new Date(ts).getHours();

  const insertRaw = db.prepare(`
    INSERT INTO raw_snapshots (ts, shift_date, payload_json)
    VALUES (?, ?, ?)
  `);
  insertRaw.run(ts, shiftDate, JSON.stringify(snapshot));

  const agents = Array.isArray(snapshot.agents) ? snapshot.agents : [];
  const counts = {};
  for (const a of agents) {
    const b = a?.stateBucket || 'unknown';
    counts[b] = (counts[b] || 0) + 1;
  }

  db.transaction(() => {
    for (const [bucket, count] of Object.entries(counts)) {
      upsertBucket(shiftDate, hour, bucket, count);
    }
  })();

  return { ts, shiftDate, hour, counts };
}

function getShiftSummary(shiftDate) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT hour, state_bucket, agent_count
     FROM shift_buckets
     WHERE shift_date = ?
     ORDER BY hour ASC`
  ).all(shiftDate);

  const hours = {};
  for (const r of rows) {
    if (!hours[r.hour]) hours[r.hour] = {};
    hours[r.hour][r.state_bucket] = r.agent_count;
  }
  return hours;
}

function getPeakHour(shiftDate) {
  const db = getDb();
  const row = db.prepare(
    `SELECT hour,
            SUM(agent_count) AS total_agents
     FROM shift_buckets
     WHERE shift_date = ?
     GROUP BY hour
     ORDER BY total_agents DESC
     LIMIT 1`
  ).get(shiftDate);
  return row || null;
}

module.exports = {
  storeSnapshot,
  getShiftSummary,
  getPeakHour,
  computeShiftDate
};


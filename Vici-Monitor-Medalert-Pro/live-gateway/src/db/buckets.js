const { initDb, getDb } = require('./core');

function upsertBucket(shiftDate, hour, stateBucket, count) {
  const db = getDb();
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

async function getShiftSummary(shiftDate) {
  await initDb();
  const db = getDb();
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
  const db = getDb();
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

async function storeBucketCounts({ shiftDate, hour, counts }) {
  await initDb();
  for (const [bucket, count] of Object.entries(counts || {})) {
    upsertBucket(shiftDate, hour, bucket, count);
  }
}

module.exports = {
  storeBucketCounts,
  getShiftSummary,
  getPeakHour
};


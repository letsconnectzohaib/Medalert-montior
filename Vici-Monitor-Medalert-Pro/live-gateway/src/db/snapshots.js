const { initDb, getDb, persist } = require('./core');
const { getSettings } = require('./settings');
const { cleanupRetention } = require('./retention');
const { toLocalParts, computeShiftDateWithSettings } = require('./time');
const { storeBucketCounts } = require('./buckets');
const { storeCallflowSnapshot } = require('./callflow');
const { detectAndStoreAlerts } = require('../alerts/detector');

async function computeShiftDate(tsIso) {
  const settings = await getSettings();
  return computeShiftDateWithSettings(tsIso, settings.shift);
}

async function storeSnapshot(snapshot) {
  await initDb();
  const db = getDb();
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

  const agents = Array.isArray(snapshot.agents) ? snapshot.agents : [];
  const counts = {};
  for (const a of agents) {
    const b = a?.stateBucket || 'unknown';
    counts[b] = (counts[b] || 0) + 1;
  }

  db.run('BEGIN');
  try {
    await storeBucketCounts({ shiftDate, hour, counts });
    const { callMetrics } = await storeCallflowSnapshot({ ts, shiftDate, hour, snapshot });
    const alertsCreated = await detectAndStoreAlerts({ ts, shiftDate, counts, callMetrics, settings });
    db.run('COMMIT');
    return { ts, shiftDate, hour, counts, callMetrics, alertsCreated: alertsCreated || [] };
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  } finally {
    try {
      await cleanupRetention(settings);
    } catch {
      // ignore retention errors
    }
    persist();
  }
}

module.exports = {
  storeSnapshot,
  computeShiftDate
};


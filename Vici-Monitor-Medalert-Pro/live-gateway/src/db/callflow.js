const { initDb, getDb } = require('./core');

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
  const db = getDb();
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
  const db = getDb();
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

async function storeCallflowSnapshot({ ts, shiftDate, hour, snapshot }) {
  await initDb();
  const db = getDb();

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

  const hourly = updateHourlyCallflow(shiftDate, hour, callMetrics);
  return { callMetrics, hourly };
}

async function getCallflowHourly(shiftDate) {
  await initDb();
  const db = getDb();
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
  const db = getDb();
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
  storeCallflowSnapshot,
  getCallflowHourly,
  getCallflowPeakHour
};


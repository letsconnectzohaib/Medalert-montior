const { initDb, getDb } = require("./core");

function clampLimit(x, def = 100, max = 2000) {
  const n = Number(x);
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(max, Math.trunc(n)));
}

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(String(text || ""));
  } catch {
    return fallback;
  }
}

function normalizeShiftDate(shiftDate) {
  return String(shiftDate || "").slice(0, 10);
}

function toIsoCutoffMinutes(minutes) {
  const mins = Math.max(1, Number(minutes || 0));
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

async function getLatestRawSnapshotForShift(shiftDate) {
  await initDb();
  const db = getDb();
  const stmt = db.prepare(
    `SELECT ts, payload_json
     FROM raw_snapshots
     WHERE shift_date = ?
     ORDER BY ts DESC
     LIMIT 1`,
  );
  stmt.bind([normalizeShiftDate(shiftDate)]);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();

  if (!row) return null;

  const snapshot = safeJsonParse(row.payload_json, null);
  return { ts: row.ts, snapshot };
}

async function getRawSnapshotsForShift({
  shiftDate,
  limit = 200,
  order = "asc",
}) {
  await initDb();
  const db = getDb();
  const lim = clampLimit(limit, 200, 2000);
  const ord = String(order || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

  const stmt = db.prepare(
    `SELECT id, ts, local_hour, payload_json
     FROM raw_snapshots
     WHERE shift_date = ?
     ORDER BY ts ${ord}
     LIMIT ?`,
  );
  stmt.bind([normalizeShiftDate(shiftDate), lim]);

  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({
      id: Number(row.id),
      ts: row.ts,
      local_hour: Number(row.local_hour || 0),
      snapshot: safeJsonParse(row.payload_json, null),
    });
  }
  stmt.free();
  return rows;
}

async function getCallflowHourlyRange({ startShiftDate, endShiftDate }) {
  await initDb();
  const db = getDb();
  const stmt = db.prepare(
    `SELECT shift_date, hour, samples,
            active_calls_avg, active_calls_max,
            calls_waiting_avg, calls_waiting_max,
            calls_in_ivr_avg, calls_in_ivr_max,
            ringing_calls_avg, ringing_calls_max,
            calls_today_max,
            dropped_percent_avg, dropped_percent_max
     FROM callflow_hourly
     WHERE shift_date >= ? AND shift_date <= ?
     ORDER BY shift_date ASC, hour ASC`,
  );
  stmt.bind([
    normalizeShiftDate(startShiftDate),
    normalizeShiftDate(endShiftDate),
  ]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function getCallflowHourlyForDates(shiftDates) {
  await initDb();
  const db = getDb();
  const dates = Array.isArray(shiftDates)
    ? shiftDates.map(normalizeShiftDate).filter(Boolean)
    : [];

  if (!dates.length) return [];

  const placeholders = dates.map(() => "?").join(", ");
  const stmt = db.prepare(
    `SELECT shift_date, hour, samples,
            active_calls_avg, active_calls_max,
            calls_waiting_avg, calls_waiting_max,
            calls_in_ivr_avg, calls_in_ivr_max,
            ringing_calls_avg, ringing_calls_max,
            calls_today_max,
            dropped_percent_avg, dropped_percent_max
     FROM callflow_hourly
     WHERE shift_date IN (${placeholders})
     ORDER BY shift_date ASC, hour ASC`,
  );
  stmt.bind(dates);

  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function getRecentCallflowSnapshots({
  shiftDate,
  minutes = 30,
  limit = 500,
}) {
  await initDb();
  const db = getDb();
  const lim = clampLimit(limit, 500, 2000);
  const cutoff = toIsoCutoffMinutes(minutes);

  const stmt = db.prepare(
    `SELECT ts, active_calls, calls_waiting, ringing_calls, calls_in_ivr, calls_today, dropped_percent
     FROM callflow_snapshots
     WHERE shift_date = ? AND ts >= ?
     ORDER BY ts ASC
     LIMIT ?`,
  );
  stmt.bind([normalizeShiftDate(shiftDate), cutoff, lim]);

  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function listShiftDates({ limit = 60, desc = true } = {}) {
  await initDb();
  const db = getDb();
  const lim = clampLimit(limit, 60, 365);
  const ord = desc ? "DESC" : "ASC";

  const stmt = db.prepare(
    `SELECT shift_date, COUNT(*) AS snapshot_count, MAX(ts) AS last_ts
     FROM raw_snapshots
     GROUP BY shift_date
     ORDER BY shift_date ${ord}
     LIMIT ?`,
  );
  stmt.bind([lim]);

  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({
      shift_date: row.shift_date,
      snapshot_count: Number(row.snapshot_count || 0),
      last_ts: row.last_ts || null,
    });
  }
  stmt.free();
  return rows;
}

async function getShiftDatesInRange({
  startShiftDate,
  endShiftDate,
  limit = 120,
}) {
  await initDb();
  const db = getDb();
  const lim = clampLimit(limit, 120, 1000);

  const stmt = db.prepare(
    `SELECT shift_date, COUNT(*) AS snapshot_count, MAX(ts) AS last_ts
     FROM raw_snapshots
     WHERE shift_date >= ? AND shift_date <= ?
     GROUP BY shift_date
     ORDER BY shift_date ASC
     LIMIT ?`,
  );
  stmt.bind([
    normalizeShiftDate(startShiftDate),
    normalizeShiftDate(endShiftDate),
    lim,
  ]);

  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({
      shift_date: row.shift_date,
      snapshot_count: Number(row.snapshot_count || 0),
      last_ts: row.last_ts || null,
    });
  }
  stmt.free();
  return rows;
}

async function getCampaignSnapshotStats({ shiftDate, limit = 60 }) {
  const snapshots = await getRawSnapshotsForShift({
    shiftDate,
    limit,
    order: "asc",
  });
  const byCampaign = new Map();

  for (const row of snapshots) {
    const agents = Array.isArray(row?.snapshot?.agents)
      ? row.snapshot.agents
      : [];
    for (const agent of agents) {
      const campaign = String(agent?.campaign || "").trim() || "UNASSIGNED";
      if (!byCampaign.has(campaign)) {
        byCampaign.set(campaign, {
          campaign,
          snapshots: 0,
          agentAppearances: 0,
          inCall: 0,
          waiting: 0,
          paused: 0,
          purple: 0,
          callsTotal: 0,
        });
      }
      const cur = byCampaign.get(campaign);
      cur.agentAppearances += 1;
      cur.callsTotal += Number(agent?.calls || 0);

      const bucket = String(agent?.stateBucket || "");
      if (bucket.startsWith("oncall_")) cur.inCall += 1;
      if (bucket.startsWith("waiting_")) cur.waiting += 1;
      if (bucket.startsWith("paused_")) cur.paused += 1;
      if (bucket === "oncall_gt_5m") cur.purple += 1;
    }

    const touched = new Set(
      agents.map((a) => String(a?.campaign || "").trim() || "UNASSIGNED"),
    );
    for (const campaign of touched) {
      const cur = byCampaign.get(campaign);
      cur.snapshots += 1;
    }
  }

  return Array.from(byCampaign.values())
    .map((row) => {
      const denom = Math.max(1, Number(row.agentAppearances || 0));
      return {
        campaign: row.campaign,
        snapshots: Number(row.snapshots || 0),
        agentAppearances: Number(row.agentAppearances || 0),
        inCallRatio: row.inCall / denom,
        waitingRatio: row.waiting / denom,
        pausedRatio: row.paused / denom,
        purpleRatio: row.purple / denom,
        avgCallsPerAppearance: row.callsTotal / denom,
      };
    })
    .sort(
      (a, b) =>
        b.agentAppearances - a.agentAppearances ||
        a.campaign.localeCompare(b.campaign),
    );
}

async function getAgentSnapshotStats({ shiftDate, limit = 80 }) {
  const snapshots = await getRawSnapshotsForShift({
    shiftDate,
    limit,
    order: "asc",
  });
  const byAgent = new Map();

  for (const row of snapshots) {
    const agents = Array.isArray(row?.snapshot?.agents)
      ? row.snapshot.agents
      : [];
    for (const agent of agents) {
      const user = String(agent?.user || "").trim();
      if (!user) continue;

      if (!byAgent.has(user)) {
        byAgent.set(user, {
          user,
          name: String(agent?.name || "").trim(),
          campaign: String(agent?.campaign || "").trim(),
          snapshots: 0,
          inCall: 0,
          waiting: 0,
          paused: 0,
          purple: 0,
          callsMax: 0,
        });
      }

      const cur = byAgent.get(user);
      cur.snapshots += 1;
      if (!cur.name && agent?.name) cur.name = String(agent.name).trim();
      if (!cur.campaign && agent?.campaign)
        cur.campaign = String(agent.campaign).trim();

      const bucket = String(agent?.stateBucket || "");
      if (bucket.startsWith("oncall_")) cur.inCall += 1;
      if (bucket.startsWith("waiting_")) cur.waiting += 1;
      if (bucket.startsWith("paused_")) cur.paused += 1;
      if (bucket === "oncall_gt_5m") cur.purple += 1;
      cur.callsMax = Math.max(cur.callsMax, Number(agent?.calls || 0));
    }
  }

  return Array.from(byAgent.values())
    .map((row) => {
      const denom = Math.max(1, Number(row.snapshots || 0));
      return {
        user: row.user,
        name: row.name,
        campaign: row.campaign || "UNASSIGNED",
        snapshots: Number(row.snapshots || 0),
        inCallRatio: row.inCall / denom,
        waitingRatio: row.waiting / denom,
        pausedRatio: row.paused / denom,
        purpleRatio: row.purple / denom,
        callsMax: Number(row.callsMax || 0),
      };
    })
    .sort((a, b) => a.user.localeCompare(b.user));
}

async function getAgentStateTransitions({ shiftDate, limit = 80 }) {
  const snapshots = await getRawSnapshotsForShift({
    shiftDate,
    limit,
    order: "asc",
  });
  const transitions = new Map();
  const stuckPurple = new Map();

  for (let i = 1; i < snapshots.length; i++) {
    const prevAgents = Array.isArray(snapshots[i - 1]?.snapshot?.agents)
      ? snapshots[i - 1].snapshot.agents
      : [];
    const nextAgents = Array.isArray(snapshots[i]?.snapshot?.agents)
      ? snapshots[i].snapshot.agents
      : [];

    const prevByUser = new Map(
      prevAgents
        .map((a) => [String(a?.user || "").trim(), a])
        .filter(([user]) => !!user),
    );

    for (const agent of nextAgents) {
      const user = String(agent?.user || "").trim();
      if (!user) continue;

      const prev = prevByUser.get(user);
      if (!prev) continue;

      const from = String(prev?.stateBucket || "unknown");
      const to = String(agent?.stateBucket || "unknown");
      const key = `${from}->${to}`;

      if (!transitions.has(key)) {
        transitions.set(key, { from, to, count: 0 });
      }
      transitions.get(key).count += 1;

      if (to === "oncall_gt_5m") {
        if (!stuckPurple.has(user)) {
          stuckPurple.set(user, {
            user,
            name: String(agent?.name || "").trim(),
            campaign: String(agent?.campaign || "").trim(),
            occurrences: 0,
          });
        }
        stuckPurple.get(user).occurrences += 1;
      }
    }
  }

  return {
    transitions: Array.from(transitions.values()).sort(
      (a, b) => b.count - a.count,
    ),
    stuckPurple: Array.from(stuckPurple.values()).sort(
      (a, b) => b.occurrences - a.occurrences,
    ),
  };
}

async function getShiftComparisons({ shiftDate, lookbackDays = 30 }) {
  await initDb();
  const db = getDb();
  const currentDate = normalizeShiftDate(shiftDate);
  const lim = clampLimit(lookbackDays, 30, 180);

  const stmt = db.prepare(
    `SELECT shift_date,
            COUNT(*) AS hours_with_data,
            AVG(active_calls_avg) AS active_calls_avg_mean,
            MAX(active_calls_max) AS active_calls_peak,
            AVG(calls_waiting_avg) AS calls_waiting_avg_mean,
            MAX(calls_waiting_max) AS calls_waiting_peak,
            AVG(dropped_percent_avg) AS dropped_percent_avg_mean,
            MAX(dropped_percent_max) AS dropped_percent_peak
     FROM callflow_hourly
     WHERE shift_date <= ?
     GROUP BY shift_date
     ORDER BY shift_date DESC
     LIMIT ?`,
  );
  stmt.bind([currentDate, lim + 1]);

  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  const current =
    rows.find((r) => String(r.shift_date) === currentDate) || null;
  const history = rows.filter((r) => String(r.shift_date) !== currentDate);

  return {
    current,
    history,
  };
}

module.exports = {
  getLatestRawSnapshotForShift,
  getRawSnapshotsForShift,
  getCallflowHourlyRange,
  getCallflowHourlyForDates,
  getRecentCallflowSnapshots,
  listShiftDates,
  getShiftDatesInRange,
  getCampaignSnapshotStats,
  getAgentSnapshotStats,
  getAgentStateTransitions,
  getShiftComparisons,
};

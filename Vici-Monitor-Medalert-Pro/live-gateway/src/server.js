const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const {
  storeSnapshot,
  getShiftSummary,
  getPeakHour,
  computeShiftDate,
  getCallflowHourly,
  getCallflowPeakHour,
  listTables,
  getTableInfo,
  queryTable,
  prepareClear,
  confirmClear,
  getSettings,
  upsertSetting
} = require('./db');
require('dotenv').config();

const PORT = Number(process.env.PORT || 3100);
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  // Fail fast: auth is part of the Pro contract.
  throw new Error('JWT_SECRET is required. Set it in live-gateway/.env');
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

function parseHm(hm) {
  const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, m: mi };
}

function ymdAddDays(ymd, days) {
  const dt = new Date(`${ymd}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

function buildShiftHours(shift) {
  const start = parseHm(shift?.start) || { h: 19, m: 0 };
  const end = parseHm(shift?.end) || { h: 4, m: 30 };
  const hours = [];
  let h = start.h;
  for (let i = 0; i < 24; i++) {
    hours.push(h);
    if (h === end.h) break;
    h = (h + 1) % 24;
  }
  return { start, end, hours };
}

function sumCountsForHours(hoursObj, hourList) {
  const totals = {};
  for (const h of hourList) {
    const row = hoursObj?.[h] || {};
    for (const [bucket, v] of Object.entries(row)) {
      totals[bucket] = (totals[bucket] || 0) + Number(v || 0);
    }
  }
  return totals;
}

function totalAgents(counts) {
  return Object.values(counts || {}).reduce((a, b) => a + Number(b || 0), 0);
}

function sumCallflowRows(rows, hourList) {
  const set = new Set((hourList || []).map((h) => Number(h)));
  const picked = (rows || []).filter((r) => set.has(Number(r.hour)));
  if (!picked.length) {
    return {
      hours: hourList || [],
      samples: 0,
      active_calls_avg: 0,
      active_calls_max: 0,
      calls_waiting_avg: 0,
      calls_waiting_max: 0,
      calls_in_ivr_avg: 0,
      calls_in_ivr_max: 0,
      ringing_calls_avg: 0,
      ringing_calls_max: 0
    };
  }

  // Combine avgs weighted by sample counts, and max by max.
  let totalSamples = 0;
  const acc = {
    active_calls_avg: 0,
    calls_waiting_avg: 0,
    calls_in_ivr_avg: 0,
    ringing_calls_avg: 0,
    active_calls_max: 0,
    calls_waiting_max: 0,
    calls_in_ivr_max: 0,
    ringing_calls_max: 0
  };

  for (const r of picked) {
    const s = Number(r.samples || 0);
    if (s > 0) {
      totalSamples += s;
      acc.active_calls_avg += Number(r.active_calls_avg || 0) * s;
      acc.calls_waiting_avg += Number(r.calls_waiting_avg || 0) * s;
      acc.calls_in_ivr_avg += Number(r.calls_in_ivr_avg || 0) * s;
      acc.ringing_calls_avg += Number(r.ringing_calls_avg || 0) * s;
    }
    acc.active_calls_max = Math.max(acc.active_calls_max, Number(r.active_calls_max || 0));
    acc.calls_waiting_max = Math.max(acc.calls_waiting_max, Number(r.calls_waiting_max || 0));
    acc.calls_in_ivr_max = Math.max(acc.calls_in_ivr_max, Number(r.calls_in_ivr_max || 0));
    acc.ringing_calls_max = Math.max(acc.ringing_calls_max, Number(r.ringing_calls_max || 0));
  }

  return {
    hours: hourList || [],
    samples: totalSamples,
    active_calls_avg: totalSamples ? acc.active_calls_avg / totalSamples : 0,
    active_calls_max: acc.active_calls_max,
    calls_waiting_avg: totalSamples ? acc.calls_waiting_avg / totalSamples : 0,
    calls_waiting_max: acc.calls_waiting_max,
    calls_in_ivr_avg: totalSamples ? acc.calls_in_ivr_avg / totalSamples : 0,
    calls_in_ivr_max: acc.calls_in_ivr_max,
    ringing_calls_avg: totalSamples ? acc.ringing_calls_avg / totalSamples : 0,
    ringing_calls_max: acc.ringing_calls_max
  };
}

function signToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
}

function verifyBearerToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res) {
  const user = verifyBearerToken(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'unauthorized' });
    return null;
  }
  return user;
}

// --- REST ---

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'live-gateway', time: new Date().toISOString() });
});

// Login-only auth (Phase 1). Later: DB-backed users + roles.
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, error: 'username and password required' });
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: 'invalid credentials' });

  const user = { username, role: 'admin' };
  const token = signToken(user);
  res.json({ success: true, token, user });
});

app.get('/api/auth/me', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json({ success: true, user });
});

// Extension publishes snapshots over HTTP (Phase 1).
// Gateways/dashboards can also consume via WS.
app.post('/api/live/snapshot', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const snapshot = req.body?.snapshot;
  if (!snapshot) return res.status(400).json({ success: false, error: 'missing_snapshot' });

  latestSnapshot = snapshot;
  try {
    await storeSnapshot(snapshot);
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || 'db_write_failed' });
  }

  for (const client of wss.clients) {
    if (client.isSubscribed) safeSend(client, { type: 'snapshot', snapshot: latestSnapshot });
  }

  res.json({ success: true });
});

// --- Shift analytics ---

app.get('/api/shift/summary', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const date = req.query.date || (await computeShiftDate(new Date().toISOString()));
  const hours = await getShiftSummary(date);
  const peak = await getPeakHour(date);

  res.json({
    success: true,
    shiftDate: date,
    peakHour: peak,
    hours
  });
});

app.get('/api/shift/intelligence', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const date = req.query.date || (await computeShiftDate(new Date().toISOString()));
  const settings = await getSettings();
  const shift = settings.shift || {};
  const { hours: shiftHours, start, end } = buildShiftHours(shift);

  const series = await getShiftSummary(date);
  const peak = await getPeakHour(date);

  const firstHourHours = shiftHours.slice(0, 1);
  const halfHours = shiftHours.slice(0, Math.max(1, Math.ceil(shiftHours.length / 2)));

  const fullTotals = sumCountsForHours(series, shiftHours);
  const firstHourTotals = sumCountsForHours(series, firstHourHours);
  const halfTotals = sumCountsForHours(series, halfHours);

  const prevDate = ymdAddDays(date, -1);
  const prevSeries = await getShiftSummary(prevDate);
  const prevFullTotals = sumCountsForHours(prevSeries, shiftHours);

  res.json({
    success: true,
    shiftDate: date,
    shiftWindow: {
      start: `${String(start.h).padStart(2, '0')}:${String(start.m).padStart(2, '0')}`,
      end: `${String(end.h).padStart(2, '0')}:${String(end.m).padStart(2, '0')}`
    },
    shiftHours,
    peakHour: peak,
    rollups: {
      firstHour: { hours: firstHourHours, totals: firstHourTotals, totalAgents: totalAgents(firstHourTotals) },
      halfShift: { hours: halfHours, totals: halfTotals, totalAgents: totalAgents(halfTotals) },
      fullShift: { hours: shiftHours, totals: fullTotals, totalAgents: totalAgents(fullTotals) }
    },
    compare: {
      previousShiftDate: prevDate,
      fullShift: { totals: prevFullTotals, totalAgents: totalAgents(prevFullTotals) }
    },
    series
  });
});

app.get('/api/shift/callflow', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const date = req.query.date || (await computeShiftDate(new Date().toISOString()));
  const settings = await getSettings();
  const shift = settings.shift || {};
  const { hours: shiftHours, start, end } = buildShiftHours(shift);

  const rows = await getCallflowHourly(date);
  const peakWaiting = await getCallflowPeakHour(date);

  const firstHourHours = shiftHours.slice(0, 1);
  const halfHours = shiftHours.slice(0, Math.max(1, Math.ceil(shiftHours.length / 2)));
  const restHours = shiftHours.slice(firstHourHours.length);

  const full = sumCallflowRows(rows, shiftHours);
  const firstHour = sumCallflowRows(rows, firstHourHours);
  const halfShift = sumCallflowRows(rows, halfHours);
  const rest = sumCallflowRows(rows, restHours);

  const prevDate = ymdAddDays(date, -1);
  const prevRows = await getCallflowHourly(prevDate);
  const prevFull = sumCallflowRows(prevRows, shiftHours);

  res.json({
    success: true,
    shiftDate: date,
    shiftWindow: {
      start: `${String(start.h).padStart(2, '0')}:${String(start.m).padStart(2, '0')}`,
      end: `${String(end.h).padStart(2, '0')}:${String(end.m).padStart(2, '0')}`
    },
    shiftHours,
    peak: { waiting: peakWaiting },
    rollups: { firstHour, halfShift, restOfShift: rest, fullShift: full },
    compare: { previousShiftDate: prevDate, fullShift: prevFull },
    series: rows
  });
});

// --- Admin / Settings (auth required) ---

app.get('/api/admin/settings', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const settings = await getSettings();
  res.json({ success: true, settings });
});

app.put('/api/admin/settings', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const patch = req.body?.settings;
  if (!patch || typeof patch !== 'object') return res.status(400).json({ success: false, error: 'missing_settings' });

  const okShift = Object.prototype.hasOwnProperty.call(patch, 'shift')
    ? await upsertSetting('shift', patch.shift)
    : true;
  const okRetention = Object.prototype.hasOwnProperty.call(patch, 'retention')
    ? await upsertSetting('retention', patch.retention)
    : true;

  if (!okShift || !okRetention) return res.status(400).json({ success: false, error: 'invalid_setting_key' });
  const settings = await getSettings();
  res.json({ success: true, settings });
});

// --- Admin / DB Explorer (auth required) ---

app.get('/api/admin/db/tables', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const tables = await listTables();
  res.json({ success: true, tables });
});

app.get('/api/admin/db/table/:name/info', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const info = await getTableInfo(req.params.name);
  if (!info) return res.status(404).json({ success: false, error: 'table_not_found' });
  res.json({ success: true, info });
});

app.get('/api/admin/db/table/:name/rows', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { limit, offset, column, op, value } = req.query || {};
  const filter = column && op ? { column, op, value } : null;
  const result = await queryTable({ tableName: req.params.name, limit, offset, filter });
  if (!result) return res.status(404).json({ success: false, error: 'table_not_found' });
  res.json({ success: true, ...result });
});

app.post('/api/admin/db/clear/prepare', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const prep = await prepareClear();
  res.json({ success: true, ...prep });
});

app.post('/api/admin/db/clear/confirm', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { nonce, phrase } = req.body || {};
  const result = await confirmClear({ nonce, phrase });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- WS ---

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/**
 * Very small in-memory “latest snapshot” cache.
 * - dashboards can request `{"type":"subscribe","token":"..."}` then receive updates
 * - extensions/gateways can send `{"type":"publish","token":"...","snapshot":{...}}`
 */
let latestSnapshot = null;

function isAuthedMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const token = typeof msg.token === 'string' ? msg.token : '';
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function safeSend(ws, obj) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  ws.isSubscribed = false;

  safeSend(ws, { type: 'hello', time: new Date().toISOString() });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch {
      return safeSend(ws, { type: 'error', error: 'invalid_json' });
    }

    const user = isAuthedMessage(msg);
    if (!user) return safeSend(ws, { type: 'error', error: 'unauthorized' });

    if (msg.type === 'subscribe') {
      ws.isSubscribed = true;
      safeSend(ws, { type: 'subscribed', user, hasLatest: !!latestSnapshot });
      if (latestSnapshot) safeSend(ws, { type: 'snapshot', snapshot: latestSnapshot });
      return;
    }

    if (msg.type === 'publish') {
      if (!msg.snapshot) return safeSend(ws, { type: 'error', error: 'missing_snapshot' });
      latestSnapshot = msg.snapshot;

      // Broadcast to all subscribed clients.
      for (const client of wss.clients) {
        if (client.isSubscribed) safeSend(client, { type: 'snapshot', snapshot: latestSnapshot });
      }

      return safeSend(ws, { type: 'published', ok: true });
    }

    return safeSend(ws, { type: 'error', error: 'unknown_type' });
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Live Gateway listening on http://localhost:${PORT} (ws path: /ws)`);
});


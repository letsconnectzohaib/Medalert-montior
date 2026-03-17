const { initDb, getDb, persist } = require('./core');

function clampLimit(x, def = 100, max = 500) {
  const n = Number(x);
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(max, Math.trunc(n)));
}

async function createAlert({ ts, shiftDate, type, severity = 'warn', title, details }) {
  await initDb();
  const db = getDb();
  const iso = ts || new Date().toISOString();
  const sd = String(shiftDate || '').slice(0, 10);
  const t = String(type || '').trim();
  const sev = ['info', 'warn', 'bad'].includes(String(severity)) ? String(severity) : 'warn';
  const ttl = String(title || '').trim() || t || 'alert';
  const detailsJson = JSON.stringify(details || {});

  db.run(
    `INSERT INTO alerts (ts, shift_date, type, severity, title, details_json, status)
     VALUES (?, ?, ?, ?, ?, ?, 'open')`,
    [iso, sd, t, sev, ttl, detailsJson]
  );
  persist();

  const stmt = db.prepare('SELECT last_insert_rowid() AS id;');
  let id = null;
  if (stmt.step()) id = Number(stmt.getAsObject().id);
  stmt.free();
  return { id, ts: iso, shift_date: sd, type: t, severity: sev, title: ttl, status: 'open', details: details || {} };
}

async function listAlerts({ shiftDate = null, status = null, severity = null, limit = 100 } = {}) {
  await initDb();
  const db = getDb();
  const lim = clampLimit(limit, 100, 500);

  const bind = [];
  let where = 'WHERE 1=1';
  if (shiftDate) {
    where += ' AND shift_date = ?';
    bind.push(String(shiftDate).slice(0, 10));
  }
  if (status) {
    where += ' AND status = ?';
    bind.push(String(status));
  }
  if (severity) {
    where += ' AND severity = ?';
    bind.push(String(severity));
  }
  bind.push(lim);

  const stmt = db.prepare(
    `SELECT id, ts, shift_date, type, severity, title, details_json, status, acked_at, resolved_at
     FROM alerts
     ${where}
     ORDER BY ts DESC
     LIMIT ?`
  );
  stmt.bind(bind);
  const rows = [];
  while (stmt.step()) {
    const r = stmt.getAsObject();
    let details = {};
    try {
      details = JSON.parse(r.details_json);
    } catch {}
    rows.push({
      id: Number(r.id),
      ts: r.ts,
      shift_date: r.shift_date,
      type: r.type,
      severity: r.severity,
      title: r.title,
      details,
      status: r.status,
      acked_at: r.acked_at || null,
      resolved_at: r.resolved_at || null
    });
  }
  stmt.free();
  return rows;
}

async function updateAlertStatus({ id, action }) {
  await initDb();
  const db = getDb();
  const aid = Number(id);
  if (!Number.isFinite(aid)) return { success: false, error: 'invalid_id' };
  const now = new Date().toISOString();
  const act = String(action || '').toLowerCase();

  if (act === 'ack') {
    db.run(`UPDATE alerts SET status='acked', acked_at=? WHERE id=? AND status='open'`, [now, aid]);
  } else if (act === 'resolve') {
    db.run(`UPDATE alerts SET status='resolved', resolved_at=? WHERE id=? AND status!='resolved'`, [now, aid]);
  } else if (act === 'reopen') {
    db.run(`UPDATE alerts SET status='open' WHERE id=?`, [aid]);
  } else {
    return { success: false, error: 'invalid_action' };
  }

  persist();
  return { success: true };
}

module.exports = {
  createAlert,
  listAlerts,
  updateAlertStatus
};


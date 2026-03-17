const { initDb, getDb, persist } = require('./core');

async function upsertSetting(key, value) {
  await initDb();
  const db = getDb();
  const k = String(key || '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) return false;
  db.run(`UPDATE app_settings SET value_json = ? WHERE key = ?`, [JSON.stringify(value), k]);
  if (db.getRowsModified() === 0) {
    db.run(`INSERT INTO app_settings (key, value_json) VALUES (?, ?)`, [k, JSON.stringify(value)]);
  }
  persist();
  return true;
}

async function getSettings() {
  await initDb();
  const db = getDb();
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
    out.retention = { rawSnapshotsDays: 14, bucketsDays: 60, alertsDays: 30 };
    await upsertSetting('retention', out.retention);
  }
  if (!out.alerts) {
    out.alerts = {
      // detection thresholds
      waitingSpikeMax: 25,
      waitingSpikeSustainSeconds: 120,
      waitingSpikeCooldownSeconds: 600,

      purpleOverloadMin: 8,
      purpleOverloadSustainSeconds: 180,
      purpleOverloadCooldownSeconds: 900,

      dropPercentJumpPoints: 2.5,
      dropPercentMin: 3,
      dropPercentCooldownSeconds: 900,

      // proactive staffing (Phase 1)
      staffingGapMin: 5,
      staffingSustainSeconds: 120,
      staffingCooldownSeconds: 900,

      // notifications (dashboard consumes these)
      notifyToast: true,
      notifySound: false
    };
    await upsertSetting('alerts', out.alerts);
  }
  if (!out.notifications) {
    out.notifications = {
      slack: {
        username: 'Vici Monitor Pro',
        cooldownSeconds: 300
        // routing per severity (each route can override webhook/channel)
        // global webhook/channel can be used as fallback for routes.
        ,
        enabled: false,
        webhookUrl: '',
        channel: '',
        routes: {
          info: { enabled: false, webhookUrl: '', channel: '' },
          warn: { enabled: true, webhookUrl: '', channel: '' },
          bad: { enabled: true, webhookUrl: '', channel: '' }
        }
      }
    };
    await upsertSetting('notifications', out.notifications);
  } else {
    // Backward-compat: migrate older slack config (minSeverity/channel/webhook) into routes.
    const s = out.notifications?.slack;
    if (s && !s.routes) {
      const min = String(s.minSeverity || 'bad');
      const enableFromMin = (sev) => {
        const rank = (x) => (x === 'bad' ? 3 : x === 'warn' ? 2 : x === 'info' ? 1 : 0);
        return rank(sev) >= rank(min);
      };
      s.routes = {
        info: { enabled: enableFromMin('info'), webhookUrl: '', channel: '' },
        warn: { enabled: enableFromMin('warn'), webhookUrl: '', channel: '' },
        bad: { enabled: enableFromMin('bad'), webhookUrl: '', channel: '' }
      };
      delete s.minSeverity;
      out.notifications.slack = s;
      await upsertSetting('notifications', out.notifications);
    }
  }
  return out;
}

module.exports = {
  getSettings,
  upsertSetting
};


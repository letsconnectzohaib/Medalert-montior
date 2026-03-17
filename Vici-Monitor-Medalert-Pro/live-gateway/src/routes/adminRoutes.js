const express = require('express');

function createAdminRoutes({
  requireAuth,
  getSettings,
  upsertSetting,
  listTables,
  getTableInfo,
  queryTable,
  prepareClear,
  confirmClear
}) {
  const router = express.Router();

  router.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
  });

  router.get('/api/admin/settings', requireAuth, async (_req, res) => {
    const settings = await getSettings();
    res.json({ success: true, settings });
  });

  router.put('/api/admin/settings', requireAuth, async (req, res) => {
    const patch = req.body?.settings;
    if (!patch || typeof patch !== 'object') return res.status(400).json({ success: false, error: 'missing_settings' });

    const okShift = Object.prototype.hasOwnProperty.call(patch, 'shift')
      ? await upsertSetting('shift', patch.shift)
      : true;
    const okRetention = Object.prototype.hasOwnProperty.call(patch, 'retention')
      ? await upsertSetting('retention', patch.retention)
      : true;
    const okAlerts = Object.prototype.hasOwnProperty.call(patch, 'alerts')
      ? await upsertSetting('alerts', patch.alerts)
      : true;

    if (!okShift || !okRetention || !okAlerts) return res.status(400).json({ success: false, error: 'invalid_setting_key' });
    const settings = await getSettings();
    res.json({ success: true, settings });
  });

  router.get('/api/admin/db/tables', requireAuth, async (_req, res) => {
    const tables = await listTables();
    res.json({ success: true, tables });
  });

  router.get('/api/admin/db/table/:name/info', requireAuth, async (req, res) => {
    const info = await getTableInfo(req.params.name);
    if (!info) return res.status(404).json({ success: false, error: 'table_not_found' });
    res.json({ success: true, info });
  });

  router.get('/api/admin/db/table/:name/rows', requireAuth, async (req, res) => {
    const { limit, offset, column, op, value } = req.query || {};
    const filter = column && op ? { column, op, value } : null;
    const result = await queryTable({ tableName: req.params.name, limit, offset, filter });
    if (!result) return res.status(404).json({ success: false, error: 'table_not_found' });
    res.json({ success: true, ...result });
  });

  router.post('/api/admin/db/clear/prepare', requireAuth, async (_req, res) => {
    const prep = await prepareClear();
    res.json({ success: true, ...prep });
  });

  router.post('/api/admin/db/clear/confirm', requireAuth, async (req, res) => {
    const { nonce, phrase } = req.body || {};
    const result = await confirmClear({ nonce, phrase });
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  });

  return router;
}

module.exports = { createAdminRoutes };


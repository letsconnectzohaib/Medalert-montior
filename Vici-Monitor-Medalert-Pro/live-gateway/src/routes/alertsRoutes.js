const express = require('express');

function createAlertsRoutes({ requireAuth, listAlerts, updateAlertStatus }) {
  const router = express.Router();

  router.get('/api/alerts', requireAuth, async (req, res) => {
    const { shiftDate, status, severity, limit } = req.query || {};
    const rows = await listAlerts({
      shiftDate: shiftDate ? String(shiftDate) : null,
      status: status ? String(status) : null,
      severity: severity ? String(severity) : null,
      limit: limit ? Number(limit) : 100
    });
    res.json({ success: true, alerts: rows });
  });

  router.post('/api/alerts/:id/action', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const action = req.body?.action;
    const r = await updateAlertStatus({ id, action });
    if (!r.success) return res.status(400).json(r);
    res.json(r);
  });

  return router;
}

module.exports = { createAlertsRoutes };


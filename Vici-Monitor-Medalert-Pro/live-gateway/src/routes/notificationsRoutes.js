const express = require('express');
const { sendSlackTest } = require('../notify/slack');

function createNotificationsRoutes({ requireAuth, getSettings }) {
  const router = express.Router();

  router.post('/api/admin/notifications/slack/test', requireAuth, async (req, res) => {
    const settings = await getSettings();
    const message = req.body?.message;
    const severity = req.body?.severity;
    const r = await sendSlackTest({ settings, severity, message });
    if (!r.success) return res.status(400).json(r);
    res.json({ success: true });
  });

  return router;
}

module.exports = { createNotificationsRoutes };


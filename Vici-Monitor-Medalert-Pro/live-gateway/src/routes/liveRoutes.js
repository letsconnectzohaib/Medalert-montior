const express = require('express');

function createLiveRoutes({ requireAuth, storeSnapshot, onSnapshot, onAlerts }) {
  const router = express.Router();

  router.post('/api/live/snapshot', requireAuth, async (req, res) => {
    const snapshot = req.body?.snapshot;
    if (!snapshot) return res.status(400).json({ success: false, error: 'missing_snapshot' });

    try {
      const result = await storeSnapshot(snapshot);
      const created = result?.alertsCreated || [];
      if (created.length) {
        try {
          onAlerts?.(created);
        } catch {}
      }
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'db_write_failed' });
    }

    try {
      onSnapshot(snapshot);
    } catch {
      // ignore broadcast errors
    }

    res.json({ success: true });
  });

  return router;
}

module.exports = { createLiveRoutes };


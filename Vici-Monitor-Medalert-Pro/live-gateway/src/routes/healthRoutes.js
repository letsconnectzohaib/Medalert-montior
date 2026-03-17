const express = require('express');

function createHealthRoutes() {
  const router = express.Router();

  router.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'live-gateway', time: new Date().toISOString() });
  });

  return router;
}

module.exports = { createHealthRoutes };


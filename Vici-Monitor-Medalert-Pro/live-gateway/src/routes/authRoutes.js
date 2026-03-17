const express = require('express');
const { signToken } = require('../middleware/auth');

function createAuthRoutes({ adminUsername, adminPassword, jwtSecret }) {
  const router = express.Router();

  router.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ success: false, error: 'username and password required' });
    if (username !== adminUsername || password !== adminPassword) return res.status(401).json({ success: false, error: 'invalid credentials' });

    const user = { username, role: 'admin' };
    const token = signToken(user, jwtSecret);
    res.json({ success: true, token, user });
  });

  return router;
}

module.exports = { createAuthRoutes };


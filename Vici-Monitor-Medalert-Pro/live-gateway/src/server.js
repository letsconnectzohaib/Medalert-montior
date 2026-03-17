const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
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
  const user = verifyBearerToken(req);
  if (!user) return res.status(401).json({ success: false });
  res.json({ success: true, user });
});

// Extension publishes snapshots over HTTP (Phase 1).
// Gateways/dashboards can also consume via WS.
app.post('/api/live/snapshot', (req, res) => {
  const user = verifyBearerToken(req);
  if (!user) return res.status(401).json({ success: false });
  const snapshot = req.body?.snapshot;
  if (!snapshot) return res.status(400).json({ success: false, error: 'missing_snapshot' });

  latestSnapshot = snapshot;

  for (const client of wss.clients) {
    if (client.isSubscribed) safeSend(client, { type: 'snapshot', snapshot: latestSnapshot });
  }

  res.json({ success: true });
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


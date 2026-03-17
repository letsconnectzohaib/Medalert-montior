const $ = (id) => document.getElementById(id);

let state = {
  gatewayUrl: 'http://localhost:3100',
  token: null,
  ws: null,
  history: []
};

const BUCKET_LABELS = [
  ['chatting', 'Chatting (red)'],
  ['email', 'Email (orange)'],
  ['waiting_lt_1m', 'Waiting < 1m (lightblue)'],
  ['waiting_gt_1m', 'Waiting > 1m (blue)'],
  ['waiting_gt_5m', 'Waiting > 5m (midnightblue)'],
  ['oncall_gt_10s', 'On call > 10s (thistle)'],
  ['oncall_gt_1m', 'On call > 1m (violet)'],
  ['oncall_gt_5m', 'On call > 5m (purple)'],
  ['paused_gt_10s', 'Paused > 10s (khaki)'],
  ['paused_gt_1m', 'Paused > 1m (yellow)'],
  ['paused_gt_5m', 'Paused > 5m (olive)'],
  ['threeway_gt_10s', '3-WAY > 10s (lime)'],
  ['deadcall', 'Dead call (black)'],
  ['unknown', 'Unknown']
];

function setBadge(id, kind, text) {
  const el = $(id);
  el.classList.remove('good', 'warn', 'bad');
  el.classList.add(kind);
  el.textContent = text;
}

function baseUrl() {
  return String(state.gatewayUrl || '').replace(/\/$/, '');
}

async function pingGateway() {
  try {
    const res = await fetch(`${baseUrl()}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function login(username, password) {
  const res = await fetch(`${baseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    return { success: false, error: json?.error || `HTTP ${res.status}` };
  }
  return { success: true, token: json.token, user: json.user };
}

function wsUrl() {
  const u = new URL(baseUrl());
  const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${u.host}/ws`;
}

function connectWs() {
  if (!state.token) return;
  if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;

  const ws = new WebSocket(wsUrl());
  state.ws = ws;

  setBadge('ws', 'warn', 'WS: connecting…');

  ws.onopen = () => {
    setBadge('ws', 'good', 'WS: connected');
    ws.send(JSON.stringify({ type: 'subscribe', token: state.token }));
  };

  ws.onmessage = (evt) => {
    let msg = null;
    try {
      msg = JSON.parse(evt.data);
    } catch {
      return;
    }

    if (msg.type === 'snapshot' && msg.snapshot) {
      renderSnapshot(msg.snapshot);
    }
  };

  ws.onclose = () => {
    setBadge('ws', 'bad', 'WS: disconnected');
    // simple reconnect loop
    setTimeout(connectWs, 1500);
  };

  ws.onerror = () => {
    setBadge('ws', 'bad', 'WS: error');
  };
}

function renderBuckets(counts) {
  const wrap = $('buckets');
  wrap.innerHTML = '';
  for (const [bucket, label] of BUCKET_LABELS) {
    const val = counts[bucket] || 0;
    const el = document.createElement('div');
    el.className = 'bucket';
    el.innerHTML = `<div class="k">${label}</div><div class="v">${val}</div>`;
    wrap.appendChild(el);
  }
}

function renderSnapshot(snapshot) {
  const s = snapshot?.summary || {};
  $('m_activeCalls').textContent = s.activeCalls ?? 0;
  $('m_callsWaiting').textContent = s.callsWaiting ?? 0;
  $('m_agentsLoggedIn').textContent = s.agentsLoggedIn ?? 0;
  $('m_agentsInCalls').textContent = s.agentsInCalls ?? 0;

  const counts = {};
  const agents = Array.isArray(snapshot?.agents) ? snapshot.agents : [];
  for (const a of agents) {
    const b = a?.stateBucket || 'unknown';
    counts[b] = (counts[b] || 0) + 1;
  }
  renderBuckets(counts);

  const ts = snapshot?.timestamp || new Date().toISOString();
  setBadge('snap', 'good', `Last snapshot: ${ts}`);

  state.history.push({
    ts,
    activeCalls: s.activeCalls ?? 0,
    callsWaiting: s.callsWaiting ?? 0,
    agents: agents.length,
    purple: counts.oncall_gt_5m || 0,
    violet: counts.oncall_gt_1m || 0,
    thistle: counts.oncall_gt_10s || 0,
    blue: counts.waiting_gt_1m || 0
  });
  if (state.history.length > 60) state.history.shift();

  $('history').textContent = state.history
    .map((h) => `${h.ts} | active=${h.activeCalls} waiting=${h.callsWaiting} agents=${h.agents} purple=${h.purple} violet=${h.violet} thistle=${h.thistle} blue=${h.blue}`)
    .join('\n');
}

async function refreshGatewayBadge() {
  const ok = await pingGateway();
  setBadge('gw', ok ? 'good' : 'bad', `Gateway: ${ok ? 'online' : 'offline'}`);
}

async function onLogin() {
  $('loginMsg').textContent = '';
  state.gatewayUrl = $('gatewayUrl').value.trim();

  const username = $('username').value.trim();
  const password = $('password').value;
  if (!username || !password) {
    $('loginMsg').textContent = 'Enter username and password.';
    return;
  }

  await refreshGatewayBadge();
  const res = await login(username, password);
  if (!res.success) {
    $('loginMsg').textContent = res.error || 'Login failed.';
    return;
  }

  state.token = res.token;
  $('loginMsg').textContent = `Signed in as ${res.user?.username || 'user'}.`;
  $('logoutBtn').disabled = false;
  $('loginBtn').disabled = true;
  connectWs();
}

function onLogout() {
  state.token = null;
  try {
    state.ws?.close();
  } catch {}
  state.ws = null;

  setBadge('ws', 'warn', 'WS: disconnected');
  $('logoutBtn').disabled = true;
  $('loginBtn').disabled = false;
  $('loginMsg').textContent = 'Signed out.';
}

$('loginBtn').addEventListener('click', onLogin);
$('logoutBtn').addEventListener('click', onLogout);

refreshGatewayBadge();


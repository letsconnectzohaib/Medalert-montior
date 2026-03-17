export function normalizeBaseUrl(url) {
  const s = String(url || '').trim();
  return s ? s.replace(/\/$/, '') : 'http://localhost:3100';
}

export async function pingGateway(baseUrl) {
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(baseUrl, username, password) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, token: json.token, user: json.user };
}

export function wsUrl(baseUrl) {
  const u = new URL(normalizeBaseUrl(baseUrl));
  const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${u.host}/ws`;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAdminSettings(baseUrl, token) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/admin/settings`, {
    headers: { ...authHeaders(token) }
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, settings: json.settings };
}

export async function updateAdminSettings(baseUrl, token, settingsPatch) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ settings: settingsPatch })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, settings: json.settings };
}

export async function fetchShiftIntelligence(baseUrl, token, date) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/shift/intelligence?date=${encodeURIComponent(date)}`, {
    headers: { ...authHeaders(token) }
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, data: json };
}

export async function fetchShiftCallflow(baseUrl, token, date) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/shift/callflow?date=${encodeURIComponent(date)}`, {
    headers: { ...authHeaders(token) }
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, data: json };
}

export async function testSlack(baseUrl, token, { severity, message }) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/admin/notifications/slack/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ severity, message })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true };
}


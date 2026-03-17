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


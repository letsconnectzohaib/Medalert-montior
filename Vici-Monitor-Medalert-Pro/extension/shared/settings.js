const DEFAULTS = {
  gatewayBaseUrl: 'http://localhost:3100',
  auth: null,
  scrape: {
    // Primary mode: emit snapshot when DOM changes (page refresh rate drives it, e.g. 4s).
    mode: 'onChange', // 'onChange' | 'poll'
    throttleMs: 1500,
    pollMs: 60000
  },
  runtime: {
    scraperState: 'Not started',
    lastSnapshotAt: null,
    lastError: null
  }
};

export async function getSettings() {
  const data = await chrome.storage.local.get(['gatewayBaseUrl', 'auth', 'scrape', 'runtime']);
  return {
    gatewayBaseUrl: data.gatewayBaseUrl || DEFAULTS.gatewayBaseUrl,
    auth: data.auth || DEFAULTS.auth,
    scrape: { ...DEFAULTS.scrape, ...(data.scrape || {}) },
    runtime: data.runtime || DEFAULTS.runtime
  };
}

export async function setSettings(partial) {
  const current = await getSettings();
  const next = {
    ...current,
    ...partial,
    scrape: { ...(current.scrape || {}), ...(partial.scrape || {}) },
    runtime: { ...(current.runtime || {}), ...(partial.runtime || {}) }
  };
  await chrome.storage.local.set(next);
  return next;
}

export async function clearAuth() {
  await chrome.storage.local.set({ auth: null });
}

export async function pingGateway(baseUrl) {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function authLogin(baseUrl, username, password) {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { success: false, error: json?.error || `HTTP ${res.status}` };
    if (!json?.success) return { success: false, error: json?.error || 'Login failed' };
    return { success: true, token: json.token, user: json.user };
  } catch (e) {
    return { success: false, error: e?.message || 'Network error' };
  }
}


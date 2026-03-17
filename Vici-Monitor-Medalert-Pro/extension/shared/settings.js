const DEFAULTS = {
  gatewayBaseUrl: 'http://localhost:3100',
  auth: null,
  target: {
    // One or more exact Vicidial realtime report URLs to target.
    // Background tab discovery uses these to find tabs to scrape.
    reportPageUrls: ['https://axcl2s.dialerhosting.com/Xcl2s6wgd/realtime_report.php']
  },
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
  const data = await chrome.storage.local.get(['gatewayBaseUrl', 'auth', 'target', 'scrape', 'runtime']);
  const rawTarget = data.target || {};

  // Back-compat migration: older builds stored a single `reportPageUrl`.
  const migratedUrls = Array.isArray(rawTarget.reportPageUrls) ? rawTarget.reportPageUrls : [];
  if (!migratedUrls.length && typeof rawTarget.reportPageUrl === 'string' && rawTarget.reportPageUrl.trim()) {
    migratedUrls.push(rawTarget.reportPageUrl.trim());
  }

  const settings = {
    gatewayBaseUrl: data.gatewayBaseUrl || DEFAULTS.gatewayBaseUrl,
    auth: data.auth || DEFAULTS.auth,
    target: { ...DEFAULTS.target, ...(data.target || {}), reportPageUrls: migratedUrls.length ? migratedUrls : DEFAULTS.target.reportPageUrls },
    scrape: { ...DEFAULTS.scrape, ...(data.scrape || {}) },
    runtime: data.runtime || DEFAULTS.runtime
  };

  // Persist migration if needed.
  if (typeof rawTarget.reportPageUrl === 'string') {
    const cleaned = { ...(data.target || {}) };
    delete cleaned.reportPageUrl;
    cleaned.reportPageUrls = settings.target.reportPageUrls;
    await chrome.storage.local.set({ target: cleaned });
  }

  return settings;
}

export async function setSettings(partial) {
  const current = await getSettings();
  // Prevent accidental sign-out: auth can only be cleared via clearAuth().
  // Some background/runtime updates call setSettings frequently; we never want those
  // to wipe auth due to a bad merge or missing fields.
  const partialSafe = { ...partial };
  if (Object.prototype.hasOwnProperty.call(partialSafe, 'auth') && partialSafe.auth == null) {
    delete partialSafe.auth;
  }
  const next = {
    ...current,
    ...partialSafe,
    target: { ...(current.target || {}), ...(partialSafe.target || {}) },
    scrape: { ...(current.scrape || {}), ...(partialSafe.scrape || {}) },
    runtime: { ...(current.runtime || {}), ...(partialSafe.runtime || {}) }
  };
  await chrome.storage.local.set(next);
  return next;
}

export async function clearAuth() {
  // Explicit sign-out path (only place that clears auth).
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


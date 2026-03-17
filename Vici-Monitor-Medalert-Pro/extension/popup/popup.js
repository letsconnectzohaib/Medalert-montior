import { getSettings, setSettings, clearAuth, authLogin, pingGateway } from '../shared/settings.js';

const $ = (id) => document.getElementById(id);

function setBadge(el, kind, text) {
  el.classList.remove('badge-good', 'badge-warn', 'badge-bad');
  if (kind === 'good') el.classList.add('badge-good');
  if (kind === 'warn') el.classList.add('badge-warn');
  if (kind === 'bad') el.classList.add('badge-bad');
  el.textContent = text;
}

function show(elId, isShown) {
  const el = $(elId);
  if (!el) return;
  el.classList.toggle('hidden', !isShown);
}

function setAppMode(mode) {
  // mode: 'login' | 'app'
  show('screen-login', mode === 'login');
  show('bottom-nav', mode === 'app');

  // app tabs
  const appVisible = mode === 'app';
  show('tab-dashboard', appVisible);
  // other tabs are toggled by showTab()
  if (!appVisible) {
    show('tab-settings', false);
    show('tab-about', false);
  }
}

async function refresh() {
  const settings = await getSettings();

  const authBadge = $('auth-badge');
  const gwBadge = $('gw-badge');
  const logoutBtn = $('logout-btn');
  const loginBtn = $('login-btn');

  if (settings.auth?.token) {
    setBadge(authBadge, 'good', `Signed in (${settings.auth.user?.username || 'user'})`);
    loginBtn.disabled = true;
  } else {
    setBadge(authBadge, 'warn', 'Signed out');
    loginBtn.disabled = false;
  }

  const ok = await pingGateway(settings.gatewayBaseUrl);
  setBadge(gwBadge, ok ? 'good' : 'bad', `Gateway: ${ok ? 'online' : 'offline'}`);

  $('scraper-state').textContent = settings.runtime?.scraperState || 'Not started';
  $('last-snapshot').textContent = settings.runtime?.lastSnapshotAt || '—';
  $('last-error').textContent = settings.runtime?.lastError || '—';

  // Settings UI
  $('gateway-url').value = settings.gatewayBaseUrl || '';
  $('scrape-mode').value = settings.scrape?.mode || 'onChange';
  $('throttle-ms').value = String(settings.scrape?.throttleMs ?? 1500);
  $('poll-ms').value = String(settings.scrape?.pollMs ?? 60000);
  $('login-gateway').textContent = settings.gatewayBaseUrl || 'http://localhost:3100';

  // Gate: login vs app (no splash)
  if (!settings.auth?.token) {
    setAppMode('login');
  } else {
    setAppMode('app');
    showTab('dashboard');
  }
}

async function onLogin() {
  $('login-msg').textContent = '';

  const username = $('username').value.trim();
  const password = $('password').value;
  if (!username || !password) {
    $('login-msg').textContent = 'Enter username and password.';
    return;
  }

  const settings = await getSettings();
  const res = await authLogin(settings.gatewayBaseUrl, username, password);
  if (!res.success) {
    $('login-msg').textContent = res.error || 'Login failed.';
    return;
  }

  await setSettings({ auth: { token: res.token, user: res.user } });
  await refresh();
}

async function onLogout() {
  await clearAuth();
  await refresh();
}

function onOpenOptions(e) {
  e?.preventDefault?.();
  chrome.runtime.openOptionsPage();
}

function showTab(tab) {
  const ids = ['dashboard', 'settings', 'about'];
  for (const id of ids) {
    const view = $(`tab-${id}`);
    const btn = $(`nav-${id}`);
    const active = id === tab;
    if (view) view.classList.toggle('hidden', !active);
    if (btn) btn.classList.toggle('navActive', active);
  }
}

async function onSaveSettings() {
  const gatewayBaseUrl = $('gateway-url').value.trim() || 'http://localhost:3100';
  const mode = $('scrape-mode').value;
  const throttleMs = Math.max(250, Number($('throttle-ms').value) || 1500);
  const pollMs = Math.max(1000, Number($('poll-ms').value) || 60000);
  await setSettings({ gatewayBaseUrl, scrape: { mode, throttleMs, pollMs } });
  await refresh();
}

async function onScrapeNow() {
  $('login-msg').textContent = '';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'pro_tick_now' });
    if (!res?.success) {
      $('login-msg').textContent = res?.error || 'Failed to trigger scrape.';
    }
  } catch (e) {
    $('login-msg').textContent = e?.message || 'Failed to trigger scrape.';
  }
  await refresh();
}

$('login-btn').addEventListener('click', onLogin);
$('logout-btn').addEventListener('click', onLogout);
$('scrape-now-btn').addEventListener('click', onScrapeNow);
$('save-settings-btn').addEventListener('click', onSaveSettings);
$('open-options').addEventListener('click', onOpenOptions);

$('nav-dashboard').addEventListener('click', () => showTab('dashboard'));
$('nav-settings').addEventListener('click', () => showTab('settings'));
$('nav-about').addEventListener('click', () => showTab('about'));

refresh();

$('go-settings-from-login').addEventListener('click', () => {
  setAppMode('app');
  showTab('settings');
});


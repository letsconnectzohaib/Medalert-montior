import { getSettings, setSettings, clearAuth, authLogin, pingGateway } from '../shared/settings.js';

const $ = (id) => document.getElementById(id);

function setBadge(el, kind, text) {
  el.classList.remove('badge-good', 'badge-warn', 'badge-bad');
  if (kind === 'good') el.classList.add('badge-good');
  if (kind === 'warn') el.classList.add('badge-warn');
  if (kind === 'bad') el.classList.add('badge-bad');
  el.textContent = text;
}

async function refresh() {
  const settings = await getSettings();

  const authBadge = $('auth-badge');
  const gwBadge = $('gw-badge');
  const logoutBtn = $('logout-btn');
  const loginBtn = $('login-btn');

  if (settings.auth?.token) {
    setBadge(authBadge, 'good', `Signed in (${settings.auth.user?.username || 'user'})`);
    logoutBtn.disabled = false;
    loginBtn.disabled = true;
  } else {
    setBadge(authBadge, 'warn', 'Signed out');
    logoutBtn.disabled = true;
    loginBtn.disabled = false;
  }

  const ok = await pingGateway(settings.gatewayBaseUrl);
  setBadge(gwBadge, ok ? 'good' : 'bad', `Gateway: ${ok ? 'online' : 'offline'}`);

  $('scraper-state').textContent = settings.runtime?.scraperState || 'Not started';
  $('last-snapshot').textContent = settings.runtime?.lastSnapshotAt || '—';
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
  e.preventDefault();
  chrome.runtime.openOptionsPage();
}

$('login-btn').addEventListener('click', onLogin);
$('logout-btn').addEventListener('click', onLogout);
$('open-options').addEventListener('click', onOpenOptions);

refresh();


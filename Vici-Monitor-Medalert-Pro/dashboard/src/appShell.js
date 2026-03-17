import { loadSession, saveSession, clearSession, savePage } from './storage.js';
import { login as apiLogin, pingGateway, wsUrl, normalizeBaseUrl } from './apiClient.js';
import { renderOverview } from './pages/overview.js';
import { renderShiftAnalytics } from './pages/shiftAnalytics.js';
import { renderSettings } from './pages/settings.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

function setBadge(container, id, kind, text) {
  const badge = container.querySelector(`#${id}`) || el('span', { id, class: 'badge warn' });
  badge.classList.remove('good', 'warn', 'bad');
  badge.classList.add(kind);
  badge.textContent = text;
  if (!badge.parentElement) container.appendChild(badge);
}

export function createApp(root) {
  const state = {
    page: 'overview',
    baseUrl: 'http://localhost:3100',
    token: null,
    user: null,
    ws: null,
    latestSnapshot: null,
    wsStatus: 'disconnected'
  };

  function setPage(p) {
    state.page = p;
    savePage(p);
    // Keep URL stable for refreshes without forcing a reload.
    history.replaceState(null, '', `#${p}`);
    render();
  }

  function getPageFromUrl() {
    const h = String(window.location.hash || '').replace(/^#/, '').trim();
    if (h === 'overview' || h === 'shift' || h === 'settings') return h;
    return null;
  }

  function connectWs() {
    if (!state.token) return;
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;

    const ws = new WebSocket(wsUrl(state.baseUrl));
    state.ws = ws;
    state.wsStatus = 'connecting';
    render();

    ws.onopen = () => {
      state.wsStatus = 'connected';
      ws.send(JSON.stringify({ type: 'subscribe', token: state.token }));
      render();
    };

    ws.onmessage = (evt) => {
      let msg = null;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (msg.type === 'snapshot' && msg.snapshot) {
        state.latestSnapshot = msg.snapshot;
        render();
      }
      if (msg.type === 'error' && msg.error === 'unauthorized') {
        state.wsStatus = 'unauthorized';
        render();
      }
    };

    ws.onclose = () => {
      state.wsStatus = 'disconnected';
      render();
      setTimeout(connectWs, 1500);
    };
  }

  function logout() {
    state.token = null;
    state.user = null;
    clearSession();
    try {
      state.ws?.close();
    } catch {}
    state.ws = null;
    state.latestSnapshot = null;
    state.wsStatus = 'disconnected';
    render();
  }

  async function restore() {
    const s = loadSession();
    state.baseUrl = normalizeBaseUrl(s.gatewayUrl);
    state.token = s.token;
    state.user = s.user;
    state.page = getPageFromUrl() || s.page || 'overview';
    savePage(state.page);
    if (state.token) connectWs();
  }

  async function renderLogin() {
    const gatewayOk = await pingGateway(state.baseUrl);
    const card = el('div', { class: 'loginCard' }, [
      el('div', { class: 'loginTitle' }, ['Sign in']),
      el('div', { class: 'loginSub' }, ['Login to view live operations and shift analytics.']),
      el('div', { class: 'hr' }),
      el('div', { class: 'loginGrid' }, [
        el('label', {}, ['Gateway URL']),
        el('input', { id: 'lg_gateway', value: state.baseUrl })
      ]),
      el('div', { class: 'loginGrid' }, [
        el('label', {}, ['Username']),
        el('input', { id: 'lg_user', value: 'admin' })
      ]),
      el('div', { class: 'loginGrid' }, [
        el('label', {}, ['Password']),
        el('input', { id: 'lg_pass', type: 'password', value: 'admin123' })
      ]),
      el('div', { class: 'actions' }, [
        el('button', {
          class: 'btn primary',
          onclick: async () => {
            const baseUrl = normalizeBaseUrl(root.querySelector('#lg_gateway')?.value);
            const username = root.querySelector('#lg_user')?.value?.trim();
            const password = root.querySelector('#lg_pass')?.value;
            const msg = root.querySelector('#lg_msg');
            msg.textContent = '';
            state.baseUrl = baseUrl;
            const res = await apiLogin(baseUrl, username, password);
            if (!res.success) {
              msg.textContent = res.error || 'Login failed.';
              return;
            }
            state.token = res.token;
            state.user = res.user;
            saveSession({ gatewayUrl: baseUrl, token: res.token, user: res.user });
            connectWs();
            render();
          }
        }, ['Sign in']),
        el('button', { class: 'btn', onclick: () => window.location.reload() }, ['Reload'])
      ]),
      el('div', { id: 'lg_msg', class: 'msg' }, [gatewayOk ? '' : 'Gateway is offline/unreachable.'])
    ]);
    root.replaceChildren(el('div', { class: 'loginWrap' }, [card]));
  }

  function renderShell() {
    const badges = el('div', { class: 'topBadges' });
    setBadge(badges, 'auth', 'good', `Auth: ${state.user?.username || 'signed in'}`);
    setBadge(badges, 'ws', state.wsStatus === 'connected' ? 'good' : state.wsStatus === 'unauthorized' ? 'bad' : 'warn', `WS: ${state.wsStatus}`);
    setBadge(badges, 'snap', state.latestSnapshot ? 'good' : 'warn', `Last snapshot: ${state.latestSnapshot?.timestamp || '—'}`);

    const nav = el('div', { class: 'sbNav' }, [
      el('button', { type: 'button', class: `sbLink ${state.page === 'overview' ? 'active' : ''}`, onclick: () => setPage('overview') }, ['Overview']),
      el('button', { type: 'button', class: `sbLink ${state.page === 'shift' ? 'active' : ''}`, onclick: () => setPage('shift') }, ['Shift analytics']),
      el('button', { type: 'button', class: `sbLink ${state.page === 'settings' ? 'active' : ''}`, onclick: () => setPage('settings') }, ['Settings'])
    ]);

    const sidebar = el('aside', { class: 'sidebar' }, [
      el('div', {}, [
        el('div', { class: 'sbBrand' }, ['Vicidial Monitor Pro']),
        el('div', { class: 'sbSub' }, ['Operations intelligence'])
      ]),
      nav,
      el('div', { class: 'sbFooter' }, [
        el('div', {}, [`Gateway: ${state.baseUrl}`]),
        el('button', { type: 'button', class: 'btn', onclick: logout }, ['Sign out'])
      ])
    ]);

    const header = el('div', { class: 'pageHeader' }, [
      el('div', {}, [
        el('div', { class: 'pageTitle' }, [
          state.page === 'overview' ? 'Overview' : state.page === 'shift' ? 'Shift analytics' : 'Settings'
        ]),
        el('div', { class: 'pageDesc' }, [
          state.page === 'overview'
            ? 'Live operations from streaming snapshots.'
            : state.page === 'shift'
              ? 'Hourly buckets, peak hour, and purple/blue distributions.'
              : 'Configure shift timings, persistence, and capture behavior.'
        ])
      ]),
      badges
    ]);

    const content = el('main', { class: 'content' }, [header]);
    if (state.page === 'overview') content.appendChild(renderOverview(state));
    if (state.page === 'shift') content.appendChild(renderShiftAnalytics(state));
    if (state.page === 'settings') content.appendChild(renderSettings(state, render));

    root.replaceChildren(el('div', { class: 'shell' }, [sidebar, content]));
  }

  function render() {
    if (!state.token) {
      renderLogin();
      return;
    }
    renderShell();
  }

  window.addEventListener('hashchange', () => {
    const p = getPageFromUrl();
    if (p && p !== state.page) {
      state.page = p;
      savePage(p);
      render();
    }
  });

  restore().then(() => {
    // Ensure hash matches restored page.
    history.replaceState(null, '', `#${state.page}`);
    render();
  });
}


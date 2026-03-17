import { loadSession, saveSession, clearSession, savePage } from './storage.js';
import { login as apiLogin, pingGateway, wsUrl, normalizeBaseUrl, getAdminSettings } from './apiClient.js';
import { renderOverview, patchOverviewDom } from './pages/overview.js';
import { renderShiftAnalytics } from './pages/shiftAnalytics.js';
import { renderReports } from './pages/reports.js';
import { renderAlerts } from './pages/alerts.js';
import { renderSettings } from './pages/settings.js';
import { renderAdvancedDb } from './pages/advancedDb.js';

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
    wsStatus: 'disconnected',
    // caches for DB-driven pages so they don't disappear on live updates
    shiftIntelCache: null,
    adminSettingsCache: null
  };

  const dom = {
    shell: null,
    sidebarNav: null,
    content: null,
    badges: null,
    pageContainer: null,
    pageTitle: null,
    pageDesc: null
  };

  function beep(kind = 'warn') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = kind === 'bad' ? 660 : 440;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 140);
    } catch {
      // ignore audio errors
    }
  }

  function toast(text, kind = 'warn') {
    const host = dom.shell?.querySelector('#toastHost');
    if (!host) return;
    const t = el('div', { class: `toast ${kind}` }, [text]);
    host.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 250);
    }, 3500);
  }

  function setPage(p) {
    state.page = p;
    savePage(p);
    // Keep URL stable for refreshes without forcing a reload.
    history.replaceState(null, '', `#${p}`);
    renderPage();
    updateBadges();
    updateNavActive();
  }

  function getPageFromUrl() {
    const h = String(window.location.hash || '').replace(/^#/, '').trim();
    if (h === 'overview' || h === 'shift' || h === 'reports' || h === 'alerts' || h === 'settings' || h === 'advanced') return h;
    return null;
  }

  function connectWs() {
    if (!state.token) return;
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;

    const ws = new WebSocket(wsUrl(state.baseUrl));
    state.ws = ws;
    state.wsStatus = 'connecting';
    updateBadges();

    ws.onopen = () => {
      state.wsStatus = 'connected';
      ws.send(JSON.stringify({ type: 'subscribe', token: state.token }));
      updateBadges();
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
        // Live snapshots should NOT force a full app re-render.
        // Only update badges, and if user is on Overview update overview widgets.
        updateBadges();
        if (state.page === 'overview') {
          const patched = patchOverviewDom(state);
          if (!patched) renderPage(); // first render or after navigation
        }
      }
      if (msg.type === 'alert' && msg.alert) {
        updateBadges();
        const a = msg.alert;
        const cfg = state.adminSettingsCache?.alerts || {};
        if (cfg.notifyToast) toast(`${a.title || 'Alert'}`, a.severity || 'warn');
        if (cfg.notifySound) beep(a.severity || 'warn');
      }
      if (msg.type === 'error' && msg.error === 'unauthorized') {
        state.wsStatus = 'unauthorized';
        updateBadges();
      }
    };

    ws.onclose = () => {
      state.wsStatus = 'disconnected';
      updateBadges();
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
    if (state.token) {
      try {
        const r = await getAdminSettings(state.baseUrl, state.token);
        if (r.success) state.adminSettingsCache = r.settings || {};
      } catch {}
    }
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

  function ensureShell() {
    if (dom.shell) return;

    dom.badges = el('div', { class: 'topBadges' });

    dom.sidebarNav = el('div', { class: 'sbNav' }, [
      el('button', { id: 'nav_overview', type: 'button', class: 'sbLink', onclick: () => setPage('overview') }, ['Overview']),
      el('button', { id: 'nav_shift', type: 'button', class: 'sbLink', onclick: () => setPage('shift') }, ['Shift analytics']),
      el('button', { id: 'nav_reports', type: 'button', class: 'sbLink', onclick: () => setPage('reports') }, ['Reports']),
      el('button', { id: 'nav_alerts', type: 'button', class: 'sbLink', onclick: () => setPage('alerts') }, ['Alerts']),
      el('button', { id: 'nav_settings', type: 'button', class: 'sbLink', onclick: () => setPage('settings') }, ['Settings']),
      el('button', { id: 'nav_advanced', type: 'button', class: 'sbLink', onclick: () => setPage('advanced') }, ['Advanced'])
    ]);

    const sidebar = el('aside', { class: 'sidebar' }, [
      el('div', {}, [
        el('div', { class: 'sbBrand' }, ['Vicidial Monitor Pro']),
        el('div', { class: 'sbSub' }, ['Operations intelligence'])
      ]),
      dom.sidebarNav,
      el('div', { class: 'sbFooter' }, [
        el('div', { id: 'sb_gateway' }, [`Gateway: ${state.baseUrl}`]),
        el('button', { type: 'button', class: 'btn', onclick: logout }, ['Sign out'])
      ])
    ]);

    dom.pageTitle = el('div', { class: 'pageTitle' }, ['Overview']);
    dom.pageDesc = el('div', { class: 'pageDesc' }, ['']);

    const header = el('div', { class: 'pageHeader' }, [
      el('div', {}, [dom.pageTitle, dom.pageDesc]),
      dom.badges
    ]);

    dom.pageContainer = el('div', { id: 'page_container' }, []);
    dom.content = el('main', { class: 'content' }, [header, dom.pageContainer]);

    dom.shell = el('div', { class: 'shell' }, [sidebar, dom.content]);
    const toastHost = el('div', { id: 'toastHost', class: 'toastHost' }, []);
    dom.shell.appendChild(toastHost);
    root.replaceChildren(dom.shell);
  }

  function updateNavActive() {
    if (!dom.sidebarNav) return;
    dom.sidebarNav.querySelectorAll('.sbLink').forEach((b) => b.classList.remove('active'));
    const id =
      state.page === 'overview'
        ? 'nav_overview'
        : state.page === 'shift'
          ? 'nav_shift'
          : state.page === 'reports'
            ? 'nav_reports'
            : state.page === 'alerts'
              ? 'nav_alerts'
          : state.page === 'settings'
            ? 'nav_settings'
            : 'nav_advanced';
    dom.sidebarNav.querySelector(`#${id}`)?.classList.add('active');
    const g = dom.shell?.querySelector('#sb_gateway');
    if (g) g.textContent = `Gateway: ${state.baseUrl}`;
  }

  function updateBadges() {
    if (!dom.badges) return;
    dom.badges.innerHTML = '';
    setBadge(dom.badges, 'auth', 'good', `Auth: ${state.user?.username || 'signed in'}`);
    setBadge(
      dom.badges,
      'ws',
      state.wsStatus === 'connected' ? 'good' : state.wsStatus === 'unauthorized' ? 'bad' : 'warn',
      `WS: ${state.wsStatus}`
    );
    setBadge(dom.badges, 'snap', state.latestSnapshot ? 'good' : 'warn', `Last snapshot: ${state.latestSnapshot?.timestamp || '—'}`);
  }

  function renderPage() {
    // Debug: set localStorage.VM_DEBUG_RENDER = "1" to log page renders.
    try {
      if (localStorage.getItem('VM_DEBUG_RENDER') === '1') {
        // eslint-disable-next-line no-console
        console.debug('[vm] renderPage', { page: state.page, ws: state.wsStatus, ts: new Date().toISOString() });
      }
    } catch {}
    ensureShell();
    updateNavActive();

    dom.pageTitle.textContent =
      state.page === 'overview'
        ? 'Overview'
        : state.page === 'shift'
          ? 'Shift analytics'
          : state.page === 'reports'
            ? 'Reports'
            : state.page === 'alerts'
              ? 'Alerts'
            : 'Settings';
    dom.pageDesc.textContent =
      state.page === 'overview'
        ? 'Live operations from streaming snapshots.'
        : state.page === 'shift'
          ? 'DB-driven hourly buckets, peak hour, and purple/blue distributions.'
          : state.page === 'reports'
            ? 'Generate printable shift reports and exports.'
            : state.page === 'alerts'
              ? 'Detected anomalies and operational alerts.'
          : state.page === 'settings'
            ? 'Configure shift timings, persistence, and capture behavior.'
            : 'Inspect database tables, explore raw snapshots, and perform safe maintenance actions.';

    dom.pageContainer.replaceChildren();
    if (state.page === 'overview') dom.pageContainer.appendChild(renderOverview(state));
    if (state.page === 'shift') dom.pageContainer.appendChild(renderShiftAnalytics(state));
    if (state.page === 'reports') dom.pageContainer.appendChild(renderReports(state));
    if (state.page === 'alerts') dom.pageContainer.appendChild(renderAlerts(state));
    if (state.page === 'settings')
      dom.pageContainer.appendChild(
        renderSettings(state, () => {
          // Settings tabs + local gateway URL changes must rerender the page.
          // Also ensure WS reconnects if baseUrl changed.
          connectWs();
          renderPage();
          updateBadges();
          updateNavActive();
        })
      );
    if (state.page === 'advanced') dom.pageContainer.appendChild(renderAdvancedDb(state));
  }

  function render() {
    if (!state.token) {
      renderLogin();
      return;
    }
    renderPage();
    updateBadges();
  }

  window.addEventListener('hashchange', () => {
    const p = getPageFromUrl();
    if (p && p !== state.page) {
      state.page = p;
      savePage(p);
      renderPage();
      updateBadges();
      updateNavActive();
    }
  });

  restore().then(() => {
    // Ensure hash matches restored page.
    history.replaceState(null, '', `#${state.page}`);
    render();
  });
}


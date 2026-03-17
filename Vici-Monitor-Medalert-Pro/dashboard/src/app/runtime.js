import { loadSession, saveSession, clearSession, savePage } from '../storage.js';
import { wsUrl, normalizeBaseUrl, getAdminSettings } from '../apiClient.js';
import { getDefaultPage, isKnownPage } from '../config/navigation.js';

export function createInitialState() {
  return {
    page: getDefaultPage(),
    baseUrl: 'http://localhost:3100',
    token: null,
    user: null,
    ws: null,
    latestSnapshot: null,
    wsStatus: 'disconnected',
    recentPoints: [],
    shiftIntelCache: null,
    adminSettingsCache: null,
    hardReloadWarning: null,
  };
}

export function createDomState() {
  return {
    shell: null,
    sidebar: null,
    badges: null,
    pageContainer: null,
    pageTitle: null,
    pageDesc: null,
    pageEyebrow: null,
  };
}

export function createRuntimeHelpers({
  state,
  render,
  renderPage,
  updateBadges,
  updateNavActive,
  patchOverviewDom,
  toast,
  beep,
}) {
  function setPage(pageId) {
    if (!isKnownPage(pageId)) return;
    state.page = pageId;
    savePage(pageId);
    history.replaceState(null, '', `#${pageId}`);
    renderPage();
    updateBadges();
    updateNavActive();
  }

  function getPageFromUrl() {
    const hash = String(window.location.hash || '').replace(/^#/, '').trim();
    return isKnownPage(hash) ? hash : null;
  }

  function collectRealtimePoint(snapshot) {
    try {
      const summary = snapshot?.summary || {};
      const agents = Array.isArray(snapshot?.agents) ? snapshot.agents : [];
      let purple = 0;
      for (const agent of agents) {
        if (agent?.stateBucket === 'oncall_gt_5m') purple += 1;
      }

      state.recentPoints.push({
        ts: snapshot?.timestamp || new Date().toISOString(),
        active: Number(summary.activeCalls || 0),
        waiting: Number(summary.callsWaiting || 0),
        purple: Number(purple || 0),
      });

      if (state.recentPoints.length > 90) {
        state.recentPoints.shift();
      }
    } catch {
      // ignore malformed live points
    }
  }

  function handleSnapshot(snapshot) {
    state.latestSnapshot = snapshot;
    collectRealtimePoint(snapshot);
    updateBadges();

    if (state.page === 'overview') {
      const patched = patchOverviewDom(state);
      if (!patched) renderPage();
    }
  }

  function handleAlert(alert) {
    updateBadges();
    const cfg = state.adminSettingsCache?.alerts || {};
    if (cfg.notifyToast) toast(`${alert?.title || 'Alert'}`, alert?.severity || 'warn');
    if (cfg.notifySound) beep(alert?.severity || 'warn');
  }

  function closeWs() {
    try {
      state.ws?.close();
    } catch {
      // ignore close errors
    }
    state.ws = null;
  }

  function connectWs() {
    if (!state.token) return;
    if (
      state.ws &&
      (state.ws.readyState === WebSocket.OPEN ||
        state.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

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
        handleSnapshot(msg.snapshot);
        return;
      }

      if (msg.type === 'alert' && msg.alert) {
        handleAlert(msg.alert);
        return;
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

    ws.onerror = () => {
      state.wsStatus = 'disconnected';
      updateBadges();
    };
  }

  function logout() {
    state.token = null;
    state.user = null;
    clearSession();
    closeWs();
    state.latestSnapshot = null;
    state.wsStatus = 'disconnected';
    render();
  }

  async function restore() {
    try {
      const nav = performance.getEntriesByType?.('navigation')?.[0];
      const isReload = nav?.type === 'reload';
      const key = 'vmp_hard_reload_ts';
      const now = Date.now();
      const arr = JSON.parse(localStorage.getItem(key) || '[]').filter(
        (t) => now - t < 60_000,
      );
      if (isReload) arr.push(now);
      localStorage.setItem(key, JSON.stringify(arr.slice(-20)));
      if (arr.length >= 4) {
        state.hardReloadWarning =
          'Detected frequent FULL tab reloads. This is usually caused by auto-reload tooling or a browser auto-refresh extension, not by live snapshots.';
      }
    } catch {
      // ignore reload detection errors
    }

    const session = loadSession();
    state.baseUrl = normalizeBaseUrl(session.gatewayUrl);
    state.token = session.token;
    state.user = session.user;
    state.page = getPageFromUrl() || (isKnownPage(session.page) ? session.page : getDefaultPage());
    savePage(state.page);

    if (state.token) {
      connectWs();
      try {
        const settings = await getAdminSettings(state.baseUrl, state.token);
        if (settings.success) {
          state.adminSettingsCache = settings.settings || {};
        }
      } catch {
        // ignore settings preload failure
      }
    }
  }

  function persistLogin({ baseUrl, token, user }) {
    state.baseUrl = normalizeBaseUrl(baseUrl);
    state.token = token || null;
    state.user = user || null;
    saveSession({
      gatewayUrl: state.baseUrl,
      token: state.token,
      user: state.user,
    });
  }

  return {
    setPage,
    getPageFromUrl,
    connectWs,
    closeWs,
    logout,
    restore,
    persistLogin,
    handleSnapshot,
    handleAlert,
  };
}

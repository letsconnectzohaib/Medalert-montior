import { getDefaultPage, getPageMeta, isKnownPage } from '../config/navigation.js';

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
    hardReloadWarning: null
  };
}

export function normalizePage(pageId) {
  const id = String(pageId || '').trim();
  return isKnownPage(id) ? id : getDefaultPage();
}

export function setPageInState(state, pageId) {
  const nextPage = normalizePage(pageId);
  state.page = nextPage;
  return nextPage;
}

export function getCurrentPageMeta(state) {
  return getPageMeta(state?.page) || getPageMeta(getDefaultPage()) || null;
}

export function getPageInfo(pageId) {
  return getPageMeta(normalizePage(pageId));
}

export function getPageTitle(pageId) {
  return getPageInfo(pageId)?.label || 'Dashboard';
}

export function getPageDescription(pageId) {
  return getPageInfo(pageId)?.description || '';
}

export function getPageEyebrow(pageId) {
  const meta = getPageInfo(pageId);
  if (!meta) return 'Dashboard';
  return `${meta.groupIcon || ''} ${meta.groupLabel || 'Dashboard'}`.trim();
}

export function getPageHash(pageId) {
  return `#${normalizePage(pageId)}`;
}

export function getPageFromHash(hashValue) {
  const raw = String(hashValue || '').replace(/^#/, '').trim();
  return normalizePage(raw);
}

export function shouldPatchOverview(state) {
  return normalizePage(state?.page) === 'overview';
}

export function pushRecentPoint(state, point, maxPoints = 90) {
  if (!state || !point) return [];
  if (!Array.isArray(state.recentPoints)) state.recentPoints = [];
  state.recentPoints.push(point);
  while (state.recentPoints.length > maxPoints) {
    state.recentPoints.shift();
  }
  return state.recentPoints;
}

export function clearLiveSessionState(state) {
  if (!state) return state;
  state.token = null;
  state.user = null;
  state.ws = null;
  state.latestSnapshot = null;
  state.wsStatus = 'disconnected';
  return state;
}

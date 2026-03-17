import { normalizeBaseUrl, pingGateway } from '../apiClient.js';
import { loadSession, saveSession } from '../storage.js';

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

export function renderSettings(state, rerender) {
  const session = loadSession();

  const section = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Settings']),
    el('div', { class: 'note' }, ['Phase 1: basic config. Shift timing + retention will be added next.']),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Gateway URL']),
      el('input', { id: 'st_gateway', value: session.gatewayUrl || state.baseUrl })
    ]),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn',
        onclick: async () => {
          const url = normalizeBaseUrl(document.getElementById('st_gateway').value);
          const ok = await pingGateway(url);
          document.getElementById('st_msg').textContent = ok ? 'Gateway reachable.' : 'Gateway offline/unreachable.';
        }
      }, ['Test gateway']),
      el('button', {
        class: 'btn primary',
        onclick: () => {
          const url = normalizeBaseUrl(document.getElementById('st_gateway').value);
          saveSession({ gatewayUrl: url, token: state.token, user: state.user });
          state.baseUrl = url;
          document.getElementById('st_msg').textContent = 'Saved. Reloading WS…';
          try {
            state.ws?.close();
          } catch {}
          state.ws = null;
          rerender();
        }
      }, ['Save'])
    ]),
    el('div', { id: 'st_msg', class: 'msg' }, [''])
  ]);

  return section;
}


import { el } from '../../ui/dom.js';
import { normalizeBaseUrl, pingGateway } from '../../apiClient.js';
import { saveSession } from '../../storage.js';

export function panelGateway({ state, session, rerender }) {
  return el('div', {}, [
    el('div', { class: 'cardTitle' }, ['Gateway URL (Browser)']),
    el('div', { class: 'note' }, ['This is stored locally in your browser (not in the gateway DB).']),
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
}

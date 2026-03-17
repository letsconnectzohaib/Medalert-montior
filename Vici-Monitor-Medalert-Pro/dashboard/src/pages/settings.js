import { normalizeBaseUrl, pingGateway, getAdminSettings, updateAdminSettings } from '../apiClient.js';
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
  const cached = state.adminSettingsCache || null;
  const shift = cached?.shift || { tzOffsetMinutes: 300, start: '19:00', end: '04:30' };
  const retention = cached?.retention || { rawSnapshotsDays: 14, bucketsDays: 60 };

  const section = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Settings']),
    el('div', { class: 'note' }, ['Gateway URL is saved locally in your browser. Shift timing + retention are saved in the Live Gateway DB.']),
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
    ,
    el('div', { class: 'divider' }, ['']),
    el('div', { class: 'cardTitle' }, ['Shift timing (Gateway)']),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Timezone offset (minutes)']),
      el('input', { id: 'st_tz', type: 'number', value: String(shift.tzOffsetMinutes ?? 300) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Shift start (HH:MM)']),
      el('input', { id: 'st_shift_start', value: String(shift.start ?? '19:00') })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Shift end (HH:MM)']),
      el('input', { id: 'st_shift_end', value: String(shift.end ?? '04:30') })
    ]),
    el('div', { class: 'cardTitle' }, ['Retention (Gateway)']),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Raw snapshots retention (days)']),
      el('input', { id: 'st_ret_raw', type: 'number', value: String(retention.rawSnapshotsDays ?? 14) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Bucket aggregates retention (days)']),
      el('input', { id: 'st_ret_buckets', type: 'number', value: String(retention.bucketsDays ?? 60) })
    ]),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn',
        onclick: async () => {
          const msg = document.getElementById('st_admin_msg');
          msg.textContent = 'Loading…';
          const r = await getAdminSettings(state.baseUrl, state.token);
          if (!r.success) {
            msg.textContent = `Failed: ${r.error}`;
            return;
          }
          state.adminSettingsCache = r.settings || {};
          msg.textContent = 'Loaded.';
          rerender();
        }
      }, ['Load from gateway']),
      el('button', {
        class: 'btn primary',
        onclick: async () => {
          const msg = document.getElementById('st_admin_msg');
          msg.textContent = 'Saving…';
          const patch = {
            shift: {
              tzOffsetMinutes: Number(document.getElementById('st_tz').value || 0),
              start: String(document.getElementById('st_shift_start').value || '').trim(),
              end: String(document.getElementById('st_shift_end').value || '').trim()
            },
            retention: {
              rawSnapshotsDays: Number(document.getElementById('st_ret_raw').value || 14),
              bucketsDays: Number(document.getElementById('st_ret_buckets').value || 60)
            }
          };
          const r = await updateAdminSettings(state.baseUrl, state.token, patch);
          if (!r.success) {
            msg.textContent = `Failed: ${r.error}`;
            return;
          }
          state.adminSettingsCache = r.settings || {};
          msg.textContent = 'Saved to gateway.';
          rerender();
        }
      }, ['Save to gateway'])
    ]),
    el('div', { id: 'st_admin_msg', class: 'msg' }, [''])
  ]);

  return section;
}


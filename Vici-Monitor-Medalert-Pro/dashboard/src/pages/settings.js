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
  const retention = cached?.retention || { rawSnapshotsDays: 14, bucketsDays: 60, alertsDays: 30 };
  const alerts = cached?.alerts || {
    waitingSpikeMax: 25,
    waitingSpikeSustainSeconds: 120,
    waitingSpikeCooldownSeconds: 600,
    purpleOverloadMin: 8,
    purpleOverloadSustainSeconds: 180,
    purpleOverloadCooldownSeconds: 900,
    dropPercentJumpPoints: 2.5,
    dropPercentMin: 3,
    dropPercentCooldownSeconds: 900,
    notifyToast: true,
    notifySound: false
  };

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
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Alerts retention (days)']),
      el('input', { id: 'st_ret_alerts', type: 'number', value: String(retention.alertsDays ?? 30) })
    ]),
    el('div', { class: 'divider' }, ['']),
    el('div', { class: 'cardTitle' }, ['Alerts (Gateway)']),
    el('div', { class: 'note' }, ['Controls detection thresholds and dashboard notifications.']),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Waiting spike max']),
      el('input', { id: 'st_al_wait_max', type: 'number', value: String(alerts.waitingSpikeMax ?? 25) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Waiting sustain (sec)']),
      el('input', { id: 'st_al_wait_sus', type: 'number', value: String(alerts.waitingSpikeSustainSeconds ?? 120) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Waiting cooldown (sec)']),
      el('input', { id: 'st_al_wait_cd', type: 'number', value: String(alerts.waitingSpikeCooldownSeconds ?? 600) })
    ]),

    el('div', { class: 'formRow' }, [
      el('label', {}, ['Purple overload min']),
      el('input', { id: 'st_al_purp_min', type: 'number', value: String(alerts.purpleOverloadMin ?? 8) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Purple sustain (sec)']),
      el('input', { id: 'st_al_purp_sus', type: 'number', value: String(alerts.purpleOverloadSustainSeconds ?? 180) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Purple cooldown (sec)']),
      el('input', { id: 'st_al_purp_cd', type: 'number', value: String(alerts.purpleOverloadCooldownSeconds ?? 900) })
    ]),

    el('div', { class: 'formRow' }, [
      el('label', {}, ['Drop% min']),
      el('input', { id: 'st_al_drop_min', type: 'number', value: String(alerts.dropPercentMin ?? 3) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Drop% jump pts']),
      el('input', { id: 'st_al_drop_jump', type: 'number', value: String(alerts.dropPercentJumpPoints ?? 2.5) })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Drop% cooldown (sec)']),
      el('input', { id: 'st_al_drop_cd', type: 'number', value: String(alerts.dropPercentCooldownSeconds ?? 900) })
    ]),

    el('div', { class: 'formRow' }, [
      el('label', {}, ['Dashboard toast']),
      el('input', { id: 'st_al_toast', type: 'checkbox' })
    ]),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Dashboard sound']),
      el('input', { id: 'st_al_sound', type: 'checkbox' })
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
              bucketsDays: Number(document.getElementById('st_ret_buckets').value || 60),
              alertsDays: Number(document.getElementById('st_ret_alerts').value || 30)
            },
            alerts: {
              waitingSpikeMax: Number(document.getElementById('st_al_wait_max').value || 25),
              waitingSpikeSustainSeconds: Number(document.getElementById('st_al_wait_sus').value || 120),
              waitingSpikeCooldownSeconds: Number(document.getElementById('st_al_wait_cd').value || 600),
              purpleOverloadMin: Number(document.getElementById('st_al_purp_min').value || 8),
              purpleOverloadSustainSeconds: Number(document.getElementById('st_al_purp_sus').value || 180),
              purpleOverloadCooldownSeconds: Number(document.getElementById('st_al_purp_cd').value || 900),
              dropPercentMin: Number(document.getElementById('st_al_drop_min').value || 3),
              dropPercentJumpPoints: Number(document.getElementById('st_al_drop_jump').value || 2.5),
              dropPercentCooldownSeconds: Number(document.getElementById('st_al_drop_cd').value || 900),
              notifyToast: !!document.getElementById('st_al_toast').checked,
              notifySound: !!document.getElementById('st_al_sound').checked
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

  // checkbox defaults
  setTimeout(() => {
    const t = document.getElementById('st_al_toast');
    const s = document.getElementById('st_al_sound');
    if (t) t.checked = !!alerts.notifyToast;
    if (s) s.checked = !!alerts.notifySound;
  }, 0);

  return section;
}


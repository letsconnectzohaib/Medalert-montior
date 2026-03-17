import { normalizeBaseUrl, pingGateway, getAdminSettings, updateAdminSettings, testSlack } from '../apiClient.js';
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
  const notifications = cached?.notifications || {
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '',
      username: 'Vici Monitor Pro',
      cooldownSeconds: 300,
      routes: {
        info: { enabled: false, webhookUrl: '', channel: '' },
        warn: { enabled: true, webhookUrl: '', channel: '' },
        bad: { enabled: true, webhookUrl: '', channel: '' }
      }
    }
  };

  const tab = state.settingsTab || 'gateway';
  const setTab = (t) => {
    state.settingsTab = t;
    rerender();
  };

  const tabs = el('div', { class: 'tabs' }, [
    tabBtn('gateway', 'Gateway URL', tab, setTab),
    tabBtn('shift', 'Shift', tab, setTab),
    tabBtn('retention', 'Retention', tab, setTab),
    tabBtn('alerts', 'Alerts', tab, setTab),
    tabBtn('notifications', 'Notifications', tab, setTab)
  ]);

  const section = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Settings']),
    el('div', { class: 'note' }, ['Use tabs to manage gateway configuration cleanly.']),
    tabs,
    el('div', { id: 'st_panel' }, [renderPanel(tab, { state, session, shift, retention, alerts, notifications, rerender })]),
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

          const patch = buildPatchFromDom();
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
    const se = document.getElementById('st_slack_enabled');
    if (se) se.checked = !!notifications.slack?.enabled;
    const sb = document.getElementById('st_slack_bad_enabled');
    const sw = document.getElementById('st_slack_warn_enabled');
    const si = document.getElementById('st_slack_info_enabled');
    if (sb) sb.checked = !!notifications.slack?.routes?.bad?.enabled;
    if (sw) sw.checked = !!notifications.slack?.routes?.warn?.enabled;
    if (si) si.checked = !!notifications.slack?.routes?.info?.enabled;
  }, 0);

  return section;
}

function tabBtn(key, label, active, setTab) {
  return el('button', { type: 'button', class: `tabBtn ${active === key ? 'active' : ''}`, onclick: () => setTab(key) }, [label]);
}

function renderPanel(tab, ctx) {
  if (tab === 'gateway') return panelGateway(ctx);
  if (tab === 'shift') return panelShift(ctx);
  if (tab === 'retention') return panelRetention(ctx);
  if (tab === 'alerts') return panelAlerts(ctx);
  if (tab === 'notifications') return panelSlack(ctx);
  return el('div', {}, ['Unknown tab']);
}

function panelGateway({ state, session, rerender }) {
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

function panelShift({ shift }) {
  return el('div', { class: 'formCols' }, [
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Shift timing (Gateway)']),
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
      ])
    ]),
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['How it’s used']),
      el('div', { class: 'note' }, [
        'These settings define how snapshots are bucketed into a shift date + local hour for analytics, reports, and alerts.'
      ])
    ])
  ]);
}

function panelRetention({ retention }) {
  return el('div', { class: 'formCols' }, [
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Retention (Gateway)']),
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
      ])
    ]),
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Notes']),
      el('div', { class: 'note' }, [
        'Raw snapshots can grow quickly. Buckets + hourly aggregates are smaller and power Shift Analytics. Alerts are kept separately.'
      ])
    ])
  ]);
}

function panelAlerts({ alerts }) {
  return el('div', { class: 'formCols' }, [
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Detectors (Gateway)']),
      el('div', { class: 'note' }, ['Thresholds used during ingest to create alerts.']),

      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--muted);' }, ['Waiting spike']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Max waiting']),
        el('input', { id: 'st_al_wait_max', type: 'number', value: String(alerts.waitingSpikeMax ?? 25) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Sustain (sec)']),
        el('input', { id: 'st_al_wait_sus', type: 'number', value: String(alerts.waitingSpikeSustainSeconds ?? 120) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Cooldown (sec)']),
        el('input', { id: 'st_al_wait_cd', type: 'number', value: String(alerts.waitingSpikeCooldownSeconds ?? 600) })
      ]),

      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--muted);' }, ['Purple overload']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Min purple agents']),
        el('input', { id: 'st_al_purp_min', type: 'number', value: String(alerts.purpleOverloadMin ?? 8) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Sustain (sec)']),
        el('input', { id: 'st_al_purp_sus', type: 'number', value: String(alerts.purpleOverloadSustainSeconds ?? 180) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Cooldown (sec)']),
        el('input', { id: 'st_al_purp_cd', type: 'number', value: String(alerts.purpleOverloadCooldownSeconds ?? 900) })
      ]),

      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--muted);' }, ['Drop% jump']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Min drop%']),
        el('input', { id: 'st_al_drop_min', type: 'number', value: String(alerts.dropPercentMin ?? 3) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Jump points']),
        el('input', { id: 'st_al_drop_jump', type: 'number', value: String(alerts.dropPercentJumpPoints ?? 2.5) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Cooldown (sec)']),
        el('input', { id: 'st_al_drop_cd', type: 'number', value: String(alerts.dropPercentCooldownSeconds ?? 900) })
      ])
    ]),
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Dashboard notifications']),
      el('div', { class: 'note' }, ['Controls toast/sound when new alerts arrive over WebSocket.']),
      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Toast']),
        el('input', { id: 'st_al_toast', type: 'checkbox' })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Sound']),
        el('input', { id: 'st_al_sound', type: 'checkbox' })
      ]),
      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'note' }, [
        'Tip: Keep sound off for day-to-day ops; enable it only for critical shifts or wallboards.'
      ])
    ])
  ]);
}

function panelSlack({ state, notifications }) {
  const slack = notifications.slack || {};
  const routes = slack.routes || {};
  const info = routes.info || {};
  const warn = routes.warn || {};
  const bad = routes.bad || {};
  return el('div', { class: 'formCols' }, [
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Slack (Gateway)']),
      el('div', { class: 'note' }, [
        'Configure per-severity routing. Route fields fall back to the global webhook/channel if left blank.'
      ]),
      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Enabled']),
        el('input', { id: 'st_slack_enabled', type: 'checkbox' })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Global Webhook URL']),
        el('input', { id: 'st_slack_webhook', value: String(slack.webhookUrl || '') })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Global Channel (optional)']),
        el('input', { id: 'st_slack_channel', value: String(slack.channel || '') })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Username']),
        el('input', { id: 'st_slack_username', value: String(slack.username || 'Vici Monitor Pro') })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Cooldown (sec)']),
        el('input', { id: 'st_slack_cd', type: 'number', value: String(slack.cooldownSeconds ?? 300) })
      ]),
      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'actions' }, [
        el('button', {
          class: 'btn',
          onclick: async () => {
            const msg = document.getElementById('st_admin_msg');
            msg.textContent = 'Sending Slack test…';
            const r = await testSlack(state.baseUrl, state.token, { severity: 'bad', message: 'Test BAD Slack message from Vicidial Monitor Pro' });
            msg.textContent = r.success ? 'Slack test sent.' : `Slack test failed: ${r.error}`;
          }
        }, ['Send BAD test']),
        el('button', {
          class: 'btn',
          onclick: async () => {
            const msg = document.getElementById('st_admin_msg');
            msg.textContent = 'Sending Slack test…';
            const r = await testSlack(state.baseUrl, state.token, { severity: 'warn', message: 'Test WARN Slack message from Vicidial Monitor Pro' });
            msg.textContent = r.success ? 'Slack test sent.' : `Slack test failed: ${r.error}`;
          }
        }, ['Send WARN test']),
        el('button', {
          class: 'btn',
          onclick: async () => {
            const msg = document.getElementById('st_admin_msg');
            msg.textContent = 'Sending Slack test…';
            const r = await testSlack(state.baseUrl, state.token, { severity: 'info', message: 'Test INFO Slack message from Vicidial Monitor Pro' });
            msg.textContent = r.success ? 'Slack test sent.' : `Slack test failed: ${r.error}`;
          }
        }, ['Send INFO test'])
      ])
    ]),
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Routing']),
      el('div', { class: 'note' }, ['Choose which severities notify, and where they go.']),
      el('div', { class: 'divider' }, ['']),

      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--muted);' }, ['Bad (critical)']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Enabled']),
        el('input', { id: 'st_slack_bad_enabled', type: 'checkbox' })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Webhook (optional)']),
        el('input', { id: 'st_slack_bad_webhook', value: String(bad.webhookUrl || '') })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Channel (optional)']),
        el('input', { id: 'st_slack_bad_channel', value: String(bad.channel || '') })
      ]),

      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--muted);' }, ['Warn']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Enabled']),
        el('input', { id: 'st_slack_warn_enabled', type: 'checkbox' })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Webhook (optional)']),
        el('input', { id: 'st_slack_warn_webhook', value: String(warn.webhookUrl || '') })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Channel (optional)']),
        el('input', { id: 'st_slack_warn_channel', value: String(warn.channel || '') })
      ]),

      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--muted);' }, ['Info']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Enabled']),
        el('input', { id: 'st_slack_info_enabled', type: 'checkbox' })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Webhook (optional)']),
        el('input', { id: 'st_slack_info_webhook', value: String(info.webhookUrl || '') })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Channel (optional)']),
        el('input', { id: 'st_slack_info_channel', value: String(info.channel || '') })
      ])
    ])
  ]);
}

function buildPatchFromDom() {
  // Some fields may not exist for inactive tabs; fall back safely.
  const shift = {
    tzOffsetMinutes: document.getElementById('st_tz') ? Number(document.getElementById('st_tz').value || 0) : undefined,
    start: document.getElementById('st_shift_start') ? String(document.getElementById('st_shift_start').value || '').trim() : undefined,
    end: document.getElementById('st_shift_end') ? String(document.getElementById('st_shift_end').value || '').trim() : undefined
  };
  const retention = {
    rawSnapshotsDays: document.getElementById('st_ret_raw') ? Number(document.getElementById('st_ret_raw').value || 14) : undefined,
    bucketsDays: document.getElementById('st_ret_buckets') ? Number(document.getElementById('st_ret_buckets').value || 60) : undefined,
    alertsDays: document.getElementById('st_ret_alerts') ? Number(document.getElementById('st_ret_alerts').value || 30) : undefined
  };
  const alerts = {
    waitingSpikeMax: document.getElementById('st_al_wait_max') ? Number(document.getElementById('st_al_wait_max').value || 25) : undefined,
    waitingSpikeSustainSeconds: document.getElementById('st_al_wait_sus') ? Number(document.getElementById('st_al_wait_sus').value || 120) : undefined,
    waitingSpikeCooldownSeconds: document.getElementById('st_al_wait_cd') ? Number(document.getElementById('st_al_wait_cd').value || 600) : undefined,
    purpleOverloadMin: document.getElementById('st_al_purp_min') ? Number(document.getElementById('st_al_purp_min').value || 8) : undefined,
    purpleOverloadSustainSeconds: document.getElementById('st_al_purp_sus') ? Number(document.getElementById('st_al_purp_sus').value || 180) : undefined,
    purpleOverloadCooldownSeconds: document.getElementById('st_al_purp_cd') ? Number(document.getElementById('st_al_purp_cd').value || 900) : undefined,
    dropPercentMin: document.getElementById('st_al_drop_min') ? Number(document.getElementById('st_al_drop_min').value || 3) : undefined,
    dropPercentJumpPoints: document.getElementById('st_al_drop_jump') ? Number(document.getElementById('st_al_drop_jump').value || 2.5) : undefined,
    dropPercentCooldownSeconds: document.getElementById('st_al_drop_cd') ? Number(document.getElementById('st_al_drop_cd').value || 900) : undefined,
    notifyToast: document.getElementById('st_al_toast') ? !!document.getElementById('st_al_toast').checked : undefined,
    notifySound: document.getElementById('st_al_sound') ? !!document.getElementById('st_al_sound').checked : undefined
  };
  const notifications = {
    slack: {
      enabled: document.getElementById('st_slack_enabled') ? !!document.getElementById('st_slack_enabled').checked : undefined,
      webhookUrl: document.getElementById('st_slack_webhook') ? String(document.getElementById('st_slack_webhook').value || '').trim() : undefined,
      channel: document.getElementById('st_slack_channel') ? String(document.getElementById('st_slack_channel').value || '').trim() : undefined,
      username: document.getElementById('st_slack_username') ? String(document.getElementById('st_slack_username').value || 'Vici Monitor Pro').trim() : undefined,
      cooldownSeconds: document.getElementById('st_slack_cd') ? Number(document.getElementById('st_slack_cd').value || 300) : undefined,
      routes: {
        bad: {
          enabled: document.getElementById('st_slack_bad_enabled') ? !!document.getElementById('st_slack_bad_enabled').checked : undefined,
          webhookUrl: document.getElementById('st_slack_bad_webhook') ? String(document.getElementById('st_slack_bad_webhook').value || '').trim() : undefined,
          channel: document.getElementById('st_slack_bad_channel') ? String(document.getElementById('st_slack_bad_channel').value || '').trim() : undefined
        },
        warn: {
          enabled: document.getElementById('st_slack_warn_enabled') ? !!document.getElementById('st_slack_warn_enabled').checked : undefined,
          webhookUrl: document.getElementById('st_slack_warn_webhook') ? String(document.getElementById('st_slack_warn_webhook').value || '').trim() : undefined,
          channel: document.getElementById('st_slack_warn_channel') ? String(document.getElementById('st_slack_warn_channel').value || '').trim() : undefined
        },
        info: {
          enabled: document.getElementById('st_slack_info_enabled') ? !!document.getElementById('st_slack_info_enabled').checked : undefined,
          webhookUrl: document.getElementById('st_slack_info_webhook') ? String(document.getElementById('st_slack_info_webhook').value || '').trim() : undefined,
          channel: document.getElementById('st_slack_info_channel') ? String(document.getElementById('st_slack_info_channel').value || '').trim() : undefined
        }
      }
    }
  };

  // Remove undefined keys so we don't overwrite settings from inactive tabs.
  const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  const patch = {};
  const s = clean(shift);
  const r = clean(retention);
  const a = clean(alerts);
  const slack = clean(notifications.slack);
  if (notifications.slack?.routes) {
    const cleanRoute = (r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined));
    const routes = notifications.slack.routes;
    const cleanedRoutes = {
      bad: cleanRoute(routes.bad || {}),
      warn: cleanRoute(routes.warn || {}),
      info: cleanRoute(routes.info || {})
    };
    slack.routes = Object.fromEntries(Object.entries(cleanedRoutes).filter(([, v]) => Object.keys(v).length));
  }
  const n = { slack };
  if (Object.keys(s).length) patch.shift = s;
  if (Object.keys(r).length) patch.retention = r;
  if (Object.keys(a).length) patch.alerts = a;
  if (Object.keys(n.slack).length) patch.notifications = n;
  return patch;
}


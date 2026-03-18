import { el } from '../../ui/dom.js';
import { testSlack } from '../../apiClient.js';

export function panelSlack({ state, notifications }) {
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

      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--text-muted);' }, ['Bad (critical)']),
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
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--text-muted);' }, ['Warn']),
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
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--text-muted);' }, ['Info']),
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

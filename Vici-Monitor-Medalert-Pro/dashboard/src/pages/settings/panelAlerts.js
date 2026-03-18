import { el } from '../../ui/dom.js';

export function panelAlerts({ alerts }) {
  return el('div', { class: 'formCols' }, [
    el('div', { class: 'formBlock' }, [
      el('div', { class: 'formBlockTitle' }, ['Detectors (Gateway)']),
      el('div', { class: 'note' }, ['Thresholds used during ingest to create alerts.']),

      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--text-muted);' }, ['Waiting spike']),
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
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--text-muted);' }, ['Purple overload']),
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
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--text-muted);' }, ['Drop% jump']),
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
      ]),

      el('div', { class: 'divider' }, ['']),
      el('div', { class: 'formBlockTitle', style: 'font-size:12px;color:var(--text-muted);' }, ['Proactive staffing']),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Gap min (waiting - ready)']),
        el('input', { id: 'st_al_staff_gap', type: 'number', value: String(alerts.staffingGapMin ?? 5) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Sustain (sec)']),
        el('input', { id: 'st_al_staff_sus', type: 'number', value: String(alerts.staffingSustainSeconds ?? 120) })
      ]),
      el('div', { class: 'formRow' }, [
        el('label', {}, ['Cooldown (sec)']),
        el('input', { id: 'st_al_staff_cd', type: 'number', value: String(alerts.staffingCooldownSeconds ?? 900) })
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

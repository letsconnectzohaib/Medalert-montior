import { el } from '../../ui/dom.js';

export function panelShift({ shift }) {
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
      el('div', { class: 'formBlockTitle' }, ['How it\u2019s used']),
      el('div', { class: 'note' }, [
        'These settings define how snapshots are bucketed into a shift date + local hour for analytics, reports, and alerts.'
      ])
    ])
  ]);
}

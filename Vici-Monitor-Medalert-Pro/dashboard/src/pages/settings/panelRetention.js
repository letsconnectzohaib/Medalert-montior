import { el } from '../../ui/dom.js';

export function panelRetention({ retention }) {
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

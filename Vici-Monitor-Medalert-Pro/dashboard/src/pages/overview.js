function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, String(v));
  }
  for (const c of children) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

const BUCKET_LABELS = [
  ['chatting', 'Chatting (red)'],
  ['email', 'Email (orange)'],
  ['waiting_lt_1m', 'Waiting < 1m (lightblue)'],
  ['waiting_gt_1m', 'Waiting > 1m (blue)'],
  ['waiting_gt_5m', 'Waiting > 5m (midnightblue)'],
  ['oncall_gt_10s', 'On call > 10s (thistle)'],
  ['oncall_gt_1m', 'On call > 1m (violet)'],
  ['oncall_gt_5m', 'On call > 5m (purple)'],
  ['paused_gt_10s', 'Paused > 10s (khaki)'],
  ['paused_gt_1m', 'Paused > 1m (yellow)'],
  ['paused_gt_5m', 'Paused > 5m (olive)'],
  ['threeway_gt_10s', '3-WAY > 10s (lime)'],
  ['deadcall', 'Dead call (black)'],
  ['unknown', 'Unknown']
];

function toCountsFromSnapshot(snap) {
  const counts = {};
  const agents = Array.isArray(snap?.agents) ? snap.agents : [];
  for (const a of agents) {
    const b = a?.stateBucket || 'unknown';
    counts[b] = (counts[b] || 0) + 1;
  }
  return counts;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return false;
  const next = String(value ?? '—');
  if (el.textContent !== next) el.textContent = next;
  return true;
}

// Patch Overview in-place (no re-render). Returns true if Overview DOM exists.
export function patchOverviewDom(state) {
  const snap = state.latestSnapshot;
  if (!snap) return false;
  const ok = document.getElementById('ov_root');
  if (!ok) return false;

  const s = snap?.summary || {};
  const m = snap?.meta || {};
  const counts = toCountsFromSnapshot(snap);

  setText('ov_activeCalls', s.activeCalls ?? 0);
  setText('ov_callsWaiting', s.callsWaiting ?? 0);
  setText('ov_agentsLoggedIn', s.agentsLoggedIn ?? 0);
  setText('ov_agentsInCalls', s.agentsInCalls ?? 0);
  setText('ov_agentsWaiting', s.agentsWaiting ?? 0);
  setText('ov_agentsPaused', s.agentsPaused ?? 0);
  setText('ov_callsToday', m.callsToday ?? 0);
  setText('ov_droppedPercent', m.droppedPercent ?? 0);

  setText('ov_dialLevel', m.dialLevel ?? '—');
  setText('ov_dialableLeads', m.dialableLeads ?? '—');
  const dropped = m?.droppedAnswered?.dropped ?? 0;
  const answered = m?.droppedAnswered?.answered ?? 0;
  setText('ov_droppedAnswered', `${dropped}/${answered}`);
  setText('ov_dialMethod', m.dialMethod || '—');
  setText('ov_reportTime', m.reportTime || '—');

  setText('ov_lastUpdate', `Last update: ${snap.timestamp || '—'} • WS: ${state.wsStatus}`);

  for (const [bucket] of BUCKET_LABELS) {
    setText(`ov_bucket_${bucket}`, counts[bucket] || 0);
  }

  return true;
}

export function renderOverview(state) {
  const snap = state.latestSnapshot;
  const s = snap?.summary || {};
  const m = snap?.meta || {};

  if (!snap) {
    return el('div', { class: 'grid' }, [
      el('section', { class: 'card wide' }, [
        el('div', { class: 'cardTitle' }, ['Waiting for first snapshot…']),
        el('div', { class: 'note' }, [
          `WS status: ${state.wsStatus}. `,
          'Keep the Vicidial realtime report open in a tab and ensure the extension is logged in + publishing.'
        ])
      ])
    ]);
  }

  const counts = toCountsFromSnapshot(snap);

  const summary = el('section', { class: 'card' }, [
    el('div', { class: 'cardTitle' }, ['Summary']),
    el('div', { class: 'kpiGrid' }, [
      metric('Active calls', s.activeCalls ?? 0, 'ov_activeCalls'),
      metric('Calls waiting for agents', s.callsWaiting ?? 0, 'ov_callsWaiting'),
      metric('Agents logged in', s.agentsLoggedIn ?? 0, 'ov_agentsLoggedIn'),
      metric('Agents in calls', s.agentsInCalls ?? 0, 'ov_agentsInCalls'),
      metric('Agents waiting', s.agentsWaiting ?? 0, 'ov_agentsWaiting'),
      metric('Agents paused', s.agentsPaused ?? 0, 'ov_agentsPaused'),
      metric('Calls today', m.callsToday ?? 0, 'ov_callsToday'),
      metric('Dropped %', m.droppedPercent ?? 0, 'ov_droppedPercent')
    ]),
    el('div', { id: 'ov_lastUpdate', class: 'note' }, [`Last update: ${snap.timestamp || '—'} • WS: ${state.wsStatus}`])
  ]);

  const meta = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Meta (Vicidial header)']),
    el('div', { class: 'metaGrid' }, [
      kv('Dial level', m.dialLevel ?? '—', 'ov_dialLevel'),
      kv('Dialable leads', m.dialableLeads ?? '—', 'ov_dialableLeads'),
      kv('Dropped/Answered', `${m?.droppedAnswered?.dropped ?? 0}/${m?.droppedAnswered?.answered ?? 0}`, 'ov_droppedAnswered'),
      kv('Dial method', m.dialMethod || '—', 'ov_dialMethod'),
      kv('Report time', m.reportTime || '—', 'ov_reportTime')
    ])
  ]);

  const buckets = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Agent state buckets']),
    el(
      'div',
      { class: 'buckets' },
      BUCKET_LABELS.map(([bucket, label]) => bucketCard(label, counts[bucket] || 0, `ov_bucket_${bucket}`))
    ),
    el('div', { class: 'note' }, ['Counts computed from snapshot.agents[].stateBucket.'])
  ]);

  return el('div', { id: 'ov_root', class: 'grid' }, [summary, meta, buckets]);
}

function metric(label, value, valueId) {
  return el('div', { class: 'metric' }, [
    el('div', { class: 'k' }, [label]),
    el('div', { id: valueId, class: 'v' }, [String(value)])
  ]);
}

function kv(label, value, valueId) {
  return el('div', { class: 'kv' }, [
    el('div', { class: 'k' }, [label]),
    el('div', { id: valueId, class: 'v' }, [String(value)])
  ]);
}

function bucketCard(label, value, valueId) {
  return el('div', { class: 'bucket' }, [
    el('div', { class: 'k' }, [label]),
    el('div', { id: valueId, class: 'v' }, [String(value)])
  ]);
}


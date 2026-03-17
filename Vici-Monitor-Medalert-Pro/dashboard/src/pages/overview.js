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

  const summary = el('section', { class: 'card' }, [
    el('div', { class: 'cardTitle' }, ['Summary']),
    el('div', { class: 'summary' }, [
      metric('Active calls', s.activeCalls ?? 0),
      metric('Calls waiting for agents', s.callsWaiting ?? 0),
      metric('Agents logged in', s.agentsLoggedIn ?? 0),
      metric('Agents in calls', s.agentsInCalls ?? 0),
      metric('Agents waiting', s.agentsWaiting ?? 0),
      metric('Agents paused', s.agentsPaused ?? 0),
      metric('Calls today', m.callsToday ?? 0),
      metric('Dropped %', m.droppedPercent ?? 0)
    ]),
    el('div', { class: 'note' }, [
      `Last update: ${snap.timestamp || '—'} • WS: ${state.wsStatus}`
    ])
  ]);

  const counts = {};
  const agents = Array.isArray(snap?.agents) ? snap.agents : [];
  for (const a of agents) {
    const b = a?.stateBucket || 'unknown';
    counts[b] = (counts[b] || 0) + 1;
  }

  const buckets = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Agent state buckets']),
    el('div', { class: 'buckets' }, BUCKET_LABELS.map(([bucket, label]) => bucketCard(label, counts[bucket] || 0))),
    el('div', { class: 'note' }, ['Counts computed from snapshot.agents[].stateBucket.'])
  ]);

  return el('div', { class: 'grid' }, [summary, buckets]);
}

function metric(label, value) {
  return el('div', { class: 'metric' }, [
    el('div', { class: 'k' }, [label]),
    el('div', { class: 'v' }, [String(value)])
  ]);
}

function bucketCard(label, value) {
  return el('div', { class: 'bucket' }, [
    el('div', { class: 'k' }, [label]),
    el('div', { class: 'v' }, [String(value)])
  ]);
}


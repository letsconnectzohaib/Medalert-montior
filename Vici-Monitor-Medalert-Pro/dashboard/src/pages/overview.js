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

function setAttr(id, name, value) {
  const el = document.getElementById(id);
  if (!el) return false;
  const next = String(value ?? '');
  if (el.getAttribute(name) !== next) el.setAttribute(name, next);
  return true;
}

function sparkPath(points, width = 220, height = 44, pad = 6) {
  const vals = points.map((p) => Number(p || 0));
  if (!vals.length) return '';
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const n = Math.max(1, vals.length - 1);
  const xFor = (i) => pad + ((width - pad * 2) * i) / n;
  const yFor = (v) => height - pad - ((height - pad * 2) * (v - min)) / span;
  return vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ');
}

function sparkPoints(points, width = 220, height = 44, pad = 6) {
  const vals = points.map((p) => Number(p?.v ?? 0));
  if (!vals.length) return [];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const n = Math.max(1, vals.length - 1);
  const xFor = (i) => pad + ((width - pad * 2) * i) / n;
  const yFor = (v) => height - pad - ((height - pad * 2) * (v - min)) / span;
  return points.map((p, i) => ({ x: xFor(i), y: yFor(Number(p?.v ?? 0)), ts: p.ts, v: Number(p?.v ?? 0) }));
}

function parseIsoMs(ts) {
  const ms = Date.parse(String(ts || ''));
  return Number.isFinite(ms) ? ms : null;
}

const TREND_LS_KEY = 'vmp_trend_window_min';

function getTrendWindowMinutes() {
  try {
    const raw = localStorage.getItem(TREND_LS_KEY);
    const n = Number(raw || 15);
    if (n === 15 || n === 30 || n === 60) return n;
  } catch {}
  return 15;
}

function setTrendWindowMinutes(min) {
  try {
    localStorage.setItem(TREND_LS_KEY, String(min));
  } catch {}
}

function filterWindow(points, windowMinutes = 15) {
  const now = Date.now();
  const cutoff = now - windowMinutes * 60 * 1000;
  return (points || []).filter((p) => {
    const ms = parseIsoMs(p.ts);
    return ms != null && ms >= cutoff && ms <= now + 60 * 1000;
  });
}

function patchSpark(svgId, pathId, dotsId, points, stroke) {
  // Path
  const d = sparkPath(points.map((p) => p.v));
  setAttr(pathId, 'd', d);

  // Dots + tooltips
  const host = document.getElementById(dotsId);
  if (!host) return;
  // Replace children if count changed; otherwise patch attributes/text.
  const pts = sparkPoints(points);
  if (host.childElementCount !== pts.length) {
    host.replaceChildren();
    for (const p of pts) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '2.6');
      c.setAttribute('fill', stroke);
      c.setAttribute('opacity', '0.9');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = `${p.ts} • ${p.v}`;
      c.appendChild(t);
      host.appendChild(c);
    }
  }
  const children = Array.from(host.children);
  for (let i = 0; i < Math.min(children.length, pts.length); i++) {
    const c = children[i];
    const p = pts[i];
    if (c.getAttribute('cx') !== p.x.toFixed(1)) c.setAttribute('cx', p.x.toFixed(1));
    if (c.getAttribute('cy') !== p.y.toFixed(1)) c.setAttribute('cy', p.y.toFixed(1));
    const title = c.querySelector('title');
    const titleText = `${p.ts} • ${p.v}`;
    if (title && title.textContent !== titleText) title.textContent = titleText;
  }
}

function patchTrends(state) {
  const all = Array.isArray(state.recentPoints) ? state.recentPoints : [];
  const win = getTrendWindowMinutes();
  const pts = filterWindow(all, win);
  if (!pts.length) {
    setText('ov_tr_note', 'Waiting for trend data…');
    return;
  }
  const last = pts[pts.length - 1] || {};
  setText('ov_tr_active', last.active ?? 0);
  setText('ov_tr_wait', last.waiting ?? 0);
  setText('ov_tr_purple', last.purple ?? 0);

  patchSpark(
    'ov_svg_active',
    'ov_sp_active',
    'ov_dots_active',
    pts.map((p) => ({ ts: p.ts, v: p.active })),
    '#34d399'
  );
  patchSpark(
    'ov_svg_wait',
    'ov_sp_wait',
    'ov_dots_wait',
    pts.map((p) => ({ ts: p.ts, v: p.waiting })),
    '#60a5fa'
  );
  patchSpark(
    'ov_svg_purple',
    'ov_sp_purple',
    'ov_dots_purple',
    pts.map((p) => ({ ts: p.ts, v: p.purple })),
    '#8b5cf6'
  );

  setText('ov_tr_note', `Last ${win} minutes • ${pts.length} points (in-memory)`);
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

  patchTrends(state);
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

  const pts = Array.isArray(state.recentPoints) ? state.recentPoints : [];
  const last = pts[pts.length - 1] || {};
  const trends = el('section', { class: 'card wide' }, [
    el('div', { class: 'trendTop', style: 'margin-bottom:10px' }, [
      el('div', { class: 'cardTitle', style: 'margin:0' }, ['Trends (live)']),
      el(
        'select',
        {
          id: 'ov_tr_window',
          class: 'inputLike',
          onchange: () => {
            const sel = document.getElementById('ov_tr_window');
            const v = Number(sel?.value || 15);
            setTrendWindowMinutes(v);
            patchTrends(state);
          }
        },
        [
          el('option', { value: '15' }, ['15m']),
          el('option', { value: '30' }, ['30m']),
          el('option', { value: '60' }, ['60m'])
        ]
      )
    ]),
    el('div', { class: 'trendGrid' }, [
      trendCard('Active calls', last.active ?? 0, 'ov_tr_active', 'ov_sp_active', '#34d399'),
      trendCard('Calls waiting', last.waiting ?? 0, 'ov_tr_wait', 'ov_sp_wait', '#60a5fa'),
      trendCard('Purple agents', last.purple ?? 0, 'ov_tr_purple', 'ov_sp_purple', '#8b5cf6')
    ]),
    el('div', { id: 'ov_tr_note', class: 'note' }, [''])
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

  // Ensure trends are drawn on first render as well.
  setTimeout(() => {
    const sel = document.getElementById('ov_tr_window');
    if (sel) sel.value = String(getTrendWindowMinutes());
    patchTrends(state);
  }, 0);
  return el('div', { id: 'ov_root', class: 'grid' }, [summary, meta, trends, buckets]);
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

function trendCard(label, value, valueId, pathId, stroke) {
  // sparkline SVG (path 'd' is patched in patchTrends)
  const width = 220;
  const height = 44;
  const svgId =
    pathId === 'ov_sp_active' ? 'ov_svg_active' : pathId === 'ov_sp_wait' ? 'ov_svg_wait' : 'ov_svg_purple';
  const dotsId =
    pathId === 'ov_sp_active'
      ? 'ov_dots_active'
      : pathId === 'ov_sp_wait'
        ? 'ov_dots_wait'
        : 'ov_dots_purple';
  return el('div', { class: 'trendCard' }, [
    el('div', { class: 'trendTop' }, [
      el('div', { class: 'trendLabel' }, [label]),
      el('div', { id: valueId, class: 'trendValue' }, [String(value)])
    ]),
    el('svg', { id: svgId, class: 'spark', width: String(width), height: String(height), viewBox: `0 0 ${width} ${height}` }, [
      el('path', { id: pathId, d: '', fill: 'none', stroke, 'stroke-width': '2', 'stroke-linecap': 'round' }, []),
      el('g', { id: dotsId }, [])
    ])
  ]);
}

function bucketCard(label, value, valueId) {
  return el('div', { class: 'bucket' }, [
    el('div', { class: 'k' }, [label]),
    el('div', { id: valueId, class: 'v' }, [String(value)])
  ]);
}


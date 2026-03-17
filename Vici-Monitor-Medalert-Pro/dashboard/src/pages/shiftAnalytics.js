import { fetchShiftIntelligence, fetchShiftCallflow } from '../apiClient.js';

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

export function renderShiftAnalytics(state) {
  const wrap = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Shift summary']),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Shift date']),
      el('input', { id: 'shiftDate', type: 'date', value: new Date().toISOString().slice(0, 10) })
    ]),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn primary',
        onclick: async () => {
          const date = document.getElementById('shiftDate').value;
          const [r, c] = await Promise.all([
            fetchShiftIntelligence(state.baseUrl, state.token, date),
            fetchShiftCallflow(state.baseUrl, state.token, date)
          ]);
          const msg = document.getElementById('shiftMsg');
          const out = document.getElementById('shiftOut');
          if (!r.success || !c.success) {
            msg.textContent = !r.success ? r.error || 'Failed to load shift summary.' : c.error || 'Failed to load callflow.';
            out.textContent = '';
            return;
          }
          // Cache the loaded intelligence so live snapshot updates don't clear it.
          state.shiftIntelCache = { date, data: r.data, callflow: c.data };
          renderIntelIntoDom(r.data, c.data);
          msg.textContent = buildMsg(r.data, c.data);
          out.textContent = formatHours(r.data.series || {}, r.data.shiftHours || []);
        }
      }, ['Load summary'])
    ]),
    el('div', { id: 'shiftMsg', class: 'msg' }, ['']),
    el('div', { class: 'historyWrap' }, [
      el('div', { id: 'shiftIntel', class: 'shiftIntel' }, ['']),
      el('pre', { id: 'shiftOut', class: 'history' }, [''])
    ])
  ]);

  // If we already loaded a summary, render it immediately.
  if (state.shiftIntelCache?.data?.success) {
    const { data, callflow } = state.shiftIntelCache;
    setTimeout(() => {
      const msg = document.getElementById('shiftMsg');
      const out = document.getElementById('shiftOut');
      if (!msg || !out) return;
      renderIntelIntoDom(data, callflow);
      msg.textContent = buildMsg(data, callflow);
      out.textContent = formatHours(data.series || {}, data.shiftHours || []);
    }, 0);
  }

  return wrap;
}

function buildMsg(data, callflow) {
  const peak = data?.peakHour;
  const w = data?.shiftWindow;
  const peakText = peak ? `Peak hour: ${peak.hour}:00 (total agents ${peak.total_agents})` : 'No peak hour yet.';
  const windowText = w ? `Shift window: ${w.start} → ${w.end}` : '';
  const peakWait = callflow?.peak?.waiting;
  const peakWaitText = peakWait ? `Peak waiting: ${peakWait.hour}:00 (max waiting ${peakWait.calls_waiting_max})` : '';
  return [windowText, peakText, peakWaitText].filter(Boolean).join(' • ');
}

function renderIntelIntoDom(data, callflow) {
  const host = document.getElementById('shiftIntel');
  if (!host) return;
  host.innerHTML = '';

  const cards = el('div', { class: 'shiftCards' }, [
    statCard('First hour', data?.rollups?.firstHour),
    statCard('Half shift', data?.rollups?.halfShift),
    statCard('Full shift', data?.rollups?.fullShift),
    compareCard('Yesterday (full shift)', data?.compare?.fullShift, data?.rollups?.fullShift)
  ]);
  const chart = timelineChart(data?.series || {}, data?.shiftHours || []);
  const cfCards = callflowCards(callflow);
  const cfChart = callflowChart(callflow);
  host.appendChild(cards);
  host.appendChild(chart);
  if (cfCards) host.appendChild(cfCards);
  if (cfChart) host.appendChild(cfChart);
}

function statCard(title, roll) {
  const totals = roll?.totals || {};
  const total = roll?.totalAgents ?? 0;
  return el('div', { class: 'miniCard' }, [
    el('div', { class: 'miniTitle' }, [title]),
    el('div', { class: 'miniBig' }, [String(total)]),
    el('div', { class: 'miniSub' }, [keyBucketsSummary(totals)])
  ]);
}

function compareCard(title, prev, current) {
  const a = prev?.totalAgents ?? 0;
  const b = current?.totalAgents ?? 0;
  const delta = b - a;
  const sign = delta > 0 ? '+' : '';
  return el('div', { class: 'miniCard' }, [
    el('div', { class: 'miniTitle' }, [title]),
    el('div', { class: 'miniBig' }, [String(a)]),
    el('div', { class: 'miniSub' }, [`Δ vs today: ${sign}${delta}`])
  ]);
}

function callflowCards(callflow) {
  if (!callflow?.success && !callflow?.series) return null;
  const r = callflow?.rollups || {};
  return el('div', { class: 'shiftCards' }, [
    callflowStat('Calls (first hour)', r.firstHour),
    callflowStat('Calls (half shift)', r.halfShift),
    callflowStat('Calls (rest of shift)', r.restOfShift),
    callflowCompare('Yesterday (calls full shift)', callflow?.compare?.fullShift, r.fullShift)
  ]);
}

function callflowStat(title, roll) {
  const avgActive = round1(roll?.active_calls_avg ?? 0);
  const maxActive = roll?.active_calls_max ?? 0;
  const avgWait = round1(roll?.calls_waiting_avg ?? 0);
  const maxWait = roll?.calls_waiting_max ?? 0;
  return el('div', { class: 'miniCard' }, [
    el('div', { class: 'miniTitle' }, [title]),
    el('div', { class: 'miniBig' }, [`${maxWait}`]),
    el('div', { class: 'miniSub' }, [`waiting max=${maxWait} avg=${avgWait} • active max=${maxActive} avg=${avgActive}`])
  ]);
}

function callflowCompare(title, prev, current) {
  const a = prev?.calls_waiting_max ?? 0;
  const b = current?.calls_waiting_max ?? 0;
  const delta = b - a;
  const sign = delta > 0 ? '+' : '';
  return el('div', { class: 'miniCard' }, [
    el('div', { class: 'miniTitle' }, [title]),
    el('div', { class: 'miniBig' }, [String(a)]),
    el('div', { class: 'miniSub' }, [`Δ waiting max vs today: ${sign}${delta}`])
  ]);
}

function round1(x) {
  const n = Number(x || 0);
  return Math.round(n * 10) / 10;
}

function callflowChart(callflow) {
  const rows = callflow?.series || [];
  const shiftHours = callflow?.shiftHours || [];
  if (!rows.length || !shiftHours.length) return null;

  const width = 760;
  const height = 200;
  const pad = 28;

  const maxY = Math.max(
    1,
    ...rows.map((r) => Math.max(Number(r.active_calls_max || 0), Number(r.calls_waiting_max || 0)))
  );

  const svg = el('svg', { class: 'shiftChart', width: String(width), height: String(height), viewBox: `0 0 ${width} ${height}` }, []);
  svg.appendChild(el('line', { x1: pad, y1: height - pad, x2: width - pad, y2: height - pad, stroke: '#2a3550', 'stroke-width': '1' }));

  const xForHour = (h) => {
    const idx = shiftHours.indexOf(Number(h));
    const n = Math.max(1, shiftHours.length - 1);
    return pad + ((width - pad * 2) * idx) / n;
  };
  const yFor = (v) => height - pad - ((height - pad * 2) * Number(v || 0)) / maxY;

  const pointsActive = rows.map((r) => `${xForHour(r.hour)},${yFor(r.active_calls_max)}`).join(' ');
  const pointsWait = rows.map((r) => `${xForHour(r.hour)},${yFor(r.calls_waiting_max)}`).join(' ');

  svg.appendChild(el('polyline', { points: pointsActive, fill: 'none', stroke: '#34d399', 'stroke-width': '2' }));
  svg.appendChild(el('polyline', { points: pointsWait, fill: 'none', stroke: '#60a5fa', 'stroke-width': '2' }));

  // Legend
  svg.appendChild(el('rect', { x: String(pad), y: '10', width: '10', height: '10', fill: '#34d399', rx: '2' }));
  svg.appendChild(el('text', { x: String(pad + 14), y: '19', fill: '#cbd5e1', 'font-size': '11' }, ['active (max)']));
  svg.appendChild(el('rect', { x: String(pad + 120), y: '10', width: '10', height: '10', fill: '#60a5fa', rx: '2' }));
  svg.appendChild(el('text', { x: String(pad + 134), y: '19', fill: '#cbd5e1', 'font-size': '11' }, ['waiting (max)']));

  // Hour labels
  shiftHours.forEach((h) => {
    const x = xForHour(h);
    svg.appendChild(el('text', { x: String(x), y: String(height - 10), fill: '#9ca3af', 'font-size': '10', 'text-anchor': 'middle' }, [String(h)]));
  });

  return svg;
}

function keyBucketsSummary(totals) {
  const purple = totals.oncall_gt_5m || 0;
  const violet = totals.oncall_gt_1m || 0;
  const blue = totals.waiting_gt_1m || 0;
  const inCall = totals.in_call || 0;
  const ready = totals.ready || 0;
  return `purple>${purple} violet>${violet} blue>${blue} in-call>${inCall} ready>${ready}`;
}

function fmtHour(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

function timelineChart(series, shiftHours) {
  const width = 760;
  const height = 180;
  const pad = 28;
  const barW = Math.max(14, Math.floor((width - pad * 2) / Math.max(1, shiftHours.length)) - 6);

  const palette = [
    { key: 'oncall_gt_5m', label: 'purple', color: '#8b5cf6' },
    { key: 'oncall_gt_1m', label: 'violet', color: '#a78bfa' },
    { key: 'waiting_gt_1m', label: 'blue', color: '#60a5fa' },
    { key: 'in_call', label: 'in-call', color: '#34d399' },
    { key: 'ready', label: 'ready', color: '#fbbf24' },
    { key: 'unknown', label: 'unknown', color: '#9ca3af' }
  ];

  const maxTotal = Math.max(
    1,
    ...shiftHours.map((h) => {
      const row = series?.[h] || {};
      return Object.values(row).reduce((a, b) => a + Number(b || 0), 0);
    })
  );

  const svg = el('svg', { class: 'shiftChart', width: String(width), height: String(height), viewBox: `0 0 ${width} ${height}` }, []);

  // Axes baseline
  svg.appendChild(el('line', { x1: pad, y1: height - pad, x2: width - pad, y2: height - pad, stroke: '#2a3550', 'stroke-width': '1' }));

  shiftHours.forEach((h, i) => {
    const row = series?.[h] || {};
    const total = Object.values(row).reduce((a, b) => a + Number(b || 0), 0);
    let y = height - pad;
    const x = pad + i * (barW + 6);
    const barH = Math.round(((height - pad * 2) * total) / maxTotal);

    // background bar
    svg.appendChild(el('rect', { x: String(x), y: String(height - pad - barH), width: String(barW), height: String(barH), fill: '#111827', opacity: '0.35', rx: '3' }));

    let used = 0;
    for (const p of palette) {
      const v = Number(row[p.key] || 0);
      if (!v) continue;
      const seg = Math.max(1, Math.round((barH * v) / Math.max(1, total)));
      used += seg;
      const segH = used > barH ? seg - (used - barH) : seg;
      if (segH <= 0) continue;
      y -= segH;
      svg.appendChild(el('rect', { x: String(x), y: String(y), width: String(barW), height: String(segH), fill: p.color, rx: '3' }));
    }

    // hour label (every bar)
    svg.appendChild(el('text', { x: String(x + barW / 2), y: String(height - 10), fill: '#9ca3af', 'font-size': '10', 'text-anchor': 'middle' }, [String(h)]));

    // tooltip via title
    const title = el('title', {}, [`${fmtHour(h)} total=${total}`]);
    svg.appendChild(title);
  });

  // Legend
  let lx = pad;
  const ly = 14;
  for (const p of palette.slice(0, 5)) {
    svg.appendChild(el('rect', { x: String(lx), y: String(ly), width: '10', height: '10', fill: p.color, rx: '2' }));
    svg.appendChild(el('text', { x: String(lx + 14), y: String(ly + 9), fill: '#cbd5e1', 'font-size': '11' }, [p.label]));
    lx += 90;
  }

  return svg;
}

function formatHours(series, shiftHours) {
  const keys = (shiftHours?.length ? shiftHours : Object.keys(series)).map((x) => Number(x));
  const uniq = [...new Set(keys)].sort((a, b) => a - b);
  if (!uniq.length) return 'No hourly buckets yet.';
  return uniq
    .map((h) => {
      const b = series[h] || {};
      return `${fmtHour(h)} | purple(oncall>5m)=${b.oncall_gt_5m || 0} violet(oncall>1m)=${b.oncall_gt_1m || 0} blue(wait>1m)=${b.waiting_gt_1m || 0} in_call=${b.in_call || 0} ready=${b.ready || 0}`;
    })
    .join('\n');
}


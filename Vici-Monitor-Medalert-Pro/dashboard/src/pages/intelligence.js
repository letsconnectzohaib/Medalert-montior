import { fetchIntelligenceInsights } from '../apiClient.js';

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

function insightTitle(i) {
  if (i.kind === 'first_hour_rush') return 'First hour rush';
  if (i.kind === 'peak_hour_consistency') return 'Peak hour consistency (30d)';
  if (i.kind === 'proactive_staffing') return 'Proactive staffing';
  return i.kind || 'Insight';
}

function sev(kind, i) {
  if (kind === 'proactive_staffing') {
    return i.risk === 'HIGH' ? 'bad' : i.risk === 'ELEVATED' ? 'warn' : 'good';
  }
  if (kind === 'first_hour_rush') return i.isRush ? 'warn' : 'good';
  return 'good';
}

function badge(kind) {
  return el('span', { class: `badge ${kind}` }, [String(kind)]);
}

function card(i) {
  const kind = i?.kind || 'insight';
  const s = sev(kind, i);
  const headline =
    i?.message || i?.detail || i?.note || (i?.ok === false ? 'Insight failed.' : 'No details yet.');

  const extra = [];
  if (kind === 'peak_hour_consistency' && i?.peakHour != null) {
    extra.push(`Peak hour: ${String(i.peakHour).padStart(2, '0')}:00`);
    if (i.confidencePct != null) extra.push(`Confidence: ${i.confidencePct}%`);
  }
  if (kind === 'first_hour_rush' && i?.intensityPct != null) {
    extra.push(`Intensity: ${i.intensityPct}%`);
  }
  if (kind === 'proactive_staffing') {
    if (i?.suggestedAgents != null) extra.push(`Suggested add: ${i.suggestedAgents}`);
    if (i?.risk) extra.push(`Risk: ${i.risk}`);
    if (i?.etaLocalTime) extra.push(`ETA spike: ${i.etaLocalTime}`);
  }

  return el('div', { class: 'formBlock' }, [
    el('div', { class: 'trendTop' }, [
      el('div', { class: 'formBlockTitle', style: 'margin:0' }, [insightTitle(i)]),
      badge(s)
    ]),
    el('div', { class: 'note' }, [headline]),
    extra.length ? el('div', { class: 'note' }, [extra.join(' • ')]) : el('div', { class: 'note' }, [''])
  ]);
}

export function renderIntelligence(state) {
  const today = new Date().toISOString().slice(0, 10);
  const wrap = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Intelligence']),
    el('div', { class: 'note' }, ['Phase 1 insights (foundation): rush detection, peak consistency, staffing suggestions.']),
    el('div', { class: 'formCols' }, [
      el('div', { class: 'formBlock' }, [
        el('div', { class: 'formBlockTitle' }, ['Controls']),
        el('div', { class: 'formRow' }, [
          el('label', {}, ['Shift date']),
          el('input', { id: 'in_date', type: 'date', value: today })
        ]),
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn primary', onclick: async () => refresh(state) }, ['Refresh'])
        ]),
        el('div', { id: 'in_msg', class: 'msg' }, [''])
      ]),
      el('div', { class: 'formBlock' }, [
        el('div', { class: 'formBlockTitle' }, ['Results']),
        el('div', { id: 'in_cards', class: 'formCols' }, [])
      ])
    ])
  ]);

  setTimeout(() => refresh(state), 0);
  return wrap;
}

async function refresh(state) {
  const date = document.getElementById('in_date')?.value;
  const msg = document.getElementById('in_msg');
  const host = document.getElementById('in_cards');
  if (!msg || !host) return;
  msg.textContent = 'Loading…';
  host.replaceChildren();

  const r = await fetchIntelligenceInsights(state.baseUrl, state.token, date);
  if (!r.success) {
    msg.textContent = `Failed: ${r.error}`;
    return;
  }
  msg.textContent = `Loaded ${r.data?.insights?.length || 0} insights.`;
  const insights = Array.isArray(r.data?.insights) ? r.data.insights : [];
  if (!insights.length) {
    host.appendChild(el('div', { class: 'note' }, ['No insights yet.']));
    return;
  }

  // Render in a 2-col grid by reusing .formCols
  const grid = el('div', { class: 'formCols' }, insights.map((i) => card(i)));
  host.replaceChildren(grid);
}


import { normalizeBaseUrl } from '../apiClient.js';

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
          const res = await fetch(`${normalizeBaseUrl(state.baseUrl)}/api/shift/summary?date=${encodeURIComponent(date)}`);
          const json = await res.json().catch(() => null);
          const msg = document.getElementById('shiftMsg');
          const out = document.getElementById('shiftOut');
          if (!json?.success) {
            msg.textContent = json?.error || 'Failed to load shift summary.';
            out.textContent = '';
            return;
          }
          // Cache the loaded summary so live snapshot updates don't clear it.
          state.shiftSummaryCache = { date, data: json };
          msg.textContent = json.peakHour ? `Peak hour: ${json.peakHour.hour}:00 (total agents ${json.peakHour.total_agents})` : 'No peak hour yet.';
          out.textContent = formatHours(json.hours || {});
        }
      }, ['Load summary'])
    ]),
    el('div', { id: 'shiftMsg', class: 'msg' }, ['']),
    el('div', { class: 'historyWrap' }, [
      el('pre', { id: 'shiftOut', class: 'history' }, [''])
    ])
  ]);

  // If we already loaded a summary, render it immediately.
  if (state.shiftSummaryCache?.data?.success) {
    const { data } = state.shiftSummaryCache;
    setTimeout(() => {
      const msg = document.getElementById('shiftMsg');
      const out = document.getElementById('shiftOut');
      if (!msg || !out) return;
      msg.textContent = data.peakHour ? `Peak hour: ${data.peakHour.hour}:00 (total agents ${data.peakHour.total_agents})` : 'No peak hour yet.';
      out.textContent = formatHours(data.hours || {});
    }, 0);
  }

  return wrap;
}

function formatHours(hours) {
  const keys = Object.keys(hours).sort((a, b) => Number(a) - Number(b));
  if (!keys.length) return 'No hourly buckets yet.';
  return keys
    .map((h) => {
      const b = hours[h] || {};
      return `${h}:00 | purple(oncall>5m)=${b.oncall_gt_5m || 0} violet(oncall>1m)=${b.oncall_gt_1m || 0} blue(wait>1m)=${b.waiting_gt_1m || 0}`;
    })
    .join('\n');
}


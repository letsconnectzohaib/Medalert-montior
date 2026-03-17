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

async function fetchShiftReportHtml(baseUrl, token, date) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/reports/shift?date=${encodeURIComponent(date)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  const html = await res.text();
  return { success: true, html };
}

function openHtmlInNewTab(html) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

function downloadHtml(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function fetchReportList(baseUrl, token, limit = 50) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/reports?kind=shift&limit=${encodeURIComponent(String(limit))}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, reports: json.reports || [] };
}

async function generateAndStore(baseUrl, token, date) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/reports/shift/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ date })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, report: json.report };
}

async function downloadStoredReport(baseUrl, token, id) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/reports/${encodeURIComponent(String(id))}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const m = cd.match(/filename="([^"]+)"/);
  const filename = m ? m[1] : `report_${id}.html`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { success: true };
}

export function renderReports(state) {
  const today = new Date().toISOString().slice(0, 10);

  const section = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Reports']),
    el('div', { class: 'note' }, ['Generate a printable shift report (HTML). PDF export can be added next.']),
    el('div', { class: 'formRow' }, [
      el('label', {}, ['Shift date']),
      el('input', { id: 'rp_date', type: 'date', value: today })
    ]),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn primary',
        onclick: async () => {
          const date = document.getElementById('rp_date').value;
          const msg = document.getElementById('rp_msg');
          msg.textContent = 'Generating…';
          const r = await fetchShiftReportHtml(state.baseUrl, state.token, date);
          if (!r.success) {
            msg.textContent = `Failed: ${r.error}`;
            return;
          }
          const ok = openHtmlInNewTab(r.html);
          msg.textContent = ok ? 'Opened in new tab.' : 'Popup blocked. Use Download instead.';
        }
      }, ['Open report']),
      el('button', {
        class: 'btn',
        onclick: async () => {
          const date = document.getElementById('rp_date').value;
          const msg = document.getElementById('rp_msg');
          msg.textContent = 'Generating & storing…';
          const r = await generateAndStore(state.baseUrl, state.token, date);
          if (!r.success) {
            msg.textContent = `Failed: ${r.error}`;
            return;
          }
          msg.textContent = `Stored report #${r.report?.id || '—'}. Refreshing list…`;
          await refreshList(state);
          msg.textContent = 'Stored and refreshed.';
        }
      }, ['Generate & store']),
      el('button', {
        class: 'btn',
        onclick: async () => {
          const date = document.getElementById('rp_date').value;
          const msg = document.getElementById('rp_msg');
          msg.textContent = 'Generating…';
          const r = await fetchShiftReportHtml(state.baseUrl, state.token, date);
          if (!r.success) {
            msg.textContent = `Failed: ${r.error}`;
            return;
          }
          downloadHtml(`shift_report_${date}.html`, r.html);
          msg.textContent = 'Downloaded.';
        }
      }, ['Download HTML'])
    ]),
    el('div', { id: 'rp_msg', class: 'msg' }, ['']),
    el('div', { class: 'divider' }, ['']),
    el('div', { class: 'cardTitle' }, ['History']),
    el('div', { class: 'note' }, ['Stored reports generated on-demand or via scheduler.']),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn', onclick: async () => refreshList(state) }, ['Refresh list'])
    ]),
    el('div', { id: 'rp_hist_msg', class: 'msg' }, ['']),
    el('div', { id: 'rp_hist', class: 'historyWrap' }, ['Loading…'])
  ]);

  setTimeout(() => refreshList(state), 0);
  return section;
}

async function refreshList(state) {
  const host = document.getElementById('rp_hist');
  const msg = document.getElementById('rp_hist_msg');
  if (!host || !msg) return;
  msg.textContent = 'Loading…';
  const r = await fetchReportList(state.baseUrl, state.token, 50);
  if (!r.success) {
    msg.textContent = `Failed: ${r.error}`;
    host.textContent = '';
    return;
  }
  msg.textContent = `Loaded ${r.reports.length} reports.`;

  const table = el('table', {}, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', {}, ['ID']),
        el('th', {}, ['Shift date']),
        el('th', {}, ['Created']),
        el('th', {}, ['Format']),
        el('th', {}, ['Actions'])
      ])
    ]),
    el('tbody', {}, r.reports.map((rep) => {
      const id = rep.id;
      return el('tr', {}, [
        el('td', {}, [String(id)]),
        el('td', {}, [String(rep.shift_date || '—')]),
        el('td', {}, [String(rep.created_at || '—')]),
        el('td', {}, [String(rep.format || '—')]),
        el('td', {}, [
          el('button', {
            class: 'btn',
            onclick: async () => {
              const m = document.getElementById('rp_hist_msg');
              m.textContent = `Downloading #${id}…`;
              const d = await downloadStoredReport(state.baseUrl, state.token, id);
              m.textContent = d.success ? 'Downloaded.' : `Failed: ${d.error}`;
            }
          }, ['Download'])
        ])
      ]);
    }))
  ]);
  host.replaceChildren(table);
}


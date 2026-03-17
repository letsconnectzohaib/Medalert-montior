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

async function api(state, path, opts = {}) {
  const base = normalizeBaseUrl(state.baseUrl);
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.token}`,
      ...(opts.headers || {})
    }
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

export function renderAdvancedDb(state) {
  const msg = el('div', { class: 'msg', id: 'adb_msg' }, ['']);
  const tablesSel = el('select', { id: 'adb_tables', class: 'select' }, []);
  const infoPre = el('pre', { class: 'history', id: 'adb_info' }, ['Select a table to view schema.']);
  const rowsPre = el('pre', { class: 'history', id: 'adb_rows' }, ['']);

  const filterRow = el('div', { class: 'formRow' }, [
    el('label', {}, ['Filter']),
    el('div', {}, [
      el('input', { id: 'adb_col', placeholder: 'column (e.g. shift_date)' }),
      el('div', { style: 'height:8px' }),
      el('select', { id: 'adb_op', class: 'select' }, [
        el('option', { value: 'eq' }, ['equals']),
        el('option', { value: 'like' }, ['contains']),
        el('option', { value: 'gt' }, ['greater than']),
        el('option', { value: 'lt' }, ['less than'])
      ]),
      el('div', { style: 'height:8px' }),
      el('input', { id: 'adb_val', placeholder: 'value' })
    ])
  ]);

  const limitRow = el('div', { class: 'formRow' }, [
    el('label', {}, ['Limit / Offset']),
    el('div', {}, [
      el('input', { id: 'adb_limit', type: 'number', value: '50', min: '1', max: '500' }),
      el('div', { style: 'height:8px' }),
      el('input', { id: 'adb_offset', type: 'number', value: '0', min: '0' })
    ])
  ]);

  async function loadTables() {
    try {
      msg.textContent = 'Loading tables…';
      const data = await api(state, '/api/admin/db/tables');
      tablesSel.replaceChildren(el('option', { value: '' }, ['Select table…']));
      for (const t of data.tables || []) tablesSel.appendChild(el('option', { value: t }, [t]));
      msg.textContent = '';
    } catch (e) {
      msg.textContent = e?.message || 'Failed to load tables.';
    }
  }

  async function loadInfo(table) {
    if (!table) return;
    try {
      const data = await api(state, `/api/admin/db/table/${encodeURIComponent(table)}/info`);
      infoPre.textContent = JSON.stringify(data.info, null, 2);
    } catch (e) {
      infoPre.textContent = e?.message || 'Failed to load table info.';
    }
  }

  async function loadRows() {
    const table = tablesSel.value;
    if (!table) return;
    const limit = document.getElementById('adb_limit').value;
    const offset = document.getElementById('adb_offset').value;
    const col = document.getElementById('adb_col').value.trim();
    const op = document.getElementById('adb_op').value;
    const val = document.getElementById('adb_val').value;

    const qs = new URLSearchParams({ limit, offset });
    if (col) {
      qs.set('column', col);
      qs.set('op', op);
      qs.set('value', val);
    }

    try {
      msg.textContent = 'Loading rows…';
      const data = await api(state, `/api/admin/db/table/${encodeURIComponent(table)}/rows?${qs.toString()}`);
      rowsPre.textContent = JSON.stringify({ count: data.count, limit: data.limit, offset: data.offset, rows: data.rows }, null, 2);
      msg.textContent = '';
    } catch (e) {
      rowsPre.textContent = e?.message || 'Failed to load rows.';
      msg.textContent = e?.message || 'Failed to load rows.';
    }
  }

  async function clearDbFlow() {
    try {
      msg.textContent = 'Preparing clear…';
      const prep = await api(state, '/api/admin/db/clear/prepare', { method: 'POST', body: '{}' });
      msg.textContent = `To clear data, type ${prep.phrase} and confirm.`;
      const phrase = prompt(`Type ${prep.phrase} to confirm clearing ALL data (tables remain).`);
      if (!phrase) return;
      const res = await api(state, '/api/admin/db/clear/confirm', {
        method: 'POST',
        body: JSON.stringify({ nonce: prep.nonce, phrase })
      });
      msg.textContent = res.success ? 'Data cleared (tables kept).' : 'Clear failed.';
      rowsPre.textContent = '';
      infoPre.textContent = '';
      await loadTables();
    } catch (e) {
      msg.textContent = e?.message || 'Clear failed.';
    }
  }

  tablesSel.addEventListener('change', async () => {
    await loadInfo(tablesSel.value);
    await loadRows();
  });

  const wrap = el('div', { class: 'grid' }, [
    el('section', { class: 'card' }, [
      el('div', { class: 'cardTitle' }, ['Database explorer']),
      msg,
      el('div', { class: 'formRow' }, [el('label', {}, ['Table']), tablesSel]),
      filterRow,
      limitRow,
      el('div', { class: 'actions' }, [
        el('button', { type: 'button', class: 'btn', onclick: loadRows }, ['Run query']),
        el('button', { type: 'button', class: 'btn', onclick: loadTables }, ['Refresh tables'])
      ]),
      el('div', { class: 'actions' }, [
        el('button', { type: 'button', class: 'btn', onclick: clearDbFlow }, ['Clear DB data (safe)'])
      ]),
      el('div', { class: 'note' }, ['This is read-only browsing + safe clearing. No tables are dropped.'])
    ]),
    el('section', { class: 'card' }, [
      el('div', { class: 'cardTitle' }, ['Table info']),
      el('div', { class: 'historyWrap' }, [infoPre])
    ]),
    el('section', { class: 'card wide' }, [
      el('div', { class: 'cardTitle' }, ['Rows']),
      el('div', { class: 'historyWrap' }, [rowsPre])
    ])
  ]);

  loadTables();
  return wrap;
}


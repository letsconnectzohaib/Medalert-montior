import { normalizeBaseUrl } from '../apiClient.js';
import { el } from '../ui/dom.js';

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
  const infoHost = el('div', { id: 'adb_info', class: 'tableWrap' }, ['Select a table to view schema.']);
  const rowsHost = el('div', { id: 'adb_rows', class: 'tableWrap' }, ['']);

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
      renderSchemaTable(infoHost, data.info);
    } catch (e) {
      infoHost.textContent = e?.message || 'Failed to load table info.';
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
      renderRowsTable(rowsHost, data.rows || [], {
        count: data.count ?? (data.rows || []).length,
        limit: data.limit ?? Number(limit),
        offset: data.offset ?? Number(offset)
      });
      msg.textContent = '';
    } catch (e) {
      rowsHost.textContent = e?.message || 'Failed to load rows.';
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
      rowsHost.textContent = '';
      infoHost.textContent = '';
      await loadTables();
    } catch (e) {
      msg.textContent = e?.message || 'Clear failed.';
    }
  }

  tablesSel.addEventListener('change', async () => {
    await loadInfo(tablesSel.value);
    await loadRows();
  });

  const wrap = el('section', { class: 'card wide' }, [
    el('div', { class: 'cardTitle' }, ['Advanced → Database explorer']),
    el('div', { class: 'note' }, ['Browse SQLite tables, inspect schema, and run safe filtered queries.']),
    msg,
    el('div', { class: 'formCols' }, [
      el('div', { class: 'formBlock' }, [
        el('div', { class: 'formBlockTitle' }, ['Query builder']),
        el('div', { class: 'formRow' }, [el('label', {}, ['Table']), tablesSel]),
        filterRow,
        limitRow,
        el('div', { class: 'actions' }, [
          el('button', { type: 'button', class: 'btn primary', onclick: loadRows }, ['Run query']),
          el('button', { type: 'button', class: 'btn', onclick: loadTables }, ['Refresh tables'])
        ]),
        el('div', { class: 'divider' }, ['']),
        el('div', { class: 'formBlockTitle' }, ['Maintenance']),
        el('div', { class: 'actions' }, [
          el('button', { type: 'button', class: 'btn', onclick: clearDbFlow }, ['Clear DB data (safe)'])
        ]),
        el('div', { class: 'note' }, ['This clears rows only. No tables are dropped.'])
      ]),
      el('div', { class: 'formBlock' }, [
        el('div', { class: 'formBlockTitle' }, ['Table schema']),
        infoHost,
        el('div', { class: 'divider' }, ['']),
        el('div', { class: 'formBlockTitle' }, ['Rows']),
        rowsHost
      ])
    ])
  ]);

  loadTables();
  return wrap;
}

function renderSchemaTable(host, info) {
  if (!host) return;
  const cols = Array.isArray(info?.columns) ? info.columns : [];
  if (!cols.length) {
    host.textContent = 'No schema info.';
    return;
  }

  const table = el('table', {}, [
    el('thead', {}, [
      el('tr', {}, [el('th', {}, ['Column']), el('th', {}, ['Type']), el('th', {}, ['PK']), el('th', {}, ['Nullable']), el('th', {}, ['Default'])])
    ]),
    el(
      'tbody',
      {},
      cols.map((c) =>
        el('tr', {}, [
          el('td', {}, [String(c.name ?? '—')]),
          el('td', {}, [String(c.type ?? '—')]),
          el('td', {}, [String(c.pk ? 'yes' : '')]),
          el('td', {}, [String(c.notnull ? 'no' : 'yes')]),
          el('td', {}, [String(c.dflt_value ?? '')])
        ])
      )
    )
  ]);
  host.replaceChildren(table);
}

function renderRowsTable(host, rows, meta) {
  if (!host) return;
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    host.textContent = 'No rows matched.';
    return;
  }

  const keys = Object.keys(list[0] || {});
  const headerNote = el('div', { class: 'note' }, [
    `Rows: ${meta?.count ?? list.length} • limit=${meta?.limit ?? list.length} • offset=${meta?.offset ?? 0}`
  ]);

  const table = el('table', {}, [
    el('thead', {}, [el('tr', {}, keys.map((k) => el('th', {}, [k])))]),
    el(
      'tbody',
      {},
      list.map((r) => el('tr', {}, keys.map((k) => el('td', {}, [String(r?.[k] ?? '')]))))
    )
  ]);

  host.replaceChildren(headerNote, table);
}


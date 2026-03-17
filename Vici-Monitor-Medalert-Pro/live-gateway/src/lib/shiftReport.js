const { buildShiftHours, sumCountsForHours, totalAgents, sumCallflowRows, ymdAddDays } = require('./shiftMath');

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmt(n, digits = 1) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const p = 10 ** digits;
  return String(Math.round(x * p) / p);
}

function hourLabel(h) {
  const hh = String(Number(h)).padStart(2, '0');
  return `${hh}:00`;
}

function buildCallflowSeriesMap(rows) {
  const byHour = {};
  for (const r of rows || []) byHour[Number(r.hour)] = r;
  return byHour;
}

function simpleBar(width, value, max, color) {
  const w = max > 0 ? Math.max(0, Math.min(width, Math.round((width * value) / max))) : 0;
  return `<div class="barWrap"><div class="bar" style="width:${w}px;background:${color}"></div></div>`;
}

function renderHtml({ shiftDate, shiftWindow, shiftHours, bucketsSeries, callflowRows, peaks, rollups, compare }) {
  const title = `Shift Report — ${shiftDate}`;
  const cfByHour = buildCallflowSeriesMap(callflowRows);
  const maxWait = Math.max(0, ...callflowRows.map((r) => Number(r.calls_waiting_max || 0)));
  const maxActive = Math.max(0, ...callflowRows.map((r) => Number(r.active_calls_max || 0)));

  const topKpis = [
    { k: 'Shift window', v: `${shiftWindow.start} → ${shiftWindow.end}` },
    { k: 'Peak waiting hour', v: peaks.waiting ? `${hourLabel(peaks.waiting.hour)} (max waiting ${peaks.waiting.calls_waiting_max})` : '—' },
    { k: 'Peak agents hour', v: peaks.agents ? `${hourLabel(peaks.agents.hour)} (total agents ${peaks.agents.total_agents})` : '—' },
    { k: 'Full shift waiting max', v: String(rollups.callflow.fullShift.calls_waiting_max ?? 0) },
    { k: 'Full shift active max', v: String(rollups.callflow.fullShift.active_calls_max ?? 0) },
    { k: 'Full shift waiting avg', v: fmt(rollups.callflow.fullShift.calls_waiting_avg ?? 0, 1) },
    { k: 'Full shift active avg', v: fmt(rollups.callflow.fullShift.active_calls_avg ?? 0, 1) }
  ];

  const bucketKeys = ['oncall_gt_5m', 'oncall_gt_1m', 'waiting_gt_1m', 'waiting_gt_5m', 'paused_gt_1m', 'in_call', 'ready', 'unknown'];
  const bucketLabel = (k) =>
    k === 'oncall_gt_5m'
      ? 'purple (oncall>5m)'
      : k === 'oncall_gt_1m'
        ? 'violet (oncall>1m)'
        : k === 'waiting_gt_5m'
          ? 'midnightblue (wait>5m)'
          : k === 'waiting_gt_1m'
            ? 'blue (wait>1m)'
            : k === 'paused_gt_1m'
              ? 'yellow (paused>1m)'
              : k;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    :root{--bg:#0b1020;--panel:#101a33;--text:#e9f0ff;--muted:#a9b7d4;--border:rgba(255,255,255,.10);--good:#34d399;--blue:#60a5fa;--violet:#a78bfa;}
    @media print { body{background:#fff;color:#111} .card{break-inside:avoid} }
    body{margin:0;font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial; background:var(--bg); color:var(--text); padding:18px;}
    .wrap{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:12px;}
    .title{font-weight:950;font-size:20px;}
    .sub{color:var(--muted);margin-top:4px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
    .card{border:1px solid var(--border); background:linear-gradient(180deg,var(--panel),rgba(0,0,0,.18)); border-radius:14px; padding:12px;}
    .kpi{display:flex;justify-content:space-between;gap:12px;border-bottom:1px dashed rgba(255,255,255,.10);padding:6px 0;}
    .kpi:last-child{border-bottom:none}
    .k{color:var(--muted)}
    .v{font-weight:900}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border-bottom:1px solid rgba(255,255,255,.08);padding:6px 6px;text-align:left}
    th{color:var(--muted);font-weight:800}
    .barWrap{height:8px;width:140px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden}
    .bar{height:8px;border-radius:999px}
    .pill{display:inline-block;border:1px solid var(--border);padding:4px 8px;border-radius:999px;color:var(--muted);font-size:11px}
    .miniGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .miniTitle{color:var(--muted);font-size:12px}
    .miniBig{font-size:18px;font-weight:950;margin-top:6px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="title">${esc(title)}</div>
      <div class="sub">Generated at ${esc(new Date().toISOString())} • <span class="pill">Pro</span></div>
    </div>

    <div class="grid">
      <div class="card">
        <div style="font-weight:900;margin-bottom:8px">KPIs</div>
        ${topKpis.map((x) => `<div class="kpi"><div class="k">${esc(x.k)}</div><div class="v">${esc(x.v)}</div></div>`).join('')}
      </div>

      <div class="card">
        <div style="font-weight:900;margin-bottom:8px">Agent buckets (rollups)</div>
        <div class="miniGrid">
          <div><div class="miniTitle">First hour</div><div class="miniBig">${esc(String(rollups.buckets.firstHour.totalAgents ?? 0))}</div><div class="sub">${esc(bucketKeys.slice(0,4).map((k)=>`${bucketLabel(k)}=${rollups.buckets.firstHour.totals?.[k]||0}`).join(' • '))}</div></div>
          <div><div class="miniTitle">Half shift</div><div class="miniBig">${esc(String(rollups.buckets.halfShift.totalAgents ?? 0))}</div><div class="sub">${esc(bucketKeys.slice(0,4).map((k)=>`${bucketLabel(k)}=${rollups.buckets.halfShift.totals?.[k]||0}`).join(' • '))}</div></div>
          <div><div class="miniTitle">Full shift</div><div class="miniBig">${esc(String(rollups.buckets.fullShift.totalAgents ?? 0))}</div><div class="sub">${esc(bucketKeys.slice(0,4).map((k)=>`${bucketLabel(k)}=${rollups.buckets.fullShift.totals?.[k]||0}`).join(' • '))}</div></div>
          <div><div class="miniTitle">Yesterday (full)</div><div class="miniBig">${esc(String(compare.buckets.prevFull.totalAgents ?? 0))}</div><div class="sub">Δ total agents: ${esc(String((rollups.buckets.fullShift.totalAgents ?? 0) - (compare.buckets.prevFull.totalAgents ?? 0)))}</div></div>
        </div>
      </div>

      <div class="card">
        <div style="font-weight:900;margin-bottom:8px">Call-flow (rollups)</div>
        <div class="miniGrid">
          <div><div class="miniTitle">First hour</div><div class="miniBig">${esc(String(rollups.callflow.firstHour.calls_waiting_max ?? 0))}</div><div class="sub">waiting max • active max ${esc(String(rollups.callflow.firstHour.active_calls_max ?? 0))}</div></div>
          <div><div class="miniTitle">Half shift</div><div class="miniBig">${esc(String(rollups.callflow.halfShift.calls_waiting_max ?? 0))}</div><div class="sub">waiting avg ${esc(fmt(rollups.callflow.halfShift.calls_waiting_avg ?? 0, 1))}</div></div>
          <div><div class="miniTitle">Rest of shift</div><div class="miniBig">${esc(String(rollups.callflow.rest.calls_waiting_max ?? 0))}</div><div class="sub">active avg ${esc(fmt(rollups.callflow.rest.active_calls_avg ?? 0, 1))}</div></div>
          <div><div class="miniTitle">Yesterday (full)</div><div class="miniBig">${esc(String(compare.callflow.prevFull.calls_waiting_max ?? 0))}</div><div class="sub">Δ waiting max: ${esc(String((rollups.callflow.fullShift.calls_waiting_max ?? 0) - (compare.callflow.prevFull.calls_waiting_max ?? 0)))}</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="font-weight:900;margin-bottom:8px">Hourly call-flow</div>
      <table>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Waiting (max)</th>
            <th></th>
            <th>Active (max)</th>
            <th></th>
            <th>Waiting (avg)</th>
            <th>Active (avg)</th>
            <th>Samples</th>
          </tr>
        </thead>
        <tbody>
          ${shiftHours
            .map((h) => {
              const r = cfByHour[Number(h)] || {};
              const wMax = Number(r.calls_waiting_max || 0);
              const aMax = Number(r.active_calls_max || 0);
              return `<tr>
                <td>${esc(hourLabel(h))}</td>
                <td>${esc(String(wMax))}</td>
                <td>${simpleBar(140, wMax, maxWait || 1, 'var(--blue)')}</td>
                <td>${esc(String(aMax))}</td>
                <td>${simpleBar(140, aMax, maxActive || 1, 'var(--good)')}</td>
                <td>${esc(fmt(r.calls_waiting_avg || 0, 1))}</td>
                <td>${esc(fmt(r.active_calls_avg || 0, 1))}</td>
                <td>${esc(String(r.samples || 0))}</td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div style="font-weight:900;margin-bottom:8px">Hourly agent buckets (selected)</div>
      <table>
        <thead>
          <tr>
            <th>Hour</th>
            ${bucketKeys.map((k) => `<th>${esc(bucketLabel(k))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${shiftHours
            .map((h) => {
              const row = bucketsSeries?.[Number(h)] || {};
              return `<tr>
                <td>${esc(hourLabel(h))}</td>
                ${bucketKeys.map((k) => `<td>${esc(String(row[k] || 0))}</td>`).join('')}
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

async function generateShiftReportHtml({
  shiftDate,
  getSettings,
  getShiftSummary,
  getPeakHour,
  getCallflowHourly,
  getCallflowPeakHour
}) {
  const settings = await getSettings();
  const shift = settings.shift || {};
  const { hours: shiftHours, start, end } = buildShiftHours(shift);

  const bucketsSeries = await getShiftSummary(shiftDate);
  const peakAgents = await getPeakHour(shiftDate);
  const callflowRows = await getCallflowHourly(shiftDate);
  const peakWaiting = await getCallflowPeakHour(shiftDate);

  const firstHourHours = shiftHours.slice(0, 1);
  const halfHours = shiftHours.slice(0, Math.max(1, Math.ceil(shiftHours.length / 2)));
  const restHours = shiftHours.slice(firstHourHours.length);

  const rollBuckets = {
    firstHour: { hours: firstHourHours, totals: sumCountsForHours(bucketsSeries, firstHourHours) },
    halfShift: { hours: halfHours, totals: sumCountsForHours(bucketsSeries, halfHours) },
    fullShift: { hours: shiftHours, totals: sumCountsForHours(bucketsSeries, shiftHours) }
  };
  rollBuckets.firstHour.totalAgents = totalAgents(rollBuckets.firstHour.totals);
  rollBuckets.halfShift.totalAgents = totalAgents(rollBuckets.halfShift.totals);
  rollBuckets.fullShift.totalAgents = totalAgents(rollBuckets.fullShift.totals);

  const rollCallflow = {
    firstHour: sumCallflowRows(callflowRows, firstHourHours),
    halfShift: sumCallflowRows(callflowRows, halfHours),
    rest: sumCallflowRows(callflowRows, restHours),
    fullShift: sumCallflowRows(callflowRows, shiftHours)
  };

  const prevDate = ymdAddDays(shiftDate, -1);
  const prevBuckets = await getShiftSummary(prevDate);
  const prevCallflowRows = await getCallflowHourly(prevDate);
  const prevFullBuckets = sumCountsForHours(prevBuckets, shiftHours);
  const prevFullCallflow = sumCallflowRows(prevCallflowRows, shiftHours);

  const shiftWindow = {
    start: `${String(start.h).padStart(2, '0')}:${String(start.m).padStart(2, '0')}`,
    end: `${String(end.h).padStart(2, '0')}:${String(end.m).padStart(2, '0')}`
  };

  const html = renderHtml({
    shiftDate,
    shiftWindow,
    shiftHours,
    bucketsSeries,
    callflowRows,
    peaks: { waiting: peakWaiting, agents: peakAgents },
    rollups: { buckets: rollBuckets, callflow: rollCallflow },
    compare: {
      buckets: { prevDate, prevFull: { totals: prevFullBuckets, totalAgents: totalAgents(prevFullBuckets) } },
      callflow: { prevDate, prevFull: prevFullCallflow }
    }
  });

  return { html, shiftHours, shiftWindow };
}

module.exports = { generateShiftReportHtml };


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

  // Enhanced KPIs with better formatting
  const topKpis = [
    { k: '📅 Shift Window', v: `${shiftWindow.start} → ${shiftWindow.end}`, icon: '📅' },
    { k: '⏰ Peak Waiting Hour', v: peaks.waiting ? `${hourLabel(peaks.waiting.hour)} (max: ${peaks.waiting.calls_waiting_max})` : '—', icon: '⏰' },
    { k: '👥 Peak Agents Hour', v: peaks.agents ? `${hourLabel(peaks.agents.hour)} (total: ${peaks.agents.total_agents})` : '—', icon: '👥' },
    { k: '📊 Full Shift Waiting Max', v: String(rollups.callflow.fullShift.calls_waiting_max ?? 0), icon: '📊' },
    { k: '📈 Full Shift Active Max', v: String(rollups.callflow.fullShift.active_calls_max ?? 0), icon: '📈' },
    { k: '⚡ Full Shift Waiting Avg', v: fmt(rollups.callflow.fullShift.calls_waiting_avg ?? 0, 1), icon: '⚡' },
    { k: '🎯 Full Shift Active Avg', v: fmt(rollups.callflow.fullShift.active_calls_avg ?? 0, 1), icon: '🎯' }
  ];

  const bucketKeys = ['oncall_gt_5m', 'oncall_gt_1m', 'waiting_gt_1m', 'waiting_gt_5m', 'paused_gt_1m', 'in_call', 'ready', 'unknown'];
  const bucketColors = {
    'oncall_gt_5m': '#8b5cf6',
    'oncall_gt_1m': '#a78bfa', 
    'waiting_gt_1m': '#3b82f6',
    'waiting_gt_5m': '#1e40af',
    'paused_gt_1m': '#f59e0b',
    'in_call': '#10b981',
    'ready': '#06b6d4',
    'unknown': '#6b7280'
  };

  const bucketLabel = (k) =>
    k === 'oncall_gt_5m'
      ? '🟣 On Call > 5m'
      : k === 'oncall_gt_1m'
        ? '🔮 On Call > 1m'
        : k === 'waiting_gt_5m'
          ? '🔴 Wait > 5m'
          : k === 'waiting_gt_1m'
            ? '🟡 Wait > 1m'
            : k === 'paused_gt_1m'
              ? '🟡 Paused > 1m'
              : k === 'in_call'
                ? '🟢 In Call'
                : k === 'ready'
                  ? '🔵 Ready'
                  : k;

  // Enhanced bar chart function
  function enhancedBar(width, value, max, color, label) {
    const w = max > 0 ? Math.max(0, Math.min(width, Math.round((width * value) / max))) : 0;
    const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
    return `
      <div class="enhancedBar">
        <div class="barLabel">${label}: ${value}</div>
        <div class="barContainer">
          <div class="bar" style="width:${w}px;background:${color};border-radius:4px;"></div>
          <div class="barPercentage">${percentage}%</div>
        </div>
      </div>
    `;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    :root{
      --bg:#0f172a;
      --panel:#1e293b;
      --card:#334155;
      --text:#f1f5f9;
      --muted:#94a3b8;
      --border:rgba(255,255,255,.12);
      --primary:#3b82f6;
      --accent:#8b5cf6;
      --success:#10b981;
      --warning:#f59e0b;
      --danger:#ef4444;
      --gradient:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }
    
    @media print { 
      body{background:#fff !important;color:#111 !important} 
      .card{break-inside:avoid !important;box-shadow:none !important}
      .enhancedBar{break-inside:avoid !important}
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: var(--gradient);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 32px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }
    
    .title {
      font-size: 32px;
      font-weight: 900;
      margin: 0 0 8px 0;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .subtitle {
      color: var(--muted);
      font-size: 14px;
      margin: 0;
    }
    
    .badge {
      display: inline-block;
      background: var(--success);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      margin-left: 12px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    
    .kpiGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .kpiCard {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .kpiCard::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
    }
    
    .kpiCard:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.2);
    }
    
    .kpiIcon {
      font-size: 18px;
      margin-bottom: 8px;
      display: block;
    }
    
    .kpiLabel {
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .kpiValue {
      font-size: 28px;
      font-weight: 900;
      color: var(--text);
      margin-bottom: 4px;
    }
    
    .section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .sectionTitle {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 24px 0;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .enhancedBar {
      margin-bottom: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    
    .barLabel {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 8px;
    }
    
    .barContainer {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .bar {
      height: 12px;
      border-radius: 4px;
      transition: all 0.3s ease;
    }
    
    .barPercentage {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      min-width: 40px;
      text-align: right;
    }
    
    .miniGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .miniCard {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .miniCard:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    
    .miniTitle {
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .miniBig {
      font-size: 32px;
      font-weight: 900;
      color: var(--text);
      margin-bottom: 8px;
    }
    
    .miniSub {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.4;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
    }
    
    th, td {
      padding: 12px 8px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    th {
      background: var(--panel);
      color: var(--text);
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    tr:hover td {
      background: rgba(255,255,255,0.02);
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    .chartPlaceholder {
      height: 200px;
      background: linear-gradient(135deg, var(--panel) 0%, var(--card) 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      font-size: 14px;
      margin: 16px 0;
    }
    
    @media (max-width: 768px) {
      .kpiGrid {
        grid-template-columns: 1fr;
      }
      .miniGrid {
        grid-template-columns: repeat(2, 1fr);
      }
      .section {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">${esc(title)}</div>
      <div class="subtitle">Generated at ${esc(new Date().toISOString())} <span class="badge">Premium Report</span></div>
    </div>

    <div class="section">
      <div class="sectionTitle">📊 Key Performance Indicators</div>
      <div class="kpiGrid">
        ${topKpis.map((x) => `
          <div class="kpiCard">
            <div class="kpiIcon">${x.icon}</div>
            <div class="kpiLabel">${x.k}</div>
            <div class="kpiValue">${esc(x.v)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">👥 Agent State Distribution</div>
      <div class="miniGrid">
        <div><div class="miniTitle">🕐 First Hour</div><div class="miniBig">${esc(String(rollups.buckets.firstHour.totalAgents ?? 0))}</div><div class="miniSub">${esc(bucketKeys.slice(0,4).map((k)=>`${bucketLabel(k)}=${rollups.buckets.firstHour.totals?.[k]||0}`).join(' • '))}</div></div>
        <div><div class="miniTitle">⏰ Half Shift</div><div class="miniBig">${esc(String(rollups.buckets.halfShift.totalAgents ?? 0))}</div><div class="miniSub">${esc(bucketKeys.slice(0,4).map((k)=>`${bucketLabel(k)}=${rollups.buckets.halfShift.totals?.[k]||0}`).join(' • '))}</div></div>
        <div><div class="miniTitle">🎯 Full Shift</div><div class="miniBig">${esc(String(rollups.buckets.fullShift.totalAgents ?? 0))}</div><div class="miniSub">${esc(bucketKeys.slice(0,4).map((k)=>`${bucketLabel(k)}=${rollups.buckets.fullShift.totals?.[k]||0}`).join(' • '))}</div></div>
        <div><div class="miniTitle">📈 Yesterday (Full)</div><div class="miniBig">${esc(String(compare.buckets.prevFull.totalAgents ?? 0))}</div><div class="miniSub">Δ total agents: ${esc(String((rollups.buckets.fullShift.totalAgents ?? 0) - (compare.buckets.prevFull.totalAgents ?? 0)))}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">📈 Call Flow Analysis</div>
      <div class="miniGrid">
        <div><div class="miniTitle">🕐 First Hour</div><div class="miniBig">${esc(String(rollups.callflow.firstHour.calls_waiting_max ?? 0))}</div><div class="miniSub">waiting max • active max ${esc(String(rollups.callflow.firstHour.active_calls_max ?? 0))}</div></div>
        <div><div class="miniTitle">⏰ Half Shift</div><div class="miniBig">${esc(String(rollups.callflow.halfShift.calls_waiting_max ?? 0))}</div><div class="miniSub">waiting avg ${esc(fmt(rollups.callflow.halfShift.calls_waiting_avg ?? 0, 1))}</div></div>
        <div><div class="miniTitle">🎯 Rest of Shift</div><div class="miniBig">${esc(String(rollups.callflow.rest.calls_waiting_max ?? 0))}</div><div class="miniSub">active avg ${esc(fmt(rollups.callflow.rest.active_calls_avg ?? 0, 1))}</div></div>
        <div><div class="miniTitle">📊 Yesterday (Full)</div><div class="miniBig">${esc(String(compare.callflow.prevFull.calls_waiting_max ?? 0))}</div><div class="miniSub">Δ waiting max: ${esc(String((rollups.callflow.fullShift.calls_waiting_max ?? 0) - (compare.callflow.prevFull.calls_waiting_max ?? 0)))}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">⏱️ Hourly Call Flow Trends</div>
      <div class="chartPlaceholder">
        📊 Interactive Chart Visualization Available in Live Dashboard
      </div>
      <table>
        <thead>
          <tr>
            <th>⏰ Hour</th>
            <th>⏳ Waiting (Max)</th>
            <th>📊 Visualization</th>
            <th>📞 Active (Max)</th>
            <th>📈 Trend</th>
            <th>⚡ Waiting (Avg)</th>
            <th>🎯 Active (Avg)</th>
            <th>📊 Samples</th>
          </tr>
        </thead>
        <tbody>
          ${shiftHours
            .map((h) => {
              const r = cfByHour[Number(h)] || {};
              const wMax = Number(r.calls_waiting_max || 0);
              const aMax = Number(r.active_calls_max || 0);
              return `
                <tr>
                  <td><strong>${esc(hourLabel(h))}</strong></td>
                  <td>${esc(String(wMax))}</td>
                  <td>${enhancedBar(100, wMax, maxWait || 1, '#3b82f6', 'Waiting')}</td>
                  <td>${esc(String(aMax))}</td>
                  <td>${enhancedBar(100, aMax, maxActive || 1, '#10b981', 'Active')}</td>
                  <td>${esc(fmt(r.calls_waiting_avg || 0, 1))}</td>
                  <td>${esc(fmt(r.active_calls_avg || 0, 1))}</td>
                  <td>${esc(String(r.samples || 0))}</td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="sectionTitle">🎯 Hourly Agent State Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>⏰ Hour</th>
            ${bucketKeys.map((k) => `<th style="color:${bucketColors[k]}">${esc(bucketLabel(k))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${shiftHours
            .map((h) => {
              const row = bucketsSeries?.[Number(h)] || {};
              return `
                <tr>
                  <td><strong>${esc(hourLabel(h))}</strong></td>
                  ${bucketKeys.map((k) => {
                    const value = row[k] || 0;
                    const color = bucketColors[k] || '#6b7280';
                    return `<td style="background:${color}20;color:${color};font-weight:600;text-align:center;border-radius:4px;">${esc(String(value))}</td>`;
                  }).join('')}
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


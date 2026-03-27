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

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0s';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes > 0 ? minutes + 'm ' + secs + 's' : secs + 's';
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
  const title = `Shift Performance Report — ${shiftDate}`;
  const cfByHour = buildCallflowSeriesMap(callflowRows);
  const maxWait = Math.max(0, ...callflowRows.map((r) => Number(r.calls_waiting_max || 0)));
  const maxActive = Math.max(0, ...callflowRows.map((r) => Number(r.active_calls_max || 0)));

  // Calculate comprehensive analytics
  const totalCalls = rollups.callflow.fullShift.total_calls || 0;
  const totalAnswered = rollups.callflow.fullShift.total_answered || 0;
  const answerRate = totalCalls > 0 ? ((totalAnswered / totalCalls) * 100).toFixed(1) : 0;
  const abandonRate = (100 - parseFloat(answerRate)).toFixed(1);
  const avgHandleTime = rollups.callflow.fullShift.avg_handle_time || 0;
  const avgWaitTime = rollups.callflow.fullShift.calls_waiting_avg || 0;
  const peakHour = peaks.agents?.hour || 'N/A';
  const totalAgents = rollups.buckets.fullShift.totalAgents || 0;

  // Agent state distribution for pie chart
  const agentStates = {
    'In Call': rollups.buckets.fullShift.totals?.in_call || 0,
    'Ready': rollups.buckets.fullShift.totals?.ready || 0,
    'Waiting < 1m': rollups.buckets.fullShift.totals?.waiting_lt_1m || 0,
    'Waiting > 1m': rollups.buckets.fullShift.totals?.waiting_gt_1m || 0,
    'Paused': rollups.buckets.fullShift.totals?.paused_gt_1m || 0,
    'On Call > 1m': rollups.buckets.fullShift.totals?.oncall_gt_1m || 0,
    'On Call > 5m': rollups.buckets.fullShift.totals?.oncall_gt_5m || 0,
  };

  // Performance metrics for charts
  const hourlyPerformance = shiftHours.map(h => {
    const row = cfByHour[Number(h)] || {};
    return {
      hour: h,
      waiting: Number(row.calls_waiting_max || 0),
      active: Number(row.active_calls_max || 0),
      answered: Number(row.calls_answered || 0),
      samples: Number(row.samples || 0)
    };
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #ffffff;
      --panel: #f8fafc;
      --card: #ffffff;
      --text: #1e293b;
      --muted: #64748b;
      --border: #e2e8f0;
      --primary: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --grid: #94a3b8;
    }
    
    @media print { 
      body { background: #fff !important; color: #111 !important; }
      .card { break-inside: avoid !important; box-shadow: none !important; }
      .chart-container { break-inside: avoid !important; }
      .no-print { display: none !important; }
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid var(--border);
    }
    
    .title {
      font-size: 32px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
    }
    
    .subtitle {
      color: var(--muted);
      font-size: 16px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    .card-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .kpi-item {
      text-align: center;
      padding: 20px;
      background: var(--panel);
      border-radius: 8px;
      border-left: 4px solid var(--primary);
    }
    
    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 5px;
    }
    
    .kpi-label {
      font-size: 14px;
      color: var(--muted);
      font-weight: 500;
    }
    
    .chart-container {
      position: relative;
      height: 400px;
      margin: 20px 0;
    }
    
    .chart-container-small {
      position: relative;
      height: 200px;
      margin: 10px 0;
    }
    
    .charts-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    
    .chart-item {
      background: var(--panel);
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      border: 1px solid var(--border);
      transition: all 0.3s ease;
    }
    
    .chart-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .chart-subtitle {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .chart-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .insight-card {
      padding: 20px;
      background: var(--panel);
      border-radius: 8px;
      border-left: 3px solid var(--primary);
    }
    
    .insight-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 8px;
    }
    
    .insight-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 5px;
    }
    
    .insight-desc {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.5;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 14px;
    }
    
    .data-table th,
    .data-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    .data-table th {
      background: var(--panel);
      font-weight: 600;
      color: var(--text);
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    
    .data-table tr:hover {
      background: var(--panel);
    }
    
    .metric-good { color: var(--success); }
    .metric-warning { color: var(--warning); }
    .metric-danger { color: var(--danger); }
    
    .footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 12px;
    }
    
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
      .chart-grid { grid-template-columns: 1fr; }
      .charts-row { grid-template-columns: repeat(2, 1fr); }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      body { padding: 20px 10px; }
    }
    
    @media (max-width: 480px) {
      .charts-row { grid-template-columns: 1fr; }
      .kpi-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">${esc(title)}</div>
      <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <!-- Key Performance Indicators -->
    <div class="card">
      <div class="card-title">📊 Key Performance Indicators</div>
      <div class="kpi-grid">
        <div class="kpi-item">
          <div class="kpi-value">${formatNumber(totalCalls)}</div>
          <div class="kpi-label">Total Calls</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${answerRate}%</div>
          <div class="kpi-label">Answer Rate</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${abandonRate}%</div>
          <div class="kpi-label">Abandon Rate</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${formatDuration(avgHandleTime)}</div>
          <div class="kpi-label">Avg Handle Time</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${formatDuration(avgWaitTime)}</div>
          <div class="kpi-label">Avg Wait Time</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${totalAgents}</div>
          <div class="kpi-label">Total Agents</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${peakHour}:00</div>
          <div class="kpi-label">Peak Hour</div>
        </div>
      </div>
    </div>

    <!-- Visual Analytics Dashboard -->
    <div class="card">
      <div class="card-title">📊 Visual Analytics Dashboard</div>
      <div class="charts-row">
        <div class="chart-item">
          <div class="chart-subtitle">Agent State Distribution</div>
          <div class="chart-container-small">
            <canvas id="agentStateChart"></canvas>
          </div>
        </div>
        <div class="chart-item">
          <div class="chart-subtitle">Performance Radar</div>
          <div class="chart-container-small">
            <canvas id="performanceRadarChart"></canvas>
          </div>
        </div>
        <div class="chart-item">
          <div class="chart-subtitle">Hourly Activity Heat</div>
          <div class="chart-container-small">
            <canvas id="activityPolarChart"></canvas>
          </div>
        </div>
        <div class="chart-item">
          <div class="chart-subtitle">Efficiency Gauge</div>
          <div class="chart-container-small">
            <canvas id="efficiencyDoughnutChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Trends -->
    <div class="card">
      <div class="card-title">📈 Performance Trends</div>
      <div class="chart-grid">
        <div>
          <div style="font-weight: 600; margin-bottom: 10px; color: var(--text);">Call Volume Trends</div>
          <div class="chart-container" style="height: 300px;">
            <canvas id="callVolumeChart"></canvas>
          </div>
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 10px; color: var(--text);">Service Level Analysis</div>
          <div class="chart-container" style="height: 300px;">
            <canvas id="serviceLevelChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Insights -->
    <div class="card">
      <div class="card-title">🎯 Performance Insights</div>
      <div class="insights-grid">
        <div class="insight-card">
          <div class="insight-title">Peak Performance</div>
          <div class="insight-value">${peakHour}:00</div>
          <div class="insight-desc">Highest agent activity and call volume during this hour</div>
        </div>
        <div class="insight-card">
          <div class="insight-title">Service Quality</div>
          <div class="insight-value ${answerRate >= 95 ? 'metric-good' : answerRate >= 90 ? 'metric-warning' : 'metric-danger'}">${answerRate}%</div>
          <div class="insight-desc">${answerRate >= 95 ? 'Excellent service quality' : answerRate >= 90 ? 'Good service quality' : 'Service quality needs improvement'}</div>
        </div>
        <div class="insight-card">
          <div class="insight-title">Efficiency Score</div>
          <div class="insight-value">${Math.round(100 - parseFloat(abandonRate))}%</div>
          <div class="insight-desc">Overall call handling efficiency</div>
        </div>
        <div class="insight-card">
          <div class="insight-title">Avg Wait Time</div>
          <div class="insight-value ${avgWaitTime <= 20 ? 'metric-good' : avgWaitTime <= 30 ? 'metric-warning' : 'metric-danger'}">${formatDuration(avgWaitTime)}</div>
          <div class="insight-desc">${avgWaitTime <= 20 ? 'Excellent wait times' : avgWaitTime <= 30 ? 'Acceptable wait times' : 'Wait times need attention'}</div>
        </div>
      </div>
    </div>

    <!-- Detailed Hourly Data -->
    <div class="card">
      <div class="card-title">📋 Hourly Performance Data</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Hour</th>
            <th>Total Calls</th>
            <th>Answered</th>
            <th>Answer Rate</th>
            <th>Max Waiting</th>
            <th>Max Active</th>
            <th>Avg Wait</th>
            <th>Samples</th>
          </tr>
        </thead>
        <tbody>
          ${hourlyPerformance.map(hour => `
            <tr>
              <td><strong>${hour.hour}:00</strong></td>
              <td>${formatNumber(hour.answered + (hour.waiting - hour.answered))}</td>
              <td>${formatNumber(hour.answered)}</td>
              <td class="${hour.answered / Math.max(1, hour.answered + (hour.waiting - hour.answered)) >= 0.95 ? 'metric-good' : hour.answered / Math.max(1, hour.answered + (hour.waiting - hour.answered)) >= 0.90 ? 'metric-warning' : 'metric-danger'}">${((hour.answered / Math.max(1, hour.answered + (hour.waiting - hour.answered))) * 100).toFixed(1)}%</td>
              <td>${hour.waiting}</td>
              <td>${hour.active}</td>
              <td>${formatDuration(Math.round((hour.waiting / Math.max(1, hour.samples)) * 60))}</td>
              <td>${hour.samples}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Report generated by Vicidial Monitor Pro • Shift Analysis System</p>
      <p>Data covers shift period: ${shiftWindow.start} to ${shiftWindow.end}</p>
    </div>
  </div>

  <script>
    // Agent State Doughnut Chart
    const agentStateCtx = document.getElementById('agentStateChart').getContext('2d');
    new Chart(agentStateCtx, {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(Object.keys(agentStates))},
        datasets: [{
          data: ${JSON.stringify(Object.values(agentStates))},
          backgroundColor: [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#a78bfa', '#f97316', '#6b7280'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    // Performance Radar Chart
    const performanceRadarCtx = document.getElementById('performanceRadarChart').getContext('2d');
    new Chart(performanceRadarCtx, {
      type: 'radar',
      data: {
        labels: ['Answer Rate', 'Efficiency', 'Response Time', 'Agent Utilization', 'Service Quality'],
        datasets: [{
          label: 'Current Shift',
          data: [${answerRate}, ${Math.round(100 - parseFloat(abandonRate))}, ${Math.max(0, 100 - avgWaitTime)}, ${Math.round((totalAgents / Math.max(1, totalAgents)) * 100)}, ${answerRate}],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Hourly Activity Polar Area Chart
    const activityPolarCtx = document.getElementById('activityPolarChart').getContext('2d');
    new Chart(activityPolarCtx, {
      type: 'polarArea',
      data: {
        labels: ${JSON.stringify(hourlyPerformance.map(h => h.hour + ':00'))},
        datasets: [{
          data: ${JSON.stringify(hourlyPerformance.map(h => h.waiting + h.active))},
          backgroundColor: [
            'rgba(59, 130, 246, 0.5)',
            'rgba(16, 185, 129, 0.5)',
            'rgba(245, 158, 11, 0.5)',
            'rgba(239, 68, 68, 0.5)',
            'rgba(139, 92, 246, 0.5)',
            'rgba(167, 139, 250, 0.5)',
            'rgba(249, 115, 22, 0.5)',
            'rgba(107, 114, 128, 0.5)'
          ],
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    // Efficiency Gauge Chart
    const efficiencyCtx = document.getElementById('efficiencyDoughnutChart').getContext('2d');
    const efficiencyScore = Math.round(100 - parseFloat(abandonRate));
    new Chart(efficiencyCtx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [efficiencyScore, 100 - efficiencyScore],
          backgroundColor: [
            efficiencyScore >= 90 ? '#10b981' : efficiencyScore >= 80 ? '#f59e0b' : '#ef4444',
            '#e2e8f0'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 180,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        }
      }
    });

    // Call Volume Line Chart
    const callVolumeCtx = document.getElementById('callVolumeChart').getContext('2d');
    new Chart(callVolumeCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(hourlyPerformance.map(h => h.hour + ':00'))},
        datasets: [{
          label: 'Waiting Calls',
          data: ${JSON.stringify(hourlyPerformance.map(h => h.waiting))},
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        }, {
          label: 'Active Calls',
          data: ${JSON.stringify(hourlyPerformance.map(h => h.active))},
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Service Level Bar Chart
    const serviceLevelCtx = document.getElementById('serviceLevelChart').getContext('2d');
    new Chart(serviceLevelCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(hourlyPerformance.map(h => h.hour + ':00'))},
        datasets: [{
          label: 'Answer Rate %',
          data: ${JSON.stringify(hourlyPerformance.map(h => ((h.answered / Math.max(1, h.answered + (h.waiting - h.answered))) * 100).toFixed(1)))},
          backgroundColor: ${JSON.stringify(hourlyPerformance.map(h => ((h.answered / Math.max(1, h.answered + (h.waiting - h.answered))) * 100) >= 95 ? '#10b981' : ((h.answered / Math.max(1, h.answered + (h.waiting - h.answered))) * 100) >= 90 ? '#f59e0b' : '#ef4444'))},
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });

    // Utility functions
    function formatNumber(num) {
      return new Intl.NumberFormat().format(num);
    }
    
    function formatDuration(seconds) {
      if (!seconds || seconds === 0) return '0s';
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return minutes > 0 ? minutes + 'm ' + secs + 's' : secs + 's';
    }
  </script>
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


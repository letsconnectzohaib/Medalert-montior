import { el } from "../ui/dom.js";

export function statCard(title, roll) {
  const totals = roll?.totals || {};
  const total = roll?.totalAgents ?? 0;
  
  // Calculate additional metrics
  const inCall = totals.in_call || 0;
  const ready = totals.ready || 0;
  const waiting = (totals.waiting_gt_1m || 0) + (totals.waiting_gt_5m || 0);
  const utilization = total > 0 ? ((inCall / total) * 100).toFixed(1) : 0;
  const efficiency = total > 0 ? (((inCall + ready) / total) * 100).toFixed(1) : 0;
  
  return el("div", { class: "enhanced-stat-card" }, [
    el("div", { class: "card-header" }, [
      el("div", { class: "card-title" }, [title]),
      el("div", { class: "card-badge" }, [
        el("span", { class: `badge ${utilization >= 80 ? 'success' : utilization >= 60 ? 'warning' : 'danger'}` }, 
          [`${utilization}% Utilization`])
      ]),
    ]),
    el("div", { class: "card-content" }, [
      el("div", { class: "primary-metric" }, [
        el("div", { class: "metric-value" }, [String(total)]),
        el("div", { class: "metric-label" }, ["Total Agents"]),
      ]),
      el("div", { class: "metrics-grid" }, [
        el("div", { class: "metric-item" }, [
          el("div", { class: "metric-value secondary" }, [String(inCall)]),
          el("div", { class: "metric-label small" }, ["In Call"]),
        ]),
        el("div", { class: "metric-item" }, [
          el("div", { class: "metric-value secondary" }, [String(ready)]),
          el("div", { class: "metric-label small" }, ["Ready"]),
        ]),
        el("div", { class: "metric-item" }, [
          el("div", { class: "metric-value secondary" }, [String(waiting)]),
          el("div", { class: "metric-label small" }, ["Waiting"]),
        ]),
        el("div", { class: "metric-item" }, [
          el("div", { class: `metric-value secondary ${efficiency >= 80 ? 'success' : efficiency >= 60 ? 'warning' : 'danger'}` }, [`${efficiency}%`]),
          el("div", { class: "metric-label small" }, ["Efficiency"]),
        ]),
      ]),
    ]),
    el("div", { class: "card-footer" }, [
      el("div", { class: "footer-text" }, [keyBucketsSummary(totals)]),
    ]),
  ]);
}

export function compareCard(title, prev, current) {
  const a = prev?.totalAgents ?? 0;
  const b = current?.totalAgents ?? 0;
  const delta = b - a;
  const sign = delta > 0 ? "+" : "";
  const percentChange = a > 0 ? ((delta / a) * 100).toFixed(1) : 0;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable';
  
  return el("div", { class: "enhanced-compare-card" }, [
    el("div", { class: "card-header" }, [
      el("div", { class: "card-title" }, [title]),
      el("div", { class: `trend-indicator ${trend}` }, [
        el("span", { class: "trend-icon" }, [trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️']),
        el("span", { class: "trend-text" }, [`${sign}${delta} (${sign}${percentChange}%)`]),
      ]),
    ]),
    el("div", { class: "card-content" }, [
      el("div", { class: "comparison-grid" }, [
        el("div", { class: "compare-item" }, [
          el("div", { class: "compare-label" }, ["Previous"]),
          el("div", { class: "compare-value" }, [String(a)]),
        ]),
        el("div", { class: "compare-arrow" }, ["→"]),
        el("div", { class: "compare-item" }, [
          el("div", { class: "compare-label" }, ["Current"]),
          el("div", { class: "compare-value current" }, [String(b)]),
        ]),
      ]),
    ]),
  ]);
}

export function callflowStat(title, roll) {
  const avgActive = round1(roll?.active_calls_avg || 0);
  const maxActive = roll?.active_calls_max || 0;
  const avgWait = round1(roll?.calls_waiting_avg || 0);
  const maxWait = roll?.calls_waiting_max || 0;
  const callsTodayMax = roll?.calls_today_max || 0;
  const dropMax = round1(roll?.dropped_percent_max ?? 0);
  
  // Calculate service level
  const serviceLevel = maxWait > 0 ? Math.max(0, 100 - (avgWait / maxWait * 100)).toFixed(1) : 100;
  
  return el("div", { class: "enhanced-callflow-card" }, [
    el("div", { class: "card-header" }, [
      el("div", { class: "card-title" }, [title]),
      el("div", { class: `service-badge ${serviceLevel >= 90 ? 'excellent' : serviceLevel >= 80 ? 'good' : 'poor'}` }, 
        [`Service Level: ${serviceLevel}%`])
    ]),
    el("div", { class: "card-content" }, [
      el("div", { class: "callflow-metrics" }, [
        el("div", { class: "metric-row" }, [
          el("div", { class: "metric-group" }, [
            el("div", { class: "metric-label" }, ["Waiting"]),
            el("div", { class: "metric-value warning" }, [String(maxWait)]),
            el("div", { class: "metric-sublabel" }, [`Avg: ${avgWait}`]),
          ]),
          el("div", { class: "metric-group" }, [
            el("div", { class: "metric-label" }, ["Active"]),
            el("div", { class: "metric-value success" }, [String(maxActive)]),
            el("div", { class: "metric-sublabel" }, [`Avg: ${avgActive}`]),
          ]),
        ]),
        el("div", { class: "metric-row" }, [
          el("div", { class: "metric-group" }, [
            el("div", { class: "metric-label" }, ["Max Calls"]),
            el("div", { class: "metric-value primary" }, [String(callsTodayMax)]),
          ]),
          el("div", { class: "metric-group" }, [
            el("div", { class: "metric-label" }, ["Drop Rate"]),
            el("div", { class: `metric-value ${dropMax <= 5 ? 'success' : dropMax <= 10 ? 'warning' : 'danger'}` }, [`${dropMax}%`]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

export function callflowCards(callflow) {
  if (!callflow?.success && !callflow?.series) return null;
  const r = callflow?.rollups || {};
  return el("div", { class: "enhanced-callflow-grid" }, [
    callflowStat("🕐 First Hour", r.firstHour),
    callflowStat("⏰ Half Shift", r.halfShift),
    callflowStat("🎯 Rest of Shift", r.restOfShift),
    callflowCompare("📊 Yesterday vs Today", 
      callflow?.compare?.fullShift, r.fullShift),
  ]);
}

export function callflowCompare(title, prev, current) {
  const a = prev?.calls_waiting_max ?? 0;
  const b = current?.calls_waiting_max ?? 0;
  const delta = b - a;
  const sign = delta > 0 ? "+" : "";
  const percentChange = a > 0 ? ((delta / a) * 100).toFixed(1) : 0;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable';
  
  return el("div", { class: "enhanced-compare-card" }, [
    el("div", { class: "card-header" }, [
      el("div", { class: "card-title" }, [title]),
      el("div", { class: `trend-indicator ${trend}` }, [
        el("span", { class: "trend-icon" }, [trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️']),
        el("span", { class: "trend-text" }, [`${sign}${delta} (${sign}${percentChange}%)`]),
      ]),
    ]),
    el("div", { class: "card-content" }, [
      el("div", { class: "comparison-grid" }, [
        el("div", { class: "compare-item" }, [
          el("div", { class: "compare-label" }, ["Yesterday"]),
          el("div", { class: "compare-value" }, [String(a)]),
        ]),
        el("div", { class: "compare-arrow" }, ["→"]),
        el("div", { class: "compare-item" }, [
          el("div", { class: "compare-label" }, ["Today"]),
          el("div", { class: "compare-value current" }, [String(b)]),
        ]),
      ]),
    ]),
  ]);
}

export function round1(x) {
  const n = Number(x || 0);
  return Math.round(n * 10) / 10;
}

export function keyBucketsSummary(totals) {
  const purple = totals.oncall_gt_5m || 0;
  const violet = totals.oncall_gt_1m || 0;
  const blue = totals.waiting_gt_1m || 0;
  const inCall = totals.in_call || 0;
  const ready = totals.ready || 0;
  return `🟣 ${purple} 🟪 ${violet} 🔵 ${blue} 🟢 ${inCall} 🟡 ${ready}`;
}

export function fmtHour(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

export function formatHours(series, shiftHours) {
  const keys = (shiftHours?.length ? shiftHours : Object.keys(series)).map(
    (x) => Number(x),
  );
  const uniq = [...new Set(keys)].sort((a, b) => a - b);
  if (!uniq.length) return "No hourly buckets yet.";
  return uniq
    .map((h) => {
      const b = series[h] || {};
      return `${fmtHour(h)} | 🟣 ${b.oncall_gt_5m || 0} 🟪 ${b.oncall_gt_1m || 0} 🔵 ${b.waiting_gt_1m || 0} 🟢 ${b.in_call || 0} 🟡 ${b.ready || 0}`;
    })
    .join("\n");
}

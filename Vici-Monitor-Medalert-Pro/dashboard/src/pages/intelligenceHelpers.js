import { el } from "../ui/dom.js";

export function fmtPct(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `${Math.round(n)}%` : "—";
}

export function fmtNum(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const p = 10 ** digits;
  return String(Math.round(n * p) / p);
}

export function fmtHour(hour) {
  if (hour == null || hour === "") return "—";
  const h = Number(hour);
  if (!Number.isFinite(h)) return String(hour);
  return `${String(h).padStart(2, "0")}:00`;
}

export function sevClassForInsight(i) {
  const kind = String(i?.kind || "");
  if (
    kind === "proactive_staffing" ||
    kind === "wait_time_prediction" ||
    kind === "queue_risk_monitoring"
  ) {
    return i?.risk === "HIGH"
      ? "bad"
      : i?.risk === "ELEVATED"
        ? "warn"
        : "good";
  }
  if (kind === "first_hour_rush") return i?.isRush ? "warn" : "good";
  if (kind === "performance_anomaly_detection") {
    return Array.isArray(i?.anomalies) && i.anomalies.length ? "warn" : "good";
  }
  if (kind === "efficiency_recommendations") {
    return Array.isArray(i?.recommendations) && i.recommendations.length
      ? "warn"
      : "good";
  }
  if (kind === "smart_automation") {
    return Array.isArray(i?.suggestions) && i.suggestions.length
      ? "warn"
      : "good";
  }
  return "good";
}

export function badge(text, kind = "good") {
  return el("span", { class: `badge ${kind}` }, [String(text)]);
}

export function insightTitle(kind) {
  const map = {
    first_hour_rush: "First hour rush",
    peak_hour_consistency: "Peak hour consistency",
    proactive_staffing: "Proactive staffing",
    agent_state_transition_patterns: "Agent state transition patterns",
    campaign_performance_trends: "Campaign performance trends",
    call_volume_forecasting: "Call volume forecasting",
    staffing_optimization_engine: "Staffing optimization",
    wait_time_prediction: "Wait time prediction",
    shift_duration_optimization: "Shift duration optimization",
    queue_risk_monitoring: "Queue risk monitoring",
    performance_anomaly_detection: "Performance anomaly detection",
    break_scheduling_intelligence: "Break scheduling intelligence",
    voice_of_data_narratives: "Voice of data",
    comparative_shift_analysis: "Comparative shift analysis",
    efficiency_recommendations: "Efficiency recommendations",
    smart_automation: "Smart automation",
    agent_performance_scoring: "Agent performance scoring",
    trend_forecasting_dashboard: "Trend forecasting dashboard",
  };
  return map[kind] || kind || "Insight";
}

export function cardHeader(title, insight) {
  return el("div", { class: "trendTop" }, [
    el("div", { class: "formBlockTitle", style: "margin:0" }, [title]),
    badge(sevClassForInsight(insight), sevClassForInsight(insight)),
  ]);
}

export function noteLine(text) {
  return el("div", { class: "note" }, [String(text || "")]);
}

export function kv(label, value) {
  return el("div", { class: "kv" }, [
    el("div", { class: "k" }, [label]),
    el("div", { class: "v" }, [String(value)]),
  ]);
}

export function miniStat(label, value, sub = "") {
  return el("div", { class: "miniCard" }, [
    el("div", { class: "miniTitle" }, [label]),
    el("div", { class: "miniBig" }, [String(value)]),
    el("div", { class: "miniSub" }, [String(sub)]),
  ]);
}

export function arrayTable(columns, rows) {
  const head = el("thead", {}, [
    el(
      "tr",
      {},
      columns.map((c) => el("th", {}, [c.label])),
    ),
  ]);

  const body = el(
    "tbody",
    {},
    (rows || []).map((row) =>
      el(
        "tr",
        {},
        columns.map((c) => el("td", {}, [String(c.render(row) ?? "—")])),
      ),
    ),
  );

  return el("div", { class: "tableWrap" }, [el("table", {}, [head, body])]);
}

export function findInsight(insights, kind) {
  return (
    (Array.isArray(insights) ? insights : []).find((i) => i?.kind === kind) ||
    null
  );
}

export function sectionCard(title, insight, children = []) {
  const headline =
    insight?.message || insight?.detail || insight?.note || "No details yet.";
  return el("div", { class: "formBlock" }, [
    cardHeader(title, insight || { kind: title }),
    noteLine(headline),
    ...children,
  ]);
}

export function sectionWrapper(title, desc, child) {
  return el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, [title]),
    el("div", { class: "note" }, [desc]),
    child,
  ]);
}

export function emptyResults() {
  return el("div", { class: "note" }, ["No intelligence results yet."]);
}

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function setStatus(text) {
  const msg = document.getElementById("in_msg");
  if (msg) msg.textContent = text;
}

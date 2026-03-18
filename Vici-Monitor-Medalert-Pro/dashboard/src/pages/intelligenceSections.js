/**
 * intelligenceSections.js
 *
 * Thin coordinator — re-exports section renderers from sub-modules
 * and provides renderLoadedDashboard() which stitches them together.
 *
 * Sub-modules:
 *   intelligenceFoundation.js  → Foundation + Patterns
 *   intelligencePrediction.js  → Prediction + Risk + Narratives + Advanced
 */

import { el } from "../ui/dom.js";
import {
  miniStat,
  findInsight,
  fmtHour,
  noteLine,
  sectionWrapper,
} from "./intelligenceHelpers.js";

// Re-export sub-module renderers so existing imports keep working
export {
  renderFoundationSection,
  renderPatternSection,
  renderFoundationSectionWrapper,
  renderPatternSectionWrapper,
} from "./intelligenceFoundation.js";

export {
  renderPredictionSection,
  renderAlertSection,
  renderNarrativeSection,
  renderAdvancedSection,
  renderPredictionSectionWrapper,
  renderAlertSectionWrapper,
  renderNarrativeSectionWrapper,
  renderAdvancedSectionWrapper,
} from "./intelligencePrediction.js";

import {
  renderFoundationSectionWrapper,
  renderPatternSectionWrapper,
} from "./intelligenceFoundation.js";

import {
  renderPredictionSectionWrapper,
  renderAlertSectionWrapper,
  renderNarrativeSectionWrapper,
  renderAdvancedSectionWrapper,
} from "./intelligencePrediction.js";

// ─── Intelligence overview stat bar ──────────────────────────

function renderOverviewStatBar(insightsData) {
  const meta = insightsData?.metadata || {};
  const insights = Array.isArray(insightsData?.insights)
    ? insightsData.insights
    : [];

  const queueRisk = findInsight(insights, "queue_risk_monitoring");
  const waitPred = findInsight(insights, "wait_time_prediction");
  const staffing = findInsight(insights, "staffing_optimization_engine");
  const forecast = findInsight(insights, "call_volume_forecasting");
  const rush = findInsight(insights, "first_hour_rush");
  const peak = findInsight(insights, "peak_hour_consistency");

  const riskBadge = (risk) => {
    if (!risk) return "—";
    const cls = risk === "HIGH" ? "bad" : risk === "ELEVATED" ? "warn" : "good";
    return el("span", { class: `badge ${cls}` }, [risk]);
  };

  return el("div", { class: "shiftCards" }, [
    miniStat("Total insights", insights.length, "Roadmap intelligence loaded"),
    miniStat("Campaigns", meta.campaignsTracked ?? 0, "Tracked this shift"),
    miniStat("Agents scored", meta.agentsTracked ?? 0, "Performance + state"),
    miniStat(
      "Live data points",
      meta.recentCallflowPoints ?? 0,
      "Callflow trend buffer",
    ),
    el("div", { class: "miniCard" }, [
      el("div", { class: "miniTitle" }, ["Queue risk"]),
      el("div", { class: "miniBig" }, [
        queueRisk?.risk ? riskBadge(queueRisk.risk) : el("span", {}, ["—"]),
      ]),
      el("div", { class: "miniSub" }, [
        `Score: ${queueRisk?.riskScore ?? "—"}`,
      ]),
    ]),
    el("div", { class: "miniCard" }, [
      el("div", { class: "miniTitle" }, ["Expected wait"]),
      el("div", { class: "miniBig" }, [
        waitPred?.expectedWaitMinutes != null
          ? el("span", {}, [
              el(
                "span",
                {
                  class: `badge ${
                    waitPred.risk === "HIGH"
                      ? "bad"
                      : waitPred.risk === "ELEVATED"
                        ? "warn"
                        : "good"
                  }`,
                },
                [`${waitPred.expectedWaitMinutes}m`],
              ),
            ])
          : el("span", {}, ["—"]),
      ]),
      el("div", { class: "miniSub" }, [waitPred?.risk || "—"]),
    ]),
    miniStat(
      "Staffing delta",
      staffing?.recommendedDelta != null
        ? `${staffing.recommendedDelta >= 0 ? "+" : ""}${staffing.recommendedDelta}`
        : "—",
      `Optimal: ${staffing?.optimalAgents ?? "—"} agents`,
    ),
    miniStat(
      "Forecast peak",
      forecast?.peakForecastHour != null
        ? fmtHour(forecast.peakForecastHour)
        : "—",
      `Confidence: ${forecast?.confidencePct ?? "—"}%`,
    ),
    miniStat(
      "First hour rush",
      rush?.isRush ? "⚠️ Yes" : rush?.ok ? "✅ No" : "—",
      rush?.intensityPct != null ? `${rush.intensityPct}% above avg` : "",
    ),
    miniStat(
      "Reliable peak hour",
      peak?.peakHour != null ? fmtHour(peak.peakHour) : "—",
      peak?.confidencePct != null ? `${peak.confidencePct}% confidence` : "—",
    ),
  ]);
}

// ─── Main dashboard render ────────────────────────────────────

export function renderLoadedDashboard(bundle, date) {
  const insightsData = bundle?.insights?.data || {};
  const insights = Array.isArray(insightsData?.insights)
    ? insightsData.insights
    : [];

  const extra = {
    campaigns: bundle?.campaigns?.data?.campaigns || [],
    agents: bundle?.agents?.data?.agents || [],
    transitions: bundle?.transitions?.data?.transitions || [],
  };

  // Summary header card
  const headerCard = el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, [`Roadmap intelligence  •  ${date}`]),
    noteLine(
      "This dashboard covers all 21 roadmap items across six layers: " +
        "Foundation · Pattern Recognition · Predictive Analytics · " +
        "Risk & Alerts · Automated Insights · Advanced Analytics.",
    ),
    el("div", { style: "margin-top:12px" }, [
      renderOverviewStatBar(insightsData),
    ]),
  ]);

  return el("div", { class: "shiftIntel" }, [
    headerCard,
    renderFoundationSectionWrapper(insights),
    renderPatternSectionWrapper(insights),
    renderPredictionSectionWrapper(insights),
    renderAlertSectionWrapper(insights),
    renderNarrativeSectionWrapper(insights),
    renderAdvancedSectionWrapper(insights, extra),
  ]);
}

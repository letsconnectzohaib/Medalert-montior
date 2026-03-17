import { el } from "../ui/dom.js";
import {
  findInsight,
  fmtHour,
  fmtNum,
  fmtPct,
  insightTitle,
  kv,
  miniStat,
  noteLine,
  arrayTable,
  sectionCard,
  sectionWrapper,
} from "./intelligenceHelpers.js";

export function renderOverviewSummary(data) {
  const meta = data?.metadata || {};
  const insights = Array.isArray(data?.insights) ? data.insights : [];
  const queueRisk = findInsight(insights, "queue_risk_monitoring");
  const waitPred = findInsight(insights, "wait_time_prediction");
  const staffing = findInsight(insights, "staffing_optimization_engine");
  const forecast = findInsight(insights, "call_volume_forecasting");

  return el("div", { class: "shiftCards" }, [
    miniStat("Insights", insights.length, "Loaded roadmap intelligence"),
    miniStat(
      "Campaigns tracked",
      meta.campaignsTracked ?? 0,
      "Snapshot-derived",
    ),
    miniStat(
      "Agents tracked",
      meta.agentsTracked ?? 0,
      "Performance + state scoring",
    ),
    miniStat(
      "Recent callflow points",
      meta.recentCallflowPoints ?? 0,
      "Realtime trend buffer",
    ),
    miniStat(
      "Queue risk",
      queueRisk?.risk || "—",
      `Score ${queueRisk?.riskScore ?? "—"}`,
    ),
    miniStat(
      "Expected wait",
      waitPred?.expectedWaitMinutes ?? "—",
      waitPred?.risk || "—",
    ),
    miniStat(
      "Staffing delta",
      staffing?.recommendedDelta ?? "—",
      `Optimal ${staffing?.optimalAgents ?? "—"}`,
    ),
    miniStat(
      "Forecast peak",
      forecast?.peakForecastHour != null
        ? fmtHour(forecast.peakForecastHour)
        : "—",
      `Confidence ${forecast?.confidencePct ?? "—"}%`,
    ),
  ]);
}

export function renderFoundationSection(insights) {
  const rush = findInsight(insights, "first_hour_rush");
  const peak = findInsight(insights, "peak_hour_consistency");
  const staffing = findInsight(insights, "proactive_staffing");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("first_hour_rush"), rush, [
      el("div", { class: "metaGrid" }, [
        kv("Rush", rush?.isRush ? "Yes" : "No"),
        kv(
          "Intensity",
          rush?.intensityPct != null ? `${rush.intensityPct}%` : "—",
        ),
        kv("Suggested agents", rush?.suggestedAgents ?? "—"),
      ]),
    ]),
    sectionCard(insightTitle("peak_hour_consistency"), peak, [
      el("div", { class: "metaGrid" }, [
        kv("Peak hour", peak?.peakHour != null ? fmtHour(peak.peakHour) : "—"),
        kv(
          "Confidence",
          peak?.confidencePct != null ? `${peak.confidencePct}%` : "—",
        ),
        kv("Days with data", peak?.window?.daysWithData ?? "—"),
      ]),
    ]),
    sectionCard(insightTitle("proactive_staffing"), staffing, [
      el("div", { class: "metaGrid" }, [
        kv("Risk", staffing?.risk || "—"),
        kv("Suggested add", staffing?.suggestedAgents ?? "—"),
        kv("ETA to spike", staffing?.etaLocalTime || "—"),
      ]),
    ]),
  ]);
}

export function renderPatternSection(insights) {
  const transitions = findInsight(insights, "agent_state_transition_patterns");
  const campaigns = findInsight(insights, "campaign_performance_trends");

  const transitionTable =
    Array.isArray(transitions?.topTransitions) &&
    transitions.topTransitions.length
      ? arrayTable(
          [
            { label: "From", render: (r) => r.from },
            { label: "To", render: (r) => r.to },
            { label: "Count", render: (r) => r.count },
          ],
          transitions.topTransitions.slice(0, 8),
        )
      : noteLine("No transition history yet.");

  const stuckPurpleTable =
    Array.isArray(transitions?.stuckPurpleAgents) &&
    transitions.stuckPurpleAgents.length
      ? arrayTable(
          [
            { label: "User", render: (r) => r.user },
            { label: "Name", render: (r) => r.name || "—" },
            { label: "Campaign", render: (r) => r.campaign || "—" },
            { label: "Occurrences", render: (r) => r.occurrences },
          ],
          transitions.stuckPurpleAgents,
        )
      : null;

  const campaignTable =
    Array.isArray(campaigns?.topCampaigns) && campaigns.topCampaigns.length
      ? arrayTable(
          [
            { label: "Campaign", render: (r) => r.campaign },
            { label: "Appearances", render: (r) => r.agentAppearances },
            {
              label: "In-call",
              render: (r) => fmtPct((r.inCallRatio || 0) * 100),
            },
            {
              label: "Waiting",
              render: (r) => fmtPct((r.waitingRatio || 0) * 100),
            },
            {
              label: "Paused",
              render: (r) => fmtPct((r.pausedRatio || 0) * 100),
            },
            {
              label: "Avg calls",
              render: (r) => fmtNum(r.avgCallsPerAppearance, 1),
            },
          ],
          campaigns.topCampaigns.slice(0, 8),
        )
      : noteLine("No campaign trend data yet.");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("agent_state_transition_patterns"), transitions, [
      transitionTable,
      stuckPurpleTable
        ? el("div", { class: "divider" }, [])
        : el("div", {}, []),
      stuckPurpleTable || el("div", {}, []),
    ]),
    sectionCard(insightTitle("campaign_performance_trends"), campaigns, [
      campaigns?.worstWaitCampaign
        ? el("div", { class: "metaGrid" }, [
            kv("Worst wait campaign", campaigns.worstWaitCampaign.campaign),
            kv(
              "Best flow campaign",
              campaigns?.bestFlowCampaign?.campaign || "—",
            ),
            kv(
              "Avg wait ratio",
              campaigns?.context?.avgWaitRatio != null
                ? `${campaigns.context.avgWaitRatio}%`
                : "—",
            ),
          ])
        : el("div", {}, []),
      campaignTable,
    ]),
  ]);
}

export function renderPredictionSection(insights) {
  const forecast = findInsight(insights, "call_volume_forecasting");
  const staffing = findInsight(insights, "staffing_optimization_engine");
  const wait = findInsight(insights, "wait_time_prediction");
  const duration = findInsight(insights, "shift_duration_optimization");

  const forecastTable =
    Array.isArray(forecast?.forecastHours) && forecast.forecastHours.length
      ? arrayTable(
          [
            { label: "Hour", render: (r) => fmtHour(r.hour) },
            {
              label: "Wait avg",
              render: (r) => fmtNum(r.calls_waiting_avg_pred, 1),
            },
            {
              label: "Wait max",
              render: (r) => fmtNum(r.calls_waiting_max_pred, 1),
            },
            {
              label: "Active avg",
              render: (r) => fmtNum(r.active_calls_avg_pred, 1),
            },
            { label: "Confidence", render: (r) => `${r.confidencePct}%` },
          ],
          forecast.forecastHours.slice(0, 8),
        )
      : noteLine("No forecast rows yet.");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("call_volume_forecasting"), forecast, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Peak forecast hour",
          forecast?.peakForecastHour != null
            ? fmtHour(forecast.peakForecastHour)
            : "—",
        ),
        kv(
          "Confidence",
          forecast?.confidencePct != null ? `${forecast.confidencePct}%` : "—",
        ),
        kv(
          "Next window rows",
          Array.isArray(forecast?.next2to4Hours)
            ? forecast.next2to4Hours.length
            : 0,
        ),
      ]),
      forecastTable,
    ]),
    sectionCard(insightTitle("staffing_optimization_engine"), staffing, [
      el("div", { class: "metaGrid" }, [
        kv("Current", staffing?.currentAgents ?? "—"),
        kv("Optimal", staffing?.optimalAgents ?? "—"),
        kv("Delta", staffing?.recommendedDelta ?? "—"),
      ]),
    ]),
    sectionCard(insightTitle("wait_time_prediction"), wait, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Expected wait",
          wait?.expectedWaitMinutes != null
            ? `${wait.expectedWaitMinutes} min`
            : "—",
        ),
        kv("Risk", wait?.risk || "—"),
        kv("ETA", wait?.expectedEtaLocalTime || "—"),
      ]),
    ]),
    sectionCard(insightTitle("shift_duration_optimization"), duration, [
      el("div", { class: "metaGrid" }, [
        kv("Can shorten", duration?.canShorten ? "Yes" : "No"),
        kv(
          "Current end",
          duration?.currentShiftEndHour != null
            ? fmtHour(duration.currentShiftEndHour)
            : "—",
        ),
        kv(
          "Savings",
          duration?.savingsPct != null ? `${duration.savingsPct}%` : "—",
        ),
      ]),
    ]),
  ]);
}

export function renderAlertSection(insights) {
  const queueRisk = findInsight(insights, "queue_risk_monitoring");
  const anomaly = findInsight(insights, "performance_anomaly_detection");
  const breaks = findInsight(insights, "break_scheduling_intelligence");

  const anomalyTable =
    Array.isArray(anomaly?.anomalies) && anomaly.anomalies.length
      ? arrayTable(
          [
            { label: "Hour", render: (r) => fmtHour(r.hour) },
            { label: "Metric", render: (r) => r.metric },
            { label: "Value", render: (r) => r.value },
            { label: "Baseline", render: (r) => r.baselineMean },
            { label: "Z-score", render: (r) => r.zScore },
            { label: "Severity", render: (r) => r.severity },
          ],
          anomaly.anomalies,
        )
      : noteLine("No major anomalies detected.");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("queue_risk_monitoring"), queueRisk, [
      el("div", { class: "metaGrid" }, [
        kv("Risk", queueRisk?.risk || "—"),
        kv("Risk score", queueRisk?.riskScore ?? "—"),
        kv(
          "Waiting slope/min",
          queueRisk?.context?.waitingSlopePerMinute ?? "—",
        ),
      ]),
    ]),
    sectionCard(insightTitle("performance_anomaly_detection"), anomaly, [
      anomalyTable,
    ]),
    sectionCard(insightTitle("break_scheduling_intelligence"), breaks, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Suggested breaks",
          Array.isArray(breaks?.suggestedBreakHours) &&
            breaks.suggestedBreakHours.length
            ? breaks.suggestedBreakHours.map(fmtHour).join(", ")
            : "—",
        ),
        kv(
          "Windows",
          Array.isArray(breaks?.windows) ? breaks.windows.length : 0,
        ),
        kv(
          "Status",
          Array.isArray(breaks?.windows) && breaks.windows.length
            ? "Ready"
            : "Waiting",
        ),
      ]),
    ]),
  ]);
}

export function renderNarrativeSection(insights) {
  const voice = findInsight(insights, "voice_of_data_narratives");
  const comparison = findInsight(insights, "comparative_shift_analysis");
  const efficiency = findInsight(insights, "efficiency_recommendations");
  const automation = findInsight(insights, "smart_automation");

  const narratives =
    Array.isArray(voice?.narratives) && voice.narratives.length
      ? el(
          "ul",
          { class: "note", style: "margin:0;padding-left:18px" },
          voice.narratives.map((n) => el("li", {}, [n])),
        )
      : noteLine("No narrative summaries yet.");

  const recs =
    Array.isArray(efficiency?.recommendations) &&
    efficiency.recommendations.length
      ? arrayTable(
          [
            { label: "Priority", render: (r) => r.priority },
            { label: "Code", render: (r) => r.code },
            { label: "Recommendation", render: (r) => r.note },
          ],
          efficiency.recommendations,
        )
      : noteLine("No efficiency recommendations right now.");

  const auto =
    Array.isArray(automation?.suggestions) && automation.suggestions.length
      ? arrayTable(
          [
            { label: "Type", render: (r) => r.type },
            { label: "Suggestion", render: (r) => r.note },
          ],
          automation.suggestions,
        )
      : noteLine("No smart automation triggers right now.");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("voice_of_data_narratives"), voice, [narratives]),
    sectionCard(insightTitle("comparative_shift_analysis"), comparison, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Waiting peak",
          comparison?.deltas?.callsPeakPct != null
            ? `${comparison.deltas.callsPeakPct}%`
            : "—",
        ),
        kv(
          "Active peak",
          comparison?.deltas?.activePeakPct != null
            ? `${comparison.deltas.activePeakPct}%`
            : "—",
        ),
        kv(
          "Drop mean",
          comparison?.deltas?.droppedMeanPct != null
            ? `${comparison.deltas.droppedMeanPct}%`
            : "—",
        ),
      ]),
    ]),
    sectionCard(insightTitle("efficiency_recommendations"), efficiency, [recs]),
    sectionCard(insightTitle("smart_automation"), automation, [auto]),
  ]);
}

export function renderAdvancedSection(insights, extra) {
  const scoring = findInsight(insights, "agent_performance_scoring");
  const trend = findInsight(insights, "trend_forecasting_dashboard");

  const topAgents =
    Array.isArray(scoring?.topAgents) && scoring.topAgents.length
      ? arrayTable(
          [
            { label: "Agent", render: (r) => r.name || r.user },
            { label: "Campaign", render: (r) => r.campaign || "—" },
            { label: "Score", render: (r) => `${r.scorePct}%` },
            { label: "Utilization", render: (r) => `${r.utilizationPct}%` },
            { label: "Pause", render: (r) => `${r.pausePct}%` },
            { label: "Calls max", render: (r) => r.callsMax },
          ],
          scoring.topAgents.slice(0, 10),
        )
      : noteLine("No agent scoring data yet.");

  const bottomAgents =
    Array.isArray(scoring?.bottomAgents) && scoring.bottomAgents.length
      ? arrayTable(
          [
            { label: "Agent", render: (r) => r.name || r.user },
            { label: "Campaign", render: (r) => r.campaign || "—" },
            { label: "Score", render: (r) => `${r.scorePct}%` },
            { label: "Purple", render: (r) => `${r.purplePct}%` },
          ],
          scoring.bottomAgents,
        )
      : null;

  const campaignsApiTable =
    Array.isArray(extra?.campaigns) && extra.campaigns.length
      ? arrayTable(
          [
            { label: "Campaign", render: (r) => r.campaign },
            { label: "Appearances", render: (r) => r.agentAppearances },
            {
              label: "Waiting",
              render: (r) => fmtPct((r.waitingRatio || 0) * 100),
            },
            {
              label: "Purple",
              render: (r) => fmtPct((r.purpleRatio || 0) * 100),
            },
          ],
          extra.campaigns.slice(0, 8),
        )
      : null;

  const transitionsApiTable =
    Array.isArray(extra?.transitions) && extra.transitions.length
      ? arrayTable(
          [
            { label: "From", render: (r) => r.from },
            { label: "To", render: (r) => r.to },
            { label: "Count", render: (r) => r.count },
          ],
          extra.transitions.slice(0, 8),
        )
      : null;

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("agent_performance_scoring"), scoring, [
      topAgents,
      bottomAgents ? el("div", { class: "divider" }, []) : el("div", {}, []),
      bottomAgents || el("div", {}, []),
    ]),
    sectionCard(insightTitle("trend_forecasting_dashboard"), trend, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Peak hour",
          trend?.summary?.peakHour != null ? fmtHour(trend.summary.peakHour) : "—",
        ),
        kv("Peak wait pred", trend?.summary?.peakWaitingPred ?? "—"),
        kv("Avg wait pred", trend?.summary?.avgWaitingPred ?? "—"),
        kv("Staffing delta", trend?.summary?.staffingDelta ?? "—"),
        kv(
          "Vs history",
          trend?.summary?.currentVsHistoryCallsPeakPct != null
            ? `${trend.summary.currentVsHistoryCallsPeakPct}%`
            : "—",
        ),
      ]),
    ]),
    sectionCard(
      "Campaign API detail",
      {
        kind: "campaign_api_detail",
        message: "Campaign endpoint output for deeper inspection.",
      },
      [campaignsApiTable || noteLine("No campaign endpoint data.")],
    ),
    sectionCard(
      "Transition API detail",
      {
        kind: "transition_api_detail",
        message: "Transition endpoint output for deeper inspection.",
      },
      [transitionsApiTable || noteLine("No transition endpoint data.")],
    ),
  ]);
}

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

  return el("div", { class: "shiftIntel" }, [
    el("div", { class: "cardTitle" }, [`Roadmap intelligence • ${date}`]),
    noteLine(
      "This dashboard now surfaces the roadmap layers: patterns, predictive analytics, intelligent alerts, narratives, smart automation, and advanced scoring.",
    ),
    renderOverviewSummary(insightsData),
    sectionWrapper(
      "Foundation",
      "Current core intelligence features.",
      renderFoundationSection(insights),
    ),
    sectionWrapper(
      "Pattern recognition",
      "Transitions and campaign-level behavioral signals.",
      renderPatternSection(insights),
    ),
    sectionWrapper(
      "Predictive analytics",
      "Forecasting, staffing, wait time, and shift design.",
      renderPredictionSection(insights),
    ),
    sectionWrapper(
      "Intelligent alerts",
      "Queue risk, anomaly detection, and break timing.",
      renderAlertSection(insights),
    ),
    sectionWrapper(
      "Automated insights",
      "Narratives, comparisons, recommendations, and automation suggestions.",
      renderNarrativeSection(insights),
    ),
    sectionWrapper(
      "Advanced analytics",
      "Agent scoring and trend dashboard outputs.",
      renderAdvancedSection(insights, extra),
    ),
  ]);
}

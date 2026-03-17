import {
  fetchIntelligenceBundle,
  fetchIntelligenceShiftDates,
} from "../apiClient.js";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "checked") {
      node.checked = !!v;
    } else if (v != null) {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function fmtPct(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `${Math.round(n)}%` : "—";
}

function fmtNum(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const p = 10 ** digits;
  return String(Math.round(n * p) / p);
}

function fmtHour(hour) {
  if (hour == null || hour === "") return "—";
  const h = Number(hour);
  if (!Number.isFinite(h)) return String(hour);
  return `${String(h).padStart(2, "0")}:00`;
}

function sevClassForInsight(i) {
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
  if (kind === "performance_anomaly_detection")
    return Array.isArray(i?.anomalies) && i.anomalies.length ? "warn" : "good";
  if (kind === "efficiency_recommendations")
    return Array.isArray(i?.recommendations) && i.recommendations.length
      ? "warn"
      : "good";
  if (kind === "smart_automation")
    return Array.isArray(i?.suggestions) && i.suggestions.length
      ? "warn"
      : "good";
  return "good";
}

function badge(text, kind = "good") {
  return el("span", { class: `badge ${kind}` }, [String(text)]);
}

function insightTitle(kind) {
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

function cardHeader(title, insight) {
  return el("div", { class: "trendTop" }, [
    el("div", { class: "formBlockTitle", style: "margin:0" }, [title]),
    badge(sevClassForInsight(insight), sevClassForInsight(insight)),
  ]);
}

function noteLine(text) {
  return el("div", { class: "note" }, [String(text || "")]);
}

function kv(label, value) {
  return el("div", { class: "kv" }, [
    el("div", { class: "k" }, [label]),
    el("div", { class: "v" }, [String(value)]),
  ]);
}

function miniStat(label, value, sub = "") {
  return el("div", { class: "miniCard" }, [
    el("div", { class: "miniTitle" }, [label]),
    el("div", { class: "miniBig" }, [String(value)]),
    el("div", { class: "miniSub" }, [String(sub)]),
  ]);
}

function arrayTable(columns, rows) {
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

function findInsight(insights, kind) {
  return (
    (Array.isArray(insights) ? insights : []).find((i) => i?.kind === kind) ||
    null
  );
}

function sectionCard(title, insight, children = []) {
  const headline =
    insight?.message || insight?.detail || insight?.note || "No details yet.";
  return el("div", { class: "formBlock" }, [
    cardHeader(title, insight || { kind: title }),
    noteLine(headline),
    ...children,
  ]);
}

function renderOverviewSummary(data) {
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

function renderFoundationSection(insights) {
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

function renderPatternSection(insights) {
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

function renderPredictionSection(insights) {
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

function renderAlertSection(insights) {
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

function renderNarrativeSection(insights) {
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

function renderAdvancedSection(insights, extra) {
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
          trend?.summary?.peakHour != null
            ? fmtHour(trend.summary.peakHour)
            : "—",
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

function renderLoadedDashboard(bundle, date) {
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

function sectionWrapper(title, desc, child) {
  return el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, [title]),
    el("div", { class: "note" }, [desc]),
    child,
  ]);
}

function emptyResults() {
  return el("div", { class: "note" }, ["No intelligence results yet."]);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function setStatus(text) {
  const msg = document.getElementById("in_msg");
  if (msg) msg.textContent = text;
}

async function populateShiftDates(state) {
  const host = document.getElementById("in_date_list");
  if (!host) return;
  host.replaceChildren();
  const r = await fetchIntelligenceShiftDates(state.baseUrl, state.token, {
    limit: 60,
    desc: true,
  });
  if (!r.success) return;

  const dates = Array.isArray(r.data?.dates) ? r.data.dates : [];
  for (const item of dates) {
    const val = String(item?.shift_date || "").slice(0, 10);
    if (!val) continue;
    host.appendChild(el("option", { value: val }, []));
  }
}

export function renderIntelligence(state) {
  const today = getToday();

  const wrap = el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, ["Intelligence"]),
    el("div", { class: "note" }, [
      "Roadmap dashboard: pattern recognition, predictive analytics, intelligent alerts, narratives, automation, and advanced analytics.",
    ]),
    el("div", { class: "formCols" }, [
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["Controls"]),
        el("div", { class: "formRow" }, [
          el("label", {}, ["Shift date"]),
          el("input", {
            id: "in_date",
            list: "in_date_list",
            type: "date",
            value: today,
          }),
        ]),
        el("datalist", { id: "in_date_list" }, []),
        el("div", { class: "actions" }, [
          el(
            "button",
            { class: "btn primary", onclick: async () => refresh(state) },
            ["Refresh"],
          ),
          el(
            "button",
            {
              class: "btn",
              onclick: async () => {
                const input = document.getElementById("in_date");
                if (input) input.value = today;
                await refresh(state);
              },
            },
            ["Today"],
          ),
        ]),
        el("div", { id: "in_msg", class: "msg" }, [""]),
      ]),
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["Coverage"]),
        el("div", { class: "note" }, [
          "This page combines the main intelligence endpoint with campaign, agent, and transition detail endpoints so the roadmap output is visible in one place.",
        ]),
        el("div", { class: "metaGrid" }, [
          kv("Phase 1", "Foundation"),
          kv("Phase 2", "Prediction"),
          kv("Phase 3", "Narratives + scoring"),
        ]),
      ]),
    ]),
    el("div", { id: "in_results", class: "shiftIntel" }, [emptyResults()]),
  ]);

  setTimeout(async () => {
    await populateShiftDates(state);
    await refresh(state);
  }, 0);

  return wrap;
}

async function refresh(state) {
  const date = document.getElementById("in_date")?.value || getToday();
  const host = document.getElementById("in_results");
  if (!host) return;

  setStatus("Loading roadmap intelligence…");
  host.replaceChildren(noteLine("Loading…"));

  const bundle = await fetchIntelligenceBundle(
    state.baseUrl,
    state.token,
    date,
  );
  if (!bundle.success) {
    setStatus(`Failed: ${bundle.error || "Unknown error"}`);
    host.replaceChildren(
      noteLine(
        `Failed to load intelligence: ${bundle.error || "Unknown error"}`,
      ),
    );
    return;
  }

  const insightsCount = Array.isArray(bundle?.insights?.data?.insights)
    ? bundle.insights.data.insights.length
    : 0;
  const campaignsCount = Array.isArray(bundle?.campaigns?.data?.campaigns)
    ? bundle.campaigns.data.campaigns.length
    : 0;
  const agentsCount = Array.isArray(bundle?.agents?.data?.agents)
    ? bundle.agents.data.agents.length
    : 0;

  setStatus(
    `Loaded ${insightsCount} insights • ${campaignsCount} campaigns • ${agentsCount} agents.`,
  );
  host.replaceChildren(renderLoadedDashboard(bundle, date));
}

import { el } from "../ui/dom.js";
import {
  findInsight,
  fmtHour,
  fmtNum,
  fmtPct,
  insightTitle,
  kv,
  noteLine,
  arrayTable,
  sectionCard,
  sectionWrapper,
} from "./intelligenceHelpers.js";

// ─── Prediction Section ───────────────────────────────────────

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
            { label: "Wait avg", render: (r) => fmtNum(r.calls_waiting_avg_pred, 1) },
            { label: "Wait max", render: (r) => fmtNum(r.calls_waiting_max_pred, 1) },
            { label: "Active avg", render: (r) => fmtNum(r.active_calls_avg_pred, 1) },
            { label: "Drop% avg", render: (r) => fmtNum(r.dropped_percent_avg_pred, 2) },
            { label: "Confidence", render: (r) => `${r.confidencePct}%` },
          ],
          forecast.forecastHours.slice(0, 10),
        )
      : noteLine("Not enough historical data for forecasting yet.");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("call_volume_forecasting"), forecast, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Forecasted peak hour",
          forecast?.peakForecastHour != null ? fmtHour(forecast.peakForecastHour) : "—",
        ),
        kv(
          "Model confidence",
          forecast?.confidencePct != null ? `${forecast.confidencePct}%` : "—",
        ),
        kv(
          "Next window hours",
          Array.isArray(forecast?.next2to4Hours) ? forecast.next2to4Hours.length : 0,
        ),
      ]),
      forecastTable,
    ]),
    sectionCard(insightTitle("staffing_optimization_engine"), staffing, [
      el("div", { class: "metaGrid" }, [
        kv("Current agents", staffing?.currentAgents ?? "—"),
        kv("Optimal agents", staffing?.optimalAgents ?? "—"),
        kv(
          "Recommended delta",
          staffing?.recommendedDelta != null
            ? `${staffing.recommendedDelta > 0 ? "+" : ""}${staffing.recommendedDelta}`
            : "—",
        ),
      ]),
      staffing?.context
        ? el("div", { class: "metaGrid" }, [
            kv(
              "Predicted peak waiting",
              staffing.context.predictedPeakWaiting ?? "—",
            ),
            kv(
              "Avg calls/agent",
              staffing.context.avgCallsMaxPerAgent ?? "—",
            ),
            kv(
              "Ready agents now",
              staffing?.readyAgents ?? "—",
            ),
          ])
        : el("span", {}, []),
    ]),
    sectionCard(insightTitle("wait_time_prediction"), wait, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Expected wait",
          wait?.expectedWaitMinutes != null
            ? `${wait.expectedWaitMinutes} min`
            : "—",
        ),
        kv("Risk level", wait?.risk || "—"),
        kv("ETA to threshold", wait?.expectedEtaLocalTime || "—"),
      ]),
      wait?.context
        ? el("div", { class: "metaGrid" }, [
            kv("Waiting now", wait.context.waiting ?? "—"),
            kv("Active calls", wait.context.active ?? "—"),
            kv(
              "Arrival rate/min",
              wait.context.arrivalRatePerMinute ?? "—",
            ),
          ])
        : el("span", {}, []),
    ]),
    sectionCard(insightTitle("shift_duration_optimization"), duration, [
      el("div", { class: "metaGrid" }, [
        kv("Can shorten", duration?.canShorten ? "⚠️ Yes" : "✅ No"),
        kv(
          "Current shift end",
          duration?.currentShiftEndHour != null
            ? fmtHour(duration.currentShiftEndHour)
            : "—",
        ),
        kv(
          "Est. savings",
          duration?.savingsPct != null ? `${duration.savingsPct}%` : "—",
        ),
      ]),
    ]),
  ]);
}

// ─── Risk & Alerts Section ────────────────────────────────────

export function renderAlertSection(insights) {
  const queueRisk = findInsight(insights, "queue_risk_monitoring");
  const anomaly = findInsight(insights, "performance_anomaly_detection");
  const breaks = findInsight(insights, "break_scheduling_intelligence");

  const riskClass =
    queueRisk?.risk === "HIGH"
      ? "bad"
      : queueRisk?.risk === "ELEVATED"
        ? "warn"
        : "good";

  const anomalyTable =
    Array.isArray(anomaly?.anomalies) && anomaly.anomalies.length
      ? arrayTable(
          [
            { label: "Hour", render: (r) => fmtHour(r.hour) },
            { label: "Metric", render: (r) => r.metric },
            { label: "Current", render: (r) => r.value },
            { label: "Baseline avg", render: (r) => r.baselineMean },
            { label: "Z-score", render: (r) => r.zScore },
            {
              label: "Severity",
              render: (r) =>
                r.severity === "bad" ? "🔴 Critical" : "🟡 Warning",
            },
          ],
          anomaly.anomalies,
        )
      : noteLine("✅ No statistical anomalies detected vs 30-day baseline.");

  const breakWindowTable =
    Array.isArray(breaks?.windows) && breaks.windows.length
      ? arrayTable(
          [
            { label: "Hour", render: (r) => fmtHour(r.hour) },
            {
              label: "Waiting avg",
              render: (r) => fmtNum(r.waitingAvg, 1),
            },
            {
              label: "Active avg",
              render: (r) => fmtNum(r.activeAvg, 1),
            },
          ],
          breaks.windows,
        )
      : null;

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("queue_risk_monitoring"), queueRisk, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Risk level",
          queueRisk?.risk
            ? el("span", { class: `badge ${riskClass}` }, [queueRisk.risk])
            : "—",
        ),
        kv("Risk score", queueRisk?.riskScore ?? "—"),
        kv(
          "Queue slope/min",
          queueRisk?.context?.waitingSlopePerMinute != null
            ? fmtNum(queueRisk.context.waitingSlopePerMinute, 2)
            : "—",
        ),
      ]),
      queueRisk?.context
        ? el("div", { class: "metaGrid" }, [
            kv("Waiting", queueRisk.context.waiting ?? "—"),
            kv("Logged in", queueRisk.context.loggedIn ?? "—"),
            kv("Purple agents", queueRisk.context.purple ?? "—"),
          ])
        : el("span", {}, []),
    ]),
    sectionCard(insightTitle("performance_anomaly_detection"), anomaly, [
      anomalyTable,
    ]),
    sectionCard(insightTitle("break_scheduling_intelligence"), breaks, [
      el("div", { class: "metaGrid" }, [
        kv(
          "Suggested break windows",
          Array.isArray(breaks?.suggestedBreakHours) && breaks.suggestedBreakHours.length
            ? breaks.suggestedBreakHours.map(fmtHour).join(", ")
            : "—",
        ),
        kv(
          "Low-pressure windows found",
          Array.isArray(breaks?.windows) ? breaks.windows.length : 0,
        ),
        kv(
          "Status",
          Array.isArray(breaks?.windows) && breaks.windows.length
            ? "✅ Ready"
            : "⏳ Warming up",
        ),
      ]),
      breakWindowTable
        ? el("div", {}, [
            el("div", { class: "divider" }, []),
            el("div", { class: "formBlockTitle", style: "margin-bottom:6px" }, [
              "Low-volume window details",
            ]),
            breakWindowTable,
          ])
        : el("span", {}, []),
    ]),
  ]);
}

// ─── Narratives & Recommendations Section ────────────────────

export function renderNarrativeSection(insights) {
  const voice = findInsight(insights, "voice_of_data_narratives");
  const comparison = findInsight(insights, "comparative_shift_analysis");
  const efficiency = findInsight(insights, "efficiency_recommendations");
  const automation = findInsight(insights, "smart_automation");

  const narrativeList =
    Array.isArray(voice?.narratives) && voice.narratives.length
      ? el(
          "div",
          { class: "shiftIntel" },
          voice.narratives.map((n, i) =>
            el("div", { class: "formBlock" }, [
              el(
                "div",
                { style: "font-size:11px;color:var(--text-muted);margin-bottom:4px" },
                [`Insight ${i + 1}`],
              ),
              el("div", { style: "font-size:13px;line-height:1.6;color:var(--text)" }, [n]),
            ]),
          ),
        )
      : noteLine("Narratives will appear once more shift data accumulates.");

  const compDeltaSign = (v) =>
    v == null ? "—" : `${v >= 0 ? "+" : ""}${v}%`;

  const recsTable =
    Array.isArray(efficiency?.recommendations) && efficiency.recommendations.length
      ? arrayTable(
          [
            {
              label: "Priority",
              render: (r) =>
                r.priority === "high"
                  ? "🔴 High"
                  : r.priority === "medium"
                    ? "🟡 Medium"
                    : "🟢 Low",
            },
            { label: "Code", render: (r) => r.code },
            { label: "Action", render: (r) => r.note },
          ],
          efficiency.recommendations,
        )
      : noteLine("✅ No priority recommendations right now.");

  const autoTable =
    Array.isArray(automation?.suggestions) && automation.suggestions.length
      ? arrayTable(
          [
            { label: "Type", render: (r) => r.type.replace(/_/g, " ") },
            { label: "Suggestion", render: (r) => r.note },
          ],
          automation.suggestions,
        )
      : noteLine("✅ No smart automation triggers are currently active.");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("voice_of_data_narratives"), voice, [
      narrativeList,
    ]),
    sectionCard(insightTitle("comparative_shift_analysis"), comparison, [
      comparison?.deltas
        ? el("div", { class: "metaGrid" }, [
            kv("Waiting peak vs history", compDeltaSign(comparison.deltas.callsPeakPct)),
            kv("Active peak vs history", compDeltaSign(comparison.deltas.activePeakPct)),
            kv("Drop% vs history", compDeltaSign(comparison.deltas.droppedMeanPct)),
          ])
        : noteLine("Not enough historical comparison data yet."),
      comparison?.compareWindowDays
        ? el("div", { class: "note", style: "margin-top:6px" }, [
            `Compared against ${comparison.compareWindowDays} historical shifts.`,
          ])
        : el("span", {}, []),
    ]),
    sectionCard(insightTitle("efficiency_recommendations"), efficiency, [
      recsTable,
    ]),
    sectionCard(insightTitle("smart_automation"), automation, [autoTable]),
  ]);
}

// ─── Advanced Analytics Section ──────────────────────────────

export function renderAdvancedSection(insights, extra) {
  const scoring = findInsight(insights, "agent_performance_scoring");
  const trend = findInsight(insights, "trend_forecasting_dashboard");

  const topAgentsTable =
    Array.isArray(scoring?.topAgents) && scoring.topAgents.length
      ? arrayTable(
          [
            { label: "Agent", render: (r) => r.name || r.user },
            { label: "Campaign", render: (r) => r.campaign || "—" },
            { label: "Score", render: (r) => `${r.scorePct}%` },
            { label: "Utilization", render: (r) => `${r.utilizationPct}%` },
            { label: "Pause %", render: (r) => `${r.pausePct}%` },
            { label: "Purple %", render: (r) => `${r.purplePct}%` },
            { label: "Calls max", render: (r) => r.callsMax },
          ],
          scoring.topAgents.slice(0, 10),
        )
      : noteLine("No agent scoring data yet — needs shift snapshots.");

  const bottomAgentsTable =
    Array.isArray(scoring?.bottomAgents) && scoring.bottomAgents.length
      ? arrayTable(
          [
            { label: "Agent", render: (r) => r.name || r.user },
            { label: "Campaign", render: (r) => r.campaign || "—" },
            { label: "Score", render: (r) => `${r.scorePct}%` },
            { label: "Purple %", render: (r) => `${r.purplePct}%` },
            { label: "Pause %", render: (r) => `${r.pausePct}%` },
          ],
          scoring.bottomAgents,
        )
      : null;

  const campaignsTable =
    Array.isArray(extra?.campaigns) && extra.campaigns.length
      ? arrayTable(
          [
            { label: "Campaign", render: (r) => r.campaign },
            { label: "Appearances", render: (r) => r.agentAppearances },
            { label: "Waiting %", render: (r) => fmtPct((r.waitingRatio || 0) * 100) },
            { label: "Purple %", render: (r) => fmtPct((r.purpleRatio || 0) * 100) },
            { label: "In-call %", render: (r) => fmtPct((r.inCallRatio || 0) * 100) },
          ],
          extra.campaigns.slice(0, 8),
        )
      : null;

  const transitionsTable =
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
      topAgentsTable,
      bottomAgentsTable
        ? el("div", {}, [
            el("div", { class: "divider" }, []),
            el("div", { class: "formBlockTitle", style: "margin-bottom:6px" }, [
              "Agents needing attention",
            ]),
            bottomAgentsTable,
          ])
        : el("span", {}, []),
    ]),
    sectionCard(insightTitle("trend_forecasting_dashboard"), trend, [
      trend?.summary
        ? el("div", { class: "metaGrid" }, [
            kv(
              "Forecasted peak hour",
              trend.summary.peakHour != null ? fmtHour(trend.summary.peakHour) : "—",
            ),
            kv("Peak waiting forecast", trend.summary.peakWaitingPred ?? "—"),
            kv("Avg waiting forecast", trend.summary.avgWaitingPred ?? "—"),
            kv(
              "Staffing delta",
              trend.summary.staffingDelta != null
                ? `${trend.summary.staffingDelta > 0 ? "+" : ""}${trend.summary.staffingDelta}`
                : "—",
            ),
            kv(
              "vs historical peak",
              trend.summary.currentVsHistoryCallsPeakPct != null
                ? `${trend.summary.currentVsHistoryCallsPeakPct >= 0 ? "+" : ""}${trend.summary.currentVsHistoryCallsPeakPct}%`
                : "—",
            ),
          ])
        : noteLine("Trend forecast summary unavailable."),
    ]),
    sectionCard(
      "Campaign deep-dive",
      {
        kind: "campaign_api_detail",
        message: "Live campaign endpoint stats for this shift.",
        ok: true,
      },
      [
        campaignsTable
          ? campaignsTable
          : noteLine("No campaign data returned from the detail endpoint."),
      ],
    ),
    sectionCard(
      "Transition deep-dive",
      {
        kind: "transition_api_detail",
        message: "State transition data from the transitions endpoint.",
        ok: true,
      },
      [
        transitionsTable
          ? transitionsTable
          : noteLine("No transition data returned from the detail endpoint."),
      ],
    ),
  ]);
}

// ─── Section Wrapper Exports ──────────────────────────────────

export function renderPredictionSectionWrapper(insights) {
  return sectionWrapper(
    "🔮 Predictive Analytics",
    "Call volume forecasting, staffing optimization, wait time outlook, and shift duration guidance.",
    renderPredictionSection(insights),
  );
}

export function renderAlertSectionWrapper(insights) {
  return sectionWrapper(
    "⚠️ Risk & Intelligent Alerts",
    "Real-time queue risk score, statistical anomaly detection, and optimal break windows.",
    renderAlertSection(insights),
  );
}

export function renderNarrativeSectionWrapper(insights) {
  return sectionWrapper(
    "💡 Automated Insights",
    "Voice-of-data narratives, comparative analysis, efficiency recommendations, and automation suggestions.",
    renderNarrativeSection(insights),
  );
}

export function renderAdvancedSectionWrapper(insights, extra) {
  return sectionWrapper(
    "📈 Advanced Analytics",
    "Agent performance scoring, trend forecasting dashboard, and campaign/transition deep-dives.",
    renderAdvancedSection(insights, extra),
  );
}

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

export function renderFoundationSection(insights) {
  const rush = findInsight(insights, "first_hour_rush");
  const peak = findInsight(insights, "peak_hour_consistency");
  const staffing = findInsight(insights, "proactive_staffing");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("first_hour_rush"), rush, [
      el("div", { class: "metaGrid" }, [
        kv("Rush detected", rush?.isRush ? "⚠️ Yes" : "✅ No"),
        kv(
          "Intensity vs shift avg",
          rush?.intensityPct != null ? `${rush.intensityPct}%` : "—",
        ),
        kv(
          "Suggested agents",
          rush?.suggestedAgents != null ? `+${rush.suggestedAgents}` : "—",
        ),
      ]),
    ]),
    sectionCard(insightTitle("peak_hour_consistency"), peak, [
      el("div", { class: "metaGrid" }, [
        kv("Reliable peak hour", peak?.peakHour != null ? fmtHour(peak.peakHour) : "—"),
        kv(
          "Historical confidence",
          peak?.confidencePct != null ? `${peak.confidencePct}%` : "—",
        ),
        kv("Days analysed", peak?.window?.daysWithData ?? "—"),
      ]),
    ]),
    sectionCard(insightTitle("proactive_staffing"), staffing, [
      el("div", { class: "metaGrid" }, [
        kv("Queue risk", staffing?.risk || "—"),
        kv(
          "Suggested add",
          staffing?.suggestedAgents != null ? `+${staffing.suggestedAgents}` : "—",
        ),
        kv("ETA to spike", staffing?.etaLocalTime || "—"),
      ]),
    ]),
  ]);
}

export function renderPatternSection(insights) {
  const transitions = findInsight(insights, "agent_state_transition_patterns");
  const campaigns = findInsight(insights, "campaign_performance_trends");

  const transitionTable =
    Array.isArray(transitions?.topTransitions) && transitions.topTransitions.length
      ? arrayTable(
          [
            { label: "From state", render: (r) => r.from },
            { label: "To state", render: (r) => r.to },
            { label: "Count", render: (r) => r.count },
          ],
          transitions.topTransitions.slice(0, 8),
        )
      : noteLine("No transition data yet — needs multiple snapshots in a shift.");

  const stuckPurpleTable =
    Array.isArray(transitions?.stuckPurpleAgents) && transitions.stuckPurpleAgents.length
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
            { label: "In-call %", render: (r) => fmtPct((r.inCallRatio || 0) * 100) },
            { label: "Waiting %", render: (r) => fmtPct((r.waitingRatio || 0) * 100) },
            { label: "Paused %", render: (r) => fmtPct((r.pausedRatio || 0) * 100) },
            { label: "Avg calls", render: (r) => fmtNum(r.avgCallsPerAppearance, 1) },
          ],
          campaigns.topCampaigns.slice(0, 8),
        )
      : noteLine("No campaign trend data yet.");

  return el("div", { class: "formCols" }, [
    sectionCard(insightTitle("agent_state_transition_patterns"), transitions, [
      transitionTable,
      stuckPurpleTable ? el("div", { class: "divider" }, []) : el("span", {}, []),
      stuckPurpleTable
        ? el("div", {}, [
            el("div", { class: "formBlockTitle", style: "margin-bottom:6px" }, [
              "Agents with high purple occurrences",
            ]),
            stuckPurpleTable,
          ])
        : el("span", {}, []),
    ]),
    sectionCard(insightTitle("campaign_performance_trends"), campaigns, [
      campaigns?.worstWaitCampaign
        ? el("div", { class: "metaGrid" }, [
            kv("Highest wait pressure", campaigns.worstWaitCampaign.campaign),
            kv("Best flow campaign", campaigns?.bestFlowCampaign?.campaign || "—"),
            kv(
              "Avg wait ratio",
              campaigns?.context?.avgWaitRatio != null
                ? `${campaigns.context.avgWaitRatio}%`
                : "—",
            ),
          ])
        : el("span", {}, []),
      campaignTable,
    ]),
  ]);
}

export function renderFoundationSectionWrapper(insights) {
  return sectionWrapper(
    "🧱 Foundation",
    "Core intelligence: first-hour pressure, historical peak hours, and real-time staffing guidance.",
    renderFoundationSection(insights),
  );
}

export function renderPatternSectionWrapper(insights) {
  return sectionWrapper(
    "🔎 Pattern Recognition",
    "Agent state transitions, campaign behavior, and flow bottlenecks.",
    renderPatternSection(insights),
  );
}

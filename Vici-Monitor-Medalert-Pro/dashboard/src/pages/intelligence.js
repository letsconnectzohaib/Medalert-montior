import {
  fetchIntelligenceBundle,
  fetchIntelligenceShiftDates,
} from "../apiClient.js";
import { el } from "../ui/dom.js";
import {
  emptyResults,
  getToday,
  kv,
  noteLine,
  setStatus,
} from "./intelligenceHelpers.js";
import { renderLoadedDashboard } from "./intelligenceSections.js";
import { renderHeatmap, generateHourlyHeatmapData } from "../ui/heatmap.js";
import { renderAdvancedTimeSeries, renderCorrelationMatrix } from "../ui/advancedCharts.js";
import { renderInteractiveDrilldown } from "../ui/interactiveCharts.js";
import { renderPredictiveDashboard } from "../ui/predictiveCharts.js";

async function populateShiftDates(state) {
  const host = document.getElementById("in_date_list");
  if (!host) return;

  host.replaceChildren();

  const result = await fetchIntelligenceShiftDates(state.baseUrl, state.token, {
    limit: 60,
    desc: true,
  });

  if (!result.success) return;

  const dates = Array.isArray(result.data?.dates) ? result.data.dates : [];
  for (const item of dates) {
    const value = String(item?.shift_date || "").slice(0, 10);
    if (!value) continue;
    host.appendChild(el("option", { value }, []));
  }
}

function buildControlsCard(today, state) {
  return el("div", { class: "formBlock" }, [
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
        {
          class: "btn primary",
          onclick: async () => refresh(state),
        },
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
  ]);
}

function buildCoverageCard() {
  return el("div", { class: "formBlock" }, [
    el("div", { class: "formBlockTitle" }, ["Coverage"]),
    el("div", { class: "note" }, [
      "This page combines the main intelligence endpoint with campaign, agent, and transition detail endpoints so the roadmap output is visible in one place.",
    ]),
    el("div", { class: "metaGrid" }, [
      kv("Phase 1", "Foundation"),
      kv("Phase 2", "Prediction"),
      kv("Phase 3", "Narratives + scoring"),
    ]),
  ]);
}

export function renderIntelligence(state) {
  const today = getToday();

  const wrap = el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, ["Intelligence"]),
    el("div", { class: "note" }, [
      "Roadmap dashboard: pattern recognition, predictive analytics, intelligent alerts, narratives, automation, and advanced analytics.",
    ]),
    el("div", { class: "formCols" }, [
      buildControlsCard(today, state),
      buildCoverageCard(),
    ]),
    el("div", { id: "in_results", class: "shiftIntel" }, [emptyResults()]),
  ]);

  setTimeout(async () => {
    await populateShiftDates(state);
    await refresh(state);
  }, 0);

  return wrap;
}

export async function refresh(state) {
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
    const errorText = bundle.error || "Unknown error";
    setStatus(`Failed: ${errorText}`);
    host.replaceChildren(noteLine(`Failed to load intelligence: ${errorText}`));
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

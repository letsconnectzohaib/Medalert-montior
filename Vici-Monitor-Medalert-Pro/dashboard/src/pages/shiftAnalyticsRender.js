import { el } from "../ui/dom.js";
import { statCard, compareCard } from "./shiftAnalyticsCards.js";
import { callflowCards } from "./shiftAnalyticsCards.js";
import { timelineChart } from "./shiftAnalyticsCharts.js";
import { callflowChart } from "./shiftAnalyticsCharts.js";
import { renderHourlyIntoDom, renderDebugIntoDom } from "./shiftAnalyticsTables.js";

export function renderIntelIntoDom(data, callflow) {
  const host = document.getElementById("shiftIntel");
  if (!host) return;
  host.innerHTML = "";

  const cards = el("div", { class: "shiftCards" }, [
    statCard("First hour", data?.rollups?.firstHour),
    statCard("Half shift", data?.rollups?.halfShift),
    statCard("Full shift", data?.rollups?.fullShift),
    compareCard(
      "Yesterday (full shift)",
      data?.compare?.fullShift,
      data?.rollups?.fullShift,
    ),
  ]);
  const chart = timelineChart(data?.series || {}, data?.shiftHours || []);
  const cfCards = callflowCards(callflow);
  const cfChart = callflowChart(callflow);
  host.appendChild(cards);
  host.appendChild(chart);
  if (cfCards) host.appendChild(cfCards);
  if (cfChart) host.appendChild(cfChart);
}

export { renderHourlyIntoDom, renderDebugIntoDom };

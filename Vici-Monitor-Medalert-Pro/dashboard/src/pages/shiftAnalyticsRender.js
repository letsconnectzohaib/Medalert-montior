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

  // Enhanced header with better spacing and modern design
  const header = el("div", { class: "shiftHeader" }, [
    el("h2", { class: "shiftTitle" }, ["📊 Shift Performance Summary"]),
    el("div", { class: "shiftSubtitle" }, [
      el("span", { class: "badge success" }, ["Live Data"]),
      el("span", { class: "timestamp" }, [`Updated: ${new Date().toLocaleString()}`])
    ])
  ]);

  // Enhanced KPI cards with better layout
  const cards = el("div", { class: "shiftCards enhanced" }, [
    el("div", { class: "kpiRow" }, [
      statCard("📞 First Hour", data?.rollups?.firstHour),
      statCard("⏰ Half Shift", data?.rollups?.halfShift),
    ]),
    el("div", { class: "kpiRow" }, [
      statCard("🎯 Full Shift", data?.rollups?.fullShift),
      compareCard(
        "📈 Yesterday (Full Shift)",
        data?.compare?.fullShift,
        data?.rollups?.fullShift,
      ),
    ]),
  ]);

  // Charts section with better layout
  const chartsSection = el("div", { class: "chartsSection" }, [
    el("div", { class: "chartContainer" }, [
      el("h3", { class: "chartTitle" }, ["📈 Timeline Overview"]),
      timelineChart(data?.series || {}, data?.shiftHours || []),
    ]),
    el("div", { class: "chartContainer" }, [
      el("h3", { class: "chartTitle" }, ["📊 Call Flow Analysis"]),
      callflowChart(callflow),
    ]),
  ]);

  // Call flow cards if available
  const cfCards = callflowCards(callflow);
  
  // Enhanced layout with better spacing
  host.appendChild(header);
  host.appendChild(cards);
  host.appendChild(chartsSection);
  if (cfCards) host.appendChild(cfCards);
}

export { renderHourlyIntoDom, renderDebugIntoDom };

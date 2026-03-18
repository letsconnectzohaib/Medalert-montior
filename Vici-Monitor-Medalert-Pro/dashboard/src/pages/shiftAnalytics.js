import { fetchShiftIntelligence, fetchShiftCallflow } from "../apiClient.js";
import { el } from "../ui/dom.js";
import { renderIntelIntoDom, renderHourlyIntoDom, renderDebugIntoDom } from "./shiftAnalyticsRender.js";

function buildMsg(data, callflow) {
  const peak = data?.peakHour;
  const w = data?.shiftWindow;
  const peakText = peak
    ? `Peak hour: ${peak.hour}:00 (total agents ${peak.total_agents})`
    : "No peak hour yet.";
  const windowText = w ? `Shift window: ${w.start} → ${w.end}` : "";
  const peakWait = callflow?.peak?.waiting;
  const peakWaitText = peakWait
    ? `Peak waiting: ${peakWait.hour}:00 (max waiting ${peakWait.calls_waiting_max})`
    : "";
  return [windowText, peakText, peakWaitText].filter(Boolean).join(" • ");
}

export function renderShiftAnalytics(state) {
  const wrap = el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, ["Shift summary"]),
    el("div", { class: "formCols" }, [
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["Controls"]),
        el("div", { class: "formRow" }, [
          el("label", {}, ["Shift date"]),
          el("input", {
            id: "shiftDate",
            type: "date",
            value: new Date().toISOString().slice(0, 10),
          }),
        ]),
        el("div", { class: "actions" }, [
          el(
            "button",
            {
              class: "btn primary",
              onclick: async () => {
                const date = document.getElementById("shiftDate").value;
                const [r, c] = await Promise.all([
                  fetchShiftIntelligence(state.baseUrl, state.token, date),
                  fetchShiftCallflow(state.baseUrl, state.token, date),
                ]);
                const msg = document.getElementById("shiftMsg");
                if (!r.success || !c.success) {
                  msg.textContent = !r.success
                    ? r.error || "Failed to load shift summary."
                    : c.error || "Failed to load callflow.";
                  renderHourlyIntoDom(null);
                  return;
                }
                // Cache the loaded intelligence so live snapshot updates don't clear it.
                state.shiftIntelCache = {
                  date,
                  data: r.data,
                  callflow: c.data,
                };
                renderIntelIntoDom(r.data, c.data);
                msg.textContent = buildMsg(r.data, c.data);
                renderHourlyIntoDom(r.data);
                renderDebugIntoDom(r.data);
              },
            },
            ["Load summary"],
          ),
        ]),
      ]),
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["What you're seeing"]),
        el("div", { class: "note" }, [
          "This page is DB-driven (hourly aggregates). Live snapshots continue in the background without forcing page refresh.",
        ]),
      ]),
    ]),
    el("div", { id: "shiftMsg", class: "msg" }, [""]),
    el("div", { class: "historyWrap" }, [
      el("div", { id: "shiftIntel", class: "shiftIntel" }, [""]),
      el("div", { id: "shiftHourly", class: "tableWrap" }, [
        "Load a shift to see hourly table…",
      ]),
      el("div", { id: "shiftDebug", class: "note" }, [""]),
    ]),
  ]);

  // If we already loaded a summary, render it immediately.
  if (state.shiftIntelCache?.data?.success) {
    const { data, callflow } = state.shiftIntelCache;
    setTimeout(() => {
      const msg = document.getElementById("shiftMsg");
      if (!msg) return;
      renderIntelIntoDom(data, callflow);
      msg.textContent = buildMsg(data, callflow);
      renderHourlyIntoDom(data);
      renderDebugIntoDom(data);
    }, 0);
  }

  return wrap;
}

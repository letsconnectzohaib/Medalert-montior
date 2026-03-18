import { el } from "../ui/dom.js";
import { fmtHour } from "./shiftAnalyticsCards.js";

export function renderHourlyIntoDom(data) {
  const host = document.getElementById("shiftHourly");
  if (!host) return;
  if (!data?.series || !data?.shiftHours?.length) {
    host.textContent = "No hourly buckets yet.";
    return;
  }

  const series = data.series || {};
  const hours = data.shiftHours || [];

  const table = el("table", {}, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", {}, ["Hour"]),
        el("th", {}, ["Purple"]),
        el("th", {}, ["Violet"]),
        el("th", {}, ["Blue"]),
        el("th", {}, ["In-call"]),
        el("th", {}, ["Ready"]),
        el("th", {}, ["Total"]),
      ]),
    ]),
    el(
      "tbody",
      {},
      hours.map((h) => {
        const row = series?.[h] || {};
        const purple = Number(row.oncall_gt_5m || 0);
        const violet = Number(row.oncall_gt_1m || 0);
        const blue = Number(row.waiting_gt_1m || 0);
        const inCall = Number(row.in_call || 0);
        const ready = Number(row.ready || 0);
        const total = Object.values(row).reduce(
          (a, b) => a + Number(b || 0),
          0,
        );
        return el("tr", {}, [
          el("td", {}, [fmtHour(h)]),
          el("td", {}, [String(purple)]),
          el("td", {}, [String(violet)]),
          el("td", {}, [String(blue)]),
          el("td", {}, [String(inCall)]),
          el("td", {}, [String(ready)]),
          el("td", {}, [String(total)]),
        ]);
      }),
    ),
  ]);

  host.replaceChildren(table);
}

export function renderDebugIntoDom(data) {
  const host = document.getElementById("shiftDebug");
  if (!host) return;
  if (!data?.series) {
    host.textContent = "";
    return;
  }

  const txt = formatHours(data.series || {}, data.shiftHours || []);
  const details = el("details", {}, [
    el(
      "summary",
      { class: "note", style: "cursor:pointer;user-select:none;" },
      ["Debug text (hourly buckets)"],
    ),
    el("pre", { class: "history" }, [txt]),
  ]);
  host.replaceChildren(details);
}

export function formatHours(series, shiftHours) {
  const keys = (shiftHours?.length ? shiftHours : Object.keys(series)).map(
    (x) => Number(x),
  );
  const uniq = [...new Set(keys)].sort((a, b) => a - b);
  if (!uniq.length) return "No hourly buckets yet.";
  return uniq
    .map((h) => {
      const b = series[h] || {};
      return `${fmtHour(h)} | purple(oncall>5m)=${b.oncall_gt_5m || 0} violet(oncall>1m)=${b.oncall_gt_1m || 0} blue(wait>1m)=${b.waiting_gt_1m || 0} in_call=${b.in_call || 0} ready=${b.ready || 0}`;
    })
    .join("\n");
}

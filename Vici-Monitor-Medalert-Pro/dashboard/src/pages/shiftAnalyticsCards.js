import { el } from "../ui/dom.js";

export function statCard(title, roll) {
  const totals = roll?.totals || {};
  const total = roll?.totalAgents ?? 0;
  return el("div", { class: "miniCard" }, [
    el("div", { class: "miniTitle" }, [title]),
    el("div", { class: "miniBig" }, [String(total)]),
    el("div", { class: "miniSub" }, [keyBucketsSummary(totals)]),
  ]);
}

export function compareCard(title, prev, current) {
  const a = prev?.totalAgents ?? 0;
  const b = current?.totalAgents ?? 0;
  const delta = b - a;
  const sign = delta > 0 ? "+" : "";
  return el("div", { class: "miniCard" }, [
    el("div", { class: "miniTitle" }, [title]),
    el("div", { class: "miniBig" }, [String(a)]),
    el("div", { class: "miniSub" }, [`Δ vs today: ${sign}${delta}`]),
  ]);
}

export function callflowStat(title, roll) {
  const avgActive = round1(roll?.active_calls_avg ?? 0);
  const maxActive = roll?.active_calls_max ?? 0;
  const avgWait = round1(roll?.calls_waiting_avg ?? 0);
  const maxWait = roll?.calls_waiting_max ?? 0;
  const callsTodayMax = roll?.calls_today_max ?? 0;
  const dropMax = round1(roll?.dropped_percent_max ?? 0);
  return el("div", { class: "miniCard" }, [
    el("div", { class: "miniTitle" }, [title]),
    el("div", { class: "miniBig" }, [`${maxWait}`]),
    el("div", { class: "miniSub" }, [
      `waiting max=${maxWait} avg=${avgWait} • active max=${maxActive} avg=${avgActive} • calls today max=${callsTodayMax} • drop% max=${dropMax}`,
    ]),
  ]);
}

export function callflowCompare(title, prev, current) {
  const a = prev?.calls_waiting_max ?? 0;
  const b = current?.calls_waiting_max ?? 0;
  const delta = b - a;
  const sign = delta > 0 ? "+" : "";
  return el("div", { class: "miniCard" }, [
    el("div", { class: "miniTitle" }, [title]),
    el("div", { class: "miniBig" }, [String(a)]),
    el("div", { class: "miniSub" }, [
      `Δ waiting max vs today: ${sign}${delta}`,
    ]),
  ]);
}

export function callflowCards(callflow) {
  if (!callflow?.success && !callflow?.series) return null;
  const r = callflow?.rollups || {};
  return el("div", { class: "shiftCards" }, [
    callflowStat("Calls (first hour)", r.firstHour),
    callflowStat("Calls (half shift)", r.halfShift),
    callflowStat("Calls (rest of shift)", r.restOfShift),
    callflowCompare(
      "Yesterday (calls full shift)",
      callflow?.compare?.fullShift,
      r.fullShift,
    ),
  ]);
}

export function round1(x) {
  const n = Number(x || 0);
  return Math.round(n * 10) / 10;
}

export function keyBucketsSummary(totals) {
  const purple = totals.oncall_gt_5m || 0;
  const violet = totals.oncall_gt_1m || 0;
  const blue = totals.waiting_gt_1m || 0;
  const inCall = totals.in_call || 0;
  const ready = totals.ready || 0;
  return `purple>${purple} violet>${violet} blue>${blue} in-call>${inCall} ready>${ready}`;
}

export function fmtHour(h) {
  return `${String(h).padStart(2, "0")}:00`;
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

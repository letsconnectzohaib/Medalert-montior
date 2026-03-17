const { ymdAddDays, buildShiftHours } = require("../lib/shiftMath");
const { toLocalParts } = require("../db/time");

function clampNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function toYmd(iso) {
  return String(iso || "").slice(0, 10);
}

function pct(x) {
  return Math.round(Number(x || 0) * 100);
}

function round1(x) {
  const n = Number(x || 0);
  return Math.round(n * 10) / 10;
}

function sum(arr) {
  return (arr || []).reduce((a, b) => a + Number(b || 0), 0);
}

function avg(arr) {
  return arr?.length ? sum(arr) / arr.length : 0;
}

function maxBy(arr, pick) {
  let best = null;
  for (const item of arr || []) {
    const v = Number(pick(item) || 0);
    if (!best || v > best.v) best = { item, v };
  }
  return best?.item || null;
}

function safeDiv(a, b, fallback = 0) {
  const x = Number(a || 0);
  const y = Number(b || 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y === 0) return fallback;
  return x / y;
}

function parseIsoMs(ts) {
  const ms = Date.parse(String(ts || ""));
  return Number.isFinite(ms) ? ms : null;
}

function pickMostFrequent(map) {
  let best = null;
  for (const [k, v] of map.entries()) {
    if (!best || v > best.count) best = { key: k, count: v };
  }
  return best;
}

function dayOfWeekFromShiftDate(shiftDate) {
  const dt = new Date(`${shiftDate}T00:00:00Z`);
  return dt.getUTCDay();
}

function hourLabel(hour) {
  return `${String(Number(hour)).padStart(2, "0")}:00`;
}

function etaLocalTime(tsIso, tzOffsetMinutes, addMinutes) {
  const baseMs = Date.parse(tsIso);
  if (!Number.isFinite(baseMs)) return null;
  const dt = new Date(
    baseMs + Number(addMinutes || 0) * 60 * 1000,
  ).toISOString();
  const local = toLocalParts(dt, tzOffsetMinutes);
  return `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
}

function estimateEtaMinutesFromSeries(series, targetWaiting) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const pts = (series || []).filter((p) => {
    const t = Date.parse(p.ts);
    return Number.isFinite(t) && t >= now - windowMs;
  });
  if (pts.length < 3) return null;

  const t0 = Date.parse(pts[0].ts);
  const xs = pts.map((p) => (Date.parse(p.ts) - t0) / 60000);
  const ys = pts.map((p) => Number(p.calls_waiting || 0));
  const n = xs.length;
  const xbar = xs.reduce((a, b) => a + b, 0) / n;
  const ybar = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xbar) * (ys[i] - ybar);
    den += (xs[i] - xbar) * (xs[i] - xbar);
  }
  if (!den) return null;
  const slope = num / den;
  if (!(slope > 0.05)) return null;
  const yNow = ys[ys.length - 1];
  const minutes = (Number(targetWaiting) - yNow) / slope;
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) return null;
  return Math.round(minutes);
}

function hourVolumesFromCallsTodayMax({ shiftHours, hourlyRows }) {
  const byHour = new Map();
  for (const r of hourlyRows || []) byHour.set(Number(r.hour), r);

  const vols = [];
  let prev = null;
  for (const h of shiftHours) {
    const row = byHour.get(Number(h));
    const cur = clampNum(row?.calls_today_max, 0);
    const v = prev == null ? 0 : Math.max(0, cur - prev);
    vols.push({
      hour: Number(h),
      volume: v,
      calls_today_max: cur,
      row: row || null,
    });
    prev = cur;
  }
  return vols;
}

function normalizeHourMap(rows, valueKey) {
  const map = new Map();
  for (const r of rows || [])
    map.set(Number(r.hour), clampNum(r?.[valueKey], 0));
  return map;
}

async function computeFirstHourRush({ shiftHours, callflowRows }) {
  const vols = hourVolumesFromCallsTodayMax({
    shiftHours,
    hourlyRows: callflowRows,
  });
  const first2 = vols.slice(0, 2).map((x) => x.volume);
  const remaining = vols.slice(2).map((x) => x.volume);
  const overall = vols.map((x) => x.volume);
  const first2Avg = avg(first2);
  const remainAvg = avg(remaining);
  const shiftAvg = avg(overall);

  if (!shiftAvg) {
    return {
      kind: "first_hour_rush",
      ok: true,
      note: "Not enough call volume data yet.",
    };
  }

  const againstShift = first2Avg / shiftAvg - 1;
  const againstRest = remainAvg ? first2Avg / remainAvg - 1 : againstShift;
  const isRush = againstShift >= 0.2 || againstRest >= 0.2;
  const suggestedAgents = Math.max(
    0,
    Math.round((first2Avg / Math.max(1, shiftAvg)) * 2 - 2),
  );

  return {
    kind: "first_hour_rush",
    ok: true,
    isRush,
    intensityPct: pct(Math.max(0, againstShift)),
    versusRestPct: pct(Math.max(0, againstRest)),
    suggestedAgents,
    detail: isRush
      ? `First 2 hours are ${pct(Math.max(0, againstShift))}% above shift average. Consider adding ${suggestedAgents} agents at shift start.`
      : "First 2 hours are within expected range.",
  };
}

async function computePeakHourConsistency({
  startShiftDate,
  endShiftDate,
  rangeRows,
}) {
  const byDate = new Map();
  for (const r of rangeRows || []) {
    const d = String(r.shift_date || "");
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(r);
  }

  const peaks = [];
  for (const [d, rows] of byDate.entries()) {
    let best = null;
    for (const r of rows) {
      const v = clampNum(r.calls_waiting_max, 0);
      if (!best || v > best.v) best = { hour: Number(r.hour), v };
    }
    if (best) peaks.push({ shiftDate: d, hour: best.hour, score: best.v });
  }

  const freq = new Map();
  for (const p of peaks) freq.set(p.hour, (freq.get(p.hour) || 0) + 1);
  const best = pickMostFrequent(freq);
  const total = peaks.length;
  if (!best || !total) {
    return {
      kind: "peak_hour_consistency",
      ok: true,
      note: "Not enough history yet.",
    };
  }

  const confidence = best.count / total;
  return {
    kind: "peak_hour_consistency",
    ok: true,
    peakHour: Number(best.key),
    confidencePct: pct(confidence),
    window: { startShiftDate, endShiftDate, daysWithData: total },
    detail: `Reliable peak hour: ${hourLabel(best.key)}-${hourLabel((Number(best.key) + 1) % 24)} (${pct(confidence)}% confidence).`,
  };
}

async function computeProactiveStaffing({
  shiftDate,
  latest,
  callflowRows,
  settings,
  recentCallflow,
}) {
  const snap = latest?.snapshot;
  const readyNow =
    (Array.isArray(snap?.agents)
      ? snap.agents.filter((a) => a?.stateBucket === "ready").length
      : null) ?? null;
  const waitingNow = clampNum(snap?.summary?.callsWaiting, 0);
  const activeNow = clampNum(snap?.summary?.activeCalls, 0);

  const gap = readyNow == null ? null : Math.max(0, waitingNow - readyNow);
  const localHour = snap?.timestamp
    ? Number(String(snap.timestamp).slice(11, 13))
    : null;
  const byHour = new Map();
  for (const r of callflowRows || []) byHour.set(Number(r.hour), r);
  const cur = localHour == null ? null : byHour.get(localHour);
  const curWaitMax = clampNum(cur?.calls_waiting_max, 0);
  const avgWaitMax = avg(
    (callflowRows || []).map((r) => clampNum(r.calls_waiting_max, 0)),
  );

  const risk = avgWaitMax ? curWaitMax / avgWaitMax : 0;
  const riskLabel = risk >= 1.5 ? "HIGH" : risk >= 1.2 ? "ELEVATED" : "NORMAL";

  const waitingSpikeMax = Math.max(
    1,
    Number(settings?.alerts?.waitingSpikeMax ?? 25),
  );
  const etaMin = estimateEtaMinutesFromSeries(
    recentCallflow || [],
    waitingSpikeMax,
  );
  const eta =
    etaMin != null
      ? etaLocalTime(
          snap?.timestamp || new Date().toISOString(),
          settings?.shift?.tzOffsetMinutes ?? 0,
          etaMin,
        )
      : null;

  let message = `Queue risk: ${riskLabel}. Waiting=${waitingNow}, Active=${activeNow}.`;
  if (gap != null) {
    message += ` Ready agents=${readyNow}. Suggested add=${gap}.`;
    if (eta)
      message += ` If trend continues, waiting spike threshold by ${eta}.`;
  } else {
    message += " (Ready agents unavailable in snapshot.)";
  }

  return {
    kind: "proactive_staffing",
    ok: true,
    risk: riskLabel,
    suggestedAgents: gap,
    etaMinutesToWaitingSpike: etaMin,
    etaLocalTime: eta,
    message,
    context: {
      shiftDate,
      waitingNow,
      activeNow,
      readyNow,
      curWaitMax,
      avgWaitMax,
      waitingSpikeMax,
    },
  };
}

async function computeAgentStateTransitionPatterns({
  shiftDate,
  transitionsData,
}) {
  const transitions = Array.isArray(transitionsData?.transitions)
    ? transitionsData.transitions
    : [];
  const stuckPurple = Array.isArray(transitionsData?.stuckPurple)
    ? transitionsData.stuckPurple
    : [];
  const top = transitions.slice(0, 5);
  const purpleAvg = avg(stuckPurple.map((x) => Number(x.occurrences || 0)));
  const purpleHigh = stuckPurple.filter(
    (x) => Number(x.occurrences || 0) >= Math.max(2, purpleAvg * 1.35),
  );

  return {
    kind: "agent_state_transition_patterns",
    ok: true,
    topTransitions: top,
    stuckPurpleAgents: purpleHigh.slice(0, 8),
    detail: top.length
      ? `Most common state flow: ${top[0].from} → ${top[0].to} (${top[0].count} transitions).`
      : `No transition history yet for ${shiftDate}.`,
    message: purpleHigh.length
      ? `Agents stuck in purple >5m are ${purpleHigh.length} above expected pattern.`
      : "No abnormal purple-state persistence detected.",
  };
}

async function computeCampaignPerformanceTrends({ campaignStats }) {
  const rows = Array.isArray(campaignStats) ? campaignStats : [];
  if (!rows.length) {
    return {
      kind: "campaign_performance_trends",
      ok: true,
      note: "No campaign data yet.",
    };
  }

  const avgWait = avg(rows.map((r) => clampNum(r.waitingRatio, 0)));
  const avgPause = avg(rows.map((r) => clampNum(r.pausedRatio, 0)));
  const worstWait = maxBy(rows, (r) => clampNum(r.waitingRatio, 0));
  const bestFlow = maxBy(
    rows,
    (r) =>
      clampNum(r.inCallRatio, 0) -
      clampNum(r.waitingRatio, 0) -
      clampNum(r.pausedRatio, 0),
  );

  const waitDeltaPct = worstWait
    ? pct(
        safeDiv(worstWait.waitingRatio - avgWait, Math.max(0.0001, avgWait), 0),
      )
    : 0;
  const pauseDeltaPct = worstWait
    ? pct(
        safeDiv(
          worstWait.pausedRatio - avgPause,
          Math.max(0.0001, avgPause),
          0,
        ),
      )
    : 0;

  return {
    kind: "campaign_performance_trends",
    ok: true,
    topCampaigns: rows.slice(0, 8),
    worstWaitCampaign: worstWait || null,
    bestFlowCampaign: bestFlow || null,
    detail: worstWait
      ? `${worstWait.campaign} campaign shows ${waitDeltaPct}% higher waiting ratio than campaign average.`
      : "Campaign mix is balanced.",
    message: bestFlow
      ? `${bestFlow.campaign} is currently the healthiest campaign flow.`
      : "No stable campaign trend yet.",
    context: {
      avgWaitRatio: round1(avgWait * 100),
      avgPauseRatio: round1(avgPause * 100),
      worstWaitPauseDeltaPct: pauseDeltaPct,
    },
  };
}

function buildForecastByHour({ shiftHours, historicalRows, targetDow }) {
  const buckets = new Map();

  for (const row of historicalRows || []) {
    const dow = dayOfWeekFromShiftDate(String(row.shift_date || ""));
    const hour = Number(row.hour);
    if (!shiftHours.includes(hour)) continue;
    if (!buckets.has(hour)) buckets.set(hour, { all: [], sameDow: [] });
    const cur = buckets.get(hour);
    cur.all.push(row);
    if (dow === targetDow) cur.sameDow.push(row);
  }

  const forecasts = [];
  for (const hour of shiftHours) {
    const bucket = buckets.get(Number(hour)) || { all: [], sameDow: [] };
    const source = bucket.sameDow.length >= 2 ? bucket.sameDow : bucket.all;
    const confidenceBase =
      bucket.sameDow.length >= 2 ? bucket.sameDow.length : bucket.all.length;
    const activeAvg = avg(source.map((r) => clampNum(r.active_calls_avg, 0)));
    const activeMax = avg(source.map((r) => clampNum(r.active_calls_max, 0)));
    const waitingAvg = avg(source.map((r) => clampNum(r.calls_waiting_avg, 0)));
    const waitingMax = avg(source.map((r) => clampNum(r.calls_waiting_max, 0)));
    const dropAvg = avg(source.map((r) => clampNum(r.dropped_percent_avg, 0)));

    forecasts.push({
      hour: Number(hour),
      active_calls_avg_pred: round1(activeAvg),
      active_calls_max_pred: round1(activeMax),
      calls_waiting_avg_pred: round1(waitingAvg),
      calls_waiting_max_pred: round1(waitingMax),
      dropped_percent_avg_pred: round1(dropAvg),
      sourceDays: source.length,
      sameWeekdayDays: bucket.sameDow.length,
      confidencePct: Math.min(95, 40 + confidenceBase * 8),
    });
  }

  return forecasts;
}

async function computeCallVolumeForecasting({
  shiftDate,
  shiftHours,
  rangeRows,
}) {
  const targetDow = dayOfWeekFromShiftDate(shiftDate);
  const forecasts = buildForecastByHour({
    shiftHours,
    historicalRows: rangeRows,
    targetDow,
  });
  const nextHours = forecasts.slice(0, 4);
  const peak = maxBy(forecasts, (r) => r.calls_waiting_max_pred);
  const volumeLift = peak
    ? pct(
        safeDiv(
          peak.calls_waiting_max_pred,
          Math.max(1, avg(forecasts.map((r) => r.calls_waiting_max_pred))),
          0,
        ) - 1,
      )
    : 0;
  const confidence = round1(avg(forecasts.map((r) => r.confidencePct || 0)));

  return {
    kind: "call_volume_forecasting",
    ok: true,
    forecastHours: forecasts,
    next2to4Hours: nextHours,
    peakForecastHour: peak ? Number(peak.hour) : null,
    confidencePct: Math.round(confidence),
    detail: peak
      ? `Next busy window forecast: ${hourLabel(peak.hour)}-${hourLabel((Number(peak.hour) + 1) % 24)} with waiting max around ${peak.calls_waiting_max_pred}.`
      : "Not enough history for forecasting yet.",
    message: peak
      ? `Next 2-4 hours: ${volumeLift}% higher volume expected around ${hourLabel(peak.hour)}.`
      : "Forecast is still warming up.",
  };
}

async function computeStaffingOptimizationEngine({
  latest,
  forecastInsight,
  agentStats,
}) {
  const currentAgents = Array.isArray(latest?.snapshot?.agents)
    ? latest.snapshot.agents.length
    : 0;
  const readyAgents = Array.isArray(latest?.snapshot?.agents)
    ? latest.snapshot.agents.filter((a) => a?.stateBucket === "ready").length
    : 0;
  const predPeak =
    forecastInsight?.peakForecastHour != null
      ? (forecastInsight.forecastHours || []).find(
          (h) => Number(h.hour) === Number(forecastInsight.peakForecastHour),
        )
      : null;

  const predictedWaiting = clampNum(predPeak?.calls_waiting_max_pred, 0);
  const targetWaitingPerAgent = 2;
  const optimalAgents = Math.max(
    currentAgents,
    Math.ceil(predictedWaiting / targetWaitingPerAgent) +
      Math.max(2, Math.ceil(currentAgents * 0.15)),
  );
  const delta = optimalAgents - currentAgents;
  const avgCallsMax = avg(
    (agentStats || []).map((a) => clampNum(a.callsMax, 0)),
  );
  const savingsPerHour = delta < 0 ? Math.abs(delta) * 15 : 0;

  return {
    kind: "staffing_optimization_engine",
    ok: true,
    optimalAgents,
    currentAgents,
    readyAgents,
    recommendedDelta: delta,
    estimatedSavingsPerHour: savingsPerHour,
    detail:
      delta > 0
        ? `Optimal staffing: ${optimalAgents} agents (current: ${currentAgents}). Add ${delta} before predicted peak.`
        : `Current staffing (${currentAgents}) is near forecasted need.`,
    message:
      delta > 0
        ? `Optimal staffing: ${optimalAgents} agents (current: ${currentAgents}).`
        : `Current staffing is adequate for forecasted demand.`,
    context: {
      predictedPeakWaiting: predictedWaiting,
      avgCallsMaxPerAgent: round1(avgCallsMax),
    },
  };
}

async function computeWaitTimePrediction({ latest, recentCallflow, settings }) {
  const snap = latest?.snapshot || null;
  const waiting = clampNum(snap?.summary?.callsWaiting, 0);
  const active = clampNum(snap?.summary?.activeCalls, 0);
  const loggedIn = clampNum(snap?.summary?.agentsLoggedIn, 0);
  const inCalls = clampNum(snap?.summary?.agentsInCalls, 0);

  const pts = Array.isArray(recentCallflow) ? recentCallflow : [];
  let arrivalRate = 0;
  let serviceRate = 0;

  if (pts.length >= 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    const mins = safeDiv(parseIsoMs(last.ts) - parseIsoMs(first.ts), 60000, 0);
    const waitingDelta =
      clampNum(last.calls_waiting, 0) - clampNum(first.calls_waiting, 0);
    const activeAvg = avg(pts.map((p) => clampNum(p.active_calls, 0)));
    arrivalRate =
      mins > 0 ? Math.max(0, waitingDelta) / mins + activeAvg / 6 : 0;
    serviceRate = Math.max(0.1, activeAvg / 6);
  } else {
    arrivalRate = active / 6;
    serviceRate = Math.max(0.1, inCalls / 6);
  }

  const netCapacity = Math.max(
    0.05,
    serviceRate - Math.max(0, arrivalRate - serviceRate * 0.35),
  );
  const expectedWaitMinutes = waiting > 0 ? round1(waiting / netCapacity) : 0;
  const risk =
    expectedWaitMinutes >= 5
      ? "HIGH"
      : expectedWaitMinutes >= 3
        ? "ELEVATED"
        : "NORMAL";
  const localEta =
    expectedWaitMinutes > 0
      ? etaLocalTime(
          snap?.timestamp || new Date().toISOString(),
          settings?.shift?.tzOffsetMinutes ?? 0,
          expectedWaitMinutes,
        )
      : null;

  return {
    kind: "wait_time_prediction",
    ok: true,
    expectedWaitMinutes,
    risk,
    expectedEtaLocalTime: localEta,
    detail: `Expected wait time: ${expectedWaitMinutes} minutes.`,
    message:
      risk === "HIGH"
        ? `Expected wait time: ${expectedWaitMinutes} minutes (risk: HIGH if >5min).`
        : `Expected wait time remains manageable at ${expectedWaitMinutes} minutes.`,
    context: {
      waiting,
      active,
      loggedIn,
      inCalls,
      arrivalRatePerMinute: round1(arrivalRate),
      serviceRatePerMinute: round1(serviceRate),
    },
  };
}

async function computeShiftDurationOptimization({
  shiftDate,
  shiftHours,
  callflowRows,
}) {
  const volumes = hourVolumesFromCallsTodayMax({
    shiftHours,
    hourlyRows: callflowRows,
  });
  const lateWindow = volumes.slice(Math.max(0, volumes.length - 3));
  const earlyWindow = volumes.slice(0, Math.min(3, volumes.length));
  const lateAvg = avg(lateWindow.map((x) => x.volume));
  const shiftAvg = avg(volumes.map((x) => x.volume));
  const currentEndHour = shiftHours.length
    ? shiftHours[shiftHours.length - 1]
    : null;
  const canShorten = lateAvg > 0 && shiftAvg > 0 && lateAvg < shiftAvg * 0.45;

  return {
    kind: "shift_duration_optimization",
    ok: true,
    canShorten,
    currentShiftEndHour: currentEndHour,
    suggestedEndHour:
      canShorten && currentEndHour != null ? currentEndHour : currentEndHour,
    savingsPct: canShorten
      ? Math.min(15, pct(1 - safeDiv(lateAvg, Math.max(1, shiftAvg), 0)))
      : 0,
    detail: canShorten
      ? `Late-shift volume decays sharply after ${hourLabel(currentEndHour)}. Consider trimming the last hour.`
      : `Current shift length is aligned with observed call demand.`,
    message: canShorten
      ? `Optimal shift end is close to ${hourLabel(currentEndHour)} with lower tail-end demand.`
      : `No strong evidence to shorten the current shift.`,
  };
}

async function computeQueueRiskMonitoring({ latest, recentCallflow }) {
  const snap = latest?.snapshot || null;
  const waiting = clampNum(snap?.summary?.callsWaiting, 0);
  const loggedIn = clampNum(snap?.summary?.agentsLoggedIn, 0);
  const inCalls = clampNum(snap?.summary?.agentsInCalls, 0);
  const agents = Array.isArray(snap?.agents) ? snap.agents : [];
  const purple = agents.filter((a) => a?.stateBucket === "oncall_gt_5m").length;
  const dropPercent = clampNum(snap?.meta?.droppedPercent, 0);

  const pts = Array.isArray(recentCallflow) ? recentCallflow : [];
  let slope = 0;
  if (pts.length >= 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    const mins = safeDiv(parseIsoMs(last.ts) - parseIsoMs(first.ts), 60000, 0);
    slope =
      mins > 0
        ? safeDiv(
            clampNum(last.calls_waiting, 0) - clampNum(first.calls_waiting, 0),
            mins,
            0,
          )
        : 0;
  }

  const waitingRatio = safeDiv(waiting, Math.max(1, loggedIn), 0);
  const purpleRatio = safeDiv(purple, Math.max(1, inCalls || loggedIn), 0);
  const score =
    waitingRatio * 45 +
    Math.max(0, slope) * 20 +
    purpleRatio * 20 +
    safeDiv(dropPercent, 10, 0) * 15;
  const risk = score >= 70 ? "HIGH" : score >= 40 ? "ELEVATED" : "NORMAL";

  return {
    kind: "queue_risk_monitoring",
    ok: true,
    risk,
    riskScore: Math.round(score),
    detail: `Queue risk score ${Math.round(score)} (${risk}). Waiting=${waiting}, logged-in=${loggedIn}, purple=${purple}.`,
    message:
      risk === "HIGH"
        ? "Queue risk is rising quickly; intervention is recommended."
        : risk === "ELEVATED"
          ? "Queue risk is elevated but not yet critical."
          : "Queue risk is currently normal.",
    context: {
      waiting,
      loggedIn,
      inCalls,
      purple,
      dropPercent,
      waitingSlopePerMinute: round1(slope),
    },
  };
}

async function computePerformanceAnomalyDetection({
  shiftDate,
  callflowRows,
  rangeRows,
}) {
  const currentByHour = new Map();
  for (const r of callflowRows || []) currentByHour.set(Number(r.hour), r);

  const histByHour = new Map();
  for (const r of rangeRows || []) {
    if (String(r.shift_date) === String(shiftDate)) continue;
    const h = Number(r.hour);
    if (!histByHour.has(h)) histByHour.set(h, []);
    histByHour.get(h).push(r);
  }

  const anomalies = [];
  for (const [hour, cur] of currentByHour.entries()) {
    const rows = histByHour.get(hour) || [];
    if (rows.length < 3) continue;

    const values = rows.map((r) => clampNum(r.calls_waiting_max, 0));
    const mean = avg(values);
    const variance = avg(values.map((v) => (v - mean) ** 2));
    const stdev = Math.sqrt(variance);
    const curVal = clampNum(cur.calls_waiting_max, 0);
    const z = stdev > 0 ? (curVal - mean) / stdev : 0;

    if (Math.abs(z) >= 2) {
      anomalies.push({
        hour: Number(hour),
        metric: "calls_waiting_max",
        value: curVal,
        baselineMean: round1(mean),
        zScore: round1(z),
        severity: Math.abs(z) >= 3 ? "bad" : "warn",
      });
    }
  }

  return {
    kind: "performance_anomaly_detection",
    ok: true,
    anomalies,
    detail: anomalies.length
      ? `Detected ${anomalies.length} hourly anomalies vs historical baseline.`
      : "No major performance anomalies detected.",
    message: anomalies.length
      ? `Anomaly detected: ${hourLabel(anomalies[0].hour)} waiting max deviates by z=${anomalies[0].zScore}.`
      : "Performance is within normal historical range.",
  };
}

async function computeBreakSchedulingIntelligence({
  shiftHours,
  callflowRows,
}) {
  const byHour = new Map();
  for (const r of callflowRows || []) byHour.set(Number(r.hour), r);

  const rows = shiftHours
    .map((h) => ({
      hour: Number(h),
      waitingAvg: clampNum(byHour.get(Number(h))?.calls_waiting_avg, 0),
      activeAvg: clampNum(byHour.get(Number(h))?.active_calls_avg, 0),
      score:
        clampNum(byHour.get(Number(h))?.calls_waiting_avg, 0) * 0.7 +
        clampNum(byHour.get(Number(h))?.active_calls_avg, 0) * 0.3,
    }))
    .slice(1, Math.max(1, shiftHours.length - 1));

  const sorted = rows.slice().sort((a, b) => a.score - b.score);
  const picks = [];
  for (const row of sorted) {
    if (picks.every((p) => Math.abs(Number(p.hour) - Number(row.hour)) >= 2)) {
      picks.push(row);
    }
    if (picks.length >= 3) break;
  }
  picks.sort((a, b) => a.hour - b.hour);

  return {
    kind: "break_scheduling_intelligence",
    ok: true,
    suggestedBreakHours: picks.map((p) => p.hour),
    windows: picks,
    detail: picks.length
      ? `Optimal breaks: ${picks.map((p) => hourLabel(p.hour)).join(", ")}.`
      : "No stable low-volume break windows yet.",
    message: picks.length
      ? `Suggested breaks at ${picks.map((p) => hourLabel(p.hour)).join(", ")} based on lowest queue pressure.`
      : "Need more hourly data before recommending break windows.",
  };
}

async function computeComparativeShiftAnalysis({ shiftDate, comparisons }) {
  const current = comparisons?.current || null;
  const history = Array.isArray(comparisons?.history)
    ? comparisons.history
    : [];
  if (!current || !history.length) {
    return {
      kind: "comparative_shift_analysis",
      ok: true,
      note: "Not enough historical comparison data yet.",
    };
  }

  const avgCallsPeak = avg(
    history.map((r) => clampNum(r.calls_waiting_peak, 0)),
  );
  const avgActivePeak = avg(
    history.map((r) => clampNum(r.active_calls_peak, 0)),
  );
  const avgDropMean = avg(
    history.map((r) => clampNum(r.dropped_percent_avg_mean, 0)),
  );

  const callsDeltaPct = pct(
    safeDiv(
      clampNum(current.calls_waiting_peak, 0) - avgCallsPeak,
      Math.max(1, avgCallsPeak),
      0,
    ),
  );
  const activeDeltaPct = pct(
    safeDiv(
      clampNum(current.active_calls_peak, 0) - avgActivePeak,
      Math.max(1, avgActivePeak),
      0,
    ),
  );
  const dropDeltaPct = pct(
    safeDiv(
      clampNum(current.dropped_percent_avg_mean, 0) - avgDropMean,
      Math.max(0.1, avgDropMean),
      0,
    ),
  );

  return {
    kind: "comparative_shift_analysis",
    ok: true,
    shiftDate,
    compareWindowDays: history.length,
    deltas: {
      callsPeakPct: callsDeltaPct,
      activePeakPct: activeDeltaPct,
      droppedMeanPct: dropDeltaPct,
    },
    detail: `Current shift vs baseline: waiting peak ${callsDeltaPct >= 0 ? "+" : ""}${callsDeltaPct}%, active peak ${activeDeltaPct >= 0 ? "+" : ""}${activeDeltaPct}%, drop% ${dropDeltaPct >= 0 ? "+" : ""}${dropDeltaPct}%.`,
    message: `Current shift: ${callsDeltaPct >= 0 ? "+" : ""}${callsDeltaPct}% waiting peak vs historical average.`,
  };
}

async function computeEfficiencyRecommendations({
  rush,
  peakConsistency,
  staffing,
  campaignTrend,
  breakIntel,
  queueRisk,
}) {
  const recs = [];

  if (rush?.isRush) {
    recs.push({
      code: "stagger_shift_start",
      priority: "high",
      note: `Stagger start times and add ${Math.max(1, rush.suggestedAgents || 2)} agents for the first 2 hours.`,
    });
  }
  if (
    (peakConsistency?.confidencePct || 0) >= 70 &&
    peakConsistency?.peakHour != null
  ) {
    recs.push({
      code: "protect_peak_hour",
      priority: "high",
      note: `Schedule stronger coverage around ${hourLabel(peakConsistency.peakHour)} every shift.`,
    });
  }
  if ((staffing?.recommendedDelta || 0) > 0) {
    recs.push({
      code: "pre_peak_staffing",
      priority: "high",
      note: `Increase staffing by ${staffing.recommendedDelta} before predicted peak demand.`,
    });
  }
  if (campaignTrend?.worstWaitCampaign?.campaign) {
    recs.push({
      code: "campaign_rebalance",
      priority: "medium",
      note: `Review routing and coaching for ${campaignTrend.worstWaitCampaign.campaign}; it shows the highest wait pressure.`,
    });
  }
  if ((queueRisk?.risk || "NORMAL") === "HIGH") {
    recs.push({
      code: "queue_intervention",
      priority: "high",
      note: "Reduce queue pressure now: move ready agents into the highest-risk queue and delay non-critical pauses.",
    });
  }
  if (
    Array.isArray(breakIntel?.suggestedBreakHours) &&
    breakIntel.suggestedBreakHours.length
  ) {
    recs.push({
      code: "stagger_breaks",
      priority: "medium",
      note: `Use staggered breaks near ${breakIntel.suggestedBreakHours.map(hourLabel).join(", ")}.`,
    });
  }

  return {
    kind: "efficiency_recommendations",
    ok: true,
    recommendations: recs,
    detail: recs.length
      ? `Generated ${recs.length} operational recommendations.`
      : "No strong optimization recommendations right now.",
    message: recs.length
      ? recs[0].note
      : "Operations are currently within expected efficiency range.",
  };
}

async function computeAgentPerformanceScoring({ latest, agentStats }) {
  const latestAgents = Array.isArray(latest?.snapshot?.agents)
    ? latest.snapshot.agents
    : [];
  const byUserLatest = new Map(
    latestAgents
      .map((a) => [String(a?.user || "").trim(), a])
      .filter(([u]) => !!u),
  );

  const maxCalls = Math.max(
    1,
    ...(agentStats || []).map((a) => clampNum(a.callsMax, 0)),
  );
  const scores = (agentStats || []).map((row) => {
    const latestAgent = byUserLatest.get(String(row.user || "").trim()) || null;
    const utilization = clampNum(row.inCallRatio, 0);
    const pausePenalty = clampNum(row.pausedRatio, 0);
    const purplePenalty = clampNum(row.purpleRatio, 0);
    const callScore = safeDiv(clampNum(row.callsMax, 0), maxCalls, 0);
    const readyBonus = latestAgent?.stateBucket === "ready" ? 0.08 : 0;
    const score = Math.max(
      0,
      Math.min(
        1,
        utilization * 0.45 +
          callScore * 0.35 +
          readyBonus +
          (1 - pausePenalty) * 0.12 +
          (1 - purplePenalty) * 0.08,
      ),
    );

    return {
      user: row.user,
      name: row.name || row.user,
      campaign: row.campaign || "UNASSIGNED",
      scorePct: Math.round(score * 100),
      utilizationPct: Math.round(utilization * 100),
      pausePct: Math.round(pausePenalty * 100),
      purplePct: Math.round(purplePenalty * 100),
      callsMax: clampNum(row.callsMax, 0),
    };
  });

  scores.sort(
    (a, b) => b.scorePct - a.scorePct || a.user.localeCompare(b.user),
  );

  return {
    kind: "agent_performance_scoring",
    ok: true,
    topAgents: scores.slice(0, 10),
    bottomAgents: scores.slice(-5),
    detail: scores.length
      ? `Top agent score: ${scores[0].name}=${scores[0].scorePct}%.`
      : "No agent scoring data yet.",
    message: scores.length
      ? `Agent score leaders: ${scores
          .slice(0, 3)
          .map((a) => `${a.name}=${a.scorePct}%`)
          .join(", ")}.`
      : "No agents available for scoring.",
  };
}

async function computeVoiceOfDataNarratives({
  shiftDate,
  peakConsistency,
  rush,
  campaignTrend,
  breakIntel,
  comparison,
  queueRisk,
}) {
  const lines = [];

  if (rush?.isRush) {
    lines.push(
      `Your ${shiftDate} shift shows a strong first-hour rush: ${rush.intensityPct}% above normal, which supports adding early coverage.`,
    );
  }

  if (
    peakConsistency?.peakHour != null &&
    peakConsistency?.confidencePct != null
  ) {
    lines.push(
      `Historical data points to ${hourLabel(peakConsistency.peakHour)} as the reliable peak hour with ${peakConsistency.confidencePct}% confidence.`,
    );
  }

  if (campaignTrend?.worstWaitCampaign?.campaign) {
    lines.push(
      `${campaignTrend.worstWaitCampaign.campaign} is your highest-pressure campaign right now, with elevated waiting compared to the campaign average.`,
    );
  }

  if (
    Array.isArray(breakIntel?.suggestedBreakHours) &&
    breakIntel.suggestedBreakHours.length
  ) {
    lines.push(
      `Best break windows appear around ${breakIntel.suggestedBreakHours.map(hourLabel).join(", ")}, where queue pressure is historically lower.`,
    );
  }

  if (comparison?.deltas?.callsPeakPct != null) {
    lines.push(
      `Compared with recent shifts, today's waiting peak is ${comparison.deltas.callsPeakPct >= 0 ? "up" : "down"} ${Math.abs(comparison.deltas.callsPeakPct)}%.`,
    );
  }

  if ((queueRisk?.risk || "NORMAL") === "HIGH") {
    lines.push(
      "The current queue is at high risk, so immediate staffing or routing adjustments are recommended.",
    );
  }

  return {
    kind: "voice_of_data_narratives",
    ok: true,
    narratives: lines,
    detail: lines.length
      ? lines[0]
      : "Narratives will appear as more data accumulates.",
    message: lines.length ? lines.join(" ") : "No narrative summary yet.",
  };
}

async function computeSmartAutomation({
  staffing,
  campaignTrend,
  forecast,
  queueRisk,
}) {
  const suggestions = [];

  if ((staffing?.recommendedDelta || 0) > 0) {
    suggestions.push({
      type: "auto_staffing_adjustment",
      note: `Move or add ${staffing.recommendedDelta} agents before the next forecasted peak.`,
    });
  }

  if (campaignTrend?.worstWaitCampaign?.campaign) {
    suggestions.push({
      type: "dynamic_priority_management",
      note: `Temporarily prioritize ${campaignTrend.worstWaitCampaign.campaign} until waiting ratio normalizes.`,
    });
  }

  if (
    forecast?.peakForecastHour != null &&
    (queueRisk?.risk === "HIGH" || staffing?.recommendedDelta > 0)
  ) {
    suggestions.push({
      type: "predictive_maintenance_alert",
      note: `High volume expected near ${hourLabel(forecast.peakForecastHour)}. Perform a pre-peak system and staffing check.`,
    });
  }

  return {
    kind: "smart_automation",
    ok: true,
    suggestions,
    detail: suggestions.length
      ? `Prepared ${suggestions.length} automation-style recommendations.`
      : "No automation suggestions right now.",
    message: suggestions.length
      ? suggestions[0].note
      : "No smart automation triggers are active.",
  };
}

async function computeTrendForecastingDashboard({
  forecast,
  comparison,
  staffing,
}) {
  const rows = Array.isArray(forecast?.forecastHours)
    ? forecast.forecastHours
    : [];
  const peak = maxBy(rows, (r) => clampNum(r.calls_waiting_max_pred, 0));
  const avgWait = avg(rows.map((r) => clampNum(r.calls_waiting_avg_pred, 0)));

  return {
    kind: "trend_forecasting_dashboard",
    ok: true,
    summary: {
      peakHour: peak ? peak.hour : null,
      peakWaitingPred: peak ? peak.calls_waiting_max_pred : 0,
      avgWaitingPred: round1(avgWait),
      staffingDelta: staffing?.recommendedDelta ?? 0,
      currentVsHistoryCallsPeakPct: comparison?.deltas?.callsPeakPct ?? 0,
    },
    detail: peak
      ? `Forecast dashboard: peak around ${hourLabel(peak.hour)} with waiting near ${peak.calls_waiting_max_pred}.`
      : "Forecast dashboard has insufficient data yet.",
  };
}

async function computeInsights({
  shiftDate,
  getSettings,
  getCallflowHourly,
  getShiftSummary,
  getLatestRawSnapshotForShift,
  getCallflowHourlyRange,
  getRecentCallflowSnapshots,
  getCampaignSnapshotStats,
  getAgentSnapshotStats,
  getAgentStateTransitions,
  getShiftComparisons,
}) {
  const settings = await getSettings();
  const shift = settings.shift || {};
  const { hours: shiftHours } = buildShiftHours(shift);

  const callflowRows = await getCallflowHourly(shiftDate);
  const bucketsSeries = await getShiftSummary(shiftDate);
  const latest = await getLatestRawSnapshotForShift(shiftDate);
  const recentCallflow = getRecentCallflowSnapshots
    ? await getRecentCallflowSnapshots({ shiftDate, minutes: 30, limit: 500 })
    : [];

  const endShiftDate = shiftDate;
  const startShiftDate = ymdAddDays(shiftDate, -30);
  const rangeRows = await getCallflowHourlyRange({
    startShiftDate,
    endShiftDate,
  });

  const [campaignStats, agentStats, transitionsData, comparisons] =
    await Promise.all([
      getCampaignSnapshotStats
        ? getCampaignSnapshotStats({ shiftDate, limit: 60 })
        : [],
      getAgentSnapshotStats
        ? getAgentSnapshotStats({ shiftDate, limit: 80 })
        : [],
      getAgentStateTransitions
        ? getAgentStateTransitions({ shiftDate, limit: 80 })
        : { transitions: [], stuckPurple: [] },
      getShiftComparisons
        ? getShiftComparisons({ shiftDate, lookbackDays: 30 })
        : { current: null, history: [] },
    ]);

  const rush = await computeFirstHourRush({ shiftHours, callflowRows });
  const peakConsistency = await computePeakHourConsistency({
    startShiftDate,
    endShiftDate,
    rangeRows,
  });
  const proactiveStaffing = await computeProactiveStaffing({
    shiftDate,
    latest,
    shiftHours,
    callflowRows,
    bucketsSeries,
    settings,
    recentCallflow,
  });
  const transitions = await computeAgentStateTransitionPatterns({
    shiftDate,
    transitionsData,
  });
  const campaignTrend = await computeCampaignPerformanceTrends({
    campaignStats,
  });
  const forecast = await computeCallVolumeForecasting({
    shiftDate,
    shiftHours,
    rangeRows,
  });
  const staffingOpt = await computeStaffingOptimizationEngine({
    latest,
    forecastInsight: forecast,
    agentStats,
  });
  const waitPrediction = await computeWaitTimePrediction({
    latest,
    recentCallflow,
    settings,
  });
  const shiftDuration = await computeShiftDurationOptimization({
    shiftDate,
    shiftHours,
    callflowRows,
  });
  const queueRisk = await computeQueueRiskMonitoring({
    latest,
    recentCallflow,
  });
  const anomalies = await computePerformanceAnomalyDetection({
    shiftDate,
    callflowRows,
    rangeRows,
  });
  const breakIntel = await computeBreakSchedulingIntelligence({
    shiftHours,
    callflowRows,
  });
  const comparison = await computeComparativeShiftAnalysis({
    shiftDate,
    comparisons,
  });
  const efficiency = await computeEfficiencyRecommendations({
    rush,
    peakConsistency,
    staffing: staffingOpt,
    campaignTrend,
    breakIntel,
    queueRisk,
  });
  const agentScoring = await computeAgentPerformanceScoring({
    latest,
    agentStats,
  });
  const narratives = await computeVoiceOfDataNarratives({
    shiftDate,
    peakConsistency,
    rush,
    campaignTrend,
    breakIntel,
    comparison,
    queueRisk,
  });
  const automation = await computeSmartAutomation({
    staffing: staffingOpt,
    campaignTrend,
    forecast,
    queueRisk,
  });
  const trendDashboard = await computeTrendForecastingDashboard({
    forecast,
    comparison,
    staffing: staffingOpt,
  });

  const insights = [
    rush,
    peakConsistency,
    proactiveStaffing,
    transitions,
    campaignTrend,
    forecast,
    staffingOpt,
    waitPrediction,
    shiftDuration,
    queueRisk,
    anomalies,
    breakIntel,
    narratives,
    comparison,
    efficiency,
    automation,
    agentScoring,
    trendDashboard,
  ];

  return {
    success: true,
    shiftDate,
    window: { startShiftDate, endShiftDate },
    metadata: {
      shiftHours,
      hasLatestSnapshot: !!latest,
      recentCallflowPoints: recentCallflow.length,
      campaignsTracked: campaignStats.length,
      agentsTracked: agentStats.length,
    },
    insights,
  };
}

module.exports = { computeInsights };

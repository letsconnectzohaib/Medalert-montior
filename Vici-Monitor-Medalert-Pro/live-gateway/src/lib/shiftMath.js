function parseHm(hm) {
  const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, m: mi };
}

function ymdAddDays(ymd, days) {
  const dt = new Date(`${ymd}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

function buildShiftHours(shift) {
  const start = parseHm(shift?.start) || { h: 19, m: 0 };
  const end = parseHm(shift?.end) || { h: 4, m: 30 };
  const hours = [];
  let h = start.h;
  for (let i = 0; i < 24; i++) {
    hours.push(h);
    if (h === end.h) break;
    h = (h + 1) % 24;
  }
  return { start, end, hours };
}

function sumCountsForHours(hoursObj, hourList) {
  const totals = {};
  for (const h of hourList) {
    const row = hoursObj?.[h] || {};
    for (const [bucket, v] of Object.entries(row)) {
      totals[bucket] = (totals[bucket] || 0) + Number(v || 0);
    }
  }
  return totals;
}

function totalAgents(counts) {
  return Object.values(counts || {}).reduce((a, b) => a + Number(b || 0), 0);
}

function sumCallflowRows(rows, hourList) {
  const set = new Set((hourList || []).map((h) => Number(h)));
  const picked = (rows || []).filter((r) => set.has(Number(r.hour)));
  if (!picked.length) {
    return {
      hours: hourList || [],
      samples: 0,
      active_calls_avg: 0,
      active_calls_max: 0,
      calls_waiting_avg: 0,
      calls_waiting_max: 0,
      calls_in_ivr_avg: 0,
      calls_in_ivr_max: 0,
      ringing_calls_avg: 0,
      ringing_calls_max: 0,
      calls_today_max: 0,
      dropped_percent_avg: 0,
      dropped_percent_max: 0
    };
  }

  let totalSamples = 0;
  const acc = {
    active_calls_avg: 0,
    calls_waiting_avg: 0,
    calls_in_ivr_avg: 0,
    ringing_calls_avg: 0,
    active_calls_max: 0,
    calls_waiting_max: 0,
    calls_in_ivr_max: 0,
    ringing_calls_max: 0,
    calls_today_max: 0,
    dropped_percent_avg: 0,
    dropped_percent_max: 0
  };

  for (const r of picked) {
    const s = Number(r.samples || 0);
    if (s > 0) {
      totalSamples += s;
      acc.active_calls_avg += Number(r.active_calls_avg || 0) * s;
      acc.calls_waiting_avg += Number(r.calls_waiting_avg || 0) * s;
      acc.calls_in_ivr_avg += Number(r.calls_in_ivr_avg || 0) * s;
      acc.ringing_calls_avg += Number(r.ringing_calls_avg || 0) * s;
      acc.dropped_percent_avg += Number(r.dropped_percent_avg || 0) * s;
    }
    acc.active_calls_max = Math.max(acc.active_calls_max, Number(r.active_calls_max || 0));
    acc.calls_waiting_max = Math.max(acc.calls_waiting_max, Number(r.calls_waiting_max || 0));
    acc.calls_in_ivr_max = Math.max(acc.calls_in_ivr_max, Number(r.calls_in_ivr_max || 0));
    acc.ringing_calls_max = Math.max(acc.ringing_calls_max, Number(r.ringing_calls_max || 0));
    acc.calls_today_max = Math.max(acc.calls_today_max, Number(r.calls_today_max || 0));
    acc.dropped_percent_max = Math.max(acc.dropped_percent_max, Number(r.dropped_percent_max || 0));
  }

  return {
    hours: hourList || [],
    samples: totalSamples,
    active_calls_avg: totalSamples ? acc.active_calls_avg / totalSamples : 0,
    active_calls_max: acc.active_calls_max,
    calls_waiting_avg: totalSamples ? acc.calls_waiting_avg / totalSamples : 0,
    calls_waiting_max: acc.calls_waiting_max,
    calls_in_ivr_avg: totalSamples ? acc.calls_in_ivr_avg / totalSamples : 0,
    calls_in_ivr_max: acc.calls_in_ivr_max,
    ringing_calls_avg: totalSamples ? acc.ringing_calls_avg / totalSamples : 0,
    ringing_calls_max: acc.ringing_calls_max,
    calls_today_max: acc.calls_today_max,
    dropped_percent_avg: totalSamples ? acc.dropped_percent_avg / totalSamples : 0,
    dropped_percent_max: acc.dropped_percent_max
  };
}

module.exports = {
  parseHm,
  ymdAddDays,
  buildShiftHours,
  sumCountsForHours,
  totalAgents,
  sumCallflowRows
};


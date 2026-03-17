const { createAlert } = require('../db/alerts');

// In-memory detection state (fine for single gateway instance).
const state = {
  lastDropPercent: null,
  waitingHighSinceTs: null,
  purpleHighSinceTs: null,
  cooldown: new Map() // key -> lastAlertTsMs
};

function ms(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

function canFire(key, nowMs, cooldownMs) {
  const last = state.cooldown.get(key) || 0;
  if (nowMs - last < cooldownMs) return false;
  state.cooldown.set(key, nowMs);
  return true;
}

function getBucketCount(counts, key) {
  return Number(counts?.[key] || 0);
}

function buildProbableCauses({ counts, callMetrics }) {
  const waiting = Number(callMetrics?.calls_waiting ?? 0);
  const active = Number(callMetrics?.active_calls ?? 0);
  const ready = Number(counts?.ready ?? 0);
  const paused = Number(counts?.paused_gt_1m ?? 0) + Number(counts?.paused_gt_10s ?? 0);
  const inCall = Number(counts?.in_call ?? 0);
  const purple = Number(counts?.oncall_gt_5m ?? 0);

  const hints = [];
  if (waiting > 0 && ready === 0) hints.push({ code: 'no_ready_agents', note: 'Waiting calls while no agents are Ready.' });
  if (waiting > 0 && ready > 0 && waiting > ready * 3) hints.push({ code: 'waiting_outpaces_ready', note: 'Waiting calls far exceed Ready agents.' });
  if (paused > 0 && waiting > 0) hints.push({ code: 'agents_paused_while_waiting', note: 'Some agents are Paused during waiting spike.' });
  if (purple > 0 && waiting > 0) hints.push({ code: 'long_calls_and_waiting', note: 'Long on-call agents present while calls are waiting.' });
  if (active === 0 && waiting > 0) hints.push({ code: 'waiting_no_active', note: 'Waiting calls present but Active calls is 0 (possible dial/ivr bottleneck).' });
  if (inCall > 0 && ready === 0 && waiting > 0) hints.push({ code: 'all_busy', note: 'Agents appear busy with no ready capacity.' });
  return { ready, paused, inCall, purple, waiting, active, hints };
}

async function detectAndStoreAlerts({ ts, shiftDate, counts, callMetrics, settings }) {
  const nowMs = ms(ts);
  const cfg = settings?.alerts || {};
  const probable = buildProbableCauses({ counts, callMetrics });
  const created = [];

  const waitingSpike = {
    max: Math.max(1, Number(cfg.waitingSpikeMax ?? 25)),
    sustainSeconds: Math.max(10, Number(cfg.waitingSpikeSustainSeconds ?? 120)),
    cooldownSeconds: Math.max(30, Number(cfg.waitingSpikeCooldownSeconds ?? 600))
  };

  const purpleOverload = {
    min: Math.max(1, Number(cfg.purpleOverloadMin ?? 8)),
    sustainSeconds: Math.max(10, Number(cfg.purpleOverloadSustainSeconds ?? 180)),
    cooldownSeconds: Math.max(30, Number(cfg.purpleOverloadCooldownSeconds ?? 900))
  };

  const dropJump = {
    jumpPoints: Math.max(0.1, Number(cfg.dropPercentJumpPoints ?? 2.5)),
    minPercent: Math.max(0, Number(cfg.dropPercentMin ?? 3)),
    cooldownSeconds: Math.max(30, Number(cfg.dropPercentCooldownSeconds ?? 900))
  };

  const waiting = Number(callMetrics?.calls_waiting ?? 0);
  const active = Number(callMetrics?.active_calls ?? 0);
  const dropPercent = Number(callMetrics?.dropped_percent ?? 0);

  // --- Waiting spike sustained ---
  if (waiting >= waitingSpike.max) {
    if (!state.waitingHighSinceTs) state.waitingHighSinceTs = ts;
    const sinceMs = ms(state.waitingHighSinceTs);
    const durSec = Math.round((nowMs - sinceMs) / 1000);
    if (durSec >= waitingSpike.sustainSeconds) {
      const key = `waiting_spike_${shiftDate}`;
      if (canFire(key, nowMs, waitingSpike.cooldownSeconds * 1000)) {
        created.push(await createAlert({
          ts,
          shiftDate,
          type: 'waiting_spike',
          severity: waiting >= waitingSpike.max * 2 ? 'bad' : 'warn',
          title: `Waiting spike sustained (${waiting})`,
          details: { waiting, active, sustainedSeconds: durSec, threshold: waitingSpike.max, probableCause: probable }
        }));
      }
    }
  } else {
    state.waitingHighSinceTs = null;
  }

  // --- Purple overload sustained (oncall > 5m) ---
  const purple = getBucketCount(counts, 'oncall_gt_5m');
  if (purple >= purpleOverload.min) {
    if (!state.purpleHighSinceTs) state.purpleHighSinceTs = ts;
    const sinceMs = ms(state.purpleHighSinceTs);
    const durSec = Math.round((nowMs - sinceMs) / 1000);
    if (durSec >= purpleOverload.sustainSeconds) {
      const key = `purple_overload_${shiftDate}`;
      if (canFire(key, nowMs, purpleOverload.cooldownSeconds * 1000)) {
        created.push(await createAlert({
          ts,
          shiftDate,
          type: 'purple_overload',
          severity: purple >= purpleOverload.min * 2 ? 'bad' : 'warn',
          title: `Purple overload sustained (${purple})`,
          details: { purple, sustainedSeconds: durSec, threshold: purpleOverload.min, probableCause: probable }
        }));
      }
    }
  } else {
    state.purpleHighSinceTs = null;
  }

  // --- Drop percent jump ---
  if (Number.isFinite(dropPercent)) {
    const prev = state.lastDropPercent;
    state.lastDropPercent = dropPercent;
    if (prev != null) {
      const delta = dropPercent - prev;
      if (dropPercent >= dropJump.minPercent && delta >= dropJump.jumpPoints) {
        const key = `drop_jump_${shiftDate}`;
        if (canFire(key, nowMs, dropJump.cooldownSeconds * 1000)) {
          created.push(await createAlert({
            ts,
            shiftDate,
            type: 'drop_percent_jump',
            severity: dropPercent >= dropJump.minPercent * 2 ? 'bad' : 'warn',
            title: `Drop% jumped to ${dropPercent}% (+${delta.toFixed(1)} pts)`,
            details: { prevPercent: prev, dropPercent, deltaPoints: delta, minPercent: dropJump.minPercent, jumpPoints: dropJump.jumpPoints, probableCause: probable }
          }));
        }
      }
    }
  }

  return created;
}

module.exports = {
  detectAndStoreAlerts
};


# Phase 1 — Intelligence Foundation

Phase 1 delivers **high-signal, low-risk** insights using data we already capture.

## Inputs

- Shift window (timezone + start/end) from `settings.shift`
- Per-hour callflow aggregates from `callflow_hourly`
- Per-hour agent buckets from `shift_buckets`
- Latest raw snapshot from `raw_snapshots` (for “right now” context)

## Outputs (contract)

`GET /api/intelligence/insights?date=YYYY-MM-DD`

Returns:
- `shiftDate`
- `window` (history range used)
- `insights[]` — each insight is:
  - `kind`: stable id (`first_hour_rush`, `peak_hour_consistency`, `proactive_staffing`)
  - `ok`: boolean
  - `message`/`detail`/`note`: human readable output
  - optional structured fields (confidence, recommended agents, etc.)

## Algorithms (Phase 1)

### 1) First Hour Rush Detection

**What**
- Detect whether the first two hours have **20%+ higher** volume than the shift average.

**Data**
- `callflow_hourly.calls_today_max` (cumulative daily count)  
- Convert to approximate “per-hour call volume” by **delta** between hours.

**Why**
- Staffing and “shift start rush” awareness.

**Output example**
- “First 2 hours intensity: 45% above shift average (rush detected)”

### 2) Peak Hour Consistency (last 30 days)

**What**
- Determine which hour is most often the “peak” across the last 30 shift days.

**Data**
- Peak per day = hour with highest `calls_waiting_max` (pain proxy)
- Confidence = (days where that hour was peak) / (days with data)

**Why**
- Scheduling becomes repeatable and data-driven.

**Output example**
- “Reliable peak hour: 20:00–21:00 (82% confidence)”

### 3) Proactive Staffing Recommendation (right now)

**What**
- Convert live queue state into an actionable recommendation (“add X agents now”).

**Data**
- Latest raw snapshot:
  - current waiting calls (`snapshot.summary.callsWaiting`)
  - current ready agents (count of `snapshot.agents[].stateBucket === "ready"`)
- Simple gap: `max(0, waiting - ready)`
- Add a risk label by comparing current hour `calls_waiting_max` vs shift average.

**Why**
- Alerts tell you something is wrong. This insight tells you **what to do**.

**Output example**
- “Queue risk: HIGH. Waiting=18, Ready agents=7. Suggested add=11.”

### 4) Proactive Staffing Alerts (prevent problems)

**What**
- Raise an alert when queue demand exceeds ready capacity for a sustained time.

**Data**
- Waiting calls from callflow metrics (`calls_waiting`)
- Ready agents from bucket counts (`counts.ready`)
- Gap \(=\) \( \max(0,\ waiting - ready) \)

**Settings (configurable)**
- `alerts.staffingGapMin`
- `alerts.staffingSustainSeconds`
- `alerts.staffingCooldownSeconds`

**ETA wording (optional)**
- Compute a simple trend projection over recent snapshots to estimate when waiting will hit the waiting-spike threshold.
- Expose as:
  - `details.etaMinutesToWaitingSpike`
  - `details.etaLocalTime`

**Output example**
- “⚠️ Staffing gap: need 3 more agents by 20:15”

## Implementation boundaries

- No ML libraries in Phase 1
- Fast queries (hourly tables + one latest snapshot)
- Modular code:
  - DB access in `src/db/intelligence.js`
  - Algorithms in `src/intelligence/insights.js`
  - HTTP route in `src/routes/intelligenceRoutes.js`
  - Dashboard page in `dashboard/src/pages/intelligence.js`


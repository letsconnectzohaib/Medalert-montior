# Intelligence Features Roadmap (Pro)

This folder documents the **enterprise-grade intelligence layer** built on top of:

- **Live snapshots** (real-time, via WS + extension scraping)
- **Persistent aggregates** (SQLite hourly rollups + shift buckets)
- **Settings** (shift timing, retention, alert thresholds, notifications)

The goal is to produce **actionable insights** (not just charts) for supervisors:

- *What is happening?*
- *Why is it happening? (signals + correlation)*
- *What should we do right now? (recommendations)*

---

## Data Sources (current)

- **`raw_snapshots`**: JSON payload of each snapshot (for deep drilling + future transition analysis)
- **`shift_buckets`**: hourly agent color/state buckets (purple/violet/blue/etc.)
- **`callflow_hourly`**: hourly callflow aggregates (avg/max + calls today + dropped%)
- **`alerts`**: anomalies detected at ingest (waiting spikes, purple overload, drop% jumps)

---

## Phases

### Phase 1 (Foundation)
Focus: immediate value, low-risk algorithms based on existing hourly aggregates.

- **First Hour Rush Detection**
  - Detect first 2 hours vs shift average (20%+ higher = rush)
- **Peak Hour Consistency (30d)**
  - Identify the most common peak hour across last 30 shift days
- **Proactive Staffing Recommendation**
  - Convert current queue state into a simple “add X agents” recommendation
- **Proactive Staffing Alerts**
  - Persisted alert when waiting outpaces ready agents (sustained + cooldown), with optional ETA wording

Deliverables:
- API: `GET /api/intelligence/insights?date=YYYY-MM-DD`
- Dashboard: new page “Intelligence” with cards + explanations
- Docs: Phase 1 spec (see `PHASE_1.md`)

### Phase 2 (Prediction)
Focus: near-future forecasting.

- Call volume forecasting (2–4h)
- Wait time prediction
- Staffing optimization engine

### Phase 3 (Ops-grade intelligence)
Focus: narratives and automation.

- “Voice of Data” summaries
- Comparative shift analysis vs baseline
- Recommendations engine

### Phase 4 (Advanced analytics)
Focus: richer scoring + ROI.

- Agent performance scoring
- Campaign ROI analysis
- Trend forecasting dashboard

---

## Canonical “full list”

The complete long-form roadmap (all features, as captured from planning) lives in:

- `Complete-RoadMap.md`


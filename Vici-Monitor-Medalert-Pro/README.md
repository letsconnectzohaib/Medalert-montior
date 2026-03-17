# Vici-Monitor-Medalert-Pro (monorepo)

This is the **next-generation** implementation, kept alongside the legacy `Vici-Monitor-Medalert/`.

It is designed to monitor the Vicidial realtime report, stream live operational snapshots, persist shift history, detect anomalies, and generate management-facing intelligence.

## Packages

- `extension/`: Chrome Extension (MV3) — scrapes the Vicidial realtime report and streams normalized snapshots.
- `live-gateway/`: Auth + WebSocket + REST gateway — receives snapshots, persists data, computes analytics/intelligence, and broadcasts live updates.
- `dashboard/`: Web dashboard — login-first SPA for live operations, shift analytics, reports, alerts, and intelligence.
- `shared/`: Shared schema + utilities.
- `docs/`: Contracts, API notes, architecture notes, roadmap, and run guides.

## Current architecture

```/dev/null/architecture.txt#L1-10
Vicidial Realtime Report
  -> Chrome Extension (scrape + publish)
  -> Live Gateway (JWT auth + REST + WebSocket)
  -> SQLite/sql.js persistence
  -> Dashboard SPA
  -> Alerts / Reports / Intelligence / Slack notifications
```

## Source-of-truth scraping contract

See:

- `docs/scraping/contract.md`
- `References/Real-Time Main Report_ ALL-ACTIVE.html`

Those references define the DOM structure this project expects when scraping agents, waiting calls, header meta, and summary tiles.

---

# What the system does today

## 1. Live capture
The extension:

- finds the Vicidial realtime tab
- scrapes the page into a normalized snapshot
- publishes snapshots to the gateway over authenticated HTTP
- keeps running with MV3 background alarms, change detection, and retry injection logic

## 2. Live broadcast
The gateway:

- accepts snapshots at `POST /api/live/snapshot`
- stores the latest snapshot in memory
- broadcasts snapshots and alerts over WebSocket `/ws`

## 3. Persistence
The gateway persists:

- raw snapshots
- per-hour agent bucket rollups
- per-hour callflow rollups
- generated reports
- alerts
- app settings

Database file by default:

- `live-gateway/data/vici_shift.sqlite`

## 4. Shift analytics
The dashboard can already show:

- live overview metrics
- shift bucket rollups
- callflow rollups
- peak-hour summaries
- previous-shift comparisons

## 5. Alerts
The gateway currently detects:

- waiting spike alerts
- purple overload alerts
- drop% jump alerts
- proactive staffing shortage alerts

## 6. Reports
The gateway currently supports:

- HTML shift report generation
- stored report history
- scheduled daily report generation
- browser-print PDF workflow via print-ready report view

## 7. Intelligence
The intelligence layer now includes:

- first hour rush detection
- peak hour consistency
- proactive staffing guidance
- agent state transition analysis
- campaign performance trend summaries
- call volume forecasting
- staffing optimization guidance
- wait time prediction
- shift duration optimization hints
- queue risk monitoring
- performance anomaly detection
- break scheduling intelligence
- voice-of-data narratives
- comparative shift analysis
- efficiency recommendations
- smart automation suggestions
- agent performance scoring
- trend forecasting summary

---

# Repository structure

```/dev/null/tree.txt#L1-22
Vici-Monitor-Medalert-Pro/
  README.md
  dashboard/
  docs/
  extension/
  live-gateway/
  shared/

live-gateway/src/
  alerts/
  data/
  db/
  intelligence/
  lib/
  middleware/
  notify/
  routes/
  ws/

dashboard/src/
  pages/
  ui/
  apiClient.js
  appShell.js
  storage.js
```

---

# Quick start

## Prerequisites

- Node.js 18+ recommended
- Google Chrome or Chromium for the extension
- A reachable Vicidial realtime report page
- A valid Slack incoming webhook if you want Slack notifications

## 1. Configure the gateway

Create a `.env` file inside `live-gateway/`.

Use `live-gateway/.env.example` as the template.

Recommended values:

```/dev/null/env.example#L1-8
PORT=3100
JWT_SECRET=replace_this_with_a_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
REPORTS_AUTO=0
REPORTS_DAILY_AT_HHMM=05:05
REPORTS_DIR=
SHIFT_DB_PATH=
```

Notes:

- `JWT_SECRET` is required.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` control the dashboard and extension login.
- `REPORTS_AUTO=1` enables automatic daily report generation.
- `REPORTS_DAILY_AT_HHMM` runs in the configured shift timezone.
- `REPORTS_DIR` is optional; by default reports are stored under `live-gateway/data/reports`.
- `SHIFT_DB_PATH` is optional; by default the SQLite file is `live-gateway/data/vici_shift.sqlite`.

## 2. Install gateway dependencies

From `live-gateway/`:

```/dev/null/run.txt#L1-2
npm install
npm start
```

Dev mode:

```/dev/null/run-dev.txt#L1-2
npm install
npm run dev
```

By default the gateway starts at:

- `http://localhost:3100`
- WebSocket path: `/ws`

## 3. Load the extension

In Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `Vici-Monitor-Medalert-Pro/extension`

Then:

1. Open the extension popup
2. Set the gateway URL
3. Sign in with the same gateway credentials
4. Open the Vicidial realtime report tab

## 4. Open the dashboard

Open:

- `dashboard/app.html`

Or:

- `dashboard/index.html` which redirects to `app.html`

For best results, serve the dashboard from a simple static file server rather than opening it through an editor auto-reload tool.

## 5. Verify the pipeline

Healthy path:

1. Gateway health is reachable at `GET /api/health`
2. Extension signs in successfully
3. Extension finds the Vicidial realtime tab
4. Extension publishes snapshots
5. Dashboard login succeeds
6. Dashboard shows live overview metrics
7. WebSocket status becomes connected

---

# Dashboard pages

## Overview
Shows:

- active calls
- waiting calls
- logged in / in-call / paused agent counts
- dial level / dialable leads / dropped data
- state bucket rollups
- live sparkline trends

## Shift analytics
Shows DB-driven hourly rollups for:

- agent buckets
- callflow
- peak hour summaries
- previous-shift comparisons

## Intelligence
Shows roadmap-driven intelligence outputs across:

- foundation
- pattern recognition
- prediction
- intelligent alerts
- automated insights
- advanced analytics

## Reports
Supports:

- open HTML report
- download HTML report
- open print-ready PDF view
- store HTML report
- store browser-print PDF view
- download stored reports

## Alerts
Supports:

- filtering
- ack / resolve / reopen
- live toast + optional sound notifications

## Settings
Supports gateway-side configuration for:

- shift start / end / timezone
- retention windows
- alert thresholds
- Slack notification routing

## Advanced
Supports:

- database table browsing
- schema inspection
- filtered row inspection
- safe DB clear flow

---

# Main APIs

## Auth
- `POST /api/auth/login`
- `GET /api/auth/me`

## Health
- `GET /api/health`

## Live
- `POST /api/live/snapshot`
- `WS /ws`

## Shift analytics
- `GET /api/shift/summary`
- `GET /api/shift/intelligence`
- `GET /api/shift/callflow`

## Admin
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Alerts
- `GET /api/alerts`
- `POST /api/alerts/:id/action`

## Reports
- `GET /api/reports`
- `GET /api/reports/shift`
- `POST /api/reports/shift/generate`
- `GET /api/reports/:id/download`
- `GET /api/reports/shift.pdf`

## Intelligence
- `GET /api/intelligence/insights`
- `GET /api/intelligence/shift-dates`
- `GET /api/intelligence/campaigns`
- `GET /api/intelligence/agents`
- `GET /api/intelligence/transitions`

---

# Data model summary

## Raw snapshots
Each snapshot includes:

- `timestamp`
- `source`
- `summary`
- `meta`
- `agents[]`
- `waitingCalls[]`

## Persisted tables
The gateway creates and uses:

- `app_settings`
- `raw_snapshots`
- `callflow_snapshots`
- `shift_buckets`
- `callflow_hourly`
- `generated_reports`
- `alerts`

---

# Alerting and notifications

## Built-in alert types
- `waiting_spike`
- `purple_overload`
- `drop_percent_jump`
- `staffing_shortage`

## Slack support
Slack notifications are configurable in gateway settings.

Supports:

- enable/disable
- global webhook + channel fallback
- per-severity routes
- cooldown
- test endpoint from the dashboard

If you do not configure a Slack webhook, Slack delivery will remain disabled.

---

# Reports and PDF behavior

## HTML reports
Fully supported.

## PDF reports
This project currently uses a **browser-print PDF workflow** instead of server-side PDF rendering.

That means:

- `GET /api/reports/shift.pdf` returns a print-ready HTML view
- the report preserves styling
- the operator uses the browser Print dialog and selects **Save as PDF**

Why this approach:

- no heavy headless browser dependency is required
- it works cross-platform
- it avoids fragile native rendering setup

Stored `"pdf"` reports are therefore print-ready HTML files intended for browser-based PDF export.

---

# Intelligence roadmap status

The complete captured roadmap lives in:

- `docs/intelligence/Complete-RoadMap.md`

## Implemented or partially implemented

### Pattern recognition
- First Hour Rush Detection
- Peak Hour Consistency Analysis
- Agent State Transition Patterns
- Campaign Performance Trends

### Predictive analytics
- Call Volume Forecasting
- Staffing Optimization Engine
- Wait Time Prediction
- Shift Duration Optimization

### Intelligent alerts
- Proactive Staffing Alerts
- Queue Risk Monitoring
- Performance Anomaly Detection
- Break Scheduling Intelligence

### Automated insights
- Voice of Data Narratives
- Comparative Shift Analysis
- Efficiency Recommendations

### Smart automation
- Auto-staffing suggestions
- Dynamic priority suggestions
- Predictive maintenance suggestions

### Advanced analytics
- Agent Performance Scoring
- Trend Forecasting Dashboard summary

## Not fully implemented as closed-loop automation
The current system focuses on **decision support**, not autonomous control.

That means these roadmap areas are represented as **insights and suggestions**, not automatic action against Vicidial itself:

- auto staffing adjustments
- dynamic priority management
- predictive maintenance actions

They are surfaced as recommendations for operators/managers rather than hard automation into the dialer.

## Still future / optional depth expansions
These remain good future enhancements:

- stronger forecasting models by weekday/seasonality
- deeper campaign ROI with business outcome data
- richer agent scoring with quality/compliance metrics
- true server-side PDF generation via headless browser
- multi-user auth / roles / audit logging
- automated tests across gateway, extension, and dashboard
- packaged deployment and static dashboard hosting guidance

---

# Known limitations

- Auth is single-admin style, not multi-user RBAC.
- The database uses `sql.js`, so persistence rewrites the SQLite file from memory to disk.
- PDF export is browser-print based, not native server-rendered PDF.
- Some intelligence outputs are heuristic and designed for operational usefulness, not formal data science rigor.
- The extension host permissions are still deployment-specific and may need adjustment for another Vicidial environment.
- There is no automated test suite yet.

---

# Useful docs

## Run docs
- `docs/run/how-to-run.md`
- `docs/run/dashboard-live.md`

## Architecture / decisions
- `docs/architecture/`
- `docs/decisions/`

## Intelligence docs
- `docs/intelligence/ROADMAP.md`
- `docs/intelligence/PHASE_1.md`
- `docs/intelligence/Complete-RoadMap.md`

## Scraping docs
- `docs/scraping/`

---

# Development notes

## Legacy files
Some top-level dashboard files such as `live.js` and `shift.js` exist as older standalone artifacts. The current primary dashboard app is driven by:

- `dashboard/app.html`
- `dashboard/src/appShell.js`

## Backward compatibility
`live-gateway/src/db.js` is intentionally a back-compat re-export of `src/db/index.js`.

---

# Recommended next steps

If you want to continue evolving this project, the highest-value next steps are:

1. Add automated tests for intelligence calculations and alert detection
2. Add true server-side PDF generation if required operationally
3. Add multi-user auth and role separation
4. Expand forecast quality with weekday and rolling seasonal weighting
5. Add business-outcome based campaign ROI metrics
6. Add deployment packaging for dashboard + gateway

---

# Summary

`Vici-Monitor-Medalert-Pro` is now a working realtime Vicidial operations intelligence stack with:

- live scraping
- authenticated ingestion
- WebSocket broadcasting
- persistence
- shift analytics
- alerts
- reports
- roadmap-aligned intelligence outputs

It is already usable as an operator/manager decision-support platform, and it has a clean path for deeper automation and analytics.
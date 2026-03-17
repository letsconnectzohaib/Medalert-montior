# Scraping Strategy (MV3 Extension Pro)

Goal: **near real-time** snapshots with high reliability, without overloading Vicidial or losing data when the tab is not focused.

## Where scraping runs

- **Primary**: content script on the Vicidial realtime report page (it has DOM access).
- **Coordination**: service worker keeps last known state, schedules work via alarms, pushes to Live Gateway.

Important constraint:
- A content script **cannot run** if the Vicidial page is closed. If you want “always on”, you need either:
  - a dedicated always-open hidden window/tab (not great UX), or
  - server-side polling using Vicidial APIs (best long-term, but depends on credentials/access), or
  - keep user logged in with the page open somewhere (most realistic for DOM scraping).

## Triggers

Use **multiple trigger types** to balance freshness and stability:

- **MutationObserver**:
  - Observe the agent table container (e.g. `table[width="860"]` or closest stable parent).
  - On mutations, schedule an extraction with debounce/throttle.

- **Heartbeat polling**:
  - `setInterval` (content script) at a conservative rate (e.g. 500ms–2000ms) as a backstop.
  - If no DOM changes, still emit snapshot every N seconds to prove liveness.

- **Alarm-based health checks** (service worker):
  - `chrome.alarms` every 1 min to ensure background worker wakes and can:
    - verify gateway connectivity
    - request a fresh scrape from active Vicidial tabs (via message)

## Throttling and dedupe

- **Throttle** DOM-triggered scrapes (e.g. 250–1000ms) to avoid spamming.
- **Dedupe** snapshots using a stable hash of the extracted payload (agents + waiting calls + summary/meta).
- **Backpressure**: if gateway is offline, buffer last K snapshots (ring buffer) in `chrome.storage.session` or memory and flush when online.

## Selector strategy (robustness)

Avoid brittle selectors that depend on pixel-perfect HTML. Prefer:
- `tr[class^="TR"]` for agents
- `tr[class^="csc"]` for waiting calls
- label-driven parsing for summary tiles and top meta keys (`DIAL LEVEL:` etc)

When parsing tables:
- Validate header row text once per page load.
- If header changes (Vicidial options toggled), switch to a best-effort mode and flag `parseWarnings`.

## State mapping

Primary: `stateColorClass` from the `TR*` row class.

Cross-check:
- `status` cell (`INCALL`, `READY`, `DISPO`, `PAUSED`, …)
- `mmss` time-in-state

If color is unknown, set `stateBucket = "unknown"` but keep raw `stateColorClass`.

## Minimal payload

Send the normalized snapshot as defined by:
- `shared/schema/vicidialSnapshot.schema.json`

## Performance targets (realistic)

- DOM extraction time: < 25ms typical
- Snapshot frequency: 0.5s–2s configurable (start at 1.0s)
- End-to-end (scrape→gateway→dashboard render): < 500ms typical on LAN


# Decision 0001: Live Gateway (vs extension hosting WebSocket)

## Context

The extension must scrape Vicidial DOM data (content script) and deliver it to one or more dashboards with low latency and good reliability.

## Decision

Use a **Live Gateway** service as the WebSocket broadcast and auth boundary.

## Why

- **Auth belongs server-side**: easier to rotate secrets, centralize tokens, and avoid leaking credentials in extension code.
- **Multiple dashboards**: gateway can fan-out snapshots to many clients.
- **Future persistence**: gateway can later write to DB without changing the extension.
- **Operational clarity**: one stable endpoint for dashboards/analytics to connect to.

## Trade-offs

- Requires running a local server during development/operation.
- Adds one hop (extension → gateway → dashboard), but still keeps latency low on LAN.


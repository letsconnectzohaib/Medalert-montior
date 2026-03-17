# Vici-Monitor-Medalert-Pro (monorepo)

This is the **next-generation** implementation (kept alongside the legacy `Vici-Monitor-Medalert/`).

## Packages

- `extension/`: Chrome Extension (MV3) — scrapes Vicidial realtime report and streams snapshots.
- `live-gateway/`: Auth + WebSocket gateway — receives snapshots and broadcasts to dashboards.
- `dashboard/`: Web dashboard — live view first; analytics later. Open `dashboard/index.html` in a browser for Phase 1.
- `shared/`: Shared schema + utilities.
- `docs/`: Contracts, API docs (`.txt`), architecture notes, phases.

## Source-of-truth scraping contract

See `docs/scraping/contract.md` and the reference HTML in `References/`.


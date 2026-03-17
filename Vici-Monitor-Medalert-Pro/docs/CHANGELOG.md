# Changelog (Pro)

## 0.1.0

- Added Vicidial scraping contract doc and normalized snapshot schema.
- Added MV3 scraping strategy (reliability, throttling, realistic latency targets).
- Scaffolded Pro monorepo layout docs.
- Implemented **Live Gateway (Phase 1)**:
  - REST health endpoint
  - login-only JWT auth
  - HTTP ingest endpoint for snapshots (`POST /api/live/snapshot`)
  - WebSocket `/ws` for `subscribe` and `publish`
  - in-memory latest snapshot broadcast (no persistence yet by design)
- Implemented **Extension Pro (Phase 1)**:
  - MV3 popup: login-only UI + gateway status + last snapshot
  - Options page: configure gateway base URL + test connection
  - Content script: contract-based scrape to normalized snapshot (agents, waiting calls, meta, summary)
  - Service worker: discovers Vicidial tabs + requests scrapes + POSTs snapshots to gateway on a schedule


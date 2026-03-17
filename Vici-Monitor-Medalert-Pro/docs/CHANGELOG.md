# Changelog (Pro)

## 0.1.0

- Added Vicidial scraping contract doc and normalized snapshot schema.
- Added MV3 scraping strategy (reliability, throttling, realistic latency targets).
- Scaffolded Pro monorepo layout docs.
- Implemented **Live Gateway (Phase 1)**:
  - REST health endpoint
  - login-only JWT auth
  - WebSocket `/ws` for `subscribe` and `publish`
  - in-memory latest snapshot broadcast (no persistence yet by design)


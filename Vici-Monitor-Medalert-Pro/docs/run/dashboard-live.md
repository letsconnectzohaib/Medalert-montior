# Dashboard Pro (Live) — how to run

## Prereqs

- Live Gateway running (see `docs/run/how-to-run.md`)
- Extension Pro scraping and publishing snapshots

## Run

Open one of these files in a browser:
- Live view: `Vici-Monitor-Medalert-Pro/dashboard/index.html`
- Shift analytics: `Vici-Monitor-Medalert-Pro/dashboard/shift.html`
 - New app shell (login + sidebar): `Vici-Monitor-Medalert-Pro/dashboard/app.html`

Then:
1. Confirm gateway URL (`http://localhost:3100`)
2. Login (admin credentials from `live-gateway/.env`)
3. The page will connect to `WS /ws` and subscribe.

## What you should see

- Summary metrics update when snapshots arrive
- State bucket counts (purple/violet/blue/etc derived from `TR*`)
- Rolling log of last ~60 snapshots


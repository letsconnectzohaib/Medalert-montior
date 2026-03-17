# How to run (Pro)

## 1) Start Live Gateway

From `Vici-Monitor-Medalert-Pro/`:

- Install:
  - `npm install`
- Configure:
  - copy `live-gateway/.env.example` → `live-gateway/.env`
  - set `JWT_SECRET` to a long random string
- Run:
  - `npm run dev:live-gateway`

Health check:
- `GET http://localhost:3100/api/health`

## 2) Load the extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `Vici-Monitor-Medalert-Pro/extension`
4. Open the extension popup → **Login** (uses the Live Gateway admin credentials)
5. Open Vicidial realtime report page in a tab (URL must match `realtime_report.php`)

What should happen:
- The extension finds the Vicidial tab, scrapes, and POSTs snapshots to the gateway.
- Popup should show `Last snapshot` updating.

## Notes (important)

- DOM scraping cannot run if the Vicidial page is closed. For “always on”, we’ll later move to server-side polling or a supported Vicidial API.


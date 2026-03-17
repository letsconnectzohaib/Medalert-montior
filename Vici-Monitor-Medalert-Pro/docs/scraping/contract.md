# Vicidial Real-time Report Scraping Contract (Pro)

Source reference HTML:
- `References/Real-Time Main Report_ ALL-ACTIVE.html`

This file defines **what** we scrape and the stable DOM anchors to scrape it from.

## Anchors

### Top meta block (key/value rows)

DOM: the table immediately after `<!-- ajax-mode -->` contains rows with keys like:
- `DIAL LEVEL:`, `DIALABLE LEADS:`, `CALLS TODAY:`, `AVG AGENTS:`, `DROPPED / ANSWERED:`, `DROPPED PERCENT:`, `TIME:`, etc.

Extraction strategy:
- Find `font.top_settings_key` cells and read their adjacent `font.top_settings_val`.
- Normalize numeric fields (strip `&nbsp;`, spaces, `%`, commas).

### Summary tiles (active/ringing/waiting/ivr + agents logged in/incalls/waiting/paused/dead/dispo)

DOM: inside `table[width="860"]` with icon tiles; values are in `<font ... font-size:18 ...>`.

Extraction strategy:
- Prefer parsing by the label text directly above each numeric value (e.g. `"current active calls"`).
- Avoid relying on exact column indices (HTML may change with display settings).

### Waiting calls table

DOM: inside a `<pre>` block:
- Header row contains `Calls Waiting:`
- Table headers: `STATUS`, `CAMPAIGN`, `PHONE NUMBER`, `SERVER IP`, `DIALTIME`, `CALL TYPE`, `PRIORITY`
- Data rows: `tr[class^="csc"]`

Extraction strategy:
- Locate the table whose first row contains `"Calls Waiting:"`.
- Read `tr[class^="csc"]` rows and map the first 7 `<td>` cells.

### Agent rows (“Agents Time On Calls Campaign”)

DOM: after the waiting calls table:
- Header row includes `STATION`, `PHONE`, `USER`, `USER GROUP`, `SESSIONID`, `STATUS`, `PAUSE`, `SERVER IP`, `CALL SERVER IP`, `MM:SS`, `CAMPAIGN`, `LIST ID`, `LIST NAME`, `CALLS`, `HOLD`, `IN-GROUP`
- Data rows: `tr[class^="TR"]` where class conveys state color (`TRpurple`, `TRlightblue`, etc)

Extraction strategy:
- Select `tr[class^="TR"]`.
- Use column index mapping based on the header **order** (below) from the reference file.

#### Agent column mapping (from reference HTML)

| Index | Header | Normalized field |
|---:|---|---|
| 0 | STATION | `station` |
| 1 | PHONE | `user` (agent numeric login shown under “PHONE”) |
| 2 | USER | `name` |
| 3 | USER GROUP | `userGroup` |
| 4 | SESSIONID | `sessionId` |
| 5 | STATUS | `statusCode` |
| 6 | (listen link cell) | `monitorLink` (optional) |
| 7 | PAUSE (INCALL/READY/etc) | `status` |
| 8 | (I / blank) | `callTypeFlag` (optional) |
| 9 | PAUSE CODE / blank | `pauseCode` |
| 10 | SERVER IP | `serverIp` |
| 11 | CALL SERVER IP | `callServerIp` |
| 12 | MM:SS | `mmss` (time-in-state) |
| 13 | CAMPAIGN | `campaign` |
| 14 | LIST ID | `listId` |
| 15 | LIST NAME | `listName` |
| 16 | CALLS | `calls` |
| 17 | HOLD | `hold` |
| 18 | IN-GROUP | `inGroup` |

Notes:
- The existing (non-Pro) extension is **not** using this full mapping today; Pro should.
- Any display-option changes in Vicidial could add/remove columns; the parser must be resilient (validate header row and fall back to best-effort).

## State taxonomy (color legend)

The reference HTML includes the legend (same as `image.png`):
- `TRred`: Agent chatting
- `TRorange`: Agent in email
- `TRlightblue`: Agent waiting for call
- `TRblue`: Agent waiting for call > 1 minute
- `TRmidnightblue`: Agent waiting for call > 5 minutes (HTML legend shows “midnightblue”; row class in CSS may differ per Vicidial build)
- `TRthistle`: Agent on call > 10 seconds
- `TRviolet`: Agent on call > 1 minute
- `TRpurple`: Agent on call > 5 minutes
- `TRkhaki`: Agent paused > 10 seconds
- `TRyellow`: Agent paused > 1 minute
- `TRolive`: Agent paused > 5 minutes
- `TRlime`: Agent in 3-WAY > 10 seconds
- `TRblack`: Agent on a dead call

Pro logic should treat the **color class** as the primary indicator of the “bucketed” state and use `status` + `mmss` as cross-checks.


console.log('Vicidial Monitor Pro content script loaded:', window.location.href);

// Local helpers (content scripts are not ES modules in MV3,
// so we keep these helpers inline instead of importing).
function parseNumberLoose(textValue) {
  if (textValue == null) return null;
  const cleaned = String(textValue).replace(/[^\d.-]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDroppedAnswered(textValue) {
  if (!textValue) return { dropped: 0, answered: 0 };
  const parts = String(textValue).split('/');
  const dropped = parseNumberLoose(parts[0]) ?? 0;
  const answered = parseNumberLoose(parts[1]) ?? 0;
  return { dropped, answered };
}

function mapStateBucketFromRowClass(rowClass) {
  const cls = String(rowClass || '').trim();
  switch (cls) {
    case 'TRred':
      return 'chatting';
    case 'TRorange':
      return 'email';
    case 'TRlightblue':
      return 'waiting_lt_1m';
    case 'TRblue':
      return 'waiting_gt_1m';
    case 'TRmidnightblue':
      return 'waiting_gt_5m';
    case 'TRthistle':
      return 'oncall_gt_10s';
    case 'TRviolet':
      return 'oncall_gt_1m';
    case 'TRpurple':
      return 'oncall_gt_5m';
    case 'TRkhaki':
      return 'paused_gt_10s';
    case 'TRyellow':
      return 'paused_gt_1m';
    case 'TRolive':
      return 'paused_gt_5m';
    case 'TRlime':
      return 'threeway_gt_10s';
    case 'TRblack':
      return 'deadcall';
    default:
      return 'unknown';
  }
}

function text(el) {
  return (el?.textContent || '').replace(/\u00A0/g, ' ').trim();
}

function findTopMeta() {
  // Key/value rows: font.top_settings_key next to font.top_settings_val
  const keys = Array.from(document.querySelectorAll('font.top_settings_key'));
  const meta = {};

  for (const k of keys) {
    const key = text(k).replace(/:$/, '').trim().toUpperCase();
    const val = text(k.parentElement?.nextElementSibling?.querySelector('font.top_settings_val') || k.parentElement?.nextElementSibling);
    if (!key) continue;
    meta[key] = val;
  }

  const dialLevel = parseNumberLoose(meta['DIAL LEVEL'] ?? '0') ?? 0;
  const dialableLeads = parseNumberLoose(meta['DIALABLE LEADS'] ?? '0') ?? 0;
  const callsToday = parseNumberLoose(meta['CALLS TODAY'] ?? '0') ?? 0;
  const avgAgents = parseNumberLoose(meta['AVG AGENTS'] ?? '0') ?? 0;
  const droppedAnswered = parseDroppedAnswered(meta['DROPPED / ANSWERED'] ?? '0/0');
  const droppedPercent = parseNumberLoose(meta['DROPPED PERCENT'] ?? '0') ?? 0;
  const reportTime = meta['TIME'] ?? '';
  const dialMethod = (meta['DIAL METHOD'] ?? '').trim();

  return { dialLevel, dialableLeads, callsToday, avgAgents, droppedAnswered, droppedPercent, reportTime, dialMethod };
}

function findSummaryTiles() {
  const summary = {
    activeCalls: 0,
    ringingCalls: 0,
    callsWaiting: 0,
    callsInIvr: 0,
    agentsLoggedIn: 0,
    agentsInCalls: 0,
    agentsWaiting: 0,
    agentsPaused: 0,
    agentsDead: 0,
    agentsDispo: 0
  };

  // Labels appear as lowercase descriptive strings in tiles.
  // We parse by walking all <font> nodes with those known labels, then picking next numeric font in the tile.
  const labelToKey = new Map([
    ['current active calls', 'activeCalls'],
    ['calls ringing', 'ringingCalls'],
    ['calls waiting for agents', 'callsWaiting'],
    ['calls in ivr', 'callsInIvr'],
    ['agents logged in', 'agentsLoggedIn'],
    ['agents in calls', 'agentsInCalls'],
    ['agents waiting', 'agentsWaiting'],
    ['paused agents', 'agentsPaused'],
    ['agents in dead calls', 'agentsDead'],
    ['agents in dispo', 'agentsDispo']
  ]);

  const fonts = Array.from(document.querySelectorAll('table[width="860"] font'));
  for (let i = 0; i < fonts.length; i++) {
    const label = text(fonts[i]).toLowerCase();
    const key = labelToKey.get(label);
    if (!key) continue;

    // find the next font that looks numeric
    for (let j = i + 1; j < Math.min(i + 8, fonts.length); j++) {
      const n = parseNumberLoose(text(fonts[j]));
      if (n != null) {
        summary[key] = Math.max(0, Math.trunc(n));
        break;
      }
    }
  }

  return summary;
}

function findWaitingCalls() {
  const tables = Array.from(document.querySelectorAll('table'));
  let table = null;
  for (const t of tables) {
    const firstRow = t.querySelector('tr');
    if (firstRow && text(firstRow).includes('Calls Waiting:')) {
      table = t;
      break;
    }
  }
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tr[class^="csc"]'));
  return rows.map((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    return {
      status: text(cells[0]),
      campaign: text(cells[1]),
      phone: text(cells[2]),
      serverIp: text(cells[3]),
      dialTime: text(cells[4]),
      callType: text(cells[5]),
      priority: parseNumberLoose(text(cells[6])) ?? 0
    };
  });
}

function findAgents() {
  const rows = Array.from(document.querySelectorAll('tr[class^="TR"]'));
  return rows
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 13) return null;

      const stateColorClass = row.className;
      const stateBucket = mapStateBucketFromRowClass(stateColorClass);

      return {
        station: text(cells[0]),
        user: text(cells[1]),
        name: text(cells[2]),
        userGroup: text(cells[3]),
        sessionId: text(cells[4]),
        statusCode: text(cells[5]),
        status: text(cells[6]) || text(cells[7]),
        pauseCode: text(cells[8]) || text(cells[9]),
        serverIp: text(cells[10]),
        callServerIp: text(cells[11]),
        mmss: text(cells[12]),
        campaign: text(cells[13]),
        listId: text(cells[14]),
        listName: text(cells[15]),
        calls: parseNumberLoose(text(cells[16])) ?? 0,
        hold: text(cells[17]),
        inGroup: text(cells[18]),
        stateColorClass,
        stateBucket
      };
    })
    .filter(Boolean);
}

function buildSnapshot() {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    source: {
      kind: 'vicidial_realtime_report',
      pageUrl: window.location.href,
      scrapeVersion: 'pro-0.1.0'
    },
    summary: findSummaryTiles(),
    meta: findTopMeta(),
    agents: findAgents(),
    waitingCalls: findWaitingCalls()
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'pro_scrape_now') {
    try {
      const snapshot = buildSnapshot();
      sendResponse({ success: true, snapshot });
    } catch (e) {
      sendResponse({ success: false, error: e?.message || 'scrape_failed' });
    }
    return true;
  }
  return false;
});

// --- On-change streaming (preferred) ---
let throttleHandle = null;
let lastPayloadSig = '';

function scheduleEmit(throttleMs) {
  if (throttleHandle) return;
  throttleHandle = setTimeout(async () => {
    throttleHandle = null;
    try {
      const snapshot = buildSnapshot();
      const sig = JSON.stringify({
        summary: snapshot.summary,
        meta: snapshot.meta,
        agents: snapshot.agents?.map((a) => [a.user, a.stateBucket, a.mmss, a.status, a.pauseCode]),
        waiting: snapshot.waitingCalls?.map((c) => [c.phone, c.status, c.dialTime])
      });
      if (sig === lastPayloadSig) return;
      lastPayloadSig = sig;
      chrome.runtime.sendMessage({ type: 'pro_snapshot', snapshot }, () => {
        // ignore errors when extension is reloading
      });
    } catch {
      // swallow; manual scrape still works
    }
  }, Math.max(250, Number(throttleMs) || 1500));
}

async function getScrapeConfig() {
  const data = await chrome.storage.local.get(['scrape']);
  const scrape = data.scrape || {};
  return {
    mode: scrape.mode || 'onChange',
    throttleMs: scrape.throttleMs ?? 1500,
    pollMs: scrape.pollMs ?? 60000
  };
}

async function startStreaming() {
  const cfg = await getScrapeConfig();
  if (cfg.mode !== 'onChange') return;

  const target = document.querySelector('table[width="860"]') || document.body;
  const observer = new MutationObserver(() => scheduleEmit(cfg.throttleMs));
  observer.observe(target, { childList: true, subtree: true, characterData: true });

  // Emit one snapshot immediately.
  scheduleEmit(cfg.throttleMs);
}

startStreaming();



import { getSettings, setSettings } from '../shared/settings.js';

function nowIso() {
  return new Date().toISOString();
}

async function findVicidialTabs() {
  const settings = await getSettings();
  const configured = String(settings.target?.reportPageUrl || '').trim();
  const configuredPattern = configured ? toChromeMatchPattern(configured) : null;

  const tabs = await chrome.tabs.query({
    url: [
      'https://*/realtime_report.php*',
      'http://*/realtime_report.php*',
      ...(configuredPattern ? [configuredPattern] : []),
      'http://127.0.0.1:5500/References/*Real-Time*ALL-ACTIVE.html'
    ]
  });
  return tabs || [];
}

function toChromeMatchPattern(url) {
  try {
    const u = new URL(url);
    // Match any querystring variants, keep path stable.
    return `${u.protocol}//${u.host}${u.pathname}*`;
  } catch {
    return null;
  }
}

async function requestScrapeFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: 'pro_scrape_now' });
  } catch (e) {
    // Most common on MV3 reload: content script not injected yet.
    // Try to inject and retry once.
    const msg = String(e?.message || '');
    if (msg.toLowerCase().includes('receiving end does not exist')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/content_script.js']
        });
        return await chrome.tabs.sendMessage(tabId, { type: 'pro_scrape_now' });
      } catch (e2) {
        return { success: false, error: e2?.message || 'inject_failed' };
      }
    }
    return { success: false, error: e?.message || 'sendMessage_failed' };
  }
}

async function publishToGateway(baseUrl, token, snapshot) {
  const url = `${String(baseUrl || '').replace(/\/$/, '')}/api/live/snapshot`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ snapshot })
  });
  if (!res.ok) {
    return { success: false, error: `publish_failed_http_${res.status}` };
  }
  await setSettings({ runtime: { lastSnapshotAt: nowIso(), lastError: null } });
  return { success: true };
}

async function tick(reason = 'alarm') {
  const settings = await getSettings();
  const authed = !!settings.auth?.token;

  const tabs = await findVicidialTabs();
  if (!authed) {
    await setSettings({
      runtime: {
        scraperState: tabs.length ? 'Signed out (Vicidial tab found)' : 'Signed out (no Vicidial tab)',
        lastError: null
      }
    });
    return;
  }

  if (!tabs.length) {
    await setSettings({ runtime: { scraperState: 'Waiting for Vicidial tab…', lastError: null } });
    return;
  }

  await setSettings({
    runtime: { scraperState: `Scraping (${tabs.length} tab${tabs.length === 1 ? '' : 's'})…`, lastError: null }
  });

  let scraped = 0;
  let published = 0;

  for (const tab of tabs) {
    try {
      const res = await requestScrapeFromTab(tab.id);
      if (res?.success && res.snapshot) {
        scraped += 1;
        const pub = await publishToGateway(settings.gatewayBaseUrl, settings.auth.token, res.snapshot);
        if (!pub.success) {
          await setSettings({
            runtime: { scraperState: `Publish failed (${pub.error || 'unknown'})`, lastError: pub.error || 'publish_failed' }
          });
          break;
        }
        published += 1;
      } else {
        await setSettings({
          runtime: { scraperState: `Scrape returned no snapshot (${reason})`, lastError: res?.error || 'no_snapshot' }
        });
      }
    } catch (e) {
      await setSettings({ runtime: { scraperState: `Scrape failed (${reason})`, lastError: e?.message || 'scrape_failed' } });
    }
  }

  if (published > 0) {
    await setSettings({ runtime: { scraperState: `Idle (published ${published}/${scraped})`, lastError: null } });
  } else if (scraped > 0) {
    await setSettings({ runtime: { scraperState: `Idle (scraped ${scraped}, published 0)`, lastError: 'publish_failed_or_skipped' } });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('pro_tick', { periodInMinutes: 1 });
  tick();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('pro_tick', { periodInMinutes: 1 });
  tick();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pro_tick') tick();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'pro_tick_now') {
    tick('manual')
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: e?.message || 'tick_failed' }));
    return true;
  }
  if (msg?.type === 'pro_snapshot') {
    (async () => {
      const settings = await getSettings();
      if (!settings.auth?.token) return sendResponse({ success: false, error: 'signed_out' });
      const pub = await publishToGateway(settings.gatewayBaseUrl, settings.auth.token, msg.snapshot);
      sendResponse(pub);
    })().catch((e) => sendResponse({ success: false, error: e?.message || 'publish_failed' }));
    return true;
  }
  return false;
});


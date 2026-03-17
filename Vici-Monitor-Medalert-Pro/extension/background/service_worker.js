import { getSettings, setSettings } from '../shared/settings.js';

function nowIso() {
  return new Date().toISOString();
}

async function findVicidialTabs() {
  const tabs = await chrome.tabs.query({
    url: [
      'https://*/realtime_report.php*',
      'http://*/realtime_report.php*',
      'http://127.0.0.1:5500/References/*Real-Time*ALL-ACTIVE.html'
    ]
  });
  return tabs || [];
}

async function requestScrapeFromTab(tabId) {
  return await chrome.tabs.sendMessage(tabId, { type: 'pro_scrape_now' });
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
  await setSettings({ runtime: { lastSnapshotAt: nowIso() } });
  return { success: true };
}

async function tick() {
  const settings = await getSettings();
  const authed = !!settings.auth?.token;

  const tabs = await findVicidialTabs();
  if (!authed) {
    await setSettings({
      runtime: { scraperState: tabs.length ? 'Signed out (Vicidial tab found)' : 'Signed out (no Vicidial tab)' }
    });
    return;
  }

  if (!tabs.length) {
    await setSettings({ runtime: { scraperState: 'Waiting for Vicidial tab…' } });
    return;
  }

  await setSettings({ runtime: { scraperState: `Scraping (${tabs.length} tab${tabs.length === 1 ? '' : 's'})…` } });

  for (const tab of tabs) {
    try {
      const res = await requestScrapeFromTab(tab.id);
      if (res?.success && res.snapshot) {
        const pub = await publishToGateway(settings.gatewayBaseUrl, settings.auth.token, res.snapshot);
        if (!pub.success) {
          await setSettings({ runtime: { scraperState: `Publish failed (${pub.error || 'unknown'})` } });
          break;
        }
      }
    } catch {
      // ignore single-tab failures; we'll try again next tick
    }
  }

  await setSettings({ runtime: { scraperState: 'Idle (last scrape ok)' } });
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


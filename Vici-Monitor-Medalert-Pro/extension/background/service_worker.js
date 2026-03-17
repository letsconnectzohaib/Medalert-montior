import { getSettings, setSettings } from '../shared/settings.js';

// Phase 1: background owns connectivity + scheduling.
// Scraping implementation will be added next (content script does DOM parsing).

async function tick() {
  const settings = await getSettings();
  await setSettings({
    runtime: {
      scraperState: settings.auth?.token ? 'Idle (signed in)' : 'Idle (signed out)'
    }
  });
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


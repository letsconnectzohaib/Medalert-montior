// background.js - Professional Service Worker
importScripts('utils.js');

const settings = {};
const ALARM_NAME = 'slack-report';
const BACKEND_STATS_URL = 'http://localhost:3000/api/logs';
const BACKEND_STATUS_URL = 'http://localhost:3000/api/status';
let lastBackendUpdate = 0;
let isBackendRunning = false; // Cache the status

// --- 1. Initialization & Alarms ---

chrome.runtime.onInstalled.addListener(async () => {
    Utils.log('Extension installed/updated');
    // Load initial settings, though we don't use them much here anymore.
});

// The alarm logic for Slack reporting is kept but is not essential
// for the real-time dashboard functionality.

// --- 2. Message Handling ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sendStats') {
        if (isBackendRunning) {
            sendToBackend(message.data).then(success => {
                sendResponse({ success });
            });
        } else {
            sendResponse({ success: false, error: 'Backend is offline' });
        }
    } else if (message.action === 'getBackendStatus') {
        checkBackendStatus().then(isRunning => {
            sendResponse({ isRunning });
        });
    }
    // Return true to indicate we will respond asynchronously
    return true; 
});


// --- 3. Backend Communication ---

async function checkBackendStatus() {
    try {
        const response = await fetch(BACKEND_STATUS_URL, {
             method: 'GET',
             // Timeout in milliseconds. AbortController is the standard way.
             signal: AbortSignal.timeout(3000) 
        });
        
        // Update status based on response
        const newStatus = response.ok;
        if (newStatus !== isBackendRunning) {
            Utils.log(`Backend status changed: ${newStatus ? 'Online' : 'Offline'}`);
            isBackendRunning = newStatus;
        }

    } catch (err) {
        if (isBackendRunning) {
            Utils.log('Backend status changed: Offline (request failed)', err.name);
            isBackendRunning = false;
        }
    }
    return isBackendRunning;
}


async function sendToBackend(stats) {
    const now = Date.now();
    // Throttle updates to every 2 seconds to avoid flooding the server.
    if (now - lastBackendUpdate < 2000) return true; 

    try {
        const response = await fetch(BACKEND_STATS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stats),
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            lastBackendUpdate = now;
            return true;
        } else {
            console.error('Backend responded with error:', response.status);
            // If the server gives an error, we mark it as not running.
            isBackendRunning = false; 
            return false;
        }
    } catch (err) {
        console.error('Failed to send to backend:', err.name);
        isBackendRunning = false;
        return false;
    }
}

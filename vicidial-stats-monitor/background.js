// background.js - Professional Service Worker
importScripts('utils.js');

let settings = {};
const ALARM_NAME = 'slack-report';
let lastBackendUpdate = 0;
const BACKEND_URL = 'http://localhost:3000/api/logs';

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
    Utils.log('Extension installed/updated');
    settings = await Utils.storage.loadSettings();
    
    setupAlarm(settings.reportInterval || 60, settings.reportStartTime);
});

function setupAlarm(intervalMinutes, startTime) {
    chrome.alarms.clear(ALARM_NAME, () => {
        let when = Date.now();
        
        if (startTime) {
            // Calculate next occurrence of startTime
            const [hours, minutes] = startTime.split(':').map(Number);
            const now = new Date();
            const target = new Date(now);
            target.setHours(hours, minutes, 0, 0);

            if (target <= now) {
                // If the target time has already passed today (e.g., now is 2:00 PM, target is 1:42 AM)
                // We assume the user wants the schedule to run relative to that time.
                // However, for immediate feedback, if the start time is in the past,
                // we should just start the interval now, OR wait until tomorrow?
                // Given the user wants "hourly report", usually they want it ASAP.
                
                // Let's stick to: Start NOW if time passed, but align subsequent runs? 
                // Chrome alarms 'periodInMinutes' handles the interval. 'when' handles the first run.
                
                // If the user specifically sets a time, they might want to wait for tomorrow if it passed?
                // But usually, they just want to align the "minute" mark (e.g. :42).
                
                // Strategy: Find the next occurrence of the minute mark.
                // Example: Start time 1:42. Now is 2:00.
                // We want next run at 2:42.
                
                // Let's keep it simple:
                // If target > now, wait until target.
                // If target <= now, start immediately (when = Date.now()).
                
                // If the user wants to test "1:42 AM" specifically, and it's currently 1:00 AM, it will wait.
                
                Utils.log(`Start time ${startTime} has passed for today. Starting immediately.`);
            } else {
                when = target.getTime();
                Utils.log(`Scheduling first report for ${target.toLocaleTimeString()}`);
            }
        }

        chrome.alarms.create(ALARM_NAME, {
            when: when,
            periodInMinutes: intervalMinutes
        });
        Utils.log(`Report alarm set. First run: ${new Date(when).toLocaleTimeString()}, Interval: ${intervalMinutes} mins`);
    });
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sendStats') {
        handleStatsUpdate(message.data);
    } else if (message.action === 'updateAlarm') {
        setupAlarm(message.interval, message.startTime);
    } else if (message.action === 'triggerReportNow') {
        Utils.log('Manual report triggered');
        generateAndSendReport().then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true; // Keep channel open for async response
    }
    return true;
});

// Listen for alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
    // Deprecated Slack Alarm
    if (alarm.name === ALARM_NAME) {
        // No logging
    }
});

// Handle stats update from content script
async function handleStatsUpdate(stats) {
    // 1. Save to storage for Popup to read
    await Utils.storage.set({ 
        vicidialStats: stats,
        lastUpdated: Date.now()
    });

    // 2. Save to history for reporting (append to local storage array)
    await appendToHistory(stats);

    // 3. Broadcast to open popups
    chrome.runtime.sendMessage({ 
        action: 'statsUpdated', 
        data: stats 
    }).catch(() => {
        // Ignore error if no popup is open
    });

    // 4. Update Badge
    updateBadge(stats);

    // 5. Check Thresholds & Notify
    checkThresholds(stats);

    // 6. Send to Local Backend (Throttled 4s)
    sendToBackend(stats);
}

async function sendToBackend(stats) {
    const now = Date.now();
    if (now - lastBackendUpdate < 4000) return; // Throttle to 4 seconds

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stats)
        });
        
        if (response.ok) {
            // Utils.log('Data sent to backend successfully');
            lastBackendUpdate = now;
        } else {
            console.error('Backend responded with error:', response.status);
        }
    } catch (err) {
        console.error('Failed to send to backend:', err);
    }
}

async function appendToHistory(stats) {
    if (!stats || !stats.summary) return;

    // We only need key metrics for history, not full details
    const entry = {
        ts: Date.now(),
        active: stats.summary.activeCalls || 0,
        waiting: stats.summary.waitingCalls || 0,
        agents: stats.summary.agentsLoggedIn || 0,
        paused: stats.summary.agentsPaused || 0,
        incall: stats.summary.agentsInCalls || 0,
        total: stats.meta.callsToday || 0,
        dropped: stats.meta.droppedAnswered || '0%',
        agentsDetail: stats.details?.agents || [] // Store full agent list if needed for detailed reports
    };

    // Get existing history
    const data = await Utils.storage.get(['statsHistory']);
    let history = data.statsHistory || [];

    // Add new entry
    history.push(entry);

    // Prune old entries (older than 4 hours to allow longer reporting intervals)
    const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
    history = history.filter(item => item.ts > fourHoursAgo);

    // Save back
    await Utils.storage.set({ statsHistory: history });
}

async function generateAndSendReport() {
    // Reload settings to get latest URL and prefs
    settings = await Utils.storage.loadSettings();

    if (!settings.slackWebhookUrl) {
        Utils.log('Skipping report: No Slack Webhook URL configured');
        return;
    }

    const data = await Utils.storage.get(['statsHistory']);
    const history = data.statsHistory || [];

    if (history.length === 0) {
        Utils.log('Skipping report: No data history');
        return;
    }

    // Filter for the configured interval
    const intervalMs = (settings.reportInterval || 60) * 60 * 1000;
    const startTime = Date.now() - intervalMs;
    const intervalData = history.filter(item => item.ts > startTime);

    if (intervalData.length === 0) return;

    // Calculate Stats
    let maxActive = 0;
    let maxWaiting = 0;
    let totalCallsStart = intervalData[0].total;
    let totalCallsEnd = intervalData[intervalData.length - 1].total;
    let callsHandled = totalCallsEnd - totalCallsStart;
    
    // Handle case where total might reset (new day)
    if (callsHandled < 0) callsHandled = totalCallsEnd; 

    let avgAgentsSum = 0;
    let avgPausedSum = 0;
    let avgInCallSum = 0;

    intervalData.forEach(d => {
        if (d.active > maxActive) maxActive = d.active;
        if (d.waiting > maxWaiting) maxWaiting = d.waiting;
        avgAgentsSum += d.agents;
        avgPausedSum += d.paused;
        avgInCallSum += d.incall;
    });

    const count = intervalData.length;
    const avgAgents = Math.round(avgAgentsSum / count);
    const avgPaused = Math.round(avgPausedSum / count);
    const avgInCall = Math.round(avgInCallSum / count);
    
    const latest = intervalData[intervalData.length - 1];
    const currentDropped = latest.dropped;

    // Build Slack Blocks
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "📊 Vicidial Status Report",
                emoji: true
            }
        },
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `*Period:* Last ${settings.reportInterval || 60} Minutes`
                }
            ]
        },
        {
            type: "divider"
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: `*📞 Calls Handled*\n${callsHandled}`
                },
                {
                    type: "mrkdwn",
                    text: `*📉 Current Drop %*\n${currentDropped}`
                }
            ]
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: `*🔥 Peak Active*\n${maxActive}`
                },
                {
                    type: "mrkdwn",
                    text: `*⏳ Peak Waiting*\n${maxWaiting}`
                }
            ]
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: `*👥 Avg Agents Online*\n${avgAgents}`
                },
                {
                    type: "mrkdwn",
                    text: `*🗣️ Avg In Call*\n${avgInCall}`
                }
            ]
        }
    ];

    // Optional: Add Agent Stats if enabled
    if (settings.includeAgentStats && latest.agentsDetail && latest.agentsDetail.length > 0) {
        // Group agents by status
        const statusCounts = {};
        latest.agentsDetail.forEach(a => {
            // Simplify status (e.g., "PAUSED" vs "PAUSED - LUNCH")
            let baseStatus = a.status.split(' ')[0]; 
            if (a.status.includes('INCALL')) baseStatus = 'INCALL';
            
            statusCounts[baseStatus] = (statusCounts[baseStatus] || 0) + 1;
        });

        // Create text summary
        let statusText = [];
        for (const [status, count] of Object.entries(statusCounts)) {
            statusText.push(`${status}: ${count}`);
        }

        blocks.push({ type: "divider" });
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Current Agent Status Snapshot:*\n\`\`\`${statusText.join(' | ')}\`\`\``
            }
        });
    }

    blocks.push({
        type: "context",
        elements: [
            {
                type: "plain_text",
                text: `Generated at ${new Date().toLocaleTimeString()}`,
                emoji: true
            }
        ]
    });

    const message = {
        text: `Vicidial Report: ${callsHandled} calls handled in last ${settings.reportInterval} mins.`,
        blocks: blocks
    };

    // Send to Slack
    try {
        const response = await fetch(settings.slackWebhookUrl, {
            method: 'POST',
            body: JSON.stringify(message)
        });

        if (response.ok) {
            Utils.log('Slack report sent successfully');
        } else {
            Utils.error('Failed to send Slack report', await response.text());
        }
    } catch (err) {
        Utils.error('Error sending Slack report', err);
    }
}

function updateBadge(stats) {
    if (!stats || !stats.summary) return;

    const waiting = stats.summary.waitingCalls;
    const text = waiting > 0 ? waiting.toString() : '';
    
    chrome.action.setBadgeText({ text });
    
    if (waiting >= (settings.waitingCallsThreshold || 5)) {
        chrome.action.setBadgeBackgroundColor({ color: '#ff5252' }); // Red
    } else if (waiting > 0) {
        chrome.action.setBadgeBackgroundColor({ color: '#ffab40' }); // Orange
    } else {
        chrome.action.setBadgeBackgroundColor({ color: '#00e676' }); // Green
    }
}

function checkThresholds(stats) {
    if (!stats || !stats.summary) return;

    const waiting = stats.summary.waitingCalls;
    const limit = settings.waitingCallsThreshold || 5;

    if (waiting >= limit) {
        // Check if we already notified recently to avoid spam
        Utils.storage.get(['lastNotification']).then(data => {
            const lastTime = data.lastNotification || 0;
            const now = Date.now();

            // Notify max once per minute
            if (now - lastTime > 60000) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon128.png',
                    title: 'High Call Volume Alert',
                    message: `${waiting} calls are waiting! (Threshold: ${limit})`,
                    priority: 2
                });
                Utils.storage.set({ lastNotification: now });
            }
        });
    }
}

// Reload settings if they change
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.settings) {
        settings = changes.settings.newValue;
        Utils.log('Settings reloaded in background', settings);
        
        // If interval changed, update alarm
        if (changes.settings.oldValue && 
            (changes.settings.newValue.reportInterval !== changes.settings.oldValue.reportInterval ||
             changes.settings.newValue.reportStartTime !== changes.settings.oldValue.reportStartTime)) {
            setupAlarm(settings.reportInterval || 60, settings.reportStartTime);
        }
    }
});
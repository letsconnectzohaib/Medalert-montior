
// background.js - Service Worker for Vici-Monitor Extension

const BACKEND_URL = 'http://localhost:3000';
let backendStatus = 'pending'; // 'pending', 'online', 'offline'
let lastSuccessfulRequest = 0;

// --- 1. Core Logic ---

const checkBackendHealth = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`, { 
            signal: AbortSignal.timeout(2000) 
        });
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'healthy') {
                updateStatus('online');
            } else {
                updateStatus('offline');
            }
        } else {
            updateStatus('offline');
        }
    } catch (error) {
        updateStatus('offline');
    }
};

const sendDataToBackend = async (data) => {
    // Throttle requests to avoid overwhelming the server
    if (Date.now() - lastSuccessfulRequest < 1500) return { success: true, throttled: true };

    if (backendStatus !== 'online') {
        return { success: false, error: 'Backend is offline.' };
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
            lastSuccessfulRequest = Date.now();
            // Notify popup that stats have been updated
            chrome.runtime.sendMessage({ action: 'statsUpdated', data: data }, () => {
                if (chrome.runtime.lastError) {
                    // Silently handle - popup might be closed
                }
            });
            return { success: true };
        } else {
            const errorData = await response.json();
            updateStatus('offline'); // Assume server is down if it returns an error
            return { success: false, error: errorData.error || 'Server returned an error.' };
        }
    } catch (error) {
        updateStatus('offline');
        return { success: false, error: error.message };
    }
};

const updateStatus = (newStatus) => {
    if (backendStatus === newStatus) return;
    backendStatus = newStatus;
    // Broadcast status change to all parts of the extension (like the popup)
    chrome.runtime.sendMessage({ action: 'backendStatusChanged', status: backendStatus }, () => {
        if (chrome.runtime.lastError) {
            // Silently handle - no receivers (popup closed, etc.)
            console.log('Status update sent, no active receivers');
        }
    });
    console.log(`Vici-Monitor: Backend status is now ${backendStatus.toUpperCase()}`);
};


// --- 2. Event Listeners ---

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sendStats') {
        sendDataToBackend(message.data).then(sendResponse);
    } else if (message.action === 'getBackendStatus') {
        // Immediately return the cached status
        sendResponse({ isRunning: backendStatus === 'online' });
    }
    return true; // Indicates an async response
});

// Initialize and set up periodic health check
chrome.runtime.onStartup.addListener(() => {
    checkBackendHealth();
});

// When the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    checkBackendHealth();
});

// Periodically check the backend health every 5 seconds
setInterval(checkBackendHealth, 5000);

// Initial check when the script is first loaded
checkBackendHealth();

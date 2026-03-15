// content.js - DOM scraping for Vicidial Stats Monitor
(function() {
    'use strict';

    console.log('Vicidial Stats Monitor: Content script loaded.');

    let isBackendRunning = false;
    let observer = null;
    let statusCheckInterval = null;
    let lastData = null;
    let throttleTimeout = null;

    // --- 1. Control Logic ---

    function checkBackendStatus() {
        if (!chrome.runtime?.id) {
            return cleanup();
        }
        
        // Ask the background script for the backend's status.
        // This decouples the content script from network requests.
        chrome.runtime.sendMessage({ action: 'getBackendStatus' }, (response) => {
            if (chrome.runtime.lastError) {
                // This happens if the extension is disabled or reloaded.
                console.warn('Vicidial Stats Monitor: Could not connect to the background script.');
                if (isBackendRunning) handleStatusChange(false);
                cleanup(); // Stop all operations
                return;
            }

            handleStatusChange(response.isRunning);
        });
    }

    function handleStatusChange(isRunning) {
        if (isRunning === isBackendRunning) return; // No change

        isBackendRunning = isRunning;

        if (isBackendRunning) {
            console.log('Vicidial Stats Monitor: Backend is online. Starting scraper.');
            startScraping();
        } else {
            console.log('Vicidial Stats Monitor: Backend is offline. Stopping scraper.');
            stopScraping();
        }
    }

    function startScraping() {
        if (observer) return; // Already running

        observer = new MutationObserver(() => throttle(extractStats, 1500));

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            extractStats(); // Initial run
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
                    extractStats();
                }
            });
        }
    }

    function stopScraping() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }
    
    function cleanup() {
        stopScraping();
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
        }
        console.log('Vicidial Stats Monitor: Operations have been cleaned up.');
    }

    // --- 2. Data Extraction ---

    function throttle(func, limit) {
        if (!throttleTimeout) {
            func();
            throttleTimeout = setTimeout(() => { throttleTimeout = null; }, limit);
        }
    }

    function extractStats() {
        if (!isBackendRunning) {
            // This check prevents any scraping if the backend is known to be down.
            return;
        }

        try {
            const stats = {
                timestamp: new Date().toISOString(),
                summary: {},
                details: { waitingCalls: [], agents: [] },
                meta: {}
            };
            const bodyText = document.body.innerText;

            const safeMatch = (regex) => (bodyText.match(regex) || [])[1] || '0';
            stats.summary.activeCalls = parseInt(safeMatch(/(\d+)\s+current active calls/i));
            stats.summary.agentsLoggedIn = parseInt(safeMatch(/(\d+)\s+agents logged in/i));
            stats.summary.agentsInCalls = parseInt(safeMatch(/(\d+)\s+agents in calls/i));
            stats.summary.callsWaiting = parseInt(safeMatch(/(\d+)\s+calls waiting for agents/i));

            const topValRegex = /DIAL LEVEL:\s*([\d\.]+).+DIALABLE LEADS:\s*(\d+)/s;
            const topMatch = bodyText.match(topValRegex);
            if (topMatch) {
                stats.meta.dialLevel = topMatch[1];
                stats.meta.dialableLeads = parseInt(topMatch[2]);
            }

            const currentDataStr = JSON.stringify(stats);
            if (currentDataStr !== lastData) {
                lastData = currentDataStr;
                
                if (chrome.runtime?.id) {
                    chrome.runtime.sendMessage({ action: 'sendStats', data: stats }, (response) => {
                        if (chrome.runtime.lastError || !response?.success) {
                            console.warn('Vicidial Stats Monitor: Failed to send stats. Backend may be down.');
                            // The status checker will confirm and handle the state change.
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Vicidial Stats Monitor: Error during stats extraction:', error);
        }
    }

    // --- 3. Initialization ---

    // Start polling the backend status immediately and periodically.
    checkBackendStatus();
    statusCheckInterval = setInterval(checkBackendStatus, 5000); // Check every 5 seconds

})();

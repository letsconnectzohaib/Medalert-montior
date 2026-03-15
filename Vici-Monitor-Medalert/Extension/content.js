
// content.js - DOM scraping for Vicidial Stats Monitor
(function() {
    'use strict';

    console.log('Vicidial Stats Monitor: Content script v2.0 loaded.');

    let isBackendRunning = false;
    let observer = null;
    let statusCheckInterval = null;
    let lastDataString = null;
    let throttleTimeout = null;

    // --- 1. Control Logic ---

    function checkBackendStatus() {
        if (!chrome.runtime?.id) return cleanup();
        
        chrome.runtime.sendMessage({ action: 'getBackendStatus' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Vicidial Stats Monitor: Background script connection lost.');
                if (isBackendRunning) handleStatusChange(false);
                cleanup();
                return;
            }
            handleStatusChange(response.isRunning);
        });
    }

    function handleStatusChange(isRunning) {
        if (isRunning === isBackendRunning) return; 
        isBackendRunning = isRunning;
        if (isBackendRunning) {
            console.log('Vicidial Stats Monitor: Backend is ONLINE. Starting scraper.');
            startScraping();
        } else {
            console.log('Vicidial Stats Monitor: Backend is OFFLINE. Stopping scraper.');
            stopScraping();
        }
    }

    function startScraping() {
        if (observer) return;
        const targetNode = document.body;
        if (!targetNode) {
             document.addEventListener('DOMContentLoaded', () => startScraping());
             return;
        }
        observer = new MutationObserver(() => throttle(extractAndSendData, 1500));
        observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
        console.log('MutationObserver is now watching the document body.');
        extractAndSendData();
    }

    function stopScraping() {
        if (observer) {
            observer.disconnect();
            observer = null;
            console.log('MutationObserver stopped.');
        }
    }
    
    function cleanup() {
        stopScraping();
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
        }
        console.log('Vicidial Stats Monitor: All operations have been cleaned up.');
    }

    function throttle(func, limit) {
        if (!throttleTimeout) {
            func();
            throttleTimeout = setTimeout(() => { throttleTimeout = null; }, limit);
        }
    }

    // --- 2. Data Extraction (Overhauled) ---

    function extractAndSendData() {
        if (!isBackendRunning) return;

        try {
            const extractedData = {
                timestamp: new Date().toISOString(),
                summary: extractSummary(),
                details: {
                    agents: extractAgentDetails(),
                    waitingCalls: extractWaitingCallDetails(),
                },
                meta: extractMetadata(),
            };

            const currentDataString = JSON.stringify(extractedData.details);

            if (currentDataString !== lastDataString) {
                lastDataString = currentDataString;
                sendDataToBackground(extractedData);
            }
        } catch (error) {
            console.error('Vicidial Stats Monitor: Error during data extraction:', error);
        }
    }
    
    function sendDataToBackground(data) {
        if (!chrome.runtime?.id) return;
        chrome.runtime.sendMessage({ action: 'sendStats', data: data }, (response) => {
            if (chrome.runtime.lastError || !response?.success) {
                console.warn('Vicidial Stats Monitor: Failed to send stats. Backend may be down.');
            }
        });
    }

    function extractSummary() {
        const bodyText = document.body.innerText;
        const safeMatch = (regex) => (bodyText.match(regex) || [])[1] || '0';
        return {
            activeCalls: parseInt(safeMatch(/(\d+)\s+current active calls/i)),
            agentsLoggedIn: parseInt(safeMatch(/(\d+)\s+agents logged in/i)),
            agentsInCalls: parseInt(safeMatch(/(\d+)\s+agents in calls/i)),
            callsWaiting: parseInt(safeMatch(/(\d+)\s+calls waiting for agents/i)),
        };
    }

    function extractMetadata() {
        const bodyText = document.body.innerText;
        const topValRegex = /DIAL LEVEL:\s*([\d\.]+).+DIALABLE LEADS:\s*(\d+)/s;
        const topMatch = bodyText.match(topValRegex);
        return {
            dialLevel: topMatch ? topMatch[1] : '0',
            dialableLeads: topMatch ? parseInt(topMatch[2]) : 0,
        };
    }

    function extractAgentDetails() {
        const agentRows = Array.from(document.querySelectorAll('tr[class^="TR"]'));
        const agents = [];
        agentRows.forEach(row => {
            const cells = row.cells;
            if (cells.length < 10) return; // Basic validation

            try {
                agents.push({
                    station: cells[0]?.innerText.trim(),
                    user: cells[1]?.innerText.trim().replace(/\s*\+$/, ''),
                    session: cells[2]?.innerText.trim(),
                    status: cells[3]?.innerText.trim(),
                    time: cells[6]?.innerText.trim(),
                    stateColor: row.className, // *** The critical color state ***
                    pauseCode: cells[5]?.innerText.trim(),
                    campaign: cells[7]?.innerText.trim(),
                    calls: parseInt(cells[10]?.innerText.trim()) || 0,
                    group: cells[12]?.innerText.trim(),
                });
            } catch (e) {
                console.warn('Could not parse an agent row:', row, e);
            }
        });
        return agents;
    }

    function extractWaitingCallDetails() {
        // Find the 'Calls Waiting:' table
        const tables = Array.from(document.querySelectorAll('table'));
        const waitingCalls = [];
        let waitingCallsTable = null;

        for (const table of tables) {
            const firstCellText = table.querySelector('td')?.innerText;
            if (firstCellText && firstCellText.includes('Calls Waiting:')) {
                waitingCallsTable = table;
                break;
            }
        }

        if (waitingCallsTable) {
            const callRows = Array.from(waitingCallsTable.querySelectorAll('tr[class^="csc"]'));
            callRows.forEach(row => {
                const cells = row.cells;
                if (cells.length < 7) return;
                try {
                    waitingCalls.push({
                        status: cells[0]?.innerText.trim(),
                        campaign: cells[1]?.innerText.trim(),
                        phone: cells[2]?.innerText.trim(),
                        server: cells[3]?.innerText.trim(),
                        dialtime: cells[4]?.innerText.trim(),
                        type: cells[5]?.innerText.trim(),
                        priority: parseInt(cells[6]?.innerText.trim()) || 0,
                    });
                } catch (e) {
                    console.warn('Could not parse a waiting call row:', row, e);
                }
            });
        }
        return waitingCalls;
    }


    // --- 3. Initialization ---

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkBackendStatus);
    } else {
        checkBackendStatus();
    }
    
    statusCheckInterval = setInterval(checkBackendStatus, 5000);

})();

// content.js - DOM scraping for Vicidial Stats Monitor
(function() {
    'use strict';

    console.log('Vicidial Stats Monitor: Content script loaded on ' + window.location.href);

    let lastData = null;
    let throttleTimeout = null;
    let observer = null;
    let pollInterval = null;

    // Check if extension context is valid
    function isContextValid() {
        return !!chrome.runtime?.id;
    }

    // Cleanup function to stop all activities
    function cleanup() {
        if (throttleTimeout) {
            clearTimeout(throttleTimeout);
            throttleTimeout = null;
        }
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        console.log('Vicidial Stats Monitor: Cleanup complete - Extension context invalidated');
    }

    // Throttle function to limit execution frequency
    function throttle(func, limit) {
        if (!isContextValid()) {
            cleanup();
            return;
        }
        if (!throttleTimeout) {
            func();
            throttleTimeout = setTimeout(function() {
                throttleTimeout = null;
            }, limit);
        }
    }

    // Function to extract stats
    function extractStats() {
        if (!isContextValid()) {
            cleanup();
            return;
        }

        try {
            const stats = {
                timestamp: new Date().toISOString(),
                summary: {
                    activeCalls: 0,
                    ringingCalls: 0,
                    waitingCalls: 0,
                    ivrCalls: 0,
                    agentsLoggedIn: 0,
                    agentsInCalls: 0,
                    agentsWaiting: 0,
                    agentsPaused: 0,
                    agentsDead: 0,
                    agentsDispo: 0
                },
                details: {
                    waitingCalls: [],
                    agents: []
                },
                meta: {
                    dialLevel: '',
                    dialableLeads: 0,
                    callsToday: 0,
                    droppedAnswered: '',
                    avgAgents: 0,
                    dialMethod: ''
                }
            };

            const bodyText = document.body.innerText;

            // --- 1. Header Stats Extraction ---
            const safeMatch = (regex) => {
                const match = bodyText.match(regex);
                return match ? parseInt(match[1], 10) : 0;
            };

            // Fix for Dropped Percentage Parsing
            const droppedMatch = bodyText.match(/DROPPED PERCENT:\s*([\d.]+)%/i);
            stats.meta.droppedAnswered = droppedMatch ? droppedMatch[1] + '%' : '0%';

            stats.summary.activeCalls = safeMatch(/(\d+)\s+current active calls/i);
            stats.summary.ringingCalls = safeMatch(/(\d+)\s+calls ringing/i);
            stats.summary.waitingCalls = safeMatch(/(\d+)\s+calls waiting for agents/i);
            stats.summary.ivrCalls = safeMatch(/(\d+)\s+calls in IVR/i);
            
            stats.summary.agentsLoggedIn = safeMatch(/(\d+)\s+agents logged in/i);
            stats.summary.agentsInCalls = safeMatch(/(\d+)\s+agents in calls/i);
            stats.summary.agentsWaiting = safeMatch(/(\d+)\s+agents waiting/i);
            stats.summary.agentsPaused = safeMatch(/(\d+)\s+paused agents/i);
            stats.summary.agentsDead = safeMatch(/(\d+)\s+agents in dead calls/i);
            stats.summary.agentsDispo = safeMatch(/(\d+)\s+agents in dispo/i);

            // --- 2. Meta Stats (Top Table) ---
            const topValRegex = /DIAL LEVEL:\s*([\d\.]+)/i;
            const dlMatch = bodyText.match(topValRegex);
            if (dlMatch) stats.meta.dialLevel = dlMatch[1];

            const callsTodayRegex = /CALLS TODAY:\s*(\d+)/i;
            const ctMatch = bodyText.match(callsTodayRegex);
            if (ctMatch) stats.meta.callsToday = parseInt(ctMatch[1], 10);

            // Fallback: Query selector for table cells if they exist (standard mode)
            const statCells = document.querySelectorAll('table td font.top_settings_val');
            if (statCells.length >= 8) {
                stats.meta.dialLevel = statCells[0].innerText.trim();
                stats.meta.dialableLeads = parseInt(statCells[1].innerText.trim()) || 0;
                stats.meta.callsToday = parseInt(statCells[2].innerText.trim()) || 0;
                stats.meta.droppedAnswered = statCells[3].innerText.trim();
                stats.meta.avgAgents = parseFloat(statCells[4].innerText.trim()) || 0;
                stats.meta.dialMethod = statCells[5].innerText.trim();
            }

            // --- 3. Waiting Calls Detail ---
            // Strategy: Find the column header row "STATUS" + "PHONE NUMBER" directly
            // This is safer than looking for the "Calls Waiting" title which might change
            const callsHeaderRow = Array.from(document.querySelectorAll('tr')).find(tr => {
                const text = tr.innerText.toUpperCase();
                return text.includes('STATUS') && text.includes('PHONE NUMBER') && text.includes('CAMPAIGN');
            });

            if (callsHeaderRow) {
                let currentRow = callsHeaderRow.nextElementSibling;
                
                while (currentRow) {
                    // Stop if we hit a spacer row (often has colspan) or new section
                    // Heuristic: If row has fewer than 3 cells, it's likely a separator or end of table
                    const cells = currentRow.querySelectorAll('td');
                    if (cells.length < 3) break;

                    // Stop if we hit the Agents table header (just in case)
                    if (currentRow.innerText.includes('Agents Time On Calls')) break;

                    // HTML Structure: <td><span class="..."><b>TEXT</b></span></td>
                    // We need to extract the text safely
                    const getText = (index) => {
                        if (index >= cells.length) return '';
                        return cells[index].innerText.trim();
                    };

                    const status = getText(0);
                    // Only add if we have a valid status (ignore empty spacer rows)
                    if (status && status !== '') {
                        stats.details.waitingCalls.push({
                            status: status,
                            campaign: getText(1),
                            phone: getText(2),
                            server: getText(3),
                            wait: getText(4),
                            type: getText(5),
                            priority: getText(6)
                        });
                    }
                    
                    currentRow = currentRow.nextElementSibling;
                }
            }
            
            // Fallback to PRE block parsing (Text mode)
            if (stats.details.waitingCalls.length === 0) {
                const preBlocks = document.querySelectorAll('pre');
                preBlocks.forEach(pre => {
                    const text = pre.innerText;
                    if (text.includes('VICIDIAL: Calls Waiting')) {
                        const lines = text.split('\n');
                        let inTable = false;
                        lines.forEach(line => {
                            if (line.includes('+------+')) {
                                // Toggle or check end
                                if (inTable) inTable = false; 
                            } 
                            if (line.includes('| STATUS')) inTable = true;
                            
                            if (inTable && line.includes('|') && !line.includes('STATUS')) {
                                const parts = line.split('|').map(p => p.trim());
                                // Expected format: | STATUS | CAMPAIGN | PHONE | SERVER | TIME | TYPE | PRIORITY |
                                // parts[0] is empty (before first |)
                                if (parts.length >= 8) {
                                    stats.details.waitingCalls.push({
                                        status: parts[1],
                                        campaign: parts[2],
                                        phone: parts[3],
                                        server: parts[4],
                                        wait: parts[5],
                                        type: parts[6],
                                        priority: parts[7]
                                    });
                                }
                            }
                        });
                    }
                });
            }

            // --- 4. Agent Details ---
            // HTML Table Mode (Priority)
            const agentRows = document.querySelectorAll('tr[class^="TR"]');
            if (agentRows.length > 0) {
                stats.details.agents = Array.from(agentRows).map(row => {
                    const cells = row.querySelectorAll('td');
                    // HTML Column Mapping based on dispaly-as-html.html:
                    // 0: Station, 1: User, 2: Session, 3: Status, 4: Icon, 5: Icon, 6: Time, 7: Campaign, 8: Group
                    if (cells.length >= 9) {
                        return {
                            station: cells[0].innerText.trim(),
                            user: cells[1].innerText.trim(),
                            session: cells[2].innerText.trim(),
                            status: cells[3].innerText.trim(),
                            time: cells[6].innerText.trim(),
                            campaign: cells[7].innerText.trim(),
                            group: cells[8].innerText.trim()
                        };
                    }
                    return null;
                }).filter(Boolean);
            }

            // Text Mode Fallback
            if (stats.details.agents.length === 0) {
                 const preBlocks = document.querySelectorAll('pre');
                 preBlocks.forEach(pre => {
                     if (pre.innerText.includes('Agents Time On Calls Campaign')) {
                         const lines = pre.innerText.split('\n');
                         lines.forEach(line => {
                             if (line.trim().startsWith('|')) {
                                 if (line.includes('STATION') || line.includes('USER')) return;
                                 
                                 const parts = line.split('|').map(p => p.trim());
                                 // | STATION | USER | SESSION | STATUS | TIME | CAMPAIGN | GROUP |
                                 // indices: 1, 2, 3, 4, 5, 6, 7
                                 if (parts.length >= 8) {
                                     let userRaw = parts[2] || '';
                                     userRaw = userRaw.replace('+', '').trim();
    
                                     stats.details.agents.push({
                                         station: parts[1],
                                         user: userRaw,
                                         session: parts[3],
                                         status: parts[4],
                                         time: parts[5],
                                         campaign: parts[6],
                                         group: parts[7] || ''
                                     });
                                 }
                             }
                         });
                     }
                 });
            }

            // Only send if data changed significantly
            const currentDataStr = JSON.stringify(stats);
            const lastDataStr = JSON.stringify(lastData);

            if (currentDataStr !== lastDataStr) {
                lastData = stats;
                if (isContextValid()) {
                    console.log('Vicidial Stats Monitor: Sending data update', stats); // Verbose Log
                    chrome.runtime.sendMessage({action: 'sendStats', data: stats}).catch(err => {
                        if (err.message.includes('Extension context invalidated')) {
                            cleanup();
                        }
                    });
                }
            } else {
                 console.log('Vicidial Stats Monitor: Data unchanged, skipping update');
            }
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                cleanup();
            } else {
                console.error('Vicidial Stats Monitor: Error extracting stats:', error);
            }
        }
    }

    // Initialize Observer
    if (isContextValid()) {
        observer = new MutationObserver(() => {
            if (isContextValid()) {
                throttle(extractStats, 1000); 
            } else {
                cleanup();
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
            extractStats(); 
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (isContextValid()) {
                    observer.observe(document.body, { childList: true, subtree: true });
                    extractStats();
                }
            });
        }

        // Fallback polling
        pollInterval = setInterval(() => {
            if (isContextValid()) {
                extractStats();
            } else {
                cleanup();
            }
        }, 5000);
    }

})();

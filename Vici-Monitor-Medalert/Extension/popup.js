
document.addEventListener('DOMContentLoaded', async () => {
    // --- UI Elements ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    const loader = document.getElementById('loader');
    const errorState = document.getElementById('error-state');
    const serverDownState = document.getElementById('server-down-state');
    const serverStatusSection = document.getElementById('server-status-section');
    const connectionStatus = document.getElementById('connection-status');
    const elBackendStatus = document.getElementById('backend-status');
    const elAgentsList = document.getElementById('agents-list');
    const elCallsList = document.getElementById('calls-list');
    const elLastUpdated = document.getElementById('last-updated');
    const btnOpenDialer = document.getElementById('open-dialer-btn');
    const btnRetryConnection = document.getElementById('retry-connection-btn');
    const btnOpenVicidial = document.getElementById('open-vicidial-btn');

    // Dashboard Elements
    const ui = {
        active: document.getElementById('dash-active'),
        waiting: document.getElementById('dash-waiting'),
        agents: document.getElementById('dash-agents'),
        total: document.getElementById('dash-total'),
        dropped: document.getElementById('dash-dropped'),
        incall: document.getElementById('dash-incall'),
        ringing: document.getElementById('dash-ringing'),
        ivr: document.getElementById('dash-ivr'),
        paused: document.getElementById('dash-paused'),
    };

    // --- State ---
    let settings = await Utils.storage.loadSettings();

    // --- Initialization ---
    initTabs();
    initListeners();
    loadInitialData();

    // --- Event Handlers & Listeners ---

    function initTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            });
        });
    }

    function initListeners() {
        const btnSave = document.getElementById('save-settings-btn');
        if (btnSave) {
            btnSave.addEventListener('click', handleSaveSettings);
        }

        btnOpenDialer.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://axcl2s.dialerhosting.com/Xcl2s6wgd/realtime_report.php?report_display_type=HTML' });
        });

        // Add retry button listener
        if (btnRetryConnection) {
            btnRetryConnection.addEventListener('click', () => {
                // Retry backend connection check
                chrome.runtime.sendMessage({ action: 'getBackendStatus' }, response => {
                    if (chrome.runtime.lastError) {
                        console.error('Retry failed:', chrome.runtime.lastError.message);
                    } else if (response && response.isRunning !== undefined) {
                        updateBackendStatusUI(response.isRunning ? 'online' : 'offline');
                    }
                });
            });
        }

        // Add Open Vicidial button listener (in server down state)
        if (btnOpenVicidial) {
            btnOpenVicidial.addEventListener('click', () => {
                chrome.tabs.create({ url: 'https://axcl2s.dialerhosting.com/Xcl2s6wgd/realtime_report.php?report_display_type=HTML' });
            });
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'statsUpdated':
                    updateUI(message.data);
                    break;
                case 'backendStatusChanged':
                    updateBackendStatusUI(message.status);
                    break;
            }
        });
    }

    async function loadInitialData() {
        // Request current backend status from service worker
        chrome.runtime.sendMessage({ action: 'getBackendStatus' }, response => {
            if (chrome.runtime.lastError) {
                console.error('Could not get backend status:', chrome.runtime.lastError.message);
                updateBackendStatusUI('offline');
            } else if (response && response.isRunning !== undefined) {
                updateBackendStatusUI(response.isRunning ? 'online' : 'offline');
            } else {
                updateBackendStatusUI('offline');
            }
        });

        // Load settings into form fields
        if (document.getElementById('waitingCallsThreshold')) {
            document.getElementById('waitingCallsThreshold').value = settings.waitingCallsThreshold;
            document.getElementById('pausedAgentsThreshold').value = settings.pausedAgentsThreshold;
            document.getElementById('refreshRate').value = settings.refreshRate || 5000;
        }

        // Attempt to load last saved stats
        const data = await Utils.storage.get(['vicidialStats']);
        if (data.vicidialStats) {
            updateUI(data.vicidialStats);
        } else {
            loader.classList.remove('hidden');
            setTimeout(() => {
                if (!document.body.classList.contains('data-received')) {
                    loader.classList.add('hidden');
                    errorState.classList.remove('hidden');
                }
            }, 2500);
        }
    }

    async function handleSaveSettings() {
        const newSettings = {
            waitingCallsThreshold: parseInt(document.getElementById('waitingCallsThreshold').value),
            pausedAgentsThreshold: parseInt(document.getElementById('pausedAgentsThreshold').value),
            refreshRate: parseInt(document.getElementById('refreshRate').value)
        };
        await Utils.storage.saveSettings(newSettings);
        settings = newSettings; // Update local settings state
        
        const statusMsg = document.getElementById('settings-status');
        statusMsg.textContent = 'Settings Saved!';
        setTimeout(() => statusMsg.textContent = '', 2000);
    }

    // --- UI Update Functions ---

    function updateBackendStatusUI(status) {
        if (!elBackendStatus) return;
        elBackendStatus.className = 'status-badge'; // Reset classes
        switch (status) {
            case 'online':
                elBackendStatus.textContent = 'Online';
                elBackendStatus.classList.add('connected');
                elBackendStatus.classList.remove('disconnected');
                elBackendStatus.title = 'Backend server is running.';
                hideServerDownOverlay();
                break;
            case 'offline':
                elBackendStatus.textContent = 'Offline';
                elBackendStatus.classList.add('disconnected');
                elBackendStatus.classList.remove('connected');
                elBackendStatus.title = 'Backend server is down. Data is not being saved.';
                showServerDownOverlay();
                break;
            default: // pending
                elBackendStatus.textContent = 'Checking...';
                elBackendStatus.classList.add('disconnected');
                elBackendStatus.classList.remove('connected');
                elBackendStatus.title = 'Checking backend connection...';
                hideServerDownOverlay();
        }
    }

    function showServerDownOverlay() {
        if (serverDownState) {
            serverDownState.classList.remove('hidden');
        }
        // Also hide compact section if it exists
        if (serverStatusSection) {
            serverStatusSection.classList.add('hidden');
        }
    }

    function hideServerDownOverlay() {
        if (serverDownState) {
            serverDownState.classList.add('hidden');
        }
    }

    function updateUI(stats) {
        if (!stats || !stats.summary) return;
        document.body.classList.add('data-received');

        loader.classList.add('hidden');
        errorState.classList.add('hidden');

        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.replace('disconnected', 'connected');

        // Update all parts of the UI
        updateDashboard(stats.summary, stats.meta);
        updateAgentsList(stats.details?.agents || []);
        updateCallsList(stats.details?.waitingCalls || []);

        if (stats.timestamp) {
            elLastUpdated.textContent = `Updated: ${new Date(stats.timestamp).toLocaleTimeString()}`;
        }
    }

    function updateDashboard(summary, meta) {
        ui.active.textContent = summary.activeCalls || 0;
        ui.waiting.textContent = summary.callsWaiting || 0;
        ui.agents.textContent = summary.agentsLoggedIn || 0;
        ui.total.textContent = meta.callsToday || 0;
        ui.dropped.textContent = meta.droppedAnswered || '0%';
        ui.incall.textContent = summary.agentsInCalls || 0;
        ui.ringing.textContent = summary.ringingCalls || 0;
        ui.ivr.textContent = summary.ivrCalls || 0;
        ui.paused.textContent = summary.agentsPaused || 0;

        if (summary.callsWaiting >= settings.waitingCallsThreshold) {
            ui.waiting.parentElement.classList.add('pulse-danger');
        } else {
            ui.waiting.parentElement.classList.remove('pulse-danger');
        }
    }

    function updateAgentsList(agents = []) {
        elAgentsList.innerHTML = '';
        if (agents.length === 0) {
            elAgentsList.innerHTML = '<div class="empty-list">No agents online</div>';
            return;
        }

        agents.sort((a, b) => {
            const score = s => s.includes('INCALL') ? 3 : s.includes('READY') ? 2 : 1;
            return score(b.status) - score(a.status);
        }).forEach(agent => {
            const row = document.createElement('div');
            row.className = 'list-item';
            let statusClass = { INCALL: 'status-incall', READY: 'status-ready', PAUSED: 'status-paused' }[agent.status.split(' ')[0]] || 'status-dead';
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span class="status-indicator ${statusClass}"></span>
                    <span title="${agent.user}">${agent.user}</span>
                </div>
                <div style="font-weight:bold; font-size:10px; color:#aaa;">${agent.status}</div>
                <div>${agent.time || 'N/A'}</div>
            `;
            elAgentsList.appendChild(row);
        });
    }

    function updateCallsList(calls = []) {
        elCallsList.innerHTML = '';
        if (calls.length === 0) {
            elCallsList.innerHTML = '<div class="empty-list">No calls waiting</div>';
            return;
        }
        calls.forEach(call => {
            const row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML = `
                <div style="font-family:monospace;">${call.phone || 'N/A'}</div>
                <div>${call.campaign || 'N/A'}</div>
                <div style="color:var(--danger-color); font-weight:bold;">${call.dialtime || 'N/A'}</div>
            `;
            elCallsList.appendChild(row);
        });
    }
});

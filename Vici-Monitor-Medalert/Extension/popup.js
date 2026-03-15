// popup.js - Professional UI Logic with Tabs and Real-time Updates

document.addEventListener('DOMContentLoaded', async () => {
    // --- UI Elements ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    const loader = document.getElementById('loader');
    const errorState = document.getElementById('error-state');
    const connectionStatus = document.getElementById('connection-status');
    
    // Dashboard Stats
    const elDashActive = document.getElementById('dash-active');
    const elDashWaiting = document.getElementById('dash-waiting');
    const elDashAgents = document.getElementById('dash-agents');
    const elDashTotal = document.getElementById('dash-total');
    const elDashDropped = document.getElementById('dash-dropped');
    const elDashInCall = document.getElementById('dash-incall');
    const elDashRinging = document.getElementById('dash-ringing');
    const elDashIvr = document.getElementById('dash-ivr');
    const elDashPaused = document.getElementById('dash-paused');
    
    // Lists
    const elAgentsList = document.getElementById('agents-list');
    const elCallsList = document.getElementById('calls-list');
    
    // Meta
    const elLastUpdated = document.getElementById('last-updated');
    const elBackendStatus = document.getElementById('backend-status');
    const btnOpenDialer = document.getElementById('open-dialer-btn');

    // State
    let currentStats = null;
    let settings = await Utils.storage.loadSettings();

    // --- Initialization ---
    initTabs();
    initListeners();
    loadInitialData();
    checkBackendStatus();
    setInterval(checkBackendStatus, 30000); // Check every 30 seconds

    // --- Tab Handling ---
    function initTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked
                tab.classList.add('active');
                const targetId = `tab-${tab.dataset.tab}`;
                document.getElementById(targetId).classList.add('active');
            });
        });
    }

    // --- Listeners ---
    function initListeners() {
        // Save Settings
        const btnSave = document.getElementById('save-settings-btn');
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                const newSettings = {
                    waitingCallsThreshold: parseInt(document.getElementById('waitingCallsThreshold').value),
                    pausedAgentsThreshold: parseInt(document.getElementById('pausedAgentsThreshold').value),
                    refreshRate: parseInt(document.getElementById('refreshRate').value)
                };
        
                await Utils.storage.saveSettings(newSettings);
                
                // Show status
                const status = document.getElementById('settings-status');
                status.textContent = 'Settings saved!';
                status.style.color = '#00e676';
                setTimeout(() => status.textContent = '', 2000);
            });
        }

        // Open Dialer
        btnOpenDialer.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://axcl2s.dialerhosting.com/Xcl2s6wgd/realtime_report.php?report_display_type=HTML' });
        });

        // Listen for updates from Background/Content
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'statsUpdated') {
                updateUI(message.data);
            }
        });
    }

    // --- Data Loading ---
    async function loadInitialData() {
        try {
            // Load Settings Values into Inputs
            if (document.getElementById('waitingCallsThreshold')) {
                document.getElementById('waitingCallsThreshold').value = settings.waitingCallsThreshold;
                document.getElementById('pausedAgentsThreshold').value = settings.pausedAgentsThreshold;
                document.getElementById('refreshRate').value = settings.refreshRate || 5000;
            }

            const data = await Utils.storage.get(['vicidialStats', 'lastUpdated']);
            if (data.vicidialStats) {
                updateUI(data.vicidialStats);
            } else {
                // If no data, try to inject content script or wait
                loader.classList.remove('hidden');
                setTimeout(() => {
                    if (!currentStats) {
                        loader.classList.add('hidden');
                        errorState.classList.remove('hidden');
                    }
                }, 2000);
            }
        } catch (error) {
            Utils.error('Failed to load initial data', error);
            loader.classList.add('hidden');
            errorState.classList.remove('hidden');
        }
    }

    // --- Backend Status Check ---
    async function checkBackendStatus() {
        try {
            const response = await fetch('http://localhost:3000/');
            if (response.ok) {
                elBackendStatus.textContent = 'Running';
                elBackendStatus.classList.remove('disconnected');
                elBackendStatus.classList.add('connected');
            } else {
                throw new Error('Not OK');
            }
        } catch (error) {
            elBackendStatus.textContent = 'Down';
            elBackendStatus.classList.remove('connected');
            elBackendStatus.classList.add('disconnected');
        }
    }

    // --- UI Update Logic ---
    function updateUI(stats) {
        if (!stats || !stats.summary) return;
        
        currentStats = stats;
        
        // Hide loader/error
        loader.classList.add('hidden');
        errorState.classList.add('hidden');

        // Update Connection Status
        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.remove('disconnected');
        connectionStatus.classList.add('connected');

        // Update Dashboard
        updateDashboard(stats.summary, stats.meta);
        
        // Update Lists
        updateAgentsList(stats.details?.agents || []);
        updateCallsList(stats.details?.waitingCalls || []);

        // Update Footer
        if (stats.timestamp) {
            const date = new Date(stats.timestamp);
            elLastUpdated.textContent = `Updated: ${date.toLocaleTimeString()}`;
        }
    }

    function updateDashboard(summary, meta) {
        // Main Cards
        elDashActive.textContent = summary.activeCalls || 0;
        elDashWaiting.textContent = summary.waitingCalls || 0;
        elDashAgents.textContent = summary.agentsLoggedIn || 0;
        elDashTotal.textContent = meta.callsToday || 0;
        elDashDropped.textContent = meta.droppedAnswered || '0%';
        elDashInCall.textContent = summary.agentsInCalls || 0;

        // Mini Stats
        elDashRinging.textContent = summary.ringingCalls || 0;
        elDashIvr.textContent = summary.ivrCalls || 0;
        elDashPaused.textContent = summary.agentsPaused || 0;

        // Color coding thresholds
        if (summary.waitingCalls >= settings.waitingCallsThreshold) {
            elDashWaiting.parentElement.classList.add('pulse-danger');
        } else {
            elDashWaiting.parentElement.classList.remove('pulse-danger');
        }
    }

    function updateAgentsList(agents) {
        elAgentsList.innerHTML = '';
        
        if (!agents || agents.length === 0) {
            elAgentsList.innerHTML = '<div class="empty-list">No agents online</div>';
            return;
        }

        // Sort: In Call > Ready > Paused
        const sortedAgents = [...agents].sort((a, b) => {
            const score = (status) => {
                if (status.includes('INCALL')) return 3;
                if (status.includes('READY')) return 2;
                return 1;
            };
            return score(b.status) - score(a.status);
        });

        sortedAgents.forEach(agent => {
            const row = document.createElement('div');
            row.className = 'list-item';
            
            // Determine Status Color
            let statusClass = 'status-dead';
            if (agent.status.includes('INCALL')) statusClass = 'status-incall';
            else if (agent.status.includes('READY')) statusClass = 'status-ready';
            else if (agent.status.includes('PAUSED')) statusClass = 'status-paused';

            // Truncate User if too long
            const userDisplay = agent.user.length > 15 ? agent.user.substring(0, 15) + '...' : agent.user;

            row.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <span class="status-indicator ${statusClass}"></span>
                    <span title="${agent.user}">${userDisplay}</span>
                </div>
                <div style="font-weight:bold; font-size:10px; color:#aaa;">${agent.status}</div>
                <div style="text-align:right;">${agent.time}</div>
            `;
            elAgentsList.appendChild(row);
        });
    }

    function updateCallsList(calls) {
        elCallsList.innerHTML = '';

        if (!calls || calls.length === 0) {
            elCallsList.innerHTML = '<div class="empty-list">No calls waiting</div>';
            return;
        }

        calls.forEach(call => {
            const row = document.createElement('div');
            row.className = 'list-item';
            
            row.innerHTML = `
                <div style="font-family:monospace;">${call.phone}</div>
                <div style="font-size:10px; color:#aaa;">${call.campaign}</div>
                <div style="text-align:right; color:var(--danger-color); font-weight:bold;">${call.wait}</div>
            `;
            elCallsList.appendChild(row);
        });
    }
});

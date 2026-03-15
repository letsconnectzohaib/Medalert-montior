
// utils.js - Shared utilities for Vicidial Stats Monitor Pro

var Utils = {
    // --- Logging ---
    debugMode: false, // Default, will be overwritten by loadSettings

    log: function(message, data = null) {
        // Verbose logging disabled
    },

    error: function(message, error = null) {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[VicidialMonitor ${timestamp}] ERROR:`;
        if (error) {
            console.error(`${prefix} ${message}`, error);
        } else {
            console.error(`${prefix} ${message}`);
        }
    },

    // --- Formatting ---
    formatDuration: function(seconds) {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // --- Storage ---
    // Efficient local storage wrapper with caching
    storage: {
        cache: {},
        
        get: function(keys) {
            return new Promise((resolve) => {
                chrome.storage.local.get(keys, (result) => {
                    resolve(result);
                });
            });
        },

        set: function(data) {
            return new Promise((resolve) => {
                chrome.storage.local.set(data, () => {
                    resolve();
                });
            });
        },

        // Save settings efficiently
        saveSettings: async function(settings) {
            await this.set({ settings });
            Utils.log('Settings saved', settings);
        },

        // Load settings with defaults
        loadSettings: async function() {
            const defaults = {
                refreshRate: 5000,
                waitingCallsThreshold: 5,
                pausedAgentsThreshold: 3,
                slackWebhookUrl: 'https://hooks.slack.com/services/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',
                slackChannel: '#general',
                reportInterval: 60, // in minutes
                includeAgentStats: true,
                reportStartTime: '09:00', // Default start time
                debugMode: true
            };
            const data = await this.get(['settings']);
            const settings = { ...defaults, ...data.settings };
            
            // Sync debug mode to Utils
            Utils.debugMode = settings.debugMode;
            
            return settings;
        }
    }
};

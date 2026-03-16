const { runQuery, runSingleQuery, runExecute, runTransaction } = require('../config/database');

/**
 * Agent-related database queries
 */
const AgentQueries = {
    /**
     * Insert agent log entry
     */
    insertAgentLog: async (agentData) => {
        const {
            station, user, session, status, time, stateColor,
            pauseCode = '', campaign, calls = 0, agentGroup = ''
        } = agentData;
        
        const query = `
            INSERT INTO agent_logs (
                station, user, session, status, time, state_color,
                pause_code, campaign, calls, agent_group, shift_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
        `;
        
        const params = [
            station, user, session, status, time, stateColor,
            pauseCode, campaign, calls, agentGroup
        ];
        
        return await runExecute(query, params);
    },

    /**
     * Get current agent status
     */
    getCurrentAgents: async (shiftDate = null) => {
        const dateFilter = shiftDate || "DATE('now')";
        const query = `
            SELECT * FROM agent_logs 
            WHERE shift_date = ${dateFilter}
            ORDER BY timestamp DESC
            LIMIT 100
        `;
        
        return await runQuery(query);
    },

    /**
     * Get latest agent status by station
     */
    getLatestAgentStatus: async () => {
        const query = `
            SELECT * FROM latest_agent_status
            ORDER BY latest_timestamp DESC
        `;
        
        return await runQuery(query);
    },

    /**
     * Get agent performance for shift
     */
    getAgentPerformance: async (shiftDate = null) => {
        const dateFilter = shiftDate || "DATE('now')";
        const query = `
            SELECT 
                user,
                COUNT(*) as status_changes,
                SUM(calls) as total_calls,
                MAX(calls) as peak_calls,
                COUNT(CASE WHEN status = 'INCALL' THEN 1 END) as incall_count,
                COUNT(CASE WHEN status = 'READY' THEN 1 END) as ready_count,
                COUNT(CASE WHEN status = 'PAUSED' THEN 1 END) as paused_count
            FROM agent_logs
            WHERE shift_date = ${dateFilter}
            GROUP BY user
            ORDER BY total_calls DESC
        `;
        
        return await runQuery(query);
    }
};

/**
 * Summary statistics queries
 */
const SummaryQueries = {
    /**
     * Insert summary statistics
     */
    insertSummary: async (summaryData) => {
        const {
            activeCalls = 0, agentsLoggedIn = 0, agentsInCalls = 0, callsWaiting = 0,
            ringingCalls = 0, ivrCalls = 0, agentsPaused = 0, agentsWaiting = 0,
            agentsDispo = 0, agentsDead = 0, totalCalls = 0, droppedPercentage = '0%',
            dialLevel, dialableLeads = 0
        } = summaryData;
        
        const query = `
            INSERT INTO summary_stats (
                active_calls, agents_logged_in, agents_in_calls, calls_waiting,
                ringing_calls, ivr_calls, agents_paused, agents_waiting,
                agents_dispo, agents_dead, total_calls, dropped_percentage,
                dial_level, dialable_leads, shift_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
        `;
        
        const params = [
            activeCalls, agentsLoggedIn, agentsInCalls, callsWaiting,
            ringingCalls, ivrCalls, agentsPaused, agentsWaiting,
            agentsDispo, agentsDead, totalCalls, droppedPercentage,
            dialLevel, dialableLeads
        ];
        
        return await runExecute(query, params);
    },

    /**
     * Get latest summary
     */
    getLatestSummary: async () => {
        const query = `
            SELECT * FROM summary_stats 
            ORDER BY timestamp DESC 
            LIMIT 1
        `;
        
        return await runSingleQuery(query);
    },

    /**
     * Get summary history for time range
     */
    getSummaryHistory: async (hours = 24) => {
        const query = `
            SELECT 
                DATE(timestamp) as date,
                strftime('%H:00', timestamp) as hour,
                AVG(active_calls) as avg_active_calls,
                MAX(active_calls) as peak_active_calls,
                AVG(agents_logged_in) as avg_agents,
                AVG(calls_waiting) as avg_waiting,
                MAX(calls_waiting) as peak_waiting,
                SUM(total_calls) as total_calls
            FROM summary_stats 
            WHERE timestamp >= datetime('now', '-${hours} hours')
            GROUP BY DATE(timestamp), strftime('%H', timestamp)
            ORDER BY date DESC, hour DESC
        `;
        
        return await runQuery(query);
    },

    /**
     * Get current shift summary
     */
    getCurrentShiftSummary: async () => {
        const query = `
            SELECT * FROM current_shift_summary
            LIMIT 1
        `;
        
        return await runSingleQuery(query);
    }
};

/**
 * Waiting calls queries
 */
const WaitingCallsQueries = {
    /**
     * Insert waiting call
     */
    insertWaitingCall: async (callData) => {
        const {
            phone, campaign, status, server, dialTime, callType, priority = 0
        } = callData;
        
        const query = `
            INSERT INTO waiting_calls (
                phone, campaign, status, server, dial_time,
                call_type, priority, shift_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE('now'))
        `;
        
        const params = [phone, campaign, status, server, dialTime, callType, priority];
        
        return await runExecute(query, params);
    },

    /**
     * Get current waiting calls
     */
    getCurrentWaitingCalls: async () => {
        const query = `
            SELECT * FROM waiting_calls 
            WHERE shift_date = DATE('now')
            ORDER BY timestamp DESC
            LIMIT 50
        `;
        
        return await runQuery(query);
    },

    /**
     * Delete old waiting calls (cleanup)
     */
    cleanupOldWaitingCalls: async (hours = 24) => {
        const query = `
            DELETE FROM waiting_calls 
            WHERE timestamp < datetime('now', '-${hours} hours')
        `;
        
        return await runExecute(query);
    }
};

/**
 * Metadata queries
 */
const MetaQueries = {
    /**
     * Insert metadata
     */
    insertMetadata: async (metaData) => {
        const {
            dialLevel, dialableLeads = 0, callsToday = 0, droppedAnswered = 0
        } = metaData;
        
        const query = `
            INSERT INTO meta_data (
                dial_level, dialable_leads, calls_today, dropped_answered, shift_date
            ) VALUES (?, ?, ?, ?, DATE('now'))
        `;
        
        const params = [dialLevel, dialableLeads, callsToday, droppedAnswered];
        
        return await runExecute(query, params);
    },

    /**
     * Get latest metadata
     */
    getLatestMetadata: async () => {
        const query = `
            SELECT * FROM meta_data 
            ORDER BY timestamp DESC 
            LIMIT 1
        `;
        
        return await runSingleQuery(query);
    }
};

/**
 * Shift tracking queries
 */
const ShiftQueries = {
    /**
     * Insert or update shift log
     */
    upsertShiftLog: async (shiftData) => {
        const {
            shiftDate, shiftStart, shiftEnd, totalAgents = 0,
            peakActiveCalls = 0, totalCallsHandled = 0, averageWaitTime = 0
        } = shiftData;
        
        const query = `
            INSERT OR REPLACE INTO shift_logs (
                shift_date, shift_start, shift_end, total_agents,
                peak_active_calls, total_calls_handled, average_wait_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            shiftDate, shiftStart, shiftEnd, totalAgents,
            peakActiveCalls, totalCallsHandled, averageWaitTime
        ];
        
        return await runExecute(query, params);
    },

    /**
     * Get shift logs
     */
    getShiftLogs: async (days = 7) => {
        const query = `
            SELECT * FROM shift_logs 
            WHERE shift_date >= DATE('now', '-${days} days')
            ORDER BY shift_date DESC
        `;
        
        return await runQuery(query);
    }
};

/**
 * Analytics queries
 */
const AnalyticsQueries = {
    /**
     * Get call volume analytics
     */
    getCallVolumeAnalytics: async (timeRange = '24h') => {
        const query = `
            SELECT 
                DATE(timestamp) as date,
                strftime('%H:00', timestamp) as hour,
                AVG(active_calls) as avg_active_calls,
                MAX(active_calls) as peak_active_calls,
                AVG(agents_logged_in) as avg_agents,
                SUM(total_calls) as total_calls,
                AVG(calls_waiting) as avg_waiting_calls
            FROM summary_stats 
            WHERE timestamp >= datetime('now', '-${timeRange}')
            GROUP BY DATE(timestamp), strftime('%H', timestamp)
            ORDER BY date DESC, hour DESC
        `;
        
        return await runQuery(query);
    },

    /**
     * Get agent performance analytics
     */
    getAgentPerformanceAnalytics: async (timeRange = '24h') => {
        const query = `
            SELECT 
                user,
                COUNT(*) as status_updates,
                SUM(calls) as total_calls,
                AVG(CASE WHEN status = 'INCALL' THEN 1 ELSE 0 END) * 100 as incall_percentage,
                COUNT(CASE WHEN status = 'READY' THEN 1 END) as ready_count,
                COUNT(CASE WHEN status = 'PAUSED' THEN 1 END) as paused_count
            FROM agent_logs 
            WHERE timestamp >= datetime('now', '-${timeRange}')
            GROUP BY user
            ORDER BY total_calls DESC
            LIMIT 20
        `;
        
        return await runQuery(query);
    },

    /**
     * Get SLA metrics
     */
    getSLAMetrics: async (shiftDate = null) => {
        const dateFilter = shiftDate || "DATE('now')";
        const query = `
            SELECT 
                AVG(calls_waiting) as avg_waiting,
                MAX(calls_waiting) as peak_waiting,
                AVG(agents_in_calls) as avg_in_calls,
                AVG(agents_logged_in) as avg_logged_in,
                COUNT(*) as data_points,
                MAX(CASE WHEN calls_waiting > 5 THEN 1 ELSE 0 END) as threshold_breaches
            FROM summary_stats 
            WHERE shift_date = ${dateFilter}
        `;
        
        return await runSingleQuery(query);
    }
};

/**
 * Cleanup queries
 */
const CleanupQueries = {
    /**
     * Clean up old data
     */
    cleanupOldData: async (days = 30) => {
        const queries = [
            {
                query: 'DELETE FROM agent_logs WHERE timestamp < datetime("now", "-' + days + ' days")',
                params: []
            },
            {
                query: 'DELETE FROM summary_stats WHERE timestamp < datetime("now", "-' + days + ' days")',
                params: []
            },
            {
                query: 'DELETE FROM waiting_calls WHERE timestamp < datetime("now", "-' + days + ' days")',
                params: []
            },
            {
                query: 'DELETE FROM meta_data WHERE timestamp < datetime("now", "-' + days + ' days")',
                params: []
            }
        ];
        
        return await runTransaction(queries);
    },

    /**
     * Vacuum database to optimize performance
     */
    vacuumDatabase: async () => {
        return await runExecute('VACUUM');
    }
};

module.exports = {
    AgentQueries,
    SummaryQueries,
    WaitingCallsQueries,
    MetaQueries,
    ShiftQueries,
    AnalyticsQueries,
    CleanupQueries
};

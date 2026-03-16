// Analytics Routes
const express = require('express');
const router = express.Router();

/**
 * Get agent performance analytics
 */
router.get('/agents', async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        const hours = parseInt(timeRange.replace('h', '')) || 24;
        
        const analytics = await req.runQuery(`
            SELECT 
                user,
                COUNT(*) as status_changes,
                SUM(calls) as total_calls,
                MAX(calls) as peak_calls,
                COUNT(CASE WHEN status = 'INCALL' THEN 1 END) as incall_count,
                COUNT(CASE WHEN status = 'READY' THEN 1 END) as ready_count,
                COUNT(CASE WHEN status = 'PAUSED' THEN 1 END) as paused_count
            FROM agent_logs
            WHERE timestamp >= datetime('now', '-${hours} hours')
            GROUP BY user
            ORDER BY total_calls DESC
            LIMIT 20
        `);
        
        res.json({ 
            success: true, 
            data: analytics 
        });
    } catch (error) {
        console.error('❌ Error fetching agent analytics:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get SLA metrics
 */
router.get('/sla-metrics', async (req, res) => {
    try {
        const { shiftDate } = req.query;
        const dateFilter = shiftDate || "DATE('now')";
        
        const sla = await req.runSingleQuery(`
            SELECT 
                AVG(calls_waiting) as avg_waiting,
                MAX(calls_waiting) as peak_waiting,
                AVG(agents_in_calls) as avg_in_calls,
                AVG(agents_logged_in) as avg_logged_in,
                COUNT(*) as data_points,
                MAX(CASE WHEN calls_waiting > 5 THEN 1 ELSE 0 END) as threshold_breaches
            FROM summary_stats 
            WHERE shift_date = ${dateFilter}
        `);
        
        res.json({ 
            success: true, 
            data: sla 
        });
    } catch (error) {
        console.error('❌ Error fetching SLA metrics:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get call volume analytics
 */
router.get('/call-volume', async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        const hours = parseInt(timeRange.replace('h', '')) || 24;
        
        const analytics = await req.runQuery(`
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
        `);
        
        res.json({ 
            success: true, 
            data: analytics 
        });
    } catch (error) {
        console.error('❌ Error fetching call volume analytics:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get shift logs
 */
router.get('/shift-logs', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const logs = await req.runQuery(`
            SELECT 
                shift_date,
                COUNT(*) as total_entries,
                AVG(active_calls) as avg_active_calls,
                MAX(active_calls) as peak_active_calls,
                AVG(agents_logged_in) as avg_agents,
                AVG(calls_waiting) as avg_waiting,
                MAX(calls_waiting) as peak_waiting
            FROM summary_stats 
            WHERE shift_date >= DATE('now', '-${days} days')
            GROUP BY shift_date
            ORDER BY shift_date DESC
        `);
        
        res.json({ 
            success: true, 
            data: logs 
        });
    } catch (error) {
        console.error('❌ Error fetching shift logs:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;

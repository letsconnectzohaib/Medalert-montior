
const express = require('express');
const router = express.Router();

// GET /api/agents/realtime
// Fetches the latest status for each agent, with optional filtering
router.get('/realtime', (req, res) => {
    const { campaign, group } = req.query;
    const db = req.db;

    // This complex query does a few things:
    // 1. It groups by agent_id to handle each agent only once.
    // 2. It uses a subquery with ROW_NUMBER() to find the *most recent* log entry for each agent.
    // 3. It then joins back to the log table to get all the details for that most recent entry.
    // 4. It includes optional filtering by campaign and group if those query parameters are provided.

    let sql = `
        SELECT T.agent_id, T.agent_status, T.vicidial_state_color, T.timestamp, T.shift_date
        FROM (
            SELECT 
                agent_id, 
                agent_status, 
                vicidial_state_color,
                timestamp,
                shift_date,
                ROW_NUMBER() OVER(PARTITION BY agent_id ORDER BY timestamp DESC) as rn
            FROM agent_log
        ) T
        WHERE T.rn = 1
    `;

    const params = [];

    // The filtering logic below is not implemented as there are no campaign or group columns in the agent_log table.
    // To implement filtering, you would need to add these columns to the agent_log table and modify the query accordingly.

    // if (campaign) {
    //     sql += ' AND campaign = ?';
    //     params.push(campaign);
    // }

    // if (group) {
    //     sql += ' AND agent_group = ?'; // Assuming the column is named agent_group
    //     params.push(group);
    // }

    sql += ' ORDER BY T.agent_id;';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching real-time agent status:', err.message);
            res.status(500).json({ error: 'Failed to retrieve agent status' });
            return;
        }
        res.json(rows);
    });
});

// GET /api/agents/performance
// Fetches aggregated agent performance data over a specified date range.
router.get('/performance', (req, res) => {
    const { startDate, endDate } = req.query;
    const db = req.db;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const sql = `
        SELECT
            agent_id,
            COUNT(DISTINCT shift_date) as days_worked,
            SUM(CASE WHEN agent_status = 'PAUSED' THEN 1 ELSE 0 END) as pause_count,
            SUM(CASE WHEN agent_status = 'INCALL' THEN 1 ELSE 0 END) as incall_count
        FROM agent_log
        WHERE shift_date BETWEEN ? AND ?
        GROUP BY agent_id
        ORDER BY agent_id;
    `;

    db.all(sql, [startDate, endDate], (err, rows) => {
        if (err) {
            console.error('Error fetching agent performance:', err.message);
            res.status(500).json({ error: 'Failed to retrieve agent performance' });
            return;
        }
        res.json(rows);
    });
});

// GET /api/agents/performance/:agentId
// Fetches a detailed daily breakdown for a single agent.
router.get('/performance/:agentId', (req, res) => {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;
    const db = req.db;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const sql = `
        SELECT
            shift_date,
            agent_status,
            COUNT(*) as status_count,
            MIN(timestamp) as first_occurrence,
            MAX(timestamp) as last_occurrence
        FROM agent_log
        WHERE agent_id = ? AND shift_date BETWEEN ? AND ?
        GROUP BY shift_date, agent_status
        ORDER BY shift_date, agent_status;
    `;

    db.all(sql, [agentId, startDate, endDate], (err, rows) => {
        if (err) {
            console.error('Error fetching agent daily breakdown:', err.message);
            res.status(500).json({ error: 'Failed to retrieve agent daily breakdown' });
            return;
        }
        res.json(rows);
    });
});

module.exports = router;

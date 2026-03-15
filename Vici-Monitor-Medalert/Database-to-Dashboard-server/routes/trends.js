
const express = require('express');
const router = express.Router();

// GET /api/trends/historical/:endDate
router.get('/historical/:endDate', async (req, res) => {
    const { endDate } = req.params;
    const { campaign, group } = req.query;

    if (!endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const db = req.db;
    try {
        let sql = `
            SELECT 
                shift_date, 
                vicidial_state_color, 
                COUNT(*) as status_count
            FROM agent_log
            WHERE shift_date BETWEEN date(?, '-29 days') AND ?
              AND vicidial_state_color IS NOT NULL
        `;
        const params = [endDate, endDate];

        if (campaign) {
            sql += ' AND campaign = ?';
            params.push(campaign);
        }
        if (group) {
            sql += ' AND agent_group = ?';
            params.push(group);
        }
        sql += ' GROUP BY shift_date, vicidial_state_color ORDER BY shift_date, vicidial_state_color;';

        const rows = await db.all(sql, params);
        res.json({ success: true, data: rows });

    } catch (err) {
        console.error("Error in historical-trends endpoint:", err.message);
        res.status(500).json({ success: false, error: 'Database query for historical trends failed' });
    }
});

// GET /api/trends/heatmap/:endDate
router.get('/heatmap/:endDate', async (req, res) => {
    const { endDate } = req.params;
    const { campaign, group } = req.query;
    if (!endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const db = req.db;
    try {
        let query = `
            SELECT 
                strftime('%w', timestamp) as day_of_week, 
                strftime('%H', timestamp) as hour_of_day,
                COUNT(*) as incall_count
            FROM agent_log
            WHERE shift_date BETWEEN date(?, '-27 days') AND ?
              AND vicidial_state_color = '#d1c4e9' -- INCALL state
        `;
        const params = [endDate, endDate];

        if (campaign) {
            query += ' AND campaign = ?';
            params.push(campaign);
        }
        if (group) {
            query += ' AND agent_group = ?';
            params.push(group);
        }

        query += ' GROUP BY day_of_week, hour_of_day ORDER BY day_of_week, hour_of_day;';

        const rows = await db.all(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error("Error in heatmap-data endpoint:", err.message);
        res.status(500).json({ success: false, error: 'Database query for heatmap failed' });
    }
});

module.exports = router;


const express = require('express');
const router = express.Router();

//  GET /api/agents/performance-summary
//  Provides aggregated performance stats for all agents for a given shift.
router.get('/performance-summary/:shiftDate', (req, res) => {
  const { shiftDate } = req.params;
  const db = req.db;

  const query = `
    SELECT 
      user_name,
      COUNT(*) as total_records,
      SUM(CASE WHEN status = 'INCALL' THEN 1 ELSE 0 END) as incall_count,
      SUM(CASE WHEN status = 'PAUSED' THEN 1 ELSE 0 END) as paused_count,
      SUM(CASE WHEN status = 'DISPO' THEN 1 ELSE 0 END) as dispo_count,
      SUM(status_duration_seconds) as total_duration_seconds,
      MAX(calls_today) as max_calls_today
    FROM 
      agent_log
    WHERE 
      shift_date = ?
    GROUP BY 
      user_name
    ORDER BY 
      user_name ASC
  `;

  db.all(query, [shiftDate], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ success: false, error: 'Database query error' });
    }

    const summary = rows.map(row => ({
        id: row.user_name.replace(/\s+/g, '-').toLowerCase(), // create a stable id
        name: row.user_name,
        calls: row.max_calls_today,
        // Assuming each record is a snapshot, we can approximate time spent.
        // This needs a better calculation based on snapshot frequency.
        hours: (row.total_duration_seconds / 3600).toFixed(2),
        avgCallTime: ((row.total_duration_seconds / row.max_calls_today) / 60).toFixed(2),
        occupancy: ((row.incall_count / row.total_records) * 100).toFixed(2)
    }));

    res.json({ success: true, data: summary });
  });
});

module.exports = router;

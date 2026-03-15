
const express = require('express');
const router = express.Router();

// A reusable utility to promisify database calls for clean async/await syntax.
const dbAll = (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err.message);
        reject(new Error('Failed to execute database query.'));
      } else {
        resolve(rows);
      }
    });
  });
};

// GET /api/agents/realtime - SECURE & ROBUST
router.get('/realtime', async (req, res) => {
  const { campaign, group } = req.query;
  const db = req.db;

  const params = [];
  let filterQuery = '';

  // Securely build the subquery filter
  if (campaign || group) {
    const filterClauses = [];
    if (campaign) {
        filterClauses.push('campaign = ?');
        params.push(campaign);
    }
    if (group) {
        filterClauses.push('agent_group = ?'); // Standardize column name
        params.push(group);
    }
    if(filterClauses.length > 0) {
        filterQuery = `WHERE ${filterClauses.join(' AND ')}`;
    }
  }

  const sql = `
    SELECT T.agent_id, T.agent_status, T.vicidial_state_color, T.timestamp
    FROM (
        SELECT 
            agent_id, 
            agent_status, 
            vicidial_state_color,
            timestamp,
            ROW_NUMBER() OVER(PARTITION BY agent_id ORDER BY timestamp DESC) as rn
        FROM agent_log
        ${filterQuery}
    ) T
    WHERE T.rn = 1
    ORDER BY T.agent_id;
  `;

  try {
    // QA FIX: The frontend expects a direct array, not a nested object.
    const rows = await dbAll(db, sql, params);
    res.json(rows); // Return the array directly

  } catch (error) {
    // QA FIX: Standardize error format
    res.status(500).json({ success: false, error: 'Failed to retrieve real-time agent status.' });
  }
});

// GET /api/agents/performance - SECURE & ROBUST
router.get('/performance', async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing date format. Use YYYY-MM-DD for both startDate and endDate.' });
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

  try {
    const rows = await dbAll(req.db, sql, [startDate, endDate]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve agent performance.' });
  }
});

// GET /api/agents/performance/:agentId - SECURE & ROBUST
router.get('/performance/:agentId', async (req, res) => {
  const { agentId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing date format. Use YYYY-MM-DD for both startDate and endDate.' });
  }
  
  const sql = `
    SELECT
        shift_date,
        agent_status,
        vicidial_state_color,
        COUNT(*) as status_count,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence
    FROM agent_log
    WHERE agent_id = ? AND shift_date BETWEEN ? AND ?
    GROUP BY shift_date, agent_status, vicidial_state_color
    ORDER BY shift_date, agent_status;
  `;

  try {
    const rows = await dbAll(req.db, sql, [agentId, startDate, endDate]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve agent daily breakdown.' });
  }
});

module.exports = router;

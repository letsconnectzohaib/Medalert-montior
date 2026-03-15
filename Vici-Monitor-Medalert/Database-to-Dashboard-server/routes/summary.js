
const express = require('express');
const router = express.Router();

// Base GET /api/summary?shiftDate=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { shiftDate, campaign, group } = req.query;
  if (!shiftDate || !shiftDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing date format. Use YYYY-MM-DD.' });
  }

  const db = req.db;
  let filterClause = '';
  const filterParams = [shiftDate];
  if (campaign) {
      filterClause += ' AND campaign = ?';
      filterParams.push(campaign);
  }
  if (group) {
      filterClause += ' AND agent_group = ?';
      filterParams.push(group);
  }

  try {
    // Example of a summary query - adapt this to your needs
    const summaryQuery = `
        SELECT 
            COUNT(DISTINCT user) as total_agents,
            SUM(CASE WHEN status = 'PAUSED' THEN 1 ELSE 0 END) as paused_agents,
            SUM(CASE WHEN status = 'INCALL' THEN 1 ELSE 0 END) as incall_agents,
            SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as waiting_agents,
            (SELECT COUNT(*) FROM vicidial_log WHERE call_date LIKE ? || '%') as total_calls
        FROM agent_log 
        WHERE shift_date = ? ${filterClause}
    `;
    
    // Note: The total_calls subquery might need adjustment based on your schema and needs
    const summaryData = await db.get(summaryQuery, [shiftDate, ...filterParams]);
    res.json({ success: true, data: summaryData });

  } catch (err) {
      console.error("Error in base summary endpoint:", err.message);
      res.status(500).json({ success: false, error: 'Database query for summary failed' });
  }
});

module.exports = router;

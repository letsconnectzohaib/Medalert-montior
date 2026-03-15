
const express = require('express');
const router = express.Router();

// GET /api/summary?shiftDate=YYYY-MM-DD
// Securely fetches a summary of agent activity for a given date, with optional filters.
router.get('/', async (req, res) => {
  const { shiftDate, campaign, group } = req.query;

  // 1. Validate Input
  if (!shiftDate || !shiftDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing date format. Use YYYY-MM-DD.' });
  }

  const db = req.db;
  const params = [shiftDate];
  const filterClauses = [];

  // 2. Securely Build Filter Query
  // Each parameter is added to the `params` array, not concatenated into the string.
  if (campaign) {
    filterClauses.push('campaign = ?');
    params.push(campaign);
  }
  if (group) {
    // Assuming the column is 'user_group'. This prevents injection on the column name itself.
    filterClauses.push('user_group = ?');
    params.push(group);
  }

  // Combine filter clauses safely
  const filterQuery = filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      agent_status, 
      vicidial_state_color,
      COUNT(*) as status_count
    FROM agent_log 
    WHERE shift_date = ? ${filterQuery}
    GROUP BY agent_status, vicidial_state_color
    ORDER BY status_count DESC;
  `;

  // 3. Execute Query with Consistent Async/Await and Error Handling
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          // On failure, reject the promise with the error
          reject(err);
        } else {
          // On success, resolve the promise with the data
          resolve(rows);
        }
      });
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Database query failed:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve summary data.' });
  }
});

module.exports = router;

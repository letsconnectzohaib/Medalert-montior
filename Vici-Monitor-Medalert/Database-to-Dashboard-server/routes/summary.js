
const express = require('express');
const router = express.Router();

// A reusable database query function with async/await and standardized error handling
const queryDatabase = (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err.message);
        // Reject with a standardized error object
        reject({ status: 500, error: 'Database query failed.' });
      } else {
        resolve(rows);
      }
    });
  });
};


// GET /api/summary?shiftDate=YYYY-MM-DD
// Fetches a summary of agent activity with standardized API responses.
router.get('/', async (req, res) => {
  const { shiftDate, campaign, group } = req.query;

  // Input Validation
  if (!shiftDate || !shiftDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Standardized error response
    return res.status(400).json({ success: false, error: 'Invalid or missing date format. Use YYYY-MM-DD.' });
  }

  const params = [shiftDate];
  const filterClauses = [];

  // Securely build query filters
  if (campaign) {
    filterClauses.push('campaign = ?');
    params.push(campaign);
  }
  if (group) {
    // QA Finding: Standardize column name usage
    filterClauses.push('agent_group = ?'); // Use 'agent_group' consistently
    params.push(group);
  }

  const filterQuery = filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : '';

  // The SQL query is unchanged, but the execution is now wrapped
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

  try {
    const rows = await queryDatabase(req.db, sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    // Use the standardized error format from the rejection
    const { status = 500, error = 'An unknown error occurred.' } = err;
    res.status(status).json({ success: false, error });
  }
});

module.exports = router;

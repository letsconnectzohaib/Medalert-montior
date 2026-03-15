
const express = require('express');
const router = express.Router();

// GET /api/summary/hourly-breakdown/:shiftDate
// Provides a count of agent statuses, grouped by hour, for a specific shift date.
// This is crucial for visualizing the "flow" of a shift.
router.get('/hourly-breakdown/:shiftDate', (req, res) => {
  const { shiftDate } = req.params;
  const db = req.db;

  // This SQL query is the heart of the feature.
  // 1. It casts the timestamp to a string to extract the hour ('%H').
  // 2. It filters by the selected shift_date.
  // 3. It groups by the hour and the state color.
  // 4. It counts the records in each group.
  const query = `
    SELECT 
      strftime('%H', timestamp) as hour_of_day,
      vicidial_state_color,
      COUNT(*) as status_count
    FROM 
      agent_log
    WHERE 
      shift_date = ? 
      AND vicidial_state_color IS NOT NULL
    GROUP BY 
      hour_of_day, 
      vicidial_state_color
    ORDER BY 
      hour_of_day, 
      vicidial_state_color;
  `;

  db.all(query, [shiftDate], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ success: false, error: 'Database query error' });
    }

    // The query gives us a list of counts. We need to restructure it
    // into a format that's easy for charts to use.
    const hourlyData = {};
    rows.forEach(row => {
      const hour = row.hour_of_day;
      if (!hourlyData[hour]) {
        hourlyData[hour] = { hour: hour };
      }
      // E.g., { hour: '19', '#d1c4e9': 15, '#b39ddb': 5 }
      hourlyData[hour][row.vicidial_state_color] = row.status_count;
    });

    // Convert the object to a sorted array for the frontend
    const results = Object.values(hourlyData).sort((a, b) => a.hour.localeCompare(b.hour));

    res.json({ success: true, data: results });
  });
});

module.exports = router;

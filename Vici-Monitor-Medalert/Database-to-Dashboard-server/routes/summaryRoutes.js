
const express = require('express');
const router = express.Router();

// A helper to get the date for the previous day in YYYY-MM-DD format
const getPreviousDay = (dateString) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

// A helper to get the date strings for the last 7 days
const getLast7Days = (dateString) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(dateString);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// GET /api/summary/analytical-breakdown/:shiftDate
// This is a powerful, all-in-one endpoint for the main analytical chart.
router.get('/analytical-breakdown/:shiftDate', async (req, res) => {
  const { shiftDate } = req.params;
  if (!shiftDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const db = req.db;
  
  try {
    // --- 1. Main Hourly Breakdown for the selected date ---
    const hourlyQuery = `
        SELECT strftime('%H', timestamp) as hour, vicidial_state_color, COUNT(*) as count
        FROM agent_log WHERE shift_date = ? AND vicidial_state_color IS NOT NULL
        GROUP BY hour, vicidial_state_color ORDER BY hour;
    `;
    const hourlyRows = await db.all(hourlyQuery, [shiftDate]);

    // --- 2. Hourly Breakdown for the PREVIOUS day for comparison ---
    const prevDay = getPreviousDay(shiftDate);
    const prevDayRows = await db.all(hourlyQuery, [prevDay]);

    // --- 3. Weekly Average Calculation ---
    const last7Days = getLast7Days(shiftDate);
    const placeholders = last7Days.map(() => '?').join(',');
    const weeklyAvgQuery = `
        SELECT strftime('%H', timestamp) as hour, vicidial_state_color, COUNT(*) as total_count,
               COUNT(DISTINCT shift_date) as num_days
        FROM agent_log WHERE shift_date IN (${placeholders}) AND vicidial_state_color IS NOT NULL
        GROUP BY hour, vicidial_state_color ORDER BY hour;
    `;
    const weeklyAvgRows = await db.all(weeklyAvgQuery, last7Days);

    // --- 4. Find the "Best Hour" (most INCALL records) ---
    const bestHourQuery = `
        SELECT strftime('%H', timestamp) as hour, COUNT(*) as incall_count
        FROM agent_log WHERE shift_date = ? AND vicidial_state_color = '#d1c4e9'
        GROUP BY hour ORDER BY incall_count DESC LIMIT 1;
    `;
    const bestHourRow = await db.get(bestHourQuery, [shiftDate]);

    // --- 5. Data Processing and Structuring ---
    const processRows = (rows) => {
      const data = {};
      rows.forEach(row => {
        if (!data[row.hour]) data[row.hour] = { hour: row.hour };
        data[row.hour][row.vicidial_state_color] = row.count;
      });
      return Object.values(data).sort((a, b) => a.hour.localeCompare(b.hour));
    };
    
    const processWeeklyRows = (rows) => {
        const data = {};
        rows.forEach(row => {
            if (!data[row.hour]) data[row.hour] = { hour: row.hour };
            // Calculate the average for the specific status on that hour
            data[row.hour][`${row.vicidial_state_color}_avg`] = parseFloat((row.total_count / row.num_days).toFixed(2));
        });
        return Object.values(data).sort((a, b) => a.hour.localeCompare(b.hour));
    };

    const response = {
        hourlyBreakdown: processRows(hourlyRows),
        previousDayBreakdown: processRows(prevDayRows),
        weeklyAverage: processWeeklyRows(weeklyAvgRows),
        bestHour: bestHourRow || null,
    };

    res.json({ success: true, data: response });

  } catch (err) {
    console.error("Error in analytical-breakdown endpoint:", err.message);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// A promisify wrapper for db.all to use with async/await
db.all = function (sql, params) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// A promisify wrapper for db.get
db.get = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = router;

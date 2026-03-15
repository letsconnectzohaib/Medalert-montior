
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
router.get('/analytical-breakdown/:shiftDate', async (req, res) => {
  const { shiftDate } = req.params;
  if (!shiftDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const db = req.db;
  
  try {
    const hourlyQuery = `
        SELECT strftime('%H', timestamp) as hour, vicidial_state_color, COUNT(*) as count
        FROM agent_log WHERE shift_date = ? AND vicidial_state_color IS NOT NULL
        GROUP BY hour, vicidial_state_color ORDER BY hour;
    `;
    const prevDay = getPreviousDay(shiftDate);
    const last7Days = getLast7Days(shiftDate);
    const placeholders = last7Days.map(() => '?').join(',');
    const weeklyAvgQuery = `
        SELECT strftime('%H', timestamp) as hour, vicidial_state_color, COUNT(*) as total_count,
               COUNT(DISTINCT shift_date) as num_days
        FROM agent_log WHERE shift_date IN (${placeholders}) AND vicidial_state_color IS NOT NULL
        GROUP BY hour, vicidial_state_color ORDER BY hour;
    `;
    const bestHourQuery = `
        SELECT strftime('%H', timestamp) as hour, COUNT(*) as incall_count
        FROM agent_log WHERE shift_date = ? AND vicidial_state_color = '#d1c4e9'
        GROUP BY hour ORDER BY incall_count DESC LIMIT 1;
    `;

    const [hourlyRows, prevDayRows, weeklyAvgRows, bestHourRow] = await Promise.all([
        db.all(hourlyQuery, [shiftDate]),
        db.all(hourlyQuery, [prevDay]),
        db.all(weeklyAvgQuery, last7Days),
        db.get(bestHourQuery, [shiftDate])
    ]);

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
            data[row.hour][`${row.vicidial_state_color}_avg`] = parseFloat((row.total_count / row.num_days).toFixed(2));
        });
        return Object.values(data).sort((a, b) => a.hour.localeCompare(b.hour));
    };

    res.json({ success: true, data: {
        hourlyBreakdown: processRows(hourlyRows),
        previousDayBreakdown: processRows(prevDayRows),
        weeklyAverage: processWeeklyRows(weeklyAvgRows),
        bestHour: bestHourRow || null,
    } });

  } catch (err) {
    console.error("Error in analytical-breakdown endpoint:", err.message);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// GET /api/summary/historical-trends/:endDate
router.get('/historical-trends/:endDate', async (req, res) => {
    const { endDate } = req.params;
    // ... (implementation in previous turn)
});

// GET /api/summary/heatmap-data/:endDate
// Provides data for the weekly activity heatmap (hour vs. day of week).
router.get('/heatmap-data/:endDate', async (req, res) => {
    const { endDate } = req.params;
    if (!endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const db = req.db;
    try {
        // Query for the last 4 weeks of data, focusing on INCALL state
        const query = `
            SELECT 
                strftime('%w', timestamp) as day_of_week, -- 0=Sun, 1=Mon, ...
                strftime('%H', timestamp) as hour_of_day,
                COUNT(*) as incall_count
            FROM agent_log
            WHERE shift_date BETWEEN date(?, '-27 days') AND ?
              AND vicidial_state_color = '#d1c4e9' -- INCALL state
            GROUP BY day_of_week, hour_of_day
            ORDER BY day_of_week, hour_of_day;
        `;
        const rows = await db.all(query, [endDate, endDate]);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error("Error in heatmap-data endpoint:", err.message);
        res.status(500).json({ success: false, error: 'Database query for heatmap failed' });
    }
});


// --- Promisify Database Functions for Async/Await ---
db.all = function (sql, params) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

db.get = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = router;

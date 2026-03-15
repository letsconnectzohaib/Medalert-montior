
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'vicidial_stats.db');

// --- Configurable Shift Settings ---
let shiftSettings = {
  TIMEZONE: 'Asia/Karachi', // PKT
  SHIFT_START_HOUR: 19, // 7:00 PM
  SHIFT_START_MINUTE: 0,
  SHIFT_END_HOUR: 4, // 4:00 AM
  SHIFT_END_MINUTE: 30,
};


app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('Error opening database:', err);
  else console.log('Connected to SQLite database');
});

// --- Business Logic for Shifts ---
function getShiftDate(timestamp) {
    const date = new Date(timestamp);

    //This is a simple example, in a real-world scenario you would use a robust library like date-fns-tz or luxon for this
    const localHour = date.getUTCHours() + 5; // Simple approximation for PKT (UTC+5)
    const localMinute = date.getUTCMinutes();

    // If the time is before the end of the shift (e.g., before 4:30 AM), it belongs to the previous day's shift
    if (localHour < shiftSettings.SHIFT_END_HOUR || (localHour === shiftSettings.SHIFT_END_HOUR && localMinute < shiftSettings.SHIFT_END_MINUTE)) {
        date.setDate(date.getDate() - 1);
    }

    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
}


async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS summary_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME, shift_date TEXT, activeCalls INTEGER,
                agentsLoggedIn INTEGER, agentsInCalls INTEGER, callsWaiting INTEGER, dialLevel TEXT, dialableLeads INTEGER
            )`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_summary_shift_date ON summary_log(shift_date)`);

      db.run(`CREATE TABLE IF NOT EXISTS agent_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME, shift_date TEXT, station TEXT, user_name TEXT, status TEXT,
                status_duration_seconds INTEGER, vicidial_state_color TEXT, campaign TEXT, calls_today INTEGER
            )`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_agent_shift_date ON agent_log(shift_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_agent_user_shift ON agent_log(user_name, shift_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_agent_color_shift ON agent_log(vicidial_state_color, shift_date)`);

      db.run(`CREATE TABLE IF NOT EXISTS waiting_calls_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME, shift_date TEXT, campaign TEXT, dial_time_seconds INTEGER
            )`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_waiting_shift_date ON waiting_calls_log(shift_date)`);

      db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY, value TEXT
            )`, (err) => {
                if (!err) {
                    // Populate with default settings if table is new
                    const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
                    Object.entries(shiftSettings).forEach(([key, value]) => stmt.run(key, String(value)));
                    stmt.finalize();
                }
            });
      resolve();
    });
  });
}

function loadSettings() {
    return new Promise((resolve) => {
        db.all("SELECT key, value FROM settings", [], (err, rows) => {
            if (!err && rows.length) {
                const loadedSettings = rows.reduce((acc, row) => ({...acc, [row.key]: row.value }), {});
                shiftSettings = {
                    ...shiftSettings,
                    ...loadedSettings,
                    SHIFT_START_HOUR: parseInt(loadedSettings.SHIFT_START_HOUR),
                    SHIFT_START_MINUTE: parseInt(loadedSettings.SHIFT_START_MINUTE),
                    SHIFT_END_HOUR: parseInt(loadedSettings.SHIFT_END_HOUR),
                    SHIFT_END_MINUTE: parseInt(loadedSettings.SHIFT_END_MINUTE),
                };
                console.log("Shift settings loaded from database:", shiftSettings);
            }
            resolve();
        });
    });
}

// --- API Endpoints ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/api/logs', (req, res) => {
  const data = req.body;
  const timestamp = data.timestamp || new Date().toISOString();
  const calculatedShiftDate = getShiftDate(timestamp);

  const { summary = {}, details = { agents: [], waitingCalls: [] } } = data;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
        const summaryStmt = db.prepare(`INSERT INTO summary_log (timestamp, shift_date, activeCalls, agentsLoggedIn, agentsInCalls, callsWaiting, dialLevel, dialableLeads) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        summaryStmt.run(timestamp, calculatedShiftDate, summary.activeCalls, summary.agentsLoggedIn, summary.agentsInCalls, summary.callsWaiting, data.meta?.dialLevel, data.meta?.dialableLeads);
        summaryStmt.finalize();

        const agentStmt = db.prepare(`INSERT INTO agent_log (timestamp, shift_date, station, user_name, status, status_duration_seconds, vicidial_state_color, campaign, calls_today) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        details.agents.forEach(agent => {
            const durationParts = String(agent.time || '0:0').split(':');
            const durationSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
            agentStmt.run(timestamp, calculatedShiftDate, agent.station, agent.user, agent.status, durationSeconds, agent.stateColor, agent.campaign, agent.calls);
        });
        agentStmt.finalize();

        const waitingStmt = db.prepare(`INSERT INTO waiting_calls_log (timestamp, shift_date, campaign, dial_time_seconds) VALUES (?, ?, ?, ?)`);
        details.waitingCalls.forEach(call => {
            const durationParts = String(call.dialtime || '0:0').split(':');
            const durationSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
            waitingStmt.run(timestamp, calculatedShiftDate, call.campaign, durationSeconds);
        });
        waitingStmt.finalize();

        db.run('COMMIT');
        res.json({ success: true });
    } catch (error) {
        db.run('ROLLBACK');
        res.status(500).json({ success: false, error: error.message });
    }
  });
});

app.get('/api/agent_log/by_shift/:shiftDate', (req, res) => {
    const { shiftDate } = req.params;
    db.all("SELECT * FROM agent_log WHERE shift_date = ? ORDER BY timestamp ASC", [shiftDate], (err, rows) => {
        if (err) res.status(500).json({ success: false, error: err.message });
        else res.json({ success: true, data: rows });
    });
});

// --- Server Start ---
async function startServer() {
  try {
    await initializeDatabase();
    await loadSettings();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

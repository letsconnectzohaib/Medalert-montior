const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'vicidial_stats.db');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Initialize SQLite database
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create tables and indexes (synchronous approach)
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Main stats table
            db.run(`CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                activeCalls INTEGER DEFAULT 0,
                ringingCalls INTEGER DEFAULT 0,
                waitingCalls INTEGER DEFAULT 0,
                ivrCalls INTEGER DEFAULT 0,
                agentsLoggedIn INTEGER DEFAULT 0,
                agentsInCalls INTEGER DEFAULT 0,
                agentsWaiting INTEGER DEFAULT 0,
                agentsPaused INTEGER DEFAULT 0,
                agentsDead INTEGER DEFAULT 0,
                agentsDispo INTEGER DEFAULT 0,
                dialLevel TEXT,
                dialableLeads INTEGER DEFAULT 0,
                callsToday INTEGER DEFAULT 0,
                droppedAnswered TEXT,
                avgAgents INTEGER DEFAULT 0,
                dialMethod TEXT,
                raw_data TEXT
            )`, (err) => {
                if (err) return reject(err);
                
                // Create indexes for performance
                db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON stats(timestamp)`, (err) => {
                    if (err) return reject(err);
                    
                    db.run(`CREATE INDEX IF NOT EXISTS idx_date_bucket ON stats(date(timestamp))`, (err) => {
                        if (err) return reject(err);
                        
                        db.run(`CREATE INDEX IF NOT EXISTS idx_hour_bucket ON stats(strftime('%Y-%m-%d %H', timestamp))`, (err) => {
                            if (err) return reject(err);
                            
                            console.log('Database initialized with tables and indexes');
                            resolve();
                        });
                    });
                });
            });
        });
    });
}

// Endpoint to receive logs from extension
app.post('/api/logs', async (req, res) => {
    try {
        const data = req.body;
        const summary = data.summary || {};
        const meta = data.meta || {};
        
        // Insert into SQLite database
        const stmt = db.prepare(`
            INSERT INTO stats (
                timestamp, activeCalls, ringingCalls, waitingCalls, ivrCalls,
                agentsLoggedIn, agentsInCalls, agentsWaiting, agentsPaused,
                agentsDead, agentsDispo, dialLevel, dialableLeads, callsToday,
                droppedAnswered, avgAgents, dialMethod, raw_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            data.timestamp || new Date().toISOString(),
            summary.activeCalls || 0,
            summary.ringingCalls || 0,
            summary.waitingCalls || 0,
            summary.ivrCalls || 0,
            summary.agentsLoggedIn || 0,
            summary.agentsInCalls || 0,
            summary.agentsWaiting || 0,
            summary.agentsPaused || 0,
            summary.agentsDead || 0,
            summary.agentsDispo || 0,
            meta.dialLevel || null,
            meta.dialableLeads || 0,
            meta.callsToday || 0,
            meta.droppedAnswered || null,
            meta.avgAgents || 0,
            meta.dialMethod || null,
            JSON.stringify(data)
        );
        
        stmt.finalize();
        
        console.log(`[${new Date().toISOString()}] Stats inserted into database`);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error inserting into database:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET endpoint for raw stats data
app.get('/api/stats', (req, res) => {
    try {
        const { start, end, limit = 1000, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM stats';
        let params = [];
        
        if (start || end) {
            query += ' WHERE';
            const conditions = [];
            
            if (start) {
                conditions.push(' timestamp >= ?');
                params.push(start);
            }
            if (end) {
                conditions.push(' timestamp <= ?');
                params.push(end);
            }
            
            query += conditions.join(' AND');
        }
        
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching stats:', err);
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({ success: true, data: rows });
            }
        });
        
    } catch (error) {
        console.error('Error in /api/stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET endpoint for hourly aggregated data
app.get('/api/stats/hourly', (req, res) => {
    try {
        const { start, end } = req.query;
        
        let query = `
            SELECT 
                strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
                AVG(activeCalls) as avg_active_calls,
                MAX(activeCalls) as max_active_calls,
                MIN(activeCalls) as min_active_calls,
                AVG(agentsLoggedIn) as avg_agents_logged_in,
                AVG(waitingCalls) as avg_waiting_calls,
                COUNT(*) as data_points
            FROM stats
        `;
        
        let params = [];
        
        if (start || end) {
            query += ' WHERE';
            const conditions = [];
            
            if (start) {
                conditions.push(' timestamp >= ?');
                params.push(start);
            }
            if (end) {
                conditions.push(' timestamp <= ?');
                params.push(end);
            }
            
            query += conditions.join(' AND');
        }
        
        query += ' GROUP BY hour ORDER BY hour DESC';
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching hourly stats:', err);
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({ success: true, data: rows });
            }
        });
        
    } catch (error) {
        console.error('Error in /api/stats/hourly:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET endpoint for daily aggregated data
app.get('/api/stats/daily', (req, res) => {
    try {
        const { start, end } = req.query;
        
        let query = `
            SELECT 
                date(timestamp) as day,
                AVG(activeCalls) as avg_active_calls,
                MAX(activeCalls) as max_active_calls,
                MIN(activeCalls) as min_active_calls,
                AVG(agentsLoggedIn) as avg_agents_logged_in,
                AVG(waitingCalls) as avg_waiting_calls,
                COUNT(*) as data_points
            FROM stats
        `;
        
        let params = [];
        
        if (start || end) {
            query += ' WHERE';
            const conditions = [];
            
            if (start) {
                conditions.push(' timestamp >= ?');
                params.push(start);
            }
            if (end) {
                conditions.push(' timestamp <= ?');
                params.push(end);
            }
            
            query += conditions.join(' AND');
        }
        
        query += ' GROUP BY day ORDER BY day DESC';
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching daily stats:', err);
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({ success: true, data: rows });
            }
        });
        
    } catch (error) {
        console.error('Error in /api/stats/daily:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Vicidial Monitor Backend is running. Send POST requests to /api/logs and GET requests to /api/stats');
});

// Start server with database initialization
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Database file: ${DB_FILE}`);
            console.log('Available endpoints:');
            console.log('  POST /api/logs - Insert stats from extension');
            console.log('  GET  /api/stats - Get raw stats with pagination');
            console.log('  GET  /api/stats/hourly - Get hourly aggregated stats');
            console.log('  GET  /api/stats/daily - Get daily aggregated stats');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

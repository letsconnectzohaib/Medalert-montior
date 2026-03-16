const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Check for verbose flag
const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');

// Minimal logging function
function log(message, forceVerbose = false) {
    if (isVerbose || forceVerbose) {
        console.log(message);
    }
}

// Database path
const DB_PATH = path.join(__dirname, '..', 'shared-database', 'database', 'vicidial_monitor.db');

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

// Database connection
let db;

// Rotating emojis for data received messages
let emojiIndex = 0;
const dataEmojis = ['📥', '📊', '🔄', '💾', '📈', '🌐', '⚡', '🎯'];

function getNextDataEmoji() {
    const emoji = dataEmojis[emojiIndex];
    emojiIndex = (emojiIndex + 1) % dataEmojis.length;
    return emoji;
}

/**
 * Initialize database and create tables
 */
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        // Ensure database directory exists
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                log('✅ Connected to SQLite database', true);
                createTables()
                    .then(() => resolve())
                    .catch(reject);
            }
        });
    });
}

/**
 * Create database tables
 */
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Agent Logs Table
            db.run(`CREATE TABLE IF NOT EXISTS agent_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                station TEXT NOT NULL,
                user TEXT NOT NULL,
                session TEXT,
                status TEXT NOT NULL,
                time TEXT,
                state_color TEXT,
                pause_code TEXT DEFAULT '',
                campaign TEXT,
                calls INTEGER DEFAULT 0,
                agent_group TEXT,
                shift_date DATE DEFAULT (DATE('now')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Summary Stats Table
            db.run(`CREATE TABLE IF NOT EXISTS summary_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                active_calls INTEGER DEFAULT 0,
                agents_logged_in INTEGER DEFAULT 0,
                agents_in_calls INTEGER DEFAULT 0,
                calls_waiting INTEGER DEFAULT 0,
                ringing_calls INTEGER DEFAULT 0,
                ivr_calls INTEGER DEFAULT 0,
                agents_paused INTEGER DEFAULT 0,
                agents_waiting INTEGER DEFAULT 0,
                agents_dispo INTEGER DEFAULT 0,
                agents_dead INTEGER DEFAULT 0,
                total_calls INTEGER DEFAULT 0,
                dropped_percentage TEXT DEFAULT '0%',
                dial_level TEXT,
                dialable_leads INTEGER DEFAULT 0,
                shift_date DATE DEFAULT (DATE('now')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Waiting Calls Table
            db.run(`CREATE TABLE IF NOT EXISTS waiting_calls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                phone TEXT,
                campaign TEXT,
                status TEXT,
                server TEXT,
                dial_time TEXT,
                call_type TEXT,
                priority INTEGER DEFAULT 0,
                shift_date DATE DEFAULT (DATE('now')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Meta Data Table
            db.run(`CREATE TABLE IF NOT EXISTS meta_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                dial_level TEXT,
                dialable_leads INTEGER DEFAULT 0,
                calls_today INTEGER DEFAULT 0,
                dropped_answered INTEGER DEFAULT 0,
                shift_date DATE DEFAULT (DATE('now')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    log('✅ Database tables created successfully', true);
                    resolve();
                }
            });
        });
    });
}

// --- Business Logic for Shifts ---
function getShiftDate(timestamp) {
    const date = new Date(timestamp);
    
    // Simple approximation for PKT (UTC+5)
    const localHour = date.getUTCHours() + 5;
    const localMinute = date.getUTCMinutes();

    // If time is before end of shift (e.g., before 4:30 AM), it belongs to previous day's shift
    if (localHour < shiftSettings.SHIFT_END_HOUR || 
        (localHour === shiftSettings.SHIFT_END_HOUR && localMinute < shiftSettings.SHIFT_END_MINUTE)) {
        date.setDate(date.getDate() - 1);
    }

    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
}

/**
 * Save extension data to database
 */
async function saveExtensionData(data) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();
        const shiftDate = getShiftDate(timestamp);
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Insert summary statistics
            if (data.summary) {
                const summaryQuery = `
                    INSERT INTO summary_stats (
                        active_calls, agents_logged_in, agents_in_calls, calls_waiting,
                        ringing_calls, ivr_calls, agents_paused, agents_waiting,
                        agents_dispo, agents_dead, total_calls, dropped_percentage,
                        dial_level, dialable_leads, shift_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const summaryParams = [
                    data.summary.activeCalls || 0,
                    data.summary.agentsLoggedIn || 0,
                    data.summary.agentsInCalls || 0,
                    data.summary.callsWaiting || 0,
                    data.details?.ringingCalls || 0,
                    data.details?.ivrCalls || 0,
                    data.details?.agentsPaused || 0,
                    data.details?.agentsWaiting || 0,
                    data.details?.agentsDispo || 0,
                    data.details?.agentsDead || 0,
                    data.meta?.callsToday || 0,
                    data.meta?.droppedAnswered || '0%',
                    data.meta?.dialLevel,
                    data.meta?.dialableLeads || 0,
                    shiftDate
                ];
                
                db.run(summaryQuery, summaryParams);
            }

            // Insert agent logs
            if (data.details && data.details.agents && Array.isArray(data.details.agents)) {
                const agentQuery = `
                    INSERT INTO agent_logs (
                        station, user, session, status, time, state_color,
                        pause_code, campaign, calls, agent_group, shift_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const agentStmt = db.prepare(agentQuery);
                
                for (const agent of data.details.agents) {
                    agentStmt.run([
                        agent.station || '',
                        agent.user || '',
                        agent.session || '',
                        agent.status || '',
                        agent.time || '',
                        agent.stateColor || '',
                        agent.pauseCode || '',
                        agent.campaign || '',
                        agent.calls || 0,
                        agent.group || '',
                        shiftDate
                    ]);
                }
                
                agentStmt.finalize();
            }

            // Insert waiting calls
            if (data.details && data.details.waitingCalls && Array.isArray(data.details.waitingCalls)) {
                const callQuery = `
                    INSERT INTO waiting_calls (
                        phone, campaign, status, server, dial_time,
                        call_type, priority, shift_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const callStmt = db.prepare(callQuery);
                
                for (const call of data.details.waitingCalls) {
                    callStmt.run([
                        call.phone || '',
                        call.campaign || '',
                        call.status || '',
                        call.server || '',
                        call.dialtime || '',
                        call.callType || '',
                        call.priority || 0,
                        shiftDate
                    ]);
                }
                
                callStmt.finalize();
            }

            // Insert metadata
            if (data.meta) {
                const metaQuery = `
                    INSERT INTO meta_data (
                        dial_level, dialable_leads, calls_today, dropped_answered, shift_date
                    ) VALUES (?, ?, ?, ?, ?)
                `;
                
                const metaParams = [
                    data.meta.dialLevel,
                    data.meta.dialableLeads || 0,
                    data.meta.callsToday || 0,
                    data.meta.droppedAnswered || 0,
                    shiftDate
                ];
                
                db.run(metaQuery, metaParams);
            }

            db.run('COMMIT', (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                } else {
                    log(`📊 New data saved for shift ${shiftDate}`);
                    resolve({ success: true, shiftDate });
                }
            });
        });
    });
}

/**
 * Log data for debugging (only in verbose mode)
 */
function logDataForDebugging(logEntry, timestamp) {
    if (!isVerbose) return;
    
    console.log('\n=== NEW DATA RECEIVED FROM EXTENSION ===');
    console.log('Timestamp:', timestamp);
    console.log('Raw Data:', JSON.stringify(logEntry, null, 2));
    
    // Log specific data types
    if (logEntry.summary) {
        console.log('\n--- SUMMARY DATA ---');
        console.log('Active Calls:', logEntry.summary.activeCalls);
        console.log('Agents Logged In:', logEntry.summary.agentsLoggedIn);
        console.log('Agents In Calls:', logEntry.summary.agentsInCalls);
        console.log('Calls Waiting:', logEntry.summary.callsWaiting);
    }
    
    if (logEntry.details && logEntry.details.agents && logEntry.details.agents.length > 0) {
        console.log('\n--- AGENT DETAILS ---');
        console.log('Number of Agents:', logEntry.details.agents.length);
        logEntry.details.agents.forEach((agent, index) => {
            console.log(`Agent ${index + 1}:`, {
                station: agent.station,
                user: agent.user,
                status: agent.status,
                campaign: agent.campaign,
                calls: agent.calls
            });
        });
    }
    
    if (logEntry.details && logEntry.details.waitingCalls && logEntry.details.waitingCalls.length > 0) {
        console.log('\n--- WAITING CALLS ---');
        console.log('Number of Waiting Calls:', logEntry.details.waitingCalls.length);
        logEntry.details.waitingCalls.forEach((call, index) => {
            console.log(`Waiting Call ${index + 1}:`, {
                campaign: call.campaign,
                dialtime: call.dialtime
            });
        });
    }
    
    if (logEntry.meta) {
        console.log('\n--- METADATA ---');
        console.log('Dial Level:', logEntry.meta.dialLevel);
        console.log('Dialable Leads:', logEntry.meta.dialableLeads);
    }
    
    console.log('=== END OF DATA ENTRY ===\n');
}

// --- API Endpoints ---

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

/**
 * Receive data from extension
 */
app.post('/api/logs', async (req, res) => {
    const logEntry = req.body;
    const timestamp = new Date().toISOString();
    
    try {
        // Log for debugging (only in verbose mode)
        logDataForDebugging(logEntry, timestamp);
        
        // Show minimal data received message (always show with rotating emoji)
        console.log(`${getNextDataEmoji()} Data received from extension, saving to database...`);
        
        // Save to database
        const result = await saveExtensionData(logEntry);
        
        // Send success response
        res.status(200).json({ 
            success: true, 
            message: 'Data saved to database',
            timestamp,
            shiftDate: result.shiftDate
        });
        
    } catch (error) {
        console.error('❌ Error processing extension data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save data to database',
            error: error.message
        });
    }
});

/**
 * Get latest summary for dashboard
 */
app.get('/api/summary/latest', (req, res) => {
    const query = `
        SELECT * FROM summary_stats 
        ORDER BY timestamp DESC 
        LIMIT 1
    `;
    
    db.get(query, [], (err, row) => {
        if (err) {
            console.error('❌ Error fetching latest summary:', err);
            res.status(500).json({ 
                success: false, 
                error: err.message 
            });
        } else {
            res.json({ 
                success: true, 
                data: row 
            });
        }
    });
});

/**
 * Get current agents for dashboard
 */
app.get('/api/agents/current', (req, res) => {
    const query = `
        SELECT * FROM agent_logs 
        WHERE shift_date = DATE('now')
        ORDER BY timestamp DESC
        LIMIT 100
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching current agents:', err);
            res.status(500).json({ 
                success: false, 
                error: err.message 
            });
        } else {
            res.json({ 
                success: true, 
                data: rows 
            });
        }
    });
});

/**
 * Get waiting calls for dashboard
 */
app.get('/api/waiting-calls', (req, res) => {
    const query = `
        SELECT * FROM waiting_calls 
        WHERE shift_date = DATE('now')
        ORDER BY timestamp DESC
        LIMIT 50
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching waiting calls:', err);
            res.status(500).json({ 
                success: false, 
                error: err.message 
            });
        } else {
            res.json({ 
                success: true, 
                data: rows 
            });
        }
    });
});

// --- Server Start ---
async function startServer() {
    try {
        log('🚀 Starting Extension-to-Database Server...', true);
        
        // Initialize database
        await initializeDatabase();
        
        const server = app.listen(PORT, () => {
            log(`🌐 Server running on http://localhost:${PORT}`, true);
            log('📊 Ready to receive data from extension', true);
        });
        
        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            log(`\n🔄 Received ${signal}. Closing database connection...`, true);
            if (db) {
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        log('✅ Database connection closed', true);
                    }
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        };
        
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Database path - use shared database
const DB_PATH = path.join(__dirname, '..', 'shared-database', 'database', 'vicidial_monitor.db');

// Database connection
let db;

/**
 * Initialize database connection
 */
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                console.log('✅ Connected to shared SQLite database');
                resolve();
            }
        });
    });
}

/**
 * Run database query
 */
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Run single database query
 */
function runSingleQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Routes ---

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
    res.send('Vici-Monitor Dashboard Backend is running. This server provides data from the shared database to the frontend dashboard.');
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        service: 'dashboard-backend'
    });
});

/**
 * Get latest summary for dashboard
 */
app.get('/api/summary/latest', async (req, res) => {
    try {
        const summary = await runSingleQuery(`
            SELECT * FROM summary_stats 
            ORDER BY timestamp DESC 
            LIMIT 1
        `);
        
        res.json({ 
            success: true, 
            data: summary 
        });
    } catch (error) {
        console.error('❌ Error fetching latest summary:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get current agents for dashboard
 */
app.get('/api/agents/current', async (req, res) => {
    try {
        const agents = await runQuery(`
            SELECT * FROM agent_logs 
            WHERE shift_date = DATE('now')
            ORDER BY timestamp DESC
            LIMIT 100
        `);
        
        res.json({ 
            success: true, 
            data: agents 
        });
    } catch (error) {
        console.error('❌ Error fetching current agents:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get waiting calls for dashboard
 */
app.get('/api/waiting-calls', async (req, res) => {
    try {
        const calls = await runQuery(`
            SELECT * FROM waiting_calls 
            WHERE shift_date = DATE('now')
            ORDER BY timestamp DESC
            LIMIT 50
        `);
        
        res.json({ 
            success: true, 
            data: calls 
        });
    } catch (error) {
        console.error('❌ Error fetching waiting calls:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get agent performance analytics
 */
app.get('/api/analytics/agents', async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        const hours = parseInt(timeRange.replace('h', '')) || 24;
        
        const analytics = await runQuery(`
            SELECT 
                user,
                COUNT(*) as status_changes,
                SUM(calls) as total_calls,
                MAX(calls) as peak_calls,
                COUNT(CASE WHEN status = 'INCALL' THEN 1 END) as incall_count,
                COUNT(CASE WHEN status = 'READY' THEN 1 END) as ready_count,
                COUNT(CASE WHEN status = 'PAUSED' THEN 1 END) as paused_count
            FROM agent_logs
            WHERE timestamp >= datetime('now', '-${hours} hours')
            GROUP BY user
            ORDER BY total_calls DESC
            LIMIT 20
        `);
        
        res.json({ 
            success: true, 
            data: analytics 
        });
    } catch (error) {
        console.error('❌ Error fetching agent analytics:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get SLA metrics
 */
app.get('/api/sla-metrics', async (req, res) => {
    try {
        const { shiftDate } = req.query;
        const dateFilter = shiftDate || "DATE('now')";
        
        const sla = await runSingleQuery(`
            SELECT 
                AVG(calls_waiting) as avg_waiting,
                MAX(calls_waiting) as peak_waiting,
                AVG(agents_in_calls) as avg_in_calls,
                AVG(agents_logged_in) as avg_logged_in,
                COUNT(*) as data_points,
                MAX(CASE WHEN calls_waiting > 5 THEN 1 ELSE 0 END) as threshold_breaches
            FROM summary_stats 
            WHERE shift_date = ${dateFilter}
        `);
        
        res.json({ 
            success: true, 
            data: sla 
        });
    } catch (error) {
        console.error('❌ Error fetching SLA metrics:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get call volume analytics
 */
app.get('/api/analytics/call-volume', async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        const hours = parseInt(timeRange.replace('h', '')) || 24;
        
        const analytics = await runQuery(`
            SELECT 
                DATE(timestamp) as date,
                strftime('%H:00', timestamp) as hour,
                AVG(active_calls) as avg_active_calls,
                MAX(active_calls) as peak_active_calls,
                AVG(agents_logged_in) as avg_agents,
                AVG(calls_waiting) as avg_waiting,
                MAX(calls_waiting) as peak_waiting,
                SUM(total_calls) as total_calls
            FROM summary_stats 
            WHERE timestamp >= datetime('now', '-${hours} hours')
            GROUP BY DATE(timestamp), strftime('%H', timestamp)
            ORDER BY date DESC, hour DESC
        `);
        
        res.json({ 
            success: true, 
            data: analytics 
        });
    } catch (error) {
        console.error('❌ Error fetching call volume analytics:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get dashboard summary (combined data for main dashboard)
 */
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        // Get all required data in parallel
        const [summary, agents, waitingCalls, metadata] = await Promise.all([
            runSingleQuery(`
                SELECT * FROM summary_stats 
                ORDER BY timestamp DESC 
                LIMIT 1
            `),
            runQuery(`
                SELECT * FROM agent_logs 
                WHERE shift_date = DATE('now')
                ORDER BY timestamp DESC
                LIMIT 100
            `),
            runQuery(`
                SELECT * FROM waiting_calls 
                WHERE shift_date = DATE('now')
                ORDER BY timestamp DESC
                LIMIT 50
            `),
            runSingleQuery(`
                SELECT * FROM meta_data 
                ORDER BY timestamp DESC 
                LIMIT 1
            `)
        ]);

        // Format data for dashboard consumption
        const dashboardData = {
            timestamp: new Date().toISOString(),
            summary: {
                activeCalls: summary?.active_calls || 0,
                agentsLoggedIn: summary?.agents_logged_in || 0,
                agentsInCalls: summary?.agents_in_calls || 0,
                callsWaiting: summary?.calls_waiting || 0,
                agentsPaused: summary?.agents_paused || 0,
                agentsWaiting: summary?.agents_waiting || 0,
                agentsDispo: summary?.agents_dispo || 0,
                agentsDead: summary?.agents_dead || 0,
                ringingCalls: summary?.ringing_calls || 0,
                ivrCalls: summary?.ivr_calls || 0,
                totalCalls: summary?.total_calls || 0,
                droppedPercentage: summary?.dropped_percentage || '0%'
            },
            details: {
                agents: agents.map(agent => ({
                    station: agent.station,
                    user: agent.user,
                    session: agent.session,
                    status: agent.status,
                    time: agent.time,
                    stateColor: agent.state_color,
                    pauseCode: agent.pause_code,
                    campaign: agent.campaign,
                    calls: agent.calls,
                    group: agent.agent_group
                })),
                waitingCalls: waitingCalls.map(call => ({
                    phone: call.phone,
                    campaign: call.campaign,
                    status: call.status,
                    server: call.server,
                    dialtime: call.dial_time,
                    callType: call.call_type,
                    priority: call.priority
                }))
            },
            meta: {
                dialLevel: metadata?.dial_level,
                dialableLeads: metadata?.dialable_leads || 0,
                callsToday: metadata?.calls_today || 0,
                droppedAnswered: metadata?.dropped_answered || 0
            }
        };

        res.json({ 
            success: true, 
            data: dashboardData 
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard summary:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- Server Start ---
async function startServer() {
    try {
        console.log('🚀 Starting Database-to-Dashboard Server...');
        
        // Initialize database
        await initializeDatabase();
        
        const server = app.listen(PORT, () => {
            console.log(`🌐 Dashboard Server running on http://localhost:${PORT}`);
            console.log('📊 Ready to serve data to dashboard');
        });
        
        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            console.log(`\n🔄 Received ${signal}. Closing database connection...`);
            if (db) {
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('✅ Database connection closed');
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
        console.error('❌ Failed to start dashboard server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

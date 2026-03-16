const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Import modular routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = 3001;

// Database path - use shared database
const DB_PATH = path.join(__dirname, '..', 'shared-database', 'database', 'vicidial_monitor.db');

// Database connection
let db;

/**
 * Initialize database connection and create tables
 */
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                console.log('✅ Connected to shared SQLite database');
                createTables()
                    .then(() => resolve())
                    .catch(reject);
            }
        });
    });
}

/**
 * Create database tables including users table
 */
async function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create users table if it doesn't exist
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active INTEGER DEFAULT 1
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                    reject(err);
                } else {
                    // Insert default admin user if not exists
                    db.run(`INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)`, 
                        ['admin', 'admin123', 'Administrator', 'admin'], (err) => {
                        if (err) {
                            console.error('Error inserting default user:', err);
                        } else {
                            console.log('✅ Users table created and default user added');
                        }
                        resolve();
                    });
                }
            });
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

// Pass database connection to routes
app.use((req, res, next) => {
    req.db = db;
    req.runQuery = runQuery;
    req.runSingleQuery = runSingleQuery;
    next();
});

// --- API Routes ---
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

// Use modular routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

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

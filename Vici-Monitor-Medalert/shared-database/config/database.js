const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database configuration
const DB_CONFIG = {
    path: path.join(__dirname, '..', 'database', 'vicidial_monitor.db'),
    options: {
        // SQLite options for better performance
        busyTimeout: 30000,        // 30 seconds timeout
        journalMode: 'WAL',        // Write-Ahead Logging for better concurrency
        synchronous: 'NORMAL',      // Balance between safety and performance
        cacheSize: 10000,          // Cache size in pages
        tempStore: 'MEMORY'         // Store temporary tables in memory
    }
};

// Database connection pool
let db = null;

/**
 * Initialize database connection
 */
function initializeDatabase() {
    try {
        console.log('Initializing database connection...');
        db = new sqlite3.Database(DB_CONFIG.path, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                throw err;
            }
            console.log('Connected to SQLite database successfully');
        });

        // Configure database options
        db.configure("busyTimeout", DB_CONFIG.options.busyTimeout);
        
        // Enable WAL mode for better concurrency
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA cache_size = 10000');
        db.run('PRAGMA temp_store = MEMORY');

        return db;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Get database instance
 */
function getDatabase() {
    if (!db) {
        return initializeDatabase();
    }
    return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
        });
        db = null;
    }
}

/**
 * Execute database migration
 */
async function runMigration(migrationPath) {
    const fs = require('fs').promises;
    
    try {
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        const db = getDatabase();
        
        await new Promise((resolve, reject) => {
            db.exec(migrationSQL, (err) => {
                if (err) {
                    console.error(`Error running migration ${migrationPath}:`, err);
                    reject(err);
                } else {
                    console.log(`Migration ${migrationPath} completed successfully`);
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Failed to run migration:', error);
        throw error;
    }
}

/**
 * Initialize all migrations
 */
async function initializeMigrations() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const migrationFiles = await fs.readdir(migrationsDir);
        
        // Sort migration files to ensure proper order
        const sortedMigrations = migrationFiles
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        console.log('Running database migrations...');
        
        for (const migrationFile of sortedMigrations) {
            const migrationPath = path.join(migrationsDir, migrationFile);
            await runMigration(migrationPath);
        }
        
        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Failed to initialize migrations:', error);
        throw error;
    }
}

/**
 * Database helper for running queries
 */
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Database query error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Database helper for running single query
 */
function runSingleQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        db.get(query, params, (err, row) => {
            if (err) {
                console.error('Database query error:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Database helper for running insert/update/delete
 */
function runExecute(query, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('Database execute error:', err);
                reject(err);
            } else {
                resolve({ 
                    id: this.lastID, 
                    changes: this.changes 
                });
            }
        });
    });
}

/**
 * Begin transaction
 */
function beginTransaction() {
    return runExecute('BEGIN TRANSACTION');
}

/**
 * Commit transaction
 */
function commitTransaction() {
    return runExecute('COMMIT');
}

/**
 * Rollback transaction
 */
function rollbackTransaction() {
    return runExecute('ROLLBACK');
}

/**
 * Execute multiple queries in a transaction
 */
async function runTransaction(queries) {
    try {
        await beginTransaction();
        
        const results = [];
        for (const { query, params = [] } of queries) {
            const result = await runExecute(query, params);
            results.push(result);
        }
        
        await commitTransaction();
        return results;
    } catch (error) {
        await rollbackTransaction();
        throw error;
    }
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase,
    initializeMigrations,
    runQuery,
    runSingleQuery,
    runExecute,
    runTransaction,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    DB_CONFIG
};

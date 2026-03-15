
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

let db;

// A function to initialize the database and create tables if they don't exist
const initializeDb = (dbPath) => {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
  });

  // Use serialize to ensure table creation and data insertion happen in order
  db.serialize(() => {
    // Create the agent_log table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS agent_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME NOT NULL,
      agent_id TEXT NOT NULL,
      agent_status TEXT,
      vicidial_state_color TEXT,
      shift_date TEXT NOT NULL,
      campaign TEXT,
      agent_group TEXT
    )`);

    // Create the users table for authentication
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
            return;
        }

        // Check if an admin user exists. If not, log a message to guide the administrator.
        db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, row) => {
            if (err) {
                console.error('Error checking for admin user:', err.message);
                return;
            }
            if (row.count === 0) {
                console.log('-----------------------------------------------------------------');
                console.log('WARNING: No admin user found.');
                console.log('This is the recommended secure default.');
                console.log('To create an admin, you must do so manually via a secure script or direct database access.');
                console.log('Example utility script to add a user: node initial-user.js <username> <password> <role>');
                console.log('-----------------------------------------------------------------');
            }
        });
    });
  });

  return db;
};

const getDb = () => {
    if (!db) {
        throw new Error("Database not initialized. Call initializeDb first.");
    }
    return db;
}

// Promisified db.all
const all = (sql, params) => {
    return new Promise((resolve, reject) => {
        getDb().all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Promisified db.get
const get = (sql, params) => {
    return new Promise((resolve, reject) => {
        getDb().get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

module.exports = { initializeDb, getDb, all, get };

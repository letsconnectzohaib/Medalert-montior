
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path is now a constant, as it's used by all functions.
const dbPath = path.join(__dirname, 'vicidial.db');

// A function to initialize the database and create tables if they don't exist
const initializeDb = () => {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database for initialization:', err.message);
    } else {
      console.log('Connected to the SQLite database for initialization.');
    }
  });

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS agent_log (...)`); // Truncated for brevity
    db.run(`CREATE TABLE IF NOT EXISTS users (...)`, (err) => { // Truncated for brevity
        if (!err) {
            db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, row) => {
                if (!err && row.count === 0) {
                    console.log('WARNING: No admin user found.');
                }
            });
        }
    });
  });

  db.close((err) => {
      if (err) console.error('Error closing initialization DB:', err.message);
      else console.log('Initialization DB connection closed.');
  });
};

// A helper to open a connection in read-only mode for queries
const connectForQuery = () => {
    return new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error("Could not connect to database for query", err);
        }
    });
}

// Promisified db.all using a temporary connection
const all = (sql, params) => {
    return new Promise((resolve, reject) => {
        const db = connectForQuery();
        db.all(sql, params, (err, rows) => {
            db.close(); // Always close the connection
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Promisified db.get using a temporary connection
const get = (sql, params) => {
    return new Promise((resolve, reject) => {
        const db = connectForQuery();
        db.get(sql, params, (err, row) => {
            db.close(); // Always close the connection
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// We no longer export getDb, as it's an anti-pattern for sqlite3 concurrency
module.exports = { initializeDb, all, get };

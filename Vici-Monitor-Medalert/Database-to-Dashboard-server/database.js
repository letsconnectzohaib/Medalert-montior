
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

        // Add a default admin user if one doesn't exist
        const defaultUsername = 'admin';
        const defaultPassword = 'password'; // In a real app, use a more secure default or a setup script

        db.get('SELECT * FROM users WHERE username = ?', [defaultUsername], async (err, row) => {
            if (err) {
                console.error('Error checking for default user:', err.message);
                return;
            }
            if (!row) {
                try {
                    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                    db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', 
                           [defaultUsername, hashedPassword, 'admin'], (err) => {
                        if (err) {
                            console.error('Error inserting default user:', err.message);
                        } else {
                            console.log(`Default user '${defaultUsername}' created with password '${defaultPassword}'.`);
                        }
                    });
                } catch (hashError) {
                     console.error('Error hashing default password:', hashError);
                }
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

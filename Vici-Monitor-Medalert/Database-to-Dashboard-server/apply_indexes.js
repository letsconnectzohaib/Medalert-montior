
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'vicidial.db');
const sqlScriptPath = path.join(__dirname, 'add_indexes.sql');

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error('Error opening database:', err.message);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    // Step 1: Ensure the agent_log table exists, mirroring the logic from database.js
    db.run(`CREATE TABLE IF NOT EXISTS agent_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME NOT NULL,
      agent_id TEXT NOT NULL,
      agent_status TEXT,
      vicidial_state_color TEXT,
      shift_date TEXT NOT NULL,
      campaign TEXT,
      agent_group TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating agent_log table:', err.message);
            db.close();
            return;
        }
        console.log('Ensured agent_log table exists.');

        // Step 2: Read the SQL script to add indexes
        fs.readFile(sqlScriptPath, 'utf8', (err, sql) => {
            if (err) {
                console.error('Error reading SQL script:', err.message);
                db.close();
                return;
            }

            // Step 3: Execute the indexing script
            db.exec(sql, (err) => {
                if (err) {
                    console.error('Error executing indexing script:', err.message);
                } else {
                    console.log('Indexes added successfully!');
                }

                // Step 4: Close the database connection
                db.close((err) => {
                    if (err) {
                        return console.error('Error closing database:', err.message);
                    }
                    console.log('Database connection closed.');
                });
            });
        });
    });
});

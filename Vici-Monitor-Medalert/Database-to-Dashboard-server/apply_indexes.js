
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

// Read the SQL script
fs.readFile(sqlScriptPath, 'utf8', (err, sql) => {
    if (err) {
        return console.error('Error reading SQL script:', err.message);
    }

    // Execute the SQL script
    db.exec(sql, (err) => {
        if (err) {
            return console.error('Error executing script:', err.message);
        }
        console.log('Indexes added successfully!');

        // Close the database connection
        db.close((err) => {
            if (err) {
                return console.error('Error closing database:', err.message);
            }
            console.log('Database connection closed.');
        });
    });
});

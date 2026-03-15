const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Use CORS to allow requests from the frontend
app.use(cors());

// Path to the database file
const dbPath = path.resolve(__dirname, '../Extension-to-db-server/vicidial_stats.db');

// Endpoint to get the latest stats
app.get('/api/latest-stats', (req, res) => {
    // Connect to the database in read-only mode
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Error opening database', err.message);
            return res.status(500).json({ error: 'Failed to connect to the database.' });
        }
    });

    // Query for the most recent entry
    const query = `
        SELECT data 
        FROM stats 
        ORDER BY timestamp DESC 
        LIMIT 1;
    `;

    db.get(query, [], (err, row) => {
        if (err) {
            console.error('Error querying database', err.message);
            db.close();
            return res.status(500).json({ error: 'Error while fetching stats.' });
        }

        if (row) {
            try {
                // The 'data' column stores the stats as a JSON string
                const stats = JSON.parse(row.data);
                res.json(stats);
            } catch (parseError) {
                console.error('Error parsing JSON data from database', parseError.message);
                res.status(500).json({ error: 'Failed to parse stats data.' });
            }
        } else {
            // No records found
            res.status(404).json({ message: 'No stats found in the database yet.' });
        }

        // Close the database connection
        db.close();
    });
});

app.listen(PORT, () => {
    console.log(`Database-to-Dashboard server is running on http://localhost:${PORT}`);
    console.log(`Serving data from: ${dbPath}`);
});

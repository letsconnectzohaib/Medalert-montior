const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;
const LOG_FILE = path.join(__dirname, 'logs', 'vicidial_stats.jsonl');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Ensure logs directory exists
fs.ensureDirSync(path.join(__dirname, 'logs'));

// Endpoint to receive logs
app.post('/api/logs', async (req, res) => {
    try {
        const logEntry = {
            timestamp: new Date().toISOString(),
            data: req.body
        };

        // Append to file (JSON Lines format)
        await fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n');
        
        // Log to console (optional, just to see activity)
        console.log(`[${logEntry.timestamp}] Received stats update`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error writing log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Vicidial Monitor Backend is running. Send POST requests to /api/logs');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Logging data to: ${LOG_FILE}`);
});
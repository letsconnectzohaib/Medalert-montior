
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const agentRoutes = require('./routes/agentRoutes');
const summaryRoutes = require('./routes/summaryRoutes'); // Import the new summary routes

const app = express();
const PORT = 3001; // Running on a different port than the extension server

// The path to the database file created by the other server.
const DB_FILE = path.join(__dirname, '../Extension-to-db-server/vicidial_stats.db');

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
// Connecting in read-only mode for safety, as this server's job is to read.
const db = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('[Dashboard Server] Error opening database:', err.message);
    console.error('Please ensure the Extension-to-db-server has run at least once to create the database file.');
    process.exit(1);
  } else {
    console.log('[Dashboard Server] Successfully connected to the Vicidial stats database in read-only mode.');
  }
});

// Pass the database connection to the routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// --- API Routes ---
app.get('/', (req, res) => {
  res.send('Vici-Monitor Dashboard Backend is running. This server provides aggregated data to the frontend dashboard.');
});

app.use('/api/agents', agentRoutes);
app.use('/api/summary', summaryRoutes); // Use the new summary routes

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`[Dashboard Server] Server running on http://localhost:${PORT}`);
  console.log(`[Dashboard Server] Connected to database: ${DB_FILE}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});

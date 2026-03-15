
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDb } = require('./database'); // Import the new database module
const agentRoutes = require('./routes/agentRoutes');
const summaryRoutes = require('./routes/summary'); 
const analyticalRoutes = require('./routes/analytical');
const trendRoutes = require('./routes/trends');
const filterRoutes = require('./routes/filters');

const app = express();
const PORT = 3001;

const DB_FILE = path.join(__dirname, '../Extension-to-db-server/vicidial_stats.db');

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const db = initializeDb(DB_FILE);

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
app.use('/api/summary', summaryRoutes);
app.use('/api/analytical', analyticalRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/filters', filterRoutes);

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

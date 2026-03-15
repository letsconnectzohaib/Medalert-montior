
const express = require('express');
const cors = require('cors');
const initializeDb = require('./database');
const path = require('path');

// --- Import Routes ---
const summaryRoutes = require('./routes/summaryRoutes');
const agentRoutes = require('./routes/agentRoutes');
const { router: authRoutes, verifyToken } = require('./routes/authRoutes'); // Import router and middleware

// --- Initialization ---
const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'vici-monitor.db');

// --- Database Connection ---
const db = initializeDb(DB_PATH);

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // for parsing application/json

// Make the database instance available to all routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// --- Route Definitions ---

// Authentication routes are public
app.use('/api/auth', authRoutes);

// All other API routes are protected by the verifyToken middleware
app.use('/api/summary', verifyToken, summaryRoutes);
app.use('/api/agents', verifyToken, agentRoutes);

// A simple root path to confirm the server is running
app.get('/', (req, res) => {
  res.send('Vici-Monitor Database-to-Dashboard Server is running.');
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

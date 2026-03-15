
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables
const { all, get } = require('./database'); // Import the new database module
const agentRoutes = require('./routes/agentRoutes');
const summaryRoutes = require('./routes/summary'); 
const analyticalRoutes = require('./routes/analytical');
const trendRoutes = require('./routes/trends');
const filterRoutes = require('./routes/filters');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Pass the database connection to the routes
app.use((req, res, next) => {
  req.db = { all, get };
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
app.use('/api/auth', authRoutes);

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`[Dashboard Server] Server running on http://localhost:${PORT}`);
});

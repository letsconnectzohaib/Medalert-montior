const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const statsRoutes = require('../routes/stats');
const healthRoutes = require('../routes/health');

class ServerService {
  constructor() {
    this.app = express();
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS middleware
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:5173', 'chrome-extension://*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', healthRoutes.health);

    // Stats endpoints
    this.app.post('/api/logs', statsRoutes.createStats);
    this.app.get('/api/stats', statsRoutes.getStats);
    this.app.get('/api/stats/hourly', statsRoutes.getHourlyStats);
    this.app.get('/api/stats/daily', statsRoutes.getDailyStats);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'ViciDial Monitor API',
        version: '1.0.0',
        developer: 'Mr. Zohaib',
        status: 'running',
        endpoints: {
          health: 'GET /api/health',
          createStats: 'POST /api/logs',
          getStats: 'GET /api/stats',
          getHourlyStats: 'GET /api/stats/hourly',
          getDailyStats: 'GET /api/stats/daily'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.path}`,
        availableEndpoints: [
          'GET /',
          'GET /api/health',
          'POST /api/logs',
          'GET /api/stats',
          'GET /api/stats/hourly',
          'GET /api/stats/daily'
        ]
      });
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  async start(port) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`Server started successfully on port ${port}`);
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          console.error('Server error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp() {
    return this.app;
  }
}

module.exports = async function startServer(port) {
  const serverService = new ServerService();
  await serverService.start(port);
  return serverService;
};

const dbConnection = require('../database/connection');
const StatsModel = require('../database/models/Stats');

class HealthController {
  static async health(req, res) {
    try {
      const startTime = Date.now();
      
      // Test database connection
      await dbConnection.connect();
      
      // Test database query performance
      const queryStart = Date.now();
      await StatsModel.getLatestRecord();
      const queryTime = Date.now() - queryStart;
      
      // Get database statistics
      const dbStats = await StatsModel.getDatabaseStats();
      const dbInfo = dbConnection.getDatabaseInfo();
      
      // Get system info
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      const responseTime = Date.now() - startTime;
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        system: {
          uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
          memory: {
            used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
          }
        },
        database: {
          status: 'connected',
          queryTime: `${queryTime}ms`,
          totalRecords: dbStats.totalRecords,
          todayRecords: dbStats.todayRecords,
          size: `${Math.round(dbInfo.size / 1024 / 1024)}MB`,
          lastRecord: dbStats.newestRecord
        },
        endpoints: {
          '/api/health': 'GET - Health check',
          '/api/logs': 'POST - Create stats',
          '/api/stats': 'GET - Get stats with pagination',
          '/api/stats/hourly': 'GET - Get hourly aggregations',
          '/api/stats/daily': 'GET - Get daily summaries'
        }
      };
      
      await dbConnection.close();
      
      res.json(health);
      
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
}

module.exports = {
  health: HealthController.health
};

const dbConnection = require('../database/connection');
const StatsModel = require('../database/models/Stats');

class StatsController {
  static async createStats(req, res) {
    try {
      await dbConnection.connect();
      
      const data = req.body;
      
      // Validate required fields
      if (!data || typeof data !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format. Expected object.'
        });
      }
      
      // Insert stats into database
      const result = await StatsModel.insert(data);
      
      await dbConnection.close();
      
      console.log(`[${new Date().toISOString()}] Stats inserted: ID ${result.id}`);
      
      res.json({
        success: true,
        id: result.id,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error creating stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getStats(req, res) {
    try {
      await dbConnection.connect();
      
      const { start, end, limit = 1000, offset = 0 } = req.query;
      
      // Validate parameters
      const parsedLimit = Math.min(parseInt(limit) || 1000, 10000); // Max 10k records
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);
      
      const options = {
        start,
        end,
        limit: parsedLimit,
        offset: parsedOffset
      };
      
      const stats = await StatsModel.getStats(options);
      
      await dbConnection.close();
      
      res.json({
        success: true,
        data: stats,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          count: stats.length
        }
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getHourlyStats(req, res) {
    try {
      await dbConnection.connect();
      
      const { start, end } = req.query;
      
      const options = { start, end };
      const stats = await StatsModel.getHourlyStats(options);
      
      await dbConnection.close();
      
      res.json({
        success: true,
        data: stats,
        count: stats.length
      });
      
    } catch (error) {
      console.error('Error fetching hourly stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getDailyStats(req, res) {
    try {
      await dbConnection.connect();
      
      const { start, end } = req.query;
      
      const options = { start, end };
      const stats = await StatsModel.getDailyStats(options);
      
      await dbConnection.close();
      
      res.json({
        success: true,
        data: stats,
        count: stats.length
      });
      
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = {
  createStats: StatsController.createStats,
  getStats: StatsController.getStats,
  getHourlyStats: StatsController.getHourlyStats,
  getDailyStats: StatsController.getDailyStats
};

const dbConnection = require('../connection');

class StatsModel {
  async insert(data) {
    const summary = data.summary || {};
    const meta = data.meta || {};
    
    const sql = `
      INSERT INTO stats (
        timestamp, activeCalls, ringingCalls, waitingCalls, ivrCalls,
        agentsLoggedIn, agentsInCalls, agentsWaiting, agentsPaused,
        agentsDead, agentsDispo, dialLevel, dialableLeads, callsToday,
        droppedAnswered, avgAgents, dialMethod, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.timestamp || new Date().toISOString(),
      summary.activeCalls || 0,
      summary.ringingCalls || 0,
      summary.waitingCalls || 0,
      summary.ivrCalls || 0,
      summary.agentsLoggedIn || 0,
      summary.agentsInCalls || 0,
      summary.agentsWaiting || 0,
      summary.agentsPaused || 0,
      summary.agentsDead || 0,
      summary.agentsDispo || 0,
      meta.dialLevel || null,
      meta.dialableLeads || 0,
      meta.callsToday || 0,
      meta.droppedAnswered || null,
      meta.avgAgents || 0,
      meta.dialMethod || null,
      JSON.stringify(data)
    ];
    
    return await dbConnection.run(sql, params);
  }

  async getStats(options = {}) {
    const { start, end, limit = 1000, offset = 0 } = options;
    
    let query = 'SELECT * FROM stats';
    let params = [];
    
    if (start || end) {
      query += ' WHERE';
      const conditions = [];
      
      if (start) {
        conditions.push(' timestamp >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push(' timestamp <= ?');
        params.push(end);
      }
      
      query += conditions.join(' AND');
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    return await dbConnection.all(query, params);
  }

  async getHourlyStats(options = {}) {
    const { start, end } = options;
    
    let query = `
      SELECT 
        strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
        AVG(activeCalls) as avg_active_calls,
        MAX(activeCalls) as max_active_calls,
        MIN(activeCalls) as min_active_calls,
        AVG(agentsLoggedIn) as avg_agents_logged_in,
        AVG(waitingCalls) as avg_waiting_calls,
        COUNT(*) as data_points
      FROM stats
    `;
    
    let params = [];
    
    if (start || end) {
      query += ' WHERE';
      const conditions = [];
      
      if (start) {
        conditions.push(' timestamp >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push(' timestamp <= ?');
        params.push(end);
      }
      
      query += conditions.join(' AND');
    }
    
    query += ' GROUP BY hour ORDER BY hour DESC';
    
    return await dbConnection.all(query, params);
  }

  async getDailyStats(options = {}) {
    const { start, end } = options;
    
    let query = `
      SELECT 
        date(timestamp) as day,
        AVG(activeCalls) as avg_active_calls,
        MAX(activeCalls) as max_active_calls,
        MIN(activeCalls) as min_active_calls,
        AVG(agentsLoggedIn) as avg_agents_logged_in,
        AVG(waitingCalls) as avg_waiting_calls,
        COUNT(*) as data_points
      FROM stats
    `;
    
    let params = [];
    
    if (start || end) {
      query += ' WHERE';
      const conditions = [];
      
      if (start) {
        conditions.push(' timestamp >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push(' timestamp <= ?');
        params.push(end);
      }
      
      query += conditions.join(' AND');
    }
    
    query += ' GROUP BY day ORDER BY day DESC';
    
    return await dbConnection.all(query, params);
  }

  async getLatestRecord() {
    const query = 'SELECT * FROM stats ORDER BY timestamp DESC LIMIT 1';
    return await dbConnection.get(query);
  }

  async getDatabaseStats() {
    const totalRecords = await dbConnection.get('SELECT COUNT(*) as count FROM stats');
    const todayRecords = await dbConnection.get(`
      SELECT COUNT(*) as count FROM stats 
      WHERE date(timestamp) = date('now')
    `);
    const oldestRecord = await dbConnection.get('SELECT timestamp FROM stats ORDER BY timestamp ASC LIMIT 1');
    const newestRecord = await dbConnection.get('SELECT timestamp FROM stats ORDER BY timestamp DESC LIMIT 1');
    
    return {
      totalRecords: totalRecords.count,
      todayRecords: todayRecords.count,
      oldestRecord: oldestRecord?.timestamp,
      newestRecord: newestRecord?.timestamp
    };
  }

  async deleteOldRecords(daysToKeep = 90) {
    const query = `
      DELETE FROM stats 
      WHERE timestamp < datetime('now', '-${daysToKeep} days')
    `;
    return await dbConnection.run(query);
  }
}

module.exports = new StatsModel();

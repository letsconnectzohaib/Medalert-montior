const dbConnection = require('../connection');

class Migration001 {
  constructor() {
    this.name = '001_initial';
    this.version = '1.0.0';
    this.description = 'Create initial stats table and indexes';
  }

  async up() {
    await dbConnection.connect();
    
    // Create main stats table
    await dbConnection.run(`
      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        activeCalls INTEGER DEFAULT 0,
        ringingCalls INTEGER DEFAULT 0,
        waitingCalls INTEGER DEFAULT 0,
        ivrCalls INTEGER DEFAULT 0,
        agentsLoggedIn INTEGER DEFAULT 0,
        agentsInCalls INTEGER DEFAULT 0,
        agentsWaiting INTEGER DEFAULT 0,
        agentsPaused INTEGER DEFAULT 0,
        agentsDead INTEGER DEFAULT 0,
        agentsDispo INTEGER DEFAULT 0,
        dialLevel TEXT,
        dialableLeads INTEGER DEFAULT 0,
        callsToday INTEGER DEFAULT 0,
        droppedAnswered TEXT,
        avgAgents INTEGER DEFAULT 0,
        dialMethod TEXT,
        raw_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await dbConnection.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON stats(timestamp)`);
    await dbConnection.run(`CREATE INDEX IF NOT EXISTS idx_date_bucket ON stats(date(timestamp))`);
    await dbConnection.run(`CREATE INDEX IF NOT EXISTS idx_hour_bucket ON stats(strftime('%Y-%m-%d %H', timestamp))`);
    await dbConnection.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON stats(created_at)`);

    console.log(`✅ Migration ${this.name} completed successfully`);
  }

  async down() {
    await dbConnection.connect();
    
    await dbConnection.run('DROP TABLE IF EXISTS stats');
    
    console.log(`✅ Migration ${this.name} rolled back successfully`);
  }

  async isApplied() {
    try {
      await dbConnection.connect();
      const result = await dbConnection.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='stats'
      `);
      return !!result;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new Migration001();

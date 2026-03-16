# 🗄️ DATABASE INTEGRATION PLAN

## 📋 **OVERVIEW**
Transform the current system to use a **shared SQLite3 database** as the central data hub between Extension → Database → Dashboard.

## 🎯 **OBJECTIVES**
1. Create shared database infrastructure
2. Migrate from file-based to database storage
3. Establish proper data flow: Extension → DB → Dashboard
4. Remove old file-based logic
5. Implement comprehensive database schema

---

## 📁 **STEP 1: CREATE SHARED DATABASE INFRASTRUCTURE**

### **1.1 Create Database Folder Structure**
```
monitor/
├── shared-database/
│   ├── database/
│   │   ├── vicidial_monitor.db (SQLite3 file)
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql
│   │       ├── 002_add_indexes.sql
│   │       └── 003_add_shift_tracking.sql
│   ├── config/
│   │   └── database.js
│   └── utils/
│       ├── connection.js
│       └── queries.js
```

### **1.2 Database Schema Design**
```sql
-- Agent Logs Table
CREATE TABLE agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    station TEXT NOT NULL,
    user TEXT NOT NULL,
    session TEXT,
    status TEXT NOT NULL,
    time TEXT,
    state_color TEXT,
    pause_code TEXT DEFAULT '',
    campaign TEXT,
    calls INTEGER DEFAULT 0,
    agent_group TEXT,
    shift_date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Summary Stats Table
CREATE TABLE summary_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    active_calls INTEGER DEFAULT 0,
    agents_logged_in INTEGER DEFAULT 0,
    agents_in_calls INTEGER DEFAULT 0,
    calls_waiting INTEGER DEFAULT 0,
    ringing_calls INTEGER DEFAULT 0,
    ivr_calls INTEGER DEFAULT 0,
    agents_paused INTEGER DEFAULT 0,
    agents_waiting INTEGER DEFAULT 0,
    agents_dispo INTEGER DEFAULT 0,
    agents_dead INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    dropped_percentage TEXT DEFAULT '0%',
    dial_level TEXT,
    dialable_leads INTEGER DEFAULT 0,
    shift_date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Waiting Calls Table
CREATE TABLE waiting_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    phone TEXT,
    campaign TEXT,
    status TEXT,
    server TEXT,
    dial_time TEXT,
    call_type TEXT,
    priority INTEGER DEFAULT 0,
    shift_date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meta Data Table
CREATE TABLE meta_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    dial_level TEXT,
    dialable_leads INTEGER DEFAULT 0,
    calls_today INTEGER DEFAULT 0,
    dropped_answered INTEGER DEFAULT 0,
    shift_date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shift Tracking Table
CREATE TABLE shift_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_date DATE NOT NULL,
    shift_start TIME,
    shift_end TIME,
    total_agents INTEGER DEFAULT 0,
    peak_active_calls INTEGER DEFAULT 0,
    total_calls_handled INTEGER DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shift_date)
);

-- Performance Indexes
CREATE INDEX idx_agent_logs_timestamp ON agent_logs(timestamp);
CREATE INDEX idx_agent_logs_shift_date ON agent_logs(shift_date);
CREATE INDEX idx_summary_stats_timestamp ON summary_stats(timestamp);
CREATE INDEX idx_summary_stats_shift_date ON summary_stats(shift_date);
CREATE INDEX idx_waiting_calls_timestamp ON waiting_calls(timestamp);
CREATE INDEX idx_meta_data_timestamp ON meta_data(timestamp);
CREATE INDEX idx_shift_logs_date ON shift_logs(shift_date);
```

---

## 🔄 **STEP 2: MODIFY EXTENSION-TO-DB SERVER**

### **2.1 Remove Old File-Based Logic**
- ❌ Remove `fs.writeFileSync` for JSON files
- ❌ Remove `latest_entry.json` creation
- ❌ Remove `vicidial_stats.jsonl` logging
- ❌ Remove file-based data storage

### **2.2 Add Database Integration**
```javascript
// New dependencies
const sqlite3 = require('sqlite3').verbose();
const { Database } = require('sqlite3');

// Database connection
const db = new Database('./shared-database/database/vicidial_monitor.db');

// Replace file storage with database insertion
async function saveToDatabase(data) {
    const timestamp = new Date().toISOString();
    
    // Insert summary stats
    await db.run(`
        INSERT INTO summary_stats (
            active_calls, agents_logged_in, agents_in_calls, calls_waiting,
            ringing_calls, ivr_calls, agents_paused, agents_waiting,
            agents_dispo, agents_dead, total_calls, dropped_percentage,
            dial_level, dialable_leads, shift_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.summary.activeCalls,
        data.summary.agentsLoggedIn,
        data.summary.agentsInCalls,
        data.summary.callsWaiting,
        data.details.ringingCalls || 0,
        data.details.ivrCalls || 0,
        data.details.agentsPaused || 0,
        data.details.agentsWaiting || 0,
        data.details.agentsDispo || 0,
        data.details.agentsDead || 0,
        data.meta.callsToday || 0,
        data.meta.droppedAnswered || '0%',
        data.meta.dialLevel,
        data.meta.dialableLeads,
        new Date().toISOString().split('T')[0]
    ]);
    
    // Insert agent logs
    for (const agent of data.details.agents) {
        await db.run(`
            INSERT INTO agent_logs (
                station, user, session, status, time, state_color,
                pause_code, campaign, calls, agent_group, shift_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            agent.station,
            agent.user,
            agent.session,
            agent.status,
            agent.time,
            agent.stateColor,
            agent.pauseCode || '',
            agent.campaign,
            agent.calls,
            agent.group || '',
            new Date().toISOString().split('T')[0]
        ]);
    }
    
    // Insert waiting calls
    for (const call of data.details.waitingCalls || []) {
        await db.run(`
            INSERT INTO waiting_calls (
                phone, campaign, status, server, dial_time,
                call_type, priority, shift_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            call.phone,
            call.campaign,
            call.status,
            call.server,
            call.dialtime,
            call.callType,
            call.priority || 0,
            new Date().toISOString().split('T')[0]
        ]);
    }
    
    // Insert meta data
    await db.run(`
        INSERT INTO meta_data (
            dial_level, dialable_leads, calls_today, dropped_answered, shift_date
        ) VALUES (?, ?, ?, ?, ?)
    `, [
        data.meta.dialLevel,
        data.meta.dialableLeads,
        data.meta.callsToday,
        data.meta.droppedAnswered,
        new Date().toISOString().split('T')[0]
    ]);
}
```

---

## 📊 **STEP 3: MODIFY DATABASE-TO-DASHBOARD SERVER**

### **3.1 Create API Endpoints**
```javascript
// GET /api/summary/latest
app.get('/api/summary/latest', async (req, res) => {
    const summary = await db.get(`
        SELECT * FROM summary_stats 
        ORDER BY timestamp DESC 
        LIMIT 1
    `);
    res.json(summary);
});

// GET /api/agents/current
app.get('/api/agents/current', async (req, res) => {
    const agents = await db.all(`
        SELECT * FROM agent_logs 
        WHERE shift_date = DATE('now')
        ORDER BY timestamp DESC
    `);
    res.json(agents);
});

// GET /api/waiting-calls
app.get('/api/waiting-calls', async (req, res) => {
    const calls = await db.all(`
        SELECT * FROM waiting_calls 
        WHERE shift_date = DATE('now')
        ORDER BY timestamp DESC
    `);
    res.json(calls);
});

// GET /api/call-analytics
app.get('/api/call-analytics', async (req, res) => {
    const { timeRange = '24h' } = req.query;
    const analytics = await db.all(`
        SELECT 
            DATE(timestamp) as date,
            AVG(active_calls) as avg_active_calls,
            MAX(active_calls) as peak_active_calls,
            AVG(agents_logged_in) as avg_agents,
            SUM(total_calls) as total_calls
        FROM summary_stats 
        WHERE timestamp >= datetime('now', '-${timeRange}')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    `);
    res.json(analytics);
});

// GET /api/sla-metrics
app.get('/api/sla-metrics', async (req, res) => {
    const { shiftDate = DATE('now') } = req.query;
    const sla = await db.get(`
        SELECT 
            AVG(calls_waiting) as avg_waiting,
            MAX(calls_waiting) as peak_waiting,
            AVG(agents_in_calls) as avg_in_calls,
            COUNT(*) as data_points
        FROM summary_stats 
        WHERE shift_date = ?
    `, [shiftDate]);
    res.json(sla);
});
```

---

## 🎨 **STEP 4: UPDATE DASHBOARD COMPONENTS**

### **4.1 Modify Dashboard Hooks**
```typescript
// Update useAutoRefresh hook
export function useAutoRefresh(timeWindow: number) {
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [chartData, setChartData] = useState<ChartData>({ agents: [], calls: [], sla: { current: 0, threshold: 20, percentage: 0 } });
  
  const fetchData = async () => {
    try {
      // Fetch real data from database API
      const [summary, agents, waitingCalls] = await Promise.all([
        fetch('/api/summary/latest').then(r => r.json()),
        fetch('/api/agents/current').then(r => r.json()),
        fetch('/api/waiting-calls').then(r => r.json())
      ]);
      
      setLatestSnapshot({
        timestamp: new Date().toISOString(),
        data: {
          summary: {
            activeCalls: summary.active_calls,
            agentsLoggedIn: summary.agents_logged_in,
            agentsInCalls: summary.agents_in_calls,
            callsWaiting: summary.calls_waiting,
            agentsPaused: summary.agents_paused,
            agentsWaiting: summary.agents_waiting,
            agentsDispo: summary.agents_dispo,
            agentsDead: summary.agents_dead,
            ringingCalls: summary.ringing_calls,
            ivrCalls: summary.ivr_calls
          },
          details: {
            agents: agents.map(a => ({
              name: a.user,
              status: a.status,
              station: a.station,
              campaign: a.campaign,
              calls: a.calls
            })),
            waitingCalls: waitingCalls
          },
          meta: {
            callsToday: summary.total_calls,
            dialLevel: summary.dial_level,
            dialableLeads: summary.dialable_leads
          }
        }
      });
      
      // Update chart data
      setChartData({
        agents: agents.map(a => ({ name: a.user, calls: a.calls })),
        calls: waitingCalls.map(c => ({ duration: parseInt(c.dial_time) || 0 })),
        sla: { current: waitingCalls.length, threshold: 20, percentage: Math.max(0, 100 - (waitingCalls.length / 20) * 100) }
      });
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [timeWindow]);
  
  return { latestSnapshot, chartData, refresh: fetchData };
}
```

---

## 🚀 **IMPLEMENTATION ORDER**

### **Phase 1: Database Setup**
1. ✅ Create `shared-database/` folder structure
2. ✅ Create SQLite3 database with schema
3. ✅ Set up database connection utilities
4. ✅ Test database operations

### **Phase 2: Extension-to-DB Server Migration**
1. ✅ Remove old file-based storage logic
2. ✅ Add SQLite3 dependencies
3. ✅ Implement database insertion functions
4. ✅ Update API endpoints to use database
5. ✅ Test data flow from extension to database

### **Phase 3: Database-to-Dashboard Server**
1. ✅ Create new API endpoints for dashboard
2. ✅ Implement database query functions
3. ✅ Add real-time data streaming
4. ✅ Test API responses

### **Phase 4: Dashboard Integration**
1. ✅ Update dashboard hooks to use real APIs
2. ✅ Replace mock data with database queries
3. ✅ Test real-time updates
4. ✅ Verify all dashboard components work

### **Phase 5: Cleanup & Testing**
1. ✅ Remove old JSON files and logic
2. ✅ Clean up unused dependencies
3. ✅ Performance optimization
4. ✅ End-to-end testing

---

## 📋 **CHECKLIST**

### **Before Starting:**
- [ ] Backup current data files
- [ ] Install SQLite3 dependencies
- [ ] Set up database folder permissions

### **During Implementation:**
- [ ] Test each phase independently
- [ ] Verify data integrity
- [ ] Check performance metrics
- [ ] Test error handling

### **After Completion:**
- [ ] Remove old file-based storage
- [ ] Update documentation
- [ ] Performance testing
- [ ] User acceptance testing

---

## 🔧 **DEPENDENCIES TO ADD**

### **Extension-to-DB Server:**
```json
{
  "sqlite3": "^5.1.6",
  "better-sqlite3": "^8.7.0"
}
```

### **Database-to-Dashboard Server:**
```json
{
  "sqlite3": "^5.1.6",
  "cors": "^2.8.5",
  "express": "^4.18.2"
}
```

---

## 🎯 **SUCCESS METRICS**

1. **Real-time Data**: Dashboard updates within 5 seconds
2. **Data Integrity**: No data loss during migration
3. **Performance**: Database queries under 100ms
4. **Reliability**: 99.9% uptime for data flow
5. **Scalability**: Handle 100+ concurrent agents

---

## 🚨 **RISKS & MITIGATIONS**

### **Data Loss Risk:**
- **Mitigation**: Backup existing JSON files before migration
- **Rollback Plan**: Keep file-based logic as fallback

### **Performance Issues:**
- **Mitigation**: Add database indexes, optimize queries
- **Monitoring**: Track query performance metrics

### **Connection Issues:**
- **Mitigation**: Implement connection pooling, retry logic
- **Fallback**: Local cache for offline scenarios

---

*This plan provides a comprehensive roadmap for transforming the current system into a robust database-driven architecture.*

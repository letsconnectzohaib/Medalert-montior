-- Initial Database Schema for Vici-Monitor
-- Created: 2026-03-17
-- Purpose: Store real-time Vicidial monitoring data

-- Agent Logs Table
-- Stores individual agent status updates and activity
CREATE TABLE IF NOT EXISTS agent_logs (
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
-- Stores aggregated summary statistics for each data point
CREATE TABLE IF NOT EXISTS summary_stats (
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
-- Stores information about calls waiting in queue
CREATE TABLE IF NOT EXISTS waiting_calls (
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
-- Stores system metadata and configuration
CREATE TABLE IF NOT EXISTS meta_data (
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
-- Stores daily shift summaries and performance metrics
CREATE TABLE IF NOT EXISTS shift_logs (
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

-- Performance Indexes for Query Optimization
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_logs_shift_date ON agent_logs(shift_date);
CREATE INDEX IF NOT EXISTS idx_agent_logs_station ON agent_logs(station);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user ON agent_logs(user);

CREATE INDEX IF NOT EXISTS idx_summary_stats_timestamp ON summary_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_summary_stats_shift_date ON summary_stats(shift_date);

CREATE INDEX IF NOT EXISTS idx_waiting_calls_timestamp ON waiting_calls(timestamp);
CREATE INDEX IF NOT EXISTS idx_waiting_calls_shift_date ON waiting_calls(shift_date);
CREATE INDEX IF NOT EXISTS idx_waiting_calls_phone ON waiting_calls(phone);

CREATE INDEX IF NOT EXISTS idx_meta_data_timestamp ON meta_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_meta_data_shift_date ON meta_data(shift_date);

CREATE INDEX IF NOT EXISTS idx_shift_logs_date ON shift_logs(shift_date);

-- Views for Common Queries
CREATE VIEW IF NOT EXISTS latest_agent_status AS
SELECT 
    station,
    user,
    session,
    status,
    time,
    state_color,
    pause_code,
    campaign,
    calls,
    agent_group,
    MAX(timestamp) as latest_timestamp
FROM agent_logs
GROUP BY station, user
ORDER BY latest_timestamp DESC;

CREATE VIEW IF NOT EXISTS current_shift_summary AS
SELECT 
    COUNT(DISTINCT user) as total_agents,
    COUNT(CASE WHEN status = 'INCALL' THEN 1 END) as agents_in_calls,
    COUNT(CASE WHEN status = 'READY' THEN 1 END) as agents_ready,
    COUNT(CASE WHEN status = 'PAUSED' THEN 1 END) as agents_paused,
    COUNT(CASE WHEN status = 'DISPO' THEN 1 END) as agents_dispo,
    COUNT(CASE WHEN status IN ('DEAD', 'OFFLINE') THEN 1 END) as agents_dead,
    SUM(calls) as total_calls_today
FROM agent_logs
WHERE shift_date = DATE('now')
AND timestamp >= datetime('now', '-8 hours');

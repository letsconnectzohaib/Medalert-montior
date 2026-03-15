-- SQL script to add performance-critical indexes to the agent_log table.
-- This should be run once on the database to improve query performance.

-- Index on shift_date, campaign, and agent_group for fast filtering of summary and trend data.
CREATE INDEX IF NOT EXISTS idx_agent_log_filters ON agent_log (shift_date, campaign, agent_group);

-- Index on timestamp for efficient time-based queries, such as real-time monitoring.
CREATE INDEX IF NOT EXISTS idx_agent_log_timestamp ON agent_log (timestamp);

-- Index on agent_id for quickly looking up the performance of a single agent.
CREATE INDEX IF NOT EXISTS idx_agent_log_agent_id ON agent_log (agent_id);

PRAGMA index_list(agent_log);

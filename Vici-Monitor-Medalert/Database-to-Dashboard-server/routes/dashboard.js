// Dashboard Data Routes
const express = require('express');
const router = express.Router();

/**
 * Get latest summary for dashboard
 */
router.get('/summary/latest', async (req, res) => {
    try {
        const summary = await req.runSingleQuery(`
            SELECT * FROM summary_stats 
            ORDER BY timestamp DESC 
            LIMIT 1
        `);
        res.json({ 
            success: true, 
            data: summary 
        });
    } catch (error) {
        console.error('❌ Error fetching latest summary:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get current agents for dashboard
 */
router.get('/agents/current', async (req, res) => {
    try {
        const agents = await req.runQuery(`
            SELECT * FROM agent_logs 
            WHERE shift_date = DATE('now')
            ORDER BY timestamp DESC
            LIMIT 100
        `);
        res.json({ 
            success: true, 
            data: agents 
        });
    } catch (error) {
        console.error('❌ Error fetching current agents:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get waiting calls for dashboard
 */
router.get('/waiting-calls', async (req, res) => {
    try {
        const calls = await req.runQuery(`
            SELECT * FROM waiting_calls 
            WHERE shift_date = DATE('now')
            ORDER BY timestamp DESC
            LIMIT 50
        `);
        res.json({ 
            success: true, 
            data: calls 
        });
    } catch (error) {
        console.error('❌ Error fetching waiting calls:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get dashboard summary (combined data for main dashboard)
 */
router.get('/summary', async (req, res) => {
    try {
        // Get all required data in parallel
        const [summary, agents, waitingCalls, metadata] = await Promise.all([
            req.runSingleQuery(`
                SELECT * FROM summary_stats 
                ORDER BY timestamp DESC 
                LIMIT 1
            `),
            req.runQuery(`
                SELECT * FROM agent_logs 
                WHERE shift_date = DATE('now')
                ORDER BY timestamp DESC
                LIMIT 100
            `),
            req.runQuery(`
                SELECT * FROM waiting_calls 
                WHERE shift_date = DATE('now')
                ORDER BY timestamp DESC
                LIMIT 50
            `),
            req.runSingleQuery(`
                SELECT * FROM meta_data 
                ORDER BY timestamp DESC 
                LIMIT 1
            `)
        ]);

        // Format data for dashboard consumption
        const dashboardData = {
            timestamp: new Date().toISOString(),
            summary: {
                activeCalls: summary?.active_calls || 0,
                agentsLoggedIn: summary?.agents_logged_in || 0,
                agentsInCalls: summary?.agents_in_calls || 0,
                callsWaiting: summary?.calls_waiting || 0,
                agentsPaused: summary?.agents_paused || 0,
                agentsWaiting: summary?.agents_waiting || 0,
                agentsDispo: summary?.agents_dispo || 0,
                agentsDead: summary?.agents_dead || 0,
                ringingCalls: summary?.ringing_calls || 0,
                ivrCalls: summary?.ivr_calls || 0,
                totalCalls: summary?.total_calls || 0,
                droppedPercentage: summary?.dropped_percentage || '0%'
            },
            details: {
                agents: agents.map(agent => ({
                    station: agent.station,
                    user: agent.user,
                    session: agent.session,
                    status: agent.status,
                    time: agent.time,
                    stateColor: agent.state_color,
                    pauseCode: agent.pause_code,
                    campaign: agent.campaign,
                    calls: agent.calls,
                    group: agent.agent_group
                })),
                waitingCalls: waitingCalls.map(call => ({
                    phone: call.phone,
                    campaign: call.campaign,
                    status: call.status,
                    server: call.server,
                    dialtime: call.dial_time,
                    callType: call.call_type,
                    priority: call.priority
                }))
            },
            meta: {
                dialLevel: metadata?.dial_level,
                dialableLeads: metadata?.dialable_leads || 0,
                callsToday: metadata?.calls_today || 0,
                droppedAnswered: metadata?.dropped_answered || 0
            }
        };

        res.json({ 
            success: true, 
            data: dashboardData 
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard summary:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;

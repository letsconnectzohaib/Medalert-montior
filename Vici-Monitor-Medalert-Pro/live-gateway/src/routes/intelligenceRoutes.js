const express = require("express");

function toIsoDate(value) {
  return String(value || "").slice(0, 10);
}

function parseLimit(value, fallback = 50, max = 500) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(n)));
}

function createIntelligenceRoutes({
  requireAuth,
  computeShiftDate,
  computeInsights,
  listShiftDates,
  getCampaignSnapshotStats,
  getAgentSnapshotStats,
  getAgentStateTransitions,
}) {
  const router = express.Router();

  router.get("/api/intelligence/data", requireAuth, async (req, res) => {
    try {
      const date = req.query.date || (await computeShiftDate(new Date().toISOString()));
      const insights = await computeInsights({ shiftDate: toIsoDate(date) });
      
      // Mock intelligence data structure for React dashboard
      const mockData = {
        success: true,
        data: {
          overallScore: 85,
          scoreTrend: 5.2,
          efficiency: 78.5,
          utilization: 82.1,
          serviceLevel: 91.3,
          qualityScore: 87.8,
          callVolume: 1247,
          callVolumeTrend: 3.8,
          avgResponseTime: 28,
          responseTimeTrend: -2,
          conversionRate: 12.4,
          conversionRateTrend: 1.2,
          agentProductivity: 89.2,
          productivityTrend: 4.1,
          predictions: [
            {
              metric: "Call Volume",
              currentValue: "1,247",
              predictedValue: "1,320",
              confidence: 85,
              timeframe: "Next 24h",
              trend: "up",
              change: 5.8
            },
            {
              metric: "Response Time",
              currentValue: "28s",
              predictedValue: "25s",
              confidence: 78,
              timeframe: "Next 24h",
              trend: "up",
              change: -10.7
            },
            {
              metric: "Agent Efficiency",
              currentValue: "89.2%",
              predictedValue: "91.5%",
              confidence: 82,
              timeframe: "Next shift",
              trend: "up",
              change: 2.3
            }
          ],
          insights: [
            {
              severity: "medium",
              category: "Performance",
              description: "Call volume increased by 15% compared to yesterday",
              impact: "May require additional staffing"
            },
            {
              severity: "low",
              category: "Quality",
              description: "Average response time improved by 10%",
              impact: "Positive customer experience impact"
            }
          ],
          recommendations: [
            {
              priority: "high",
              category: "Staffing",
              title: "Increase agent coverage",
              description: "Consider adding 2-3 agents during peak hours (2-4 PM)",
              expectedImpact: "Reduce wait times by 30%"
            },
            {
              priority: "medium",
              category: "Training",
              title: "Refine call handling procedures",
              description: "Focus on reducing average handle time by 15 seconds",
              expectedImpact: "Improve overall efficiency by 5%"
            }
          ],
          trends: [
            {
              metric: "Daily Call Volume",
              change: 12.5,
              period: "7 days"
            },
            {
              metric: "Agent Productivity",
              change: 4.2,
              period: "7 days"
            },
            {
              metric: "Service Level",
              change: -1.8,
              period: "7 days"
            }
          ]
        }
      };
      
      res.json(mockData);
    } catch (e) {
      res.status(500).json({
        success: false,
        error: e?.message || "intelligence_data_failed",
      });
    }
  });

  router.get("/api/intelligence/insights", requireAuth, async (req, res) => {
    try {
      const date =
        req.query.date || (await computeShiftDate(new Date().toISOString()));
      const out = await computeInsights({ shiftDate: toIsoDate(date) });
      res.json(out);
    } catch (e) {
      res.status(500).json({
        success: false,
        error: e?.message || "intelligence_insights_failed",
      });
    }
  });

  router.get("/api/intelligence/shift-dates", requireAuth, async (req, res) => {
    try {
      if (typeof listShiftDates !== "function") {
        return res.status(501).json({
          success: false,
          error: "shift_dates_not_available",
        });
      }

      const limit = parseLimit(req.query.limit, 60, 365);
      const desc = String(req.query.desc || "1") !== "0";
      const dates = await listShiftDates({ limit, desc });

      res.json({
        success: true,
        dates,
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        error: e?.message || "intelligence_shift_dates_failed",
      });
    }
  });

  router.get("/api/intelligence/campaigns", requireAuth, async (req, res) => {
    try {
      if (typeof getCampaignSnapshotStats !== "function") {
        return res.status(501).json({
          success: false,
          error: "campaign_stats_not_available",
        });
      }

      const date =
        req.query.date || (await computeShiftDate(new Date().toISOString()));
      const limit = parseLimit(req.query.limit, 60, 500);
      const campaigns = await getCampaignSnapshotStats({
        shiftDate: toIsoDate(date),
        limit,
      });

      res.json({
        success: true,
        shiftDate: toIsoDate(date),
        campaigns,
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        error: e?.message || "intelligence_campaigns_failed",
      });
    }
  });

  router.get("/api/intelligence/agents", requireAuth, async (req, res) => {
    try {
      if (typeof getAgentSnapshotStats !== "function") {
        return res.status(501).json({
          success: false,
          error: "agent_stats_not_available",
        });
      }

      const date =
        req.query.date || (await computeShiftDate(new Date().toISOString()));
      const limit = parseLimit(req.query.limit, 80, 500);
      const agents = await getAgentSnapshotStats({
        shiftDate: toIsoDate(date),
        limit,
      });

      res.json({
        success: true,
        shiftDate: toIsoDate(date),
        agents,
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        error: e?.message || "intelligence_agents_failed",
      });
    }
  });

  router.get("/api/intelligence/transitions", requireAuth, async (req, res) => {
    try {
      if (typeof getAgentStateTransitions !== "function") {
        return res.status(501).json({
          success: false,
          error: "agent_transitions_not_available",
        });
      }

      const date =
        req.query.date || (await computeShiftDate(new Date().toISOString()));
      const limit = parseLimit(req.query.limit, 80, 500);
      const transitions = await getAgentStateTransitions({
        shiftDate: toIsoDate(date),
        limit,
      });

      res.json({
        success: true,
        shiftDate: toIsoDate(date),
        ...transitions,
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        error: e?.message || "intelligence_transitions_failed",
      });
    }
  });

  return router;
}

module.exports = { createIntelligenceRoutes };

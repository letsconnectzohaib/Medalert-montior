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

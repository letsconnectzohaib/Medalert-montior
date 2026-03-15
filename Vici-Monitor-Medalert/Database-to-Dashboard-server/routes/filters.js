
const express = require('express');
const router = express.Router();

// GET /api/filters/campaigns
router.get('/campaigns', async (req, res) => {
  const db = req.db;
  try {
    const campaigns = await db.all("SELECT DISTINCT campaign as name FROM agent_log ORDER BY campaign");
    res.json({ success: true, data: campaigns.map(c => c.name) });
  } catch (err) {
    console.error("Error fetching campaigns:", err.message);
    res.status(500).json({ success: false, error: 'Database query for campaigns failed' });
  }
});

// GET /api/filters/groups
router.get('/groups', async (req, res) => {
    const db = req.db;
    try {
        const groups = await db.all("SELECT DISTINCT agent_group as name FROM agent_log WHERE agent_group IS NOT NULL ORDER BY agent_group");
        res.json({ success: true, data: groups.map(g => g.name) });
    } catch (err) {
        console.error("Error fetching groups:", err.message);
        res.status(500).json({ success: false, error: 'Database query for groups failed' });
    }
  });


module.exports = router;

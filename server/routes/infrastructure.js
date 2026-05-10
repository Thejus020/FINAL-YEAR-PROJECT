const express = require("express");
const auth = require("../middleware/authMiddleware");
const { getMetrics, getMetricsHistory } = require("../infrastructure/metricsCollector");
const { getDeploymentHealth } = require("../infrastructure/deploymentHealth");
const { getTopology } = require("../infrastructure/topologyService");

const router = express.Router();

// GET /api/infrastructure/stats — current metrics + history
router.get("/stats", auth, async (req, res) => {
  try {
    const current = await getMetrics();
    const history = getMetricsHistory();
    res.json({ current, history });
  } catch (err) {
    res.status(500).json({ error: "Failed to collect metrics: " + err.message });
  }
});

// GET /api/infrastructure/health — deployment health analytics
router.get("/health", auth, async (req, res) => {
  try {
    const health = await getDeploymentHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: "Failed to get deployment health: " + err.message });
  }
});

// GET /api/infrastructure/topology — live topology graph
router.get("/topology", auth, async (req, res) => {
  try {
    const topology = await getTopology();
    res.json(topology);
  } catch (err) {
    res.status(500).json({ error: "Failed to build topology: " + err.message });
  }
});

module.exports = router;

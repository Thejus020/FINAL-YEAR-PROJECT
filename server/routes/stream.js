const express = require("express");
const auth = require("../middleware/authMiddleware");
const Build = require("../models/Build");
const { sseAllowOrigin } = require("../corsAllowlist");

const router = express.Router();

// In-memory SSE client registry: buildId -> Set of res objects
const sseClients = new Map();

// Register a new SSE client for a build
router.get("/builds/:buildId", auth, async (req, res) => {
  const { buildId } = req.params;

  // Verify build exists
  const build = await Build.findById(buildId);
  if (!build) return res.status(404).json({ error: "Build not found" });

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", sseAllowOrigin(req));
  res.flushHeaders();

  // Send all existing logs immediately (catch-up)
  for (const log of build.logs) {
    res.write(
      `data: ${JSON.stringify({ type: "log", message: log.message, level: log.level, timestamp: log.timestamp })}\n\n`
    );
  }

  // If build already finished, send done and close
  if (build.status === "success" || build.status === "failed") {
    res.write(`data: ${JSON.stringify({ type: "done", status: build.status })}\n\n`);
    return res.end();
  }

  // Register client
  if (!sseClients.has(buildId)) sseClients.set(buildId, new Set());
  sseClients.get(buildId).add(res);

  // Heartbeat every 20s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 20000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.get(buildId)?.delete(res);
    if (sseClients.get(buildId)?.size === 0) sseClients.delete(buildId);
  });
});

// Helper: broadcast a log line to all SSE clients watching a build
function broadcastLog(buildId, message, level = "info") {
  const clients = sseClients.get(String(buildId));
  if (!clients || clients.size === 0) return;
  const payload = JSON.stringify({ type: "log", message, level, timestamp: new Date() });
  for (const client of clients) {
    client.write(`data: ${payload}\n\n`);
  }
}

// Helper: broadcast done event and clean up clients
function broadcastDone(buildId, status) {
  const clients = sseClients.get(String(buildId));
  if (!clients || clients.size === 0) return;
  const payload = JSON.stringify({ type: "done", status });
  for (const client of clients) {
    client.write(`data: ${payload}\n\n`);
    client.end();
  }
  sseClients.delete(String(buildId));
}

module.exports = router;
module.exports.broadcastLog = broadcastLog;
module.exports.broadcastDone = broadcastDone;

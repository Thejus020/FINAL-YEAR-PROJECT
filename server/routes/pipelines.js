const express = require("express");
const axios = require("axios");
const auth = require("../middleware/authMiddleware");
const Pipeline = require("../models/Pipeline");
const Build = require("../models/Build");
const User = require("../models/User");
const { broadcastLog } = require("./stream");

// Import Services and Utils
const { runRealBuild } = require("../services/deploymentService");
const { createGithubWebhook, isValidGithubSignature } = require("../utils/gitUtils");

const router = express.Router();

async function appendLog(buildId, message, level = "info") {
  const entry = { message, level, timestamp: new Date() };
  broadcastLog(String(buildId), message, level);
  await Build.findByIdAndUpdate(buildId, { $push: { logs: entry } });
}

// ── GET all pipelines for logged-in user ──────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const pipelines = await Pipeline.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(pipelines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create a new pipeline ────────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { name, repo, branch, envVars } = req.body;
    if (!name || !repo) return res.status(400).json({ error: "name and repo are required" });

    const pipeline = await Pipeline.create({
      name,
      repo,
      branch: branch || "main",
      owner: req.user._id,
      envVars: envVars || [],
    });

    const user = await User.findById(req.user._id);
    if (user?.accessToken && repo.includes("github.com")) {
      const serverUrl = process.env.SERVER_URL || \`${req.protocol}://${req.get("host")}\`;
      createGithubWebhook(user.accessToken, pipeline._id, repo, pipeline.webhookSecret, serverUrl);
    }

    res.status(201).json(pipeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single pipeline ───────────────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const pipeline = await Pipeline.findOne({ _id: req.params.id, owner: req.user._id });
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update pipeline environment variables ─────────────────────────────────
router.put("/:id/env", auth, async (req, res) => {
  try {
    const { envVars } = req.body;
    const pipeline = await Pipeline.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { envVars: envVars || [] },
      { new: true }
    );
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE pipeline (+ all its builds) ───────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const pipeline = await Pipeline.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
    await Build.deleteMany({ pipeline: req.params.id });
    res.json({ message: "Pipeline deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST manually trigger a run ───────────────────────────────────────────────
router.post("/:id/run", auth, async (req, res) => {
  try {
    const pipeline = await Pipeline.findOne({ _id: req.params.id, owner: req.user._id });
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });

    const build = await Build.create({
      pipeline: pipeline._id,
      status: "running",
      triggeredBy: "manual",
      startedAt: new Date(),
    });

    pipeline.status = "running";
    pipeline.lastBuildAt = new Date();
    await pipeline.save();

    res.status(201).json({ build });

    runRealBuild(pipeline, build, appendLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST GitHub webhook auto-trigger ─────────────────────────────────────────
router.post("/:id/webhook", async (req, res) => {
  try {
    const pipeline = await Pipeline.findById(req.params.id);
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });

    const signature = req.headers["x-hub-signature-256"];
    const hasSecret = Boolean(pipeline.webhookSecret);
    if (hasSecret) {
      if (!signature) return res.status(401).json({ error: "Missing webhook signature" });
      if (!isValidGithubSignature(req.rawBody, signature, pipeline.webhookSecret)) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
    }

    const pushedBranch = req.body?.ref?.replace("refs/heads/", "");
    if (pushedBranch && pushedBranch !== pipeline.branch) {
      return res.json({ message: \`Ignored push to ${pushedBranch}, watching ${pipeline.branch}\` });
    }

    const build = await Build.create({
      pipeline: pipeline._id,
      status: "running",
      triggeredBy: "webhook",
      startedAt: new Date(),
    });

    pipeline.status = "running";
    pipeline.lastBuildAt = new Date();
    await pipeline.save();

    res.json({ message: "Build triggered", buildId: build._id });

    runRealBuild(pipeline, build, appendLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST trigger Jenkins build ────────────────────────────────────────────────
router.post("/:id/jenkins", auth, async (req, res) => {
  try {
    const { JENKINS_URL, JENKINS_USER, JENKINS_TOKEN, JENKINS_JOB } = process.env;
    if (!JENKINS_URL) return res.status(400).json({ error: "Jenkins not configured" });

    const url = \`${JENKINS_URL}/job/${JENKINS_JOB}/build\`;
    const response = await axios.post(url, null, {
      auth: { username: JENKINS_USER, password: JENKINS_TOKEN },
      validateStatus: (s) => s < 400 || s === 201,
    });

    res.json({ message: "Jenkins build triggered", status: response.status });
  } catch (err) {
    res.status(500).json({ error: "Jenkins trigger failed: " + err.message });
  }
});

module.exports = router;

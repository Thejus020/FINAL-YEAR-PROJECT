const express = require("express");
const auth = require("../middleware/authMiddleware");
const Build = require("../models/Build");
const Pipeline = require("../models/Pipeline");

const router = express.Router();

// GET all builds for a pipeline
router.get("/pipeline/:pipelineId", auth, async (req, res) => {
  try {
    // Verify pipeline belongs to user
    const pipeline = await Pipeline.findOne({
      _id: req.params.pipelineId,
      owner: req.user._id,
    });
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });

    const builds = await Build.find({ pipeline: req.params.pipelineId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("-logs"); // exclude logs in list view for performance
    res.json(builds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single build with full logs
router.get("/:id", auth, async (req, res) => {
  try {
    const build = await Build.findById(req.params.id).populate("pipeline", "name repo branch owner");
    if (!build) return res.status(404).json({ error: "Build not found" });

    // Verify ownership
    if (String(build.pipeline.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(build);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a build
router.delete("/:id", auth, async (req, res) => {
  try {
    const build = await Build.findById(req.params.id).populate("pipeline", "owner");
    if (!build) return res.status(404).json({ error: "Build not found" });
    if (String(build.pipeline.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await build.deleteOne();
    res.json({ message: "Build deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

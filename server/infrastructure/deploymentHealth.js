const Build = require("../models/Build");
const Pipeline = require("../models/Pipeline");

async function getDeploymentHealth() {
  const [totalBuilds, successBuilds, failedBuilds, recentBuilds] =
    await Promise.all([
      Build.countDocuments(),
      Build.countDocuments({ status: "success" }),
      Build.countDocuments({ status: "failed" }),
      Build.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("pipeline", "name")
        .lean(),
    ]);

  const runningBuilds = await Build.countDocuments({ status: "running" });

  const lastBuild = recentBuilds[0] || null;
  const successRate =
    totalBuilds > 0 ? Math.round((successBuilds / totalBuilds) * 1000) / 10 : 0;

  // Deployment history for chart (last 10 builds with duration)
  const deploymentHistory = recentBuilds.map((b) => ({
    id: b._id,
    pipeline: b.pipeline?.name || "Unknown",
    status: b.status,
    triggeredBy: b.triggeredBy,
    duration: b.duration || null,
    createdAt: b.createdAt,
  }));

  return {
    totalBuilds,
    successBuilds,
    failedBuilds,
    runningBuilds,
    successRate,
    lastDeployment: lastBuild
      ? {
          pipeline: lastBuild.pipeline?.name || "Unknown",
          status: lastBuild.status,
          time: lastBuild.createdAt,
          duration: lastBuild.duration,
        }
      : null,
    deploymentHistory,
  };
}

module.exports = { getDeploymentHealth };

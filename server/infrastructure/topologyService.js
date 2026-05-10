const mongoose = require("mongoose");
const axios = require("axios");
const Pipeline = require("../models/Pipeline");
const Build = require("../models/Build");

async function getTopology() {
  // 1. Backend API — self health check
  let backendStatus = "offline";
  try {
    const port = process.env.PORT || 5000;
    const res = await axios.get(`http://localhost:${port}/health`, {
      timeout: 3000,
    });
    backendStatus = res.data?.status === "ok" ? "online" : "warning";
  } catch {
    backendStatus = "offline";
  }

  // 2. MongoDB — connection state
  let dbStatus = "offline";
  const readyState = mongoose.connection.readyState;
  if (readyState === 1) dbStatus = "online";
  else if (readyState === 2) dbStatus = "warning"; // connecting
  else dbStatus = "offline";

  // 3. CI/CD Engine — based on active pipeline builds
  let cicdStatus = "idle";
  const runningBuilds = await Build.countDocuments({ status: "running" });
  if (runningBuilds > 0) cicdStatus = "deploying";
  else {
    const recentSuccess = await Build.findOne({ status: "success" })
      .sort({ createdAt: -1 })
      .lean();
    cicdStatus = recentSuccess ? "online" : "idle";
  }

  // 4. Frontend — check if any pipeline has a deployed frontend URL
  let frontendStatus = "offline";
  const pipelineWithFrontend = await Pipeline.findOne({
    "deployedUrls.label": "Frontend UI",
  }).lean();
  if (pipelineWithFrontend) {
    const frontendUrl = pipelineWithFrontend.deployedUrls.find(
      (u) => u.label === "Frontend UI"
    );
    if (frontendUrl?.url) {
      try {
        await axios.get(frontendUrl.url, { timeout: 5000 });
        frontendStatus = "online";
      } catch {
        frontendStatus = "warning";
      }
    }
  } else {
    frontendStatus = "idle";
  }

  // 5. Monitoring — always active since this service is responding
  const monitoringStatus = "online";

  // Build nodes
  const nodes = [
    {
      id: "frontend",
      label: "Frontend App",
      icon: "🌐",
      status: frontendStatus,
      description: "Deployed via Surge",
    },
    {
      id: "backend",
      label: "Backend API",
      icon: "⚙️",
      status: backendStatus,
      description: "Node.js + Express",
    },
    {
      id: "database",
      label: "MongoDB",
      icon: "🗄️",
      status: dbStatus,
      description: "Cloud Atlas / Local",
    },
    {
      id: "cicd",
      label: "CI/CD Engine",
      icon: "🔄",
      status: cicdStatus,
      description: "Pipeline Orchestrator",
    },
    {
      id: "monitoring",
      label: "Monitoring",
      icon: "📊",
      status: monitoringStatus,
      description: "Infrastructure Monitor",
    },
  ];

  // Build edges (connections between services)
  const edges = [
    { source: "frontend", target: "backend", label: "API Calls" },
    { source: "backend", target: "database", label: "Queries" },
    { source: "cicd", target: "backend", label: "Deploys" },
    { source: "cicd", target: "frontend", label: "Builds" },
    { source: "monitoring", target: "backend", label: "Health Checks" },
    { source: "monitoring", target: "database", label: "Status" },
  ];

  return { nodes, edges };
}

module.exports = { getTopology };

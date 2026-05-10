const crypto = require("crypto");
const axios = require("axios");
const Pipeline = require("../models/Pipeline");
const { normalizeRepoToHttps } = require("../utils/gitUtils");
const { getNodeStartCommand } = require("../utils/projectUtils");

function getRenderRootDir(project) {
  return project.relPath || null;
}

function unwrapRenderService(payload) {
  return payload?.service || payload;
}

function buildRenderEnvVars(pipelineEnvVars, serviceUrl) {
  const merged = {
    NODE_VERSION: process.env.NODE_VERSION || "20",
    SERVER_URL: serviceUrl,
    GITHUB_CALLBACK_URL: `${serviceUrl}/auth/github/callback`,
  };

  const forwardedKeys = [
    "MONGO_URI",
    "JWT_SECRET",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "CLIENT_URL",
    "ALLOWED_ORIGINS",
    "GEMINI_API_KEY",
  ];

  for (const key of forwardedKeys) {
    if (process.env[key]) merged[key] = process.env[key];
  }

  for (const [key, value] of Object.entries(pipelineEnvVars || {})) {
    if (key) merged[key] = value;
  }

  return Object.entries(merged).map(([key, value]) => ({ key, value: String(value) }));
}

async function updateRenderServiceConfig(api, serviceId, pipeline, project) {
  const startCommand = await getNodeStartCommand(project);
  if (!startCommand) return;

  const rootDir = getRenderRootDir(project);
  await api.patch(`/services/${serviceId}`, {
    repo: normalizeRepoToHttps(pipeline.repo),
    ...(rootDir ? { rootDir } : {}),
    serviceDetails: {
      envSpecificDetails: {
        buildCommand: "npm install",
        startCommand,
      },
    },
  });
}

async function deployToRender({ pipeline, buildId, project, envVars, appendLogFunc }) {
  const apiKey = process.env.RENDER_API_KEY;
  const ownerId = process.env.RENDER_OWNER_ID;

  if (!apiKey || !ownerId) {
    await appendLogFunc(buildId, "ℹ️ Render deployment skipped: RENDER_API_KEY or RENDER_OWNER_ID missing.", "warn");
    return null;
  }

  await appendLogFunc(buildId, `🚀 Orchestrating backend deployment to Render...`);

  try {
    const api = axios.create({
      baseURL: "https://api.render.com/v1",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });

    let serviceId = pipeline.renderServiceId;

    if (!serviceId) {
      // Create new service
      const randomSuffix = crypto.randomBytes(3).toString("hex");
      const serviceName = `${pipeline.name}-backend-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const renderPlan = process.env.RENDER_PLAN || "free";
      const serviceUrl = `https://${serviceName}.onrender.com`;
      const renderEnvVars = buildRenderEnvVars(envVars, serviceUrl);
      const startCommand = await getNodeStartCommand(project);
      const rootDir = getRenderRootDir(project);
      
      if (!startCommand) {
        await appendLogFunc(buildId, "Render backend deployment skipped: no start script or server entry file found.", "warn");
        return null;
      }
      
      await appendLogFunc(buildId, `Creating new Render Web Service: ${serviceName} (${renderPlan} plan)`);
      
      const res = await api.post("/services", {
        type: "web_service",
        name: serviceName,
        ownerId,
        repo: normalizeRepoToHttps(pipeline.repo),
        ...(rootDir ? { rootDir } : {}),
        envVars: renderEnvVars,
        serviceDetails: {
          env: "node",
          plan: renderPlan,
          envSpecificDetails: {
            buildCommand: "npm install",
            startCommand,
          },
        },
      });
      
      const createdService = unwrapRenderService(res.data);
      serviceId = createdService?.id;
      if (!serviceId) {
        throw new Error(`Render service creation returned no service id: ${JSON.stringify(res.data)}`);
      }
      
      await Pipeline.findByIdAndUpdate(pipeline._id, { renderServiceId: serviceId });
    } else {
      // Trigger new deploy on existing service
      try {
        await appendLogFunc(buildId, `🔄 Triggering existing Render service deployment (${serviceId})`);
        await updateRenderServiceConfig(api, serviceId, pipeline, project);
        await api.post(`/services/${serviceId}/deploys`);
      } catch (existingErr) {
        const status = existingErr.response?.status;
        if (status === 404) {
          // Service was deleted on Render — clear stale ID and create a new one
          await appendLogFunc(buildId, `⚠️ Render service ${serviceId} no longer exists. Clearing stale ID and creating a new service...`, "warn");
          await Pipeline.findByIdAndUpdate(pipeline._id, { $unset: { renderServiceId: "" } });
          // Retry with a fresh pipeline object (no renderServiceId)
          const refreshedPipeline = await Pipeline.findById(pipeline._id);
          return deployToRender({ pipeline: refreshedPipeline, buildId, project, envVars, appendLogFunc });
        }
        throw existingErr;
      }
    }

    // Get the URL
    const serviceRes = await api.get(`/services/${serviceId}`);
    const service = unwrapRenderService(serviceRes.data);
    const url = service?.serviceDetails?.url || service?.url;
    if (!url) {
      throw new Error(`Render service ${serviceId} did not include a public URL yet.`);
    }
    await appendLogFunc(buildId, `🌐 Backend is live at: ${url}`, "success");

    // Post-deployment: remind user about GitHub OAuth callback URL
    const callbackUrl = `${url}/auth/github/callback`;
    await appendLogFunc(buildId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "info");
    await appendLogFunc(buildId, `⚙️  POST-DEPLOYMENT CONFIGURATION`, "info");
    await appendLogFunc(buildId, `If your app uses GitHub OAuth, update your GitHub OAuth App settings:`, "info");
    await appendLogFunc(buildId, `   → Authorization callback URL: ${callbackUrl}`, "info");
    await appendLogFunc(buildId, `   → Homepage URL: ${url}`, "info");
    await appendLogFunc(buildId, `   Go to: https://github.com/settings/developers`, "info");
    await appendLogFunc(buildId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "info");

    return url;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    if (/payment information|billing|add a card/i.test(msg)) {
      await appendLogFunc(
        buildId,
        `Render deployment skipped: ${msg}. Add billing in Render, remove Render env vars, or use an existing renderServiceId to deploy backend.`,
        "warn"
      );
      return null;
    }
    throw new Error(`Render deployment failed: ${msg}`);
  }
}

module.exports = {
  deployToRender
};

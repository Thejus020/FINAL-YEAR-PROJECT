const express = require("express");
const auth = require("../middleware/authMiddleware");
const Pipeline = require("../models/Pipeline");
const Build = require("../models/Build");
const User = require("../models/User");
const { broadcastLog, broadcastDone } = require("./stream");
const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const crypto = require("crypto");

const router = express.Router();

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

    // Auto-create GitHub webhook if possible
    const user = await User.findById(req.user._id);
    if (user?.accessToken && repo.includes("github.com")) {
      const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`;
      // Run async in background
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

    // Create build record
    const build = await Build.create({
      pipeline: pipeline._id,
      status: "running",
      triggeredBy: "manual",
      startedAt: new Date(),
    });

    pipeline.status = "running";
    pipeline.lastBuildAt = new Date();
    await pipeline.save();

    // Respond immediately with build ID so frontend can connect SSE
    res.status(201).json({ build });

    // Run real pipeline async
    runRealBuild(pipeline, build);
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
      return res.json({ message: `Ignored push to ${pushedBranch}, watching ${pipeline.branch}` });
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

    runRealBuild(pipeline, build);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST trigger Jenkins build ────────────────────────────────────────────────
router.post("/:id/jenkins", auth, async (req, res) => {
  try {
    const { JENKINS_URL, JENKINS_USER, JENKINS_TOKEN, JENKINS_JOB } = process.env;
    if (!JENKINS_URL) return res.status(400).json({ error: "Jenkins not configured" });

    const url = `${JENKINS_URL}/job/${JENKINS_JOB}/build`;
    const response = await axios.post(url, null, {
      auth: { username: JENKINS_USER, password: JENKINS_TOKEN },
      validateStatus: (s) => s < 400 || s === 201, // Jenkins returns 201
    });

    res.json({ message: "Jenkins build triggered", status: response.status });
  } catch (err) {
    res.status(500).json({ error: "Jenkins trigger failed: " + err.message });
  }
});

async function appendLog(buildId, message, level = "info") {
  const entry = { message, level, timestamp: new Date() };
  broadcastLog(String(buildId), message, level);
  await Build.findByIdAndUpdate(buildId, { $push: { logs: entry } });
}

function isValidGithubSignature(rawBody, signatureHeader, secret) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(String(signatureHeader));
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

async function createGithubWebhook(userToken, pipelineId, repoUrl, secret, serverUrl) {
  try {
    const normalized = normalizeRepoToHttps(repoUrl);
    // Extract owner and repo from https://github.com/owner/repo(.git)
    const match = normalized.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (!match) return;

    const owner = match[1];
    const repo = match[2];
    const webhookUrl = `${serverUrl.replace(/\/$/, "")}/pipelines/${pipelineId}/webhook`;

    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret: secret,
          insecure_ssl: "0",
        },
      },
      {
        headers: {
          Authorization: `token ${userToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    console.log(`✅ GitHub Webhook automatically created for ${owner}/${repo}`);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error(`⚠️ GitHub Webhook auto-creation skipped/failed: ${msg}`);
  }
}

function normalizeRepoToHttps(repo) {
  if (!repo) return "";
  const trimmed = repo.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("git@github.com:")) {
    return `https://github.com/${trimmed.replace("git@github.com:", "")}`;
  }
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return `https://github.com/${trimmed}.git`;
  return trimmed;
}

function withGithubToken(repoUrl, token) {
  if (!token) return repoUrl;
  try {
    const u = new URL(repoUrl);
    if (u.hostname !== "github.com") return repoUrl;
    u.username = "x-access-token";
    u.password = token;
    return u.toString();
  } catch {
    return repoUrl;
  }
}

function runCommand(command, args, cwd, onLine, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      env: { ...process.env, ...options.env },
    });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeoutMs);

    const stream = (buf, level) => {
      const text = String(buf || "");
      const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
      for (const line of lines) {
        Promise.resolve(onLine(line, level)).catch(() => {});
      }
    };

    proc.stdout.on("data", (d) => stream(d, "info"));
    proc.stderr.on("data", (d) => stream(d, "warn"));
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        return reject(new Error(`${command} timed out after ${Math.floor(timeoutMs / 1000)}s`));
      }
      if (code === 0) return resolve();
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function runCommandCapture(command, args, cwd, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30 * 1000;
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      env: { ...process.env, ...options.env },
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeoutMs);

    proc.stdout.on("data", (d) => {
      stdout += String(d || "");
    });
    proc.stderr.on("data", (d) => {
      stderr += String(d || "");
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) return reject(new Error(`${command} timed out after ${Math.floor(timeoutMs / 1000)}s`));
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function detectDefaultBranch(repoUrl, cwd) {
  const { stdout } = await runCommandCapture("git", ["ls-remote", "--symref", repoUrl, "HEAD"], cwd);
  const line = stdout
    .split(/\r?\n/)
    .find((l) => l.startsWith("ref: refs/heads/") && l.endsWith("\tHEAD"));
  if (!line) return null;
  return line.replace("ref: refs/heads/", "").replace("\tHEAD", "").trim();
}

function computeDeterministicPort(id, base = 4300, spread = 300) {
  const str = String(id || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return base + (hash % spread);
}

async function pathExists(targetPath) {
  return fs
    .access(targetPath)
    .then(() => true)
    .catch(() => false);
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function detectFullStackProjects(workDir) {
  const candidates = ["", "client", "frontend", "web", "app", "server", "backend", "api"];
  const projects = [];

  for (const rel of candidates) {
    const dir = path.join(workDir, rel);
    const pkg = await readJsonIfExists(path.join(dir, "package.json"));
    if (pkg) {
      // Logic to determine type:
      const hasBuild = !!pkg.scripts?.build;
      const isNamedBackend = rel.match(/server|backend|api/i);
      const isNamedFrontend = rel.match(/client|frontend|web|app/i);

      let type = "backend";
      if (isNamedFrontend || (hasBuild && !isNamedBackend)) {
        type = "frontend";
      }

      // Priority 1 for specific subdirs, 0 for root (we prefer subdirs if both exist)
      projects.push({ relPath: rel, dir, packageJson: pkg, type, priority: rel === "" ? 0 : 1 });
    }
  }

  if (projects.length === 0) return null;
  return projects;
}

async function deployToRender({ pipeline, buildId, project, envVars }) {
  const apiKey = process.env.RENDER_API_KEY;
  const ownerId = process.env.RENDER_OWNER_ID;

  if (!apiKey || !ownerId) {
    await appendLog(buildId, "ℹ️ Render deployment skipped: RENDER_API_KEY or RENDER_OWNER_ID missing.", "warn");
    return null;
  }

  await appendLog(buildId, `🚀 Orchestrating backend deployment to Render...`);

  try {
    const api = axios.create({
      baseURL: "https://api.render.com/v1",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });

    let serviceId = pipeline.renderServiceId;
    let isNew = false;

    if (!serviceId) {
      // Create new service
      await appendLog(buildId, `✨ Creating new Render Web Service: ${pipeline.name}-backend`);
      const res = await api.post("/services", {
        type: "web_service",
        name: `${pipeline.name}-backend`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        ownerId,
        repo: normalizeRepoToHttps(pipeline.repo),
        serviceDetails: {
          runtime: "node",
          buildCommand: "npm install",
          startCommand: project.packageJson.scripts?.start ? "npm start" : "node index.js",
          envVars: Object.entries(envVars).map(([key, value]) => ({ key, value })),
        },
      });
      serviceId = res.data.id;
      isNew = true;
      await Pipeline.findByIdAndUpdate(pipeline._id, { renderServiceId: serviceId });
    } else {
      // Trigger new deploy
      await appendLog(buildId, `🔄 Triggering existing Render service deployment (${serviceId})`);
      await api.post(`/services/${serviceId}/deploys`);
    }

    // Get the URL
    const serviceRes = await api.get(`/services/${serviceId}`);
    const url = serviceRes.data.serviceDetails.url;
    await appendLog(buildId, `🌐 Backend is live at: ${url}`, "success");
    return url;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Render deployment failed: ${msg}`);
  }
}

async function deployToSurge({ pipeline, buildId, workDir, project }) {
  const surgeToken = process.env.SURGE_TOKEN;
  if (!surgeToken) {
    await appendLog(buildId, "ℹ️ Surge deployment skipped: No SURGE_TOKEN found.", "warn");
    return null;
  }

  const distDir = path.join(project.dir, "dist");
  const buildDir = path.join(project.dir, "build");
  let deployPath = "";
  if (await pathExists(distDir)) deployPath = distDir;
  else if (await pathExists(buildDir)) deployPath = buildDir;

  if (!deployPath) {
    await appendLog(buildId, "⚠️ Surge deployment skipped: No 'dist' or 'build' directory found.", "warn");
    return null;
  }

  const domain = `infraflow-${String(pipeline._id).slice(-8)}.surge.sh`;
  await appendLog(buildId, `🚀 Deploying static assets to Surge: https://${domain}`);

  try {
    await runCommand("npx", ["surge", deployPath, domain, "--token", surgeToken], workDir, (line) => {
      const safeLine = line.replace(new RegExp(surgeToken, "g"), "***");
      appendLog(buildId, safeLine);
    });
    return `https://${domain}`;
  } catch (err) {
    throw new Error(`Surge deployment failed: ${err.message}`);
  }
}

// ── Real build runner: clone + install + build ────────────────────────────────
async function runRealBuild(pipeline, build) {
  const workRoot = path.join(os.tmpdir(), "infraflow-builds");
  const workDir = path.join(workRoot, `${pipeline._id}-${build._id}`);

  try {
    await fs.mkdir(workRoot, { recursive: true });
    await appendLog(build._id, `🔗 Starting full-stack pipeline for ${pipeline.repo} (${pipeline.branch})`);

    const owner = await User.findById(pipeline.owner).select("accessToken");
    const normalizedRepo = normalizeRepoToHttps(pipeline.repo);
    const cloneUrl = withGithubToken(normalizedRepo, owner?.accessToken);

    await appendLog(build._id, `📦 Cloning repository (branch: ${pipeline.branch})`);
    try {
      await runCommand(
        "git",
        ["clone", "--depth", "1", "--branch", pipeline.branch, cloneUrl, workDir],
        workRoot,
        (line, level) => appendLog(build._id, line, level)
      );
    } catch (cloneErr) {
      const message = cloneErr?.message || "";
      if (/Remote branch .* not found/i.test(message)) {
        await appendLog(build._id, `⚠️ Branch '${pipeline.branch}' not found. Detecting repository default branch...`, "warn");
        const defaultBranch = await detectDefaultBranch(cloneUrl, workRoot);
        if (!defaultBranch) throw cloneErr;
        await appendLog(build._id, `🔁 Falling back to default branch '${defaultBranch}'`, "warn");
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
        await runCommand(
          "git",
          ["clone", "--depth", "1", "--branch", defaultBranch, cloneUrl, workDir],
          workRoot,
          (line, level) => appendLog(build._id, line, level)
        );
      } else {
        throw cloneErr;
      }
    }
    await appendLog(build._id, "✅ Clone complete", "success");

    const projects = await detectFullStackProjects(workDir);
    if (!projects || projects.length === 0) {
      throw new Error("No Node.js projects detected in the repository.");
    }

    // Better project selection: prioritize non-root directories if they exist
    const backend = projects
      .filter((p) => p.type === "backend")
      .sort((a, b) => b.priority - a.priority)[0];
    const frontend = projects
      .filter((p) => p.type === "frontend" || p.packageJson.scripts?.build)
      .sort((a, b) => b.priority - a.priority)[0];

    // Prepare Base Env
    const baseEnv = {};
    pipeline.envVars.forEach((ev) => { if (ev.key) baseEnv[ev.key] = ev.value; });

    const finalUrls = [];

    // 0. Docker Build & Push (If Dockerfile exists)
    const dockerfilePath = path.join(workDir, "Dockerfile");
    if (await pathExists(dockerfilePath)) {
      await appendLog(build._id, `🐳 Dockerfile detected. Initiating Docker Build & Push...`);
      const dockerUser = process.env.DOCKER_USERNAME;
      const dockerPass = process.env.DOCKER_PASSWORD;
      const imageName = `${dockerUser || "local"}/${pipeline.name.toLowerCase()}:${build._id}`;

      try {
        if (dockerUser && dockerPass) {
          await runCommand("docker", ["login", "-u", dockerUser, "-p", dockerPass], workDir, (line) => {
            if (!line.includes("password") && !line.includes("Login Succeeded")) appendLog(build._id, line);
          });
          await appendLog(build._id, `✅ Authenticated with Docker Hub`);
        } else {
          await appendLog(build._id, `⚠️ DOCKER_USERNAME or DOCKER_PASSWORD missing. Skipping Docker Hub push.`, "warn");
        }

        await runCommand("docker", ["build", "-t", imageName, "."], workDir, (line) => appendLog(build._id, line));
        await appendLog(build._id, `✅ Docker image built: ${imageName}`, "success");

        if (dockerUser && dockerPass) {
          await appendLog(build._id, `⬆️ Pushing image to Docker Hub...`);
          await runCommand("docker", ["push", imageName], workDir, (line) => appendLog(build._id, line));
          await appendLog(build._id, `✅ Image pushed successfully`, "success");
          finalUrls.push({ label: "Docker Image", url: `https://hub.docker.com/r/${dockerUser}/${pipeline.name.toLowerCase()}` });
        }
      } catch (dockerErr) {
        await appendLog(build._id, `❌ Docker Build/Push failed: ${dockerErr.message}`, "error");
        throw dockerErr;
      }
    }

    // 1. Deploy Backend First
    let backendUrl = null;
    if (backend) {
      await appendLog(build._id, `📦 Found backend in: /${backend.relPath || "root"}`);
      backendUrl = await deployToRender({ pipeline, buildId: build._id, project: backend, envVars: baseEnv });
      if (backendUrl) finalUrls.push({ label: "Backend API", url: backendUrl });
    }

    // 2. Build and Deploy Frontend
    if (frontend) {
      await appendLog(build._id, `📦 Found frontend in: /${frontend.relPath || "root"}`);
      const frontendEnv = { ...baseEnv };
      if (backendUrl) {
        frontendEnv["VITE_API_URL"] = backendUrl;
        await appendLog(build._id, `🔗 Auto-linking frontend to backend: VITE_API_URL=${backendUrl}`);
      }

      // Install & Build Frontend (Include dev dependencies for build tools like Vite)
      await runCommand("npm", ["install", "--include=dev"], frontend.dir, (line, level) => appendLog(build._id, line, level), { env: frontendEnv });
      if (frontend.packageJson.scripts?.build) {
        await runCommand("npm", ["run", "build"], frontend.dir, (line, level) => appendLog(build._id, line, level), { env: frontendEnv });
      }

      const surgeUrl = await deployToSurge({ pipeline, buildId: build._id, workDir, project: frontend });
      if (surgeUrl) finalUrls.push({ label: "Frontend UI", url: surgeUrl });
    }

    const finishedAt = new Date();
    const duration = finishedAt - build.startedAt;
    await Build.findByIdAndUpdate(build._id, { status: "success", finishedAt, duration });
    await Pipeline.findByIdAndUpdate(pipeline._id, { status: "success", deployedUrls: finalUrls });
    await appendLog(build._id, "🎉 Full-stack pipeline finished successfully", "success");
    broadcastDone(String(build._id), "success");
  } catch (err) {
    const finishedAt = new Date();
    const duration = finishedAt - build.startedAt;
    await appendLog(build._id, `❌ Pipeline failed: ${err.message}`, "error");
    await Build.findByIdAndUpdate(build._id, { status: "failed", finishedAt, duration });
    await Pipeline.findByIdAndUpdate(pipeline._id, { status: "failed" });
    broadcastDone(String(build._id), "failed");
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = router;

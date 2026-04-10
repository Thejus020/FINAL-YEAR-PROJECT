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
    const { name, repo, branch } = req.body;
    if (!name || !repo) return res.status(400).json({ error: "name and repo are required" });

    const pipeline = await Pipeline.create({
      name,
      repo,
      branch: branch || "main",
      owner: req.user._id,
    });
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
    const proc = spawn(command, args, { cwd, shell: true });
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
    const proc = spawn(command, args, { cwd, shell: true });
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

async function detectNodeProject(workDir) {
  const candidates = ["", "client", "frontend", "web", "app"];
  const projects = [];

  for (const rel of candidates) {
    const dir = path.join(workDir, rel);
    const pkg = await readJsonIfExists(path.join(dir, "package.json"));
    if (pkg) {
      projects.push({ relPath: rel, dir, packageJson: pkg });
    }
  }

  if (projects.length === 0) return null;

  const buildProject = projects.find((p) => p.packageJson?.scripts?.build);
  if (buildProject) return buildProject;
  return projects[0];
}

async function deployLocallyIfEnabled({ pipeline, buildId, packageJson, workDir, projectRelPath = "" }) {
  const enabledValue = String(process.env.LOCAL_DEPLOY_ENABLED ?? "true").trim().toLowerCase();
  const enabled = !["false", "0", "no", "off"].includes(enabledValue);
  if (!enabled) {
    await appendLog(
      buildId,
      `ℹ️ Local deployment stage skipped (LOCAL_DEPLOY_ENABLED='${process.env.LOCAL_DEPLOY_ENABLED ?? "undefined"}')`
    );
    return;
  }

  const deployRoot = path.join(os.homedir(), "infraflow-deployments");
  const deployDir = path.join(deployRoot, String(pipeline._id));
  const deployProjectDir = path.join(deployDir, projectRelPath);
  const appName = `infraflow-${String(pipeline._id).slice(-8)}`;
  const distDir = path.join(workDir, projectRelPath, "dist");
  const distExists = await pathExists(distDir);

  await fs.mkdir(deployRoot, { recursive: true });
  await fs.rm(deployDir, { recursive: true, force: true });
  await fs.cp(workDir, deployDir, { recursive: true });
  await appendLog(buildId, `📁 Prepared deployment directory: ${deployDir}`);

  const runPm2 = async (args) =>
    runCommand("pm2", args, deployProjectDir, (line, level) => appendLog(buildId, line, level), { timeoutMs: 120000 });

  await runPm2(["delete", appName]).catch(() => {});

  if (distExists) {
    const port = computeDeterministicPort(pipeline._id, Number(process.env.LOCAL_DEPLOY_PORT_BASE || 4300), 300);
    await appendLog(buildId, `🚀 Deploying static app with PM2 serve on port ${port}`);
    await runPm2(["serve", "dist", String(port), "--name", appName, "--spa"]);
    await appendLog(buildId, `🌐 Local deployment URL: http://localhost:${port}`, "success");
    return;
  }

  if (packageJson?.scripts?.start) {
    await appendLog(buildId, "🚀 Deploying Node app with PM2 (npm start)");
    await runPm2(["start", "npm", "--name", appName, "--", "start"]);
    await appendLog(buildId, `🌐 PM2 app started: ${appName} (check 'pm2 logs ${appName}')`, "success");
    return;
  }

  await appendLog(
    buildId,
    "⚠️ Deployment skipped: no 'dist' directory and no 'start' script found. Build still counted as successful.",
    "warn"
  );
}

// ── Real build runner: clone + install + build ────────────────────────────────
async function runRealBuild(pipeline, build) {
  const workRoot = path.join(os.tmpdir(), "infraflow-builds");
  const workDir = path.join(workRoot, `${pipeline._id}-${build._id}`);

  try {
    await fs.mkdir(workRoot, { recursive: true });
    await appendLog(build._id, `🔗 Starting real pipeline for ${pipeline.repo} (${pipeline.branch})`);

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

    const detectedProject = await detectNodeProject(workDir);
    if (!detectedProject) {
      throw new Error(
        "No package.json found in root or common app folders (client/frontend/web/app)."
      );
    }
    const packageJson = detectedProject.packageJson;
    const projectDir = detectedProject.dir;
    const projectLabel = detectedProject.relPath || "root";
    await appendLog(build._id, `📁 Node project detected at: ${projectLabel}`);

    const hasLockfile = await fs
      .access(path.join(projectDir, "package-lock.json"))
      .then(() => true)
      .catch(() => false);

    const installCommand = hasLockfile ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"];
    await appendLog(build._id, `⬇️ Running: npm ${installCommand.join(" ")} (${projectLabel})`);
    await runCommand("npm", installCommand, projectDir, (line, level) => appendLog(build._id, line, level));

    if (packageJson.scripts?.build) {
      await appendLog(build._id, `🔨 Running: npm run build (${projectLabel})`);
      await runCommand("npm", ["run", "build"], projectDir, (line, level) => appendLog(build._id, line, level));
      await appendLog(build._id, "✅ Build completed", "success");
    } else {
      await appendLog(build._id, "⚠️ No build script found in package.json, skipping build step", "warn");
    }

    await deployLocallyIfEnabled({
      pipeline,
      buildId: build._id,
      packageJson,
      workDir,
      projectRelPath: detectedProject.relPath || "",
    });

    const finishedAt = new Date();
    const duration = finishedAt - build.startedAt;
    await Build.findByIdAndUpdate(build._id, { status: "success", finishedAt, duration });
    await Pipeline.findByIdAndUpdate(pipeline._id, { status: "success" });
    await appendLog(build._id, "🎉 Pipeline finished successfully", "success");
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

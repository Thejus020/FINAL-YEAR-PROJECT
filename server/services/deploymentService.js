const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const Pipeline = require("../models/Pipeline");
const Build = require("../models/Build");
const User = require("../models/User");
const { broadcastDone } = require("../routes/stream");
const { normalizeRepoToHttps, withGithubToken, detectDefaultBranch } = require("../utils/gitUtils");
const { runCommand, isCommandAvailable } = require("../utils/execUtils");
const { pathExists, restoreNodeBinExecutables, detectFullStackProjects } = require("../utils/projectUtils");
const { deployToRender } = require("./renderService");
const { deployToSurge } = require("./surgeService");

async function runRealBuild(pipeline, build, appendLogFunc) {
  const workRoot = path.join(os.tmpdir(), "infraflow-builds");
  const workDir = path.join(workRoot, \`${pipeline._id}-${build._id}\`);

  try {
    await fs.mkdir(workRoot, { recursive: true });
    await appendLogFunc(build._id, \`🔗 Starting full-stack pipeline for ${pipeline.repo} (${pipeline.branch})\`);

    const owner = await User.findById(pipeline.owner).select("accessToken");
    const normalizedRepo = normalizeRepoToHttps(pipeline.repo);
    const cloneUrl = withGithubToken(normalizedRepo, owner?.accessToken);

    await appendLogFunc(build._id, \`📦 Cloning repository (branch: ${pipeline.branch})\`);
    try {
      await runCommand(
        "git",
        ["clone", "--depth", "1", "--branch", pipeline.branch, cloneUrl, workDir],
        workRoot,
        (line, level) => appendLogFunc(build._id, line, level)
      );
    } catch (cloneErr) {
      const message = cloneErr?.message || "";
      if (/Remote branch .* not found/i.test(message)) {
        await appendLogFunc(build._id, \`⚠️ Branch '${pipeline.branch}' not found. Detecting repository default branch...\`, "warn");
        const defaultBranch = await detectDefaultBranch(cloneUrl, workRoot);
        if (!defaultBranch) throw cloneErr;
        await appendLogFunc(build._id, \`🔁 Falling back to default branch '${defaultBranch}'\`, "warn");
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
        await runCommand(
          "git",
          ["clone", "--depth", "1", "--branch", defaultBranch, cloneUrl, workDir],
          workRoot,
          (line, level) => appendLogFunc(build._id, line, level)
        );
      } else {
        throw cloneErr;
      }
    }
    await appendLogFunc(build._id, "✅ Clone complete", "success");

    const projects = await detectFullStackProjects(workDir);
    if (!projects || projects.length === 0) {
      throw new Error("No Node.js projects detected in the repository.");
    }

    const backend = projects
      .filter((p) => p.type === "backend")
      .sort((a, b) => b.priority - a.priority)[0];
    const frontend = projects
      .filter((p) => p.type === "frontend" || p.packageJson.scripts?.build)
      .sort((a, b) => b.priority - a.priority)[0];

    const baseEnv = {};
    pipeline.envVars.forEach((ev) => { if (ev.key) baseEnv[ev.key] = ev.value; });

    const finalUrls = [];

    // 0. Docker Build & Push (If Dockerfile exists)
    const dockerfilePath = path.join(workDir, "Dockerfile");
    if (await pathExists(dockerfilePath)) {
      await appendLogFunc(build._id, \`🐳 Dockerfile detected. Initiating Docker Build & Push...\`);
      const dockerAvailable = await isCommandAvailable("docker", workDir);
      if (!dockerAvailable) {
        await appendLogFunc(
          build._id,
          "Docker is not available in this environment. Skipping Docker build and continuing with app deployment.",
          "warn"
        );
      } else {
      const dockerUser = process.env.DOCKER_USERNAME;
      const dockerPass = process.env.DOCKER_PASSWORD;
      const imageName = \`${dockerUser || "local"}/${pipeline.name.toLowerCase()}:${build._id}\`;

      try {
        if (dockerUser && dockerPass) {
          await runCommand("docker", ["login", "-u", dockerUser, "-p", dockerPass], workDir, (line) => {
            if (!line.includes("password") && !line.includes("Login Succeeded")) appendLogFunc(build._id, line);
          });
          await appendLogFunc(build._id, \`✅ Authenticated with Docker Hub\`);
        } else {
          await appendLogFunc(build._id, \`⚠️ DOCKER_USERNAME or DOCKER_PASSWORD missing. Skipping Docker Hub push.\`, "warn");
        }

        await runCommand("docker", ["build", "-t", imageName, "."], workDir, (line) => appendLogFunc(build._id, line));
        await appendLogFunc(build._id, \`✅ Docker image built: ${imageName}\`, "success");

        if (dockerUser && dockerPass) {
          await appendLogFunc(build._id, \`⬆️ Pushing image to Docker Hub...\`);
          await runCommand("docker", ["push", imageName], workDir, (line) => appendLogFunc(build._id, line));
          await appendLogFunc(build._id, \`✅ Image pushed successfully\`, "success");
          finalUrls.push({ label: "Docker Image", url: \`https://hub.docker.com/r/${dockerUser}/${pipeline.name.toLowerCase()}\` });
        }
      } catch (dockerErr) {
        await appendLogFunc(build._id, \`Docker Build/Push skipped after failure: ${dockerErr.message}\`, "warn");
      }
      }
    }

    // 1. Deploy Backend First
    let backendUrl = null;
    if (backend) {
      await appendLogFunc(build._id, \`📦 Found backend in: /${backend.relPath || "root"}\`);
      backendUrl = await deployToRender({ pipeline, buildId: build._id, project: backend, envVars: baseEnv, appendLogFunc });
      if (backendUrl) finalUrls.push({ label: "Backend API", url: backendUrl });
    }

    // 2. Build and Deploy Frontend
    if (frontend) {
      await appendLogFunc(build._id, \`📦 Found frontend in: /${frontend.relPath || "root"}\`);
      const frontendEnv = { ...baseEnv };
      if (backendUrl) {
        frontendEnv["VITE_API_URL"] = backendUrl;
        await appendLogFunc(build._id, \`🔗 Auto-linking frontend to backend: VITE_API_URL=${backendUrl}\`);
      }

      await runCommand("npm", ["install", "--include=dev"], frontend.dir, (line, level) => appendLogFunc(build._id, line, level), { env: frontendEnv });
      await restoreNodeBinExecutables(frontend.dir, appendLogFunc, build._id);
      if (frontend.packageJson.scripts?.build) {
        await runCommand("npm", ["run", "build"], frontend.dir, (line, level) => appendLogFunc(build._id, line, level), { env: frontendEnv });
      }

      const surgeUrl = await deployToSurge({ pipeline, buildId: build._id, workDir, project: frontend, appendLogFunc });
      if (surgeUrl) finalUrls.push({ label: "Frontend UI", url: surgeUrl });
    }

    const finishedAt = new Date();
    const duration = finishedAt - build.startedAt;
    await Build.findByIdAndUpdate(build._id, { status: "success", finishedAt, duration });
    await Pipeline.findByIdAndUpdate(pipeline._id, { status: "success", deployedUrls: finalUrls });
    await appendLogFunc(build._id, "🎉 Full-stack pipeline finished successfully", "success");
    broadcastDone(String(build._id), "success");
  } catch (err) {
    const finishedAt = new Date();
    const duration = finishedAt - build.startedAt;
    await appendLogFunc(build._id, \`❌ Pipeline failed: ${err.message}\`, "error");
    await Build.findByIdAndUpdate(build._id, { status: "failed", finishedAt, duration });
    await Pipeline.findByIdAndUpdate(pipeline._id, { status: "failed" });
    broadcastDone(String(build._id), "failed");
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  runRealBuild
};

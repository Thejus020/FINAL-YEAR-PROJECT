const fs = require("fs/promises");
const path = require("path");
const { runCommandCapture } = require("./execUtils");

async function pathExists(targetPath) {
  return fs.access(targetPath).then(() => true).catch(() => false);
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getNodeStartCommand(project) {
  if (project.packageJson?.scripts?.start) return "npm start";

  const entries = ["index.js", "server.js", "app.js", "src/index.js", "src/server.js", "src/app.js"];
  for (const entry of entries) {
    if (await pathExists(path.join(project.dir, entry))) return \`node \${entry}\`;
  }

  return null;
}

async function restoreNodeBinExecutables(projectDir, appendLogFunc, buildId) {
  const binDir = path.join(projectDir, "node_modules", ".bin");
  if (!(await pathExists(binDir))) return;

  try {
    await runCommandCapture("chmod", ["-R", "u+x", binDir], projectDir, { timeoutMs: 10000 });
  } catch (err) {
    if (appendLogFunc) {
      await appendLogFunc(buildId, \`Could not update node_modules/.bin permissions: \${err.message}\`, "warn");
    }
  }
}

async function detectFullStackProjects(workDir) {
  const candidates = ["", "client", "frontend", "web", "app", "server", "backend", "api"];
  const projects = [];

  for (const rel of candidates) {
    const dir = path.join(workDir, rel);
    const pkg = await readJsonIfExists(path.join(dir, "package.json"));
    if (pkg) {
      const hasBuild = !!pkg.scripts?.build;
      const hasStart = !!pkg.scripts?.start;
      const hasServerEntry = await getNodeStartCommand({ dir, packageJson: pkg });
      const isNamedBackend = rel.match(/server|backend|api/i);
      const isNamedFrontend = rel.match(/client|frontend|web|app/i);

      let type = hasStart || hasServerEntry ? "backend" : "frontend";
      if (isNamedFrontend || (hasBuild && !isNamedBackend)) {
        type = "frontend";
      }

      projects.push({ relPath: rel, dir, packageJson: pkg, type, priority: rel === "" ? 0 : 1 });
    }
  }

  if (projects.length === 0) return null;
  return projects;
}

module.exports = {
  pathExists,
  readJsonIfExists,
  getNodeStartCommand,
  restoreNodeBinExecutables,
  detectFullStackProjects
};

const path = require("path");
const { runCommand } = require("../utils/execUtils");
const { pathExists } = require("../utils/projectUtils");

async function deployToSurge({ pipeline, buildId, workDir, project, appendLogFunc }) {
  const surgeToken = process.env.SURGE_TOKEN;
  if (!surgeToken) {
    await appendLogFunc(buildId, "ℹ️ Surge deployment skipped: No SURGE_TOKEN found.", "warn");
    return null;
  }

  const distDir = path.join(project.dir, "dist");
  const buildDir = path.join(project.dir, "build");
  let deployPath = "";
  if (await pathExists(distDir)) deployPath = distDir;
  else if (await pathExists(buildDir)) deployPath = buildDir;

  if (!deployPath) {
    await appendLogFunc(buildId, "⚠️ Surge deployment skipped: No 'dist' or 'build' directory found.", "warn");
    return null;
  }

  const domain = \`infraflow-${String(pipeline._id).slice(-8)}.surge.sh\`;
  await appendLogFunc(buildId, \`🚀 Deploying static assets to Surge: https://${domain}\`, "success");

  try {
    await runCommand("npx", ["surge", deployPath, domain, "--token", surgeToken], workDir, (line) => {
      const safeLine = line.replace(new RegExp(surgeToken, "g"), "***");
      appendLogFunc(buildId, safeLine);
    });
    return \`https://${domain}\`;
  } catch (err) {
    throw new Error(\`Surge deployment failed: ${err.message}\`);
  }
}

module.exports = {
  deployToSurge
};

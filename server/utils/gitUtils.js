const crypto = require("crypto");
const axios = require("axios");
const { runCommandCapture } = require("./execUtils");

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
  if (/^[\\w.-]+\\/[\\w.-]+$/.test(trimmed)) return `https://github.com/${trimmed}.git`;
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

async function detectDefaultBranch(repoUrl, cwd) {
  const { stdout } = await runCommandCapture("git", ["ls-remote", "--symref", repoUrl, "HEAD"], cwd);
  const line = stdout
    .split(/\\r?\\n/)
    .find((l) => l.startsWith("ref: refs/heads/") && l.endsWith("\\tHEAD"));
  if (!line) return null;
  return line.replace("ref: refs/heads/", "").replace("\\tHEAD", "").trim();
}

async function createGithubWebhook(userToken, pipelineId, repoUrl, secret, serverUrl) {
  try {
    const normalized = normalizeRepoToHttps(repoUrl);
    const match = normalized.match(/github\\.com\\/([^/]+)\\/([^/.]+)/);
    if (!match) return;

    const owner = match[1];
    const repo = match[2];
    const webhookUrl = `${serverUrl.replace(/\\/$/, "")}/pipelines/${pipelineId}/webhook`;

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

module.exports = {
  isValidGithubSignature,
  normalizeRepoToHttps,
  withGithubToken,
  detectDefaultBranch,
  createGithubWebhook
};

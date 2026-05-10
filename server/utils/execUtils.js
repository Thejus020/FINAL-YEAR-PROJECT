const { spawn } = require("child_process");

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

async function isCommandAvailable(command, cwd) {
  try {
    await runCommandCapture(command, ["--version"], cwd, { timeoutMs: 5000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  runCommand,
  runCommandCapture,
  isCommandAvailable
};

const si = require("systeminformation");

// Rolling history buffer for charts (last 30 data points)
const MAX_HISTORY = 30;
const metricsHistory = [];

async function getMetrics() {
  const [cpu, mem, disk, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.time(),
  ]);

  const uptimeSeconds = time.uptime;
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  const primaryDisk = disk[0] || {};

  const snapshot = {
    cpu: Math.round(cpu.currentLoad * 10) / 10,
    ram: Math.round(((mem.total - mem.available) / mem.total) * 1000) / 10,
    ramUsed: mem.total - mem.available,
    ramTotal: mem.total,
    disk: primaryDisk.use ? Math.round(primaryDisk.use * 10) / 10 : 0,
    diskUsed: primaryDisk.used || 0,
    diskTotal: primaryDisk.size || 0,
    uptime: `${hours}h ${minutes}m`,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  };

  // Push to rolling history
  metricsHistory.push(snapshot);
  if (metricsHistory.length > MAX_HISTORY) {
    metricsHistory.shift();
  }

  return snapshot;
}

function getMetricsHistory() {
  return [...metricsHistory];
}

module.exports = { getMetrics, getMetricsHistory };

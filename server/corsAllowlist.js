/** Public UI origins allowed for CORS + SSE. Use ALLOWED_ORIGINS=a,b for tunnel + localhost. */
function origins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw && raw.trim()) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [(process.env.CLIENT_URL || "http://localhost:5173").trim()];
}

function corsOriginCallback(origin, callback) {
  if (!origin) return callback(null, true);
  return callback(null, origins().includes(origin));
}

function sseAllowOrigin(req) {
  const origin = req.headers.origin;
  const list = origins();
  if (origin && list.includes(origin)) return origin;
  return list[0] || "http://localhost:5173";
}

module.exports = { origins, corsOriginCallback, sseAllowOrigin };

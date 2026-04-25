/** Public UI origins allowed for CORS + SSE. Use ALLOWED_ORIGINS=a,b for tunnel + localhost. */
function origins() {
  const list = [];
  
  if (process.env.CLIENT_URL) list.push(process.env.CLIENT_URL.trim());
  if (process.env.ALLOWED_ORIGINS) {
    const raw = process.env.ALLOWED_ORIGINS.split(",");
    raw.forEach(o => list.push(o.trim()));
  }

  // Always allow localhost in development, but keep list clean
  if (process.env.NODE_ENV !== "production") {
    if (!list.includes("http://localhost:5173")) list.push("http://localhost:5173");
  }

  return [...new Set(list)].filter(Boolean);
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

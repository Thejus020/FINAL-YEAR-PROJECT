require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");

const authRoutes = require("./routes/auth");
const pipelineRoutes = require("./routes/pipelines");
const buildRoutes = require("./routes/builds");
const streamRoutes = require("./routes/stream");
const { corsOriginCallback, origins } = require("./corsAllowlist");

const app = express();
const server = http.createServer(app);
let currentPort = Number(process.env.PORT || 5000);

// Middleware
app.use(cors({ origin: corsOriginCallback, credentials: true }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Routes
app.use("/auth", authRoutes);
app.use("/pipelines", pipelineRoutes);
app.use("/builds", buildRoutes);
app.use("/stream", streamRoutes);

app.get("/", (req, res) => {
  const list = origins();
  const ui = list.find((o) => o.includes("trycloudflare.com")) || list[0] || "http://localhost:5173";
  res.type("html").send(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>InfraFlow API</title></head><body style="font-family:system-ui;padding:2rem;max-width:40rem">
      <h1>InfraFlow API</h1>
      <p>This is the backend only. Open the app here:</p>
      <p><a href="${ui}">${ui}</a></p>
      <p><small>Health: <a href="/health">/health</a></small></p>
    </body></html>`
  );
});

app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// Connect DB then start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(currentPort, () => {
      console.log(`🚀 Server running on port ${currentPort}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    currentPort += 1;
    server.listen(currentPort);
  }
});

module.exports = { app, server };

const mongoose = require("mongoose");

const buildSchema = new mongoose.Schema(
  {
    pipeline: { type: mongoose.Schema.Types.ObjectId, ref: "Pipeline", required: true },
    status: {
      type: String,
      enum: ["queued", "running", "success", "failed"],
      default: "queued",
    },
    logs: [
      {
        message: String,
        level: { type: String, enum: ["info", "success", "error", "warn"], default: "info" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    triggeredBy: { type: String, default: "manual" }, // "manual" | "webhook"
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    duration: { type: Number, default: null }, // ms
  },
  { timestamps: true }
);

module.exports = mongoose.model("Build", buildSchema);

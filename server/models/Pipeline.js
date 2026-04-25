const mongoose = require("mongoose");

const pipelineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    repo: { type: String, required: true, trim: true },
    branch: { type: String, default: "main" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["idle", "running", "success", "failed"],
      default: "idle",
    },
    lastBuildAt: { type: Date, default: null },
    webhookSecret: { type: String, default: () => Math.random().toString(36).slice(2) },
    envVars: [
      {
        key: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pipeline", pipelineSchema);

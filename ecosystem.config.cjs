module.exports = {
  apps: [
    {
      name: "infraflow-server",
      cwd: "./server",
      script: "index.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "infraflow-client-preview",
      cwd: "./client",
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 5173",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

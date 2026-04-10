import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Cloudflare quick tunnels use a new *.trycloudflare.com host each run — allow all hosts in dev
    allowedHosts: true,
    proxy: {
      // Proxy /api calls during dev — optional, frontend uses VITE_API_URL instead
    },
  },
});

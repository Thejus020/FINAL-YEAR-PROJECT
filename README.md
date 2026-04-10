# ⚡ InfraFlow — Automated CI/CD Pipeline Platform

## Architecture

```
infraflow/
├── client/          React + Vite + TailwindCSS (port 5173)
└── server/          Express + MongoDB + JWT (port 5000)
    ├── routes/
    │   ├── auth.js           GitHub OAuth
    │   ├── pipelines.js      CRUD + run + webhook
    │   ├── builds.js         Build log queries
    │   ├── stream.js         SSE real-time log streaming
    │   └── pipelineRoutes.js Jenkins API trigger
    ├── controllers/
    │   └── pipelineController.js
    ├── models/
    │   ├── User.js
    │   ├── Pipeline.js
    │   └── Build.js
    └── middleware/
        └── authMiddleware.js
```

## Setup & Run

### Quick start (workspace root)
```bash
npm install
npm run install:all
npm run dev
```

This starts both backend and frontend together.

### 1. Start the backend
```bash
cd server
npm install
# Edit .env — update JENKINS_URL/USER/TOKEN if using Jenkins
node index.js
```

### 2. Start the frontend
```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

---

## Real Pipeline Execution

`POST /pipelines/:id/run` and webhook runs now execute real commands:

1. Clone target repository + branch (auto-fallback to default branch if configured branch is missing)
2. Run `npm ci` or `npm install`
3. Run `npm run build` if a build script exists
4. Stream real stdout/stderr logs to the build view

Current scope: Node.js repos with `package.json` at repository root.

---

## Optional local production run (PM2)

```bash
npm run build:client
npm run pm2:start
```

Useful scripts:
- `npm run pm2:restart`
- `npm run pm2:stop`
- `npm run pm2:logs`

---

## API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| GET | /auth/github | Redirect to GitHub OAuth |
| GET | /auth/github/callback | OAuth callback |
| GET | /auth/me | Get logged-in user |

### Pipelines
| Method | Route | Description |
|--------|-------|-------------|
| GET | /pipelines | List all (auth required) |
| POST | /pipelines | Create new |
| GET | /pipelines/:id | Get one |
| DELETE | /pipelines/:id | Delete pipeline + builds |
| POST | /pipelines/:id/run | Trigger a build |
| POST | /pipelines/:id/webhook | GitHub push webhook |

### Builds
| Method | Route | Description |
|--------|-------|-------------|
| GET | /builds/pipeline/:pipelineId | All builds for a pipeline |
| GET | /builds/:buildId | Single build + logs |

### Streaming
| Method | Route | Description |
|--------|-------|-------------|
| GET | /stream/builds/:buildId?token=JWT | SSE live log stream |

### Jenkins
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/run-pipeline | Trigger Jenkins job |

---

## GitHub Webhook Setup

1. Open a pipeline in InfraFlow
2. Copy the **Webhook URL** shown on the page
3. Go to your GitHub repo → Settings → Webhooks → Add webhook
4. Paste the URL, set Content-Type to `application/json`, and paste the pipeline's **Webhook Secret**
5. Select **Push** events
6. Now every `git push` to the pipeline's branch auto-triggers a build!

---

## Jenkins Integration

Edit `server/.env`:
```
JENKINS_URL=http://your-jenkins-ip:8080
JENKINS_USER=your-username
JENKINS_TOKEN=your-api-token
JENKINS_JOB=YourJobName
```

---

## Go public (Cloudflare Tunnel) — use from any device

Your PC runs the app; **two tunnels** give HTTPS links you can open on phone or any network.

### 0. Start the app

From project root:

```bash
npm run dev
```

Leave it running. Note the API port (`5000` or `5001`).

### 1. `server/.env` — API tunnel + UI tunnel + CORS

Use **two** Cloudflare URLs (no trailing slash). Add **both** UI origins so local + public work:

```env
SERVER_URL=https://YOUR-API.trycloudflare.com
CLIENT_URL=https://YOUR-UI.trycloudflare.com
GITHUB_CALLBACK_URL=https://YOUR-API.trycloudflare.com/auth/github/callback
ALLOWED_ORIGINS=https://YOUR-UI.trycloudflare.com,http://localhost:5173
```

Keep `PORT=5000` locally. The **API** tunnel forwards to `http://localhost:5000` (or `5001` if that’s what the server uses).

### 2. `client/.env` — point the browser to your **API** tunnel

```env
VITE_API_URL=https://YOUR-API.trycloudflare.com
VITE_WEBHOOK_BASE_URL=https://YOUR-API.trycloudflare.com
```

Restart `npm run dev` so Vite reloads env.

### 3. Two tunnels (two extra terminals — keep both open)

Terminal A — **API** (port must match server log, usually `5000`):

```bash
npx cloudflared tunnel --url http://localhost:5000
```

Terminal B — **UI** (Vite dev server):

```bash
npx cloudflared tunnel --url http://localhost:5173
```

Copy each printed `https://….trycloudflare.com` URL:

- **Tunnel A** → `SERVER_URL`, `GITHUB_CALLBACK_URL`, `VITE_*` in `client/.env`
- **Tunnel B** → `CLIENT_URL` and the first entry in `ALLOWED_ORIGINS` (plus keep `http://localhost:5173` in the list)

**Every time you restart a quick tunnel, the URL changes** — update `.env` + GitHub OAuth again, or use a [named Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for a stable hostname.

### 3b. Open from anywhere

On your phone: open **Tunnel B’s URL** (the UI). Login and API calls go to **Tunnel A** via `VITE_API_URL`.

### 4. GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → your app:

- **Homepage URL:** your **client** tunnel URL (`CLIENT_URL`)
- **Authorization callback URL:** `https://YOUR-SERVER-HOST.../auth/github/callback` (same as `GITHUB_CALLBACK_URL`)

### Port mismatch tip

If the server log says `Server running on port 5001` (because 5000 is busy), either free port 5000 or set `VITE_API_URL` to `http://localhost:5001` for local dev, and point `cloudflared` at **that** port instead of 5000.

---

## Environment Variables

```env
PORT=5000
MONGO_URI=mongodb+srv://...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JWT_SECRET=...
CLIENT_URL=http://localhost:5173
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
SERVER_URL=http://localhost:5000
# Public: comma-separated UI origins for CORS + SSE (tunnel + local dev)
# ALLOWED_ORIGINS=https://your-ui.trycloudflare.com,http://localhost:5173
JENKINS_URL=http://192.168.0.2:8080
JENKINS_USER=Thejus
JENKINS_TOKEN=...
JENKINS_JOB=Infraflow

# Optional: enable local deployment stage after successful build
LOCAL_DEPLOY_ENABLED=false
# Optional base port for static app deployments (deterministic per pipeline)
LOCAL_DEPLOY_PORT_BASE=4300
```

### Local deployment automation (optional)

When `LOCAL_DEPLOY_ENABLED=true`, each successful pipeline also deploys locally:
- If `dist/` exists, deploys using `pm2 serve dist <port> --spa`
- Else if `start` script exists, runs app with PM2 (`npm start`)

Requires PM2 installed globally:
```bash
npm i -g pm2
```

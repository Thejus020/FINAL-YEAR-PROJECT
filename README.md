# ⚡ InfraFlow — Automated CI/CD & Infrastructure Platform

A premium, full-stack CI/CD pipeline platform with real-time build streaming, multi-target deployment orchestration, infrastructure monitoring, and an AI-powered assistant — all wrapped in a deep-space glassmorphism UI.

## ✨ Key Features

- **GitHub OAuth** — one-click sign-in via GitHub
- **Pipeline Management** — create, configure, and trigger CI/CD pipelines from any GitHub repo
- **Full-Stack Auto-Detection** — automatically identifies frontend vs backend projects in a repo
- **Multi-Target Deployment** — orchestrates deploys to **Render** (backend), **Surge** (frontend static), and **Docker Hub** (containers)
- **Real-Time Build Streaming** — SSE-powered live log output during builds
- **GitHub Webhooks** — auto-trigger builds on `git push`
- **Jester AI Chatbot** — Gemini-powered assistant for debugging pipelines, writing configs, and understanding build errors
- **Infrastructure Dashboard** — real-time system metrics, deployment health analytics, and live topology mapping
- **Settings Page** — user profile and configuration management
- **Cloudflare Tunnel Support** — expose your local instance publicly with HTTPS
- **Render Blueprint** — one-click cloud deployment via `render.yaml`

---

## Architecture

```
infraflow/
├── render.yaml                  Render Blueprint (IaC cloud deployment)
├── ecosystem.config.cjs         PM2 production config
├── package.json                 Workspace scripts (dev, build, pm2)
│
├── client/                      React + Vite + TailwindCSS (port 5173)
│   └── src/
│       ├── App.jsx              Routes & auth guards
│       ├── config.js            API base URL config
│       ├── context/
│       │   └── AuthContext.jsx   Auth state provider
│       ├── components/
│       │   ├── Layout.jsx       App shell layout
│       │   ├── Sidebar.jsx      Navigation sidebar
│       │   ├── JesterAI.jsx     AI chatbot floating widget
│       │   └── infrastructure/
│       │       ├── InfraNodeCard.jsx
│       │       └── StatusBadge.jsx
│       └── pages/
│           ├── LandingPage.jsx           Public landing page
│           ├── AuthCallback.jsx          OAuth callback handler
│           ├── Dashboard.jsx             Pipeline overview
│           ├── NewPipeline.jsx           Create new pipeline
│           ├── PipelineDetail.jsx        Pipeline config & builds
│           ├── BuildView.jsx             Live build log viewer
│           ├── Settings.jsx              User settings
│           └── InfrastructureDashboard.jsx  Metrics & topology
│
└── server/                      Express + MongoDB + JWT (port 5000)
    ├── index.js                 Entry point, route mounting
    ├── corsAllowlist.js         Dynamic CORS origin handling
    ├── routes/
    │   ├── auth.js              GitHub OAuth flow
    │   ├── pipelines.js         CRUD + run + webhook triggers
    │   ├── builds.js            Build log queries
    │   ├── stream.js            SSE real-time log streaming
    │   ├── chat.js              Jester AI chatbot (Gemini)
    │   └── infrastructure.js    Metrics, health, topology
    ├── services/
    │   ├── deploymentService.js Full-stack pipeline orchestrator
    │   ├── renderService.js     Render cloud deployment
    │   └── surgeService.js      Surge static site deployment
    ├── infrastructure/
    │   ├── metricsCollector.js  System metrics (CPU, RAM, disk)
    │   ├── deploymentHealth.js  Deployment health analytics
    │   └── topologyService.js   Live topology graph
    ├── utils/
    │   ├── execUtils.js         Command execution helpers
    │   ├── gitUtils.js          Git repo & branch helpers
    │   └── projectUtils.js      Project type detection
    ├── models/
    │   ├── User.js
    │   ├── Pipeline.js
    │   └── Build.js
    └── middleware/
        └── authMiddleware.js
```

---

## Setup & Run

### Quick start (workspace root)
```bash
npm install
npm run install:all
npm run dev
```

This starts both backend and frontend together using `concurrently`.

### 1. Start the backend
```bash
cd server
npm install
# Edit .env — see Environment Variables section below
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

## Full-Stack Pipeline Execution

When a pipeline is triggered (`POST /pipelines/:id/run` or via webhook), InfraFlow runs a complete full-stack deployment:

1. **Clone** — clones the target repository & branch (auto-fallback to default branch if configured branch is missing)
2. **Detect** — auto-detects frontend and backend projects in the repo
3. **Docker** — if a `Dockerfile` exists at the repo root, builds and optionally pushes the image to Docker Hub
4. **Backend Deploy** — deploys backend to **Render** (creates or updates a Web Service via the Render API)
5. **Frontend Build** — runs `npm install` + `npm run build` for the frontend project
6. **Frontend Deploy** — deploys static assets (`dist/` or `build/`) to **Surge**
7. **Auto-Link** — automatically sets `VITE_API_URL` in the frontend to the deployed backend URL
8. **Post-Deploy** — provides GitHub OAuth configuration instructions if a backend was deployed

All steps stream real-time logs to the build view via SSE.

### Deployment Targets

| Target | Service | Trigger |
|--------|---------|---------|
| **Backend** | [Render](https://render.com) | Auto-detected Node.js server project |
| **Frontend** | [Surge](https://surge.sh) | Auto-detected frontend with `dist/` or `build/` output |
| **Container** | [Docker Hub](https://hub.docker.com) | `Dockerfile` present at repo root |
| **Local** | PM2 | `LOCAL_DEPLOY_ENABLED=true` (optional) |

---

## Jester AI — Built-in Chatbot

InfraFlow includes **Jester**, a floating AI assistant powered by **Google Gemini 2.0 Flash**.

- Helps debug failing pipelines
- Explains build errors
- Suggests CI/CD configuration improvements
- Accessible from any page via the floating widget

**Requires:** `GEMINI_API_KEY` in `server/.env` — get a free key from [Google AI Studio](https://aistudio.google.com).

---

## Infrastructure Monitoring Dashboard

The `/infrastructure` page provides a real-time observability dashboard:

- **System Metrics** — CPU usage, memory, disk I/O (powered by `systeminformation`)
- **Metrics History** — time-series charts of system performance
- **Deployment Health** — analytics on pipeline success rates and deployment status
- **Topology Map** — live graph of infrastructure components and their relationships

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/infrastructure/stats` | Current metrics + history |
| GET | `/api/infrastructure/health` | Deployment health analytics |
| GET | `/api/infrastructure/topology` | Live topology graph |

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
| GET | `/auth/github` | Redirect to GitHub OAuth |
| GET | `/auth/github/callback` | OAuth callback |
| GET | `/auth/me` | Get logged-in user |

### Pipelines
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pipelines` | List all (auth required) |
| POST | `/pipelines` | Create new |
| GET | `/pipelines/:id` | Get one |
| DELETE | `/pipelines/:id` | Delete pipeline + builds |
| POST | `/pipelines/:id/run` | Trigger a build |
| POST | `/pipelines/:id/webhook` | GitHub push webhook |

### Builds
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/builds/pipeline/:pipelineId` | All builds for a pipeline |
| GET | `/builds/:buildId` | Single build + logs |

### Streaming
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/stream/builds/:buildId?token=JWT` | SSE live log stream |

### Chat (Jester AI)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/chat` | Send message to Jester AI |

### Infrastructure Monitoring
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/infrastructure/stats` | System metrics + history |
| GET | `/api/infrastructure/health` | Deployment health analytics |
| GET | `/api/infrastructure/topology` | Live topology graph |

### Health
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Server health check (uptime) |

---

## GitHub Webhook Setup

1. Open a pipeline in InfraFlow
2. Copy the **Webhook URL** shown on the page
3. Go to your GitHub repo → Settings → Webhooks → Add webhook
4. Paste the URL, set Content-Type to `application/json`, and paste the pipeline's **Webhook Secret**
5. Select **Push** events
6. Now every `git push` to the pipeline's branch auto-triggers a build!

---

## Cloud Deployment (Render Blueprint)

InfraFlow includes a `render.yaml` for one-click deployment to [Render](https://render.com):

- **infraflow-server** — Node.js Web Service (free tier)
- **infraflow-client** — Static Site (Vite build)

### Deploy to Render

1. Push the repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and creates both services
5. Set the `sync: false` env vars (MongoDB URI, GitHub OAuth keys, JWT secret) in the Render dashboard

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

Keep `PORT=5000` locally. The **API** tunnel forwards to `http://localhost:5000` (or `5001` if that's what the server uses).

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

On your phone: open **Tunnel B's URL** (the UI). Login and API calls go to **Tunnel A** via `VITE_API_URL`.

### 4. GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → your app:

- **Homepage URL:** your **client** tunnel URL (`CLIENT_URL`)
- **Authorization callback URL:** `https://YOUR-SERVER-HOST.../auth/github/callback` (same as `GITHUB_CALLBACK_URL`)

### Port mismatch tip

If the server log says `Server running on port 5001` (because 5000 is busy), either free port 5000 or set `VITE_API_URL` to `http://localhost:5001` for local dev, and point `cloudflared` at **that** port instead of 5000.

---

## Environment Variables

### Server (`server/.env`)

```env
# Core
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback

# URLs & CORS
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
# Comma-separated UI origins for CORS + SSE (tunnel + local dev)
# ALLOWED_ORIGINS=https://your-ui.trycloudflare.com,http://localhost:5173

# Jester AI Chatbot (get a free key from https://aistudio.google.com)
GEMINI_API_KEY=...

# Render Deployment (optional — enables cloud backend deployment)
RENDER_API_KEY=...
RENDER_OWNER_ID=...
RENDER_PLAN=free

# Surge Deployment (optional — enables static frontend deployment)
SURGE_TOKEN=...

# Docker Hub (optional — enables Docker image build & push)
DOCKER_USERNAME=...
DOCKER_PASSWORD=...

# Local deployment (optional)
LOCAL_DEPLOY_ENABLED=false
LOCAL_DEPLOY_PORT_BASE=4300
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_WEBHOOK_BASE_URL=http://localhost:5000
```

### Local deployment automation (optional)

When `LOCAL_DEPLOY_ENABLED=true`, each successful pipeline also deploys locally:
- If `dist/` exists, deploys using `pm2 serve dist <port> --spa`
- Else if `start` script exists, runs app with PM2 (`npm start`)

Requires PM2 installed globally:
```bash
npm i -g pm2
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Express.js, Node.js |
| Database | MongoDB (Mongoose) |
| Auth | GitHub OAuth 2.0, JWT |
| AI | Google Gemini 2.0 Flash (`@google/genai`) |
| Monitoring | `systeminformation` |
| Deployment | Render API, Surge CLI, Docker |
| Real-time | Server-Sent Events (SSE) |
| Process Manager | PM2 |
| Tunneling | Cloudflare Tunnel |

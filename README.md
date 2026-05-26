# Copilot Agent Demo

A small demo application that pairs with the **GitHub Agent HQ: Plugins**. It shows how a partner integration can expose **runtime control** for agentic workloads—using LaunchDarkly for feature flags and progressive delivery while a Copilot plugin (agents, skills, hooks, and MCP) runs in the GitHub harness.

## What this illustrates

The guide describes **Agent HQ**: distributable **plugins** (custom agents, skills, hooks, MCP servers) wrapped in an **Agentic App** so they have a first-class identity on GitHub (@-mentions, issue assignment, Mission Control, and more).

| Guide concept | Role in this demo |
|---------------|-------------------|
| **Plugin** | Partner artifacts (e.g. LaunchDarkly MCP + skills) live in a separate plugin repo; this app is the sample **target workload** agents can reason about. |
| **Custom agents & MCP** | Agents invoke LaunchDarkly (and other) tools via MCP; OIDC lets those tools authenticate without long-lived user secrets. |
| **Runtime control** | The UI uses the LaunchDarkly client SDK so flag and AI Config changes apply immediately—models, prompts, and UX can shift without redeploying. |
| **In-app assistant** | The chat panel calls a small backend that mirrors “agent answers questions about the app” using a configurable model via LangChain. |

This repo is the **demo app** only (React + API). The Copilot plugin itself is installed and tested per the guide (`copilot plugin install`, Agentic App setup, OIDC test agents in `.github/agents`, etc.).

## Project structure

```
copilot-agent-demo/
├── ui/          # Vite + React app (LaunchDarkly SDK, chat UI)
└── server/      # Express API — LangChain chat endpoint
```

- **`ui/`** — Branded landing page, LaunchDarkly provider bootstrap, and a markdown-capable chat widget that posts to `/api/chat`.
- **`server/`** — `POST /api/chat` invokes the model named in `MODEL_DEFAULT` with a LaunchDarkly-focused system prompt.

## Prerequisites

- Node.js 18+
- A [LaunchDarkly](https://launchdarkly.com/) project (client-side ID for the UI)
- An API key for your chosen LLM provider (see `server/.env.example`)

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
# Edit .env: set MODEL_DEFAULT and the matching provider API key
npm install
npm run dev
```

The API listens on `http://localhost:3001` by default.

### 2. UI

```bash
cd ui
cp .env.example .env.local
# Set VITE_LD_CLIENT_SIDE_ID to your LaunchDarkly client-side ID
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to the backend (see `ui/vite.config.js`).

## Environment variables

| Location | Variable | Purpose |
|----------|----------|---------|
| `server/.env` | `PORT` | API port (default `3001`) |
| `server/.env` | `MODEL_DEFAULT` | LangChain model id, e.g. `anthropic:claude-sonnet-4-6` |
| `server/.env` | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_API_KEY` | Provider key for the model above |
| `ui/.env.local` | `VITE_LD_CLIENT_SIDE_ID` | LaunchDarkly client-side ID |

## Related documentation

- **Agent HQ guide** — Plugins, Agentic Apps, MCP + OIDC, local testing (`copilot plugin install`), and platform debugging (`COPILOT_AGENT_DEBUG`).
- [LaunchDarkly docs](https://docs.launchdarkly.com/) — Feature flags, targeting, and AI Configs for agent/runtime control.

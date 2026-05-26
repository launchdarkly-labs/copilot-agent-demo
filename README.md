# Copilot Agent Demo

A minimal full-stack demo showing how to wire a LangChain-powered agent into a React UI gated by LaunchDarkly feature flags.

## Stack

- **`ui/`** — React 19 + Vite + Tailwind, integrated with the LaunchDarkly client SDK
- **`server/`** — Express API with LangChain + Anthropic

## Prerequisites

- Node.js 20+
- A LaunchDarkly client-side ID
- An Anthropic API key

## Setup

```bash
# Install dependencies
(cd ui && npm install)
(cd server && npm install)
```

Create `ui/.env.local`:

```
VITE_LD_CLIENT_SIDE_ID=your-launchdarkly-client-side-id
```

Create `server/.env`:

```
ANTHROPIC_API_KEY=your-anthropic-api-key
PORT=3001
```

## Run

In two terminals:

```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — UI
cd ui && npm run dev
```

The UI runs on `http://localhost:5173` and the API on `http://localhost:3001`.

## Project layout

```
.
├── ui/        # React client
├── server/    # Express + LangChain (Anthropic) API
└── reference.jsx  # Sample chat panel component
```

## License

For demo purposes only.

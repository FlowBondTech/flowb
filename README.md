# FlowB

FlowBond's core agent service. Privacy-centric assistant for events, dance community, and more.

## Quick Start

```bash
cp .env.example .env  # fill in your values
npm install
npm run dev           # dev server with hot-reload
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + plugin status |
| POST | `/api/v1/action` | Execute any FlowB action |
| POST | `/api/v1/events` | Discover events |
| GET | `/api/v1/plugins` | List plugin status |

### Example

```bash
curl -X POST http://localhost:8080/api/v1/action \
  -H "Content-Type: application/json" \
  -d '{"action":"help"}'
```

## Dual Mode

- **HTTP Server**: `npm start` (Fly.io deployment)
- **OpenClaw Plugin**: `import register from "./dist/openclaw.js"`

## Deploy

```bash
fly deploy
```

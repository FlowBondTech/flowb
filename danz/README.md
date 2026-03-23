# DANZ — Dance-to-Earn Platform

**DANZ NOW** — Move. Connect. Earn.
Powered by FlowBond Technology.

All DANZ projects share FlowB's Supabase instance (`eoajujwpdkfuicnoxetk`).

## Directory Structure

| Directory | What | Stack | Status |
|-----------|------|-------|--------|
| `web/` | Main web app | Next.js 15 + Apollo + Privy + Stripe | Active |
| `landing/` | Landing page | Vite + React + Framer Motion | Active |
| `bot/` | Telegram bot | Grammy + TypeScript | Active |
| `backend/` | GraphQL API | Express + Apollo Server + Supabase | Experimental |
| `miniapps/` | Mini-apps workspace | Next.js (daily-danz + danz-main + shared) | Active |
| `mobile/` | iOS/Android app | Expo 54 + React Native + Privy | Active |
| `prototypes/` | FlowBond theme prototypes | Static HTML/CSS (10 dance themes) | Archive |

## Shared Infrastructure

- **Database**: Supabase (`eoajujwpdkfuicnoxetk`) — same as FlowB
- **Auth**: Privy (web/mobile), Farcaster (social)
- **Payments**: Stripe (subscriptions)
- **API**: Apollo GraphQL + Supabase PostgREST

## Quick Start

```bash
# Web app
cd danz/web && npm install && npm run dev    # localhost:3000

# Landing page
cd danz/landing && npm install && npm run dev  # localhost:5173

# Bot
cd danz/bot && npm install && npm run dev

# Backend API
cd danz/backend && npm install && npm run dev:tsx  # localhost:8080

# Mini-apps
cd danz/miniapps && npm install
# daily-danz on :3002, danz-main on :3001
```

## FlowB Integration

The existing FlowB DANZ plugin (`src/plugins/danz/index.ts`) provides:
- Account verification/signup via DANZ Supabase
- Dance events, challenges, leaderboard
- USDC rewards via Base wallet
- Check-in system with dance proof

## Key Env Vars

All DANZ apps need:
- `SUPABASE_URL` / `SUPABASE_KEY` (or `VITE_` / `NEXT_PUBLIC_` / `EXPO_PUBLIC_` prefixed)
- `PRIVY_APP_ID` / `PRIVY_CLIENT_ID`
- `STRIPE_*` keys (for payments)

## Origin

Consolidated from `/home/koh/Documents/DANZ/` into FlowB repo (March 2026).

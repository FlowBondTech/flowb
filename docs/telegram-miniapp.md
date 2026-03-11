---
title: Telegram Mini App
---

# Telegram Mini App

The Telegram mini app (`miniapp/telegram/`) is a Vite + React app deployed to `tg.flowb.me`. It runs inside Telegram as a [Mini App](https://core.telegram.org/bots/webapps).

## Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Telegram `initData` validated server-side
- **API**: `flowb.fly.dev` via JWT

## Screens

| Screen | Description |
|--------|-------------|
| **Home** | Event feed with search, category filters, and RSVP buttons |
| **Event Detail** | Full event info, social proof (who's going), RSVP, reminders |
| **Agents** | Agent slots, skills, boost/match/tip actions |
| **Onboarding** | First-time user flow with crew join and flow link sharing |

## Authentication

The mini app uses Telegram's `initData` for auth:

1. Telegram injects `initData` into the WebApp context
2. App sends `initData` to `POST /api/v1/auth/telegram`
3. Server validates HMAC-SHA-256 signature against bot token
4. Returns JWT for subsequent API calls

## Deployment

```bash
cd miniapp/telegram
npm run build
npx netlify-cli deploy --prod --dir=dist --no-build --site e167d298-7430-4756-b1b0-eafca307e06f
```

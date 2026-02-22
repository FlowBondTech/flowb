---
title: API Reference
---

# API Reference

All routes served from **`flowb.fly.dev`**. Auth routes issue JWTs; protected routes require `Authorization: Bearer {token}` header.

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/telegram` | No | Telegram Mini App auth (validates `initData`) |
| `POST` | `/api/v1/auth/farcaster` | No | Farcaster auth (Quick Auth JWT or legacy SIWF) |
| `POST` | `/api/v1/auth/app` | No | Native app auth (hardcoded users for EthDenver demo) |
| `POST` | `/api/v1/auth/web` | No | Web auth (Privy `userId` + optional `displayName`) |
| `POST` | `/api/v1/auth/claim-points` | JWT | Claim pre-auth pending points from localStorage |

## Feed

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/feed/ethdenver` | No | Farcaster cast feed (aggregates "ethdenver" keyword casts from Neynar) |
| `GET` | `/api/v1/feed/activity` | Optional | Activity feed — checkins, hot venues, trending events. `?scope=global\|friends\|crew&hours=4` |

## Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/events` | No | Event discovery. `?city=&categories=&zone=&type=&date=&from=&to=&featured=&free=&q=&limit=&offset=` |
| `GET` | `/api/v1/events/:id` | No | Single event detail (with categories; includes flow social proof if authed) |
| `POST` | `/api/v1/events/:id/rsvp` | JWT | RSVP to an event (`status: "going"\|"maybe"`) |
| `DELETE` | `/api/v1/events/:id/rsvp` | JWT | Cancel RSVP |
| `GET` | `/api/v1/events/:id/social` | No | Social proof for an event (who from your flow is going) |
| `GET` | `/api/v1/events/:id/calendar` | No | Generate `.ics` calendar file (shareable) |

## Schedule

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/schedule` | JWT | Personal schedule (upcoming RSVP'd events) |
| `POST` | `/api/v1/me/schedule/:id/checkin` | JWT | Mark an event as checked in |

## Reminders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/events/:id/reminders` | JWT | Set reminders (`minutes_before: number[]`) |
| `GET` | `/api/v1/events/:id/reminders` | JWT | Get reminders for an event |
| `DELETE` | `/api/v1/events/:id/reminders` | JWT | Delete all reminders for an event |

## Flow (Social)

### Crews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/flow/crews` | JWT | List user's crews |
| `POST` | `/api/v1/flow/crews` | JWT | Create a crew (`name`, `emoji?`, `description?`) |
| `POST` | `/api/v1/flow/crews/:id/join` | JWT | Join a crew (by ID or join code) |
| `GET` | `/api/v1/flow/crews/:id/members` | JWT | Crew members + active checkins |
| `POST` | `/api/v1/flow/crews/:id/checkin` | JWT | Broadcast location to crew (`venueName`, `status?`, `message?`, `lat?`, `lng?`) |
| `DELETE` | `/api/v1/flow/crews/:id/leave` | JWT | Leave a crew |
| `PATCH` | `/api/v1/flow/crews/:id` | JWT | Edit crew details (admin only) |
| `GET` | `/api/v1/flow/crews/:id/activity` | JWT | Crew activity feed (historical checkins) |
| `GET` | `/api/v1/flow/crews/:id/locations` | JWT | Live crew member locations |
| `POST` | `/api/v1/flow/crews/:id/locate` | JWT | "Where are you?" ping to crew members |
| `GET` | `/api/v1/flow/crews/discover` | JWT | Discover public crews to join |
| `DELETE` | `/api/v1/flow/crews/:id/members/:userId` | JWT | Remove a member (admin) |
| `PATCH` | `/api/v1/flow/crews/:id/members/:userId` | JWT | Change member role |

### Crew Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/flow/crews/:crewId/messages` | JWT | Get crew messages (`?limit=&before=`) |
| `POST` | `/api/v1/flow/crews/:crewId/messages` | JWT | Send a crew message (`message`, `replyTo?`) |

### Friends

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/flow/friends` | JWT | List active friends |
| `POST` | `/api/v1/flow/connect` | JWT | Accept flow invite (by code) |
| `GET` | `/api/v1/flow/invite` | JWT | Get personal invite link |

## Points

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/points` | JWT | User points, streak, level (aggregates across linked platforms) |
| `GET` | `/api/v1/flow/crews/:id/leaderboard` | JWT | Crew leaderboard |
| `GET` | `/api/v1/flow/crews/:id/missions` | JWT | Crew missions |
| `GET` | `/api/v1/flow/leaderboard` | No | Global crew leaderboard |

## AI Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/chat/completions` | No | OpenAI-compatible chat endpoint (xAI Grok + FlowB tools) |

## Location

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/me/location` | JWT | Update personal location |
| `GET` | `/api/v1/locations/:code` | No | Resolve QR/location code |
| `POST` | `/api/v1/flow/checkin/proximity` | JWT | Proximity auto-checkin (lat/lng based) |

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/notifications/farcaster/webhook` | No | Farcaster notification webhook (verified via `@farcaster/miniapp-node`) |
| `POST` | `/api/v1/webhooks/neynar` | No | Neynar mention webhook (@flowb on Farcaster) |
| `GET` | `/api/v1/me/notifications` | JWT | Get notification preferences |
| `PATCH` | `/api/v1/me/notifications` | JWT | Update notification preferences |

## User Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/preferences` | JWT | User preferences |
| `GET` | `/api/v1/me/linked-accounts` | JWT | Linked platform accounts |
| `POST` | `/api/v1/me/sync-linked-accounts` | JWT | Sync identity across platforms |
| `GET` | `/api/v1/me/privacy` | JWT | Privacy settings |
| `GET` | `/api/v1/me/crew-visibility` | JWT | Crew visibility settings |

## Agents (x402 Micropayments)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/agents` | No | List all 10 agent slots (with skills, balances, stats) |
| `GET` | `/api/v1/agents/me` | JWT | Get user's agent + transaction history |
| `POST` | `/api/v1/agents/claim` | JWT | Claim an open agent slot (`agentName?`) |
| `POST` | `/api/v1/agents/skills/equip` | JWT | Equip a skill to your agent (`skillSlug`) |
| `POST` | `/api/v1/agents/boost` | JWT | Boost an event with USDC (`eventId`, `durationHours?`) |
| `POST` | `/api/v1/agents/match` | JWT | Match/handshake with another agent (`targetUserId`, `context?`) |
| `POST` | `/api/v1/agents/tip` | JWT | Tip another user's agent (`recipientUserId`, `amount`) |
| `GET` | `/api/v1/agents/boosts` | No | Active event boosts (for feed ranking) |
| `GET` | `/api/v1/agents/transactions` | No | Transaction history (public, for demo) |

## Content

### Zones

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/zones` | No | List all active zones |
| `GET` | `/api/v1/zones/:slug` | No | Zone detail + event/venue counts |

### Venues

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/venues` | No | List venues (`?zone=`) |

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/categories` | No | All categories (slug, name, icon, color) |
| `GET` | `/api/v1/categories/:slug` | No | Single category detail |

### Booths

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/booths` | No | List booths (`?zone=&tier=&tags=&q=&limit=`) |
| `GET` | `/api/v1/booths/featured` | No | Featured sponsor booths |
| `GET` | `/api/v1/booths/:slug` | No | Single booth detail |

## Sponsor

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/sponsor/wallet` | No | Get sponsor wallet address |
| `POST` | `/api/v1/sponsor` | JWT | Create sponsorship (USDC amount + tx hash) |
| `POST` | `/api/v1/sponsor/:id/verify` | No | Verify sponsorship (internal) |
| `GET` | `/api/v1/sponsor/rankings` | No | Sponsor rankings |
| `GET` | `/api/v1/locations/ranked` | No | Top booths by sponsorship |
| `GET` | `/api/v1/sponsor/featured-event` | No | Featured event (highest verified bid) |

## Admin

All admin endpoints require JWT + admin role or `x-admin-key` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/stats` | Live dashboard stats |
| `GET` | `/api/v1/admin/events` | All events (includes hidden/featured flags) |
| `GET` | `/api/v1/admin/users` | All users |
| `GET` | `/api/v1/admin/plugins` | List plugins |
| `POST` | `/api/v1/admin/plugins/:id/configure` | Configure a plugin |
| `POST` | `/api/v1/admin/plugins/:id/toggle` | Enable/disable a plugin |
| `POST` | `/api/v1/admin/events/:id/feature` | Feature/unfeature an event |
| `POST` | `/api/v1/admin/events/:id/hide` | Hide/show an event |
| `POST` | `/api/v1/admin/events/:id/categorize` | Assign categories to an event |
| `POST` | `/api/v1/admin/points` | Award bonus points to a user |
| `POST` | `/api/v1/admin/users/:id/role` | Change user role |
| `POST` | `/api/v1/admin/notifications/test` | Send test notification |
| `GET` | `/api/v1/admin/notifications/stats` | Notification delivery stats |
| `POST` | `/api/v1/admin/cast` | Post a Farcaster cast (via Neynar) |
| `POST` | `/api/v1/admin/scan-events` | Trigger manual event scan |
| `POST` | `/api/v1/admin/booths` | Create booth |
| `PATCH` | `/api/v1/admin/booths/:id` | Update booth |
| `POST` | `/api/v1/admin/venues` | Create venue |
| `POST` | `/api/v1/agents/award-top-scorer` | Award agent slots to top points user |
| `POST` | `/api/v1/agents/blast` | Notification blast to all users |

## System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check + plugin status + uptime |
| `GET` | `/api/v1/stats` | No | Live stats (crews, points, checkins today) |
| `GET` | `/api/v1/health/luma` | No | Luma API health check (cached 5min) |
| `GET` | `/api/v1/plugins` | No | Plugin status |
| `POST` | `/api/v1/action` | No | Generic action endpoint (plugin router) |
| `POST` | `/api/v1/events` | No | Event discovery (POST variant) |

## Pages & Redirects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/connect` | Telegram Login Widget page |
| `GET` | `/auth/telegram` | Auth callback (HMAC verify + link) |
| `GET` | `/e/:id` | Smart event link (UA-based: TG/FC/Web redirect) |
| `GET` | `/f/:code` | Flow invite deep link |
| `GET` | `/g/:code` | Crew join deep link |
| `GET` | `/gi/:code` | Personal crew invite deep link |
| `GET` | `/ref/:code` | Referral deep link |


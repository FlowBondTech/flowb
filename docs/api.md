---
title: API Reference
---

# API Reference

FlowB exposes two backend servers:

| Server | Domain | Purpose |
|--------|--------|---------|
| **eGator API** | `egator-api.fly.dev` | Event discovery (categories, discover, tonight) |
| **FlowB API** | `flowb.fly.dev` | User auth, social, crews, points, RSVP, calendar |

---

## AUTH

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/telegram` | No | Telegram Mini App |
| `POST` | `/api/v1/auth/farcaster` | No | Farcaster Mini App (Quick Auth + legacy SIWF fallback) |
| `POST` | `/api/v1/auth/app` | No | Native App (hardcoded users for EthDenver) |
| `POST` | `/api/v1/auth/web` | No | Web (Privy) - issues a FlowB JWT for web users |
| `POST` | `/api/v1/auth/claim-points` | Yes | Claim pending points (pre-auth actions → backend account) |

## FEED

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/feed/ethdenver` | No | EthDenver Farcaster Feed (aggregates posts with keywords) |
| `GET` | `/api/v1/feed/activity` | Yes | Global activity feed — check-ins, crew messages, hot venues, trending events |

## EVENTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/events` | No | DB-first discovery |
| `GET` | `/api/v1/events/:id` | No | Single event detail (DB-first) |
| `POST` | `unknown` | Yes | RSVP (requires auth) |
| `DELETE` | `/api/v1/events/:id/rsvp` | Yes | Cancel RSVP (requires auth) |

## SCHEDULE

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/schedule` | Yes | Personal schedule (requires auth) |
| `POST` | `/api/v1/me/schedule/:id/checkin` | Yes | Mark checkin (requires auth) |

## FLOW

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/flow/crews` | Yes | Crews list (requires auth) |
| `POST` | `/api/v1/flow/crews` | Yes | Create crew (requires auth) |
| `POST` | `/api/v1/flow/crews/:id/join` | Yes | Join crew (requires auth) |
| `GET` | `/api/v1/flow/crews/:id/members` | Yes | Crew members + live checkins (requires auth) |
| `POST` | `unknown` | Yes | Crew checkin - broadcast location (requires auth) |
| `GET` | `/api/v1/flow/friends` | Yes | Friends list (requires auth) |
| `POST` | `/api/v1/flow/connect` | Yes | Connect / send friend request (requires auth) |
| `GET` | `/api/v1/flow/invite` | Yes | Get personal invite link (requires auth) |
| `DELETE` | `/api/v1/flow/crews/:id/leave` | Yes | Leave crew (requires auth) |
| `GET` | `/api/v1/flow/crews/discover` | Yes | Discover public crews (requires auth) |
| `DELETE` | `/api/v1/flow/crews/:id/members/:userId` | Yes | Remove member from crew (admin, requires auth) |
| `PATCH` | `/api/v1/flow/crews/:id/members/:userId` | Yes | Update member role (promote/demote, requires auth) |
| `PATCH` | `/api/v1/flow/crews/:id` | Yes | Edit crew details (requires auth, admin only) |
| `GET` | `/api/v1/flow/crews/:id/activity` | Yes | Crew activity feed - historical checkins (requires auth) |
| `POST` | `unknown` | Yes | QR check-in (requires auth) |
| `GET` | `/api/v1/flow/crews/:id/locations` | Yes | Crew member locations (requires auth, member only) |
| `POST` | `/api/v1/flow/crews/:id/locate` | Yes | "Where are you?" ping (requires auth, any member) |
| `GET` | `/api/v1/flow/crews/:crewId/messages` | Yes | Crew messages - get (requires auth) |
| `POST` | `/api/v1/flow/crews/:crewId/messages` | Yes | Crew messages - send (requires auth) |

## POINTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/points` | Yes | Get user points + streak (requires auth) |
| `GET` | `/api/v1/flow/crews/:id/leaderboard` | Yes | Crew leaderboard (requires auth) |
| `GET` | `/api/v1/flow/leaderboard` | No | Global crew leaderboard (no auth required) |
| `GET` | `/api/v1/flow/crews/:id/missions` | Yes | Crew missions (requires auth) |

## LOCATIONS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/locations/:code` | No | Resolve QR code (no auth) |

## CHAT

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/chat/completions` | No | AI Chat with tool calling (xAI Grok + FlowB tools) |

## LOCATION

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/me/location` | Yes | Update personal location (requires auth) |

## FARCASTER

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/notifications/farcaster/webhook` | No | Notification webhook (verified via @farcaster/miniapp-node) |

## NEYNAR

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/webhooks/neynar` | No | Mention webhook (@flowb mentions on Farcaster) |

## Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/preferences` | Yes |  |
| `PATCH` | `unknown` | No |  |
| `GET` | `/api/v1/me/linked-accounts` | Yes |  |
| `GET` | `/api/v1/me/link-status` | Yes |  |
| `POST` | `/api/v1/me/sync-linked-accounts` | Yes |  |
| `GET` | `/api/v1/me/privacy` | Yes |  |
| `PATCH` | `unknown` | Yes |  |
| `GET` | `/api/v1/me/crew-visibility` | Yes |  |
| `GET` | `/api/v1/events/:id/social` | No |  |
| `POST` | `/api/v1/admin/scan-events` | No |  |

## REMINDERS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/events/:id/reminders` | Yes | Set reminders for a specific event (requires auth) |
| `GET` | `/api/v1/events/:id/reminders` | Yes | Get reminders for a specific event (requires auth) |
| `DELETE` | `/api/v1/events/:id/reminders` | Yes | Delete all reminders for an event (requires auth) |

## CALENDAR

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/events/:id/calendar` | No | Generate .ics file for an event (no auth, shareable) |

## ADMIN

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/admin/stats` | No | Live dashboard stats |
| `GET` | `/api/v1/admin/plugins` | No | List plugins |
| `POST` | `/api/v1/admin/plugins/:id/configure` | No | Configure plugin |
| `POST` | `/api/v1/admin/plugins/:id/toggle` | No | Toggle plugin |
| `POST` | `/api/v1/admin/events/:id/feature` | Yes | Feature/unfeature an event |
| `POST` | `/api/v1/admin/events/:id/hide` | Yes | Hide/show an event |
| `POST` | `/api/v1/admin/points` | No | Award bonus points |
| `POST` | `/api/v1/admin/users/:id/role` | No | Change user role |
| `POST` | `/api/v1/admin/notifications/test` | No | Send test notification |
| `GET` | `/api/v1/admin/notifications/stats` | No | Notification delivery stats |
| `GET` | `/api/v1/admin/events` | No | All events (for curation - includes featured/hidden) |
| `POST` | `/api/v1/admin/booths` | No | Create booth |
| `PATCH` | `/api/v1/admin/booths/:id` | Yes | Update booth |
| `POST` | `/api/v1/admin/events/:id/categorize` | No | Assign categories to an event |
| `POST` | `/api/v1/admin/venues` | No | Create venue |
| `GET` | `/api/v1/admin/users` | No | All users (for user manager) |

## ZONES

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/zones` | No | List all active zones |
| `GET` | `/api/v1/zones/:slug` | No | Single zone detail + counts |

## VENUES

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/venues` | No | List venues (optionally by zone) |

## CATEGORIES

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/categories` | No | All categories for filter UI |

## BOOTHS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/booths` | No | List booths (filterable by zone, tier, tags, search) |
| `GET` | `/api/v1/booths/featured` | No | Featured booths (sponsors) |
| `GET` | `/api/v1/booths/:slug` | No | Single booth detail |

## SPONSOR

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/sponsor/wallet` | No | Get wallet address |
| `POST` | `/api/v1/sponsor` | Yes | Create sponsorship (requires auth) |
| `POST` | `/api/v1/sponsor/:id/verify` | No | Manual verify (internal) |
| `GET` | `/api/v1/sponsor/rankings` | No | Rankings |
| `GET` | `/api/v1/locations/ranked` | No | Ranked locations (Top Booths) |
| `GET` | `/api/v1/sponsor/featured-event` | No | Featured event boost (highest verified boost for featured spot) |
| `POST` | `/api/v1/flow/checkin/proximity` | Yes | Proximity auto-checkin (requires auth) |

## AGENTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/agents` | No | List all agent slots (public) |
| `GET` | `/api/v1/agents/me` | Yes | Get my agent (requires auth) |
| `POST` | `/api/v1/agents/claim` | Yes | Claim an open agent slot (requires auth) |
| `POST` | `/api/v1/agents/skills/purchase` | Yes | Purchase a skill (x402-style flow) |
| `POST` | `/api/v1/agents/boost-event` | Yes | Boost an event (x402 micropayment) |
| `POST` | `/api/v1/agents/recommend` | Yes | Agent-to-agent recommendation (x402) |
| `POST` | `/api/v1/agents/tip` | Yes | Send a tip to another user/agent |
| `GET` | `/api/v1/agents/boosts` | No | Get active event boosts (for feed ranking) |
| `GET` | `/api/v1/agents/transactions` | No | Transaction history (public, for demo) |
| `POST` | `/api/v1/agents/award-top-scorer` | No | Award top points user (admin endpoint) |
| `POST` | `/api/v1/agents/blast` | No | Notification blast to all users (admin) |

## FEEDBACK

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `unknown` | No | Submit bug reports, feature requests, feedback |

## NOTE

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/stats` | No | Leaderboard route moved to routes.ts (uses core.getGlobalCrewRanking) |

## Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/admin/cast` | No |  |

## Health check + plugin status

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No |  |

## Luma API health check (cached 5 min)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health/luma` | No |  |

## Generic action endpoint - preserves the agent/plugin router pattern

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/action` | No |  |

## Convenience endpoint for event discovery

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/events` | No |  |

## Plugin status

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/plugins` | No |  |

## we verify HMAC, store the link in Supabase, show success page.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/telegram` | No |  |

## Serves the connect page with the Telegram Login Widget embedded

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/connect` | No |  |

## - Otherwise               -> redirect to flowb.me web with event context

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/e/:id` | No |  |

## that redirect to the Telegram bot deep link.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/${path}/:code` | No |  |

---

*Auto-generated from `src/server/routes.ts` and `src/server/app.ts` on 2026-02-22 21:04:47 UTC*

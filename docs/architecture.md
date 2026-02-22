---
title: Architecture
---

# FlowB Architecture

## System Overview

```
                          flowb.me (Netlify)
                              |
              +---------------+---------------+
              |               |               |
         Web App         Docs (VitePress)   Short Links
         (static)        /docs/             /f/ /g/ /gi/
              |                              -> t.me deep links
              |
     +--------+--------+
     |                  |
egator-api.fly.dev   flowb.fly.dev
(Event Discovery)    (User/Social/Auth)
     |                  |
     +--------+---------+
              |
         Supabase (DB)
              |
     +--------+---------+
     |                  |
 Telegram Bot       Farcaster
 (Grammy)          (Neynar + Poster)
     |                  |
     +--------+---------+
              |
          Plugins
   flow | points | egator
   neynar | danz
```

## Backend Servers

| Server | Domain | Purpose |
|--------|--------|---------|
| **eGator API** | `egator-api.fly.dev` | Event discovery, categories, search, tonight |
| **FlowB API** | `flowb.fly.dev` | Auth, user profiles, crews, RSVP, points, calendar |

## Frontend Apps

| App | Domain | Tech | Purpose |
|-----|--------|------|---------|
| **Web** | `flowb.me` | Static HTML/JS | Event discovery, auth, dashboard |
| **Farcaster Mini App** | `flowb-farcaster.netlify.app` | Next.js static export | Farcaster frame mini app |
| **Telegram Mini App** | `flowb-telegram.netlify.app` | Vite | Telegram WebApp mini app |
| **Mobile** | App Store / TestFlight | Expo React Native | Native mobile app |

## Plugin Architecture

FlowB uses a plugin system where each plugin registers actions that can be invoked from any interface (bot, API, mini app).

**Core class**: `FlowBCore` (`src/core/flowb.ts`)

Plugins implement the `FlowBPlugin` interface:
- `name`: Display name
- `actions`: Map of action names to descriptions
- `execute(action, uid, input)`: Handle an action

## User Identity

Users are identified by platform-prefixed IDs:
- `telegram_{telegramId}` - Telegram users
- `farcaster_{fid}` - Farcaster users
- `web_{privyUserId}` - Web (Privy auth) users

## Database

All data stored in **Supabase** (PostgreSQL). Tables are prefixed with `flowb_`.

Key tables:
- `flowb_sessions` - User sessions and display names
- `flowb_user_points` - Points, streaks, milestones
- `flowb_connections` - Friend connections (flow)
- `flowb_groups` / `flowb_group_members` - Crews
- `flowb_rsvps` - Event RSVPs
- `flowb_crew_join_requests` - Pending crew join requests
- `flowb_event_reminders` - User event reminder preferences

## Short Links

| Pattern | Example | Redirects To |
|---------|---------|-------------|
| `/f/{code}` | `flowb.me/f/abc123` | `t.me/Flow_b_bot?start=f_abc123` |
| `/g/{code}` | `flowb.me/g/xyz789` | `t.me/Flow_b_bot?start=g_xyz789` |
| `/gi/{code}` | `flowb.me/gi/inv456` | `t.me/Flow_b_bot?start=gi_inv456` |
| `/ref/{code}` | `flowb.me/ref/ref123` | `t.me/Flow_b_bot?start=ref_ref123` |
| `/e/{id}` | `flowb.me/e/event-id` | Platform-detected redirect |

---

*Auto-generated on 2026-02-22 06:13:19 UTC*

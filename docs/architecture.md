---
title: Architecture
---

# FlowB Architecture

## System Overview

```
                        flowb.fly.dev
                    (Fastify — ALL routes)
                            |
         +------------------+------------------+
         |                  |                  |
    Auth/Social        Events/Feed        Agents/x402
    (JWT, Privy,       (DB-first,         (10-slot system,
     TG/FC/Web)         scanner)           micropayments)
         |                  |                  |
         +------------------+------------------+
                            |
                       Supabase (DB)
                       flowb_* tables
                            |
         +------------------+------------------+
         |                  |                  |
    Telegram Bot       Mini Apps           Web App
    (Grammy)           FC + TG             (flowb.me)
         |                  |                  |
    t.me/Flow_b_bot   fc.flowb.me         flowb.me
                       tg.flowb.me        (static + Privy)
                            |
                     Mobile (Expo)
                     me.flowb.app
```

## Backend Server

All backend routes are served from a **single Fastify server** deployed to Fly.io:

| Server | Domain | Purpose |
|--------|--------|---------|
| **FlowB API** | `flowb.fly.dev` | Auth, events, social, crews, points, agents, admin, feeds |

> **Note**: `egator-api.fly.dev` was previously used for event discovery but is now consolidated. All routes live on `flowb.fly.dev`.

### Scheduled Tasks (in-process)

- **Event scanner**: Runs every 4 hours, imports events from Luma and other sources into `flowb_events`
- **Farcaster poster**: Checks every 5 minutes, posts event cards at time slots (8am, 10am, 12pm, 3pm, 5pm, 8pm MST)

## Frontend Apps

| App | Domain | Tech | Deploy |
|-----|--------|------|--------|
| **Web** | `flowb.me` | Static HTML/JS + Privy auth | Netlify `77294928...` |
| **Farcaster Mini App** | `fc.flowb.me` | Next.js static export | Netlify `67ccf00b...` |
| **Telegram Mini App** | `tg.flowb.me` | Vite + React | Netlify `e167d298...` |
| **Docs** | `docs.flowb.me` | VitePress | Netlify `42b1723c...` |
| **Mobile** | App Store | Expo React Native | EAS (`me.flowb.app`) |

## Plugin Architecture

FlowB uses a plugin system where `FlowBCore` (`src/core/flowb.ts`) loads plugins at startup. Each plugin registers actions invokable from any interface (bot, API, mini app).

### Plugins

| Plugin | File | Lines | Purpose |
|--------|------|-------|---------|
| **flow** | `src/plugins/flow/index.ts` | 1669 | Crews, friends, connections, RSVPs, schedules, checkins |
| **danz** | `src/plugins/danz/index.ts` | 1162 | Dance events, challenges, stats |
| **points** | `src/plugins/points/index.ts` | 653 | Points, streaks, milestones, leaderboards |
| **neynar** | `src/plugins/neynar/index.ts` | 397 | Farcaster integration via Neynar API |
| **egator** | `src/plugins/egator/index.ts` | 248 | Multi-source event discovery (Luma, Eventbrite, etc.) |
| **agentkit** | `src/plugins/agentkit/index.ts` | 225 | Coinbase AgentKit — onchain wallet actions on Base |

### Plugin Interface

```typescript
interface FlowBPlugin {
  id: string;
  name: string;
  description: string;
  actions: Record<string, { description: string; requiresAuth?: boolean }>;
  configure(config: any): void;
  isConfigured(): boolean;
  execute(action: string, input: ToolInput, context: FlowBContext): Promise<string>;
}
```

## Services

10 backend services in `src/services/`:

| Service | Purpose |
|---------|---------|
| **ai-chat** | Tool-augmented chat using xAI Grok with function calling |
| **notifications** | Cross-platform notification dispatch (TG DM + FC push) |
| **identity** | Cross-platform user identity resolution |
| **farcaster-notify** | Farcaster Mini App push notifications |
| **farcaster-poster** | Scheduled Farcaster cast posting |
| **farcaster-responder** | @flowb mention handler |
| **event-scanner** | Imports events from external sources into DB |
| **telegram-auth** | Telegram Login Widget HMAC verification |
| **privy** | Privy API client for web auth |
| **cdp** | Coinbase CDP REST API client for Base network |

## User Identity

Users are identified by platform-prefixed IDs:

| Platform | Format | Example |
|----------|--------|---------|
| Telegram | `telegram_{telegramId}` | `telegram_123456789` |
| Farcaster | `farcaster_{fid}` | `farcaster_42` |
| Web | `web_{privyUserId}` | `web_did:privy:abc123` |
| App | `app_{username}` | `app_admin` |

Cross-platform identity resolution via `resolveCanonicalId()` links accounts across platforms.

## Database

All data stored in **Supabase** (PostgreSQL). Tables prefixed with `flowb_`.

### Migrations (15)

| # | Migration | Key Tables |
|---|-----------|------------|
| 002 | Points system | `flowb_user_points`, `flowb_point_history` |
| 003 | Telegram widget auth | `flowb_sessions` |
| 004 | Flow connections | `flowb_connections` |
| 005 | Sessions | Session enhancements |
| 006 | Mini app tables | `flowb_rsvps`, `flowb_schedules`, `flowb_checkins` |
| 007 | Crew enhancements | `flowb_groups`, `flowb_group_members`, `flowb_crew_join_requests` |
| 008 | Notification preferences | Notification toggles on sessions |
| 009 | Event curation | `flowb_events`, `flowb_event_categories`, push tokens |
| 010 | Display names | Display name fields |
| 011 | Channel chatter | `flowb_channel_chatter`, signal extraction |
| 012 | Crew chat | `flowb_crew_messages` |
| 013 | Master events | `flowb_events` enrichment, zones, venues, booths |
| 014 | Identity platforms | `flowb_identity_links` for cross-platform resolution |
| 015 | Agents | `flowb_agents`, `flowb_agent_skills`, `flowb_agent_transactions`, `flowb_event_boosts` |

## Short Links

Served from `flowb.fly.dev` with UA-based platform detection:

| Pattern | Example | Behavior |
|---------|---------|----------|
| `/f/{code}` | `flowb.me/f/abc123` | Telegram deep link (`t.me/Flow_b_bot?start=f_abc123`) |
| `/g/{code}` | `flowb.me/g/xyz789` | Crew join link |
| `/gi/{code}` | `flowb.me/gi/inv456` | Personal tracked crew invite |
| `/ref/{code}` | `flowb.me/ref/ref123` | Referral link |
| `/e/{id}` | `flowb.me/e/event-id` | Smart redirect: TG -> mini app, FC -> Warpcast, else -> web |

## Notification System

Cross-platform with built-in safeguards:

- **Primary channel**: Telegram bot DM
- **Fallback**: Farcaster push notification
- **Dedup**: Per-recipient, per-type, per-reference
- **Rate limit**: Configurable daily cap (default 10/day/user)
- **Quiet hours**: Opt-in, per-user timezone, configurable start/end
- **Types**: crew_checkin, friend_rsvp, crew_rsvp, crew_join, locate_ping, crew_message, event_reminder

## Agents System

10-slot personal AI agent system with x402 micropayments:

- Users claim an open agent slot and name their agent
- Agents have USDC balances, skills, and transaction history
- Skills: basic-search, event-discovery, social-connector, mood-matcher
- Actions: equip skills, boost events, match with other agents, tip users
- Top points scorer wins 2 agents + $25 USDC prize


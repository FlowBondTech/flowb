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
  flowb.fly.dev      Supabase (DB)
  (All APIs)              |
     |           +--------+---------+
     |           |        |         |
     |      Telegram   Farcaster  WhatsApp/Signal
     |      Bot        (Neynar)   Bots
     |      (Grammy)              |
     +----------------------------+
              |
          Plugins (15)
   agents | agentkit | automation
   billing | cuflow | danz | egator
   fiflow | flow | meeting | neynar
   points | referral | social | websites
```

## Backend Server

All APIs are served from a single consolidated Fastify server.

| Server | Domain | Purpose |
|--------|--------|---------|
| **FlowB API** | `flowb.fly.dev` | All routes: events, auth, social, crews, points, RSVP, calendar, boost, payments, meetings, biz, support |

> Note: `egator-api.fly.dev` was previously a separate events server but has been consolidated into `flowb.fly.dev`.

## Frontend Apps

| App | Domain | Tech | Purpose |
|-----|--------|------|---------|
| **Web** | `flowb.me` | Static HTML/JS | Events, auth, dashboard, settings |
| **Farcaster Mini App** | `fc.flowb.me` | Next.js static export | Farcaster frame mini app |
| **Telegram Mini App** | `tg.flowb.me` | Vite | Telegram WebApp mini app |
| **Mobile** | App Store / TestFlight | Expo React Native | Native mobile app |
| **Docs** | `docs.flowb.me` | VitePress | Documentation site |
| **Kanban** | `kanban.flowb.me` | React | Kanban board for task/lead management |
| **Biz** | `biz.flowb.me` | React | Business lead pipeline + tasks |
| **eGator Admin** | `egator.flowb.me` | Static | Event curation dashboard |

## Plugin Architecture

FlowB uses a plugin system where each plugin registers actions that can be invoked from any interface (bot, API, mini app).

**Core class**: `FlowBCore` (`src/core/flowb.ts`)

Plugins implement the `FlowBPlugin` interface:
- `name`: Display name
- `actions`: Map of action names to descriptions
- `execute(action, uid, input)`: Handle an action

### Registered Plugins (15)

| Plugin | Directory | Purpose |
|--------|-----------|---------|
| **agents** | `src/plugins/agents/` | Personal AI agent slots, skills, USDC micropayments |
| **agentkit** | `src/plugins/agentkit/` | Agent toolkit and capabilities framework |
| **automation** | `src/plugins/automation/` | Trigger-action automations (follow-ups, reminders, nurture) |
| **billing** | `src/plugins/billing/` | Subscription plans, usage tracking, Stripe integration |
| **cuflow** | `src/plugins/cuflow/` | Code intelligence — engineering briefs, velocity, hotspots |
| **danz** | `src/plugins/danz/` | Dance moves and check-in challenges |
| **egator** | `src/plugins/egator/` | Event discovery, aggregation, scanning from external sources |
| **fiflow** | `src/plugins/fiflow/` | CFO dashboards, financial intelligence |
| **flow** | `src/plugins/flow/` | Friend connections, crews, crew chat, social features |
| **meeting** | `src/plugins/meeting/` | Meeting scheduling, share links, briefings, follow-ups |
| **neynar** | `src/plugins/neynar/` | Farcaster integration via Neynar API |
| **points** | `src/plugins/points/` | Points system, streaks, milestones, leaderboards |
| **referral** | `src/plugins/referral/` | Referral programs, commission tracking, payouts |
| **social** | `src/plugins/social/` | Multi-platform social posting (SocialB) |
| **websites** | `src/plugins/websites/` | Managed business websites and e-commerce |

## Bot Platforms

| Platform | Directory | Tech | Status |
|----------|-----------|------|--------|
| **Telegram** | `src/telegram/bot.ts` | Grammy | Live |
| **WhatsApp** | `src/whatsapp/bot.ts` | WhatsApp Cloud API | Live |
| **Signal** | `src/signal/bot.ts` | Signal API (self-hosted) | Live |
| **Farcaster** | `src/services/farcaster-responder.ts` | Neynar webhooks | Live |

## User Identity

Users are identified by platform-prefixed IDs:
- `telegram_{telegramId}` — Telegram users
- `farcaster_{fid}` — Farcaster users
- `web_{privyUserId}` — Web (Privy/Supabase Auth) users
- `whatsapp_{phoneHash}` — WhatsApp users
- `signal_{phoneHash}` — Signal users

Cross-platform identity linking is handled by `src/services/identity.ts`.

## Database

All data stored in **Supabase** (PostgreSQL). Tables are prefixed with `flowb_`.

Key tables:
- `flowb_sessions` — User sessions and display names
- `flowb_user_points` — Points, streaks, milestones
- `flowb_connections` — Friend connections (flow)
- `flowb_groups` / `flowb_group_members` — Crews
- `flowb_rsvps` — Event RSVPs
- `flowb_crew_join_requests` — Pending crew join requests
- `flowb_event_reminders` — User event reminder preferences
- `flowb_keyword_alerts` — Keyword/topic event alerts
- `flowb_leads` — CRM leads
- `flowb_meetings` — Scheduled meetings
- `flowb_automations` — Trigger-action automations
- `flowb_referral_links` / `flowb_referral_commissions` — Referral system
- `flowb_agents` / `flowb_agent_skills` — AI agent slots
- `flowb_boost_cycles` / `flowb_boost_bids` — Event boost auctions
- `flowb_group_intel_config` / `flowb_group_signals` — Group intelligence
- `flowb_crew_messages` — Crew chat messages
- `flowb_support_tickets` — Support email tickets

## Payment System

Multi-method payment support via `src/services/payments/`:

| Method | Service | Status |
|--------|---------|--------|
| **Stripe** | `payments/stripe.ts` | Live |
| **Crypto (USDC on Base)** | `payments/crypto.ts` | Live |
| **Telegram Stars** | `payments/telegram-stars.ts` | Live |

Unified facade: `payments/index.ts` — `getPaymentService()`

## Short Links

| Pattern | Example | Redirects To |
|---------|---------|-------------|
| `/f/{code}` | `flowb.me/f/abc123` | `t.me/Flow_b_bot?start=f_abc123` |
| `/g/{code}` | `flowb.me/g/xyz789` | `t.me/Flow_b_bot?start=g_xyz789` |
| `/gi/{code}` | `flowb.me/gi/inv456` | `t.me/Flow_b_bot?start=gi_inv456` |
| `/ref/{code}` | `flowb.me/ref/ref123` | `t.me/Flow_b_bot?start=ref_ref123` |
| `/e/{id}` | `flowb.me/e/event-id` | Platform-detected redirect |
| `/m/{code}` | `flowb.me/m/meet123` | Meeting detail page |

## Hosting & Deployment

| Target | Platform | Domain |
|--------|----------|--------|
| Backend API | Fly.io | `flowb.fly.dev` |
| Web App | Netlify | `flowb.me` |
| FC Mini App | Netlify | `fc.flowb.me` |
| TG Mini App | Netlify | `tg.flowb.me` |
| Docs | Netlify | `docs.flowb.me` |
| Database | Supabase | `eoajujwpdkfuicnoxetk.supabase.co` |
| VPS (n8n, Postiz, Signal) | OVH | `15.204.172.65` |

---

*Updated 2026-03-17*

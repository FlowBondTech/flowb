---
title: Services
---

# Services

Backend services that power FlowB's cross-platform features.

| Service | File | Key Exports |
|---------|------|-------------|
| AI Chat | `src/services/ai-chat.ts` | `handleChat` |
| CDP | `src/services/cdp.ts` | `CDPClient` |
| Event Scanner | `src/services/event-scanner.ts` | `scanForNewEvents` |
| Farcaster Notify | `src/services/farcaster-notify.ts` | `sendFarcasterNotification`, `sendFarcasterNotificationBatch`, `upsertNotificationToken`, `disableNotificationToken` |
| Farcaster Poster | `src/services/farcaster-poster.ts` | `postTimeSlotCast`, `postEventCard`, `postDailyDigest`, `postEveningHighlight`, `processEventQueue` |
| Farcaster Responder | `src/services/farcaster-responder.ts` | `handleMention` |
| Identity | `src/services/identity.ts` | `resolveCanonicalId`, `getLinkedIds` |
| Notifications | `src/services/notifications.ts` | `notifyCrewCheckin`, `notifyFriendRsvp`, `sendEventReminders`, `notifyCrewJoin`, `notifyCrewMemberRsvp`, `notifyCrewLocate`, `notifyCrewMessage` |
| Privy | `src/services/privy.ts` | `PrivyClient` |
| Telegram Auth | `src/services/telegram-auth.ts` | `verifyTelegramAuth`, `parseTelegramAuthParams` |

## Details

### AI Chat

Tool-augmented conversational AI using xAI Grok with function calling.

**Source**: `src/services/ai-chat.ts`

**Tools available to the AI**:
- `search_events` — Search live EthDenver events by keyword, date, venue
- `get_my_schedule` — Get user's RSVP'd events
- `find_person` — Find a friend/crew member's current location
- `locate_my_crew` — Get all crew members' latest locations
- `update_my_location` — Check in at a venue
- `share_location_code` — Generate a 4-char sharing code
- `lookup_location_code` — Look up a location code
- `rsvp_event` — RSVP to an event
- `get_my_points` — Check points, streak, ranking

### Notifications

Cross-platform notification dispatch with dedup, rate limiting, and quiet hours.

**Source**: `src/services/notifications.ts`

**Notification types**:

| Function | Trigger | Message |
|----------|---------|---------|
| `notifyCrewCheckin` | Member checks in at a venue | `{emoji} @user checked in at {venue} (+5 pts)` |
| `notifyFriendRsvp` | Friend RSVPs to an event | `@user is going to {event}!` |
| `notifyCrewMemberRsvp` | Crew member RSVPs | `{emoji} @user is going to {event}! (+5 pts)` |
| `notifyCrewJoin` | Someone joins a crew | `{emoji} @user just joined {crew}! (+10 pts)` |
| `notifyCrewLocate` | "Where are you?" ping | `{emoji} @requester is looking for you!` |
| `notifyCrewMessage` | Crew chat message | `{emoji} @user in {crew}: {preview}` |
| `sendEventReminders` | Cron-based, 10min windows | `{event} starts in {N} min ({time})` |

**Safeguards**:
- Per-user daily notification limit (default 10)
- Opt-in quiet hours with per-user timezone
- Per-type notification toggles
- Dedup by (recipient, type, reference, triggered_by)
- Delivery: Telegram DM primary, Farcaster push fallback

### Identity

Cross-platform identity resolution — links `telegram_*`, `farcaster_*`, and `web_*` user IDs to a canonical identity.

**Source**: `src/services/identity.ts`

- `resolveCanonicalId(cfg, userId, metadata?)` — Find or create canonical ID for a platform user
- `getLinkedIds(cfg, canonicalId)` — Get all platform IDs linked to a canonical identity

Used by points aggregation (combine points across platforms) and profile resolution.

### Event Scanner

Periodically imports events from external sources (Luma discover API, etc.) into `flowb_events` table.

**Source**: `src/services/event-scanner.ts`

- Runs every 4 hours via `setInterval` in `app.ts`
- Initial scan 30s after server startup
- Deduplicates by `source_event_id`
- Also triggered manually via `POST /api/v1/admin/scan-events`

### Farcaster Poster

Scheduled Farcaster casting service. Posts event cards at time-slot intervals throughout the day.

**Source**: `src/services/farcaster-poster.ts`

- Time slots: 8am, 10am, 12pm, 3pm, 5pm, 8pm MST
- Uses Neynar API to publish casts
- Checks every 5 minutes, fires once per slot per day

### Farcaster Notify

Send push notifications to Farcaster mini app users.

**Source**: `src/services/farcaster-notify.ts`

- Manages notification tokens (opt-in/opt-out via webhook)
- Sends to Farcaster's notification delivery system

### Farcaster Responder

Handles @flowb mentions on Farcaster — responds to questions about events, locations, etc.

**Source**: `src/services/farcaster-responder.ts`

### CDP (Coinbase Developer Platform)

REST API client for Base network on-chain actions.

**Source**: `src/services/cdp.ts`

Used by the AgentKit plugin for wallet balance, ETH transfers, ERC20 transfers.

### Privy

Zero-dependency Privy API client for web authentication.

**Source**: `src/services/privy.ts`

### Telegram Auth

Server-side HMAC-SHA-256 verification of Telegram Login Widget callbacks.

**Source**: `src/services/telegram-auth.ts`

- `verifyTelegramAuth(authData, botToken)` — Verify HMAC signature
- `parseTelegramAuthParams(params)` — Parse query string into auth data


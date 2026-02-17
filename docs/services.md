---
title: Services
---

# Services

Backend services that power FlowB's cross-platform features.

| Service | File | Exports |
|---------|------|---------|
| cdp | `src/services/cdp.ts` | — |
| event scanner | `src/services/event-scanner.ts` | `scanForNewEvents` |
| farcaster notify | `src/services/farcaster-notify.ts` | `sendFarcasterNotification`, `sendFarcasterNotificationBatch`, `upsertNotificationToken`, `disableNotificationToken` |
| farcaster poster | `src/services/farcaster-poster.ts` | `postEventCard`, `postDailyDigest`, `postEveningHighlight`, `announceNewPublicCrew`, `postLeaderboardHighlight`, `postPromo`, `postNewEventAlert`, `processEventQueue` |
| farcaster responder | `src/services/farcaster-responder.ts` | `handleMention` |
| identity | `src/services/identity.ts` | `resolveCanonicalId`, `getLinkedIds` |
| notifications | `src/services/notifications.ts` | `notifyCrewCheckin`, `notifyFriendRsvp`, `sendEventReminders`, `notifyCrewJoin`, `notifyCrewMemberRsvp`, `notifyCrewLocate` |
| privy | `src/services/privy.ts` | — |
| telegram auth | `src/services/telegram-auth.ts` | `verifyTelegramAuth`, `parseTelegramAuthParams` |

## Details

### cdp

Coinbase CDP REST API v2 client for Base network

**Source**: `src/services/cdp.ts`

### event scanner

Event Scanner Service

**Source**: `src/services/event-scanner.ts`

**Exports**: `scanForNewEvents()`

### farcaster notify

Farcaster Mini App Notification Sender

**Source**: `src/services/farcaster-notify.ts`

**Exports**: `sendFarcasterNotification()`, `sendFarcasterNotificationBatch()`, `upsertNotificationToken()`, `disableNotificationToken()`

### farcaster poster

FlowB Farcaster Poster Service

**Source**: `src/services/farcaster-poster.ts`

**Exports**: `postEventCard()`, `postDailyDigest()`, `postEveningHighlight()`, `announceNewPublicCrew()`, `postLeaderboardHighlight()`, `postPromo()`, `postNewEventAlert()`, `processEventQueue()`

### farcaster responder

Farcaster Responder Service

**Source**: `src/services/farcaster-responder.ts`

**Exports**: `handleMention()`

### identity

Cross-Platform Identity Resolution Service

**Source**: `src/services/identity.ts`

**Exports**: `resolveCanonicalId()`, `getLinkedIds()`

### notifications

FlowB Notification Service

**Source**: `src/services/notifications.ts`

**Exports**: `notifyCrewCheckin()`, `notifyFriendRsvp()`, `sendEventReminders()`, `notifyCrewJoin()`, `notifyCrewMemberRsvp()`, `notifyCrewLocate()`

### privy

Privy API Client (zero-dep)

**Source**: `src/services/privy.ts`

### telegram auth

Telegram Login Widget - Server-side verification

**Source**: `src/services/telegram-auth.ts`

**Exports**: `verifyTelegramAuth()`, `parseTelegramAuthParams()`

---

*Auto-generated on 2026-02-17 22:56:47 UTC*

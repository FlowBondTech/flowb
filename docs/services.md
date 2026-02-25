---
title: Services
---

# Services

Backend services that power FlowB's cross-platform features.

| Service | File | Exports |
|---------|------|---------|
| ai chat | `src/services/ai-chat.ts` | `handleChat` |
| cdp | `src/services/cdp.ts` | — |
| event scanner | `src/services/event-scanner.ts` | `scanForNewEvents` |
| farcaster notify | `src/services/farcaster-notify.ts` | `sendFarcasterNotification`, `sendFarcasterNotificationBatch`, `upsertNotificationToken`, `disableNotificationToken` |
| farcaster poster | `src/services/farcaster-poster.ts` | `postCrewCast`, `processEventQueue` |
| farcaster responder | `src/services/farcaster-responder.ts` | `handleMention` |
| identity | `src/services/identity.ts` | `resolveCanonicalId`, `getLinkedIds` |
| notifications | `src/services/notifications.ts` | `notifyCrewCheckin`, `notifyFriendRsvp`, `sendEventReminders`, `notifyCrewJoin`, `notifyCrewMemberRsvp`, `notifyCrewLocate`, `notifyCrewMessage` |
| privy | `src/services/privy.ts` | — |
| socialb chat | `src/services/socialb-chat.ts` | `handleSocialBChat` |
| socialb poller | `src/services/socialb-poller.ts` | `startSocialBPoller`, `stopSocialBPoller` |
| socialb repost | `src/services/socialb-repost.ts` | `handleNewCast`, `adaptContent` |
| telegram auth | `src/services/telegram-auth.ts` | `verifyTelegramAuth`, `parseTelegramAuthParams` |

## Details

### ai chat

AI Chat Service — Tool-augmented chat using xAI Grok

**Source**: `src/services/ai-chat.ts`

**Exports**: `handleChat()`

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

**Exports**: `postCrewCast()`, `processEventQueue()`

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

**Exports**: `notifyCrewCheckin()`, `notifyFriendRsvp()`, `sendEventReminders()`, `notifyCrewJoin()`, `notifyCrewMemberRsvp()`, `notifyCrewLocate()`, `notifyCrewMessage()`

### privy

Privy API Client (zero-dep)

**Source**: `src/services/privy.ts`

### socialb chat

SocialB AI Chat Service

**Source**: `src/services/socialb-chat.ts`

**Exports**: `handleSocialBChat()`

### socialb poller

SocialB Poller — Background polling fallback

**Source**: `src/services/socialb-poller.ts`

**Exports**: `startSocialBPoller()`, `stopSocialBPoller()`

### socialb repost

SocialB Repost Engine

**Source**: `src/services/socialb-repost.ts`

**Exports**: `handleNewCast()`, `adaptContent()`

### telegram auth

Telegram Login Widget - Server-side verification

**Source**: `src/services/telegram-auth.ts`

**Exports**: `verifyTelegramAuth()`, `parseTelegramAuthParams()`

---

*Auto-generated on 2026-02-25 16:23:12 UTC*

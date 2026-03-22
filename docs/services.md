---
title: Services
---

# Services

Backend services that power FlowB's cross-platform features.

| Service | File | Exports |
|---------|------|---------|
| admin alerts | `src/services/admin-alerts.ts` | `getAdminIds`, `alertAdmins`, `alertNewEvents`, `alertDaily`, `checkMilestone`, `alertSupportChannel` |
| agent memory | `src/services/agent-memory.ts` | `storeMemory`, `searchMemories`, `extractMemories`, `getMemoryContext`, `processConversationMemories` |
| ai chat | `src/services/ai-chat.ts` | `handleChat` |
| biz notifications | `src/services/biz-notifications.ts` | `notifyBizChannel` |
| cdp | `src/services/cdp.ts` | — |
| chat tools biz | `src/services/chat-tools-biz.ts` | `createLead`, `listLeads`, `updateLead`, `getPipeline`, `getLeadTimeline`, `createTodo`, `listTodos`, `createMeeting`, `listMeetings`, `completeMeeting`, `getMySettings`, `updateMySettings`, `getCrewSettings`, `updateCrewSettings`, `adminCrewAction`, `listAutomations`, `createAutomation`, `toggleAutomation`, `getMyPlan`, `grantFlowmium`, `requestCityScan`, `fetchUserBizContext`, `manageGroupIntelligence`, `getGroupSignalsTool`, `routeSignalTool` |
| chat tools websites | `src/services/chat-tools-websites.ts` | — |
| context notifications | `src/services/context-notifications.ts` | `runContextNotifications` |
| email digest | `src/services/email-digest.ts` | `runEmailDigest` |
| email | `src/services/email.ts` | `sendEmail`, `sendEmailNotification`, `sendWelcomeEmail`, `sendVerificationEmail`, `sendDigestEmail`, `resolveUserEmail`, `wrapInTemplate`, `escHtml` |
| event scanner | `src/services/event-scanner.ts` | `scanForNewEvents` |
| expo push | `src/services/expo-push.ts` | `sendExpoPush`, `sendExpoPushToUser`, `deactivateToken` |
| farcaster notify | `src/services/farcaster-notify.ts` | `sendFarcasterNotification`, `sendFarcasterNotificationBatch`, `upsertNotificationToken`, `disableNotificationToken` |
| farcaster poster | `src/services/farcaster-poster.ts` | `postCrewCast`, `processEventQueue` |
| farcaster responder | `src/services/farcaster-responder.ts` | `handleMention` |
| guest session | `src/services/guest-session.ts` | `createGuestSession`, `createGuestToken`, `getGuestSession`, `joinCrewAsGuest`, `convertGuestToUser`, `getGuestCrews`, `getCrewByJoinCode` |
| identity | `src/services/identity.ts` | `resolveCanonicalId`, `getLinkedIds`, `ensureIdentityRow` |
| keyword alerts | `src/services/keyword-alerts.ts` | `processKeywordAlerts` |
| notifications | `src/services/notifications.ts` | `sendBizNotification`, `processDigestQueue`, `notifyMeetingReminder`, `notifyLeadStageChange`, `notifyCommissionEarned`, `notifyAutomationExecuted`, `notifyCrewCheckin`, `notifyFriendRsvp`, `sendEventReminders`, `getUserNotifyPrefs`, `notifyCrewJoin`, `notifyCrewMemberRsvp`, `notifyCrewJoinRequest`, `notifyCrewLocate`, `notifyCrewMessage`, `notifyRoleChange`, `notifyMeetingInvite`, `notifyMeetingChat`, `sendToUser`, `isAlreadyNotified`, `logNotification`, `hasReachedDailyLimit`, `isUserQuietHours`, `sendOnboardingReminders` |
| privy | `src/services/privy.ts` | — |
| socialb chat | `src/services/socialb-chat.ts` | `handleSocialBChat` |
| socialb poller | `src/services/socialb-poller.ts` | `startSocialBPoller`, `stopSocialBPoller` |
| socialb repost | `src/services/socialb-repost.ts` | `handleNewCast`, `adaptContent` |
| supabase auth | `src/services/supabase-auth.ts` | `getOrCreateSupabaseUser`, `verifySupabaseToken`, `linkPlatformIdentity` |
| telegram auth | `src/services/telegram-auth.ts` | `verifyTelegramAuth`, `parseTelegramAuthParams` |

## Details

### admin alerts

Admin Alert Service

**Source**: `src/services/admin-alerts.ts`

**Exports**: `getAdminIds()`, `alertAdmins()`, `alertNewEvents()`, `alertDaily()`, `checkMilestone()`, `alertSupportChannel()`

### agent memory

Agent Memory Service — RAG-based persistent memory for FlowB AI

**Source**: `src/services/agent-memory.ts`

**Exports**: `storeMemory()`, `searchMemories()`, `extractMemories()`, `getMemoryContext()`, `processConversationMemories()`

### ai chat

AI Chat Service — Tool-augmented chat

**Source**: `src/services/ai-chat.ts`

**Exports**: `handleChat()`

### biz notifications

Business project notification stubs.

**Source**: `src/services/biz-notifications.ts`

**Exports**: `notifyBizChannel()`

### cdp

Coinbase CDP REST API v2 client for Base network

**Source**: `src/services/cdp.ts`

### chat tools biz

Business Chat Tool Executors

**Source**: `src/services/chat-tools-biz.ts`

**Exports**: `createLead()`, `listLeads()`, `updateLead()`, `getPipeline()`, `getLeadTimeline()`, `createTodo()`, `listTodos()`, `createMeeting()`, `listMeetings()`, `completeMeeting()`, `getMySettings()`, `updateMySettings()`, `getCrewSettings()`, `updateCrewSettings()`, `adminCrewAction()`, `listAutomations()`, `createAutomation()`, `toggleAutomation()`, `getMyPlan()`, `grantFlowmium()`, `requestCityScan()`, `fetchUserBizContext()`, `manageGroupIntelligence()`, `getGroupSignalsTool()`, `routeSignalTool()`

### chat tools websites

Website Chat Tool Executors — FlowB EC

**Source**: `src/services/chat-tools-websites.ts`

### context notifications

Contextual Push Notification Engine

**Source**: `src/services/context-notifications.ts`

**Exports**: `runContextNotifications()`

### email digest

FlowB Email Digest Service

**Source**: `src/services/email-digest.ts`

**Exports**: `runEmailDigest()`

### email

FlowB Email Notification Service

**Source**: `src/services/email.ts`

**Exports**: `sendEmail()`, `sendEmailNotification()`, `sendWelcomeEmail()`, `sendVerificationEmail()`, `sendDigestEmail()`, `resolveUserEmail()`, `wrapInTemplate()`, `escHtml()`

### event scanner

Event Scanner Service

**Source**: `src/services/event-scanner.ts`

**Exports**: `scanForNewEvents()`

### expo push

Expo Push Notification Sender

**Source**: `src/services/expo-push.ts`

**Exports**: `sendExpoPush()`, `sendExpoPushToUser()`, `deactivateToken()`

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

### guest session

Guest session management — allows unauthenticated users to join crews

**Source**: `src/services/guest-session.ts`

**Exports**: `createGuestSession()`, `createGuestToken()`, `getGuestSession()`, `joinCrewAsGuest()`, `convertGuestToUser()`, `getGuestCrews()`, `getCrewByJoinCode()`

### identity

Cross-Platform Identity Resolution Service

**Source**: `src/services/identity.ts`

**Exports**: `resolveCanonicalId()`, `getLinkedIds()`, `ensureIdentityRow()`

### keyword alerts

Keyword Alert Service

**Source**: `src/services/keyword-alerts.ts`

**Exports**: `processKeywordAlerts()`

### notifications

FlowB Notification Service

**Source**: `src/services/notifications.ts`

**Exports**: `sendBizNotification()`, `processDigestQueue()`, `notifyMeetingReminder()`, `notifyLeadStageChange()`, `notifyCommissionEarned()`, `notifyAutomationExecuted()`, `notifyCrewCheckin()`, `notifyFriendRsvp()`, `sendEventReminders()`, `getUserNotifyPrefs()`, `notifyCrewJoin()`, `notifyCrewMemberRsvp()`, `notifyCrewJoinRequest()`, `notifyCrewLocate()`, `notifyCrewMessage()`, `notifyRoleChange()`, `notifyMeetingInvite()`, `notifyMeetingChat()`, `sendToUser()`, `isAlreadyNotified()`, `logNotification()`, `hasReachedDailyLimit()`, `isUserQuietHours()`, `sendOnboardingReminders()`

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

### supabase auth

Supabase Auth Admin Service

**Source**: `src/services/supabase-auth.ts`

**Exports**: `getOrCreateSupabaseUser()`, `verifySupabaseToken()`, `linkPlatformIdentity()`

### telegram auth

Telegram Login Widget - Server-side verification

**Source**: `src/services/telegram-auth.ts`

**Exports**: `verifyTelegramAuth()`, `parseTelegramAuthParams()`

---

*Auto-generated on 2026-03-22 07:15:23 UTC*

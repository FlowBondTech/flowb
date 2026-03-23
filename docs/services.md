---
title: Services
---

# Services

Backend services that power FlowB's cross-platform features.

| Service | File | Exports |
|---------|------|---------|
| admin alerts | `src/services/admin-alerts.ts` | `getAdminIds`, `alertAdmins`, `alertNewEvents`, `alertDaily`, `checkMilestone` |
| agent memory | `src/services/agent-memory.ts` | `storeMemory`, `searchMemories`, `extractMemories`, `getMemoryContext`, `processConversationMemories` |
| ai chat | `src/services/ai-chat.ts` | `handleChat` |
| biz notifications | `src/services/biz-notifications.ts` | `notifyBizChannel` |
| cdp | `src/services/cdp.ts` | — |
| chat tools biz | `src/services/chat-tools-biz.ts` | `createLead`, `listLeads`, `updateLead`, `getPipeline`, `getLeadTimeline`, `createTodo`, `listTodos`, `createMeeting`, `listMeetings`, `completeMeeting`, `getMySettings`, `updateMySettings`, `getCrewSettings`, `updateCrewSettings`, `adminCrewAction`, `listAutomations`, `createAutomation`, `toggleAutomation`, `getMyPlan`, `grantFlowmium`, `requestCityScan`, `fetchUserBizContext`, `manageGroupIntelligence`, `getGroupSignalsTool`, `routeSignalTool` |
| chat tools cuflow | `src/services/chat-tools-cuflow.ts` | `cuflowBrief`, `cuflowFeature`, `cuflowSearch`, `cuflowHotspots`, `cuflowVelocity`, `cuflowContributors`, `cuflowWhatsNew`, `cuflowReport` |
| chat tools websites | `src/services/chat-tools-websites.ts` | — |
| context notifications | `src/services/context-notifications.ts` | `runContextNotifications` |
| email digest | `src/services/email-digest.ts` | `runEmailDigest` |
| email | `src/services/email.ts` | `sendEmail`, `sendEmailNotification`, `sendWelcomeEmail`, `sendVerificationEmail`, `sendDigestEmail`, `resolveUserEmail`, `wrapInTemplate`, `escHtml` |
| event scanner | `src/services/event-scanner.ts` | `scanForNewEvents` |
| expo push | `src/services/expo-push.ts` | `sendExpoPush`, `sendExpoPushToUser`, `deactivateToken` |
| farcaster notify | `src/services/farcaster-notify.ts` | `sendFarcasterNotification`, `sendFarcasterNotificationBatch`, `upsertNotificationToken`, `disableNotificationToken` |
| farcaster poster | `src/services/farcaster-poster.ts` | `postCrewCast`, `processEventQueue` |
| farcaster responder | `src/services/farcaster-responder.ts` | `handleMention` |
| group intelligence | `src/services/group-intelligence.ts` | `shouldAnalyzeForSignals`, `extractBusinessSignals`, `routeSignal`, `getGroupIntelConfig`, `enableGroupIntel`, `disableGroupIntel`, `updateGroupIntelSettings`, `storeGroupSignal`, `buildSignalDigest`, `listActiveGroups`, `getGroupSignals`, `manualRouteSignal`, `processGroupMessage` |
| guest session | `src/services/guest-session.ts` | `createGuestSession`, `createGuestToken`, `getGuestSession`, `joinCrewAsGuest`, `convertGuestToUser`, `getGuestCrews`, `getCrewByJoinCode` |
| identity | `src/services/identity.ts` | `resolveCanonicalId`, `getLinkedIds` |
| keyword alerts | `src/services/keyword-alerts.ts` | `processKeywordAlerts` |
| notifications | `src/services/notifications.ts` | `sendBizNotification`, `processDigestQueue`, `notifyMeetingReminder`, `notifyLeadStageChange`, `notifyCommissionEarned`, `notifyAutomationExecuted`, `notifyCrewCheckin`, `notifyFriendRsvp`, `sendEventReminders`, `notifyCrewJoin`, `notifyCrewMemberRsvp`, `notifyCrewLocate`, `notifyCrewMessage`, `notifyRoleChange`, `notifyMeetingInvite`, `notifyMeetingChat`, `sendOnboardingReminders` |
| payments | `src/services/payments/index.ts` | `getPaymentService` |
| privy | `src/services/privy.ts` | — |
| socialb chat | `src/services/socialb-chat.ts` | `handleSocialBChat` |
| socialb poller | `src/services/socialb-poller.ts` | `startSocialBPoller`, `stopSocialBPoller` |
| socialb repost | `src/services/socialb-repost.ts` | `handleNewCast`, `adaptContent` |
| stripe manager | `src/services/stripe-manager.ts` | `listStripeProducts`, `createStripeCheckout`, `listStripeOrders`, `refundPayment`, `getRevenueSummary`, `createStripeProduct` |
| supabase auth | `src/services/supabase-auth.ts` | `getOrCreateSupabaseUser`, `verifySupabaseToken`, `linkPlatformIdentity` |
| support | `src/services/support.ts` | `handleInboundEmail`, `generateDraftReply`, `sendReply`, `updateTicketStatus`, `getTicket`, `listTickets` |
| telegram auth | `src/services/telegram-auth.ts` | `verifyTelegramAuth`, `parseTelegramAuthParams` |

## Details

### admin alerts

Admin Alert Service — sends notifications to admin Telegram accounts for system events.

**Source**: `src/services/admin-alerts.ts`

**Exports**: `getAdminIds()`, `alertAdmins()`, `alertNewEvents()`, `alertDaily()`, `checkMilestone()`

### agent memory

Agent Memory Service — RAG-based persistent memory for FlowB AI chat.

**Source**: `src/services/agent-memory.ts`

**Exports**: `storeMemory()`, `searchMemories()`, `extractMemories()`, `getMemoryContext()`, `processConversationMemories()`

### ai chat

AI Chat Service — Tool-augmented chat with xAI Grok + FlowB tools.

**Source**: `src/services/ai-chat.ts`

**Exports**: `handleChat()`

### biz notifications

Business project notification stubs.

**Source**: `src/services/biz-notifications.ts`

**Exports**: `notifyBizChannel()`

### cdp

Coinbase CDP REST API v2 client for Base network. Used for on-chain USDC sponsorships and wallet operations.

**Source**: `src/services/cdp.ts`

### chat tools biz

Business Chat Tool Executors — AI chat tool functions for CRM, meetings, automations, and crew management.

**Source**: `src/services/chat-tools-biz.ts`

**Exports**: `createLead()`, `listLeads()`, `updateLead()`, `getPipeline()`, `getLeadTimeline()`, `createTodo()`, `listTodos()`, `createMeeting()`, `listMeetings()`, `completeMeeting()`, `getMySettings()`, `updateMySettings()`, `getCrewSettings()`, `updateCrewSettings()`, `adminCrewAction()`, `listAutomations()`, `createAutomation()`, `toggleAutomation()`, `getMyPlan()`, `grantFlowmium()`, `requestCityScan()`, `fetchUserBizContext()`, `manageGroupIntelligence()`, `getGroupSignalsTool()`, `routeSignalTool()`

### chat tools cuflow

Cu.Flow Chat Tool Executors — AI chat tool functions for code intelligence, engineering briefs, sprint reports, and velocity tracking.

**Source**: `src/services/chat-tools-cuflow.ts`

**Exports**: `cuflowBrief()`, `cuflowFeature()`, `cuflowSearch()`, `cuflowHotspots()`, `cuflowVelocity()`, `cuflowContributors()`, `cuflowWhatsNew()`, `cuflowReport()`

### chat tools websites

Website Chat Tool Executors — FlowB EC managed website operations.

**Source**: `src/services/chat-tools-websites.ts`

### context notifications

Contextual Push Notification Engine — smart push notifications based on user location, time, and activity patterns.

**Source**: `src/services/context-notifications.ts`

**Exports**: `runContextNotifications()`

### email digest

FlowB Email Digest Service — weekly email summaries of events, crew activity, and points.

**Source**: `src/services/email-digest.ts`

**Exports**: `runEmailDigest()`

### email

FlowB Email Notification Service — transactional email via Resend.

**Source**: `src/services/email.ts`

**Exports**: `sendEmail()`, `sendEmailNotification()`, `sendWelcomeEmail()`, `sendVerificationEmail()`, `sendDigestEmail()`, `resolveUserEmail()`, `wrapInTemplate()`, `escHtml()`

### event scanner

Event Scanner Service — discovers events from Luma, Eventbrite, Lemonade, and other sources. Returns `newEventIds` for downstream keyword alert processing.

**Source**: `src/services/event-scanner.ts`

**Exports**: `scanForNewEvents()`

### expo push

Expo Push Notification Sender — sends push notifications to the FlowB mobile app.

**Source**: `src/services/expo-push.ts`

**Exports**: `sendExpoPush()`, `sendExpoPushToUser()`, `deactivateToken()`

### farcaster notify

Farcaster Mini App Notification Sender — sends push notifications via the Farcaster notification protocol.

**Source**: `src/services/farcaster-notify.ts`

**Exports**: `sendFarcasterNotification()`, `sendFarcasterNotificationBatch()`, `upsertNotificationToken()`, `disableNotificationToken()`

### farcaster poster

FlowB Farcaster Poster Service — posts crew casts and processes the event posting queue.

**Source**: `src/services/farcaster-poster.ts`

**Exports**: `postCrewCast()`, `processEventQueue()`

### farcaster responder

Farcaster Responder Service — handles @flowb mentions on Farcaster via Neynar webhooks.

**Source**: `src/services/farcaster-responder.ts`

**Exports**: `handleMention()`

### group intelligence

Group Intelligence Service — listens to group messages, extracts business signals (leads, todos, meetings, deadlines, decisions, blockers) using LLM, and routes them to appropriate systems (kanban, CRM, activities, automations).

**Source**: `src/services/group-intelligence.ts`

**Exports**: `shouldAnalyzeForSignals()`, `extractBusinessSignals()`, `routeSignal()`, `getGroupIntelConfig()`, `enableGroupIntel()`, `disableGroupIntel()`, `updateGroupIntelSettings()`, `storeGroupSignal()`, `buildSignalDigest()`, `listActiveGroups()`, `getGroupSignals()`, `manualRouteSignal()`, `processGroupMessage()`

### guest session

Guest Session Service — allows unauthenticated users to join crews before creating an account, then convert to a full user.

**Source**: `src/services/guest-session.ts`

**Exports**: `createGuestSession()`, `createGuestToken()`, `getGuestSession()`, `joinCrewAsGuest()`, `convertGuestToUser()`, `getGuestCrews()`, `getCrewByJoinCode()`

### identity

Cross-Platform Identity Resolution Service — resolves canonical user IDs across platforms and manages linked accounts.

**Source**: `src/services/identity.ts`

**Exports**: `resolveCanonicalId()`, `getLinkedIds()`

### keyword alerts

Keyword Alert Service — matches newly discovered events against user-defined keyword alerts and dispatches notifications via personal DM or crew chat.

**Source**: `src/services/keyword-alerts.ts`

**Exports**: `processKeywordAlerts()`

### notifications

FlowB Notification Service — cross-platform notification dispatch with dedup, daily limits, quiet hours, and multi-channel delivery (Telegram DM, Farcaster push, WhatsApp, Signal, email, Expo push).

**Source**: `src/services/notifications.ts`

**Exports**: `sendBizNotification()`, `processDigestQueue()`, `notifyMeetingReminder()`, `notifyLeadStageChange()`, `notifyCommissionEarned()`, `notifyAutomationExecuted()`, `notifyCrewCheckin()`, `notifyFriendRsvp()`, `sendEventReminders()`, `notifyCrewJoin()`, `notifyCrewMemberRsvp()`, `notifyCrewLocate()`, `notifyCrewMessage()`, `notifyRoleChange()`, `notifyMeetingInvite()`, `notifyMeetingChat()`, `sendOnboardingReminders()`

### payments

Unified Payment Facade — multi-method payment support (Stripe, USDC on Base, Telegram Stars).

**Source**: `src/services/payments/index.ts`

**Sub-modules**:
- `payments/stripe.ts` — Stripe payment processing
- `payments/crypto.ts` — USDC on Base network via CDP
- `payments/telegram-stars.ts` — Telegram Stars in-app purchases
- `payments/types.ts` — Shared payment types

**Exports**: `getPaymentService()`

### privy

Privy API Client (zero-dep) — verifies Privy access tokens for mobile auth.

**Source**: `src/services/privy.ts`

### socialb chat

SocialB AI Chat Service — handles AI-powered social media content creation and management.

**Source**: `src/services/socialb-chat.ts`

**Exports**: `handleSocialBChat()`

### socialb poller

SocialB Poller — background polling fallback for Farcaster mentions when webhooks are unavailable.

**Source**: `src/services/socialb-poller.ts`

**Exports**: `startSocialBPoller()`, `stopSocialBPoller()`

### socialb repost

SocialB Repost Engine — automatically reposts Farcaster casts to connected platforms with content adaptation.

**Source**: `src/services/socialb-repost.ts`

**Exports**: `handleNewCast()`, `adaptContent()`

### stripe manager

Stripe Manager — handles Stripe operations for managed biz sites, including products, checkout, orders, refunds, and revenue reporting.

**Source**: `src/services/stripe-manager.ts`

**Exports**: `listStripeProducts()`, `createStripeCheckout()`, `listStripeOrders()`, `refundPayment()`, `getRevenueSummary()`, `createStripeProduct()`

### supabase auth

Supabase Auth Admin Service — creates and manages Supabase Auth users, verifies tokens, and links platform identities.

**Source**: `src/services/supabase-auth.ts`

**Exports**: `getOrCreateSupabaseUser()`, `verifySupabaseToken()`, `linkPlatformIdentity()`

### support

FlowB Support Service — handles inbound support emails (support@flowb.me), stores tickets in Supabase, generates AI draft replies via Claude, sends TG notifications with inline keyboards, and dispatches outbound replies via Resend.

**Source**: `src/services/support.ts`

**Exports**: `handleInboundEmail()`, `generateDraftReply()`, `sendReply()`, `updateTicketStatus()`, `getTicket()`, `listTickets()`

### telegram auth

Telegram Login Widget — server-side verification of Telegram auth data.

**Source**: `src/services/telegram-auth.ts`

**Exports**: `verifyTelegramAuth()`, `parseTelegramAuthParams()`

---

*Updated 2026-03-17*

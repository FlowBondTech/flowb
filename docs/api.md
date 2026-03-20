---
title: API Reference
---

# API Reference

All APIs are served from a single consolidated Fastify server at `flowb.fly.dev`.

| Server | Domain | Purpose |
|--------|--------|---------|
| **FlowB API** | `flowb.fly.dev` | All routes: events, auth, social, crews, points, RSVP, calendar, boost, payments, meetings, biz, support |

---

## AUTH

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/telegram` | No | Telegram Mini App |
| `POST` | `/api/v1/auth/farcaster` | No | Farcaster Mini App (Quick Auth + legacy SIWF fallback) |
| `POST` | `/api/v1/auth/app` | No | Native App (hardcoded demo users) |
| `POST` | `/api/v1/auth/web` | No | Web (Privy legacy + Supabase Auth dual mode) |
| `POST` | `/api/v1/auth/privy` | No | Privy (Mobile) — verify Privy access token, issue FlowB JWT |
| `POST` | `/api/v1/auth/whatsapp` | No | WhatsApp Mini App (HMAC-based phone verification) |
| `POST` | `/api/v1/auth/signal` | No | Signal Mini App (HMAC-based, same pattern as WhatsApp) |
| `POST` | `/api/v1/auth/passport` | No | FlowB Passport (Supabase Auth) — primary new auth endpoint |
| `POST` | `/api/v1/auth/claim-points` | Yes | Claim pending points (pre-auth actions → backend account) |

## FEED

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/feed/community` | No | Community Farcaster Feed (aggregates posts with keywords) |
| `GET` | `/api/v1/feed/activity` | Yes | Global activity feed — check-ins, crew messages, hot venues, trending events |

## CREW BIZ

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/flow/crews/:id/biz-settings` | Yes | Get crew business settings |
| `PATCH` | `/api/v1/flow/crews/:id/biz-settings` | Yes | Update crew business settings |
| `PATCH` | `/api/v1/flow/crews/:id/my-settings` | Yes | Update personal crew settings |
| `POST` | `/api/v1/flow/crews/:id/share-meeting/:meetingId` | Yes | Share a meeting with crew |
| `GET` | `/api/v1/flow/crews/:id/biz-feed` | Yes | Crew business activity feed |
| `POST` | `/api/v1/flow/crews/:id/biz-feed` | Yes | Post to crew business feed |
| `POST` | `/api/v1/flow/crews/:id/share-lead` | Yes | Share a lead with crew |
| `GET` | `/api/v1/flow/crews/:id/shared-leads` | Yes | View leads shared with crew |
| `GET` | `/api/v1/flow/crews/:id/pipeline` | Yes | Crew deal pipeline |

## MEETINGS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/meetings` | Yes | Create meeting |
| `GET` | `/api/v1/meetings` | Yes | List upcoming meetings |
| `GET` | `/api/v1/meetings/:id` | No | Get meeting detail |
| `PATCH` | `/api/v1/meetings/:id` | Yes | Update meeting |
| `DELETE` | `/api/v1/meetings/:id` | Yes | Cancel meeting |
| `POST` | `/api/v1/meetings/:id/complete` | Yes | Mark meeting as complete |
| `POST` | `/api/v1/meetings/:id/invite` | Yes | Send meeting invite |
| `GET` | `/api/v1/meetings/:id/messages` | No | Get meeting chat messages |
| `POST` | `/api/v1/meetings/:id/messages` | Yes | Send meeting chat message |
| `GET` | `/api/v1/meetings/:id/messages/since/:ts` | No | Get messages since timestamp |
| `POST` | `/api/v1/meetings/:id/briefing` | No | Generate AI meeting briefing |
| `POST` | `/api/v1/meetings/:id/follow-up` | No | Generate AI follow-up |
| `GET` | `/api/v1/meetings/:id/notes` | No | Get meeting notes |
| `POST` | `/api/v1/meetings/:id/notes` | Yes | Add meeting notes |
| `POST` | `/api/v1/meetings/:id/share` | Yes | Generate share link |
| `GET` | `/api/v1/meetings/suggest` | Yes | AI-suggested meeting times |
| `POST` | `/api/v1/meetings/from-lead/:leadId` | Yes | Create meeting from lead |
| `GET` | `/api/v1/m/:code` | No | Meeting share link landing |
| `POST` | `/api/v1/m/:code/rsvp` | No | RSVP via share link |
| `GET` | `/api/v1/m/:code/ical` | No | Download meeting .ics file |

## ME (User)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/me/push-token` | Yes | Register push notification token |
| `DELETE` | `/api/v1/me/push-token` | Yes | Remove push notification token |
| `GET` | `/api/v1/me/notifications` | Yes | List notifications |
| `POST` | `/api/v1/me/notifications/read` | Yes | Mark notifications as read |
| `GET` | `/api/v1/me/notifications/stream` | Yes | SSE notification stream |
| `GET` | `/api/v1/me/preferences` | Yes | Get notification preferences (includes keyword alerts toggle) |
| `PATCH` | `/api/v1/me/preferences` | Yes | Update notification preferences |
| `GET` | `/api/v1/me/keyword-alerts` | Yes | List keyword alerts |
| `POST` | `/api/v1/me/keyword-alerts` | Yes | Create keyword alert (keyword, category_slug?, crew_id?, city?) |
| `PATCH` | `/api/v1/me/keyword-alerts/:id` | Yes | Update keyword alert |
| `DELETE` | `/api/v1/me/keyword-alerts/:id` | Yes | Delete keyword alert |
| `GET` | `/api/v1/me/linked-accounts` | Yes | List linked platform accounts |
| `GET` | `/api/v1/me/link-status` | Yes | Check cross-platform link status |
| `POST` | `/api/v1/me/sync-linked-accounts` | Yes | Sync linked accounts |
| `GET` | `/api/v1/me/privacy` | Yes | Get privacy settings |
| `PATCH` | `/api/v1/me/privacy` | Yes | Update privacy settings |
| `GET` | `/api/v1/me/crew-visibility` | Yes | Get crew visibility settings |

## SOCIAL AWARENESS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/flow/whats-happening` | Yes | What's happening now — check-ins, trending events, hot venues |
| `GET` | `/api/v1/flow/after-party` | Yes | After-party and late-night events |
| `GET` | `/api/v1/flow/whos-here` | Yes | Who from your flow is checked in nearby |
| `GET` | `/api/v1/flow/friends/nearby` | Yes | Nearby friends |
| `GET` | `/api/v1/discover/people` | Yes | People discovery |
| `GET` | `/api/v1/events/:id/social` | No | Social context for an event (who's going from your flow) |

## LEADS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/leads` | Yes | Create lead |
| `GET` | `/api/v1/leads` | Yes | List leads |
| `GET` | `/api/v1/leads/:id` | No | Get lead detail |
| `PATCH` | `/api/v1/leads/:id` | Yes | Update lead |
| `DELETE` | `/api/v1/leads/:id` | No | Delete lead |
| `GET` | `/api/v1/leads/pipeline` | Yes | Pipeline view (grouped by stage) |
| `GET` | `/api/v1/leads/:id/timeline` | No | Lead activity timeline |
| `POST` | `/api/v1/leads/:id/schedule-meeting` | Yes | Schedule meeting with lead |

## REFERRAL

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/referral/programs` | Yes | Create referral program |
| `GET` | `/api/v1/referral/programs/:eventId` | No | Get referral program for event |
| `GET` | `/api/v1/referral/links/:eventId` | Yes | Get user's referral link for event |
| `POST` | `/api/v1/referral/engagement` | Yes | Track referral engagement |
| `GET` | `/api/v1/referral/earnings` | Yes | User's referral earnings |
| `GET` | `/api/v1/referral/earnings/crew/:crewId` | No | Crew referral earnings |
| `GET` | `/api/v1/referral/commissions` | Yes | Commission history |
| `POST` | `/api/v1/referral/payouts` | Yes | Request payout |
| `GET` | `/api/v1/referral/payouts` | Yes | Payout history |

## AUTOMATIONS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/automations` | Yes | List automations |
| `POST` | `/api/v1/automations` | Yes | Create automation |
| `PATCH` | `/api/v1/automations/:id` | Yes | Update automation |
| `DELETE` | `/api/v1/automations/:id` | Yes | Delete automation |
| `POST` | `/api/v1/automations/:id/toggle` | Yes | Toggle automation on/off |
| `GET` | `/api/v1/automations/:id/log` | No | Automation execution log |

## BILLING

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/billing/subscription` | Yes | Current subscription plan |
| `GET` | `/api/v1/billing/usage` | Yes | Usage metrics |
| `POST` | `/api/v1/billing/checkout` | No | Create Stripe checkout session |
| `POST` | `/api/v1/billing/portal` | No | Stripe customer portal |

## SOCIAL (SocialB)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/social/orgs` | Yes | Create social org |
| `POST` | `/api/v1/social/orgs/:orgId/members` | No | Add org member |
| `POST` | `/api/v1/social/connect` | Yes | Connect social account |
| `GET` | `/api/v1/social/accounts` | Yes | List connected social accounts |
| `GET` | `/api/v1/social/posts` | Yes | List social posts |
| `POST` | `/api/v1/social/posts` | Yes | Create social post |
| `DELETE` | `/api/v1/social/posts/:id` | Yes | Delete social post |
| `GET` | `/api/v1/socialb/config` | Yes | SocialB auto-repost config |
| `POST` | `/api/v1/socialb/config/toggle` | Yes | Toggle auto-repost |
| `DELETE` | `/api/v1/socialb/config` | Yes | Remove auto-repost config |
| `GET` | `/api/v1/socialb/activity` | Yes | SocialB activity log |
| `POST` | `/api/v1/socialb/webhook` | No | SocialB webhook (Neynar) |
| `POST` | `/api/v1/socialb/chat` | Yes | SocialB AI chat |

## BIZ

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/biz/projects` | No | List business projects |
| `POST` | `/api/v1/biz/inbound-webhook` | No | Business inbound webhook |

## SHARED RESULTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/shared-results/:code` | No | Get shared result |
| `POST` | `/api/v1/shared-results/:code/interact` | No | Interact with shared result |
| `POST` | `/api/v1/shared-results` | No | Create shared result |

## EGATOR ADMIN

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/admin/egator/scan` | No | Trigger event scan |
| `POST` | `/api/v1/admin/egator/cities` | No | Add scan city |
| `POST` | `/api/v1/admin/egator/cities/:city/toggle` | No | Toggle scan city |
| `DELETE` | `/api/v1/admin/egator/cities/:city` | No | Remove scan city |
| `POST` | `/api/v1/admin/egator/events/bulk` | No | Bulk event operations |
| `DELETE` | `/api/v1/admin/egator/events/stale` | No | Purge stale events |
| `POST` | `/api/v1/admin/egator/events/:id/feature` | No | Feature/unfeature event |
| `POST` | `/api/v1/admin/egator/events/:id/hide` | No | Hide/show event |

## WEBHOOKS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/webhooks/luma/ticket` | No | Luma ticket webhook |
| `GET` | `/api/v1/e/:code` | No | Smart event link (platform-detected redirect) |

## OTHER

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/feed/ethdenver` | No | EthDenver community feed |
| `POST` | `/api/v1/chat/email-results` | No | Email AI chat results |
| `POST` | `/api/v1/admin/scan-events` | No | Admin trigger event scan |

## EVENTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/events` | No | DB-first discovery |
| `GET` | `/api/v1/events/cities` | No | Distinct cities (for city picker UI) |
| `POST` | `/api/v1/events` | No | Community submit (anyone can add an event link) |
| `GET` | `/api/v1/events/:id` | No | Single event detail (DB-first) |
| `POST` | `/api/v1/events/:id/rsvp` | Yes | RSVP (requires auth) |
| `DELETE` | `/api/v1/events/:id/rsvp` | Yes | Cancel RSVP (requires auth) |
| `POST` | `/api/v1/events/:id/claim` | Yes | Claim event (makes actionable for RSVP) |
| `POST` | `/api/v1/events/:id/verify/request` | Yes | Request ownership verification token (5/min) |
| `POST` | `/api/v1/events/:id/verify/check` | Yes | Check verification (fetches event URL for token, 3/min) |
| `GET` | `/api/v1/events/:id/verify/status` | Yes | Verification status |
| `PATCH` | `/api/v1/events/:id/organizer/edit` | Yes | Edit event (verified organizer only) |
| `GET` | `/api/v1/events/:id/organizer/attendees` | Yes | View attendee list (verified organizer only) |
| `POST` | `/api/v1/events/:id/organizer/announce` | Yes | Post announcement (verified organizer only, 5/min) |
| `GET` | `/api/v1/events/:id/announcements` | No | List event announcements (public) |

## TRANSCRIBE

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/transcribe` | No | Social media video transcription via Supadata |

## SEARCH

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/search` | No | Web search via SerpAPI (Google) |

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
| `POST` | `/api/v1/flow/crews/:id/checkin` | Yes | Crew checkin - broadcast location (requires auth) |
| `GET` | `/api/v1/flow/friends` | Yes | Friends list (requires auth) |
| `GET` | `/api/v1/flow/friends/:friendId` | Yes | Get detailed friend info (requires auth) |
| `PATCH` | `/api/v1/flow/friends/:friendId` | Yes | Update connection note/tags (requires auth) |
| `POST` | `/api/v1/flow/friends/:friendId/share` | Yes | Share contact info with a friend (requires auth) |
| `POST` | `/api/v1/flow/connect` | Yes | Connect / send friend request (requires auth) |
| `GET` | `/api/v1/flow/invite` | Yes | Get personal invite link (requires auth) |
| `DELETE` | `/api/v1/flow/crews/:id/leave` | Yes | Leave crew (requires auth) |
| `GET` | `/api/v1/flow/crews/discover` | No | Discover all crews (public, no auth required) |
| `DELETE` | `/api/v1/flow/crews/:id/members/:userId` | Yes | Remove member from crew (admin, requires auth) |
| `PATCH` | `/api/v1/flow/crews/:id/members/:userId` | Yes | Update member role (promote/demote, requires auth) |
| `PATCH` | `/api/v1/flow/crews/:id` | Yes | Edit crew details (requires auth, admin only) |
| `GET` | `/api/v1/flow/crews/:id/activity` | Yes | Crew activity feed - historical checkins (requires auth) |
| `POST` | `/api/v1/flow/crews/:id/qr-checkin` | Yes | QR check-in (requires auth) |
| `GET` | `/api/v1/flow/crews/:id/locations` | Yes | Crew member locations (requires auth, member only) |
| `POST` | `/api/v1/flow/crews/:id/locate` | Yes | "Where are you?" ping (requires auth, any member) |
| `GET` | `/api/v1/flow/crews/:crewId/messages` | Yes | Crew messages - get (requires auth) |
| `POST` | `/api/v1/flow/crews/:crewId/messages` | Yes | Crew messages - send (requires auth) |

## PROFILE

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `/api/v1/me/profile` | Yes | Update own bio, role, tags (requires auth) |
| `GET` | `/api/v1/me/profile` | Yes | Get own profile (bio, role, tags) (requires auth) |

## POINTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/points` | Yes | Get user points + streak (requires auth) |
| `GET` | `/api/v1/flow/crews/:id/leaderboard` | Yes | Crew leaderboard (requires auth) |
| `GET` | `/api/v1/flow/leaderboard` | No | Global crew leaderboard (no auth required) |
| `GET` | `/api/v1/flow/leaderboard/individuals` | No | Global individual leaderboard (no auth required) |
| `GET` | `/api/v1/flow/crews/:id/missions` | Yes | Crew missions (requires auth) |

## LOCATIONS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/locations/:code` | No | Resolve QR code (no auth) |

## MEETINGS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/meetings` | Yes | CRUD + share links |
| `POST` | `/api/v1/meetings/:id/complete` | Yes | Extended routes (briefing, follow-up, notes, iCal, suggest) |

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

## DASHBOARD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me/dashboard` | Yes | Aggregate KPIs for biz dashboard (mobile) |

## DISCOVERY

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/flow/friends/map` | Yes | Location-based friend & user discovery |

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
| `POST` | `/api/v1/admin/email-digest` | No | Trigger email digest manually |
| `GET` | `/api/v1/admin/events` | No | All events (for curation - includes featured/hidden) |
| `POST` | `/api/v1/admin/booths` | No | Create booth |
| `PATCH` | `/api/v1/admin/booths/:id` | Yes | Update booth |
| `POST` | `/api/v1/admin/events/:id/categorize` | No | Assign categories to an event |
| `POST` | `/api/v1/admin/venues` | No | Create venue |
| `GET` | `/api/v1/admin/users` | No | All users (for user manager) |
| `GET` | `/api/v1/admin/egator/stats` | No | eGator Stats & Scan |
| `GET` | `/api/v1/admin/egator/cities` | No | eGator Scan City Management |
| `GET` | `/api/v1/admin/egator/events` | No | eGator Event Management (list, bulk, stale purge, feature, hide) |

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
| `GET` | `/api/v1/sponsor/wallet` | Yes | Get wallet address for event boosting |
| `POST` | `/api/v1/sponsor` | Yes | Create sponsorship (requires auth) |
| `POST` | `/api/v1/sponsor/:id/verify` | No | Manual verify (internal) |
| `GET` | `/api/v1/sponsor/rankings` | No | Rankings |
| `GET` | `/api/v1/locations/ranked` | No | Ranked locations (Top Booths) |
| `GET` | `/api/v1/sponsor/featured-event` | No | Featured event boost (highest verified boost for featured spot) |
| `POST` | `/api/v1/flow/checkin/proximity` | Yes | Proximity auto-checkin (requires auth) |

## FEEDBACK

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/feedback` | No | Submit bug reports, feature requests, feedback |

## SOCIAL

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/social/providers` | No | Organization & multi-platform posting |

## SOCIALB

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/socialb/config` | Yes | Auto-repost Farcaster casts to all platforms |

## TODOS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/todos` | Yes | Project task tracking (admin + authenticated users) |

## LEADS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/leads` | Yes | Full CRUD + pipeline + timeline |

## TODO

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/billing/portal` | No | integrate Stripe when STRIPE_SECRET_KEY is set |

## QUESTIONNAIRE

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/questionnaire/gate-pass` | No | Gate-pass notification (unauthenticated) |
| `POST` | `/api/v1/questionnaire` | No | Submit (unauthenticated) |

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

## Convenience endpoint for event search

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

## Prefixes that need bot-side processing (flow accept, invite tracking, referral)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/${path}/:code` | No |  |

## Crew join links → smart landing page with tg

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/g/:code` | No | // protocol for direct app open |

## Meeting short links → bot deep link (meeting detail rendering)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/m/:code` | No |  |

## BOOST

Event boost auction — 24-hour auction system where users bid to feature their event at the top.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/boost/status` | No | Current auction cycle status (current bid, time remaining) |
| `GET` | `/api/v1/boost/wallet` | No | Wallet address for crypto boost payments |
| `POST` | `/api/v1/boost/bid` | Yes | Place a boost bid (Stripe or USDC) |

## PAYMENTS

Unified payment system supporting Stripe, USDC on Base, and Telegram Stars.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/payment/networks` | No | Available payment networks and methods |

## SUPPORT

Support email handling via Resend inbound webhooks.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/webhooks/resend/inbound` | No | Inbound support email webhook (Svix-verified) |

## DOC ACCESS

Technical documentation view tracking.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/doc-access/track-view` | No | Track section views + admin alerts (rate limited) |

## WHATSAPP

WhatsApp bot integration (registered when `WHATSAPP_TOKEN` is set).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/webhooks/whatsapp` | No | WhatsApp Cloud API webhook |
| `GET` | `/api/v1/webhooks/whatsapp` | No | WhatsApp webhook verification |

## SIGNAL

Signal bot integration (registered when `SIGNAL_API_URL` is set).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/webhooks/signal` | No | Signal message webhook |

---

## DAO Treasury Address

All sponsorships, event boosts, and party creation fees go to the FlowB DAO treasury:

```
0xD9Ab3B89cb5E09fbdA46c20D8849fd1E75486002
```

**Supported networks** (USDC): Base (primary), Ethereum, Polygon, Arbitrum, Optimism.

| Network | USDC Contract |
|---------|--------------|
| Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |

The same address works across all EVM-compatible chains (not all are explicitly supported for payment verification).

---

*Updated from `src/server/routes.ts` and `src/server/app.ts` on 2026-03-20*

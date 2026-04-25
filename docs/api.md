---
title: API Reference
---

# API Reference

FlowB exposes two backend servers:

| Server | Domain | Purpose |
|--------|--------|---------|
| **eGator API** | `egator-api.fly.dev` | Event search (categories, discover, tonight) |
| **FlowB API** | `flowb.fly.dev` | User auth, social, crews, points, RSVP, calendar |

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
| `POST` | `/api/v1/auth/guest` | No | Guest Session (join first, signup after) |

## Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/guest/join-crew` | No |  |
| `POST` | `/api/v1/auth/guest/convert` | No |  |
| `GET` | `/api/v1/auth/guest/crews` | No |  |
| `GET` | `/api/v1/auth/providers` | No |  |
| `GET` | `/api/v1/crew/:code/info` | No |  |
| `GET` | `/api/v1/feed/ethdenver` | No |  |
| `GET` | `/api/v1/flow/crews/:id/biz-settings` | Yes |  |
| `PATCH` | `/api/v1/flow/crews/:id/biz-settings` | Yes |  |
| `PATCH` | `/api/v1/flow/crews/:id/my-settings` | Yes |  |
| `POST` | `/api/v1/flow/crews/:id/share-meeting/:meetingId` | Yes |  |
| `GET` | `/api/v1/flow/crews/:id/biz-feed` | Yes |  |
| `POST` | `/api/v1/flow/crews/:id/biz-feed` | Yes |  |
| `POST` | `/api/v1/flow/crews/:id/share-lead` | Yes |  |
| `GET` | `/api/v1/flow/crews/:id/shared-leads` | Yes |  |
| `GET` | `/api/v1/flow/crews/:id/pipeline` | Yes |  |
| `GET` | `/api/v1/meetings` | Yes |  |
| `GET` | `/api/v1/meetings/:id` | No |  |
| `PATCH` | `/api/v1/meetings/:id` | Yes |  |
| `DELETE` | `/api/v1/meetings/:id` | Yes |  |
| `POST` | `/api/v1/meetings/:id/invite` | Yes |  |
| `GET` | `/api/v1/meetings/:id/messages` | No |  |
| `POST` | `/api/v1/meetings/:id/messages` | Yes |  |
| `GET` | `/api/v1/m/:code` | No |  |
| `POST` | `/api/v1/m/:code/rsvp` | No |  |
| `POST` | `/api/v1/me/push-token` | Yes |  |
| `DELETE` | `/api/v1/me/push-token` | Yes |  |
| `GET` | `/api/v1/me/notifications` | Yes |  |
| `POST` | `/api/v1/me/notifications/read` | Yes |  |
| `GET` | `/api/v1/me/notifications/stream` | Yes |  |
| `GET` | `/api/v1/me/preferences` | Yes |  |
| `PATCH` | `unknown` | No |  |
| `GET` | `/api/v1/flow/friends/nearby` | Yes |  |
| `GET` | `/api/v1/discover/people` | Yes |  |
| `GET` | `/api/v1/me/linked-accounts` | Yes |  |
| `GET` | `/api/v1/me/link-status` | Yes |  |
| `POST` | `/api/v1/me/link-token` | Yes |  |
| `POST` | `/api/v1/me/link-telegram/init` | Yes |  |
| `POST` | `/api/v1/me/sync-linked-accounts` | Yes |  |
| `GET` | `/api/v1/me/privacy` | Yes |  |
| `PATCH` | `unknown` | Yes |  |
| `GET` | `/api/v1/me/crew-visibility` | Yes |  |
| `GET` | `/api/v1/events/:id/social` | No |  |
| `GET` | `/api/v1/biz/projects` | No |  |
| `POST` | `/api/v1/biz/inbound-webhook` | No |  |
| `POST` | `/api/v1/social/orgs` | Yes |  |
| `POST` | `/api/v1/social/orgs/:orgId/members` | No |  |
| `POST` | `/api/v1/social/connect` | Yes |  |
| `GET` | `/api/v1/social/accounts` | Yes |  |
| `POST` | `unknown` | No |  |
| `POST` | `unknown` | No |  |
| `DELETE` | `/api/v1/social/posts/:id` | Yes |  |
| `GET` | `/api/v1/social/posts` | Yes |  |
| `POST` | `unknown` | No |  |
| `POST` | `/api/v1/socialb/config/toggle` | Yes |  |
| `DELETE` | `/api/v1/socialb/config` | Yes |  |
| `GET` | `/api/v1/socialb/activity` | Yes |  |
| `POST` | `/api/v1/socialb/webhook` | No |  |
| `POST` | `/api/v1/socialb/chat` | Yes |  |
| `GET` | `/api/v1/flow/whats-happening` | Yes |  |
| `GET` | `/api/v1/flow/after-party` | Yes |  |
| `GET` | `/api/v1/flow/whos-here` | Yes |  |
| `POST` | `unknown` | No |  |
| `PATCH` | `unknown` | No |  |
| `POST` | `/api/v1/admin/egator/scan` | No |  |
| `POST` | `/api/v1/admin/egator/cities` | No |  |
| `POST` | `/api/v1/admin/egator/cities/:city/toggle` | No |  |
| `DELETE` | `/api/v1/admin/egator/cities/:city` | No |  |
| `POST` | `/api/v1/admin/egator/events/bulk` | No |  |
| `DELETE` | `/api/v1/admin/egator/events/stale` | No |  |
| `POST` | `/api/v1/admin/egator/events/:id/feature` | No |  |
| `POST` | `/api/v1/admin/egator/events/:id/hide` | No |  |
| `GET` | `/api/v1/shared-results/:code` | No |  |
| `POST` | `/api/v1/shared-results/:code/interact` | No |  |
| `POST` | `/api/v1/shared-results` | No |  |
| `GET` | `/api/v1/leads` | Yes |  |
| `GET` | `/api/v1/leads/:id` | No |  |
| `PATCH` | `/api/v1/leads/:id` | Yes |  |
| `DELETE` | `/api/v1/leads/:id` | No |  |
| `GET` | `/api/v1/leads/pipeline` | Yes |  |
| `GET` | `/api/v1/leads/:id/timeline` | No |  |
| `POST` | `/api/v1/leads/:id/schedule-meeting` | Yes |  |
| `POST` | `/api/v1/meetings/:id/briefing` | No |  |
| `POST` | `/api/v1/meetings/:id/follow-up` | No |  |
| `GET` | `/api/v1/meetings/:id/notes` | No |  |
| `POST` | `/api/v1/meetings/:id/notes` | Yes |  |
| `GET` | `/api/v1/meetings/suggest` | Yes |  |
| `POST` | `/api/v1/meetings/from-lead/:leadId` | Yes |  |
| `GET` | `/api/v1/m/:code/ical` | No |  |
| `GET` | `/api/v1/meetings/:id/messages/since/:ts` | No |  |
| `POST` | `/api/v1/meetings/:id/share` | Yes |  |
| `POST` | `/api/v1/referral/programs` | Yes |  |
| `GET` | `/api/v1/referral/programs/:eventId` | No |  |
| `GET` | `/api/v1/referral/links/:eventId` | Yes |  |
| `POST` | `/api/v1/referral/engagement` | Yes |  |
| `GET` | `/api/v1/referral/earnings` | Yes |  |
| `GET` | `/api/v1/referral/earnings/crew/:crewId` | No |  |
| `GET` | `/api/v1/referral/commissions` | Yes |  |
| `POST` | `/api/v1/referral/payouts` | Yes |  |
| `GET` | `/api/v1/referral/payouts` | Yes |  |
| `GET` | `/api/v1/e/:code` | No |  |
| `POST` | `/api/v1/webhooks/luma/ticket` | No |  |
| `GET` | `/api/v1/automations` | Yes |  |
| `POST` | `/api/v1/automations` | Yes |  |
| `PATCH` | `/api/v1/automations/:id` | Yes |  |
| `DELETE` | `/api/v1/automations/:id` | Yes |  |
| `POST` | `/api/v1/automations/:id/toggle` | Yes |  |
| `GET` | `/api/v1/automations/:id/log` | No |  |
| `GET` | `/api/v1/billing/subscription` | Yes |  |
| `GET` | `/api/v1/billing/usage` | Yes |  |
| `POST` | `/api/v1/billing/checkout` | No |  |
| `POST` | `/api/v1/chat/email-results` | No |  |
| `GET` | `/api/v1/me/keyword-alerts` | Yes |  |
| `POST` | `unknown` | Yes |  |
| `PATCH` | `unknown` | Yes |  |
| `DELETE` | `/api/v1/me/keyword-alerts/:id` | Yes |  |
| `POST` | `/api/v1/admin/scan-events` | No |  |

## FEED

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/feed/community` | No | Community Farcaster Feed (aggregates posts with keywords) |
| `GET` | `/api/v1/feed/activity` | Yes | Global activity feed — check-ins, crew messages, hot venues, trending events |

## EVENTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/events` | No | DB-first discovery |
| `GET` | `/api/v1/events/cities` | No | Distinct cities (for city picker UI) |
| `POST` | `/api/v1/events/preview-url` | No | Preview URL (fetch metadata for auto-fill) |
| `POST` | `unknown` | No | Community submit (anyone can add an event link) |
| `GET` | `/api/v1/events/:id` | No | Single event detail (DB-first) |
| `POST` | `unknown` | Yes | RSVP (requires auth) |
| `DELETE` | `/api/v1/events/:id/rsvp` | Yes | Cancel RSVP (requires auth) |
| `POST` | `/api/v1/events/:id/bookmark` | Yes | Bookmark (save non-actionable event) (requires auth) |
| `DELETE` | `/api/v1/events/:id/bookmark` | Yes | Remove bookmark (requires auth) |
| `GET` | `/api/v1/me/bookmarks` | Yes | My bookmarks (requires auth) |
| `POST` | `/api/v1/events/:id/claim` | Yes | Claim an aggregated event (requires auth) |
| `POST` | `/api/v1/events/:id/verify/request` | Yes | Request ownership verification token |
| `POST` | `/api/v1/events/:id/verify/check` | Yes | Check ownership verification (fetches event URL for token) |
| `GET` | `/api/v1/events/:id/verify/status` | Yes | Verification status |
| `GET` | `/api/v1/events/:id/announcements` | No | List announcements (public) |

## TRANSCRIBE

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `unknown` | No | Social media video transcription via Supadata |

## SEARCH

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `unknown` | No | Web search via SerpAPI (Google) |

## ORGANIZER

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `unknown` | No | Edit event (verified organizer only) |
| `GET` | `/api/v1/events/:id/organizer/attendees` | Yes | View attendees (verified organizer only) |
| `POST` | `unknown` | No | Post announcement (verified organizer only) |

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
| `GET` | `/api/v1/flow/friends/:friendId` | Yes | Get detailed friend info (requires auth) |
| `PATCH` | `unknown` | Yes | Update connection note/tags (requires auth) |
| `POST` | `unknown` | Yes | Share contact info with a friend (requires auth) |
| `POST` | `/api/v1/flow/connect` | Yes | Connect / send friend request (requires auth) |
| `GET` | `/api/v1/flow/invite` | Yes | Get personal invite link (requires auth) |
| `DELETE` | `/api/v1/flow/crews/:id/leave` | Yes | Leave crew (requires auth) |
| `GET` | `/api/v1/flow/crews/discover` | No | Discover all crews (public, optionally shows user status if authed) |
| `DELETE` | `/api/v1/flow/crews/:id/members/:userId` | Yes | Remove member from crew (admin, requires auth) |
| `PATCH` | `/api/v1/flow/crews/:id/members/:userId` | Yes | Update member role (promote/demote, requires auth) |
| `PATCH` | `/api/v1/flow/crews/:id` | Yes | Edit crew details (requires auth, admin only) |
| `GET` | `/api/v1/flow/crews/:id/requests` | Yes | Get pending join requests (admin only, requires auth) |
| `POST` | `/api/v1/flow/crews/:id/request-join` | Yes | Request to join a crew (creates pending request) |
| `POST` | `/api/v1/flow/crews/:id/requests/:reqId/approve` | Yes | Approve join request (admin only) |
| `POST` | `/api/v1/flow/crews/:id/requests/:reqId/deny` | Yes | Deny join request (admin only) |
| `GET` | `/api/v1/flow/crews/:id/activity` | Yes | Crew activity feed - historical checkins (requires auth) |
| `POST` | `unknown` | Yes | QR check-in (requires auth) |
| `GET` | `/api/v1/flow/crews/:id/locations` | Yes | Crew member locations (requires auth, member only) |
| `POST` | `/api/v1/flow/crews/:id/locate` | Yes | "Where are you?" ping (requires auth, any member) |
| `GET` | `/api/v1/flow/crews/:crewId/messages` | Yes | Crew messages - get (requires auth) |
| `POST` | `/api/v1/flow/crews/:crewId/messages` | Yes | Crew messages - send (requires auth) |

## PROFILE

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `unknown` | Yes | Update own profile (requires auth) |
| `GET` | `/api/v1/me/profile` | Yes | Get own profile with completion tracking (requires auth) |
| `POST` | `/api/v1/me/link-identity` | Yes | Link identity (requires auth) |

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
| `GET` | `/api/v1/admin/me` | Yes | Verify current user is admin (JWT-only, no admin key) |
| `GET` | `/api/v1/admin/stats` | No | Live dashboard stats |
| `GET` | `/api/v1/admin/plugins` | No | List plugins |
| `POST` | `/api/v1/admin/plugins/:id/configure` | No | Configure plugin |
| `POST` | `/api/v1/admin/plugins/:id/toggle` | No | Toggle plugin |
| `POST` | `/api/v1/admin/events/:id/feature` | Yes | Feature/unfeature an event |
| `GET` | `/api/v1/admin/festivals` | No | List all festivals (including disabled) |
| `POST` | `unknown` | No | Create festival |
| `PATCH` | `/api/v1/admin/festivals/:id` | No | Update festival |
| `DELETE` | `/api/v1/admin/festivals/:id` | No | Delete festival |
| `POST` | `/api/v1/admin/events/:id/actionable` | Yes | Toggle event actionability |
| `POST` | `/api/v1/admin/events/:id/hide` | Yes | Hide/show an event |
| `POST` | `/api/v1/admin/points` | No | Award bonus points |
| `POST` | `/api/v1/admin/users/:id/role` | No | Change user role |
| `POST` | `/api/v1/admin/notifications/test` | No | Send test notification |
| `GET` | `/api/v1/admin/notifications/stats` | No | Notification delivery stats |
| `POST` | `/api/v1/admin/email-digest` | No | Trigger email digest manually |
| `POST` | `/api/v1/admin/featured-event` | Yes | Set/clear featured event override |
| `GET` | `/api/v1/admin/events` | No | All events (for curation - includes featured/hidden) |
| `POST` | `/api/v1/admin/booths` | No | Create booth |
| `PATCH` | `/api/v1/admin/booths/:id` | Yes | Update booth |
| `POST` | `/api/v1/admin/events/:id/categorize` | No | Assign categories to an event |
| `POST` | `/api/v1/admin/venues` | No | Create venue |
| `GET` | `/api/v1/admin/users` | No | All users (for user manager) |
| `GET` | `/api/v1/admin/admins` | No | List admins |
| `POST` | `/api/v1/admin/admins` | No | Add admin |
| `DELETE` | `/api/v1/admin/admins/:userId` | No | Remove admin |
| `GET` | `/api/v1/admin/crews` | No | List crews (admin view with member counts) |
| `GET` | `/api/v1/admin/egator/stats` | No | eGator Stats & Scan |
| `GET` | `/api/v1/admin/egator/cities` | No | eGator Scan City Management |
| `GET` | `unknown` | No | eGator Event Management (list, bulk, stale purge, feature, hide) |

## PUBLIC

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/festivals/active` | No | Active festivals (current + upcoming) |
| `GET` | `/api/v1/festivals` | No | All festivals (including past) |
| `GET` | `/api/v1/featured` | No | Featured events page data |

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
| `GET` | `/api/v1/sponsor/featured-event` | No | Featured event boost (from cycle view, respects admin override) |
| `POST` | `/api/v1/flow/checkin/proximity` | Yes | Proximity auto-checkin (requires auth) |

## FEEDBACK

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `unknown` | No | Submit bug reports, feature requests, feedback |

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
| `GET` | `unknown` | No | Project task tracking (admin + authenticated users) |

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

## Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/admin/notify` | No | receive cross-platform notifications (DANZ → FlowB admin alerts) |
| `POST` | `/api/v1/admin/simulate-activity` | No | trigger activity simulation step |

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

## to the mobile app via deep link with success/error params.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/telegram-link-callback` | No |  |

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

---

*Auto-generated from `src/server/routes.ts` and `src/server/app.ts` on 2026-04-25 04:47:39 UTC*

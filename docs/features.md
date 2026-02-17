---
title: Features
description: Comprehensive feature reference for FlowB -- events, crews, friends, points, notifications, and platform support.
---

# FlowB Features

FlowB is your EthDenver companion -- discover events, coordinate with your crew, and never miss a vibe.

## What is FlowB

FlowB helps you navigate EthDenver by connecting you with friends and crews, surfacing the best events, and keeping everyone in sync. Available on Telegram, Farcaster, and the web at flowb.me.

---

## Getting Started

There are three ways to use FlowB:

**Telegram Bot** -- Start a conversation with [@Flow_b_bot](https://t.me/Flow_b_bot) on Telegram. Send `/start` to get going.

**Farcaster Mini App** -- Open FlowB from your Warpcast client. Sign in with your Farcaster account to browse events, RSVP, and coordinate with crews.

**flowb.me Website** -- Visit [flowb.me](https://flowb.me) to access FlowB from any browser. Short links for invites, crews, and referrals all route through flowb.me.

---

## Events

### Discover Events

Browse EthDenver events with a swipeable card interface. Each card shows the event title, date, time, venue, category, and a direct link to the event page.

### Search and Filter

- **Search by keyword**: Type what you are looking for (e.g., "defi workshop", "yoga tonight")
- **Filter by category**: Social, class, workshop, panel, party, and more
- **Filter by date**: Tonight, tomorrow, this weekend, or all dates
- **Natural language**: FlowB understands queries like "salsa in Denver" or "free events this weekend"

### RSVP

Tap "Going" or "Maybe" on any event card. Your RSVP is visible to your flow (friends and crew members) so they can see your plans.

### Social Proof

When viewing an event, you can see how many people from your flow are also going or interested. This "who's going" badge appears on event cards.

### Event Reminders

If you RSVP to an event, FlowB sends you a reminder 30 minutes before it starts with the event name, time, and venue.

### Personalized Feed

Events are sorted by relevance. Your interest categories (set during onboarding) and past activity influence what you see first.

---

## Crews

Crews are groups for coordinating with your squad at EthDenver.

### Create a Crew

Give your crew a name and an optional emoji. Example: `/crew create Salsa Wolves` or `/crew create Wolf Pack`. FlowB generates a shareable invite link automatically.

### Join Modes

Each crew has a join mode that controls how new members get in:

| Mode | Behavior |
|------|----------|
| **Open** | Anyone with the link can join instantly |
| **Approval** | New members submit a request; admins approve or deny |
| **Closed** | No new members can join |

Crew creators and admins can change the join mode at any time.

### Invite Links

Two types of invite links:

- **Crew link** (`flowb.me/g/{code}`) -- Generic link anyone can share. Joins follow the crew's join mode.
- **Personal invite** (`flowb.me/gi/{code}`) -- Tracked link tied to a specific member. Bypasses approval mode. The inviter earns points for each person who joins.

### Roles

| Role | Permissions |
|------|-------------|
| **Creator** | Full control: settings, promote/demote, remove members |
| **Admin** | Approve/deny join requests, remove members, change settings |
| **Member** | View members, share invite, RSVP, checkin |

Creators can promote members to admin and demote admins back to members.

### Checkins

Crew members can check in at a venue to broadcast their location. Other crew members get notified: "Alice checked in at Main Stage". Checkins expire automatically.

### Browse Public Crews

Public crews are discoverable through the browse feature. You can see crew names, descriptions, and request to join.

### Who's Going

See which crew members are going to upcoming events. This helps your crew coordinate and meet up.

---

## Friends

### Connect with Friends

Share your personal flow invite link (`flowb.me/f/{code}`) with anyone. When they tap it, you are instantly connected and can see each other's event plans.

### Friend RSVP Notifications

When a friend RSVPs to an event, you get a notification: "Alice is going to [event]! You in?" with buttons to RSVP yourself.

### Mute

You can mute a friend connection to stop receiving notifications about them without removing the connection entirely. Unmute at any time to restore notifications.

### Personal Invite Link

Your personal flow invite link is unique to you. Share it via Telegram, text, or any messaging app. You earn points for every friend who connects.

---

## Points and Leaderboards

FlowB rewards engagement with points. Every meaningful action earns points, and you can track your progress through milestone levels.

### Points Table

| Action | Points | Daily Cap | Notes |
|--------|--------|-----------|-------|
| Daily login | 5 | 5 | Once per day |
| Message sent | 1 | 50 | DM interactions |
| Events viewed | 2 | 20 | Browsing events |
| Event saved | 3 | 30 | Saving to your list |
| Event RSVP | 5 | 25 | Going or maybe |
| Search | 2 | 20 | Searching for events |
| Referral click | 3 | 30 | Someone clicks your link |
| Referral signup | 10 | 50 | Someone signs up via your link |
| Social linked | 10 | 50 | Linking a social account |
| Verification complete | 25 | 25 | One-time |
| Flow invite sent | 2 | 20 | Sharing your invite link |
| Flow accepted | 15 | 30 | A friend joins your flow |
| Crew created | 20 | 20 | One-time |
| Crew joined | 10 | 30 | Joining a crew |
| Crew invite sent (member) | 2 | 20 | Members sharing crew link |
| Crew invite sent (admin) | 1 | 10 | Admins sharing crew link |
| Crew invite converted | 8 | 40 | Someone joins via your link |
| Crew invite converted (admin) | 3 | 15 | Admin invite conversion |
| Crew request approved | 5 | 25 | Approval-mode join granted |
| Friend meetup | 10 | 30 | Meeting up with a friend |
| Crew meetup | 15 | 30 | Meeting up with crew |
| Group joined | 15 | 15 | Joining a Telegram group (one-time) |
| Group message | 1 | 30 | Posting in a group |
| Group reply | 2 | 20 | Replying in a group |
| Channel reaction | 1 | 20 | Reacting to a channel post |

### Milestone Levels

| Level | Title | Points Needed |
|-------|-------|---------------|
| 1 | Explorer | 0 |
| 2 | Mover | 50 |
| 3 | Groover | 150 |
| 4 | Dancer | 500 |
| 5 | Star | 1,000 |
| 6 | Legend | 2,500 |

### Streaks

Log in on consecutive days to build a streak. Streak bonuses are awarded once per milestone:

| Streak | Bonus |
|--------|-------|
| 3 days | +10 points |
| 7 days | +25 points |
| 30 days | +100 points |

### Crew Leaderboard

Each crew has its own leaderboard ranking members by total points. The crew's overall score is the sum of all member points. Public crews are ranked globally.

### Global Crew Ranking

Crews are ranked by the total combined points of all their members. The top crews are displayed on Farcaster via daily leaderboard casts.

---

## Notifications

FlowB sends timely, relevant notifications across platforms.

### Notification Types

| Trigger | Message Example |
|---------|----------------|
| Friend RSVPs to event | "Alice is going to DeFi Summit! You in?" |
| Crew member RSVPs | "Alice from Wolf Pack is going to DeFi Summit!" |
| Crew member checks in | "Alice checked in at Main Stage" |
| Someone joins your crew | "Alice just joined Wolf Pack!" |
| Event reminder | "DeFi Summit starts at 3:00 PM at Convention Center" |
| Join request (to admins) | "Alice wants to join Wolf Pack" |
| Join request approved (to requester) | "You're in! Your request to join Wolf Pack was approved." |

### Cross-Platform Delivery

- **Telegram users**: Notifications arrive as bot DMs with inline action buttons
- **Farcaster users**: Notifications arrive as push notifications in Warpcast

### Deduplication

Each notification is logged in the notification log. If a user was already notified about the same event by the same person, the notification is skipped. Notifications are also deduplicated across crews -- if you share multiple crews with someone, you only get notified once per event.

### Quiet Hours

Users can enable quiet hours in settings. When enabled, no notifications are sent between 10 PM and 8 AM in the user's timezone (defaults to America/Denver / MST).

### Daily Limit

Each user receives a maximum of 10 notifications per day. Once the limit is reached, additional notifications are silently skipped until the next day.

---

## FlowB on Farcaster

### Daily Digests

FlowB posts a morning digest to Farcaster listing the day's event count and top events. An evening highlights post surfaces the best events happening tonight.

### Event Cards

Notable events are posted to Farcaster with event details and a link to RSVP in the FlowB mini app.

### Mention Responses

Mention @flowb in a cast and get a reply. FlowB understands these intents:

- "What's happening tonight?" -- Lists tonight's events
- "Free events" -- Shows free events at EthDenver
- "Leaderboard" or "top crews" -- Shows the top crews by points
- "Who's going?" -- Directs you to check FlowB for crew plans
- General mention -- Introduction with suggestions

Rate limited to 1 reply per user per hour.

### Share from Mini App

From the Farcaster mini app, you can compose a cast to share an event directly to your Farcaster feed.

---

## Platforms

### Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Begin or return to main menu |
| `/events` | Browse EthDenver events |
| `/search [query]` | Search for specific events |
| `/crew` | Manage your crew |
| `/crew create [name]` | Create a new crew |
| `/flow` | Your personal flow (friends and crews) |
| `/share` | Share your flow invite link |
| `/going` | View your schedule / RSVP to current event |
| `/whosgoing` | See which flow members are going to events |
| `/schedule` | Your upcoming RSVP'd events |
| `/points` | View your points and streak |
| `/referral` | Get your referral link |
| `/help` | Get help and see all commands |

The bot also responds to natural language in DMs and group mentions. Try "events tonight", "who's going", "my schedule", or "fc trending".

### Telegram Mini App

The Telegram mini app provides a richer visual experience accessible via the `/app` command or the "Open FlowB" button. It supports event browsing, RSVP, and crew management with a native-feeling interface.

### Farcaster Mini App

A full-featured mini app running inside Warpcast with these screens:

- **Home**: Browse events with search and filters
- **Event Detail**: Full event info with RSVP, social proof, and sharing
- **Schedule**: Your upcoming RSVP'd events with checkin
- **Crew**: View your crews, members, active checkins, and leaderboard
- **Points**: Your points balance, streak, level, and progress to next milestone

Sign in with your Farcaster account (SIWF). Add the mini app to receive push notifications.

### flowb.me Website

The web frontend at flowb.me provides:

- Auth via Privy (supports wallet, email, and social login)
- Event browsing and discovery
- Short link resolution for invites, crews, and referrals

### Short Links

| Pattern | Purpose | Example |
|---------|---------|---------|
| `flowb.me/f/{code}` | Personal flow invite | Connect as friends |
| `flowb.me/g/{code}` | Crew join link | Join a crew |
| `flowb.me/gi/{code}` | Personal crew invite | Tracked invite with point attribution |
| `flowb.me/ref/{code}` | Referral link | Earn referral points |

---

## API Reference

All API routes are prefixed with `/api/v1/`. Authenticated routes require a `Bearer` token in the `Authorization` header. Tokens are issued via the auth endpoints.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/telegram` | No | Authenticate via Telegram initData |
| POST | `/auth/farcaster` | No | Authenticate via Farcaster SIWF (message + signature) |

### Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/events` | No | List events. Query params: `city`, `category`, `limit` |
| GET | `/events/:id` | Optional | Get event detail. If authed, includes flow social proof |
| GET | `/events/:id/social` | Optional | Get RSVP counts. If authed, includes flow attendance |
| POST | `/events/:id/rsvp` | Yes | RSVP to an event. Body: `{ status: "going" | "maybe" }` |
| DELETE | `/events/:id/rsvp` | Yes | Cancel RSVP |

### Schedule

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/me/schedule` | Yes | Get personal upcoming schedule |
| POST | `/me/schedule/:id/checkin` | Yes | Check in to a scheduled event |

### Flow

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/flow/crews` | Yes | List your crews |
| POST | `/flow/crews` | Yes | Create a crew. Body: `{ name, emoji?, description? }` |
| POST | `/flow/crews/:id/join` | Yes | Join a crew. Body: `{ joinCode? }` |
| GET | `/flow/crews/:id/members` | Yes | Get crew members and active checkins |
| POST | `/flow/crews/:id/checkin` | Yes | Check in to a venue. Body: `{ venueName, status?, message? }` |
| GET | `/flow/crews/:id/leaderboard` | Yes | Get crew points leaderboard |
| GET | `/flow/friends` | Yes | List your friends |
| POST | `/flow/connect` | Yes | Accept a friend invite. Body: `{ code }` |
| GET | `/flow/invite` | Yes | Get your personal flow invite link |

### Points

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/me/points` | Yes | Get points, streak, level |

### Preferences

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/me/preferences` | Yes | Get user preferences |
| PATCH | `/me/preferences` | Yes | Update preferences. Body: `{ quiet_hours_enabled?, timezone?, arrival_date?, interest_categories? }` |

### Notifications (Farcaster)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/notifications/farcaster/webhook` | Webhook signature | Handle Farcaster notification lifecycle events |

### Webhooks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/webhooks/neynar` | HMAC-SHA512 | Handle @flowb mentions on Farcaster |

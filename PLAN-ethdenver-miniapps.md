# FlowB EthDenver Mini Apps - Ship Plan

## Mission
**"Join the Flow"** - Help groups coordinate where they are during EthDenver. One shared mini app experience across Telegram + Farcaster.

---

## 1. FEATURE AUDIT - What Stays, What Goes

### REMOVE (not needed for EthDenver)
- [ ] **Trading plugin** (`src/plugins/trading/`) - swap USDC/ETH, price quotes, portfolio, balances
- [ ] **Battles plugin** (`src/plugins/trading/battles.ts`) - battle pools, staking
- [ ] **CDP service** (`src/services/cdp.ts`) - Coinbase Developer Platform wallet/swap service
- [ ] **Privy service** (`src/services/privy.ts`) - wallet connectivity (not needed for MVP)
- [ ] **DANZ challenge rewards** - USDC payout claims (keep challenges, remove payout flow)
- [ ] **Dance moves / dance proof** - photo submission system (keep checkin, remove proof)
- [ ] Remove trading-related env vars from config
- [ ] Remove trading-related types from types.ts
- [ ] Remove trading bot commands from bot.ts

### KEEP & SHARPEN
- **eGator** - Event aggregation (Luma, Eventbrite, Tavily, Brave, RA, Google Places) - this is the backbone
- **Flow plugin** - Friend connections + crews/squads + event attendance - THIS IS THE CORE
- **Points plugin** - Gamification (simplified: focus on social + attendance points)
- **Neynar plugin** - Farcaster profile + social graph
- **Telegram bot** - Quick queries + mini app launcher
- **DANZ plugin** - Event checkin only (strip rewards/proofs)

### SIMPLIFY Points to Focus on Flow
```
event_checkin:     10 pts   (checked in at venue)
crew_created:      20 pts   (started a squad)
crew_joined:       10 pts   (joined a squad)
flow_accepted:     15 pts   (connected with someone)
event_shared:       5 pts   (shared event to chat/cast)
daily_active:       5 pts   (opened app today)
streak_3:          10 pts   (3 day streak)
streak_7:          25 pts   (full week at EthDenver)
```

---

## 2. ARCHITECTURE

```
                    +------------------+
                    |   Shared Backend  |
                    |  (Fastify + Supa) |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------+----------+     +-----------+-----------+
    | Telegram Mini App  |     | Farcaster Mini App    |
    | (React + Vite)     |     | (Next.js)             |
    | @tma.js/sdk        |     | @farcaster/miniapp-sdk|
    +---------+----------+     +-----------+-----------+
              |                             |
    +---------+----------+     +-----------+-----------+
    | Telegram Bot       |     | Farcaster Casts       |
    | (Grammy - existing)|     | (Embed cards)         |
    +--------------------+     +-----------------------+
```

### Shared Backend (existing Fastify server, enhanced)
- `POST /api/v1/auth/telegram` - validate initData, return JWT
- `POST /api/v1/auth/farcaster` - validate SIWF credential, return JWT
- `GET  /api/v1/events` - event discovery (existing)
- `GET  /api/v1/events/:id` - single event detail
- `POST /api/v1/events/:id/rsvp` - RSVP (going/maybe)
- `GET  /api/v1/flow/crews` - list user's crews
- `POST /api/v1/flow/crews` - create crew
- `POST /api/v1/flow/crews/:id/join` - join crew
- `GET  /api/v1/flow/crews/:id/members` - crew members + locations
- `POST /api/v1/flow/crews/:id/checkin` - broadcast location/status to crew
- `GET  /api/v1/flow/friends` - friend list
- `POST /api/v1/flow/connect` - send friend request
- `GET  /api/v1/me/points` - points + streak
- `GET  /api/v1/me/schedule` - my RSVPs (personal schedule)
- `POST /api/v1/notifications/farcaster` - webhook receiver for Farcaster

### Mini App Frontend (shared React components, platform wrappers)
```
/miniapp
  /packages
    /ui          - Shared React components (event cards, crew panels, schedule)
    /api         - Shared API client + types
  /apps
    /telegram    - Vite + React + @tma.js/sdk (deployed to Vercel/CF Pages)
    /farcaster   - Next.js + @farcaster/miniapp-sdk (deployed to Vercel)
```

---

## 3. CORE USER FLOWS

### Flow 1: Quick Event Query (Bot -> Mini App)
```
User in Telegram: "what's happening at 3pm today?"
  -> Bot searches eGator for events at that time
  -> Bot responds with 1-3 event cards (inline)
  -> Each card has "Open in FlowB" button -> launches mini app to that event
  -> Mini app shows full detail + who from your crew is going + RSVP button
```

### Flow 2: Join the Flow (Core Loop)
```
1. User opens mini app (from bot menu button or Farcaster cast)
2. Sees "What's Happening Now" - live feed of events sorted by time
3. Taps event -> sees detail + social proof ("3 friends going")
4. RSVPs -> added to personal schedule
5. Creates or joins a Crew ("ETH Denver Squad", "DeFi Crew")
6. Crew members see each other's schedules + live status
7. "I'm here!" checkin button at venues -> crew gets notified
8. Points accumulate -> leaderboard in crew
```

### Flow 3: Crew Coordination (The Killer Feature)
```
1. Create crew -> get share link (works in both TG and FC)
2. Share link in group chat or cast
3. Friends join crew
4. Dashboard shows:
   - WHO: Crew member avatars + online status
   - WHERE: "Alice is at ETH Denver Main Stage" / "Bob heading to Spork Castle"
   - WHEN: Shared crew schedule (overlay of everyone's RSVPs)
   - NEXT: "3 of you are going to Uniswap Party at 8pm"
5. Quick status updates: "heading there now" / "running late" / "let's meet at..."
6. Push notification: "Alice just checked in at Spork Castle - 2 others from your crew are there!"
```

### Flow 4: Farcaster Social Discovery
```
1. User opens FlowB mini app from a cast embed
2. Sees events with social proof from Farcaster social graph
3. "5 people you follow are going to this event"
4. RSVPs -> can auto-compose a cast: "I'm going to [event] - who's joining? [FlowB link]"
5. Friends see the cast -> tap embed -> see the event + who's going -> viral loop
6. Notification: "Your friend @alice just RSVP'd to ETH Denver Opening Party"
```

### Flow 5: Live Event Mode
```
During EthDenver (Feb 23 - Mar 2):
1. Mini app defaults to "NOW" view - what's happening right now
2. "Next Up" section - events starting in next 2 hours
3. Crew pulse - where your crew members are RIGHT NOW
4. Quick checkin - "I'm at [venue]" with one tap
5. "Find my crew" - see which venues have the most crew members
6. Haptic feedback on checkins and crew arrivals
```

---

## 4. NOTIFICATION STRATEGY

### Telegram Notifications (via bot.api.sendMessage)
These are REAL push notifications on the user's phone.

**Trigger events:**
- Friend RSVP'd to same event as you: "Alice is also going to [event] at 7pm!"
- Crew member checked in: "3 of your crew are at [venue] right now"
- Event starting soon: "Uniswap Party starts in 30 min - you + 2 crew members RSVP'd"
- Crew invite: "[Name] invited you to join [Crew Name]"
- Friend request: "[Name] wants to connect on FlowB"
- Daily digest (morning): "Today at EthDenver: 3 events on your schedule, 5 crew members active"

**Implementation:**
- Use existing notification_log table for dedup
- Respect quiet hours (10pm - 8am local)
- Max 10 notifications/day per user
- Each notification has "Open in FlowB" mini app button

### Farcaster Notifications (via Mini App notification API)
In-app notifications in Warpcast's notification tab.

**Trigger events:**
- Same triggers as Telegram but Farcaster-specific:
- "3 people you follow are going to [event]"
- "Your crew [name] has 5 members at [venue]"
- "[Follower] just RSVP'd to your shared event"

**Implementation:**
- Store Farcaster notification tokens from webhook events
- `POST https://api.warpcast.com/v1/frame-notifications` with token, title, body, targetUrl
- Rate limit: 1/30s, 100/day per token
- Target URL deep-links into specific mini app view

### Cross-Platform Notification Dedup
- User may be on both Telegram + Farcaster
- Track `user_id` across platforms via Supabase
- If user is on both: prefer Telegram (real push) for urgent, Farcaster for social
- Never send same notification to both platforms

---

## 5. MINI APP SCREENS

### Screen 1: Home / "What's Happening"
```
+----------------------------------+
|  [FlowB]           [My Crew] [+] |
+----------------------------------+
|  NOW - Feb 25                     |
|  ================================ |
|  [EVENT CARD]                     |
|  ETH Denver Main Stage            |
|  10:00 AM - Speaker: Vitalik      |
|  [3 friends going] [RSVP]        |
|  ================================ |
|  [EVENT CARD]                     |
|  Spork Castle Side Event          |
|  11:00 AM - DeFi Panel            |
|  [Alice is here!] [RSVP]         |
|  ================================ |
|                                   |
|  NEXT UP (2 hrs)                  |
|  [compact event list...]          |
|                                   |
+----------------------------------+
| [Now] [Schedule] [Crew] [Points] |
+----------------------------------+
```

### Screen 2: Event Detail
```
+----------------------------------+
| [<] Event Detail                  |
+----------------------------------+
|  ETH Denver Opening Party         |
|  Feb 23 @ 7:00 PM                |
|  National Western Complex         |
|  Free with badge                  |
|                                   |
|  YOUR CREW                        |
|  [Alice - Going]                  |
|  [Bob - Maybe]                    |
|  [Carol - Going]                  |
|                                   |
|  ALSO GOING (Farcaster)           |
|  [vitalik.eth] [jessepollak]      |
|  +12 others you follow            |
|                                   |
| [====== I'M GOING ======]        |  <- MainButton
| [    Maybe Later    ]             |  <- SecondaryButton
+----------------------------------+
```

### Screen 3: My Crew
```
+----------------------------------+
| [<] Denver Squad (7 members)      |
+----------------------------------+
|  RIGHT NOW                        |
|  [*] Alice - @ Main Stage         |
|  [*] Bob - @ Spork Castle         |
|  [ ] Carol - last seen 30m ago    |
|  [ ] Dave - heading to Base House |
|                                   |
|  SHARED SCHEDULE                  |
|  3:00 PM - DeFi Panel (Alice,You) |
|  5:00 PM - Happy Hour (Everyone)  |
|  8:00 PM - Party (Bob, Carol)     |
|                                   |
|  [Share Crew Link]                |
|  [Quick Status: "On my way!"]     |
|                                   |
| [===== CHECK IN HERE =====]      |  <- MainButton
+----------------------------------+
```

### Screen 4: My Schedule
```
+----------------------------------+
| [<] My Schedule                   |
+----------------------------------+
|  TODAY - Feb 25                   |
|  [x] 10am Main Stage (checked in)|
|  [ ] 2pm DeFi Panel              |
|  [ ] 5pm Happy Hour              |
|  [ ] 8pm Uniswap Party           |
|                                   |
|  TOMORROW - Feb 26               |
|  [ ] 9am Breakfast Meetup        |
|  [ ] 1pm Hack Session            |
|                                   |
+----------------------------------+
| [Now] [Schedule] [Crew] [Points] |
+----------------------------------+
```

### Screen 5: Points & Leaderboard
```
+----------------------------------+
| [<] Points                        |
+----------------------------------+
|  YOU: 185 pts - Level 3 Groover  |
|  Streak: 4 days                  |
|                                   |
|  CREW LEADERBOARD                 |
|  1. Alice - 340 pts              |
|  2. You - 185 pts                |
|  3. Bob - 120 pts                |
|                                   |
|  RECENT                           |
|  +10 Checked in at Main Stage    |
|  +15 Connected with @carol       |
|  +5  Shared event to crew        |
+----------------------------------+
```

---

## 6. DEEP LINKING

### Telegram Deep Links
```
# Open mini app to home
https://t.me/Flow_b_bot?startapp=home

# Open to specific event
https://t.me/Flow_b_bot?startapp=event_abc123

# Join a crew
https://t.me/Flow_b_bot?startapp=crew_XYZ789

# Connect with someone
https://t.me/Flow_b_bot?startapp=connect_USR456

# Open schedule
https://t.me/Flow_b_bot?startapp=schedule
```

### Farcaster Deep Links
```
# Cast embed -> opens to event
Meta tag: fc:miniapp with image showing event preview
URL: https://flowb.app/event/abc123

# Crew invite cast
"Join my EthDenver crew on FlowB! [embed]"
URL: https://flowb.app/crew/XYZ789

# Notification target
https://flowb.app/crew/XYZ789?view=checkin
```

---

## 7. DATABASE CHANGES NEEDED

### New table: `flowb_checkins`
```sql
CREATE TABLE flowb_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  crew_id UUID REFERENCES flowb_groups(id),
  venue_name TEXT NOT NULL,
  event_id TEXT,                    -- optional link to event
  status TEXT DEFAULT 'here',       -- here | heading | leaving
  message TEXT,                     -- "On my way!" etc
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '4 hours'
);
CREATE INDEX idx_checkins_crew ON flowb_checkins(crew_id, created_at DESC);
CREATE INDEX idx_checkins_user ON flowb_checkins(user_id, created_at DESC);
```

### New table: `flowb_schedules` (personal RSVP schedule)
```sql
CREATE TABLE flowb_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_source TEXT,               -- luma | eventbrite | etc
  event_source_id TEXT,            -- original event ID
  event_url TEXT,
  venue_name TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  rsvp_status TEXT DEFAULT 'going', -- going | maybe
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, event_source, event_source_id)
);
CREATE INDEX idx_schedules_user ON flowb_schedules(user_id, platform, starts_at);
```

### New table: `flowb_notification_tokens` (Farcaster)
```sql
CREATE TABLE flowb_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  token TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fid)
);
```

### Enhance existing: `flowb_groups`
```sql
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS
  description TEXT,
  max_members INT DEFAULT 50,
  event_context TEXT;  -- "ethdenver-2026" to scope crews to events
```

---

## 8. IMPLEMENTATION TODOS

### Phase 0: Cleanup (1-2 hours)
- [ ] Remove trading plugin + battles + CDP service + Privy service
- [ ] Remove trading commands from bot.ts
- [ ] Remove trading types from types.ts
- [ ] Remove trading config from config.ts
- [ ] Clean up .env.example (remove CDP/Privy/trading vars)
- [ ] Verify bot still starts cleanly

### Phase 1: Backend API (3-4 hours)
- [ ] Add JWT auth middleware (validate TG initData or Farcaster SIWF)
- [ ] Add `/api/v1/auth/telegram` endpoint
- [ ] Add `/api/v1/auth/farcaster` endpoint
- [ ] Add `/api/v1/events/:id` single event endpoint
- [ ] Add `/api/v1/events/:id/rsvp` endpoint
- [ ] Add `/api/v1/me/schedule` endpoint
- [ ] Add `/api/v1/flow/crews/:id/checkin` endpoint
- [ ] Add `/api/v1/flow/crews/:id/members` with live checkin status
- [ ] Add `/api/v1/notifications/farcaster/webhook` endpoint
- [ ] Run new SQL migrations (checkins, schedules, notification_tokens)
- [ ] Add Farcaster notification sender utility

### Phase 2: Telegram Mini App (4-5 hours)
- [ ] Scaffold: `npx @anthropic-ai/create-mini-app` or manual React + Vite
- [ ] Set up @tma.js/sdk integration
- [ ] Implement auth flow (send initData to backend, get JWT)
- [ ] Build shared UI components (EventCard, CrewPanel, ScheduleView, PointsBadge)
- [ ] Build Home screen ("What's Happening Now")
- [ ] Build Event Detail screen (with crew social proof)
- [ ] Build Crew screen (members, checkins, shared schedule)
- [ ] Build Schedule screen (personal RSVP list)
- [ ] Build Points screen (leaderboard)
- [ ] Wire up MainButton for RSVP + Checkin actions
- [ ] Wire up BackButton for navigation
- [ ] Add haptic feedback on key actions
- [ ] Register with @BotFather: menu button + /setmenubutton
- [ ] Deploy to Vercel/Cloudflare Pages
- [ ] Update bot.ts: add "Open FlowB" inline buttons on event cards
- [ ] Update bot.ts: add deep links to mini app on search results

### Phase 3: Farcaster Mini App (4-5 hours)
- [ ] Scaffold: `npm create @farcaster/mini-app`
- [ ] Set up manifest at `/.well-known/farcaster.json`
- [ ] Implement auth flow (SIWF -> backend JWT)
- [ ] Reuse shared UI components from Telegram app
- [ ] Build Home screen with Farcaster social proof (who you follow is going)
- [ ] Build Event Detail with Neynar social graph integration
- [ ] Build Crew screen
- [ ] Build composeCast integration ("I'm going to [event]! [embed]")
- [ ] Set up fc:miniapp meta tags for event embeds (3:2 preview images)
- [ ] Implement notification webhook receiver
- [ ] Implement notification sender (friend RSVP, crew checkin, event reminders)
- [ ] Deploy to Vercel
- [ ] Publish to Farcaster app directory

### Phase 4: Notifications (2-3 hours)
- [ ] Telegram: crew checkin notifications ("Alice is at Main Stage")
- [ ] Telegram: event reminder notifications (30 min before RSVP'd events)
- [ ] Telegram: friend RSVP notifications
- [ ] Telegram: daily morning digest
- [ ] Farcaster: crew checkin notifications
- [ ] Farcaster: friend RSVP notifications
- [ ] Farcaster: social proof notifications ("3 people you follow going to X")
- [ ] Cross-platform dedup logic
- [ ] Quiet hours (10pm-8am)
- [ ] Notification preferences (per user)

### Phase 5: Bot Enhancement (1-2 hours)
- [ ] Natural language event queries: "what's at 3pm today" -> eGator search -> cards with mini app links
- [ ] Quick crew status: "where's my crew" -> summary + "Open in FlowB" button
- [ ] Inline mode: type @Flow_b_bot in any chat -> search events -> send as mini app link
- [ ] /schedule command -> personal schedule summary + "Open full schedule" mini app link
- [ ] /crew command -> crew summary + "Open crew" mini app link

### Phase 6: Polish & Deploy (2-3 hours)
- [ ] Test end-to-end on Telegram (iOS + Android)
- [ ] Test end-to-end on Warpcast (iOS + Desktop)
- [ ] Performance optimization (< 500KB initial bundle)
- [ ] Error handling + fallbacks
- [ ] Deploy backend to Fly.io
- [ ] Deploy Telegram mini app to Vercel
- [ ] Deploy Farcaster mini app to Vercel
- [ ] DNS setup for flowb.app or similar domain
- [ ] Register @BotFather menu button
- [ ] Publish Farcaster manifest + app directory listing

---

## 9. VIRAL LOOPS

### Telegram Viral Loop
```
User RSVPs -> crew gets notified -> crew opens app -> they RSVP too
User creates crew -> shares link in group chat -> friends join -> they invite others
User checks in -> crew gets push notification -> they check in too -> FOMO
```

### Farcaster Viral Loop
```
User RSVPs -> auto-compose cast with embed -> followers see card -> tap -> RSVP
User creates crew -> cast with crew invite embed -> followers join -> they cast too
Event card in feed -> social proof "5 people you follow going" -> tap -> RSVP -> cast
```

### Cross-Platform
```
Farcaster user joins crew -> shares crew link in Telegram group -> TG users join
TG user finds event -> shares in Farcaster -> FC users discover FlowB
```

---

## 10. ETHDENVER SPECIFIC

- **Dates**: Feb 23 - Mar 2, 2026
- **Default city**: Denver, CO
- **Default eGator query**: Focus on EthDenver, Spork Castle, and Denver crypto events
- **Venue database**: Pre-populate known EthDenver venues (National Western Complex, Spork Castle, etc.)
- **Time zone**: MST (UTC-7)
- **Pre-seed**: Import EthDenver official schedule via Luma/Eventbrite APIs before launch

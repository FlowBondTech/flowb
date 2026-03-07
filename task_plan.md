# Task Plan: FlowB Business Platform - "Get in the Flow"

## Vision

Transform FlowB from an event discovery tool into a **full-stack AI-powered business platform** where meetings, contacts, automation, and team workflows all live under one roof. Two tiers: **FlowB** (personal/social) and **FlowB.biz** (business/teams). The mobile app becomes the flagship product -- polished, delightful, and indispensable.

**Core Thesis**: Every professional interaction (meeting, follow-up, introduction, pipeline move) can be AI-assisted. FlowB's agents (OpenClaw) don't just find events -- they schedule meetings, prep briefings, send follow-ups, and keep your business flowing.

---

## Architecture Overview

```
                     +-------------------+
                     |   flowb.fly.dev   |
                     |  (Fastify + All   |
                     |   Plugins)        |
                     +--------+----------+
                              |
           +------------------+------------------+
           |          |           |               |
      +----+----+ +---+---+ +----+----+  +-------+-------+
      | Meeting | | Kanban| | Contacts|  |  AI Services  |
      | Plugin  | | Plugin| | (Flow)  |  |  (Automation) |
      +----+----+ +---+---+ +----+----+  +-------+-------+
           |          |           |               |
     +-----+----------+-----------+-------+-------+
     |                |                   |
  Mobile App      flowb.me           biz.flowb.me
  (Expo/RN)      (Personal)         (Business)
  iOS + Android   Social tier        Pro/Team tier
```

### Two Product Surfaces

| Surface | URL | Audience | Features |
|---------|-----|----------|----------|
| **FlowB** | flowb.me + mobile app | Individuals, creators, community | Events, schedule, crews, friends, points, AI chat |
| **FlowB Biz** | biz.flowb.me (+ app toggle) | Teams, agencies, freelancers | Meetings, kanban, leads, automation, CRM, analytics |

---

## Phase 1: Smart Meetings Engine
**Status**: `pending`
**Goal**: Tell FlowB a person or topic and it generates a complete meeting -- time, agenda, context, follow-ups. AI-first meeting management.

### What "Smart Meetings" Means

FlowB doesn't just create calendar entries. It:
1. **Generates** meetings from natural language ("Meet with Sarah about the pitch deck")
2. **Enriches** with context (pulls Sarah's contact info, past interactions, shared events)
3. **Suggests** optimal times (based on your schedule, their timezone, mutual free windows)
4. **Prepares** briefing notes ("Last met at EthDenver, discussed DeFi partnerships, she's CTO at XYZ")
5. **Sends** invites via preferred channel (email, TG, Farcaster DM)
6. **Links** all parties via a shared meeting link (`flowb.me/m/{code}`) -- one URL for agenda, RSVP, chat, location
7. **Opens** a meeting chat room so attendees can coordinate before, during, and after
8. **Reminds** with smart notifications (15min before + day-of briefing push)
9. **Follows up** post-meeting (auto-generate follow-up tasks, thank-you message draft)
10. **Tracks** meeting history and outcomes (what was discussed, action items)
11. **Converts** from leads -- when a lead is ready, one tap creates a meeting with full context carried over

### Database Schema
```sql
CREATE TABLE flowb_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,            -- flowb user_id
  title text NOT NULL,
  description text,
  meeting_type text DEFAULT 'one_on_one', -- one_on_one, group, standup, pitch, coffee, call
  status text DEFAULT 'draft',       -- draft, scheduled, confirmed, in_progress, completed, cancelled

  -- Scheduling
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes int DEFAULT 30,
  timezone text DEFAULT 'America/Denver',
  location_type text DEFAULT 'in_person', -- in_person, video, phone, hybrid
  location_details text,             -- venue name, zoom link, phone number
  video_link text,                   -- auto-generated or provided

  -- AI-generated context
  briefing_notes text,               -- AI-compiled context about attendees
  suggested_agenda text[],           -- AI-suggested talking points
  prep_materials text[],             -- links to relevant docs/events/posts

  -- Follow-up
  action_items text[],               -- post-meeting action items
  follow_up_status text DEFAULT 'none', -- none, drafted, sent
  follow_up_message text,            -- AI-drafted follow-up
  outcome_notes text,                -- meeting outcome summary

  -- Integration
  crew_id uuid,                      -- if crew meeting
  board_id uuid,                     -- linked kanban board
  lead_id uuid,                      -- linked lead
  event_id text,                     -- linked event (meet at event)

  -- Shared Link & Chat
  share_code text UNIQUE,            -- short code for flowb.me/m/{code}
  chat_enabled boolean DEFAULT true, -- whether meeting has a chat room
  chat_channel_id text,              -- reference to chat channel (reuse crew chat infra)

  -- Metadata
  source text DEFAULT 'manual',      -- manual, ai_suggested, recurring, openclaw, lead_conversion
  recurrence jsonb,                  -- { frequency: 'weekly', day: 'monday', time: '10:00' }
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE flowb_meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  user_id text,                      -- flowb user_id (if registered)
  name text NOT NULL,
  email text,
  phone text,
  platform text,                     -- telegram, farcaster, email, phone
  platform_id text,                  -- their ID on that platform
  rsvp_status text DEFAULT 'pending', -- pending, accepted, declined, tentative
  rsvp_at timestamptz,
  is_organizer boolean DEFAULT false,
  notes text,                        -- private notes about this attendee for this meeting
  created_at timestamptz DEFAULT now()
);

CREATE TABLE flowb_meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  content text NOT NULL,
  note_type text DEFAULT 'note',     -- note, action_item, decision, question
  is_ai_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE flowb_meeting_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  sender_id text NOT NULL,           -- flowb user_id or 'system' for bot messages
  sender_name text NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text',  -- text, system, file, link, action_item
  metadata jsonb DEFAULT '{}',       -- file URLs, link previews, etc.
  created_at timestamptz DEFAULT now()
);
```

### Shared Meeting Links (`flowb.me/m/{code}`)

Every meeting gets a unique short link. This is the **single destination** that ties all parties together:

```
flowb.me/m/abc123
  |
  +-- Landing page (no auth required to view basics):
  |     Meeting title, date/time, location, organizer name
  |     "Join this meeting" CTA -> auth -> full access
  |
  +-- Authenticated view:
  |     Full agenda + briefing notes
  |     Attendee list with RSVP status
  |     Meeting chat room (real-time)
  |     Location/directions or video link
  |     Files & prep materials
  |     Action items (post-meeting)
  |
  +-- RSVP actions:
  |     Accept / Decline / Tentative
  |     Suggest alternative time
  |     Add to calendar (iCal download)
  |
  +-- Chat room:
        Pre-meeting: "Running 5 min late", share docs
        During: Live notes, decisions, parking lot items
        Post-meeting: Follow-up discussion, action item updates
```

**How the link flows:**
- Organizer creates meeting -> link auto-generated
- Link shared via invite (TG DM, FC cast, email, SMS)
- Recipient clicks -> sees meeting details -> RSVPs
- Both parties now in the meeting chat room
- Chat persists as the meeting's living record

**External attendees** (non-FlowB users):
- Can view meeting basics without account
- "Sign up to join the conversation" -> quick onboarding (just name + email)
- Lightweight guest access: can RSVP + chat, no full FlowB account needed

### Meeting Chat Rooms

Reuses the existing crew chat infrastructure (`flowb_group_messages` pattern) but scoped to meetings:

- **Auto-created** when meeting has 2+ attendees
- **Real-time** via Supabase Realtime subscriptions
- **Persistent** -- chat history lives forever as meeting record
- **AI participant** -- FlowB bot can post reminders, briefings, follow-ups into the chat
- **Notification routing**: New message -> push to attendees via their preferred channel

**Unified chat across ALL surfaces** -- one conversation, every platform can participate:

| Surface | Chat Experience | How It Works |
|---------|----------------|-------------|
| **Mobile app** | Native chat screen in meeting detail | Supabase Realtime subscription |
| **biz.flowb.me** | Web chat panel in meeting/CRM view | Supabase Realtime (same channel) |
| **flowb.me** | Chat widget on meeting link page | Supabase Realtime (same channel) |
| **Telegram** | DM thread from FlowB bot | Bot forwards messages, user replies go back to chat |
| **Farcaster** | DC notification + reply | Cast/DC integration via Neynar |
| **Email** | Digest of unread messages + reply-to | Inbound email parsing -> chat message |
| **Shared link** (`flowb.me/m/{code}`) | Chat embedded in meeting page | Guest access with name+email |

**How cross-platform chat works:**
```
Sarah sends message in biz.flowb.me meeting chat
  → Supabase Realtime: all connected clients see it instantly
  → koH sees it in mobile app (Realtime subscription)
  → Mike gets TG DM from FlowB bot with the message
  → Mike replies to the TG DM
  → Bot posts Mike's reply back to the meeting chat
  → Sarah and koH see Mike's reply in their respective apps
  → All messages stored in flowb_meeting_messages
```

**Same pattern extends to:**
- **Crew chat**: Already works in mobile app, now also accessible from biz.flowb.me
- **Lead conversations**: CRM users on biz.flowb.me can message leads, who receive on their platform
- **Referral crew chat**: Event discussion in crew chat drives engagement weight for commissions

### Leads-to-Meetings Pipeline

```
LEAD LIFECYCLE:
  New Lead Created (manual, OpenClaw, webhook, import)
    |
    v
  [Stage: New] -- AI enriches contact info, scores lead
    |
    v
  [Stage: Contacted] -- First outreach (email/TG/FC via automation)
    |
    v
  [Stage: Qualified] -- Lead responds, shows interest
    |                    AI suggests: "Schedule a discovery call?"
    v
  [Stage: Meeting] ★ -- ONE-TAP CONVERSION:
    |                    Lead -> Meeting with all context carried over:
    |                    - Lead's contact info -> meeting attendee
    |                    - Lead's company/deal -> meeting description
    |                    - Lead notes -> meeting briefing
    |                    - Lead tags -> meeting agenda topics
    |                    - Shared link generated + sent to lead
    |                    - Chat room created for pre-meeting coordination
    v
  [Stage: Proposal] -- Post-meeting: AI drafts proposal based on meeting notes
    |
    v
  [Stage: Won/Lost] -- Outcome tracked, meetings linked to deal value
```

**Key integration points:**
- `lead_id` on `flowb_meetings` links back to the originating lead
- Meeting completion auto-advances lead stage (Meeting -> Proposal)
- Meeting action items auto-create kanban tasks linked to the lead
- All meeting chat messages are part of the lead's activity timeline
- If lead has multiple meetings, they're threaded together chronologically

### Meeting Plugin Actions
```
meeting-create       Create meeting from natural language input
meeting-from-lead    Convert lead to meeting (carries all context)
meeting-schedule     Find optimal time and send invites
meeting-brief        Generate pre-meeting briefing
meeting-list         List upcoming/past meetings
meeting-detail       Get meeting with attendees and notes
meeting-update       Update meeting details
meeting-cancel       Cancel with notification to attendees
meeting-complete     Mark complete, prompt for notes/action items
meeting-follow-up    Generate and send follow-up message
meeting-recurring    Set up recurring meeting pattern
meeting-suggest      AI suggests meetings based on contacts/leads
meeting-link         Get/regenerate the shared meeting link
meeting-chat         Send message to meeting chat room
meeting-invite       Add attendee + send them the shared link
```

### AI Integration Points
- **OpenClaw action**: "Schedule a meeting with [contact] about [topic]"
- **TG bot command**: `/meet @sarah tomorrow coffee`
- **Chat interface**: "I need to catch up with the investors this week"
- **Auto-suggest**: After event RSVP, suggest "Meet [attendee] for coffee?"
- **Post-event**: "You met 5 new people at EthDenver. Want to schedule follow-ups?"
- **Lead pipeline**: When lead hits "Qualified" stage -> "Ready to schedule a call with [lead]?"
- **Shared link**: "Send [contact] the meeting link" -> generates flowb.me/m/{code} + sends via their preferred channel

### Notification Flow
```
Meeting Created
  → Share link generated (flowb.me/m/{code})
  → Invite sent with link (email/TG/FC/SMS)
  → Chat room auto-created
  → Attendee clicks link -> sees details -> RSVPs
  → Chat: "Sarah accepted your meeting invite"
  → 24h before: Briefing push to organizer
  → 15min before: Reminder to all (with link)
  → Meeting happens
  → Chat: Live notes/decisions captured
  → Post-meeting: Action items prompt
  → Action items -> Kanban tasks (if lead: linked to deal)
  → Follow-up draft generated
  → Follow-up sent on approval
  → If from lead: lead stage auto-advances
```

**Deliverable**: Full meeting lifecycle -- create, schedule, brief, remind, follow-up -- all AI-assisted.

---

## Phase 2: Mobile App Redesign - "Get in the Flow"
**Status**: `pending`
**Goal**: Rethink the FlowB mobile app from splash to daily use. Polished, fast, delightful. Two modes: personal (FlowB) and business (FlowB.biz).

### App Flow

```
LAUNCH
  |
  v
[Splash Screen] - FlowB logo animation (1.5s)
  |
  v
[Intro Carousel] (first launch only)
  |-- Slide 1: "Get in the Flow" - hero illustration, tagline
  |-- Slide 2: "Your AI Business Assistant" - meetings, contacts, automation
  |-- Slide 3: "Connect Your World" - events, crews, points
  |-- Slide 4: "Choose Your Flow" - personal vs business CTA
  |
  v
[Auth Screen]
  |-- "Sign in to your Flow" (personal)
  |-- "Sign in to FlowB.biz" (business/team)
  |-- Privy (wallet + social login)
  |-- Telegram login (deep link)
  |-- Farcaster login (SIWF)
  |-- Email/password (classic)
  |
  v
[Onboarding] (personalized setup)
  |-- Interests (updated from EthDenver to general categories)
  |-- Import contacts (phone, social)
  |-- Connect calendars (Google, Apple)
  |-- Set notification preferences
  |-- Join or create first crew
  |
  v
[Main App - Tab Navigation]
```

### Redesigned Tab Structure (5 tabs)

| Tab | Icon | Personal Mode | Business Mode |
|-----|------|---------------|---------------|
| **Home** | house | Featured events, buzz, discoveries | Dashboard: meetings today, tasks due, leads |
| **Flow** | sparkles | Schedule, friends, crews | Meetings, contacts, CRM |
| **AI** | brain/wand | FlowB chat, suggestions | AI assistant, automations |
| **Teams** | people | Crews, leaderboards | Boards, projects, team activity |
| **Profile** | person | Points, settings, linked accounts | Business settings, billing, integrations |

### Home Screen Redesign

**Personal Mode:**
```
[Greeting] "Good morning, koH"
[Quick Actions] - New meeting | Find events | Check in
[Today's Schedule] - Upcoming events/meetings timeline
[Buzz] - Horizontal cast feed
[Discover] - Trending events near you
[Friends Active] - Who's nearby / at events
```

**Business Mode (mobile app + biz.flowb.me):**
```
[Greeting] "Good morning, koH" + business badge
[KPIs] - Meetings today (3) | Tasks due (7) | Leads (12) | Crew earnings ($45)
[Quick Actions] - Schedule meeting | Add lead | Create task
[Today's Timeline] - Meetings + tasks chronologically
[Messages] - Unified inbox: meeting chats, lead conversations, crew threads
[Recent Activity] - Team activity feed
[AI Suggestions] - "Follow up with Sarah" / "Schedule investor call"
```

**biz.flowb.me Web Dashboard** (mirrors business mode, desktop-optimized):
```
+--sidebar--+------------------main---------------------+--chat-panel--+
| Meetings  | Today's Timeline                          | Active Chats |
| Leads     | [Meeting cards + task cards chronological] | [Meeting A]  |
| Boards    |                                           | [Lead B]     |
| Contacts  | KPI cards row                             | [Crew C]     |
| Referrals | [Meetings: 3] [Tasks: 7] [Leads: 12]     |              |
| Analytics |                                           | Chat messages|
| Settings  | Recent Activity feed                      | [Type here]  |
+-----------+-------------------------------------------+--------------+
```
Chat panel is always-visible on desktop -- you can message meeting attendees, leads, and crew members without leaving the dashboard.

### Design System Upgrade
- Keep glassmorphism foundation (it's distinctive)
- Add FlowB brand gradient (purple #7c6cf0 -> blue #0a6ee7)
- Refine glass components: tighter radius, subtle blur, cleaner borders
- New: animated FlowB logo mark (used in splash, loading, empty states)
- New: illustration style for onboarding + empty states
- Typography: Inter or SF Pro with tighter tracking
- Motion: spring animations for all transitions, parallax headers
- Haptics: refined feedback on every interaction

### Key New Screens
1. **MeetingListScreen** - Today's meetings + upcoming, grouped by day
2. **MeetingDetailScreen** - Full meeting view with briefing, attendees, notes
3. **MeetingCreateScreen** - Natural language + form hybrid ("What's this meeting about?")
4. **ContactDetailScreen** - Enriched contact view with meeting history
5. **DashboardScreen** - Business mode home with KPIs
6. **AutomationScreen** - View/manage active AI automations
7. **IntegrationsScreen** - Connect Google Cal, email, Slack, etc.

**Deliverable**: Redesigned app that feels like a premium product. Smooth onboarding, two-mode experience, meeting-centric workflows.

---

## Phase 3: Contacts & CRM Evolution
**Status**: `pending`
**Goal**: Evolve the existing friends/connections system into a full contact management + lightweight CRM that powers meetings and business workflows.

### Current State (What We Have)
- `flowb_connections` with notes, tags, contact_shared, contact_info
- Friend list, contact sharing (email, twitter, TG, FC, phone, website, linkedin)
- Invite links, friend requests

### What We're Adding
1. **Contact enrichment** - When you add a contact, AI pulls public info (Twitter bio, FC profile, LinkedIn summary)
2. **Interaction timeline** - Every meeting, event co-attendance, message, mention compiled into a timeline
3. **Smart tagging** - AI auto-suggests tags based on interactions ("investor", "met-at-ethdenver", "follow-up-needed")
4. **Contact groups** - Beyond crews: investor contacts, vendor contacts, team contacts
5. **Contact import** - Phone contacts, CSV, vCard, Google Contacts sync
6. **Business card scanner** - Camera -> OCR -> contact created (stretch goal)
7. **Relationship strength** - Score based on interaction frequency, recency, reciprocity
8. **Contact search** - Full-text search across names, notes, tags, companies
9. **Merge/dedup** - When same person exists across platforms, suggest merge

### CRM Features (FlowB.biz tier)
- Lead stages integrated with contacts (contact -> lead conversion)
- Deal tracking (value, probability, expected close)
- Pipeline view (kanban-style stages: New -> Contacted -> Qualified -> Meeting -> Proposal -> Won/Lost)
- Activity logging (calls, emails, meetings auto-tracked)
- Reminders ("Haven't talked to Sarah in 30 days")

### Leads-to-Meetings Integration
The pipeline stage "Meeting" is a **first-class transition** -- not just a label:

1. **Convert lead to meeting**: One action creates the meeting with:
   - Lead's contact info auto-fills attendee
   - Lead's deal context becomes meeting description
   - Lead's notes/tags inform AI-generated agenda
   - Shared link (`flowb.me/m/{code}`) generated immediately
   - Chat room created so lead and owner can coordinate

2. **Shared link as the handoff**: Instead of "I'll email you a calendar invite":
   - Owner taps "Schedule Meeting" on lead card
   - FlowB generates the meeting + shared link
   - Link sent to lead via their preferred channel (email, TG, FC)
   - Lead clicks link -> sees meeting details -> RSVPs -> joins chat
   - No account required to view basics (lightweight guest access)

3. **Post-meeting auto-advance**: When meeting marked complete:
   - Lead stage advances: Meeting -> Proposal
   - Meeting action items become kanban tasks linked to the lead
   - AI drafts proposal/follow-up based on meeting notes
   - Next meeting can be scheduled from the same lead card

4. **Full activity trail**: Lead's timeline shows:
   - Creation, stage changes, messages sent
   - Every meeting (with link to chat transcript)
   - Every follow-up sent
   - Every task created from action items
   - Deal value changes

**Deliverable**: Contacts become a living, AI-enriched network graph. Leads flow naturally into meetings via shared links. Business users get lightweight CRM where the meeting is the centerpiece of every deal.

---

## Phase 4: Referral & Ticket Commission Engine
**Status**: `pending`
**Goal**: When anyone in a crew engages with an event -- RSVP, share, mention in chat, view details -- and that engagement drives a ticket sale, they earn a commission. Crews become distribution channels. Engagement = revenue.

### The Core Idea

Traditional affiliate: one person shares a link, gets a cut. FlowB's model is **crew-level attribution** -- the entire social graph around an event contributes to the sale. If your crew buzzes about an event, and someone from your crew's orbit buys a ticket, everyone who touched it gets a slice.

```
EVENT POSTED TO CREW
  |
  Crew members engage:
  |  koH RSVPs (going)           ← engaged
  |  Sarah shares to her feed    ← engaged
  |  Mike mentions it in chat    ← engaged
  |  Steph views the details     ← engaged (low-weight)
  |
  Someone from crew's network buys a ticket
  |  (tracked via crew's referral link)
  |
  Commission split:
  |  Event organizer sets 10% commission
  |  Ticket = $50 → $5 commission pool
  |  Split by engagement weight:
  |    koH (RSVP + share):    40% → $2.00
  |    Sarah (share):         30% → $1.50
  |    Mike (chat mention):   20% → $1.00
  |    Steph (view only):     10% → $0.50
```

### Engagement Scoring (What Counts)

Every interaction with an event earns engagement weight for commission splits:

| Action | Weight | How It's Tracked |
|--------|--------|-----------------|
| **RSVP (going)** | 5 | `flowb_event_attendance.status = 'going'` |
| **RSVP (maybe)** | 3 | `flowb_event_attendance.status = 'maybe'` |
| **Share event link** | 4 | Short link created with user attribution |
| **Share to crew chat** | 3 | Event link detected in crew message |
| **Mention in meeting chat** | 3 | Event reference in meeting messages |
| **View event details** | 1 | API hit logged with user_id |
| **Comment/react to event** | 2 | Activity on event in feed |
| **Invite someone to event** | 5 | Direct invite tracked |
| **Check in at event** | 3 | `flowb_checkins` at event venue |
| **Post about event (social)** | 4 | SocialB post referencing event |

**Commission share formula:**
```
user_share = user_engagement_weight / total_crew_engagement_weight * commission_pool
```

### How Links Work

Every crew gets an auto-generated referral link per event:

```
flowb.me/e/{eventCode}?c={crewCode}
  |
  +-- Redirects to event detail page on flowb.me
  +-- Logs click with crew attribution
  +-- "Get Tickets" button goes to:
       flowb.me/t/{ticketCode}
         |
         +-- Logs click with crew + user attribution
         +-- Redirects to Luma/Eventbrite with ref param
         +-- Cookie set for 30-day attribution window
```

**Individual sharing** also works:
```
flowb.me/e/{eventCode}?r={userRefCode}
  → Tracks to individual user (still credits their crew)
```

**Automatic link injection**: When a crew member shares an event in crew chat or on social, FlowB auto-appends the crew referral code. No manual effort.

### Database Schema

```sql
-- Referral programs (event organizers opt-in)
CREATE TABLE flowb_referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  organizer_id text NOT NULL,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.10, -- 10% default
  commission_type text DEFAULT 'percentage',  -- percentage | fixed_amount
  fixed_amount numeric(10,2),                 -- if type = fixed_amount
  max_commission_per_ticket numeric(10,2),    -- cap per ticket
  max_total_payout numeric(10,2),             -- cap per event
  is_active boolean DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Engagement tracking (who did what with which event)
CREATE TABLE flowb_referral_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_id text NOT NULL,
  crew_id uuid,                               -- which crew context
  action text NOT NULL,                       -- rsvp, share, view, chat_mention, invite, checkin, social_post
  weight integer NOT NULL,                    -- engagement weight (1-5)
  metadata jsonb DEFAULT '{}',                -- link_id, message_id, etc.
  created_at timestamptz DEFAULT now()
);

-- Referral links (trackable URLs)
CREATE TABLE flowb_referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  creator_id text NOT NULL,                   -- user who generated/shared
  crew_id uuid,                               -- crew attribution
  short_code text UNIQUE NOT NULL,            -- for flowb.me/e/{code} or /t/{code}
  link_type text DEFAULT 'event',             -- event | ticket
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,              -- RSVPs or ticket purchases from this link
  created_at timestamptz DEFAULT now()
);

-- Click tracking
CREATE TABLE flowb_referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES flowb_referral_links(id),
  visitor_id text,                            -- flowb user_id if logged in
  visitor_fingerprint text,                   -- anonymous tracking (hashed IP+UA)
  referrer_url text,
  created_at timestamptz DEFAULT now()
);

-- Ticket sale commissions
CREATE TABLE flowb_referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES flowb_referral_programs(id),
  event_id text NOT NULL,
  ticket_ref text NOT NULL,                   -- external ticket ID (Luma, Eventbrite)
  ticket_price numeric(10,2) NOT NULL,
  total_commission numeric(10,2) NOT NULL,    -- total pool for this ticket
  status text DEFAULT 'pending',              -- pending | verified | distributed | paid
  buyer_id text,                              -- if buyer is FlowB user
  source_link_id uuid REFERENCES flowb_referral_links(id),
  source_crew_id uuid,                        -- crew that drove the sale
  created_at timestamptz DEFAULT now()
);

-- Individual commission splits (per user per ticket)
CREATE TABLE flowb_referral_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid REFERENCES flowb_referral_commissions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  engagement_weight numeric(5,2) NOT NULL,    -- their share of total weight
  share_percentage numeric(5,4) NOT NULL,     -- calculated % of pool
  amount numeric(10,2) NOT NULL,              -- actual $ earned
  status text DEFAULT 'pending',              -- pending | credited | withdrawn
  created_at timestamptz DEFAULT now()
);

-- Payout ledger (withdrawals)
CREATE TABLE flowb_referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,               -- usdc_wallet | stripe | points_conversion
  payment_ref text,                           -- tx hash or stripe payout ID
  status text DEFAULT 'pending',              -- pending | processing | completed | failed
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

### Ticket Sale Tracking (How We Know a Sale Happened)

```
Option A: Luma Webhook (Preferred)
  Luma sends webhook on ticket purchase
  → FlowB extracts ref code from URL params
  → Matches to flowb_referral_links
  → Creates commission + splits

Option B: Luma API Polling
  Periodic check of Luma guest list (already have API access)
  → New guests since last check
  → Match by email/name to FlowB users or referral clicks
  → Creates commission + splits

Option C: Self-Reported (Fallback)
  Buyer confirms ticket purchase in FlowB
  → Uploads screenshot or enters confirmation code
  → Manual verification by organizer
  → Creates commission + splits
```

### Crew Dashboard: "Your Crew's Earnings"

```
+-----------------------------------------------+
|  CREW: DeFi Builders                          |
|  Events promoted: 12                           |
|  Total tickets driven: 47                      |
|  Total earned: $235.00                         |
|  Your share: $67.50                            |
+-----------------------------------------------+
|                                                |
|  This Week's Active Events:                    |
|  +-------------------------------------------+|
|  | ETH Summit 2026                           ||
|  | Commission: 10% ($50 tickets)             ||
|  | Crew engagement: 8 members                ||
|  | Tickets sold via crew: 5                  ||
|  | Pool earned: $25.00                       ||
|  | Your share: $8.50 (34%)                   ||
|  +-------------------------------------------+|
|                                                |
|  [Withdraw Earnings]  [Share More Events]      |
+-----------------------------------------------+
```

### Integration with Existing Systems

**Points System** -- New point actions:
```
referral_event_shared:     { points: 8,  dailyCap: 40 }   -- already exists, bump weight
referral_ticket_driven:    { points: 15, dailyCap: 75 }   -- ticket sale via your link
referral_commission_earned:{ points: 5,  dailyCap: 50 }   -- commission credited
crew_referral_bonus:       { points: 10, dailyCap: 30 }   -- crew collective milestone
```

**Crew Leaderboards** -- Add referral metrics:
- Crews ranked by total ticket sales driven
- "Top Promoter" badge for highest-earning crew member
- Crew milestone: "Sold 100 tickets" -> bonus points for all members

**Notification Flow:**
```
Ticket sold via crew link
  → Notify all engaged crew members: "Your crew drove a ticket sale! 🎫"
  → Notify top engager: "You earned $X from [Event Name]"
  → Weekly digest: "This week your crew earned $Y across Z events"
```

**Meeting Integration:**
- When a lead buys a ticket via referral, create a meeting suggestion:
  "Sarah just bought a ticket to ETH Summit. Schedule a meetup?"
- Event organizers can schedule meetings with top referral crews

**Automation Hooks:**
- Auto-share: When crew admin enables an event, auto-post to crew chat with referral link
- Auto-engage: Bot messages crew about upcoming events with referral opportunity
- Commission alerts: Real-time notification when commission earned
- Milestone celebrations: "Your crew just hit $500 in total earnings!"

### Payout Methods

| Method | Min Payout | Speed | Fee |
|--------|-----------|-------|-----|
| **USDC on Base** | $5 | Instant | Gas (~$0.01) |
| **Points conversion** | $0 | Instant | 0% (1 point = $0.01) |
| **Stripe** | $25 | 2-3 days | 2.9% + $0.30 |
| **Credit to FlowB.biz** | $0 | Instant | 0% (apply to subscription) |

### Event Organizer Side

Organizers set up referral programs for their events:
```
POST /api/v1/referral/programs
{
  "event_id": "luma_abc123",
  "commission_rate": 0.10,          // 10%
  "max_commission_per_ticket": 10,  // cap at $10/ticket
  "max_total_payout": 500           // cap at $500 total
}
```

Benefits for organizers:
- **Distribution**: Crews become promotional channels
- **Tracking**: See which crews/users drive the most sales
- **Cost-effective**: Only pay on actual sales (no upfront ad spend)
- **Social proof**: More crew engagement = more visibility in FlowB feeds

**Deliverable**: Crew-level referral system where any engagement with an event earns commission splits on ticket sales. Trackable links, real-time earnings, multiple payout methods.

---

## Phase 5: AI Automation Services (was Phase 4)
**Status**: `pending`
**Goal**: Package FlowB's AI capabilities as automation services that run in the background, keeping users productive without manual effort.

### Automation Types

**Meeting Automations:**
- Auto-schedule: "Every Monday, schedule a standup with my crew"
- Auto-brief: Generate briefing notes 1 hour before every meeting
- Auto-follow-up: Draft follow-up email/message after meeting completion
- Auto-reschedule: If meeting conflicts detected, suggest alternatives
- Smart reminders: Context-aware reminders ("Sarah mentioned she's free Thursdays")

**Contact Automations:**
- Auto-enrich: When new contact added, pull public profile data
- Birthday/anniversary reminders
- Re-engagement: "You haven't talked to [contact] in 30 days"
- Introduction suggestions: "Sarah and Mike both work in DeFi, suggest intro?"
- Follow-up nudges after events: "You met 5 people yesterday, want to connect?"

**Lead-to-Meeting Automations:**
- Auto-convert: When lead hits "Qualified" stage -> suggest scheduling a meeting
- Meeting link auto-send: When meeting created from lead -> share link to lead's preferred channel
- Post-meeting pipeline advance: Meeting complete -> auto-move lead to "Proposal"
- Stale lead alert: "Lead [name] qualified 5 days ago but no meeting scheduled"
- Meeting prep from lead: Auto-generate briefing using lead's full activity history

**Business Automations:**
- Lead scoring: AI assigns score based on engagement signals
- Pipeline alerts: "3 deals stuck in 'proposal' for >7 days"
- Task auto-creation: Meeting action items -> kanban tasks
- Report generation: Weekly business summary (meetings held, deals progressed, tasks completed)
- Social listening: Monitor mentions, notify on relevant conversations

**Referral Automations:**
- Auto-share: When referral program activates for an event, auto-post to relevant crews with link
- Commission notification: Real-time alert when ticket sold via your engagement
- Weekly earnings digest: "Your crews earned $X this week across Y events"
- Crew opportunity alerts: "New event with 10% commission -- matches your crew's interests"
- Milestone celebrations: Bot posts to crew chat when collective earnings hit milestones

**Event Automations:**
- Smart RSVP: AI suggests events based on interests + contacts attending
- Post-event networking: Suggest connections with co-attendees
- Event prep: Compile info about speakers/attendees before you go

### Automation Architecture
```
Trigger (event/time/condition)
  |
  v
Evaluation (OpenClaw agent)
  |
  v
Action (create meeting / send message / update lead / create task)
  |
  v
Notification (inform user of what was done)
  |
  v
Feedback (user can approve, modify, or disable)
```

### User Controls
- Enable/disable per automation
- Approval mode: auto-execute vs ask-first
- Frequency caps (max 5 auto-suggestions/day)
- Quiet hours respected
- "Why did this happen?" explainability

**Deliverable**: AI agents working in the background, surfacing suggestions and taking actions. Users feel like they have a personal assistant.

---

## Phase 6: FlowB.biz - Business Tier
**Status**: `pending`
**Goal**: Package the business features into a cohesive product tier with its own identity, pricing, and value proposition.

### FlowB.biz Feature Set
| Feature | Free (FlowB) | Pro (FlowB.biz) |
|---------|-------------|-----------------|
| Events & schedule | Unlimited | Unlimited |
| Friends & crews | Unlimited | Unlimited |
| Points & leaderboards | Yes | Yes |
| AI chat | 10 queries/day | Unlimited |
| Meetings | 3/month | Unlimited |
| Meeting briefings | No | AI-generated |
| Meeting follow-ups | No | AI-drafted |
| Contact enrichment | Basic | Full (AI + public data) |
| CRM / leads pipeline | No | Yes |
| Kanban boards | 1 personal | Unlimited + team |
| Automations | 2 active | Unlimited |
| Referral commissions | Earn commissions | Earn + create referral programs |
| Referral analytics | Basic (my earnings) | Full (crew performance, conversion funnels) |
| Referral payouts | Points conversion only | USDC, Stripe, FlowB.biz credit |
| Team members | -- | Up to 10 (Pro) / 50 (Business) |
| Analytics & reports | Basic | Full dashboard |
| API access | No | Yes |
| Priority support | No | Yes |
| Custom branding | No | Yes (Business tier) |

### Pricing (Draft)
- **FlowB Free**: $0 - Personal use, social features, limited AI
- **FlowB.biz Pro**: $19/mo - Solo professionals, unlimited AI + CRM
- **FlowB.biz Team**: $49/mo - Teams up to 10, shared boards + pipelines
- **FlowB.biz Business**: $149/mo - Teams up to 50, API, custom branding, analytics

### Payment Integration
- Stripe for subscriptions (card + crypto)
- x402 for micropayments (agent skills, event boosts)
- In-app purchase (iOS/Android) for Pro upgrade
- Annual discount (2 months free)

### Domain & Routing
- `biz.flowb.me` -> Business landing page + login + web dashboard (kanban, CRM, meetings, analytics)
- `flowb.me` -> Personal/social tier (events, crews, friends, points)
- Mobile app: mode toggle in profile (personal <-> business)
- Shared auth: same account works on both surfaces
- Same Netlify DNS zone (`6990f5f30daa0fd5f0996c82`), new site for `biz.flowb.me`

**Deliverable**: Complete business tier with clear value prop, pricing, and seamless upgrade path.

---

## Phase 7: Polished Mobile App Build
**Status**: `pending`
**Goal**: Execute the Phase 2 design into a production-ready iOS + Android app. Ship to TestFlight and Play Store internal testing.

### Build Priorities
1. Splash + onboarding flow (new intro carousel)
2. Auth screen redesign (Privy + multi-method)
3. Home screen (personal + business modes)
4. Meeting screens (list, detail, create)
5. Enhanced contact screens
6. AI assistant upgrades (meeting-aware)
7. Business dashboard (FlowB.biz mode)
8. Settings & integrations screen
9. Push notifications (meeting reminders, AI suggestions)
10. Deep linking (flowb://meeting/123, flowb://contact/sarah)

### Platform-Specific
- **iOS**: TestFlight via EAS, ASC submission prep
- **Android**: Internal testing track via EAS
- **Both**: Universal links, push notifications, biometric auth

### Performance Targets
- Cold start: <2s
- Screen transitions: <300ms
- Meeting creation: <5s (AI enrichment in background)
- Offline: cached meetings + contacts viewable offline
- Bundle: <15MB initial download

**Deliverable**: Production app on TestFlight + Play Store internal. Meeting-centric, business-ready.

---

## Phase 8: Backend + API for Business Features
**Status**: `pending`
**Goal**: Build the server-side infrastructure powering meetings, automations, and business tier.

### New Plugins
1. **MeetingPlugin** (`src/plugins/meeting/index.ts`)
   - All meeting CRUD + AI operations
   - Shared link generation + resolution (`flowb.me/m/{code}`)
   - Meeting chat room management (create, message, history)
   - Lead-to-meeting conversion with context transfer
   - Calendar integration (Google Calendar API, Apple Calendar)
   - Video link generation (Google Meet / custom)
   - iCal export for universal calendar sync

2. **AutomationPlugin** (`src/plugins/automation/index.ts`)
   - Rule engine for triggers/conditions/actions
   - Cron scheduler for recurring automations
   - Lead pipeline automations (stage transitions, meeting triggers)
   - Execution log and user notification

3. **ReferralPlugin** (`src/plugins/referral/index.ts`)
   - Referral program CRUD (event organizers create programs)
   - Engagement tracking (log every event interaction with user + crew attribution)
   - Link generation + click tracking (`flowb.me/e/{code}`, `/t/{code}`)
   - Commission calculation (weighted split across engaged crew members)
   - Payout processing (USDC, Stripe, points conversion)
   - Luma webhook handler (ticket sale → commission creation)
   - Crew earnings dashboard data

4. **BillingPlugin** (`src/plugins/billing/index.ts`)
   - Stripe integration (subscriptions + one-time)
   - Tier enforcement (rate limits, feature gates)
   - Usage tracking

### New API Routes
```
-- Meetings
GET    /api/v1/meetings                    List user's meetings
POST   /api/v1/meetings                    Create meeting (accepts natural language)
POST   /api/v1/meetings/from-lead/:leadId  Convert lead to meeting (context carried over)
GET    /api/v1/meetings/:id                Meeting detail with attendees
PATCH  /api/v1/meetings/:id                Update meeting
DELETE /api/v1/meetings/:id                Cancel meeting
POST   /api/v1/meetings/:id/invite         Send/resend invites (includes shared link)
POST   /api/v1/meetings/:id/complete       Mark complete + prompt notes + advance lead
POST   /api/v1/meetings/:id/follow-up      Generate + send follow-up
GET    /api/v1/meetings/:id/notes          Meeting notes
POST   /api/v1/meetings/:id/notes          Add note
POST   /api/v1/meetings/suggest            AI meeting suggestions
POST   /api/v1/meetings/find-time          Find optimal meeting time

-- Meeting Chat
GET    /api/v1/meetings/:id/messages       Chat history
POST   /api/v1/meetings/:id/messages       Send message to meeting chat
GET    /api/v1/meetings/:id/messages/since/:ts  New messages since timestamp (polling)

-- Meeting Shared Links (public - minimal auth)
GET    /api/v1/m/:code                     Resolve meeting link (public view)
POST   /api/v1/m/:code/rsvp               RSVP via shared link (guest or authenticated)
GET    /api/v1/m/:code/ical                Download iCal file

-- Leads (extended)
POST   /api/v1/leads                       Create lead
PATCH  /api/v1/leads/:id                   Update lead (stage change triggers automations)
POST   /api/v1/leads/:id/schedule-meeting  Quick-schedule meeting from lead
GET    /api/v1/leads/:id/timeline          Full activity timeline (meetings, messages, tasks)
GET    /api/v1/leads/pipeline              Pipeline view (grouped by stage with counts)

-- Automations
GET    /api/v1/automations                 List user's automations
POST   /api/v1/automations                 Create automation rule
PATCH  /api/v1/automations/:id             Update rule
DELETE /api/v1/automations/:id             Delete rule
GET    /api/v1/automations/:id/log         Execution history
POST   /api/v1/automations/:id/toggle      Enable/disable

-- Referral & Commissions
POST   /api/v1/referral/programs              Create referral program for event (organizer)
GET    /api/v1/referral/programs/:eventId     Get program details
PATCH  /api/v1/referral/programs/:id          Update program (rate, caps)

GET    /api/v1/referral/links/:eventId        Get/create referral link for event (auto per user+crew)
GET    /api/v1/e/:code                        Resolve event referral link (public, tracks click)
GET    /api/v1/t/:code                        Resolve ticket referral link (public, redirects to source)

POST   /api/v1/webhooks/luma/ticket           Luma webhook: ticket purchased
POST   /api/v1/webhooks/eventbrite/ticket     Eventbrite webhook: ticket purchased

GET    /api/v1/referral/earnings              My total earnings + pending
GET    /api/v1/referral/earnings/crew/:crewId Crew earnings breakdown
GET    /api/v1/referral/commissions           My commission history
GET    /api/v1/referral/engagement/:eventId   Who engaged with event + weights

POST   /api/v1/referral/payouts              Request payout (USDC/Stripe/points)
GET    /api/v1/referral/payouts              Payout history

-- Billing
GET    /api/v1/billing/subscription        Current plan
POST   /api/v1/billing/checkout            Create Stripe checkout session
POST   /api/v1/billing/portal              Stripe customer portal
GET    /api/v1/billing/usage               Usage stats vs limits
```

**Deliverable**: Complete backend powering meetings, referral commissions, automations, and subscription billing.

---

## Cross-Platform Biz Integration (Spans All Phases)
**Status**: `pending`
**Goal**: Every biz feature works across every platform the user is on. Priority routing ensures urgent messages always reach users. Each platform does what it's best at.

### Priority Message System

Three tiers replace the current flat notification model:

| Tier | Delivery | Quiet Hours | Rate Limit | Examples |
|------|----------|-------------|------------|---------|
| **P0** | All channels, instant | Bypasses (not DND) | Bypasses | Meeting in 5 min, lead replied, commission earned, payment failed |
| **P1** | Primary channel only | Blocked | Biz budget (15/day) | Meeting invite, lead stage change, follow-up due, task assigned |
| **P2** | Batched digest | N/A | N/A | Weekly earnings, AI suggestions, crew activity, pipeline summary |

### Per-Platform Role

| Platform | Role in Biz Mode | Key Actions |
|----------|-----------------|-------------|
| **Telegram** | Quick commands + chat bridge | /meet, /leads, /earnings, inline RSVP, reply-to-chat |
| **Farcaster** | Social proof + identity | Cast-based triggers, DC relay, Frames for invites/earnings |
| **WhatsApp** | Business contacts bridge | Template invites, reply-to-chat, outbound follow-ups |
| **Signal** | Privacy-focused alternative | Same bridge as WA via Signal REST API |
| **Email** | Digest channel + universal fallback | Daily biz digest, iCal attachments, reply-to-chat parsing |
| **Web (biz.flowb.me)** | Command center for deep work | Full dashboard, always-visible chat panel, keyboard shortcuts |
| **Mobile App** | Always-with-you assistant | Push tiers, deep links, offline cache, lock-screen actions |

### Notification Service Upgrade (`sendToUser()` → `sendBizMessage()`)

```typescript
interface BizMessage {
  userId: string;
  content: string;
  priority: 'p0' | 'p1' | 'p2';
  type: string;           // meeting_invite, lead_reply, commission_earned, etc.
  isBiz: boolean;
  context?: {             // for chat bridging
    chatType: 'meeting' | 'lead' | 'crew';
    chatId: string;
  };
  deepLink?: string;      // flowb://meeting/123
  actions?: Array<{       // actionable notifications
    label: string;
    callback: string;     // callback_query data for TG, URL for others
  }>;
  metadata?: Record<string, any>;
}
```

**Fallback chain**: TG → Mobile Push → WhatsApp → Signal → FC DC → Email
**P0 override**: sends to ALL connected platforms simultaneously
**P2 bypass**: queues to `flowb_digest_queue` instead of sending

### Chat Bridge Pattern (Unified)

Every chat context follows one pattern:
```
Supabase table (flowb_{context}_messages)
  → Realtime → Web + Mobile (native)
  → Bridge service → TG bot (DM relay)
  → Bridge service → WhatsApp (template + reply)
  → Bridge service → Signal (API relay)
  → Bridge service → FC (DC relay)
  → Digest service → Email (batch + reply-to parsing)
```

User's "active chat context" tracked per platform so replies route correctly.

### Database Changes
- `flowb_sessions`: add `biz_mode_enabled`, `primary_biz_channel`, `biz_quiet_hours_*`, `dnd_enabled`, `digest_frequency`, `connected_platforms`
- `flowb_notification_log`: add `priority`, `platform`, `delivery_status`, `is_biz`
- New table: `flowb_digest_queue` for P2 message batching

### Implementation Touches Each Phase
- **Phase 1**: Meeting invites + chat use priority routing
- **Phase 4**: Commission alerts are P0
- **Phase 5**: Automations generate prioritized messages
- **Phase 6**: Biz tier unlocks full notification preferences
- **Phase 7**: Mobile app push tiers + deep links
- **Phase 8**: Notification service upgrade, digest queue, chat bridges
- **Phase 9**: All platforms connected and tested

**Full architecture documented in `findings.md` > "Cross-Platform Biz Mode Integration"**

---

## Phase 9: Deploy, Connect & Launch
**Status**: `pending`
**Goal**: Ship everything to production. Connect all the pieces. Launch publicly.

### Deployment Targets
- **flowb.fly.dev** - Updated backend with all new plugins
- **flowb.me** - Updated web app with meeting links
- **biz.flowb.me** - New business landing + web dashboard
- **Mobile app** - App Store + Play Store submission
- **docs.flowb.me** - Updated documentation

### Launch Checklist
- [ ] Supabase migrations run on production
- [ ] Meeting plugin deployed and tested
- [ ] Automation plugin deployed and tested
- [ ] Billing plugin deployed with Stripe
- [ ] iOS app submitted to App Store review
- [ ] Android app submitted to Play Store
- [ ] biz.flowb.me subdomain configured (Netlify)
- [ ] Landing page live with pricing
- [ ] Email sequences set up (welcome, onboarding, upgrade nudge)
- [ ] Admin alerts updated for business metrics
- [ ] OpenClaw marketplace updated with meeting skills
- [ ] MCP server updated with meeting tools
- [ ] TG bot updated with /meet command
- [ ] Analytics + monitoring in place

### Go-to-Market
- Product Hunt launch
- TikTok content: "I told my AI to schedule all my meetings"
- Twitter/Farcaster: Demo videos
- Direct outreach to EthDenver contacts
- Crew leaders as beta testers

**Deliverable**: FlowB Business Platform live. Mobile apps in stores. Business tier accepting subscriptions.

---

## Priority & Dependencies

```
Phase 1 (Meetings Engine)
  |
  v
Phase 2 (App Design) -----> Phase 3 (Contacts/CRM)
  |                              |
  v                              v
Phase 4 (Referral Engine) <--- [needs events + crews + engagement tracking]
  |
  v
Phase 5 (AI Automations) <--- [needs meetings + contacts + referrals]
  |
  v
Phase 6 (Business Tier) --- [needs automations + CRM + referral payouts]
  |
  v
Phase 7 (Mobile Build) ---- [implements Phase 2 design + all features]
  |
  v
Phase 8 (Backend Build) --- [can parallelize with Phase 7]
  |
  v
Phase 9 (Deploy & Launch)
```

**Parallelization opportunities:**
- Phase 4 (Referrals) can start alongside Phase 3 (CRM) -- both build on events/crews
- Phase 7 (Mobile) + Phase 8 (Backend) can run in parallel
- Phase 5 (Automations) can start once Phase 1 + 3 are done

## Decision Points

1. ~~**flowb.biz domain**~~: **DECIDED** -- using `biz.flowb.me` subdomain on existing Netlify DNS
2. **Calendar integration**: Google Calendar API (complex OAuth) vs simple iCal export?
3. **Video meetings**: Generate Google Meet links? Integrate Zoom? Or just link field?
4. **Stripe vs x402**: Subscriptions via Stripe, micropayments via x402? Or unified?
5. **App Store pricing**: Free app + IAP for Pro? Or separate FlowB.biz app?
6. **Contact import**: Deep phone integration (requires permissions) or manual/CSV only?
7. **Luma webhook access**: Does Luma support webhooks for ticket purchases? Or need API polling?
8. **Commission attribution window**: How long after a click does attribution last? (30 days recommended)
9. **Referral payout minimum**: $5 USDC? Or allow micro-payouts via points conversion?
10. **Crew vs individual referrals**: Always split across crew, or allow individual-only mode?

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |

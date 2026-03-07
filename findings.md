# Findings - FlowB Business Platform

## Current Codebase State (March 4, 2026)

### What Already Exists

**Mobile App** (`mobile/`)
- Expo SDK 54, React Native, Zustand, Reanimated
- 6 tabs: Home, Schedule, Chat, Crew, Points, Profile
- Glassmorphism design system with custom glass components
- Auth: username/password to flowb.fly.dev
- AI chat with OpenAI-compatible endpoint
- Dark theme, haptic feedback, pull-to-refresh everywhere
- Admin screens stubbed but not built out
- Bundle ID: `me.flowb.app`, EAS configured

**Contact System** (`flowb_connections`)
- Friends with status: pending/active/muted/blocked
- Contact sharing: email, twitter, TG, FC, phone, website, linkedin
- Notes and tags per connection
- Met-at-event tracking
- User profiles with bio, role, tags (migration 020)

**Schedule System** (`flowb_event_attendance`)
- RSVP: going/maybe/watched
- Check-in tracking
- Personal schedule view in mobile + miniapps

**Points System** (60+ actions)
- Daily caps, streaks, milestones, levels
- Crew leaderboards with sponsor boost (10x)
- 6 badge levels: Explorer -> Legend

**Agents Marketplace** (10 slots)
- x402 micropayments, 6 seed skills
- Wallet per agent (USDC on Base)
- Transaction tracking

**SocialB** (Auto-repost engine)
- Free/Pro tier with daily limits
- Neynar webhook -> Postiz multi-platform
- Org + team member management

**Notification System**
- Cross-platform: TG DM -> FC push -> Email
- Admin alerts with daily KPIs
- Quiet hours, rate limits, dedup

---

### What Does NOT Exist Yet

**Meetings**: Zero meeting scheduling or management. Only virtual event URLs from Luma.

**Calendar Integration**: No Google Calendar, Apple Calendar, or iCal connections.

**Business Tier (biz.flowb.me)**: No domain configured, no business-specific features, no pricing/billing.

**Stripe/Billing**: No subscription management. Only x402 micropayments for agents.

**Automations Engine**: No trigger/action rules. No cron-based automation. OpenClaw agents exist but no autonomous background automation.

**CRM Pipeline**: Kanban migration exists (023) with `flowb_leads` table, but no API routes or UI for lead management.

**Contact Enrichment**: Basic contact sharing exists, but no AI enrichment or public data pulling.

---

## Technology Research

### Meeting Scheduling Approaches

**Option A: Built-in scheduler (Recommended for MVP)**
- FlowB owns the meeting lifecycle
- Simple time picker + AI suggestions
- Invite via existing notification channels (TG, FC, email)
- No OAuth complexity
- iCal export for calendar sync

**Option B: Google Calendar integration**
- Full OAuth2 flow for Google Calendar
- Read/write events directly
- Complex but powerful for business users
- Requires App Store review for calendar permissions

**Option C: Calendly-style booking links**
- Each user gets a flowb.me/meet/koH link
- Availability windows managed in FlowB
- External people can book without FlowB account
- Great for business use case

**Recommendation**: Start with A + C. Built-in scheduler with booking links. Add Google Cal in Phase 7 as optional integration.

### Mobile App Architecture

**Current**: Single-mode (EthDenver-focused), 6 tabs
**Target**: Dual-mode (personal/business), 5 tabs with mode-aware content

**Key Changes**:
- Splash -> Intro carousel -> Auth (new flow)
- Replace EthDenver-specific content with general-purpose
- Add mode toggle (personal/biz) in profile
- Meeting screens are new
- Home screen becomes context-aware dashboard
- Schedule tab evolves into "Flow" (meetings + events + contacts)

**Auth Upgrade**: Current is username/password. Need Privy (wallet + social), TG login, FC login.

### Pricing Research

**Comparable Products**:
| Product | Free | Pro | Team |
|---------|------|-----|------|
| Calendly | 1 event type | $10/mo | $16/mo/seat |
| Motion (AI calendar) | -- | $19/mo | $12/mo/seat |
| Monday.com | 2 seats | $9/mo/seat | $12/mo/seat |
| Notion | Personal | $8/mo | $15/mo/seat |
| HubSpot CRM | Free CRM | $20/mo | $100/mo |

**FlowB positioning**: Cheaper than Motion/HubSpot, more AI-native, crypto-friendly (x402 + Stripe hybrid).

---

## Business Model Canvas

### Value Proposition
- **Personal**: "Your AI-powered social companion" -- events, friends, crews, points
- **Business**: "Your AI business assistant" -- meetings, contacts, CRM, automations
- **Unique**: Crypto-native (agents, x402), multi-platform (TG/FC/Web/Mobile), AI-first

### Revenue Streams
1. **Subscriptions** (FlowB.biz Pro/Team/Business): $19-149/mo
2. **Micropayments** (x402): agent skills, event boosts, tips
3. **Sponsorships** (USDC): event/venue promotion
4. **In-App Purchase**: iOS/Android Pro upgrade
5. **API Access**: Business tier includes API

### Key Metrics to Track
- Monthly Active Users (MAU)
- Meetings scheduled / completed
- Contact connections made
- Automation actions executed
- Free -> Pro conversion rate
- Monthly Recurring Revenue (MRR)
- Churn rate

---

## OpenClaw Integration Points

### New Meeting Skills for Agent Marketplace
| Skill | Price | Description |
|-------|-------|-------------|
| meeting-scheduler | $0.10 | AI schedules meeting with contact |
| meeting-briefer | $0.05 | AI generates pre-meeting briefing |
| meeting-follow-up | $0.05 | AI drafts follow-up message |
| contact-enricher | $0.05 | AI enriches contact profile |
| lead-scorer | $0.10 | AI scores lead based on signals |

### OpenClaw Commands
```
"Schedule a meeting with Sarah about partnerships"
"What meetings do I have this week?"
"Prepare me for my meeting with Investor X"
"Follow up on yesterday's meetings"
"Who should I meet at the conference?"
"Add this person as a lead"
"What's my pipeline looking like?"
"Convert this lead to a meeting"
"Send Sarah the meeting link"
"What's happening in the meeting chat?"
```

---

## Leads-to-Meetings Architecture

### The Flow
Leads are the top of the funnel. Meetings are where deals happen. The shared link is the bridge.

```
Lead Created
  |  (AI enriches: pulls public profile, scores)
  v
Lead Qualified
  |  (AI suggests: "Schedule a discovery call?")
  v
"Schedule Meeting" (one tap)
  |  Context auto-carried:
  |  - lead.name -> attendee.name
  |  - lead.email -> attendee.email
  |  - lead.company + lead.value -> meeting.description
  |  - lead.notes + lead.tags -> AI generates agenda
  |  - lead.source -> meeting.source = 'lead_conversion'
  v
Meeting Created + share_code generated
  |  flowb.me/m/{code} link created
  |  Chat room auto-created
  v
Link Shared (to lead via their preferred channel)
  |  Lead clicks -> sees meeting details -> RSVPs
  |  Both parties now in meeting chat
  v
Meeting Happens
  |  Chat captures notes/decisions/action items
  v
Meeting Complete
  |  Lead auto-advances: Meeting -> Proposal
  |  Action items -> kanban tasks (linked to lead)
  |  AI drafts follow-up message
  v
Follow-Up Sent
  |  Lead timeline: full record of everything
  v
Next Meeting (if needed) -- threaded from same lead
```

### Shared Link Design (`flowb.me/m/{code}`)

**Why a shared link matters:**
- Universal: works for TG users, FC users, email contacts, anyone
- No account required to view basics (reduces friction for leads)
- One URL = meeting hub: agenda, RSVP, chat, location, calendar add
- Shareable: attendee can forward to others ("bring your cofounder")
- Persistent: becomes the meeting's permanent record

**Link behavior by context:**
| Viewer | What they see |
|--------|--------------|
| No account | Title, time, location, organizer. CTA: "RSVP as guest" (name + email) |
| FlowB user (not invited) | Above + "Request to join" option |
| Invited attendee | Full view: agenda, briefing, chat, RSVP buttons, calendar download |
| Organizer | Everything + edit controls, attendee management, send reminders |

**Technical**: Short codes generated like existing flowb.me short links (`/f/{code}`, `/g/{code}`). Route added to web app + API for resolution.

### Meeting Chat Architecture

**Reuses crew chat pattern** (`flowb_group_messages`-style):
- Supabase Realtime subscription per meeting
- Messages persisted in `flowb_meeting_messages`
- Cross-platform delivery:
  - **In-app** (mobile + web): native chat UI in meeting detail screen
  - **Telegram**: If attendee is TG user, new messages forwarded as DMs
  - **Email**: Daily digest of unread meeting chat messages
  - **Farcaster**: DC notification for new messages

**Chat features:**
- Text messages between attendees
- System messages ("Sarah accepted the invite", "Meeting starts in 15 min")
- AI bot messages (briefing posted pre-meeting, follow-up posted post-meeting)
- Pin important messages (decisions, action items)
- File sharing (links, docs)
- Chat persists forever as meeting record

### Unified Chat Architecture Decision

**Decision**: One chat system powers ALL surfaces. No separate chat backends.

Every chat message (meeting, crew, lead conversation) goes into Supabase, and every surface subscribes via Realtime:
- Mobile app: native Supabase Realtime
- biz.flowb.me: same Realtime subscription (web)
- flowb.me: same (meeting link pages)
- Telegram: bot bridges messages bidirectionally
- Farcaster: Neynar DC integration
- Email: digest + reply-to parsing

**Key tables involved:**
- `flowb_meeting_messages` -- meeting chat
- `flowb_group_messages` -- crew chat (already exists)
- Future: `flowb_lead_messages` -- lead conversations from CRM

All three share the same pattern: `sender_id`, `content`, `created_at`, Supabase Realtime subscription by `meeting_id` / `group_id` / `lead_id`.

**biz.flowb.me gets an always-visible chat panel** on desktop -- messaging is first-class in the business dashboard, not a separate screen. You can message a lead, reply to a meeting chat, and ping your crew without navigating away.

### Existing Infrastructure to Reuse
| Need | Existing Asset | How to Reuse |
|------|---------------|--------------|
| Short links | `flowb.me/f/{code}` pattern | Same pattern: `flowb.me/m/{code}`, `/e/{code}`, `/t/{code}` |
| Chat | `flowb_group_messages` + crew chat | Same schema, scope to meeting_id |
| Contacts | `flowb_connections` + contact_info | Auto-populate meeting attendees |
| Notifications | Cross-platform notification service | Meeting reminders + chat messages + commission alerts |
| AI | OpenClaw + chat completions endpoint | Briefing generation, follow-up drafting |
| Realtime | Supabase Realtime (already used for events) | Subscribe to meeting + chat changes |
| Referral codes | `generateCode(8)` in points plugin | Reuse for referral link codes |
| Points ledger | `flowb_points_ledger.metadata` JSONB | Store commission data alongside points |
| Crew invites | `flowb_crew_invites` conversion tracking | Same pattern for referral click -> ticket conversion |

---

## Referral & Commission System Research

### Current Referral Foundation (Already Exists)
- **Referral codes**: 8-char alphanumeric per user in `flowb_user_points.referral_code`
- **Tracking**: `referred_by` field, points for `referral_click` (3pts) and `referral_signup` (10pts)
- **TG deep links**: `t.me/Flow_b_bot?start=ref_{code}` pattern
- **Points ledger**: `metadata` JSONB field ready for commission data
- **Code generation**: `generateCode(length)` in flow plugin, reusable

### What Needs to Be Built
- **Event-specific referral links**: `flowb.me/e/{code}?c={crewCode}` (crew-attributed)
- **Engagement tracking**: Log every event interaction with user + crew + weight
- **Ticket sale attribution**: Luma/Eventbrite webhook handlers
- **Commission calculation**: Weighted split across engaged crew members
- **Payout engine**: USDC on Base, Stripe, or points conversion
- **Crew earnings dashboard**: Performance analytics per crew per event

### Ticket Source Integration

**Luma** (Primary):
- Already have API access (`LUMA_API_KEY`)
- Guest list API returns attendees -- can poll for new tickets
- Ticket types with pricing available via API
- **Webhook**: Need to check if Luma supports sale webhooks (may need polling fallback)
- Event URLs: `lu.ma/{slug}` -- can append `?ref=` params

**Eventbrite** (Secondary):
- Have adapter in eGator (`sources/eventbrite.ts`)
- Eventbrite has robust webhook/API for ticket sales
- Affiliate tracking via URL params supported natively

**Other sources** (Partiful, Meetup, etc.):
- Most free events -- no ticket commission applicable
- Can still track engagement for points/leaderboard

### Engagement Attribution Model

**Crew-level attribution** is the differentiator:
- Traditional affiliate: 1 person shares link, 1 person gets commission
- FlowB model: entire crew that engaged with event gets weighted commission split
- Encourages organic promotion (RSVP, chat mentions, social shares all count)
- Low barrier: even viewing event details earns weight (small, but non-zero)

**Weight system** (1-5 scale):
| Weight | Actions |
|--------|---------|
| 5 | RSVP going, invite someone to event |
| 4 | Share event link, post about event on social |
| 3 | RSVP maybe, share in crew chat, mention in meeting chat, check in |
| 2 | Comment/react to event |
| 1 | View event details |

**Commission formula**: `user_amount = (user_weight / total_crew_weight) * commission_pool`

### Revenue Projection

Assuming 10% commission rate, $50 avg ticket:
| Scale | Monthly Tickets via Referral | Commission Pool | FlowB Take (10% of pool) |
|-------|------------------------------|-----------------|--------------------------|
| Early | 100 | $500 | $50 |
| Growth | 1,000 | $5,000 | $500 |
| Scale | 10,000 | $50,000 | $5,000 |

FlowB can take a platform fee (10-15% of commission pool) on top of the organizer's rate.

---

## Infrastructure Considerations

### OVH VPS (15.204.172.65) Role
- **n8n**: Could power automation workflows (meeting reminders, follow-ups)
- **Temporal**: Could handle long-running meeting workflows (schedule -> remind -> follow-up)
- **Signal API**: Another notification channel for meetings

### Supabase Realtime
- Meeting updates pushed in real-time (RSVP changes, note additions)
- Dashboard KPIs update live
- Activity feed for team boards

### Calendar Sync Architecture
```
FlowB Meeting Created
  |
  +-> iCal file generated (download/email)
  +-> Google Calendar API (if connected, Phase 7)
  +-> Apple Calendar (via iCal subscription URL)
  +-> TG reminder bot
  +-> FC notification
```

---

## Cross-Platform Biz Mode Integration

### Design Philosophy

FlowB Biz runs on **every platform the user already lives on**. Not a separate app -- a layer that rides on top of Telegram, Farcaster, WhatsApp, Signal, Email, the web dashboard, and the mobile app. The user never has to "go to FlowB" to do business. Business comes to them.

**Core principle**: Each platform does what it's best at. Quick responses on messaging apps. Deep work on web/mobile. Digests via email. The system routes the right message to the right platform at the right time.

### Priority Message System

Current notification system has NO priority levels. Every message is treated equally. This needs to change for biz mode.

**Three priority tiers:**

| Priority | Delivery | Override Quiet Hours? | Override Daily Limit? | Examples |
|----------|----------|----------------------|----------------------|---------|
| **P0: Urgent** | Instant, all connected channels | Yes (except DND) | Yes | Meeting starts in 5 min, lead replied, commission earned, payment failed |
| **P1: Important** | Instant, primary channel only | No | No (but separate biz limit) | New meeting invite, lead stage change, follow-up due, task assigned |
| **P2: Informational** | Batched into digest | No | No | Weekly earnings, crew activity, AI suggestions, pipeline summary |

**Biz messages get their own rate limit budget**:
- Current: 10 notifications/day/user (all types)
- New: 10 personal + 15 biz/day/user (separate budgets)
- P0 messages bypass rate limits entirely
- P2 messages don't count against limits (they're batched)

**Quiet hours evolution**:
- Current: 10pm-8am, blocks everything
- New: Quiet hours block P1 and P2
- P0 still delivers (meeting in 5 min doesn't wait until morning)
- New "DND" mode: blocks everything including P0 (user must explicitly enable)
- Biz users can set separate biz quiet hours (e.g., personal quiet at 10pm, biz quiet at 8pm)

### Platform Capability Matrix

Not every platform can do everything. This matrix defines what each surface handles:

| Capability | TG Bot | TG Mini App | FC | WhatsApp | Signal | Email | Web (biz.flowb.me) | Mobile App |
|-----------|--------|-------------|-----|----------|--------|-------|-------------------|------------|
| **Create meeting** | /meet command (quick) | Full form | Cast "meet @user" | Reply "meet" | -- | -- | Full form + AI | Full form + AI |
| **View meetings** | /meetings (list) | Full calendar | -- | -- | -- | Daily digest | Full calendar + detail | Full calendar + detail |
| **Meeting chat** | Bot bridges messages | Native chat UI | DC relay | Bot bridges | Bot bridges | Reply-to-digest | Native real-time panel | Native real-time |
| **RSVP** | Inline buttons | Tap in detail | Reply to cast | Reply yes/no | Reply yes/no | Click link in email | Click in meeting page | Tap in detail |
| **View leads** | /leads (top 5) | Full pipeline | -- | -- | -- | Weekly pipeline digest | Full CRM + kanban | Pipeline view |
| **Update lead** | /lead update (quick) | Full edit | -- | -- | -- | -- | Full edit | Full edit |
| **Lead chat** | Bot bridges | Chat in detail | DC relay | Bot bridges | Bot bridges | Reply-to thread | Native panel | Native chat |
| **View earnings** | /earnings (summary) | Full dashboard | -- | -- | -- | Weekly digest | Full analytics | Earnings screen |
| **Create task** | /task (quick) | Full board | -- | -- | -- | -- | Full kanban | Task creation |
| **AI assistant** | Natural language in chat | Full AI screen | -- | -- | -- | -- | AI sidebar | Full AI screen |
| **Notifications** | DM from bot | In-app badges | Cast/DC push | Message | Message | Email | Browser push + in-app | Push notification |
| **Priority routing** | P0 + P1 | All | P1 (if primary) | P0 + P1 | P0 + P1 | P2 digest + P0 | All | All |

### Per-Platform Biz Workflows

#### Telegram (Primary messaging channel)

**Already the strongest platform** -- has bot commands, inline keyboards, mini app. Biz mode adds:

**Quick commands (in bot DM):**
```
/meet sarah tomorrow coffee          → Creates meeting, sends invite
/meet                                → Shows today's meetings
/leads                               → Pipeline summary (5 recent)
/lead add Sarah CEO at StartupX      → Quick lead creation
/lead update sarah qualified         → Move stage
/earnings                            → My commission summary
/task deploy new landing page        → Quick task creation
/biz                                 → Biz mode dashboard (mini app opens)
```

**Inline keyboard actions:**
- Meeting invite received → [Accept] [Decline] [Suggest Time] [View Details]
- Lead notification → [Open Lead] [Schedule Meeting] [Dismiss]
- Commission earned → [View Earnings] [Share to Crew]
- Follow-up due → [Send Now] [Snooze 1h] [View Meeting]

**Chat bridge (bidirectional):**
```
Meeting chat message arrives
  → Bot DMs user: "[Meeting: Coffee with Sarah] Sarah: Can we push to 3pm?"
  → User replies to the DM
  → Bot posts reply back to meeting chat
  → All other attendees see it on their platform
```

**Mini app deep links:**
- `t.me/Flow_b_bot?startapp=meeting_{id}` → Meeting detail
- `t.me/Flow_b_bot?startapp=lead_{id}` → Lead detail
- `t.me/Flow_b_bot?startapp=biz` → Full biz dashboard
- `t.me/Flow_b_bot?startapp=earnings` → Earnings dashboard

**Group chat intelligence (existing + biz layer):**
- Bot detects event mentions in crew chat → logs engagement for referral tracking
- Bot detects meeting discussion → suggests creating a meeting
- Bot detects lead name → pulls context: "Sarah is at stage: Qualified, last meeting: 3 days ago"

#### Farcaster (Social + professional identity)

**FC is about public presence and social proof.** Biz mode leverages this:

**Cast-based actions:**
- Cast mentioning @flowb with "meet" → triggers meeting creation DM flow
- Cast about an event → auto-tracked for referral engagement
- Cast tagging a contact → logged in interaction timeline

**DC (Direct Cast) integration:**
- P1 meeting invites sent via DC
- Meeting chat relayed through DC (FC user ↔ meeting chat)
- Lead notifications for FC-primary users
- Follow-up drafts sent via DC for approval

**Frame-based interactions:**
- Meeting invite Frame: shows meeting details, RSVP buttons inline
- Earnings Frame: shows your crew's earnings, share to feed
- Event referral Frame: shows event + "Get Tickets" CTA with tracking

**Farcaster-specific value:**
- Profile data → contact enrichment (bio, followers, channels)
- Mutual followers → relationship strength signal
- Channel membership → interest tagging for leads
- Social graph → "Who should I meet?" suggestions

#### WhatsApp (Business communication standard)

**Many business contacts prefer WhatsApp.** FlowB bridges this:

**Bot number registration:**
- FlowB WhatsApp Business account (via Twilio/Meta Cloud API)
- Users add FlowB number → linked to their account
- Messages bridged to meeting/lead chats

**Inbound message routing:**
```
WhatsApp message from known contact
  → Match phone to flowb_connections.contact_info.phone
  → Route to most relevant context:
     Active meeting? → Meeting chat
     Open lead? → Lead conversation
     General? → AI assistant response
```

**Outbound messages:**
- Meeting invites: "Hi Sarah, koH would like to meet about partnerships. Details: flowb.me/m/abc123"
- Reminders: "Meeting with koH in 15 min. Location: Blue Moon Cafe"
- Follow-ups: AI-drafted message sent for user approval first
- Commission alerts (P0): "You earned $5.50 from ETH Summit ticket sale!"

**Template messages (WhatsApp requirement):**
- `meeting_invite`: "{{name}} invited you to: {{title}} on {{date}}. Details: {{link}}"
- `meeting_reminder`: "Reminder: {{title}} starts in {{time}}. {{location}}"
- `follow_up`: "Following up on {{title}}: {{message}}"
- `commission_earned`: "Your crew earned {{amount}} from {{event}}!"

#### Signal (Privacy-focused alternative)

**For users who prefer Signal over WhatsApp:**

**Same bridge pattern as WhatsApp** but via Signal API (already on OVH VPS):
- Messages routed through `signal.koh.lol` Signal REST API
- P0 and P1 messages delivered
- Chat bridging for meeting/lead conversations
- No template requirements (Signal is more flexible)

**Signal-specific considerations:**
- No read receipts by default → don't track "seen"
- Disappearing messages → warn users that chat history may not persist
- Group creation possible → could create Signal groups for meetings
- End-to-end encrypted → FlowB can send but can't read Signal-to-Signal messages

#### Email (Universal fallback + digest channel)

**Email is the digest layer and the universal reach channel:**

**Priority-based email strategy:**
- **P0 (urgent)**: Immediate email with clear subject: "[URGENT] Meeting starts in 5 min: Coffee with Sarah"
- **P1 (important)**: Real-time email for email-primary users only. Others get it in digest.
- **P2 (informational)**: Batched into digest emails

**Digest emails (new):**
```
Subject: Your FlowB Biz Daily Digest - March 4

MEETINGS TODAY
- 10:00 AM: Coffee with Sarah (flowb.me/m/abc123)
  → Briefing: Sarah is CTO at XYZ, discussed DeFi partnerships at EthDenver
- 2:00 PM: Team standup (flowb.me/m/def456)

PIPELINE UPDATE
- 3 leads in "Meeting" stage
- 1 lead moved to "Proposal"
- Follow-up due: Mike (2 days overdue)

UNREAD MESSAGES
- Meeting "Coffee with Sarah": 2 new messages
- Lead "Mike from Protocol": 1 new message

EARNINGS THIS WEEK
- Crew DeFi Builders: $23.50 (5 tickets driven)
- Your share: $8.00

AI SUGGESTIONS
- "Schedule follow-up with Investor Group (last meeting: 5 days ago)"
- "New event with referral program: ETH Summit (10% commission)"
```

**Reply-to-email → chat message:**
```
User receives email digest with meeting chat messages
  → User hits "Reply" on their email client
  → Email arrives at reply+meeting_{id}@flowb.me (inbound parsing)
  → Message extracted, posted to meeting chat
  → All attendees see it on their platforms
```

**Email-specific features:**
- iCal attachments on meeting invites (one-click calendar add)
- HTML-formatted briefings (looks good in Gmail/Outlook)
- Unsubscribe per category (digest, meetings, leads, earnings)
- "Snooze" links that push reminders to a later time

#### Web Dashboard (biz.flowb.me) -- The Command Center

**Full-power interface for deep work:**

```
+--sidebar--+------------------main---------------------+--chat-panel--+
| Dashboard | [Today's Timeline]                        | Active Chats |
| Meetings  |   09:00 ● Coffee with Sarah               | [Sarah mtg]  |
| Leads     |   10:00 ● Team standup                    | [Mike lead]  |
| Boards    |   14:00 ● Investor call                   | [Crew DeFi]  |
| Contacts  |                                           |              |
| Referrals | [Pipeline Kanban]                         | Sarah: Can   |
| Analytics |   New(3) → Qualified(2) → Meeting(1)     | we push to   |
| Settings  |                                           | 3pm?         |
|           | [AI Sidebar - collapsed by default]        |              |
|           |   "What should I focus on today?"         | [Reply...]   |
+-----------+-------------------------------------------+--------------+
```

**Always-visible chat panel** (right side on desktop):
- Lists all active conversations: meeting chats, lead threads, crew messages
- Switch between conversations without leaving the page
- Compose messages that route to the right platform for each recipient
- Real-time via Supabase Realtime subscriptions
- Unread badges per conversation

**Browser push notifications:**
- P0 messages → browser notification even if tab is hidden
- P1 messages → in-app notification bar
- P2 messages → silent badge update

**Keyboard shortcuts for power users:**
- `Ctrl+M` → New meeting
- `Ctrl+L` → New lead
- `Ctrl+K` → Command palette (search everything)
- `Ctrl+/` → AI assistant
- `Ctrl+Shift+C` → Toggle chat panel

#### Mobile App -- The Always-With-You Assistant

**Same capabilities as web, optimized for mobile context:**

**Push notification tiers:**
- P0 → Push with sound, appears on lock screen, persistent
- P1 → Push with default sound, normal priority
- P2 → Badge count only, no push (view in-app digest)

**Notification actions (iOS/Android):**
- Meeting invite: [Accept] [Decline] (actionable from lock screen)
- Follow-up due: [Send] [Snooze]
- Commission earned: [View] [Share]
- Chat message: [Reply] (inline reply from notification)

**Deep linking:**
- `flowb://meeting/{id}` → Meeting detail
- `flowb://lead/{id}` → Lead detail
- `flowb://chat/{meeting_id}` → Meeting chat
- `flowb://earnings` → Earnings dashboard
- Push notifications carry deep links → tap goes directly to context

**Offline support:**
- Cached meetings + contacts viewable offline
- Queued messages sent when back online
- Local notification reminders even without network

### Message Routing Engine (Architecture)

The current `sendToUser()` function needs a major upgrade. New architecture:

```
Message Created (from any source: API, bot, automation, webhook)
  |
  v
Priority Classification
  |  Classify as P0 / P1 / P2 based on message type
  |
  v
User Preference Lookup
  |  Which platforms is this user on?
  |  What are their notification preferences?
  |  Are they in quiet hours? DND mode?
  |  Biz mode enabled?
  |
  v
Platform Selection (priority-aware)
  |
  |  P0 (urgent):
  |    → ALL connected platforms simultaneously
  |    → Bypass quiet hours (not DND)
  |    → Bypass daily limit
  |    → Email always included as paper trail
  |
  |  P1 (important):
  |    → Primary platform only (user's chosen default)
  |    → Fallback chain: TG → Mobile Push → WhatsApp → Signal → FC → Email
  |    → Respect quiet hours
  |    → Count against biz notification budget
  |
  |  P2 (informational):
  |    → Queue for next digest
  |    → No real-time delivery
  |    → Daily or weekly batch (user configurable)
  |
  v
Platform-Specific Formatting
  |  Each platform gets tailored content:
  |  - TG: Markdown + inline keyboards
  |  - FC: Cast/DC with Frame embed
  |  - WhatsApp: Template message with link
  |  - Signal: Plain text with link
  |  - Email: HTML formatted with iCal if meeting
  |  - Web: In-app notification + browser push
  |  - Mobile: Push notification with deep link + action buttons
  |
  v
Delivery + Logging
  |  Send via platform APIs
  |  Log to flowb_notification_log with priority + platform
  |  Track delivery status (sent, delivered, read where available)
  |
  v
Fallback on Failure
  |  If primary platform fails:
  |  → Try next in fallback chain
  |  → If all real-time fail: queue email
  |  → Log failure for monitoring
```

### Priority Classification Rules

| Message Type | Priority | Rationale |
|-------------|----------|-----------|
| Meeting starts in ≤15 min | P0 | Time-sensitive, can't wait |
| Meeting invite received | P1 | Important but not urgent |
| Meeting RSVP change | P1 | Affects your schedule |
| Meeting chat message | P1 | Active conversation |
| Meeting briefing ready | P1 | Prep for upcoming meeting |
| Follow-up due | P1 | Action needed |
| Lead replied | P0 | Hot lead, respond fast |
| Lead stage changed | P1 | Pipeline movement |
| New lead created (auto) | P2 | Can wait for digest |
| Commission earned | P0 | Positive reinforcement, immediate |
| Weekly earnings digest | P2 | Summary, not urgent |
| AI suggestion | P2 | Helpful but not time-sensitive |
| Crew member engaged event | P2 | Informational |
| Task assigned | P1 | Action needed |
| Task due today | P1 | Time-relevant |
| Payment failed | P0 | Requires immediate action |
| New referral program available | P2 | Opportunity, not urgent |

### Chat Bridge Architecture (Unified)

Every chat context (meeting, lead, crew) follows the same bridge pattern:

```
flowb_{context}_messages table (Supabase)
  |
  |-- Supabase Realtime → Web + Mobile (native clients)
  |
  |-- Bridge Service → Platform-specific relay:
       |
       |-- Telegram: Bot DMs with reply capture
       |     User replies to DM → bot.on("message:text")
       |     → Detect active chat context from session
       |     → Post back to flowb_{context}_messages
       |
       |-- Farcaster: DC relay
       |     New message → send DC via Neynar
       |     (Inbound: polling for DC replies, or webhook if available)
       |
       |-- WhatsApp: Template message + reply capture
       |     New message → send via WA Business API
       |     User replies → webhook → parse → post to chat
       |
       |-- Signal: Message relay via Signal REST API
       |     New message → send via signal.koh.lol
       |     User replies → webhook → parse → post to chat
       |
       |-- Email: Digest + reply-to parsing
       |     Batch unread messages into email
       |     User replies → inbound email parsing → post to chat
```

**Context tracking per platform:**
- Each user has an "active chat context" per platform
- TG: stored in session (`ctx.session.activeChat = { type: 'meeting', id: '...' }`)
- WhatsApp/Signal: last message thread determines context
- Email: reply-to address encodes context (`reply+meeting_abc123@flowb.me`)
- Web/Mobile: explicit -- user is looking at a specific chat

**Message dedup across platforms:**
- Same message doesn't get sent to user on TG AND WhatsApp
- Primary channel gets real-time, others get nothing (unless P0)
- User sets primary channel in preferences

### Database Changes for Priority System

```sql
-- Add priority support to notification preferences
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  biz_mode_enabled boolean DEFAULT false;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  biz_quiet_hours_start integer DEFAULT 20;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  biz_quiet_hours_end integer DEFAULT 8;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  biz_daily_notification_limit integer DEFAULT 15;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  primary_biz_channel text DEFAULT 'auto'; -- auto, telegram, whatsapp, signal, farcaster, email
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  dnd_enabled boolean DEFAULT false;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  digest_frequency text DEFAULT 'daily'; -- daily, weekly, off
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS
  connected_platforms text[] DEFAULT '{}'; -- ['telegram','farcaster','whatsapp','email']

-- Add priority to notification log
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS
  priority text DEFAULT 'p1'; -- p0, p1, p2
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS
  platform text; -- which platform was used for delivery
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS
  delivery_status text DEFAULT 'sent'; -- sent, delivered, read, failed
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS
  is_biz boolean DEFAULT false;

-- Digest queue table (for P2 messages)
CREATE TABLE IF NOT EXISTS flowb_digest_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  message_type text NOT NULL,        -- meeting_summary, pipeline_update, earnings, ai_suggestion
  content jsonb NOT NULL,            -- structured data for template rendering
  priority text DEFAULT 'p2',
  is_biz boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz               -- null until included in digest
);
```

### Implementation Priority for Notification Upgrade

1. **Add priority field to sendToUser()** -- classify every outgoing message
2. **Separate biz rate limit budget** -- don't let meeting reminders eat personal notification quota
3. **P0 bypass** -- urgent messages always deliver
4. **Platform preference** -- user chooses primary biz channel
5. **Digest queue** -- P2 messages batch instead of instant-send
6. **Email digest** -- first digest format (daily biz summary)
7. **Reply-to parsing** -- email replies flow back into chat
8. **WhatsApp bridge** -- template messages + reply capture
9. **Signal bridge** -- message relay via existing Signal API
10. **FC DC relay** -- DC notifications for FC-primary users

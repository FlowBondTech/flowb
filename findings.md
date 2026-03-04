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

**Business Tier (flowb.biz)**: No domain configured, no business-specific features, no pricing/billing.

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

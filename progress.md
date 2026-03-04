# Progress - FlowB Business Platform

## Overall Status: PLANNING

## Session: March 4, 2026

### Research Completed
- [x] Explored current mobile app architecture (Expo, 6 tabs, glassmorphism, auth)
- [x] Searched codebase for existing meeting/calendar/contact features
- [x] Mapped all business model elements (points, agents, sponsorships, SocialB, kanban)
- [x] Identified gaps: no meetings, no calendar integration, no billing, no business tier
- [x] Created comprehensive 9-phase plan
- [x] Documented findings and technology research
- [x] Mapped OpenClaw integration points for meetings
- [x] Researched existing referral/ticket/engagement tracking infrastructure
- [x] Designed crew-level referral commission system

### Key Decisions Made
- Meeting engine uses built-in scheduler + booking links (not Google Cal for MVP)
- Mobile app redesign: 5 tabs, dual-mode (personal/business)
- Auth upgrade: Privy + TG + FC login (replacing username/password)
- Pricing: Free / $19 Pro / $49 Team / $149 Business
- **Leads flow into meetings**: Lead pipeline has "Meeting" as a first-class stage with one-tap conversion
- **Shared meeting links**: Every meeting gets `flowb.me/m/{code}` -- universal hub for agenda, RSVP, chat
- **Meeting chat rooms**: Real-time chat per meeting, reusing crew chat infrastructure, cross-platform delivery
- **Guest access**: Non-FlowB users can view meeting basics + RSVP via shared link (no account required)
- **Crew-level referrals**: Any engagement with an event earns commission weight -- entire crew splits the pool
- **Engagement = revenue**: RSVP, share, chat mention, view, invite -- all count toward commission split
- **Multiple payout methods**: USDC on Base, Stripe, points conversion, FlowB.biz subscription credit
- **Auto-attributed links**: When crew members share events, referral codes are auto-appended

### Files Created/Modified
- `task_plan.md` - 9-phase plan with leads-to-meetings, shared links, chat rooms, referral commissions
- `findings.md` - Research, architecture, referral system design, revenue projections
- `progress.md` - This file

## Phase 1: Smart Meetings Engine
- [ ] Design meeting database schema (meetings, attendees, notes, messages)
- [ ] Create MeetingPlugin with all actions (including meeting-from-lead, meeting-chat)
- [ ] Shared link system: generate `flowb.me/m/{code}`, public resolution endpoint
- [ ] Meeting chat rooms: create on meeting creation, Supabase Realtime, cross-platform delivery
- [ ] Lead-to-meeting conversion: one-tap with full context transfer
- [ ] Add meeting API routes to Fastify (CRUD + chat + shared link + lead conversion)
- [ ] AI meeting creation (natural language -> meeting)
- [ ] Briefing note generation
- [ ] Follow-up drafting
- [ ] Invite sending with shared link via notification channels
- [ ] Guest access: lightweight RSVP for non-FlowB users via shared link
- [ ] OpenClaw meeting skills

## Phase 2: Mobile App Redesign
- [ ] Design new splash + intro carousel
- [ ] Redesign auth screen (Privy multi-method)
- [ ] New 5-tab navigation with mode toggle
- [ ] Home screen: personal + business variants
- [ ] Meeting screens (list, detail, create)
- [ ] Enhanced contact screens
- [ ] Design system refinements

## Phase 3: Contacts & CRM Evolution
- [ ] Contact enrichment (AI + public data)
- [ ] Interaction timeline (meetings, events, messages, stage changes)
- [ ] Contact groups and smart tagging
- [ ] Contact import (phone, CSV, vCard)
- [ ] Leads pipeline: New -> Contacted -> Qualified -> Meeting -> Proposal -> Won/Lost
- [ ] Lead-to-meeting conversion UI: one-tap from lead card
- [ ] Shared link sent to lead on meeting creation
- [ ] Post-meeting auto-advance lead stage
- [ ] Meeting action items -> kanban tasks linked to lead
- [ ] Full lead activity timeline (meetings, chats, tasks, follow-ups)
- [ ] Relationship strength scoring

## Phase 4: Referral & Ticket Commission Engine
- [ ] Design referral schema (programs, engagement, links, commissions, splits, payouts)
- [ ] Engagement tracking: log every event interaction with user + crew + weight
- [ ] Referral link generation: `flowb.me/e/{code}?c={crewCode}` per crew per event
- [ ] Click tracking + 30-day attribution window
- [ ] Auto-append referral codes when crew members share events
- [ ] Luma webhook handler (ticket purchase -> commission creation)
- [ ] Eventbrite webhook handler (ticket purchase -> commission creation)
- [ ] API polling fallback for ticket sale detection
- [ ] Commission calculation: weighted split across engaged crew members
- [ ] Crew earnings dashboard: events promoted, tickets driven, earnings breakdown
- [ ] Individual earnings view: my commissions, pending, available
- [ ] Payout processing: USDC on Base, Stripe, points conversion, FlowB.biz credit
- [ ] Points integration: new actions (referral_ticket_driven, commission_earned, crew_bonus)
- [ ] Crew leaderboard: add referral metrics (tickets driven, total earned)
- [ ] Notification flow: commission earned, weekly digest, milestone alerts
- [ ] Event organizer side: create referral program, set rates/caps, view performance

## Phase 5: AI Automation Services
- [ ] Automation rule engine (triggers/conditions/actions)
- [ ] Meeting automations (auto-brief, auto-follow-up)
- [ ] Contact automations (re-engagement, enrichment)
- [ ] Lead-to-meeting automations (auto-convert on qualify, auto-advance on complete)
- [ ] Referral automations (auto-share to crews, commission alerts, opportunity alerts)
- [ ] Business automations (lead scoring, reports)
- [ ] User controls and explainability

## Phase 6: FlowB.biz Business Tier
- [ ] Tier definitions and feature gates (including referral tier limits)
- [ ] Stripe integration (subscriptions)
- [ ] biz.flowb.me domain and landing page
- [ ] Business web dashboard
- [ ] In-app purchase integration (iOS/Android)
- [ ] Referral payout methods gated by tier (free: points only, pro: all methods)

## Phase 7: Polished Mobile App Build
- [ ] Implement splash + onboarding
- [ ] Auth screen with Privy
- [ ] Home screen (both modes)
- [ ] Meeting screens (list, detail, create, chat)
- [ ] Contact screens
- [ ] Referral dashboard screen (crew earnings, my earnings)
- [ ] AI assistant upgrades (meeting + referral aware)
- [ ] Push notifications
- [ ] Deep linking (flowb://meeting/123, flowb://referral/dashboard)
- [ ] TestFlight + Play Store internal

## Phase 8: Backend + API
- [ ] MeetingPlugin deployed
- [ ] ReferralPlugin deployed
- [ ] AutomationPlugin deployed
- [ ] BillingPlugin deployed
- [ ] Luma + Eventbrite webhook endpoints live
- [ ] Calendar integration (Google Cal)
- [ ] All new API routes live

## Phase 9: Deploy & Launch
- [ ] Production migrations
- [ ] All services deployed
- [ ] App Store submissions
- [ ] biz.flowb.me live
- [ ] Referral system live with pilot event organizers
- [ ] Go-to-market execution

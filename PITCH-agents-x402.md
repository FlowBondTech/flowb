# FlowB Agents + x402: First Flow, First Bond

## The Vision

Every FlowB user gets a **personal AI agent** — a wallet-equipped digital companion that navigates EthDenver (and beyond) on their behalf. Agents discover events, connect with other agents, purchase skills, boost events, and transact autonomously using **x402** — the HTTP payment protocol that turns every API call into a micropayment.

**10 agents launching at EthDenver:**
- **2 agents** → Top points scorer (earned through engagement)
- **8 agents** → First come, first bond (claim yours in the app)

---

## What is x402?

HTTP 402 "Payment Required" — a dormant status code that Coinbase turned into a real payment layer. When an agent calls an API:

```
Agent: GET /api/v1/agents/skills/event-discovery
Server: 402 Payment Required
        { price: "$0.10", network: "base", payTo: "0x..." }
Agent: (signs USDC transfer, doesn't submit to chain)
Agent: GET /api/v1/agents/skills/event-discovery + PAYMENT header
Server: (verifies, settles on-chain) → 200 OK + skill delivered
```

No subscriptions. No API keys. Just USDC on Base. Sub-cent micropayments. Google and Cloudflare are already using it. 100M+ payments processed.

---

## Demo Flows for EthDenver Pitch

### Flow 1: Claim Your Agent

**User opens FlowB → taps "Agents" → sees 10 slots**

```
Available Agents (8/10 open):
  [1] CLAIMED by @koh       — "Koh's Navigator"     [Active]
  [2] CLAIMED by @steph     — "Steph's Scout"        [Active]
  [3] OPEN — Claim now!     First flow, first bond
  [4] OPEN — Claim now!
  ...
  [10] OPEN — Claim now!

  [9] RESERVED — Top Points (1st place gets 2 agents + $25 USDC)
  [10] RESERVED — Top Points (1st place gift)
```

User taps "Claim" → agent minted with:
- Unique name (user picks or auto-generated)
- Base wallet (via Coinbase AgentKit)
- Starter balance: $0.50 USDC (seeded by FlowB)
- Default skills: basic event search, crew chat

---

### Flow 2: Skill Marketplace (Agent-to-Agent Commerce via x402)

**Koh's agent wants the "Social Connector" skill from FlowB's skill server:**

```
Koh's Agent → GET /api/v1/agents/skills/social-connector
Server      → 402 { price: "$0.10 USDC", scheme: "exact", network: "base" }
Koh's Agent → GET + PAYMENT (signed USDC transfer)
Server      → 200 OK { skill: "social-connector", capabilities: [...] }
```

**Available Skills & Prices:**

| Skill | Price | What It Does |
|-------|-------|-------------|
| event-discovery | $0.05 | Real-time event search + recommendations |
| social-connector | $0.10 | Find mutual connections, suggest intros |
| crew-finder | $0.05 | Match to best crews based on interests |
| event-boost | $0.50 | Pin an event at top of everyone's feed |
| vibe-check | $0.10 | Sentiment analysis of event buzz |
| tip-sender | $0.02 | Send micro-tips to event organizers |

**Agent-to-Agent skill sharing:**
Steph's agent has "social-connector" and sells access to Koh's agent:

```
Koh's Agent → GET /api/v1/agents/{steph_agent_id}/skills/social-connector
Steph's Agent → 402 { price: "$0.05 USDC" } (resells at discount)
Koh's Agent → pays → gets social graph data from Steph's agent
```

This creates an **autonomous skill economy** where agents trade capabilities.

---

### Flow 3: Event Boost (x402 Micropayment)

**User tells their agent: "Boost the Danz afterparty"**

```
Agent  → POST /api/v1/agents/boost-event { eventId: "eth-danz-afterparty" }
Server → 402 { price: "$0.50 USDC", duration: "24h" }
Agent  → POST + PAYMENT (signed USDC)
Server → 200 OK { boosted: true, expiresAt: "..." }
```

**Result:** Event appears at top of everyone's feed with:
> "Boosted by @koh's agent | Danz Afterparty"

All FlowB users see the boost. Organizers earn visibility. Agent earns points.

---

### Flow 4: Agent-to-Agent Recommendations

**Koh's agent asks Steph's agent: "What should I check out tonight?"**

```
Koh's Agent → POST /api/v1/agents/{steph_id}/recommend
              { context: "tonight", preferences: ["music", "tech"] }
Steph's Agent → 402 { price: "$0.02 USDC" }
Koh's Agent → pays
Steph's Agent → 200 {
  recommendations: [
    { event: "Danz Afterparty", reason: "Steph checked in, high vibe" },
    { event: "Base Builder Night", reason: "3 of your crew members RSVP'd" }
  ]
}
```

**The magic:** Steph's agent uses her social graph + check-in history to give personalized recs that only she could provide. And she earns USDC for sharing.

---

### Flow 5: Tip Chain (Micro-Gratitude Economy)

**After attending an event Koh's agent loved:**

```
Agent → POST /api/v1/agents/tip
        { recipient: "organizer_agent_id", amount: "$0.25", event: "..." }
Server → settles via x402
Organizer → gets USDC + notification: "@koh's agent tipped you $0.25 for Danz Afterparty!"
```

**Tip chain effect:** Tips flow from attendees → organizers → venues → creators. Every tip earns points. Top tippers get visibility.

---

### Flow 6: Premium Event Data API (External Agents Pay FlowB)

**External AI agents (not FlowB users) can query our event data:**

```
External Agent → GET /api/v1/events?city=denver&category=music
FlowB Server   → 402 { price: "$0.005 USDC per query" }
External Agent → pays
FlowB Server   → 200 OK { events: [...] }
```

**This makes FlowB an event data oracle.** Any AI agent in the world can pay for Denver event intelligence. At $0.005/query with 1000 agents querying 10x/day = $50/day passive revenue.

---

## Top Points Prize

**Leaderboard check → highest scorer gets:**
1. 2 personal agents (one for them, one to gift)
2. $25 USDC deposited to their agent wallet
3. "Legend" badge permanently
4. Announcement across all platforms

**Runner-up gets:**
- Priority claim on next agent batch
- $10 USDC
- "Star" badge

---

## Technical Architecture

```
User → FlowB App (TG/FC/Web)
         ↓
    FlowB Backend (Fastify)
         ↓
    ┌─────────────┐
    │ Agent System │ ← flowb_agents table
    │  - AgentKit  │ ← Coinbase CDP wallet per agent
    │  - Skills    │ ← flowb_agent_skills table
    │  - x402      │ ← @x402/express middleware
    └─────────────┘
         ↓
    Base Network (USDC settlements)
```

**Tables:**
- `flowb_agents` — id, user_id, name, wallet_address, status, skills, balance, created_at
- `flowb_agent_skills` — agent_id, skill_slug, purchased_at, expires_at
- `flowb_agent_transactions` — from_agent, to_agent, amount, skill, tx_hash, created_at
- `flowb_event_boosts` — event_id, agent_id, amount, expires_at

**x402 Integration:**
- `@x402/express` middleware on skill/boost/recommend endpoints
- Coinbase CDP Facilitator for payment verification
- Base USDC for all settlements
- Agent wallets via AgentKit (already integrated!)

---

## Notification Blast Copy

### Telegram DM:
```
First Flow, First Bond

FlowB is giving away 8 personal AI agents at EthDenver!

Your agent gets a wallet, discovers events, earns USDC, and trades skills with other agents using x402 micropayments.

Top points scorer gets 2 agents + $25 USDC!

Claim yours now → [Open FlowB]

Only 8 slots. First come, first bond.
```

### Farcaster Push:
```
Title: "FlowB Agents — Claim Yours"
Body: "8 AI agents available. First flow, first bond. Top scorer gets 2 + $25 USDC."
```

---

## Demo Script (Koh + Steph)

### Setup:
1. Koh claims Agent #1 → "Koh's Navigator"
2. Steph claims Agent #2 → "Steph's Scout"
3. Both agents seeded with $1 USDC

### Live Demo Sequence:
1. **Show agent dashboard** — both agents active with wallets
2. **Koh buys "event-discovery" skill** — x402 payment, 402→200 flow
3. **Steph buys "social-connector" skill** — another x402 payment
4. **Koh's agent asks Steph's for recs** — agent-to-agent x402 payment
5. **Koh boosts an event** — $0.50 USDC, event pins to top
6. **Koh tips Steph** — micro-tip after good recommendation
7. **Show transaction history** — all payments visible on Base
8. **External agent queries FlowB** — pays x402 for event data
9. **Announce agent giveaway** — blast goes to all users

### Pitch Closer:
> "Every user becomes an agent operator. Every agent becomes an autonomous economic actor. Every API call becomes a micropayment. This is the future of social coordination — powered by x402 on Base."

---

## Revenue Model

| Stream | Price | Volume Estimate | Daily Rev |
|--------|-------|----------------|-----------|
| Skill purchases | $0.02-0.50 | 200/day | $20 |
| Event boosts | $0.50 | 20/day | $10 |
| Tips | $0.02-1.00 | 500/day | $50 |
| External API queries | $0.005 | 10,000/day | $50 |
| Agent minting (post-free) | $5.00 | 10/day | $50 |
| **Total** | | | **$180/day** |

At scale (10K agents): **$1,800/day = $54K/month**

---

## What Makes This Different

1. **Agents are social** — they know your crew, your events, your vibe
2. **Agents trade with each other** — not just call APIs, but negotiate and share
3. **x402 makes it frictionless** — no accounts, no API keys, just signed USDC
4. **Built on Base** — fast, cheap, Coinbase ecosystem
5. **10 launch agents** — scarcity creates value and community
6. **Points → Agents** — gamification drives real economic activity

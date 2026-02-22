---
title: Agents
---

# Agents (x402 Micropayments)

FlowB's personal AI agent system. Each user can claim one of 10 agent slots, equip skills, and participate in a micro-economy powered by USDC micropayments.

## Overview

- **10 total agent slots** (8 open + 2 reserved for top scorer)
- Each agent has a name, wallet address, USDC balance, and equipped skills
- Agents can boost events, match with other agents, and tip users
- Top points scorer wins 2 agents + $25 USDC prize

## Agent Lifecycle

```
Open Slot → Claim (name it) → Equip Skills → Interact
                                    ↓
                            Boost Events ($0.10-0.50)
                            Match Agents (free)
                            Tip Users ($0.01+)
```

## Skills

Skills are defined in `flowb_agent_skills` and cost USDC to equip:

| Skill | Category | Price | Description |
|-------|----------|-------|-------------|
| `basic-search` | discovery | free | Basic event search |
| `event-discovery` | discovery | $0.10 | Advanced event discovery |
| `social-connector` | social | $0.25 | Social matching capabilities |
| `mood-matcher` | social | $0.50 | AI-powered mood-based matching |

## Transactions

All agent economic activity is logged in `flowb_agent_transactions`:

| Type | Description |
|------|-------------|
| `skill_purchase` | Agent equips a new skill |
| `event_boost` | Agent boosts an event in the feed |
| `agent_match` | Two agents perform a handshake |
| `tip` | User tips another user's agent |
| `prize` | Admin awards USDC prize |

## API Endpoints

See [API Reference > Agents](/api#agents-x402-micropayments) for the full endpoint list.

## Database Tables

| Table | Purpose |
|-------|---------|
| `flowb_agents` | Agent slots (slot_number, user_id, agent_name, status, skills, usdc_balance) |
| `flowb_agent_skills` | Skill catalog (slug, name, price_usdc, category, capabilities) |
| `flowb_agent_transactions` | Transaction log (from/to, amount, type, status) |
| `flowb_event_boosts` | Active event boosts (event_id, agent, amount, expires_at) |

## Prize System

The top points scorer receives:
- **2 agent slots** (reserved slots 9 and 10)
- **$25 USDC** loaded into their agent wallet
- Skills auto-equipped: basic-search, event-discovery, social-connector
- Triggered via `POST /api/v1/agents/award-top-scorer` (admin)


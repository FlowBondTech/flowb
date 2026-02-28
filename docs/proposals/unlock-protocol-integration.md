---
title: "Proposal: Unlock Protocol Integration"
status: draft
date: 2026-02-28
authors: koH
---

# Proposal: Unlock Protocol Integration

## Summary

Integrate [Unlock Protocol](https://unlock-protocol.com/) as the onchain membership, ticketing, and credential layer for FlowB and DANZ.Now. Unlock provides audited smart contracts (ERC-721) for time-bound memberships, event tickets, and soulbound badges -- deployable on Base with credit card + crypto payments out of the box.

This replaces the need for custom smart contracts, Stripe subscription plumbing in DANZ, and manual USDC payout workflows. It gives both platforms a shared onchain primitive that makes access rights portable, verifiable, and composable.

## Problem

FlowB and DANZ.Now currently operate parallel but disconnected systems:

| Capability | FlowB | DANZ.Now |
|-----------|-------|----------|
| Event attendance | `flowb_event_attendance` (Supabase rows) | `event_attendance` (separate Supabase) |
| Subscriptions | None | Stripe (scaffolded, not live) |
| Rewards | Points (gamification only) | XP + manual USDC payouts |
| Identity | `telegram_`, `farcaster_`, `web_` IDs | Privy accounts |
| Proof of attendance | Database row (not portable) | Database row (not portable) |

Problems this creates:

1. **No portability** -- A user's attendance history, crew membership, and reputation live in Supabase and die there. Nothing composes with the broader web3 ecosystem.
2. **Duplicate infrastructure** -- Both platforms build their own ticketing, attendance tracking, and reward systems independently.
3. **No monetization path for FlowB** -- The "no paywall" philosophy is correct, but there's no mechanism for optional premium tiers, paid crew access, or sponsor activations.
4. **DANZ subscription fragility** -- Stripe webhooks for a dance app is heavy infrastructure to maintain. The subscription tiers ($9.99/mo, $99/yr, Lifetime) are scaffolded but not live.
5. **Manual USDC payouts** -- DANZ's reward system creates `payout_claims` that require manual approval and off-chain transfers.

## Solution: Unlock Protocol as Shared Onchain Layer

### What Unlock Provides

Unlock Protocol deploys **Lock** contracts (ERC-721) that represent memberships with:

- **Time-bound access**: Configurable duration (1 day for events, 30 days for subscriptions, unlimited for lifetime)
- **Credit card + crypto payments**: Built-in checkout widget, no wallet required
- **Recurring subscriptions**: Onchain auto-renewal via pre-approval
- **Soulbound option**: Non-transferable NFTs for credentials and badges
- **Airdrop/grant**: Lock managers can mint NFTs to users at zero cost
- **Multi-chain**: Deployed on Base, Ethereum, Polygon, Arbitrum, and others
- **Referral fees**: Built-in mechanism for distribution partners to earn per-mint
- **Hooks**: Extensible via custom contract hooks on purchase, cancel, transfer

### How It Maps to FlowB + DANZ

```
Unlock Lock Contract (ERC-721 on Base)
            |
   +---------+---------+
   |                   |
FlowB checks          DANZ.Now checks
ownership via          ownership via
plugin + API           web app + API
   |                   |
Same NFT = same access on both platforms
```

## Integration Areas

### 1. Event Tickets

**Current state**: RSVPs are rows in `flowb_event_attendance` / DANZ `event_attendance`. Not verifiable, not portable.

**With Unlock**:

- Event organizer deploys a Lock per event (via FlowB admin or DANZ dashboard)
- Lock parameters: price (0 for free events), max supply, duration (event day), transferable or not
- Attendees mint a ticket NFT via Unlock Checkout (credit card or crypto)
- FlowB distributes tickets through Telegram bot, Farcaster mini app, and web
- DANZ distributes tickets through its own web app and bot
- Both platforms check the same Lock contract for access/attendance
- Checkin = onchain verification (not just a database update)
- Post-event, ticket NFT persists as proof-of-attendance collectible

**Database changes**:

```sql
-- Add to flowb_events or flowb_event_attendance
ALTER TABLE flowb_event_attendance
  ADD COLUMN lock_address TEXT,
  ADD COLUMN token_id INTEGER,
  ADD COLUMN chain_id INTEGER DEFAULT 8453; -- Base
```

**Revenue split** (configurable per event):

| Recipient | Share | Mechanism |
|-----------|-------|-----------|
| Event organizer | 85-95% | Lock owner receives payment |
| FlowB | 2.5-7.5% | Unlock referrer fee (on FlowB-sourced mints) |
| DANZ.Now | 2.5-7.5% | Unlock referrer fee (on DANZ-sourced mints) |

### 2. DANZ Subscriptions (Replace Stripe)

**Current state**: Three tiers scaffolded in `danz-backend-experimental` with Stripe integration. Not live.

**With Unlock**:

| Tier | Lock Config | Payment |
|------|-------------|---------|
| Monthly ($9.99) | Duration: 30 days, recurring: true | Credit card or USDC |
| Yearly ($99) | Duration: 365 days, recurring: true | Credit card or USDC |
| Lifetime Founder | Duration: unlimited, max supply: 100 | Credit card or USDC |

Benefits over Stripe:

- Membership NFT is verifiable by **both** danz.now and FlowB (no webhook sync needed)
- DANZ subscriber automatically gets premium features in FlowB (crew boosts, priority notifications)
- FlowB user who subscribes through the Telegram bot gets DANZ premium
- Recurring payments handled by the protocol, not webhook infrastructure
- Lifetime Founder NFT is tradeable on secondary markets (optional)
- Credit card still works -- Unlock Accounts handles fiat-to-onchain

**FlowB DANZ plugin change**: Replace Stripe subscription check with Unlock ownership check:

```typescript
// Before (Stripe)
const sub = await stripe.subscriptions.retrieve(user.stripe_sub_id);
const isActive = sub.status === 'active';

// After (Unlock)
const hasKey = await lockContract.getHasValidKey(user.walletAddress);
// or via Unlock API: GET /v2/api/lock/{address}/keys?owner={address}
```

### 3. Crew Memberships

**Current state**: Crews have join modes (open, approval, closed) with no paid option.

**With Unlock**:

- Crew creator can optionally deploy a Lock for their crew
- Join mode: `token_gated` -- must hold the membership NFT to be a member
- Creator sets price, duration, and max supply
- Revenue goes directly to the creator's wallet
- Use cases:
  - Free soulbound Lock for exclusive/vetted communities
  - Paid monthly Lock for premium crews (masterminds, VIP groups)
  - Sponsor-funded Lock where a brand buys bulk memberships for distribution

**Database changes**:

```sql
ALTER TABLE flowb_groups
  ADD COLUMN lock_address TEXT,
  ADD COLUMN lock_chain_id INTEGER;
```

**Crew join flow**:

```
User requests to join crew
  -> Crew has lock_address?
    -> Yes: Check if user holds valid key
      -> Has key: Auto-approve join
      -> No key: Redirect to Unlock Checkout -> mint -> auto-approve
    -> No: Existing flow (open/approval/closed)
```

### 4. Milestone Badges (Soulbound Credentials)

**Current state**: FlowB milestones (Explorer -> Legend) and DANZ XP levels are database values. Not portable.

**With Unlock**:

| FlowB Milestone | Lock Config |
|----------------|-------------|
| Explorer (0 pts) | Free, soulbound, airdropped on signup |
| Mover (50 pts) | Free, soulbound, airdropped on threshold |
| Groover (150 pts) | Free, soulbound, airdropped on threshold |
| Dancer (500 pts) | Free, soulbound, airdropped on threshold |
| Star (1000 pts) | Free, soulbound, airdropped on threshold |
| Legend (2500 pts) | Free, soulbound, airdropped on threshold |

| DANZ Achievement | Lock Config |
|-----------------|-------------|
| 100 Checkins | Free, soulbound |
| Challenge Master | Free, soulbound |
| Dance Style badges | Free, soulbound, per-style |

- FlowB backend calls `lock.grantKeys()` when user crosses threshold
- Badges are composable -- other protocols can gate access based on FlowB/DANZ badges
- A "Legend" badge from FlowB could unlock premium DANZ challenges
- A "100 Checkins" badge from DANZ could boost FlowB crew leaderboard rank

### 5. Sponsor Activations

**Current state**: `flowb_sponsorships` table exists but sponsor engagement is not verifiable.

**With Unlock**:

- Sponsor deploys a Lock for their activation (booth visit, workshop, side event)
- Attendees mint a sponsor NFT as proof of engagement
- Sponsor gets **verifiable engagement metrics** (onchain mint count, not self-reported)
- FlowB earns referral fee per mint
- Integration with points: minting a sponsor NFT = bonus FlowB points

```
Sponsor: "EthDenver Booth #42 Visit"
  Lock: free mint, max 500, soulbound, 1 per wallet
  FlowB: User says "/checkin sponsor ethdenver-42"
  Result: Mint NFT + award 25 FlowB points + sponsor gets verified lead
```

## Compatibility with x402 Micropayments

Unlock and x402 are complementary, not competing:

| | Unlock Protocol | x402 Micropayments |
|--|----------------|-------------------|
| **Model** | Access rights (hold/don't hold) | Per-call payments |
| **Duration** | Time-bound (days to forever) | Instant (per request) |
| **Question** | "Can you enter?" | "How much for this query?" |
| **Revenue** | Ticket/subscription sales | Usage-based API fees |
| **Settlement** | ERC-721 on Base | USDC on Base |

Example hybrid flow: A DANZ premium membership (Unlock, $9.99/mo) includes 1000 free FlowB API calls/month. After the cap, x402 kicks in at $0.001/call. Both settled onchain on Base.

## Technical Implementation

### New Plugin: `src/plugins/unlock/`

```
src/plugins/unlock/
  index.ts          # UnlockPlugin class (FlowB plugin interface)
  locks.ts          # Lock deployment + management helpers
  checkout.ts       # Checkout URL generation for web/mini apps
  verify.ts         # NFT ownership verification
  badges.ts         # Milestone badge airdrop logic
  types.ts          # Lock metadata, key status types
```

**Dependencies**:
- `@unlock-protocol/unlock-js` -- SDK for lock interactions
- `ethers` (already in project via AgentKit) -- contract calls
- Unlock HTTP API for read-only queries (no SDK needed)

### DANZ Plugin Upgrade: `src/plugins/danz/index.ts`

Changes to existing 1,164-line plugin:

1. **Remove**: USDC payout system (`link-wallet`, `claim-reward`, `reward-history` actions, `payout_claims` table)
2. **Remove**: Manual wallet linking flow
3. **Add**: Unlock subscription check (replace Stripe check)
4. **Add**: Event ticket minting via Unlock (replace Supabase-only attendance)
5. **Add**: Achievement badge airdrops on XP milestones

### Wallet Strategy

Users don't need to manage wallets:

- **Unlock Accounts**: Credit card purchases mint NFTs to Unlock-managed wallets (no MetaMask needed)
- **Privy embedded wallets**: Both FlowB (web) and DANZ already use Privy, which creates embedded wallets
- **Telegram/Farcaster users**: Link a wallet optionally, or use Unlock's email-based accounts
- **Verification**: FlowB can check ownership via Unlock API (no direct chain reads needed for basic flows)

### Checkout Integration

For web and mini apps, Unlock provides a hosted checkout widget:

```
https://app.unlock-protocol.com/checkout?
  lock=0x...&
  network=8453&
  referrer=0x{flowb_wallet}&
  title=Salsa%20Night%20Denver&
  ...
```

This handles wallet connection, payment (card or crypto), and minting. FlowB embeds this URL in event cards, crew join buttons, and subscription prompts.

For the Telegram bot, generate the checkout URL and send it as an inline button.

## Phased Rollout

### Phase 1: Read-Only Badge Display (1-2 days)

- Check Unlock locks for existing NFTs via API
- Display badges/tickets in user profiles across web + mini apps
- No smart contract deployment needed
- Validates the integration path

### Phase 2: Event Ticketing (3-5 days)

- Event organizers create Locks via FlowB admin or DANZ dashboard
- Unlock Checkout widget embedded in event detail pages
- Credit card support = zero crypto friction for attendees
- Map ticket ownership to `flowb_event_attendance`
- Referral fee collection for FlowB

### Phase 3: DANZ Subscriptions + Crew Memberships (3-5 days)

- Deploy subscription Locks for DANZ tiers (monthly/yearly/lifetime)
- Replace Stripe subscription flow with Unlock membership check
- Crew creators can optionally deploy gated Locks
- Cross-platform: DANZ sub detected in FlowB, FlowB crew detected in DANZ

### Phase 4: Milestone Badges + Sponsor Activations (2-3 days)

- Deploy soulbound Locks for each FlowB milestone tier and DANZ achievement
- Automated `grantKeys()` calls when users cross point/XP thresholds
- Sponsor Lock deployment and engagement tracking
- Points integration (mint sponsor NFT = bonus points)

## Cost Analysis

| Item | Cost | Notes |
|------|------|-------|
| Lock deployment | Gas on Base (~$0.01-0.05) | One-time per event/tier |
| Key minting | Gas on Base (~$0.001-0.01) | Per ticket/membership |
| Unlock protocol fee | 0% on Base (free for deployers) | Protocol subsidizes Base deployments |
| Credit card processing | ~2.9% + $0.30 | Standard card processing via Unlock |
| Development | Internal | New plugin + DANZ plugin upgrade |

Compared to Stripe: No monthly fees, no webhook infrastructure, no subscription management code. The smart contracts handle it all.

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| User friction (wallets) | Medium | Unlock Accounts + Privy embedded wallets eliminate wallet UX |
| Base network issues | Low | Unlock deployed on 10+ chains, can failover |
| Smart contract bugs | Low | Unlock contracts audited since 2018, battle-tested |
| Credit card abandonment | Medium | Keep free tier and free events as primary flow |
| Regulatory (NFT = security?) | Low | Membership NFTs with utility are generally not securities; soulbound badges have no financial value |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onchain tickets minted | 500+ in first month | Lock mint count |
| DANZ subscriptions via Unlock | Replace 100% of Stripe flow | Active key count |
| Cross-platform badge holders | 100+ users with badges visible on both platforms | Soulbound key count |
| Referral revenue | $500+ in first quarter | Referrer fee accumulation |
| Crew Lock deployments | 10+ gated crews | Lock deployment count |

## Open Questions

1. **Which chain?** Base is the default (Unlock governance token UP is on Base, low gas, Coinbase ecosystem). But should we support Polygon as fallback?
2. **Badge metadata**: Should milestone badge NFTs include dynamic metadata (current point count, last active date) or static (tier name + mint date)?
3. **DANZ Lifetime Founder**: Transferable or soulbound? Transferable creates secondary market value but risks speculation.
4. **FlowB crew revenue**: Should FlowB take a protocol fee on crew Lock payments, or keep it zero to encourage adoption?
5. **Existing DANZ users**: Migration path for users who already have XP/challenges in the current Supabase system?

## References

- [Unlock Protocol Docs](https://docs.unlock-protocol.com/)
- [Unlock Litepaper](https://docs.unlock-protocol.com/getting-started/what-is-unlock/litepaper)
- [Unlock on Base](https://docs.unlock-protocol.com/core-protocol/unlock/networks)
- [Unlock Checkout](https://docs.unlock-protocol.com/tools/checkout/)
- [FlowB Architecture](/architecture)
- [DANZ.Now Plugin](/plugins/danz)
- [FlowB Points System](/points)

---

*Draft proposal -- 2026-02-28*

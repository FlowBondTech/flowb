# FlowBond Sponsorship & Payment System - Complete Documentation

This directory contains the complete implementation documentation for the FlowBond Sponsorship & $FLOW Token System.

## Overview

A comprehensive sponsorship ecosystem that allows sponsors to fund events, pay gig workers, and reward volunteers using a dual-token model: **$FLOW** (stablecoin for predictable pricing) and **$DANZ** (ecosystem token for rewards/trading).

## What's Included

### 1. **SPONSORSHIP_SYSTEM_PLAN.md** (Main Documentation)
Complete implementation guide covering:
- Database schema (12 new tables)
- GraphQL API (schema + resolvers)
- Token flow architecture
- Sponsor tiers and categories
- Subscription sponsorship plans
- Event creator controls
- Analytics and reporting
- Notification system

### 2. **QUICK_START.md** (Implementation Guide)
Step-by-step setup instructions:
- Migration execution order
- GraphQL setup
- Testing procedures
- Common issues & solutions

### 3. **DIAGRAMS.md** (Visual Architecture)
System flow diagrams:
- Token contribution flow
- Subscription matching flow
- Payment distribution flow
- Worker swap & withdrawal flow

### 4. **API_REFERENCE.md** (GraphQL API)
Complete API documentation:
- All queries and mutations
- Input types and enums
- Type definitions
- Usage examples

---

## Quick Start

### For Developers:
1. Read **QUICK_START.md** first
2. Run migrations 069-075 in Supabase
3. Review GraphQL schema in `src/graphql/schema/sponsor.schema.ts`
4. Test using flows in **QUICK_START.md**

### For Product Managers:
1. Review **SPONSORSHIP_SYSTEM_PLAN.md** sections 1-4
2. Understand sponsor tiers and categories
3. Review subscription model
4. Check analytics capabilities

### For QA/Testing:
1. Follow testing checklist in QUICK_START.md
2. Test all sponsor user flows
3. Verify payment distribution logic
4. Test subscription auto-matching

---

## Key Features

### Sponsor Features
- **10 Categories**: Apparel, Music, Wellness, Tech, Venues, Local, Media, Education, Lifestyle, Corporate
- **5 Tiers**: Bronze ($50+), Silver ($500+), Gold ($1000+), Platinum ($5000+), Diamond ($10000+)
- **Subscription Plans**: Monthly (5% discount) or Yearly (20% discount)
- **Auto-Sponsorship**: Category-based or verified-events-only matching
- **Impact Analytics**: ROI metrics, reach, engagement tracking

### Event Creator Features
- **Sponsorship Settings**: Auto-accept, manual review, or category filter modes
- **Preferred/Blocked Categories**: Control which sponsors can fund your events
- **Sponsorship Goals**: Set funding targets with deadline tracking
- **Approval Queue**: Review and approve/reject sponsorship requests

### Token System Features
- **$FLOW Pools**: Event-specific funding pools from sponsors
- **Allocation Config**: Customizable split (default: 80% workers, 15% volunteers, 5% platform)
- **$FLOW Balances**: User wallets for earned $FLOW
- **Swap Mechanism**: Convert $FLOW to $DANZ manually or on withdrawal

### Verified Creator Features
- **Auto-Verification**: 5+ events, 4.0+ rating, 100+ total attendees
- **Manual Verification**: Admin review for edge cases
- **Verification Badge**: Premium status for quality event creators
- **Priority Matching**: Featured in sponsor suggestions

---

## System Architecture

```
Token Flow Overview:

  SPONSOR                     EVENT POOL                   WORKERS
     |                            |                           |
     |  1. Deposit $FLOW          |                           |
     |--------------------------->|                           |
     |                            |                           |
     |                      +-----+-----+                     |
     |                      |  $FLOW    |                     |
     |                      |   POOL    |                     |
     |                      +-----+-----+                     |
     |                            |                           |
     |        2. Event Completes  |  3. Distribute            |
     |                            |-------------------------->|
     |                            |      $FLOW                |
     |                            |                           |
     |                            |                     +-----+-----+
     |                            |                     |  Worker   |
     |                            |                     |  Balance  |
     |                            |                     +-----+-----+
     |                            |                           |
     |                            |     4. Optional Swap      |
     |                            |     +---------------------|
     |                            |     |                     |
     |                            |     v                     |
     |                            |  +-----+                  |
     |                            |  |SWAP | $FLOW -> $DANZ   |
     |                            |  +--+--+                  |
     |                            |     |                     |
     |                            |     v                     |
     |                            |  $DANZ to wallet         |

Allocation Breakdown (Default):
+-------------------------------------------+
|  Paid Workers (80%)       |   $800 FLOW   |
|  Volunteer Rewards (15%)  |   $150 FLOW   |
|  Platform Fee (5%)        |   $50 FLOW    |
+-------------------------------------------+
```

---

## Database Schema Overview

### Core Tables
| Table | Purpose |
|-------|---------|
| `sponsors` | Sponsor profiles with company info, categories, tier |
| `sponsor_categories` | Category definitions (10 seeded categories) |
| `event_sponsorships` | Individual event sponsorship records |
| `event_flow_pools` | $FLOW pool per event |

### Token Tables
| Table | Purpose |
|-------|---------|
| `user_flow_balances` | User $FLOW wallet balances |
| `flow_transactions` | Transaction ledger (all $FLOW movements) |
| `flow_danz_swaps` | $FLOW to $DANZ swap requests |

### Subscription Tables
| Table | Purpose |
|-------|---------|
| `sponsor_subscriptions` | Recurring sponsorship plans |
| `subscription_auto_matches` | Auto-matched events queue |

### Control Tables
| Table | Purpose |
|-------|---------|
| `event_sponsorship_settings` | Event creator preferences |
| `sponsorship_approvals` | Manual approval queue |
| `verified_event_creators` | Verified creator status |

### Analytics Tables
| Table | Purpose |
|-------|---------|
| `sponsor_analytics` | Aggregated sponsor metrics |
| `event_sponsorship_analytics` | Per-event metrics |
| `sponsor_notification_preferences` | Sponsor notification settings |
| `creator_sponsorship_notification_preferences` | Creator notification settings |

---

## Sponsor Tiers

| Tier | Min $FLOW | Benefits |
|------|-----------|----------|
| **Diamond** | 10,000+ | Featured placement, exclusive events, brand integration |
| **Platinum** | 5,000+ | Priority matching, logo on all materials |
| **Gold** | 1,000+ | Category spotlight, event mentions |
| **Silver** | 500+ | Profile visibility, basic matching |
| **Bronze** | 50+ | Entry level, dashboard access |

---

## Sponsor Categories

| Category | Slug | Description |
|----------|------|-------------|
| Dance Apparel & Footwear | `apparel` | Dance shoes, athletic wear, costumes |
| Music & Audio | `music` | Streaming, DJ equipment, labels |
| Health & Wellness | `wellness` | Sports drinks, supplements, fitness |
| Technology & Wearables | `tech` | Fitness trackers, AR/VR, apps |
| Entertainment Venues | `venues` | Studios, venues, ticketing |
| Local Business | `local` | Restaurants, cafes near events |
| Media & Influencer | `media` | Content creators, media outlets |
| Education & Training | `education` | Dance schools, online courses |
| Lifestyle & Fashion | `lifestyle` | Fashion, beauty, accessories |
| Corporate | `corporate` | Team building, enterprise events |

---

## Technical Stack

**Backend:**
- PostgreSQL/Supabase (database)
- GraphQL/Apollo Server 4 (API)
- TypeScript (type safety)
- Row Level Security (access control)

**Key Files:**
- `src/graphql/schema/sponsor.schema.ts` - GraphQL type definitions
- `src/graphql/resolvers/sponsor.resolvers.ts` - Resolver implementations
- `migrations/069-075_*.sql` - Database migrations

---

## Migration Files

| Migration | Description |
|-----------|-------------|
| `069_sponsor_categories.sql` | Category definitions with 10 seeded categories |
| `070_sponsors_table.sql` | Sponsor profiles with tier calculation |
| `071_flow_token_system.sql` | Flow pools, balances, transactions, swaps |
| `072_event_sponsorships.sql` | Sponsorships, settings, approval queue |
| `073_sponsor_subscriptions.sql` | Subscription plans, billing, auto-matching |
| `074_verified_creators_and_analytics.sql` | Verified creators, analytics tables |
| `075_sponsorship_notifications.sql` | Notification preferences, triggers |

---

## Related Documentation

- [Main Backend README](../../README.md) - Project setup
- [CLAUDE.md](../../CLAUDE.md) - AI assistant guidelines
- [Referral System](../referral-system/) - Referral program documentation

---

## Configuration

### Platform Fee
- **Default**: 5% of all sponsorship funds
- **Configurable**: Per-sponsorship override available

### Allocation Defaults
- **Paid Workers**: 80%
- **Volunteer Rewards**: 15%
- **Platform Fee**: 5%

### Subscription Discounts
- **Monthly**: 5% discount
- **Yearly**: 20% discount

### Verified Creator Criteria
- **Events Hosted**: 5+ completed events
- **Average Rating**: 4.0+ stars
- **Total Attendees**: 100+ served

---

**Version**: 1.0.0
**Last Updated**: January 2025
**Status**: Implemented & Ready for Testing

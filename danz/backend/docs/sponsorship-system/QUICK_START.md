# FlowBond Sponsorship System - Quick Start Guide

Step-by-step implementation guide for the FlowBond Sponsorship & $FLOW Token System.

## Prerequisites

- Supabase project with PostgreSQL
- Node.js/Bun runtime
- Access to GraphQL playground (Apollo Studio)

---

## Step 1: Run Database Migrations

Execute the migrations in order in your Supabase SQL editor:

```bash
# Migration order (IMPORTANT - run in sequence)
migrations/069_sponsor_categories.sql    # Categories (10 seeded)
migrations/070_sponsors_table.sql        # Sponsor profiles
migrations/071_flow_token_system.sql     # $FLOW pools, balances, transactions
migrations/072_event_sponsorships.sql    # Sponsorship records, settings
migrations/073_sponsor_subscriptions.sql # Subscription plans
migrations/074_verified_creators_and_analytics.sql  # Verified creators, analytics
migrations/075_sponsorship_notifications.sql        # Notification preferences
```

### Verify Migration Success

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%sponsor%' OR table_name LIKE '%flow%';

-- Verify categories seeded (should return 10)
SELECT COUNT(*) FROM sponsor_categories;

-- Check categories
SELECT slug, name FROM sponsor_categories ORDER BY display_order;
```

Expected output:
```
slug       | name
-----------+---------------------------
apparel    | Dance Apparel & Footwear
music      | Music & Audio
wellness   | Health & Wellness
tech       | Technology & Wearables
venues     | Entertainment Venues
local      | Local Business
media      | Media & Influencer
education  | Education & Training
lifestyle  | Lifestyle & Fashion
corporate  | Corporate
```

---

## Step 2: Verify GraphQL Schema

The schema is already integrated. Verify by starting the server:

```bash
cd danz-backend-experimental
pnpm run dev
```

Open Apollo Studio at `http://localhost:8080/graphql` and check:

1. **Queries available**: `sponsor`, `mySponsorProfile`, `sponsorCategories`, `sponsorDashboard`, etc.
2. **Mutations available**: `createSponsorProfile`, `createEventSponsorship`, `distributeGigPayment`, etc.
3. **Types available**: `Sponsor`, `EventSponsorship`, `FlowTransaction`, etc.

---

## Step 3: Test Core Flows

### A. Create Sponsor Profile

```graphql
mutation CreateSponsor {
  createSponsorProfile(input: {
    companyName: "Test Dance Apparel Co"
    companyDescription: "Premium dance shoes and apparel"
    categories: ["apparel", "lifestyle"]
    contactEmail: "sponsor@test.com"
    websiteUrl: "https://testdance.com"
    preferredDanceStyles: ["hip_hop", "salsa", "contemporary"]
    preferredRegions: ["new_york", "los_angeles"]
  }) {
    id
    companyName
    tier
    categories
    isVerified
  }
}
```

### B. Get Sponsor Categories

```graphql
query GetCategories {
  sponsorCategories {
    id
    slug
    name
    description
    icon
    sponsorCount
  }
}
```

### C. Browse Events for Sponsorship

```graphql
query FindEvents {
  eventsForSponsorship(
    categories: ["apparel", "music"]
    danceStyles: ["hip_hop"]
    limit: 10
  ) {
    id
    title
    location
    startDateTime
    maxCapacity
  }
}
```

### D. Create Sponsorship

```graphql
mutation SponsorEvent {
  createEventSponsorship(input: {
    eventId: "your-event-id"
    flowAmount: 500
    visibility: VISIBLE
    sponsorMessage: "Proud to support local dance!"
    allocationConfig: {
      paidWorkersPercent: 80
      volunteerRewardsPercent: 15
      platformFeePercent: 5
    }
  }) {
    id
    flowAmount
    status
    event {
      title
    }
  }
}
```

### E. Check Sponsor Dashboard

```graphql
query Dashboard {
  sponsorDashboard {
    sponsor {
      companyName
      tier
      totalEventsSponsored
      totalFlowContributed
    }
    activeSponshorships {
      event { title }
      flowAmount
      status
    }
    suggestedEvents {
      event { title }
      matchScore
      matchReasons
    }
    stats {
      totalInvested
      totalEventsSponsored
      totalWorkersSupported
    }
  }
}
```

---

## Step 4: Test Event Creator Flows

### A. Update Sponsorship Settings

```graphql
mutation UpdateSettings {
  updateEventSponsorshipSettings(
    eventId: "your-event-id"
    input: {
      seekingSponsorship: true
      acceptanceMode: MANUAL
      sponsorshipGoal: 2000
      preferredCategories: ["apparel", "music", "tech"]
      blockedCategories: ["corporate"]
      pitchMessage: "Help us bring dance to our community!"
    }
  ) {
    id
    acceptanceMode
    sponsorshipGoal
  }
}
```

### B. Review Pending Approvals

```graphql
query PendingApprovals {
  pendingSponsorshipApprovals(eventId: "your-event-id") {
    id
    sponsor {
      companyName
      tier
    }
    sponsorship {
      flowAmount
      visibility
      sponsorMessage
    }
    expiresAt
  }
}
```

### C. Approve/Reject Sponsorship

```graphql
mutation ApproveSponsor {
  reviewSponsorshipApproval(
    approvalId: "approval-id"
    decision: APPROVE
  ) {
    id
    status
    sponsorship {
      status
    }
  }
}
```

---

## Step 5: Test Payment Distribution

### A. Lock Pool Before Distribution

```graphql
mutation LockPool {
  lockEventPool(eventId: "your-event-id") {
    id
    totalFlow
    status
  }
}
```

### B. Distribute Gig Payment

```graphql
mutation PayWorker {
  distributeGigPayment(input: {
    eventId: "your-event-id"
    applicationId: "gig-application-id"
    amount: 100
    bonusDanz: 50
    note: "Great work on photography!"
  }) {
    id
    amount
    transactionType
    status
  }
}
```

### C. Distribute Volunteer Reward

```graphql
mutation RewardVolunteer {
  distributeVolunteerReward(input: {
    eventId: "your-event-id"
    userId: "volunteer-user-id"
    amount: 25
    reason: "Helped with check-in"
  }) {
    id
    amount
    transactionType
  }
}
```

### D. Check Worker Balance

```graphql
query MyBalance {
  myFlowBalance {
    availableBalance
    pendingBalance
    totalEarned
    totalWithdrawn
  }
}
```

---

## Step 6: Test Subscription Sponsorship

### A. Create Subscription

```graphql
mutation CreateSubscription {
  createSponsorSubscription(input: {
    planType: MONTHLY
    sponsorshipMode: CATEGORY_SUBSCRIPTION
    budgetAmount: 1000
    targetCategories: ["apparel", "music"]
    verifiedEventsOnly: false
    autoApprove: false
    maxPerEvent: 200
  }) {
    id
    planType
    budgetAmount
    discountPercent
    nextBillingDate
    status
  }
}
```

### B. Check My Subscriptions

```graphql
query MySubscriptions {
  mySubscriptions {
    id
    planType
    budgetAmount
    budgetSpent
    budgetRemaining
    targetCategories
    status
  }
}
```

### C. Pause/Resume Subscription

```graphql
mutation PauseSubscription {
  pauseSponsorSubscription(id: "subscription-id") {
    id
    status
  }
}

mutation ResumeSubscription {
  resumeSponsorSubscription(id: "subscription-id") {
    id
    status
    nextBillingDate
  }
}
```

---

## Step 7: Test Swap & Withdrawal

### A. Request FLOW to DANZ Swap

```graphql
mutation SwapTokens {
  requestFlowToDanzSwap(amount: 100) {
    id
    flowAmount
    estimatedDanzAmount
    estimatedExchangeRate
    status
  }
}
```

### B. Withdraw (Auto-Swaps to DANZ)

```graphql
mutation Withdraw {
  withdrawFlow(
    amount: 200
    destinationWallet: "your-solana-wallet-address"
  ) {
    id
    amount
    status
    relatedSwap {
      flowAmount
      danzAmount
      exchangeRate
    }
  }
}
```

---

## Common Issues & Solutions

### Issue: "User is not a sponsor"
**Solution**: Create sponsor profile first using `createSponsorProfile` mutation

### Issue: "Insufficient funds in event pool"
**Solution**: Ensure sponsorships have been approved and pool has sufficient balance

### Issue: "Event pool is locked"
**Solution**: Pool was locked for distribution. Use `unlockEventPool` if needed.

### Issue: "Subscription budget exceeded"
**Solution**: Increase budget amount or wait for next billing cycle

### Issue: Migration fails
**Solution**: Run migrations in order (069 → 075). Some have dependencies.

---

## Testing Checklist

### Sponsor Flows
- [ ] Create sponsor profile
- [ ] Update sponsor profile
- [ ] Browse events for sponsorship
- [ ] View suggested events
- [ ] Create single event sponsorship
- [ ] Cancel sponsorship
- [ ] View sponsor dashboard
- [ ] Check analytics

### Subscription Flows
- [ ] Create monthly subscription
- [ ] Create yearly subscription
- [ ] Pause subscription
- [ ] Resume subscription
- [ ] Cancel subscription
- [ ] View subscription matches

### Event Creator Flows
- [ ] Update sponsorship settings
- [ ] Set preferred/blocked categories
- [ ] View pending approvals
- [ ] Approve sponsorship
- [ ] Reject sponsorship

### Payment Flows
- [ ] Lock event pool
- [ ] Distribute gig payment
- [ ] Distribute volunteer reward
- [ ] Complete event distribution
- [ ] Check user balance
- [ ] View transaction history

### Token Flows
- [ ] Request FLOW to DANZ swap
- [ ] Withdraw FLOW (auto-swap)
- [ ] Check swap status

### Verified Creator
- [ ] Check verification status
- [ ] View verification criteria

---

## Key Files Reference

```
danz-backend-experimental/
├── src/graphql/
│   ├── schema/
│   │   ├── sponsor.schema.ts     # GraphQL type definitions
│   │   └── index.ts              # Schema exports
│   └── resolvers/
│       ├── sponsor.resolvers.ts  # Resolver implementations
│       └── index.ts              # Resolver exports
├── migrations/
│   ├── 069_sponsor_categories.sql
│   ├── 070_sponsors_table.sql
│   ├── 071_flow_token_system.sql
│   ├── 072_event_sponsorships.sql
│   ├── 073_sponsor_subscriptions.sql
│   ├── 074_verified_creators_and_analytics.sql
│   └── 075_sponsorship_notifications.sql
└── docs/sponsorship-system/
    ├── README.md
    ├── QUICK_START.md (this file)
    ├── DIAGRAMS.md
    └── API_REFERENCE.md
```

---

## Next Steps

1. **Test in Development**: Run through all test queries/mutations
2. **Integrate Frontend**: Build sponsor dashboard and event creator settings UI
3. **Configure Webhooks**: Set up payment notification webhooks
4. **Monitor Analytics**: Review sponsor and event analytics
5. **Deploy to Staging**: Test with real user flows

---

**Version**: 1.0.0
**Last Updated**: January 2025

# FlowBond Sponsorship System - Architecture Diagrams

Visual documentation of system flows and architecture.

---

## 1. Sponsor Contribution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPONSOR CONTRIBUTION FLOW                     │
└─────────────────────────────────────────────────────────────────┘

  Sponsor                    Event Pool                   Workers
    │                            │                           │
    │  1. Deposit $FLOW          │                           │
    ├───────────────────────────►│                           │
    │                            │                           │
    │                      ┌─────┴─────┐                     │
    │                      │  $FLOW    │                     │
    │                      │   POOL    │                     │
    │                      └─────┬─────┘                     │
    │                            │                           │
    │        2. Event Completes  │  3. Distribute            │
    │                            ├──────────────────────────►│
    │                            │      $FLOW                │
    │                            │                           │
    │                            │                     ┌─────┴─────┐
    │                            │                     │  Worker   │
    │                            │                     │  Balance  │
    │                            │                     └─────┬─────┘
    │                            │                           │
    │                            │     4. Optional Swap      │
    │                            │     ┌─────────────────────┤
    │                            │     │                     │
    │                            │     ▼                     │
    │                            │  ┌─────┐                  │
    │                            │  │SWAP │ $FLOW → $DANZ    │
    │                            │  └──┬──┘                  │
    │                            │     │                     │
    │                            │     ▼                     │
    │                            │  $DANZ to wallet         │
    │                            │                           │
```

---

## 2. Allocation Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALLOCATION BREAKDOWN                          │
└─────────────────────────────────────────────────────────────────┘

  Total Sponsor Contribution: $1,000 FLOW

  ┌────────────────────────────────────────────────┐
  │  Paid Workers (80%)        │     $800 FLOW    │
  ├────────────────────────────┼──────────────────┤
  │  Volunteer Rewards (15%)   │     $150 FLOW    │
  ├────────────────────────────┼──────────────────┤
  │  Platform Fee (5%)         │     $50 FLOW     │
  └────────────────────────────┴──────────────────┘

  Configurable per sponsorship (platform fee fixed at 5%)
```

---

## 3. Sponsor Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SPONSOR ONBOARDING FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

User (logged in)
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  "Become a   │───►│   Company    │───►│  Category    │───►│   Review &   │
│   Sponsor"   │    │    Info      │    │  Selection   │    │   Submit     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                   │                    │
                           ▼                   ▼                    ▼
                    • Company name       • Multi-select        • Preview profile
                    • Description         categories          • Accept terms
                    • Logo upload        • Dance styles        • Submit
                    • Website            • Event types
                    • Contact info       • Regions
                                                                    │
                                                                    ▼
                                                          ┌──────────────┐
                                                          │   Sponsor    │
                                                          │  Dashboard   │
                                                          └──────────────┘
```

---

## 4. Single Event Sponsorship Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SINGLE EVENT SPONSORSHIP FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

  Sponsor                          System                       Event Creator
     │                                │                               │
     │  1. Browse/Search Events       │                               │
     ├───────────────────────────────►│                               │
     │                                │                               │
     │  2. View Event Details         │                               │
     │◄───────────────────────────────┤                               │
     │     - Sponsorship settings     │                               │
     │     - Current sponsors         │                               │
     │     - Match score              │                               │
     │                                │                               │
     │  3. Click "Sponsor Event"      │                               │
     ├───────────────────────────────►│                               │
     │                                │                               │
     │  4. Configure Sponsorship      │                               │
     │     - Set amount ($FLOW)       │                               │
     │     - Set allocation %         │                               │
     │     - Choose visibility        │                               │
     │     - Add message              │                               │
     ├───────────────────────────────►│                               │
     │                                │                               │
     │                                │  5. Check acceptance mode     │
     │                                ├──────────────────────────────►│
     │                                │                               │
     │                    ┌───────────┴───────────┐                   │
     │                    │                       │                   │
     │               AUTO_ACCEPT             MANUAL                   │
     │                    │                       │                   │
     │                    ▼                       ▼                   │
     │              ┌──────────┐           ┌──────────┐               │
     │              │ Approved │           │ Pending  │               │
     │              │Immediately│          │ Approval │               │
     │              └────┬─────┘           └────┬─────┘               │
     │                   │                      │                     │
     │                   │                      │  6. Review Request  │
     │                   │                      │◄────────────────────┤
     │                   │                      │                     │
     │                   │                      │  7. Approve/Reject  │
     │                   │                      ├────────────────────►│
     │                   │                      │                     │
     │                   ▼                      ▼                     │
     │              ┌─────────────────────────────┐                   │
     │              │   $FLOW deposited to pool   │                   │
     │◄─────────────┤   Sponsor notified          │                   │
     │              │   Creator notified          ├──────────────────►│
     │              └─────────────────────────────┘                   │
```

---

## 5. Subscription Sponsorship Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   SUBSCRIPTION SPONSORSHIP FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

  Sponsor                          System                       New Events
     │                                │                               │
     │  1. Setup Subscription         │                               │
     │     - Monthly/Yearly           │                               │
     │     - Budget amount            │                               │
     │     - Target categories        │                               │
     │     - Verified only toggle     │                               │
     │     - Max per event            │                               │
     │     - Auto-approve toggle      │                               │
     ├───────────────────────────────►│                               │
     │                                │                               │
     │  2. Subscription Active        │                               │
     │◄───────────────────────────────┤                               │
     │                                │                               │
     │                                │  3. New Event Created         │
     │                                │◄──────────────────────────────┤
     │                                │                               │
     │                                │  4. Check Match Criteria      │
     │                                │     - Category match?         │
     │                                │     - Verified creator?       │
     │                                │     - Budget remaining?       │
     │                                │                               │
     │                    ┌───────────┴───────────┐                   │
     │                    │                       │                   │
     │               AUTO_APPROVE            REQUIRES_APPROVAL        │
     │                    │                       │                   │
     │                    ▼                       ▼                   │
     │              ┌──────────┐           ┌──────────────┐           │
     │              │  Auto    │           │ Notification │           │
     │              │  Fund    │           │   Sent to    │           │
     │              └────┬─────┘           │   Sponsor    │           │
     │                   │                 └──────┬───────┘           │
     │                   │                        │                   │
     │                   │    5. Sponsor Reviews  │                   │
     │                   │◄───────────────────────┤                   │
     │                   │                        │                   │
     │                   │    6. Approve/Skip     │                   │
     │                   ├───────────────────────►│                   │
     │                   │                        │                   │
     │                   ▼                        ▼                   │
     │              ┌─────────────────────────────┐                   │
     │              │   $FLOW deducted from       │                   │
     │              │   subscription budget       │                   │
     │              │   Event pool funded         │                   │
     │              └─────────────────────────────┘                   │
```

---

## 6. Event Completion & Payment Distribution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 EVENT COMPLETION & DISTRIBUTION FLOW                     │
└─────────────────────────────────────────────────────────────────────────┘

  Event                        System                         Workers
  Creator                         │                              │
     │                            │                              │
     │  1. Event Ends             │                              │
     │     Mark as Complete       │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │  2. Lock Event Pool        │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │  3. Review Gig Workers     │                              │
     │     - Approve submissions  │                              │
     │     - Set payment amounts  │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │  4. Distribute Payments    │                              │
     │     - Paid workers (80%)   │                              │
     │     - Volunteers (15%)     │                              │
     │     - Platform fee (5%)    │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │                            │  5. Transfer $FLOW           │
     │                            ├─────────────────────────────►│
     │                            │     to worker balances       │
     │                            │                              │
     │                            │  6. Notify Workers           │
     │                            ├─────────────────────────────►│
     │                            │     "You earned $X FLOW"     │
     │                            │                              │
     │  7. Complete Distribution  │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │  8. Pool Marked Complete   │                              │
     │◄───────────────────────────┤                              │
     │                            │                              │
```

---

## 7. Worker Swap & Withdrawal Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKER SWAP & WITHDRAWAL FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

  Worker                         System                        Blockchain
     │                              │                              │
     │  1. View $FLOW Balance       │                              │
     │◄─────────────────────────────┤                              │
     │     Available: 500 $FLOW     │                              │
     │                              │                              │
     │                              │                              │
     ├────────────┬─────────────────┴────────────────────────┐     │
     │            │                                          │     │
     │       MANUAL SWAP                                WITHDRAW   │
     │            │                                          │     │
     │            ▼                                          ▼     │
     │  2a. Request Swap            │              2b. Request     │
     │      Amount: 200 $FLOW       │                  Withdrawal  │
     │      ────────────────────────►                  Amount: 300 │
     │                              │                  Wallet: 0x..│
     │                              │                  ───────────►│
     │                              │                              │
     │  3a. Confirm Rate            │              3b. Auto-Swap   │
     │      1 $FLOW = 10 $DANZ      │                  300 $FLOW   │
     │◄─────────────────────────────┤                  → 3000 $DANZ│
     │                              │                              │
     │  4a. Execute Swap            │              4b. Transfer    │
     │      ────────────────────────►                  ───────────►│
     │                              │                              │
     │  5a. Update Balances         │              5b. On-chain    │
     │      $FLOW: -200             │                  transaction │
     │      $DANZ: +2000            │                  ◄───────────┤
     │◄─────────────────────────────┤                              │
     │                              │              6b. Confirm     │
     │                              │◄─────────────────────────────┤
     │                              │                              │
     │                              │  7b. Notify Worker           │
     │◄─────────────────────────────┤      "3000 $DANZ sent"      │
     │                              │                              │
```

---

## 8. Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATABASE RELATIONSHIPS                              │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌────────────────────┐
                    │      users         │
                    │  (existing table)  │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    sponsors     │  │user_flow_balances│  │verified_event_  │
│                 │  │                 │  │    creators     │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ├──────────────────┬────────────────────┐
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│sponsor_         │  │event_           │  │sponsor_         │
│subscriptions    │  │sponsorships     │  │analytics        │
└────────┬────────┘  └────────┬────────┘  └─────────────────┘
         │                    │
         ▼                    │
┌─────────────────┐          │
│subscription_    │          │
│auto_matches     │          │
└─────────────────┘          │
                             │
                             ▼
                    ┌────────────────────┐
                    │      events        │
                    │  (existing table)  │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│event_flow_pools │  │event_sponsorship│  │sponsorship_     │
│                 │  │_settings        │  │approvals        │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│flow_transactions│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│flow_danz_swaps  │
└─────────────────┘


Legend:
────────────────────────────────────
│ sponsor_categories │ (standalone, referenced by sponsors.categories array)
────────────────────────────────────
```

---

## 9. Sponsor Tier System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SPONSOR TIER SYSTEM                               │
└─────────────────────────────────────────────────────────────────────────┘

                         Total $FLOW Contributed
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │  $0         $50        $500       $1,000     $5,000      $10,000+   │
  │   │          │          │          │          │          │          │
  │   ▼          ▼          ▼          ▼          ▼          ▼          │
  │ ┌────┐    ┌────┐     ┌────┐     ┌────┐     ┌────┐     ┌────┐       │
  │ │    │    │    │     │    │     │    │     │    │     │    │       │
  │ │ -- │    │ B  │     │ S  │     │ G  │     │ P  │     │ D  │       │
  │ │    │    │ R  │     │ I  │     │ O  │     │ L  │     │ I  │       │
  │ │    │    │ O  │     │ L  │     │ L  │     │ A  │     │ A  │       │
  │ │    │    │ N  │     │ V  │     │ D  │     │ T  │     │ M  │       │
  │ │    │    │ Z  │     │ E  │     │    │     │ I  │     │ O  │       │
  │ │    │    │ E  │     │ R  │     │    │     │ N  │     │ N  │       │
  │ │    │    │    │     │    │     │    │     │ U  │     │ D  │       │
  │ │    │    │    │     │    │     │    │     │ M  │     │    │       │
  │ └────┘    └────┘     └────┘     └────┘     └────┘     └────┘       │
  │                                                                      │
  └─────────────────────────────────────────────────────────────────────┘

  TIER BENEFITS:

  Bronze ($50+):
  ├── Dashboard access
  ├── Basic analytics
  └── Profile visibility

  Silver ($500+):
  ├── All Bronze benefits
  ├── Basic event matching
  └── Category preferences

  Gold ($1,000+):
  ├── All Silver benefits
  ├── Category spotlight
  └── Event mentions

  Platinum ($5,000+):
  ├── All Gold benefits
  ├── Priority matching
  └── Logo on materials

  Diamond ($10,000+):
  ├── All Platinum benefits
  ├── Featured placement
  ├── Exclusive events
  └── Brand integration
```

---

## 10. Event Creator Acceptance Modes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   EVENT CREATOR ACCEPTANCE MODES                         │
└─────────────────────────────────────────────────────────────────────────┘

               ┌─────────────────────────────────┐
               │   New Sponsorship Request       │
               │   from Sponsor                  │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌────────────────────────────────┐
               │  Check Acceptance Mode         │
               └────────────────┬───────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
  │  AUTO_ACCEPT  │    │    MANUAL     │    │CATEGORY_FILTER│
  └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
          │                    │                    │
          ▼                    ▼                    ▼
  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
  │ Immediately   │    │ Add to        │    │ Check if      │
  │ Approved      │    │ Approval      │    │ sponsor       │
  │               │    │ Queue         │    │ category in   │
  │               │    │               │    │ preferred     │
  └───────┬───────┘    └───────┬───────┘    │ list          │
          │                    │            └───────┬───────┘
          │                    │                    │
          │                    │           ┌───────┴───────┐
          │                    │           │               │
          │                    │       YES │           NO  │
          │                    │           │               │
          │                    │           ▼               ▼
          │                    │    ┌──────────┐   ┌──────────┐
          │                    │    │ Auto     │   │ Rejected │
          │                    │    │ Approved │   │ or Queue │
          │                    │    └────┬─────┘   └──────────┘
          │                    │         │
          ▼                    ▼         ▼
  ┌─────────────────────────────────────────────────────┐
  │             SPONSORSHIP ACTIVATED                   │
  │             $FLOW added to event pool               │
  └─────────────────────────────────────────────────────┘
```

---

## 11. Notification Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION TRIGGERS                              │
└─────────────────────────────────────────────────────────────────────────┘

  EVENT                           │          RECIPIENTS
  ────────────────────────────────┼────────────────────────────────────────
                                  │
  Sponsorship received            │──────► Event Creator
                                  │        (push, email, in-app)
                                  │
  Sponsorship approved            │──────► Sponsor
                                  │        (push, in-app)
                                  │
  Sponsorship rejected            │──────► Sponsor
                                  │        (push, email, in-app)
                                  │
  Sponsorship goal reached        │──────► Event Creator
                                  │        (push, in-app)
                                  │
  New matching event              │──────► Subscription Sponsors
  (for subscriptions)             │        (push, email)
                                  │
  Payment received                │──────► Worker
                                  │        (push, in-app)
                                  │
  Subscription renewal            │──────► Sponsor
                                  │        (email)
                                  │
  Budget low warning              │──────► Sponsor
                                  │        (push, email)
                                  │
  Event complete                  │──────► Sponsor
                                  │        (push, in-app)
                                  │
  Sponsor approval expiring       │──────► Event Creator
                                  │        (push)
                                  │
  Swap complete                   │──────► Worker
                                  │        (push, in-app)
                                  │
  Withdrawal complete             │──────► Worker
                                  │        (push, email)
```

---

## 12. Verified Creator System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERIFIED CREATOR SYSTEM                               │
└─────────────────────────────────────────────────────────────────────────┘

                         USER ACTIVITY
                              │
                              ▼
           ┌──────────────────────────────────┐
           │   Check Verification Criteria    │
           │                                  │
           │   □ 5+ events hosted             │
           │   □ 4.0+ average rating          │
           │   □ 100+ total attendees         │
           └──────────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         ALL MET                        NOT ALL MET
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ AUTO VERIFIED   │             │ NOT VERIFIED    │
    │                 │             │                 │
    │ • Badge granted │             │ • Continue      │
    │ • Priority in   │             │   building      │
    │   suggestions   │             │   track record  │
    │ • Verified-only │             │                 │
    │   sponsorships  │             │                 │
    └─────────────────┘             └─────────────────┘
              │
              │  OR (Admin Override)
              │
              ▼
    ┌─────────────────┐
    │ MANUAL VERIFIED │
    │                 │
    │ • Admin reviews │
    │ • Special cases │
    │ • Quality check │
    └─────────────────┘


  VERIFIED CREATOR BENEFITS:
  ┌────────────────────────────────────────────────────────────────────┐
  │ ✓ Verification badge on profile and events                        │
  │ ✓ Priority placement in sponsor suggestions                       │
  │ ✓ Eligible for "verified-only" subscription sponsorships          │
  │ ✓ Higher match scores with sponsors                               │
  │ ✓ Featured in category event listings                             │
  └────────────────────────────────────────────────────────────────────┘
```

---

**Version**: 1.0.0
**Last Updated**: January 2025

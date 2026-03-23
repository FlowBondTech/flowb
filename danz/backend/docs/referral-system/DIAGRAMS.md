# DANZ Referral System - Visual Diagrams

## 1. Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS TABLE                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ privy_id (PK)                                            │   │
│  │ username (UNIQUE)                                        │   │
│  │ xp, level, total_sessions                                │   │
│  │ referred_by → users.username (FK)                        │   │
│  │ referral_count                                           │   │
│  │ referral_points_earned                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ↑                           ↑
         │                           │
         │                           │
┌────────┴───────────┐    ┌──────────┴─────────────────────────┐
│ REFERRAL_CODES     │    │        REFERRALS                   │
│ ┌────────────────┐ │    │  ┌──────────────────────────────┐  │
│ │ id (PK)        │ │    │  │ id (PK)                      │  │
│ │ user_id (FK)   │─┼────┼──│ referrer_id (FK)             │  │
│ │ code (UNIQUE)  │◄┼────┼──│ referee_id (FK)              │  │
│ │ is_active      │ │    │  │ referral_code (FK)           │  │
│ │ created_at     │ │    │  │ status (enum)                │  │
│ └────────────────┘ │    │  │ clicked_at                   │  │
└────────────────────┘    │  │ signed_up_at                 │  │
                          │  │ completed_at                 │  │
                          │  │ ip_address, device_id        │  │
                          │  └──────────────────────────────┘  │
                          └────────────────┬───────────────────┘
                                           │
                                           ↓
                          ┌────────────────────────────────────┐
                          │    REFERRAL_REWARDS                │
                          │  ┌──────────────────────────────┐  │
                          │  │ id (PK)                      │  │
                          │  │ referral_id (FK)             │  │
                          │  │ user_id (FK)                 │  │
                          │  │ points_awarded (20)          │  │
                          │  │ awarded_at                   │  │
                          │  └──────────────────────────────┘  │
                          └────────────────────────────────────┘
```

---

## 2. User Flow Sequence Diagram

```
REFERRER          WEB PAGE         MOBILE APP        DATABASE        REFEREE
   │                  │                  │                │              │
   │ 1. Share link    │                  │                │              │
   │─────────────────>│                  │                │              │
   │                  │                  │                │              │
   │                  │    2. Click      │                │              │
   │                  │<──────────────────────────────────│              │
   │                  │                  │                │              │
   │                  │ 3. Track click   │                │              │
   │                  │──────────────────────────────────>│              │
   │                  │                  │                │              │
   │                  │ 4. Redirect      │                │              │
   │                  │──────────────────>│                │              │
   │                  │                  │                │              │
   │                  │                  │ 5. Sign up     │              │
   │                  │                  │────────────────>│              │
   │                  │                  │                │              │
   │                  │                  │ 6. Set username│              │
   │                  │                  │────────────────>│              │
   │                  │                  │                │              │
   │                  │                  │ 7. Complete    │              │
   │                  │                  │    referral    │              │
   │                  │                  │────────────────>│              │
   │                  │                  │                │              │
   │                  │                  │                │ 8. First     │
   │                  │                  │                │    session   │
   │                  │                  │<───────────────────────────────│
   │                  │                  │                │              │
   │                  │                  │ 9. Mark        │              │
   │                  │                  │    completed   │              │
   │                  │                  │────────────────>│              │
   │                  │                  │                │              │
   │ 10. +20 points   │                  │                │              │
   │<─────────────────────────────────────────────────────│              │
   │                  │                  │                │              │
```

---

## 3. Referral Status State Machine

```
                    ┌──────────────┐
                    │   PENDING    │ ← Link clicked, no signup
                    └──────┬───────┘
                           │
                    User signs up
                           │
                           ↓
                    ┌──────────────┐
              ┌────→│  SIGNED_UP   │
              │     └──────┬───────┘
              │            │
    No session│     First session
    in 30 days│     completed (5+ min)
              │            │
              │            ↓
              │     ┌──────────────┐
              │     │  COMPLETED   │ → Points awarded to referrer
              │     └──────────────┘
              │
              ↓
       ┌──────────────┐
       │   EXPIRED    │
       └──────────────┘

       Fraud detected
              ↓
       ┌──────────────┐
       │ FRAUDULENT   │
       └──────────────┘
```

---

## 4. Fraud Detection Flow

```
                         ┌─────────────────┐
                         │  Referral Click │
                         └────────┬────────┘
                                  │
                                  ↓
                         ┌─────────────────┐
                         │ Extract Metadata │
                         │ - IP Address     │
                         │ - Device ID      │
                         │ - User Agent     │
                         └────────┬────────┘
                                  │
                                  ↓
                         ┌─────────────────┐
                         │ Check Patterns  │
                         └────────┬────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ↓                ↓                ↓
        ┌────────────┐   ┌────────────┐   ┌────────────┐
        │  Same IP?  │   │Same Device?│   │ Too Fast?  │
        │  (>3/day)  │   │  (>2 ever) │   │ (>5/hour)  │
        └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
               YES                           NO
                │                             │
                ↓                             ↓
        ┌───────────────┐           ┌────────────────┐
        │ BLOCK REQUEST │           │ ALLOW & TRACK  │
        │ Status: fraud │           │ Status: pending│
        └───────────────┘           └────────────────┘
```

---

## 5. Deep Link Flow (Mobile)

```
┌─────────────────────────────────────────────────────────────┐
│               User clicks: danz.now/i/username              │
└─────────────────────┬───────────────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
         iOS                 Android
            │                   │
            ↓                   ↓
   ┌────────────────┐   ┌────────────────┐
   │ Universal Link │   │   App Link     │
   │  (AASA file)   │   │ (assetlinks)   │
   └────────┬───────┘   └────────┬───────┘
            │                    │
            └────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
      App Installed        Not Installed
          │                     │
          ↓                     ↓
   ┌──────────────┐      ┌──────────────┐
   │  Open App    │      │ Redirect to  │
   │  Parse param │      │  App Store   │
   │  Store code  │      └──────────────┘
   └──────┬───────┘
          │
          ↓
   ┌──────────────┐
   │ AsyncStorage │
   │ Save code    │
   └──────┬───────┘
          │
          ↓
   ┌──────────────┐
   │ User signs up│
   │ Use saved    │
   │ referral code│
   └──────────────┘
```

---

## 6. Mobile App Component Structure

```
ProfileScreen
    │
    └── ReferralSection
            │
            ├── Header (Icon + Title + Subtitle)
            │
            ├── Stats Container
            │   ├── Successful Referrals
            │   ├── Pending Referrals
            │   └── Points Earned
            │
            ├── Link Container
            │   ├── Display Link
            │   └── Copy Button
            │
            └── Share Buttons
                ├── Primary Share (native)
                ├── SMS Share
                └── WhatsApp Share
```

---

## 7. GraphQL API Structure

```
Query {
  myReferralCode              → Get user's referral code
  myReferralStats             → Get conversion metrics
  myReferrals(status, limit)  → List of referrals
  getReferralByCode(code)     → Lookup by code
  getReferralClickStats(code) → Analytics
}

Mutation {
  trackReferralClick(input)         → Track from web page
  completeReferral(code)            → Mark signup complete
  markReferralCompleted(referralId) → Award points
  generateShareLinks                → Get share URLs
}

Types {
  ReferralCode    → User's unique code
  Referral        → Tracking record
  ReferralReward  → Points awarded
  ReferralStats   → Metrics + analytics
}
```

---

## 8. Fraud Detection Layers

```
┌────────────────────────────────────────────────────────┐
│                    Layer 1: Request                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Rate Limiting: 5 clicks/hour per referrer        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│                 Layer 2: Device Tracking               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ IP Address: Max 3 referrals from same IP/24h    │  │
│  │ Device ID: Max 2 referrals from same device     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│               Layer 3: Behavioral Analysis             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Time to signup: Flag if < 5 seconds              │  │
│  │ Session patterns: Verify real usage              │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│               Layer 4: Database Constraints            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Self-referral: CHECK (referrer != referee)       │  │
│  │ Duplicate: UNIQUE INDEX on referee_id            │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│                Layer 5: Manual Review                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Admin dashboard: Review fraud alerts             │  │
│  │ SQL views: Automated pattern detection           │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Timeline Gantt Chart

```
Week 1:
  Day 1-2: Database Setup & Migration        ████████
  Day 3-4: Backend GraphQL Implementation    ████████
  Day 5:   Testing Backend                   ████

Week 2:
  Day 1-2: Mobile Deep Linking Setup         ████████
  Day 3-4: Mobile UI Components              ████████
  Day 5:   Integration Testing               ████

Week 3:
  Day 1:   Web Landing Page                  ████
  Day 2:   Universal Links Config            ████
  Day 3-4: End-to-End Testing                ████████
  Day 5:   Production Deployment             ████

Total: ~3 weeks for complete implementation + testing
```

---

## 10. Monitoring Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│               REFERRAL SYSTEM DASHBOARD                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  OVERVIEW                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Total Clicks  │  │  Signups     │  │  Completed   │  │
│  │    1,234     │  │    456       │  │     234      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  CONVERSION FUNNEL                                      │
│  Clicks ████████████████████████████ 100%               │
│  Signups ██████████████████ 37%                         │
│  Completed ██████████ 19%                               │
│                                                         │
│  TOP REFERRERS                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ @sarahdancer    45 refs    900 pts    95% conv │   │
│  │ @mike_123       32 refs    640 pts    88% conv │   │
│  │ @dancer_pro     28 refs    560 pts    92% conv │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  FRAUD ALERTS                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️  3 same-IP attempts from 192.168.1.1        │   │
│  │ ⚠️  2 instant signups (< 5 sec)                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

**These diagrams complement the main documentation and provide visual understanding of the referral system architecture.**

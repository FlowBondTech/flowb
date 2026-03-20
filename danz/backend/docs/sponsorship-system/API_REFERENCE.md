# FlowBond Sponsorship System - GraphQL API Reference

Complete API documentation for the FlowBond Sponsorship & $FLOW Token System.

---

## Table of Contents

1. [Enums](#enums)
2. [Types](#types)
3. [Input Types](#input-types)
4. [Queries](#queries)
5. [Mutations](#mutations)
6. [Usage Examples](#usage-examples)

---

## Enums

### SponsorTier
```graphql
enum SponsorTier {
  BRONZE    # $50+ contributed
  SILVER    # $500+ contributed
  GOLD      # $1,000+ contributed
  PLATINUM  # $5,000+ contributed
  DIAMOND   # $10,000+ contributed
}
```

### SponsorshipStatus
```graphql
enum SponsorshipStatus {
  PENDING     # Awaiting approval
  ACTIVE      # Approved and funded
  COMPLETED   # Event completed, distributed
  CANCELLED   # Cancelled by sponsor
  REFUNDED    # Funds returned
}
```

### SponsorshipVisibility
```graphql
enum SponsorshipVisibility {
  VISIBLE    # Logo in sponsors list
  ANONYMOUS  # No public attribution
  FEATURED   # Logo prominent/highlighted
}
```

### PoolStatus
```graphql
enum PoolStatus {
  OPEN         # Accepting sponsorships
  LOCKED       # Locked for distribution
  DISTRIBUTING # Currently distributing
  COMPLETED    # Fully distributed
}
```

### TransactionType
```graphql
enum TransactionType {
  SPONSOR_DEPOSIT     # Sponsor funds event
  GIG_PAYMENT         # Payment to gig worker
  VOLUNTEER_REWARD    # Reward to volunteer
  PLATFORM_FEE        # Platform fee collection
  SWAP_TO_DANZ        # FLOW to DANZ swap
  WITHDRAWAL          # Withdrawal to wallet
  REFUND              # Refund to sponsor
}
```

### TransactionStatus
```graphql
enum TransactionStatus {
  PENDING    # Not yet processed
  COMPLETED  # Successfully processed
  FAILED     # Processing failed
  REVERSED   # Transaction reversed
}
```

### SubscriptionPlanType
```graphql
enum SubscriptionPlanType {
  MONTHLY  # Monthly billing (5% discount)
  YEARLY   # Annual billing (20% discount)
}
```

### SponsorshipMode
```graphql
enum SponsorshipMode {
  SINGLE_EVENT           # One-time event sponsorship
  CATEGORY_SUBSCRIPTION  # Auto-sponsor category events
  VERIFIED_ONLY          # Only verified creator events
  HYBRID                 # Category + verified filter
}
```

### AcceptanceMode
```graphql
enum AcceptanceMode {
  AUTO_ACCEPT      # Automatically approve all
  MANUAL           # Manual review required
  CATEGORY_FILTER  # Auto-approve preferred categories
}
```

### ApprovalDecision
```graphql
enum ApprovalDecision {
  APPROVE
  REJECT
}
```

### MatchStatus
```graphql
enum MatchStatus {
  PENDING   # Awaiting sponsor response
  APPROVED  # Sponsor approved
  SKIPPED   # Sponsor skipped
  EXPIRED   # Auto-expired
}
```

### SwapStatus
```graphql
enum SwapStatus {
  PENDING     # Not yet processed
  PROCESSING  # Being processed
  COMPLETED   # Successfully swapped
  FAILED      # Swap failed
}
```

---

## Types

### Sponsor
```graphql
type Sponsor {
  id: ID!
  userId: ID!
  user: User
  companyName: String!
  companyDescription: String
  logoUrl: String
  websiteUrl: String
  contactEmail: String
  contactPhone: String
  categories: [String!]!
  tier: SponsorTier!
  isVerified: Boolean!
  verifiedAt: DateTime
  preferredRegions: [String]
  preferredEventTypes: [String]
  preferredDanceStyles: [String]
  totalEventsSponsored: Int!
  totalFlowContributed: Float!
  totalDanzDistributed: Float!
  sponsorships: [EventSponsorship!]
  subscriptions: [SponsorSubscription!]
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### SponsorCategory
```graphql
type SponsorCategory {
  id: ID!
  slug: String!
  name: String!
  description: String
  icon: String
  displayOrder: Int!
  isActive: Boolean!
  sponsorCount: Int
}
```

### EventSponsorship
```graphql
type EventSponsorship {
  id: ID!
  event: Event!
  sponsor: Sponsor!
  flowAmount: Float!
  flowAllocated: Float!
  flowDistributed: Float!
  status: SponsorshipStatus!
  visibility: SponsorshipVisibility!
  sponsorMessage: String
  allocationConfig: AllocationConfig
  completedAt: DateTime
  completionNotes: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### AllocationConfig
```graphql
type AllocationConfig {
  paidWorkersPercent: Float!
  volunteerRewardsPercent: Float!
  platformFeePercent: Float!
}
```

### EventFlowPool
```graphql
type EventFlowPool {
  id: ID!
  event: Event!
  totalFlow: Float!
  allocatedFlow: Float!
  distributedFlow: Float!
  remainingFlow: Float!
  status: PoolStatus!
  lockedAt: DateTime
  distributionStartedAt: DateTime
  completedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### UserFlowBalance
```graphql
type UserFlowBalance {
  id: ID!
  userId: ID!
  availableBalance: Float!
  pendingBalance: Float!
  totalEarned: Float!
  totalWithdrawn: Float!
  totalGigsCompleted: Int!
  totalEventsWorked: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### FlowTransaction
```graphql
type FlowTransaction {
  id: ID!
  fromUser: User
  toUser: User
  sponsor: Sponsor
  event: Event
  amount: Float!
  transactionType: TransactionType!
  status: TransactionStatus!
  description: String
  metadata: JSON
  txHash: String
  blockNumber: Int
  createdAt: DateTime!
  completedAt: DateTime
  relatedSwap: FlowDanzSwap
}
```

### FlowDanzSwap
```graphql
type FlowDanzSwap {
  id: ID!
  userId: ID!
  flowAmount: Float!
  danzAmount: Float
  exchangeRate: Float
  status: SwapStatus!
  triggerType: String!
  errorMessage: String
  createdAt: DateTime!
  processedAt: DateTime
  completedAt: DateTime
}
```

### SponsorSubscription
```graphql
type SponsorSubscription {
  id: ID!
  sponsor: Sponsor!
  planType: SubscriptionPlanType!
  sponsorshipMode: SponsorshipMode!
  budgetAmount: Float!
  budgetSpent: Float!
  budgetRemaining: Float!
  targetCategories: [String!]
  verifiedEventsOnly: Boolean!
  autoApprove: Boolean!
  maxPerEvent: Float
  defaultAllocationConfig: AllocationConfig
  status: String!
  nextBillingDate: DateTime
  lastBilledAt: DateTime
  discountPercent: Float!
  eventsSponsored: [EventSponsorship!]
  pendingMatches: [SubscriptionAutoMatch!]
  createdAt: DateTime!
  updatedAt: DateTime!
  cancelledAt: DateTime
}
```

### SubscriptionAutoMatch
```graphql
type SubscriptionAutoMatch {
  id: ID!
  subscription: SponsorSubscription!
  event: Event!
  suggestedAmount: Float!
  matchReasons: [String!]!
  status: MatchStatus!
  respondedAt: DateTime
  expiresAt: DateTime!
  createdAt: DateTime!
}
```

### EventSponsorshipSettings
```graphql
type EventSponsorshipSettings {
  id: ID!
  event: Event!
  acceptanceMode: AcceptanceMode!
  autoAcceptAll: Boolean!
  preferredCategories: [String!]
  blockedCategories: [String!]
  minAutoAcceptAmount: Float
  seekingSponsorship: Boolean!
  sponsorshipGoal: Float
  currentSponsorshipTotal: Float
  sponsorshipDeadline: DateTime
  pitchMessage: String
  notifyOnNewSponsor: Boolean!
  notifyOnGoalReached: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### SponsorshipApproval
```graphql
type SponsorshipApproval {
  id: ID!
  event: Event!
  sponsor: Sponsor!
  sponsorship: EventSponsorship!
  status: String!
  reviewedAt: DateTime
  rejectionReason: String
  expiresAt: DateTime
  autoExpired: Boolean!
  createdAt: DateTime!
}
```

### VerifiedEventCreator
```graphql
type VerifiedEventCreator {
  id: ID!
  user: User!
  isVerified: Boolean!
  verifiedAt: DateTime
  verifiedBy: User
  totalEventsHosted: Int!
  averageEventRating: Float
  totalAttendeesServed: Int!
  autoVerified: Boolean!
  verificationNotes: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### SuggestedEvent
```graphql
type SuggestedEvent {
  event: Event!
  matchScore: Float!
  matchReasons: [String!]!
  estimatedReach: Int
  categoryMatches: [String!]!
}
```

### SponsorDashboard
```graphql
type SponsorDashboard {
  sponsor: Sponsor!
  activeSponshorships: [EventSponsorship!]!
  suggestedEvents: [SuggestedEvent!]!
  recentActivity: [FlowTransaction!]!
  stats: SponsorStats!
}
```

### SponsorStats
```graphql
type SponsorStats {
  totalInvested: Float!
  totalEventsSponsored: Int!
  totalWorkersSupported: Int!
  averageEventRating: Float
  impactMetrics: ImpactMetrics
}
```

### ImpactMetrics
```graphql
type ImpactMetrics {
  totalDancersReached: Int!
  totalHoursSupported: Float!
  communityEngagement: Float!
}
```

### SponsorAnalytics
```graphql
type SponsorAnalytics {
  id: ID!
  sponsor: Sponsor!
  periodType: String!
  periodStart: DateTime!
  periodEnd: DateTime!
  totalFlowSpent: Float!
  eventsSponsored: Int!
  subscriptionSpent: Float!
  singleEventSpent: Float!
  totalDancersReached: Int!
  totalEventAttendees: Int!
  uniqueWorkersSupported: Int!
  volunteerHoursSupported: Float!
  brandImpressions: Int!
  logoViews: Int!
  profileClicks: Int!
  websiteClicks: Int!
  socialMentions: Int!
  spendingByCategory: JSON
  eventsByDanceStyle: JSON
  eventsByRegion: JSON
  costPerImpression: Float
  costPerClick: Float
  averageEventRating: Float
}
```

### VerificationCriteria
```graphql
type VerificationCriteria {
  minEventsHosted: Int!
  minAverageRating: Float!
  minTotalAttendees: Int!
  currentEventsHosted: Int!
  currentAverageRating: Float
  currentTotalAttendees: Int!
  meetsEventsCriteria: Boolean!
  meetsRatingCriteria: Boolean!
  meetsAttendeesCriteria: Boolean!
  isEligibleForAutoVerification: Boolean!
}
```

### SponsorNotificationPreferences
```graphql
type SponsorNotificationPreferences {
  id: ID!
  sponsorId: ID!
  emailNewMatchingEvents: Boolean!
  emailSponsorshipUpdates: Boolean!
  emailSubscriptionBilling: Boolean!
  emailWeeklyDigest: Boolean!
  pushNewMatchingEvents: Boolean!
  pushSponsorshipUpdates: Boolean!
  pushBudgetWarnings: Boolean!
  matchingEventsFrequency: String!
  digestDay: String!
}
```

### CreatorSponsorshipNotificationPreferences
```graphql
type CreatorSponsorshipNotificationPreferences {
  id: ID!
  userId: ID!
  notifyNewSponsorship: Boolean!
  notifySponsorshipApproved: Boolean!
  notifyGoalReached: Boolean!
  notifyApprovalExpiring: Boolean!
  emailEnabled: Boolean!
  pushEnabled: Boolean!
}
```

---

## Input Types

### CreateSponsorInput
```graphql
input CreateSponsorInput {
  companyName: String!
  companyDescription: String
  logoUrl: String
  websiteUrl: String
  contactEmail: String!
  contactPhone: String
  categories: [String!]!
  preferredRegions: [String]
  preferredEventTypes: [String]
  preferredDanceStyles: [String]
}
```

### UpdateSponsorInput
```graphql
input UpdateSponsorInput {
  companyName: String
  companyDescription: String
  logoUrl: String
  websiteUrl: String
  contactEmail: String
  contactPhone: String
  categories: [String]
  preferredRegions: [String]
  preferredEventTypes: [String]
  preferredDanceStyles: [String]
}
```

### CreateSponsorshipInput
```graphql
input CreateSponsorshipInput {
  eventId: ID!
  flowAmount: Float!
  visibility: SponsorshipVisibility
  sponsorMessage: String
  allocationConfig: AllocationConfigInput!
}
```

### UpdateSponsorshipInput
```graphql
input UpdateSponsorshipInput {
  flowAmount: Float
  visibility: SponsorshipVisibility
  sponsorMessage: String
  allocationConfig: AllocationConfigInput
}
```

### AllocationConfigInput
```graphql
input AllocationConfigInput {
  paidWorkersPercent: Float!
  volunteerRewardsPercent: Float!
  platformFeePercent: Float!
}
```

### SponsorshipSettingsInput
```graphql
input SponsorshipSettingsInput {
  acceptanceMode: AcceptanceMode
  autoAcceptAll: Boolean
  preferredCategories: [String]
  blockedCategories: [String]
  minAutoAcceptAmount: Float
  seekingSponsorship: Boolean
  sponsorshipGoal: Float
  sponsorshipDeadline: DateTime
  pitchMessage: String
  notifyOnNewSponsor: Boolean
  notifyOnGoalReached: Boolean
}
```

### CreateSubscriptionInput
```graphql
input CreateSubscriptionInput {
  planType: SubscriptionPlanType!
  sponsorshipMode: SponsorshipMode!
  budgetAmount: Float!
  targetCategories: [String]
  verifiedEventsOnly: Boolean
  autoApprove: Boolean
  maxPerEvent: Float
  defaultAllocationConfig: AllocationConfigInput
}
```

### UpdateSubscriptionInput
```graphql
input UpdateSubscriptionInput {
  budgetAmount: Float
  targetCategories: [String]
  verifiedEventsOnly: Boolean
  autoApprove: Boolean
  maxPerEvent: Float
  defaultAllocationConfig: AllocationConfigInput
}
```

### GigPaymentInput
```graphql
input GigPaymentInput {
  eventId: ID!
  applicationId: ID!
  amount: Float!
  bonusDanz: Float
  note: String
}
```

### VolunteerRewardInput
```graphql
input VolunteerRewardInput {
  eventId: ID!
  userId: ID!
  amount: Float!
  reason: String!
}
```

### SponsorNotificationPreferencesInput
```graphql
input SponsorNotificationPreferencesInput {
  emailNewMatchingEvents: Boolean
  emailSponsorshipUpdates: Boolean
  emailSubscriptionBilling: Boolean
  emailWeeklyDigest: Boolean
  pushNewMatchingEvents: Boolean
  pushSponsorshipUpdates: Boolean
  pushBudgetWarnings: Boolean
  matchingEventsFrequency: String
  digestDay: String
}
```

### CreatorNotificationPreferencesInput
```graphql
input CreatorNotificationPreferencesInput {
  notifyNewSponsorship: Boolean
  notifySponsorshipApproved: Boolean
  notifyGoalReached: Boolean
  notifyApprovalExpiring: Boolean
  emailEnabled: Boolean
  pushEnabled: Boolean
}
```

---

## Queries

### Sponsor Profile Queries

```graphql
# Get sponsor by ID
sponsor(id: ID!): Sponsor

# Get sponsor by user ID
sponsorByUserId(userId: ID!): Sponsor

# Get current user's sponsor profile
mySponsorProfile: Sponsor

# Get all sponsor categories
sponsorCategories: [SponsorCategory!]!
```

### Dashboard Queries

```graphql
# Get sponsor dashboard with stats and suggestions
sponsorDashboard: SponsorDashboard

# Get suggested events for sponsor
suggestedEventsForSponsor(limit: Int): [SuggestedEvent!]!
```

### Event Discovery Queries

```graphql
# Search events for sponsorship
eventsForSponsorship(
  categories: [String!]
  region: String
  danceStyles: [String!]
  minCapacity: Int
  maxBudget: Float
  dateFrom: DateTime
  dateTo: DateTime
  verifiedCreatorsOnly: Boolean
  limit: Int
  offset: Int
): [Event!]!
```

### Flow Balance Queries

```graphql
# Get current user's FLOW balance
myFlowBalance: UserFlowBalance

# Get current user's transaction history
myFlowTransactions(
  limit: Int
  offset: Int
  type: TransactionType
): [FlowTransaction!]!
```

### Event Pool Queries

```graphql
# Get event's FLOW pool
eventFlowPool(eventId: ID!): EventFlowPool

# Get event's sponsors
eventSponsors(eventId: ID!): [EventSponsorship!]!
```

### Event Creator Queries

```graphql
# Get event sponsorship settings
eventSponsorshipSettings(eventId: ID!): EventSponsorshipSettings

# Get pending sponsorship approvals
pendingSponsorshipApprovals(eventId: ID!): [SponsorshipApproval!]!
```

### Subscription Queries

```graphql
# Get current sponsor's subscriptions
mySubscriptions: [SponsorSubscription!]!

# Get subscription by ID
subscription(id: ID!): SponsorSubscription
```

### Verified Creator Queries

```graphql
# Get verified creator status by user ID
verifiedCreatorStatus(userId: ID!): VerifiedEventCreator

# Get current user's verification status
myVerificationStatus: VerifiedEventCreator

# Get verification criteria with progress
verificationCriteria: VerificationCriteria
```

### Analytics Queries

```graphql
# Get sponsor analytics
sponsorAnalytics(
  periodType: String!
  startDate: DateTime!
  endDate: DateTime!
): SponsorAnalytics

# Get event sponsorship analytics
eventSponsorshipAnalytics(eventId: ID!): JSON
```

### Notification Preference Queries

```graphql
# Get sponsor notification preferences
sponsorNotificationPreferences: SponsorNotificationPreferences

# Get creator sponsorship notification preferences
creatorSponsorshipNotificationPreferences: CreatorSponsorshipNotificationPreferences
```

---

## Mutations

### Sponsor Profile Mutations

```graphql
# Create sponsor profile
createSponsorProfile(input: CreateSponsorInput!): Sponsor!

# Update sponsor profile
updateSponsorProfile(input: UpdateSponsorInput!): Sponsor!

# Delete sponsor profile
deleteSponsorProfile: Boolean!
```

### Sponsorship Mutations

```graphql
# Create event sponsorship
createEventSponsorship(input: CreateSponsorshipInput!): EventSponsorship!

# Update event sponsorship
updateEventSponsorship(
  id: ID!
  input: UpdateSponsorshipInput!
): EventSponsorship!

# Cancel event sponsorship
cancelEventSponsorship(id: ID!, reason: String): EventSponsorship!
```

### Approval Mutations

```graphql
# Review sponsorship approval (approve/reject)
reviewSponsorshipApproval(
  approvalId: ID!
  decision: ApprovalDecision!
  reason: String
): SponsorshipApproval!
```

### Event Settings Mutations

```graphql
# Update event sponsorship settings
updateEventSponsorshipSettings(
  eventId: ID!
  input: SponsorshipSettingsInput!
): EventSponsorshipSettings!
```

### Pool Management Mutations

```graphql
# Lock event pool for distribution
lockEventPool(eventId: ID!): EventFlowPool!

# Unlock event pool
unlockEventPool(eventId: ID!): EventFlowPool!

# Distribute gig payment
distributeGigPayment(input: GigPaymentInput!): FlowTransaction!

# Distribute volunteer reward
distributeVolunteerReward(input: VolunteerRewardInput!): FlowTransaction!

# Complete event distribution
completeEventDistribution(eventId: ID!): EventFlowPool!
```

### Token Mutations

```graphql
# Request FLOW to DANZ swap
requestFlowToDanzSwap(amount: Float!): FlowDanzSwap!

# Withdraw FLOW (auto-swaps to DANZ)
withdrawFlow(
  amount: Float!
  destinationWallet: String!
): FlowTransaction!
```

### Subscription Mutations

```graphql
# Create sponsor subscription
createSponsorSubscription(
  input: CreateSubscriptionInput!
): SponsorSubscription!

# Update sponsor subscription
updateSponsorSubscription(
  id: ID!
  input: UpdateSubscriptionInput!
): SponsorSubscription!

# Pause sponsor subscription
pauseSponsorSubscription(id: ID!): SponsorSubscription!

# Resume sponsor subscription
resumeSponsorSubscription(id: ID!): SponsorSubscription!

# Cancel sponsor subscription
cancelSponsorSubscription(
  id: ID!
  reason: String
): SponsorSubscription!

# Respond to subscription auto-match
respondToSubscriptionMatch(
  matchId: ID!
  approve: Boolean!
): SubscriptionAutoMatch!
```

### Notification Preference Mutations

```graphql
# Update sponsor notification preferences
updateSponsorNotificationPreferences(
  input: SponsorNotificationPreferencesInput!
): SponsorNotificationPreferences!

# Update creator sponsorship notification preferences
updateCreatorSponsorshipNotificationPreferences(
  input: CreatorNotificationPreferencesInput!
): CreatorSponsorshipNotificationPreferences!
```

---

## Usage Examples

### Complete Sponsor Onboarding Flow

```graphql
# Step 1: Create sponsor profile
mutation CreateSponsor {
  createSponsorProfile(input: {
    companyName: "Dance Gear Pro"
    companyDescription: "Premium dance equipment and apparel"
    categories: ["apparel", "tech"]
    contactEmail: "sponsor@dancegear.com"
    websiteUrl: "https://dancegear.com"
    logoUrl: "https://dancegear.com/logo.png"
    preferredDanceStyles: ["hip_hop", "breaking", "contemporary"]
    preferredRegions: ["new_york", "california"]
  }) {
    id
    companyName
    tier
    categories
  }
}

# Step 2: Browse events
query FindEvents {
  eventsForSponsorship(
    categories: ["apparel"]
    danceStyles: ["hip_hop"]
    limit: 10
  ) {
    id
    title
    location
    startDateTime
  }
}

# Step 3: Create sponsorship
mutation SponsorEvent {
  createEventSponsorship(input: {
    eventId: "event-uuid"
    flowAmount: 1000
    visibility: FEATURED
    sponsorMessage: "Proud to support local dance!"
    allocationConfig: {
      paidWorkersPercent: 80
      volunteerRewardsPercent: 15
      platformFeePercent: 5
    }
  }) {
    id
    status
    event { title }
  }
}
```

### Complete Event Creator Flow

```graphql
# Step 1: Configure sponsorship settings
mutation ConfigureSettings {
  updateEventSponsorshipSettings(
    eventId: "event-uuid"
    input: {
      seekingSponsorship: true
      acceptanceMode: MANUAL
      sponsorshipGoal: 5000
      preferredCategories: ["apparel", "music", "tech"]
      blockedCategories: ["corporate"]
      pitchMessage: "Help us bring dance to the community!"
    }
  ) {
    id
    acceptanceMode
    sponsorshipGoal
  }
}

# Step 2: Review pending approvals
query ViewApprovals {
  pendingSponsorshipApprovals(eventId: "event-uuid") {
    id
    sponsor {
      companyName
      tier
    }
    sponsorship {
      flowAmount
      sponsorMessage
    }
  }
}

# Step 3: Approve sponsorship
mutation ApproveSponsorship {
  reviewSponsorshipApproval(
    approvalId: "approval-uuid"
    decision: APPROVE
  ) {
    id
    status
  }
}
```

### Complete Payment Distribution Flow

```graphql
# Step 1: Lock pool
mutation LockPool {
  lockEventPool(eventId: "event-uuid") {
    id
    totalFlow
    status
  }
}

# Step 2: Pay workers
mutation PayWorker {
  distributeGigPayment(input: {
    eventId: "event-uuid"
    applicationId: "application-uuid"
    amount: 200
    bonusDanz: 50
    note: "Excellent photography!"
  }) {
    id
    amount
    status
  }
}

# Step 3: Reward volunteers
mutation RewardVolunteer {
  distributeVolunteerReward(input: {
    eventId: "event-uuid"
    userId: "user-uuid"
    amount: 30
    reason: "Great help with check-in"
  }) {
    id
    amount
  }
}

# Step 4: Complete distribution
mutation Complete {
  completeEventDistribution(eventId: "event-uuid") {
    id
    status
    distributedFlow
  }
}
```

### Worker Withdrawal Flow

```graphql
# Check balance
query MyBalance {
  myFlowBalance {
    availableBalance
    pendingBalance
    totalEarned
  }
}

# Withdraw (auto-swaps to DANZ)
mutation Withdraw {
  withdrawFlow(
    amount: 500
    destinationWallet: "solana-wallet-address"
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

**Version**: 1.0.0
**Last Updated**: January 2025

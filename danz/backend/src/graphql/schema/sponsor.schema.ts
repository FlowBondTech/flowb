import { gql } from 'graphql-tag'

export const sponsorTypeDefs = gql`
  # ============================================================================
  # ENUMS
  # ============================================================================

  enum SponsorTier {
    bronze
    silver
    gold
    platinum
    diamond
  }

  enum SponsorshipStatus {
    pending
    active
    completed
    cancelled
    refunded
  }

  enum SponsorshipVisibility {
    visible
    anonymous
    featured
  }

  enum PoolStatus {
    open
    locked
    distributing
    completed
  }

  enum FlowTransactionType {
    sponsor_deposit
    gig_payment
    volunteer_reward
    platform_fee
    swap_to_danz
    withdrawal
    refund
  }

  enum TransactionStatus {
    pending
    completed
    failed
    reversed
  }

  enum AcceptanceMode {
    auto_accept
    manual
    category_filter
  }

  enum ApprovalStatus {
    pending
    approved
    rejected
    expired
  }

  enum SubscriptionPlanType {
    monthly
    yearly
  }

  enum SponsorshipMode {
    single_event
    category_subscription
    verified_only
    hybrid
  }

  enum SubscriptionStatus {
    active
    paused
    cancelled
    expired
  }

  # ============================================================================
  # TYPES - Sponsor Categories
  # ============================================================================

  type SponsorCategory {
    id: ID!
    slug: String!
    name: String!
    description: String
    icon: String
    displayOrder: Int
    isActive: Boolean!
    sponsorCount: Int
  }

  # ============================================================================
  # TYPES - Sponsor Profile
  # ============================================================================

  type Sponsor {
    id: ID!
    userId: String!
    user: User

    # Company Info
    companyName: String!
    companyDescription: String
    logoUrl: String
    websiteUrl: String
    contactEmail: String
    contactPhone: String

    # Categories
    categories: [String!]!

    # Tier
    tier: SponsorTier!
    isVerified: Boolean!
    verifiedAt: DateTime

    # Preferences
    preferredRegions: [String]
    preferredEventTypes: [String]
    preferredDanceStyles: [String]

    # Stats
    totalEventsSponsored: Int!
    totalFlowContributed: Float!
    totalDanzDistributed: Float!

    # Relations
    sponsorships: [EventSponsorship!]
    subscriptions: [SponsorSubscription!]
    impactScore: SponsorImpactScore

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SponsorImpactScore {
    totalScore: Int!
    grade: String!
    reachScore: Int!
    supportScore: Int!
    totalEvents: Int!
    totalInvested: Float!
  }

  # ============================================================================
  # TYPES - Event Sponsorship
  # ============================================================================

  type EventSponsorship {
    id: ID!
    event: Event!
    sponsor: Sponsor!

    # Funding
    flowAmount: Float!
    flowAllocated: Float!
    flowDistributed: Float!

    # Status
    status: SponsorshipStatus!

    # Allocation
    allocationConfig: AllocationConfig!

    # Visibility
    visibility: SponsorshipVisibility!
    sponsorMessage: String

    # Completion
    completedAt: DateTime
    completionNotes: String

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AllocationConfig {
    paidWorkersPercent: Float!
    volunteerRewardsPercent: Float!
    platformFeePercent: Float!
  }

  # ============================================================================
  # TYPES - Event Flow Pool
  # ============================================================================

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
    sponsors: [EventSponsorship!]
  }

  # ============================================================================
  # TYPES - User Flow Balance & Transactions
  # ============================================================================

  type UserFlowBalance {
    userId: String!
    availableBalance: Float!
    pendingBalance: Float!
    totalEarned: Float!
    totalWithdrawn: Float!
    totalGigsCompleted: Int!
    totalEventsWorked: Int!
  }

  type FlowTransaction {
    id: ID!
    fromUser: User
    toUser: User
    sponsor: Sponsor
    event: Event
    amount: Float!
    transactionType: FlowTransactionType!
    status: TransactionStatus!
    description: String
    metadata: JSON
    txHash: String
    createdAt: DateTime!
    completedAt: DateTime
  }

  type FlowDanzSwap {
    id: ID!
    userId: String!
    flowAmount: Float!
    danzAmount: Float
    exchangeRate: Float
    status: String!
    triggerType: String!
    createdAt: DateTime!
    processedAt: DateTime
    completedAt: DateTime
    errorMessage: String
  }

  # ============================================================================
  # TYPES - Event Sponsorship Settings
  # ============================================================================

  type EventSponsorshipSettings {
    id: ID!
    eventId: ID!
    acceptanceMode: AcceptanceMode!
    autoAcceptAll: Boolean!
    preferredCategories: [String]
    blockedCategories: [String]
    minAutoAcceptAmount: Float
    seekingSponsorship: Boolean!
    sponsorshipGoal: Float
    sponsorshipDeadline: DateTime
    pitchMessage: String
    notifyOnNewSponsor: Boolean!
    notifyOnGoalReached: Boolean!
    currentTotal: Float
    goalProgress: Float
  }

  # ============================================================================
  # TYPES - Sponsorship Approval
  # ============================================================================

  type SponsorshipApproval {
    id: ID!
    eventId: ID!
    event: Event
    sponsorId: ID!
    sponsor: Sponsor
    sponsorship: EventSponsorship
    proposedFlowAmount: Float!
    proposedVisibility: SponsorshipVisibility
    proposedMessage: String
    status: ApprovalStatus!
    reviewedAt: DateTime
    reviewedBy: String
    rejectionReason: String
    expiresAt: DateTime!
    autoExpired: Boolean!
    createdAt: DateTime!
  }

  # ============================================================================
  # TYPES - Sponsor Subscription
  # ============================================================================

  type SponsorSubscription {
    id: ID!
    sponsor: Sponsor!
    planType: SubscriptionPlanType!
    sponsorshipMode: SponsorshipMode!
    budgetAmount: Float!
    budgetSpent: Float!
    budgetRemaining: Float!
    targetCategories: [String]
    verifiedEventsOnly: Boolean!
    autoApprove: Boolean!
    maxPerEvent: Float
    defaultAllocationConfig: AllocationConfig
    defaultVisibility: SponsorshipVisibility!
    status: SubscriptionStatus!
    currentPeriodStart: DateTime
    currentPeriodEnd: DateTime
    nextBillingDate: DateTime
    lastBilledAt: DateTime
    discountPercent: Float!
    eventsSponsored: [EventSponsorship!]
    pendingMatches: [SubscriptionAutoMatch!]
    createdAt: DateTime!
    cancelledAt: DateTime
  }

  type SubscriptionAutoMatch {
    id: ID!
    subscriptionId: ID!
    event: Event!
    sponsorship: EventSponsorship
    matchReason: String!
    matchedCategories: [String]
    flowAmount: Float!
    status: ApprovalStatus!
    notifiedAt: DateTime
    respondedAt: DateTime
    expiresAt: DateTime
    createdAt: DateTime!
  }

  # ============================================================================
  # TYPES - Verified Event Creators
  # ============================================================================

  type VerifiedEventCreator {
    id: ID!
    userId: String!
    user: User
    isVerified: Boolean!
    verifiedAt: DateTime
    totalEventsHosted: Int!
    averageEventRating: Float!
    totalAttendeesServed: Int!
    autoVerified: Boolean!
    verificationType: String
    verificationNotes: String
  }

  type VerificationCriteria {
    totalEvents: Int!
    averageRating: Float!
    totalAttendees: Int!
    meetsCriteria: Boolean!
    eventsNeeded: Int!
    ratingNeeded: Float!
    attendeesNeeded: Int!
  }

  # ============================================================================
  # TYPES - Sponsor Dashboard
  # ============================================================================

  type SponsorDashboard {
    sponsor: Sponsor!
    activeSponsorships: [EventSponsorship!]!
    suggestedEvents: [SuggestedEvent!]!
    recentActivity: [FlowTransaction!]!
    stats: SponsorStats!
    subscriptions: [SponsorSubscription!]!
    pendingMatches: [SubscriptionAutoMatch!]!
  }

  type SuggestedEvent {
    event: Event!
    matchScore: Float!
    matchReasons: [String!]!
    estimatedReach: Int
    categoryMatches: [String!]!
    currentSponsorshipTotal: Float
    sponsorshipGoal: Float
  }

  type SponsorStats {
    totalInvested: Float!
    totalEventsSponsored: Int!
    totalWorkersSupported: Int!
    averageEventRating: Float
    impactMetrics: ImpactMetrics!
  }

  type ImpactMetrics {
    totalDancersReached: Int!
    totalHoursSupported: Float!
    communityEngagement: Float!
  }

  # ============================================================================
  # TYPES - Analytics
  # ============================================================================

  type SponsorAnalytics {
    totalFlowSpent: Float!
    eventsSponsored: Int!
    dancersReached: Int!
    workersSupported: Int!
    costPerImpression: Float
    costPerClick: Float
    brandImpressions: Int!
    websiteClicks: Int!
    spendingTrend: [TrendDataPoint!]!
    spendingByCategory: [CategoryBreakdown!]!
    eventsByDanceStyle: [StyleBreakdown!]!
    eventsByRegion: [RegionBreakdown!]!
  }

  type TrendDataPoint {
    period: String!
    amount: Float!
  }

  type CategoryBreakdown {
    category: String!
    amount: Float!
    percentage: Float!
  }

  type StyleBreakdown {
    style: String!
    count: Int!
    percentage: Float!
  }

  type RegionBreakdown {
    region: String!
    count: Int!
  }

  type EventSponsorshipAnalytics {
    totalReceived: Float!
    numberOfSponsors: Int!
    goalPercentage: Float
    distributionBreakdown: DistributionBreakdown!
    sponsorsByTier: [TierBreakdown!]!
    sponsorsByCategory: [CategorySponsorBreakdown!]!
  }

  type DistributionBreakdown {
    workers: Float!
    volunteers: Float!
    platformFees: Float!
  }

  type TierBreakdown {
    tier: SponsorTier!
    count: Int!
  }

  type CategorySponsorBreakdown {
    category: String!
    count: Int!
    totalAmount: Float!
  }

  # ============================================================================
  # TYPES - Notification Preferences
  # ============================================================================

  type SponsorNotificationPreferences {
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

  type CreatorSponsorshipNotificationPreferences {
    notifyNewSponsorship: Boolean!
    notifySponsorshipApproved: Boolean!
    notifyGoalReached: Boolean!
    notifyApprovalExpiring: Boolean!
    emailEnabled: Boolean!
    pushEnabled: Boolean!
  }

  # ============================================================================
  # INPUTS
  # ============================================================================

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

  input UpdateSponsorInput {
    companyName: String
    companyDescription: String
    logoUrl: String
    websiteUrl: String
    contactEmail: String
    contactPhone: String
    categories: [String!]
    preferredRegions: [String]
    preferredEventTypes: [String]
    preferredDanceStyles: [String]
  }

  input AllocationConfigInput {
    paidWorkersPercent: Float!
    volunteerRewardsPercent: Float!
    platformFeePercent: Float!
  }

  input CreateSponsorshipInput {
    eventId: ID!
    flowAmount: Float!
    visibility: SponsorshipVisibility
    sponsorMessage: String
    allocationConfig: AllocationConfigInput!
  }

  input UpdateSponsorshipInput {
    visibility: SponsorshipVisibility
    sponsorMessage: String
    allocationConfig: AllocationConfigInput
  }

  input EventSponsorshipSettingsInput {
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

  input CreateSubscriptionInput {
    planType: SubscriptionPlanType!
    sponsorshipMode: SponsorshipMode!
    budgetAmount: Float!
    targetCategories: [String]
    verifiedEventsOnly: Boolean
    autoApprove: Boolean
    maxPerEvent: Float
    defaultAllocationConfig: AllocationConfigInput
    defaultVisibility: SponsorshipVisibility
  }

  input UpdateSubscriptionInput {
    budgetAmount: Float
    targetCategories: [String]
    verifiedEventsOnly: Boolean
    autoApprove: Boolean
    maxPerEvent: Float
    defaultAllocationConfig: AllocationConfigInput
    defaultVisibility: SponsorshipVisibility
  }

  input GigPaymentInput {
    eventId: ID!
    applicationId: ID!
    amount: Float!
    bonusDanz: Float
    note: String
  }

  input VolunteerRewardInput {
    eventId: ID!
    userId: String!
    amount: Float!
    reason: String!
  }

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

  input CreatorNotificationPreferencesInput {
    notifyNewSponsorship: Boolean
    notifySponsorshipApproved: Boolean
    notifyGoalReached: Boolean
    notifyApprovalExpiring: Boolean
    emailEnabled: Boolean
    pushEnabled: Boolean
  }

  input EventsForSponsorshipInput {
    categories: [String]
    region: String
    danceStyles: [String]
    minCapacity: Int
    maxBudget: Float
    dateFrom: DateTime
    dateTo: DateTime
    verifiedCreatorsOnly: Boolean
    limit: Int
    offset: Int
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  extend type Query {
    # Sponsor queries
    sponsor(id: ID!): Sponsor
    sponsorByUserId(userId: String!): Sponsor
    mySponsorProfile: Sponsor
    sponsorCategories: [SponsorCategory!]!

    # Dashboard
    sponsorDashboard: SponsorDashboard

    # Event discovery for sponsors
    eventsForSponsorship(input: EventsForSponsorshipInput): [Event!]!
    suggestedEventsForSponsor(limit: Int): [SuggestedEvent!]!

    # Balance queries
    myFlowBalance: UserFlowBalance
    myFlowTransactions(limit: Int, offset: Int, type: FlowTransactionType): [FlowTransaction!]!

    # Event pool queries
    eventFlowPool(eventId: ID!): EventFlowPool
    eventSponsors(eventId: ID!): [EventSponsorship!]!

    # Event sponsorship settings
    eventSponsorshipSettings(eventId: ID!): EventSponsorshipSettings

    # Pending approvals (for event creators)
    pendingSponsorshipApprovals(eventId: ID!): [SponsorshipApproval!]!

    # Subscriptions
    mySubscriptions: [SponsorSubscription!]!
    subscription(id: ID!): SponsorSubscription

    # Verified creators
    verifiedCreatorStatus(userId: String): VerifiedEventCreator
    myVerificationStatus: VerifiedEventCreator
    verificationCriteria(userId: String): VerificationCriteria

    # Analytics
    sponsorAnalytics(periodType: String!, startDate: DateTime!, endDate: DateTime!): SponsorAnalytics
    eventSponsorshipAnalytics(eventId: ID!): EventSponsorshipAnalytics

    # Notification preferences
    sponsorNotificationPreferences: SponsorNotificationPreferences
    creatorSponsorshipNotificationPreferences: CreatorSponsorshipNotificationPreferences
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  extend type Mutation {
    # Sponsor profile
    createSponsorProfile(input: CreateSponsorInput!): Sponsor!
    updateSponsorProfile(input: UpdateSponsorInput!): Sponsor!
    deleteSponsorProfile: MutationResponse!

    # Sponsorship actions
    createEventSponsorship(input: CreateSponsorshipInput!): EventSponsorship!
    updateEventSponsorship(id: ID!, input: UpdateSponsorshipInput!): EventSponsorship!
    cancelEventSponsorship(id: ID!, reason: String): EventSponsorship!

    # Approval actions (for event creators)
    reviewSponsorshipApproval(approvalId: ID!, decision: ApprovalStatus!, reason: String): SponsorshipApproval!

    # Event sponsorship settings
    updateEventSponsorshipSettings(eventId: ID!, input: EventSponsorshipSettingsInput!): EventSponsorshipSettings!

    # Pool management (for event organizers)
    lockEventPool(eventId: ID!): EventFlowPool!
    unlockEventPool(eventId: ID!): EventFlowPool!
    distributeGigPayment(input: GigPaymentInput!): FlowTransaction!
    distributeVolunteerReward(input: VolunteerRewardInput!): FlowTransaction!
    completeEventDistribution(eventId: ID!): EventFlowPool!

    # User actions
    requestFlowToDanzSwap(amount: Float!): FlowDanzSwap!
    withdrawFlow(amount: Float!, destinationWallet: String!): FlowTransaction!

    # Subscription management
    createSponsorSubscription(input: CreateSubscriptionInput!): SponsorSubscription!
    updateSponsorSubscription(id: ID!, input: UpdateSubscriptionInput!): SponsorSubscription!
    pauseSponsorSubscription(id: ID!): SponsorSubscription!
    resumeSponsorSubscription(id: ID!): SponsorSubscription!
    cancelSponsorSubscription(id: ID!, reason: String): SponsorSubscription!

    # Subscription match responses
    respondToSubscriptionMatch(matchId: ID!, approve: Boolean!): SubscriptionAutoMatch!

    # Notification preferences
    updateSponsorNotificationPreferences(input: SponsorNotificationPreferencesInput!): SponsorNotificationPreferences!
    updateCreatorSponsorshipNotificationPreferences(input: CreatorNotificationPreferencesInput!): CreatorSponsorshipNotificationPreferences!
  }
`

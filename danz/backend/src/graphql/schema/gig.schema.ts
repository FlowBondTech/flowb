import { gql } from 'graphql-tag'

export const gigTypeDefs = gql`
  # ============================================================================
  # ENUMS
  # ============================================================================

  enum GigRoleCategory {
    OPERATIONS
    CREATIVE
    TECHNICAL
    HOSPITALITY
    SAFETY
  }

  enum GigApprovalMode {
    AI
    MANUAL
    AUTO
  }

  enum GigSource {
    PUBLIC
    SELF
  }

  enum GigApplicationStatus {
    PENDING
    AI_REVIEW
    APPROVED
    REJECTED
    WITHDRAWN
    COMPLETED
  }

  enum UserGigRoleStatus {
    PENDING
    APPROVED
    REJECTED
    SUSPENDED
  }

  enum EventGigStatus {
    OPEN
    FILLED
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  enum GigSubmissionType {
    PHOTO
    VIDEO
    LINK
    TEXT
    DOCUMENT
  }

  # ============================================================================
  # TYPES
  # ============================================================================

  type GigRole {
    id: ID!
    name: String!
    slug: String!
    description: String
    category: GigRoleCategory!
    tier: Int!
    icon: String
    baseDanzRate: Float!
    requiresVerification: Boolean!
    verificationRequirements: JSON
    isActive: Boolean!
    createdAt: DateTime!
    # Computed fields
    registeredWorkers: Int
    approvedWorkers: Int
  }

  type UserGigRole {
    id: ID!
    userId: String!
    roleId: ID!
    status: UserGigRoleStatus!
    verifiedAt: DateTime
    verifiedBy: String
    portfolioUrls: [String!]
    certifications: [String!]
    experienceNotes: String
    rating: Float!
    totalGigsCompleted: Int!
    totalDanzEarned: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
    # Relations
    user: User
    role: GigRole!
  }

  type EventGig {
    id: ID!
    eventId: ID!
    roleId: ID!
    title: String!
    description: String
    slotsAvailable: Int!
    slotsFilled: Int!
    danzReward: Float!
    bonusDanz: Float
    timeCommitment: String
    specificRequirements: String
    approvalMode: GigApprovalMode!
    gigSource: GigSource!
    requiresLocal: Boolean!
    localRadiusKm: Int
    status: EventGigStatus!
    createdBy: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    # Relations
    event: Event
    role: GigRole!
    applications: [GigApplication!]
    approvedApplications: [GigApplication!]
    # Current user context
    myApplication: GigApplication
    canApply: Boolean!
  }

  type GigApplication {
    id: ID!
    gigId: ID!
    userId: String!
    userRoleId: ID!
    status: GigApplicationStatus!
    applicationNote: String
    # AI Review
    aiReviewScore: Float
    aiReviewNotes: JSON
    aiReviewedAt: DateTime
    # Manual Review
    reviewedBy: String
    reviewedAt: DateTime
    rejectionReason: String
    # Work Tracking
    checkInTime: DateTime
    checkOutTime: DateTime
    completionProof: JSON
    # Ratings
    organizerRating: Int
    organizerFeedback: String
    workerRating: Int
    workerFeedback: String
    # Payment
    danzAwarded: Float
    danzAwardedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    # Relations
    gig: EventGig!
    user: User!
    userRole: UserGigRole!
    reviewer: User
    submissions: [GigSubmission!]
  }

  type GigSubmission {
    id: ID!
    applicationId: ID!
    submissionType: GigSubmissionType!
    contentUrl: String
    contentText: String
    metadata: JSON
    aiReviewStatus: String
    aiReviewScore: Float
    aiReviewNotes: JSON
    manualReviewStatus: String
    reviewedBy: String
    reviewedAt: DateTime
    createdAt: DateTime!
    # Relations
    application: GigApplication!
  }

  type GigRewardRate {
    id: ID!
    roleId: ID
    actionType: String!
    rateName: String!
    rateType: String!
    baseAmount: Float!
    multiplier: Float!
    minAmount: Float
    maxAmount: Float
    description: String
    isActive: Boolean!
    createdAt: DateTime!
    # Relations
    role: GigRole
  }

  type EventGigManager {
    id: ID!
    eventId: ID!
    userId: String!
    assignedBy: String!
    assignedAt: DateTime!
    # Relations
    event: Event
    user: User!
    assigner: User!
  }

  # ============================================================================
  # STATS & DASHBOARD TYPES
  # ============================================================================

  type GigStats {
    totalGigsCompleted: Int!
    totalDanzEarned: Float!
    activeRoles: Int!
    currentApprovedGigs: Int!
    pendingApplications: Int!
    averageRating: Float
    lastGigDate: DateTime
  }

  type GigDashboard {
    stats: GigStats!
    myRoles: [UserGigRole!]!
    availableGigs: [EventGig!]!
    activeGigs: [GigApplication!]!
    recentHistory: [GigApplication!]!
  }

  type GigManagerDashboard {
    pendingRoleApplications: [UserGigRole!]!
    pendingGigApplications: [GigApplication!]!
    pendingSubmissions: [GigSubmission!]!
    recentlyApproved: [GigApplication!]!
    stats: GigManagerStats!
  }

  type GigManagerStats {
    totalReviewed: Int!
    approvedCount: Int!
    rejectedCount: Int!
    averageReviewTime: Float
    todayReviewed: Int!
  }

  # ============================================================================
  # INPUT TYPES
  # ============================================================================

  input ApplyForGigRoleInput {
    roleId: ID!
    portfolioUrls: [String!]
    certifications: [String!]
    experienceNotes: String
  }

  input UpdateGigRoleApplicationInput {
    portfolioUrls: [String!]
    certifications: [String!]
    experienceNotes: String
  }

  input CreateEventGigInput {
    eventId: ID!
    roleId: ID!
    title: String
    description: String
    slotsAvailable: Int!
    danzReward: Float!
    bonusDanz: Float
    timeCommitment: String
    specificRequirements: String
    approvalMode: GigApprovalMode
    gigSource: GigSource
    requiresLocal: Boolean
    localRadiusKm: Int
  }

  input UpdateEventGigInput {
    title: String
    description: String
    slotsAvailable: Int
    danzReward: Float
    bonusDanz: Float
    timeCommitment: String
    specificRequirements: String
    approvalMode: GigApprovalMode
    gigSource: GigSource
    requiresLocal: Boolean
    localRadiusKm: Int
    status: EventGigStatus
  }

  input GigProofInput {
    submissionType: GigSubmissionType!
    contentUrl: String
    contentText: String
    metadata: JSON
  }

  input ReviewGigApplicationInput {
    approved: Boolean!
    reason: String
    bonusDanz: Float
  }

  input ReviewGigSubmissionInput {
    approved: Boolean!
    notes: String
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  extend type Query {
    # ----- GIG ROLES -----
    # Get all available gig roles
    allGigRoles(category: GigRoleCategory, tier: Int, activeOnly: Boolean): [GigRole!]!

    # Get a specific gig role by ID or slug
    gigRole(id: ID, slug: String): GigRole

    # ----- USER GIG ROLES -----
    # Get current user's gig roles
    myGigRoles(status: UserGigRoleStatus): [UserGigRole!]!

    # Get a specific user's gig roles (for viewing profiles)
    userGigRoles(userId: ID!): [UserGigRole!]!

    # ----- EVENT GIGS -----
    # Get all gigs for a specific event
    eventGigs(eventId: ID!): [EventGig!]!

    # Get available gigs filtered by user's approved roles
    availableGigsForMe(eventId: ID, limit: Int, offset: Int): [EventGig!]!

    # Get a specific gig by ID
    eventGig(id: ID!): EventGig

    # ----- GIG APPLICATIONS -----
    # Get current user's gig applications
    myGigApplications(status: GigApplicationStatus, limit: Int, offset: Int): [GigApplication!]!

    # Get applications for a specific gig (for organizers/managers)
    gigApplications(gigId: ID!, status: GigApplicationStatus): [GigApplication!]!

    # Get a specific application by ID
    gigApplication(id: ID!): GigApplication

    # ----- DASHBOARD & STATS -----
    # Get comprehensive gig stats for current user
    myGigStats: GigStats!

    # Get full gig dashboard data
    myGigDashboard: GigDashboard!

    # Get gig manager dashboard (requires gig_manager role)
    gigManagerDashboard: GigManagerDashboard!

    # ----- REWARD RATES -----
    # Get reward rates (for transparency/display)
    gigRewardRates(roleId: ID): [GigRewardRate!]!

    # ----- EVENT GIG MANAGERS -----
    # Get gig managers for an event
    eventGigManagers(eventId: ID!): [EventGigManager!]!
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  extend type Mutation {
    # ----- USER GIG ROLE MANAGEMENT -----
    # Apply for a gig role (add a skill to your profile)
    applyForGigRole(input: ApplyForGigRoleInput!): UserGigRole!

    # Update your gig role application
    updateGigRoleApplication(id: ID!, input: UpdateGigRoleApplicationInput!): UserGigRole!

    # Withdraw a gig role application
    withdrawGigRoleApplication(id: ID!): MutationResponse!

    # ----- GIG MANAGER: ROLE REVIEW -----
    # Review a user's gig role application (approve/reject)
    reviewGigRoleApplication(id: ID!, approved: Boolean!, reason: String): UserGigRole!

    # ----- EVENT GIG MANAGEMENT (Organizers) -----
    # Create a new gig for an event
    createEventGig(input: CreateEventGigInput!): EventGig!

    # Update an existing event gig
    updateEventGig(id: ID!, input: UpdateEventGigInput!): EventGig!

    # Delete an event gig (only if no approved applications)
    deleteEventGig(id: ID!): MutationResponse!

    # Cancel an event gig (returns applications to pending)
    cancelEventGig(id: ID!, reason: String): EventGig!

    # ----- GIG APPLICATIONS -----
    # Apply for a gig at an event
    applyForGig(gigId: ID!, note: String): GigApplication!

    # Withdraw your gig application
    withdrawGigApplication(applicationId: ID!): GigApplication!

    # ----- GIG MANAGER: APPLICATION REVIEW -----
    # Review a gig application (approve/reject)
    reviewGigApplication(applicationId: ID!, input: ReviewGigApplicationInput!): GigApplication!

    # ----- WORK COMPLETION -----
    # Check in to start working a gig
    checkInToGig(applicationId: ID!): GigApplication!

    # Check out after completing work
    checkOutFromGig(applicationId: ID!): GigApplication!

    # Submit proof of work
    submitGigProof(applicationId: ID!, input: GigProofInput!): GigSubmission!

    # ----- GIG MANAGER: SUBMISSION REVIEW -----
    # Review a work submission
    reviewGigSubmission(submissionId: ID!, input: ReviewGigSubmissionInput!): GigSubmission!

    # Complete a gig and award $DANZ
    completeGigAndAward(applicationId: ID!, bonusDanz: Float): GigApplication!

    # ----- RATINGS -----
    # Rate a gig worker (as organizer)
    rateGigWorker(applicationId: ID!, rating: Int!, feedback: String): GigApplication!

    # Rate a gig organizer (as worker)
    rateGigOrganizer(applicationId: ID!, rating: Int!, feedback: String): GigApplication!

    # ----- EVENT GIG MANAGERS -----
    # Assign a gig manager to an event
    assignEventGigManager(eventId: ID!, userId: String!): EventGigManager!

    # Remove a gig manager from an event
    removeEventGigManager(eventId: ID!, userId: String!): MutationResponse!

    # ----- ADMIN: GIG MANAGER PROMOTION -----
    # Promote a user to platform gig manager
    promoteToGigManager(userId: String!): User!

    # Demote a platform gig manager
    demoteGigManager(userId: String!): User!
  }
`

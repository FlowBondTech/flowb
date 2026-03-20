import { gql } from 'graphql-tag'

export const adminTypeDefs = gql`
  type AdminStats {
    totalUsers: Int!
    totalEvents: Int!
    totalRevenue: Float!
    activeUsers: Int!
    upcomingEvents: Int!
    newUsersThisMonth: Int!
    eventsThisMonth: Int!
  }

  extend type Query {
    # Admin queries (requires admin role)
    adminStats: AdminStats!

    # Get all users with their stats (admin only)
    getAllUsers: [User!]!

    # Get all events (admin only)
    getAllEvents(
      status: EventStatus
      category: EventCategory
      facilitator_id: String
      limit: Int = 50
      offset: Int = 0
    ): AdminEventConnection!

    # Get all event registrations (admin only)
    getAllEventRegistrations: [EventRegistration!]!

    pendingOrganizers(
      pagination: PaginationInput
    ): UserConnection!

    reportedContent(
      type: String
      status: String
      pagination: PaginationInput
    ): JSON

    # Admin notifications query
    getAllNotifications(
      type: String
      limit: Int = 50
      offset: Int = 0
    ): AdminNotificationConnection!

    # Admin referral statistics
    getAdminReferralStats: AdminReferralStats!
  }

  type AdminNotificationConnection {
    notifications: [AdminNotification!]!
    totalCount: Int!
    unreadCount: Int!
  }

  type AdminNotification {
    id: ID!
    type: String!
    title: String!
    message: String
    recipient_id: String!
    recipient: User
    sender_id: String
    sender: User
    sender_type: String
    read: Boolean!
    created_at: DateTime!
  }

  type AdminReferralStats {
    totalReferrals: Int!
    completedReferrals: Int!
    pendingReferrals: Int!
    totalPointsAwarded: Int!
    topReferrers: [TopReferrer!]!
    referralsThisMonth: Int!
    conversionRate: Float!
  }

  type TopReferrer {
    user_id: String!
    username: String
    display_name: String
    referral_count: Int!
    points_earned: Int!
  }

  type AdminEventConnection {
    events: [Event!]!
    totalCount: Int!
    upcomingCount: Int!
    pastCount: Int!
    cancelledCount: Int!
  }

  extend type Mutation {
    # Admin mutations (requires admin role)
    updateUserRole(
      userId: String!
      role: UserRole!
    ): User!

    approveOrganizer(
      userId: String!
      approved: Boolean!
      rejection_reason: String
    ): User!

    featureEvent(
      eventId: ID!
      featured: Boolean!
    ): Event!

    # Admin event management
    adminDeleteEvent(eventId: ID!): MutationResponse!
  }

  # ========================================
  # POINTS SYSTEM - Admin Management
  # ========================================

  scalar JSON

  type PointAction {
    id: ID!
    action_key: String!
    action_name: String!
    description: String
    points_value: Int!
    category: PointActionCategory!
    is_active: Boolean!
    requires_verification: Boolean!
    max_per_day: Int
    max_per_week: Int
    max_per_month: Int
    created_at: DateTime!
    updated_at: DateTime!

    # Analytics
    total_transactions: Int
    unique_users: Int
    total_points_awarded: Int
    avg_points_per_transaction: Float
    last_awarded_at: DateTime
  }

  enum PointActionCategory {
    social
    activity
    event
    referral
    achievement
    special
    admin
  }

  input CreatePointActionInput {
    action_key: String!
    action_name: String!
    description: String
    points_value: Int!
    category: PointActionCategory!
    is_active: Boolean
    requires_verification: Boolean
    max_per_day: Int
    max_per_week: Int
    max_per_month: Int
  }

  input UpdatePointActionInput {
    action_key: String!
    action_name: String
    description: String
    points_value: Int
    category: PointActionCategory
    is_active: Boolean
    requires_verification: Boolean
    max_per_day: Int
    max_per_week: Int
    max_per_month: Int
  }

  type PointTransaction {
    id: ID!
    user_id: String!
    action_key: String!
    points_amount: Int!
    transaction_type: TransactionType!
    reference_id: ID
    reference_type: ReferenceType
    metadata: JSON
    admin_user_id: String
    admin_note: String
    status: TransactionStatus!
    created_at: DateTime!

    # Relationships
    user: User
    action: PointAction
    admin_user: User
  }

  enum TransactionType {
    earn
    spend
    bonus
    penalty
    adjustment
    refund
  }

  enum TransactionStatus {
    pending
    completed
    reversed
    failed
  }

  enum ReferenceType {
    dance_session
    event
    referral
    achievement
    purchase
    admin
  }

  input AwardPointsInput {
    user_id: String!
    action_key: String!
    reference_id: ID
    reference_type: ReferenceType
    metadata: JSON
  }

  input ManualPointsInput {
    user_id: String!
    points_amount: Int!
    transaction_type: TransactionType!
    admin_note: String!
    metadata: JSON
  }

  type DailyActivity {
    id: ID!
    user_id: String!
    activity_date: String!
    app_opened: Boolean!
    app_opened_at: DateTime
    first_session_completed: Boolean!
    sessions_completed: Int!
    total_dance_time: Int!
    events_attended: Int!
    social_interactions: Int!
    points_earned_today: Int!
    streak_day: Int!
    created_at: DateTime!
    updated_at: DateTime!

    # Relationship
    user: User
  }

  type EventAttendance {
    id: ID!
    event_id: ID!
    user_id: String!
    registration_id: ID
    checked_in: Boolean!
    checked_in_at: DateTime
    checked_out: Boolean!
    checked_out_at: DateTime
    duration_minutes: Int!
    points_earned: Int!
    attendance_verified: Boolean!
    verified_by: String
    verified_at: DateTime
    created_at: DateTime!
    updated_at: DateTime!

    # Relationships
    event: Event
    user: User
    verifier: User
  }

  input CheckInEventInput {
    event_id: ID!
    user_id: String!
  }

  input CheckOutEventInput {
    attendance_id: ID!
  }

  input VerifyAttendanceInput {
    attendance_id: ID!
    points_awarded: Int!
  }

  type PointsOverview {
    total_points_issued: Int!
    total_points_spent: Int!
    total_active_users: Int!
    avg_points_per_user: Float!
    top_earning_action: PointAction
    points_issued_today: Int!
    points_issued_this_week: Int!
    points_issued_this_month: Int!
  }

  type UserPointsSummary {
    privy_id: String!
    username: String
    total_points_earned: Int!
    total_points_spent: Int!
    current_points_balance: Int!
    xp: Int!
    level: Int!
    total_transactions: Int!
    unique_actions: Int!
    last_transaction_at: DateTime
    transactions_last_week: Int!
    points_last_week: Int!
  }

  type EventAttendanceSummary {
    event_id: ID!
    event_name: String!
    start_date: DateTime!
    end_date: DateTime
    total_attendees: Int!
    checked_in_count: Int!
    verified_count: Int!
    avg_duration_minutes: Float
    total_points_awarded: Int!
    avg_points_per_attendee: Float
  }

  type TransactionHistory {
    transactions: [PointTransaction!]!
    total_count: Int!
    has_more: Boolean!
  }

  extend type Query {
    # Point Actions
    getAllPointActions(category: PointActionCategory, is_active: Boolean): [PointAction!]!
    getPointAction(action_key: String!): PointAction

    # Transactions
    getUserTransactions(
      user_id: String!
      limit: Int = 50
      offset: Int = 0
      status: TransactionStatus
    ): TransactionHistory!

    getAllTransactions(
      limit: Int = 100
      offset: Int = 0
      action_key: String
      status: TransactionStatus
      start_date: DateTime
      end_date: DateTime
    ): TransactionHistory!

    # Daily Activity
    getUserDailyActivity(
      user_id: String!
      start_date: String!
      end_date: String!
    ): [DailyActivity!]!

    # Event Attendance
    getEventAttendance(event_id: ID!): [EventAttendance!]!
    getUserEventAttendance(user_id: String!): [EventAttendance!]!

    # Analytics (Admin Only)
    getPointsOverview: PointsOverview!
    getUserPointsSummaries(
      limit: Int = 50
      offset: Int = 0
      sort_by: String = "total_points_earned"
      sort_order: String = "DESC"
    ): [UserPointsSummary!]!
    getEventAttendanceSummaries: [EventAttendanceSummary!]!
  }

  extend type Mutation {
    # Point Actions Management (Admin Only)
    createPointAction(input: CreatePointActionInput!): PointAction!
    updatePointAction(input: UpdatePointActionInput!): PointAction!
    deletePointAction(action_key: String!): MutationResponse!
    togglePointAction(action_key: String!): PointAction!

    # Award Points
    awardPoints(input: AwardPointsInput!): PointTransaction!
    awardManualPoints(input: ManualPointsInput!): PointTransaction!
    verifyPointTransaction(transaction_id: ID!): PointTransaction!
    reversePointTransaction(transaction_id: ID!, reason: String!): PointTransaction!

    # Event Attendance
    checkInEvent(input: CheckInEventInput!): EventAttendance!
    checkOutEvent(input: CheckOutEventInput!): EventAttendance!
    verifyEventAttendance(input: VerifyAttendanceInput!): EventAttendance!

    # Daily Activity
    trackAppOpen(user_id: String!): DailyActivity!
  }
`

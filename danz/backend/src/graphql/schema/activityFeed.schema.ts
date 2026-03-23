import { gql } from 'graphql-tag'

export const activityFeedTypeDefs = gql`
  # ============================================
  # LIVE ACTIVITY FEED
  # Real-time activity stream for dashboard and social features
  # ============================================

  enum ActivityType {
    # User activities
    USER_JOINED
    USER_LEVEL_UP
    USER_ACHIEVEMENT
    USER_STREAK

    # Dance activities
    DANCE_SESSION_COMPLETED
    DANCE_SESSION_SHARED
    HIGH_SCORE_ACHIEVED
    DANCE_MILESTONE

    # Social activities
    NEW_DANCE_BOND
    DANCE_BOND_STRENGTHENED
    POST_CREATED
    POST_LIKED
    POST_COMMENTED

    # Event activities
    EVENT_CREATED
    EVENT_JOINED
    EVENT_CHECKIN
    EVENT_COMPLETED

    # Challenge activities
    CHALLENGE_STARTED
    CHALLENGE_COMPLETED
    CHALLENGE_STREAK

    # Referral activities
    REFERRAL_INVITED
    REFERRAL_JOINED
    REFERRAL_BONUS

    # System activities
    LEADERBOARD_RANK_UP
    SEASON_REWARD
    SPECIAL_ANNOUNCEMENT
  }

  enum ActivityVisibility {
    PUBLIC
    FRIENDS
    PRIVATE
  }

  type Activity {
    id: ID!
    activity_type: ActivityType!
    user_id: String!
    target_user_id: String
    visibility: ActivityVisibility!

    # Context
    title: String!
    description: String
    icon: String
    color: String

    # Related entities
    related_entity_type: String
    related_entity_id: String

    # Metadata
    metadata: JSON
    xp_earned: Int
    points_earned: Int

    # Engagement
    likes_count: Int!
    comments_count: Int!
    is_liked_by_me: Boolean
    is_highlighted: Boolean!

    created_at: DateTime!

    # Relations
    user: User!
    target_user: User
  }

  type ActivityFeed {
    activities: [Activity!]!
    total_count: Int!
    has_more: Boolean!
    last_activity_id: String
    unread_count: Int!
  }

  type ActivityStats {
    today_activities: Int!
    this_week_activities: Int!
    total_activities: Int!
    most_active_type: ActivityType
    engagement_rate: Float!
    trending_now: [Activity!]!
  }

  type LiveActivityUpdate {
    type: String!
    activity: Activity!
    timestamp: DateTime!
  }

  type ActivityGroup {
    date: String!
    activities: [Activity!]!
    summary: String!
  }

  type TrendingActivity {
    activity: Activity!
    engagement_score: Float!
    trending_rank: Int!
  }

  # Input types
  input ActivityFilter {
    types: [ActivityType!]
    user_id: String
    visibility: ActivityVisibility
    from_date: DateTime
    to_date: DateTime
    has_rewards: Boolean
  }

  # Queries
  extend type Query {
    # Main feeds
    activityFeed(
      filter: ActivityFilter
      limit: Int
      after: String
    ): ActivityFeed!

    globalActivityFeed(limit: Int, after: String): ActivityFeed!
    friendsActivityFeed(limit: Int, after: String): ActivityFeed!
    myActivityFeed(limit: Int, after: String): ActivityFeed!

    # Specific activities
    activity(id: String!): Activity
    userActivities(userId: String!, limit: Int): [Activity!]!

    # Grouped views
    activityFeedGrouped(
      groupBy: String!
      limit: Int
    ): [ActivityGroup!]!

    # Trending
    trendingActivities(limit: Int): [TrendingActivity!]!
    trendingNow: [Activity!]!

    # Stats
    activityStats: ActivityStats!
    myActivityStats: ActivityStats!

    # Real-time
    recentActivities(
      since: DateTime!
      types: [ActivityType!]
    ): [Activity!]!
  }

  # Mutations
  extend type Mutation {
    # Engagement
    likeActivity(activityId: String!): Activity!
    unlikeActivity(activityId: String!): Activity!
    commentOnActivity(activityId: String!, comment: String!): Activity!

    # Activity management
    hideActivity(activityId: String!): MutationResponse!
    reportActivity(activityId: String!, reason: String!): MutationResponse!

    # System (internal use)
    createActivity(
      type: ActivityType!
      userId: String!
      targetUserId: String
      title: String!
      description: String
      metadata: JSON
      visibility: ActivityVisibility
    ): Activity!

    markActivitiesRead(activityIds: [String!]!): MutationResponse!
    markAllActivitiesRead: MutationResponse!

    # Admin
    highlightActivity(activityId: String!): Activity!
    deleteActivity(activityId: String!): MutationResponse!
    createAnnouncement(
      title: String!
      description: String!
      metadata: JSON
    ): Activity!
  }
`

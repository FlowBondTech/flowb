import { gql } from 'graphql-tag'

export const leaderboardTypeDefs = gql`
  # ============================================
  # LEADERBOARDS API
  # Global, regional, friends, and event leaderboards
  # ============================================

  enum LeaderboardType {
    GLOBAL
    REGIONAL
    FRIENDS
    EVENT
    WEEKLY
    MONTHLY
    ALL_TIME
  }

  enum LeaderboardMetric {
    XP
    POINTS
    DANCE_TIME
    MOVEMENT_SCORE
    CALORIES
    STREAK
    EVENTS_ATTENDED
    CHALLENGES_COMPLETED
    REFERRALS
    SOCIAL_ENGAGEMENT
  }

  type LeaderboardEntry {
    rank: Int!
    previous_rank: Int
    rank_change: Int
    user_id: String!
    username: String!
    display_name: String
    avatar_url: String
    level: Int!
    value: Float!
    is_current_user: Boolean!
    badges: [String!]
    country: String
    city: String
  }

  type Leaderboard {
    type: LeaderboardType!
    metric: LeaderboardMetric!
    period: String!
    updated_at: DateTime!
    total_participants: Int!
    entries: [LeaderboardEntry!]!
    current_user_entry: LeaderboardEntry
    nearby_entries: [LeaderboardEntry!]
  }

  type LeaderboardSummary {
    global_rank: Int
    regional_rank: Int
    friends_rank: Int
    weekly_change: Int
    monthly_change: Int
    top_metric: LeaderboardMetric
    top_metric_rank: Int
    percentile: Float
  }

  type LeaderboardHistory {
    dates: [String!]!
    ranks: [Int!]!
    values: [Float!]!
  }

  type RegionalLeaderboard {
    region: String!
    country: String
    city: String
    leaderboard: Leaderboard!
  }

  type EventLeaderboard {
    event_id: String!
    event_name: String!
    leaderboard: Leaderboard!
    prizes: [LeaderboardPrize!]
  }

  type LeaderboardPrize {
    rank_from: Int!
    rank_to: Int!
    prize_type: String!
    prize_value: String!
    prize_description: String
  }

  type SeasonalLeaderboard {
    season_id: String!
    season_name: String!
    starts_at: DateTime!
    ends_at: DateTime!
    current_rewards: [SeasonReward!]!
    leaderboard: Leaderboard!
  }

  type SeasonReward {
    tier: String!
    min_rank: Int!
    max_rank: Int!
    rewards: JSON!
  }

  # Queries
  extend type Query {
    # Main leaderboards
    leaderboard(
      type: LeaderboardType!
      metric: LeaderboardMetric!
      limit: Int
      offset: Int
    ): Leaderboard!

    # Quick access
    globalLeaderboard(metric: LeaderboardMetric!, limit: Int): Leaderboard!
    weeklyLeaderboard(metric: LeaderboardMetric!, limit: Int): Leaderboard!
    monthlyLeaderboard(metric: LeaderboardMetric!, limit: Int): Leaderboard!
    friendsLeaderboard(metric: LeaderboardMetric!, limit: Int): Leaderboard!

    # Regional
    regionalLeaderboard(
      metric: LeaderboardMetric!
      country: String
      city: String
      limit: Int
    ): RegionalLeaderboard!

    # Event-specific
    eventLeaderboard(eventId: String!, limit: Int): EventLeaderboard

    # Seasonal
    currentSeasonLeaderboard: SeasonalLeaderboard
    seasonLeaderboard(seasonId: String!): SeasonalLeaderboard

    # User-specific
    myLeaderboardSummary: LeaderboardSummary!
    myLeaderboardHistory(
      metric: LeaderboardMetric!
      days: Int
    ): LeaderboardHistory!

    # Discovery
    nearbyUsers(
      metric: LeaderboardMetric!
      range: Int
    ): [LeaderboardEntry!]!

    # Top performers
    topPerformers(
      metric: LeaderboardMetric!
      period: String!
      limit: Int
    ): [LeaderboardEntry!]!
  }

  # Mutations (mostly admin)
  extend type Mutation {
    # Refresh leaderboards (admin/system)
    refreshLeaderboard(type: LeaderboardType!, metric: LeaderboardMetric!): Leaderboard!
    refreshAllLeaderboards: MutationResponse!

    # Season management (admin)
    createSeason(
      name: String!
      startsAt: DateTime!
      endsAt: DateTime!
      rewards: JSON!
    ): SeasonalLeaderboard!
    endSeason(seasonId: String!): MutationResponse!

    # Event leaderboard (admin)
    createEventLeaderboard(
      eventId: String!
      prizes: JSON
    ): EventLeaderboard!
    finalizeEventLeaderboard(eventId: String!): EventLeaderboard!
  }
`

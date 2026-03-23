import { gql } from 'graphql-tag'

export const challengeTypeDefs = gql`
  # ============================================
  # DAILY CHALLENGES SYSTEM
  # Gamification with daily/weekly/special challenges
  # ============================================

  enum ChallengeType {
    DAILY
    WEEKLY
    SPECIAL
    EVENT
    STREAK
    SOCIAL
  }

  enum ChallengeDifficulty {
    EASY
    MEDIUM
    HARD
    EXTREME
  }

  enum ChallengeCategory {
    DANCE_TIME
    MOVEMENT_SCORE
    CALORIES
    SOCIAL
    STREAK
    EXPLORATION
    MASTERY
    COMMUNITY
  }

  enum ChallengeStatus {
    AVAILABLE
    IN_PROGRESS
    COMPLETED
    EXPIRED
    CLAIMED
  }

  type Challenge {
    id: ID!
    title: String!
    description: String!
    challenge_type: ChallengeType!
    difficulty: ChallengeDifficulty!
    category: ChallengeCategory!

    # Requirements
    target_value: Int!
    target_unit: String!
    time_limit_hours: Int

    # Rewards
    xp_reward: Int!
    points_reward: Int!
    badge_reward: String
    special_reward: JSON

    # Availability
    starts_at: DateTime
    ends_at: DateTime
    is_active: Boolean!
    is_repeatable: Boolean!
    cooldown_hours: Int
    max_completions: Int

    # Requirements
    min_level: Int
    required_badges: [String!]

    created_at: DateTime!
    updated_at: DateTime!
  }

  type UserChallenge {
    id: ID!
    user_id: String!
    challenge_id: String!
    status: ChallengeStatus!
    progress: Int!
    started_at: DateTime!
    completed_at: DateTime
    claimed_at: DateTime
    expires_at: DateTime
    completion_count: Int!
    created_at: DateTime!
    updated_at: DateTime!

    challenge: Challenge!
    user: User
  }

  type DailyChallengeset {
    date: String!
    challenges: [Challenge!]!
    user_progress: [UserChallenge!]
    total_xp_available: Int!
    total_points_available: Int!
  }

  type ChallengeProgress {
    challenge: Challenge!
    user_challenge: UserChallenge
    current_progress: Int!
    target_value: Int!
    percentage: Float!
    time_remaining: Int
    is_claimable: Boolean!
  }

  type ChallengeStats {
    total_completed: Int!
    total_xp_earned: Int!
    total_points_earned: Int!
    current_streak: Int!
    longest_streak: Int!
    badges_earned: [String!]!
    favorite_category: ChallengeCategory
    completion_rate: Float!
    challenges_by_difficulty: JSON!
  }

  type ChallengeLeaderboard {
    period: String!
    entries: [ChallengeLeaderboardEntry!]!
  }

  type ChallengeLeaderboardEntry {
    rank: Int!
    user: User!
    challenges_completed: Int!
    xp_earned: Int!
    points_earned: Int!
  }

  # Input types
  input CreateChallengeInput {
    title: String!
    description: String!
    challenge_type: ChallengeType!
    difficulty: ChallengeDifficulty!
    category: ChallengeCategory!
    target_value: Int!
    target_unit: String!
    time_limit_hours: Int
    xp_reward: Int!
    points_reward: Int!
    badge_reward: String
    special_reward: JSON
    starts_at: DateTime
    ends_at: DateTime
    is_repeatable: Boolean
    cooldown_hours: Int
    max_completions: Int
    min_level: Int
    required_badges: [String!]
  }

  # Queries
  extend type Query {
    # Available challenges
    dailyChallenges: DailyChallengeset!
    weeklyChallenges: [Challenge!]!
    specialChallenges: [Challenge!]!
    availableChallenges(type: ChallengeType, category: ChallengeCategory): [Challenge!]!

    # User's challenges
    myActiveChallenges: [UserChallenge!]!
    myCompletedChallenges(limit: Int, offset: Int): [UserChallenge!]!
    myChallengeProgress(challengeId: String!): ChallengeProgress

    # Stats
    myChallengeStats: ChallengeStats!
    challengeLeaderboard(type: ChallengeType!, period: String!): ChallengeLeaderboard!

    # Admin
    allChallenges(type: ChallengeType, isActive: Boolean): [Challenge!]!
    challengeById(id: String!): Challenge
  }

  # Mutations
  extend type Mutation {
    # Player actions
    startChallenge(challengeId: String!): UserChallenge!
    updateChallengeProgress(challengeId: String!, progress: Int!): UserChallenge!
    claimChallengeReward(challengeId: String!): UserChallenge!
    abandonChallenge(challengeId: String!): MutationResponse!

    # Admin actions
    createChallenge(input: CreateChallengeInput!): Challenge!
    updateChallenge(id: String!, input: CreateChallengeInput!): Challenge!
    deleteChallenge(id: String!): MutationResponse!
    activateChallenge(id: String!): Challenge!
    deactivateChallenge(id: String!): Challenge!

    # System actions (internal use)
    refreshDailyChallenges: DailyChallengeset!
    processExpiredChallenges: MutationResponse!
  }
`

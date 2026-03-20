import { gql } from 'graphql-tag'

export const achievementTypeDefs = gql`
  # Achievement category types
  enum AchievementCategory {
    SESSIONS      # Based on number of sessions
    DURATION      # Based on total dance time
    STREAK        # Based on consecutive days
    MOVEMENT      # Based on movement quality
    MILESTONE     # Special milestones
    SOCIAL        # Social achievements
    SPECIAL       # Limited time or special achievements
  }

  # Achievement rarity levels
  enum AchievementRarity {
    COMMON
    UNCOMMON
    RARE
    EPIC
    LEGENDARY
  }

  # Extended Achievement type with more details
  type AchievementDetails {
    id: ID!
    user_id: String!
    achievement_type: String!
    title: String!
    description: String
    icon: String
    category: AchievementCategory!
    rarity: AchievementRarity!
    xp_reward: Int!
    danz_reward: Float!
    unlocked_at: DateTime
    progress: Int
    target: Int
    is_unlocked: Boolean!
  }

  # Achievement definition (template)
  type AchievementDefinition {
    type: String!
    title: String!
    description: String!
    icon: String!
    category: AchievementCategory!
    rarity: AchievementRarity!
    xp_reward: Int!
    danz_reward: Float!
    target: Int!
    hidden: Boolean!
  }

  # Achievement progress for a user
  type AchievementProgress {
    achievement_type: String!
    title: String!
    description: String!
    icon: String!
    category: AchievementCategory!
    rarity: AchievementRarity!
    xp_reward: Int!
    danz_reward: Float!
    current_progress: Int!
    target: Int!
    percentage: Float!
    is_unlocked: Boolean!
    unlocked_at: DateTime
  }

  # Newly unlocked achievement response
  type UnlockedAchievement {
    achievement: AchievementDetails!
    is_new: Boolean!
  }

  # Achievement check result after session
  type AchievementCheckResult {
    newly_unlocked: [AchievementDetails!]!
    total_xp_earned: Int!
    total_danz_earned: Float!
  }

  # Achievement statistics
  type AchievementStats {
    total_unlocked: Int!
    total_available: Int!
    total_xp_earned: Int!
    total_danz_earned: Float!
    by_category: [CategoryCount!]!
    by_rarity: [RarityCount!]!
    recent_unlocks: [AchievementDetails!]!
  }

  type CategoryCount {
    category: AchievementCategory!
    unlocked: Int!
    total: Int!
  }

  type RarityCount {
    rarity: AchievementRarity!
    unlocked: Int!
    total: Int!
  }

  extend type Query {
    # Get all achievements for current user with progress
    myAchievements: [AchievementProgress!]!

    # Get unlocked achievements only
    myUnlockedAchievements: [AchievementDetails!]!

    # Get achievement statistics
    myAchievementStats: AchievementStats!

    # Get all available achievement definitions
    achievementDefinitions: [AchievementDefinition!]!

    # Get achievements by category
    achievementsByCategory(category: AchievementCategory!): [AchievementProgress!]!

    # Check if specific achievement is unlocked
    isAchievementUnlocked(achievementType: String!): Boolean!
  }

  extend type Mutation {
    # Manually trigger achievement check (usually automatic)
    checkAchievements: AchievementCheckResult!

    # Claim achievement rewards (if not auto-claimed)
    claimAchievementReward(achievementType: String!): AchievementDetails!
  }
`

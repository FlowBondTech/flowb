import { gql } from 'graphql-tag'

export const danceSessionTypeDefs = gql`
  type DanceSession {
    id: ID!
    user_id: String!
    user: User!

    # Duration & Timestamp
    duration: Int!
    started_at: DateTime!
    ended_at: DateTime!
    created_at: DateTime!
    updated_at: DateTime!

    # Movement Metrics
    bpm_average: Float
    bpm_peak: Float
    motion_intensity_avg: Float
    movement_score: Int
    calories_burned: Int

    # XP & Progression
    xp_earned: Int!
    level_at_session: Int
    level_ups: Int
    achievements_unlocked: [String!]

    # Social Features
    is_shared: Boolean!
    shared_with_users: [User!]
    shared_with_user_ids: [String!]
    dance_bonds_strengthened: [DanceBond!]
    social_xp_bonus: Int

    # Metadata
    device_type: String
    app_version: String
    session_quality: Float
  }

  type DanceSessionStats {
    total_sessions: Int!
    total_duration: Int!
    total_xp_earned: Int!
    total_calories: Int!
    best_score: Int!
    best_duration: Int!
    average_bpm: Float
    current_streak: Int!
    longest_streak: Int!
  }

  type DanceSessionConnection {
    sessions: [DanceSession!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input SaveDanceSessionInput {
    # Duration & Timestamp
    duration: Int!
    started_at: DateTime!
    ended_at: DateTime!

    # Movement Metrics
    bpm_average: Float
    bpm_peak: Float
    motion_intensity_avg: Float
    movement_score: Int
    calories_burned: Int

    # XP & Progression
    xp_earned: Int!
    achievements_unlocked: [String!]

    # Social Features
    is_shared: Boolean
    shared_with_user_ids: [String!]

    # Metadata
    device_type: String
    app_version: String
    session_quality: Float
  }

  input DanceSessionFilterInput {
    user_id: String
    from_date: DateTime
    to_date: DateTime
    min_score: Int
    min_duration: Int
    is_shared: Boolean
  }

  extend type Query {
    # Get user's dance sessions with pagination
    myDanceSessions(
      pagination: PaginationInput
      filter: DanceSessionFilterInput
    ): DanceSessionConnection!

    # Get a specific dance session
    danceSession(id: ID!): DanceSession

    # Get user's dance session statistics
    myDanceSessionStats: DanceSessionStats!

    # Get dance sessions from friends/dance bonds
    friendsDanceSessions(
      limit: Int
      offset: Int
    ): [DanceSession!]!
  }

  extend type Mutation {
    # Save a new dance session
    saveDanceSession(input: SaveDanceSessionInput!): DanceSession!

    # Share a dance session with other users
    shareDanceSession(
      sessionId: ID!
      userIds: [String!]!
    ): DanceSession!

    # Delete a dance session
    deleteDanceSession(sessionId: ID!): MutationResponse!
  }
`

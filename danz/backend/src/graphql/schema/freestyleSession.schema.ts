import { gql } from 'graphql-tag'

export const freestyleSessionTypeDefs = gql`
  enum MusicSource {
    licensed
    user_library
    none
  }

  type FreestyleSession {
    id: ID!
    user_id: String!
    user: User!

    # Session Details
    duration_seconds: Int! # Max 600 (10 minutes)
    movement_score: Float!
    points_awarded: Int!
    session_date: DateTime!
    completed: Boolean!

    # Music & Motion
    music_source: MusicSource!
    motion_data: JSON # Raw accelerometer/gyroscope data

    # Achievements unlocked in this session
    achievements_unlocked: [String!]

    # Timestamps
    created_at: DateTime!
    updated_at: DateTime!
  }

  type FreestyleSessionStats {
    total_sessions: Int!
    total_duration_seconds: Int!
    total_points: Int!
    average_movement_score: Float!
    best_movement_score: Float!
    sessions_this_week: Int!
    current_streak: Int! # Consecutive days with sessions
    longest_streak: Int!
    last_session_date: DateTime
  }

  type UserPreferences {
    daily_reminder_enabled: Boolean!
    daily_reminder_time: String! # Time in HH:MM format
    live_sessions_enabled: Boolean! # For future partner feature
  }

  input CreateFreestyleSessionInput {
    duration_seconds: Int!
    movement_score: Float!
    music_source: MusicSource
    motion_data: JSON
    completed: Boolean
  }

  input UpdateUserPreferencesInput {
    daily_reminder_enabled: Boolean
    daily_reminder_time: String
    live_sessions_enabled: Boolean
  }

  extend type Query {
    # Get user's freestyle sessions
    myFreestyleSessions(
      limit: Int
      offset: Int
    ): [FreestyleSession!]!

    # Get a specific freestyle session
    freestyleSession(id: ID!): FreestyleSession

    # Get freestyle session statistics
    myFreestyleStats: FreestyleSessionStats!

    # Get user's freestyle preferences
    myFreestylePreferences: UserPreferences!

    # Check if user completed freestyle today
    completedFreestyleToday: Boolean!
  }

  extend type Mutation {
    # Create a new freestyle session
    createFreestyleSession(input: CreateFreestyleSessionInput!): FreestyleSession!

    # Update user preferences for freestyle sessions
    updateFreestylePreferences(input: UpdateUserPreferencesInput!): UserPreferences!

    # Delete a freestyle session
    deleteFreestyleSession(sessionId: ID!): MutationResponse!
  }
`

import { gql } from 'graphql-tag'

export const feedbackTypeDefs = gql`
  # ========================================
  # FEEDBACK TYPES
  # ========================================

  type Feedback {
    id: ID!
    user_id: String!
    user: User
    message: String!
    screenshot_url: String
    device_info: String
    app_version: String
    status: FeedbackStatus!
    admin_notes: String
    resolved_at: DateTime
    resolved_by: String
    created_at: DateTime!
    updated_at: DateTime!
  }

  enum FeedbackStatus {
    pending
    reviewed
    in_progress
    resolved
    dismissed
  }

  # ========================================
  # INPUTS
  # ========================================

  input SubmitFeedbackInput {
    message: String!
    screenshot_url: String
    device_info: String
    app_version: String
  }

  input UpdateFeedbackStatusInput {
    feedback_id: ID!
    status: FeedbackStatus!
    admin_notes: String
  }

  # ========================================
  # QUERIES & MUTATIONS
  # ========================================

  extend type Query {
    """
    Get all feedback (admin only)
    """
    allFeedback(
      status: FeedbackStatus
      limit: Int
      offset: Int
    ): [Feedback!]!

    """
    Get feedback stats (admin only)
    """
    feedbackStats: FeedbackStats!
  }

  extend type Mutation {
    """
    Submit feedback from user
    """
    submitFeedback(input: SubmitFeedbackInput!): Feedback!

    """
    Update feedback status (admin only)
    """
    updateFeedbackStatus(input: UpdateFeedbackStatusInput!): Feedback!
  }

  # ========================================
  # STATS
  # ========================================

  type FeedbackStats {
    total: Int!
    pending: Int!
    reviewed: Int!
    in_progress: Int!
    resolved: Int!
    dismissed: Int!
  }
`

import { gql } from 'graphql-tag'

export const usernameChangeTypeDefs = gql`
  """
  Status of a username change request
  """
  enum UsernameChangeStatus {
    pending
    approved
    rejected
    auto_approved
  }

  """
  A request to change a user's username
  """
  type UsernameChangeRequest {
    id: ID!
    user_id: String!
    current_username: String!
    requested_username: String!
    reason: String
    status: UsernameChangeStatus!
    admin_note: String
    reviewed_by: String
    reviewed_at: DateTime
    created_at: DateTime!
    updated_at: DateTime!

    # Relationships
    user: User
    reviewer: User
  }

  """
  User's username change eligibility and history
  """
  type UsernameChangeEligibility {
    can_request: Boolean!
    is_first_change: Boolean!
    will_auto_approve: Boolean!
    pending_request: UsernameChangeRequest
    change_count: Int!
    last_change_at: DateTime
    cooldown_ends_at: DateTime
    message: String
  }

  """
  Result of a username change request submission
  """
  type UsernameChangeResult {
    success: Boolean!
    message: String!
    request: UsernameChangeRequest
    auto_approved: Boolean!
  }

  """
  Admin view of pending username change requests
  """
  type UsernameChangeRequestConnection {
    requests: [UsernameChangeRequest!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  extend type Query {
    """
    Get the current user's username change eligibility status
    """
    myUsernameChangeEligibility: UsernameChangeEligibility!

    """
    Get the current user's username change history
    """
    myUsernameChangeHistory: [UsernameChangeRequest!]!

    """
    Admin: Get all pending username change requests
    """
    pendingUsernameChangeRequests(
      pagination: PaginationInput
    ): UsernameChangeRequestConnection!

    """
    Admin: Get all username change requests with optional filters
    """
    allUsernameChangeRequests(
      status: UsernameChangeStatus
      pagination: PaginationInput
    ): UsernameChangeRequestConnection!
  }

  input RequestUsernameChangeInput {
    """
    The new username being requested
    """
    new_username: String!

    """
    Optional reason for the change (helpful for review)
    """
    reason: String
  }

  input ReviewUsernameChangeInput {
    """
    The request ID to review
    """
    request_id: ID!

    """
    Whether to approve or reject
    """
    approved: Boolean!

    """
    Admin note explaining the decision
    """
    admin_note: String
  }

  extend type Mutation {
    """
    Request a username change. First change is auto-approved, subsequent changes require admin review.
    """
    requestUsernameChange(input: RequestUsernameChangeInput!): UsernameChangeResult!

    """
    Cancel a pending username change request
    """
    cancelUsernameChangeRequest(request_id: ID!): MutationResponse!

    """
    Admin: Review (approve/reject) a username change request
    """
    reviewUsernameChangeRequest(input: ReviewUsernameChangeInput!): UsernameChangeRequest!
  }
`

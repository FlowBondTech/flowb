export const bondRequestTypeDefs = `#graphql
  # ==================== ENUMS ====================

  enum BondRequestStatus {
    pending
    accepted
    rejected
    expired
    cancelled
  }

  # ==================== TYPES ====================

  """
  Match/similarity reasons between two users
  """
  type MatchReasons {
    "Number of mutual bonds"
    mutual_bonds: Int!
    "Number of same events attended"
    same_events: Int!
    "Overlapping music preferences"
    music_overlap: [String!]!
    "Overlapping dance styles"
    dance_styles: [String!]!
    "Overall similarity score (0-1)"
    similarity_score: Float!
  }

  """
  Bond request between two users
  """
  type BondRequest {
    id: ID!
    "User who sent the request"
    requester: User!
    "User who received the request"
    recipient: User!
    status: BondRequestStatus!
    "Optional message from requester"
    message: String
    "Similarity data between users"
    match_reasons: MatchReasons
    created_at: DateTime!
    updated_at: DateTime!
    responded_at: DateTime
    expires_at: DateTime!
  }

  """
  Result of checking if bond request can be sent
  """
  type CanSendBondRequestResult {
    can_send: Boolean!
    reason: String
    "Similarity data if can_send is true"
    match_reasons: MatchReasons
  }

  """
  Stats about user's bond requests
  """
  type BondRequestStats {
    "Pending requests sent"
    pending_sent: Int!
    "Pending requests received"
    pending_received: Int!
    "Total bonds formed"
    total_bonds: Int!
    "Acceptance rate for sent requests"
    acceptance_rate: Float
  }

  # ==================== INPUTS ====================

  input SendBondRequestInput {
    "User to send request to"
    recipient_id: String!
    "Optional personal message"
    message: String
  }

  input RespondToBondRequestInput {
    "Request ID"
    request_id: ID!
    "Accept or reject"
    accept: Boolean!
  }

  # ==================== QUERIES ====================

  extend type Query {
    "Get pending bond requests received"
    myPendingBondRequests(limit: Int, offset: Int): [BondRequest!]!

    "Get bond requests sent by me"
    mySentBondRequests(limit: Int, offset: Int): [BondRequest!]!

    "Get a specific bond request"
    bondRequest(id: ID!): BondRequest

    "Check if I can send a bond request to a user"
    canSendBondRequestTo(user_id: String!): CanSendBondRequestResult!

    "Get similarity/match data with another user"
    getSimilarityWith(user_id: String!): MatchReasons!

    "Get bond request stats"
    myBondRequestStats: BondRequestStats!
  }

  # ==================== MUTATIONS ====================

  extend type Mutation {
    "Send a bond request"
    sendBondRequest(input: SendBondRequestInput!): BondRequest!

    "Accept or reject a bond request"
    respondToBondRequest(input: RespondToBondRequestInput!): BondRequest!

    "Cancel a pending request I sent"
    cancelBondRequest(request_id: ID!): Boolean!
  }
`

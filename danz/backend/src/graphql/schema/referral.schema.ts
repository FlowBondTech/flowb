import { gql } from 'graphql-tag'

export const referralTypeDefs = gql`
  type ReferralCode {
    id: ID!
    user_id: String!
    referral_code: String!
    created_at: DateTime!
    share_url: String!
    total_clicks: Int!
    total_signups: Int!
    total_completed: Int!
    user: User
  }

  type Referral {
    id: ID!
    referral_code: String!
    referrer_user_id: String!
    referee_user_id: String
    status: ReferralStatus!
    clicked_at: DateTime!
    signed_up_at: DateTime
    first_session_completed_at: DateTime
    completed_at: DateTime
    points_awarded: Int!
    ip_address: String
    device_id: String
    user_agent: String
    referrer: User
    referee: User
  }

  type ReferralStats {
    total_clicks: Int!
    total_signups: Int!
    total_completed: Int!
    total_points_earned: Int!
    conversion_rate: Float!
    pending_referrals: Int!
    completed_referrals: Int!
  }

  type ReferralClickTracking {
    id: ID!
    referral_code: String!
    clicked_at: DateTime!
    ip_address: String
    user_agent: String
    device_info: JSON
  }

  type ShareLinks {
    referral_code: String!
    short_url: String!
    sms_template: String!
    whatsapp_template: String!
    social_media_template: String!
  }

  type ReferralChainNode {
    user_id: String!
    username: String
    invited_by: String
    depth: Int!
  }

  type UserReferralInfo {
    privy_id: String!
    username: String
    display_name: String
    avatar_url: String
    created_at: DateTime!
    invited_by: String
  }

  enum ReferralStatus {
    clicked
    signed_up
    completed
  }

  input TrackReferralClickInput {
    referral_code: String!
    ip_address: String
    user_agent: String
    device_info: JSON
  }

  input CompleteReferralInput {
    referral_code: String!
    referee_user_id: String!
  }

  extend type Query {
    # Get referral by code (for landing page)
    getReferralByCode(code: String!): Referral

    # Get user's own referral code
    myReferralCode: ReferralCode

    # Get user's referral statistics
    myReferralStats: ReferralStats!

    # Get user's referrals with filtering
    myReferrals(
      limit: Int
      offset: Int
      status: ReferralStatus
    ): [Referral!]!

    # Get click stats for a referral code
    getReferralClickStats(code: String!): [ReferralClickTracking!]!

    # Get referral chain (who invited whom up the chain)
    getReferralChain(userId: String): [ReferralChainNode!]!

    # Get users invited by the current user (downline)
    getMyReferrals: [UserReferralInfo!]!
  }

  extend type Mutation {
    # Track when someone clicks a referral link
    trackReferralClick(input: TrackReferralClickInput!): MutationResponse!

    # Complete a referral (called when referee signs up)
    completeReferral(input: CompleteReferralInput!): Referral!

    # Mark referral as completed (first session done)
    markReferralCompleted(referralId: ID!): Referral!

    # Generate share links for user's referral code
    generateShareLinks: ShareLinks!

    # Send a nudge notification to a pending referral
    nudgeReferral(referralId: ID!, message: String): MutationResponse!
  }
`

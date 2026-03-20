import { gql } from 'graphql-tag'

export const userTypeDefs = gql`
  type User {
    privy_id: String!
    username: String
    display_name: String
    bio: String
    avatar_url: String
    cover_image_url: String
    location: String
    city: String
    latitude: Float
    longitude: Float
    website: String
    instagram: String
    tiktok: String
    youtube: String
    twitter: String
    dance_styles: [String!]
    skill_level: SkillLevel
    favorite_music: [String!]
    age: Int
    pronouns: String
    is_public: Boolean
    allow_messages: Boolean
    show_location: Boolean
    notification_preferences: JSON
    xp: Int
    level: Int
    subscription_tier: String
    # Premium subscription fields
    is_premium: String
    stripe_customer_id: String
    stripe_subscription_id: String
    subscription_status: String
    subscription_plan: String
    subscription_start_date: DateTime
    subscription_end_date: DateTime
    subscription_cancelled_at: DateTime
    total_dance_time: Int
    total_sessions: Int
    longest_streak: Int
    created_at: DateTime
    updated_at: DateTime
    last_active_at: DateTime
    role: UserRole
    is_admin: Boolean
    is_organizer_approved: Boolean
    organizer_approved_by: String
    organizer_approved_at: DateTime
    company_name: String
    event_types: [String!]
    invited_by: String
    social_media_links: JSON
    website_url: String
    organizer_bio: String
    organizer_requested_at: DateTime
    organizer_rejection_reason: String
    # Gig manager fields
    is_gig_manager: Boolean
    gig_manager_approved_at: DateTime
    gig_manager_approved_by: String
    # Referral fields
    referral_count: Int
    referral_points_earned: Int
    # Statistics fields
    total_events_attended: Int
    total_events_created: Int
    upcoming_events_count: Int
    total_achievements: Int
    dance_bonds_count: Int
    # Computed fields
    achievements: [Achievement!]
  }

  type Achievement {
    id: ID!
    user_id: String!
    achievement_type: String!
    title: String!
    description: String
    icon: String
    xp_reward: Int
    danz_reward: Float
    unlocked_at: DateTime
  }

  type DanceBond {
    id: ID!
    user1_id: String!
    user2_id: String!
    bond_level: Int
    shared_sessions: Int
    created_at: DateTime
    updated_at: DateTime
    otherUser: User
  }


  type UserStats {
    total_events_attended: Int!
    total_events_hosted: Int!
    total_posts_created: Int!
    total_comments_made: Int!
    total_likes_given: Int!
    total_likes_received: Int!
    points_earned: Int!
    current_points_balance: Int!
    referral_points_earned: Int!
    total_dance_bonds: Int!
    current_streak: Int!
    longest_streak: Int!
  }

  extend type Query {
    # User queries
    me: User
    user(id: String!): User
    getUserByUsername(username: String!): User
    users(
      filter: UserFilterInput
      pagination: PaginationInput
    ): UserConnection!
    myDanceBonds: [DanceBond!]!
    checkUsername(username: String!): Boolean!
    getUserStats(userId: String): UserStats!
  }

  extend type Mutation {
    # Profile mutations
    updateProfile(input: UpdateProfileInput!): User!

    # Social mutations
    createDanceBond(userId: String!): DanceBond!
    updateDanceBond(userId: String!, level: Int!): DanceBond!
  }

  input UpdateProfileInput {
    username: String
    display_name: String
    bio: String
    avatar_url: String
    cover_image_url: String
    location: String
    city: String
    latitude: Float
    longitude: Float
    website: String
    instagram: String
    tiktok: String
    youtube: String
    twitter: String
    dance_styles: [String!]
    skill_level: SkillLevel
    favorite_music: [String!]
    age: Int
    pronouns: String
    is_public: Boolean
    allow_messages: Boolean
    show_location: Boolean
    notification_preferences: JSON
    company_name: String
    event_types: [String!]
    invited_by: String
    social_media_links: JSON
    website_url: String
    organizer_bio: String
  }

  input UserFilterInput {
    role: UserRole
    skill_level: SkillLevel
    city: String
    dance_style: String
    is_organizer_approved: Boolean
  }

  type UserConnection {
    users: [User!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
`

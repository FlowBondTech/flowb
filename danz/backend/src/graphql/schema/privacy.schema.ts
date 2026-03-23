export const privacyTypeDefs = `#graphql
  # ==================== ENUMS ====================

  enum ProfileVisibility {
    public
    bonds_only
    private
  }

  enum AllowMessagesFrom {
    everyone
    bonds_only
    none
  }

  enum AllowBondRequestsFrom {
    everyone
    mutual_events
    none
  }

  enum SuggestionSource {
    mutual_bonds
    same_events
    same_city
    leaderboard_proximity
    similar_styles
  }

  # ==================== TYPES ====================

  """
  User privacy settings - controls visibility and discoverability
  Simplified into logical groups for better UX
  """
  type PrivacySettings {
    id: ID!
    user_id: String!

    # ===== PROFILE VISIBILITY =====
    "Who can see your profile: public, bonds_only, or private"
    profile_visibility: ProfileVisibility!

    # Individual field toggles
    show_real_name: Boolean!
    show_bio: Boolean!
    show_avatar: Boolean!
    show_city: Boolean!
    show_dance_styles: Boolean!
    show_stats: Boolean!
    show_badges: Boolean!

    # ===== ACTIVITY VISIBILITY =====
    show_events_attending: Boolean!
    show_events_attended: Boolean!
    show_check_ins: Boolean!
    show_leaderboard_rank: Boolean!
    show_posts: Boolean!
    show_likes: Boolean!
    show_comments: Boolean!

    # ===== DISCOVERY =====
    searchable_by_username: Boolean!
    appear_in_suggestions: Boolean!
    appear_in_event_attendees: Boolean!
    appear_in_nearby: Boolean!

    # ===== INTERACTIONS =====
    allow_bond_requests: AllowBondRequestsFrom!
    allow_messages: AllowMessagesFrom!
    allow_event_invites: Boolean!

    # ===== NOTIFICATIONS =====
    notify_bonds_on_check_in: Boolean!
    notify_bonds_on_achievement: Boolean!

    updated_at: DateTime
  }

  """
  Simplified privacy presets for quick setup
  """
  type PrivacyPreset {
    name: String!
    description: String!
    profile_visibility: ProfileVisibility!
    searchable: Boolean!
    appear_in_suggestions: Boolean!
    allow_messages: AllowMessagesFrom!
  }

  """
  User suggestion with reason and score
  """
  type UserSuggestion {
    id: ID!
    user: User!
    source: SuggestionSource!
    score: Float!
    reason: String!
    created_at: DateTime!
  }

  type UserSuggestionConnection {
    suggestions: [UserSuggestion!]!
    total_count: Int!
    has_more: Boolean!
  }

  """
  Search result with privacy-aware user info
  """
  type UserSearchResult {
    user: User!
    "Whether you can see their full profile"
    can_view_profile: Boolean!
    "Whether you can message them"
    can_message: Boolean!
    "Whether you have a bond"
    is_bond: Boolean!
    "Mutual bonds count"
    mutual_bonds_count: Int!
  }

  type UserSearchConnection {
    results: [UserSearchResult!]!
    total_count: Int!
    has_more: Boolean!
  }

  """
  Profile visibility check result
  """
  type CanViewResult {
    can_view: Boolean!
    reason: String
  }

  # ==================== INPUTS ====================

  input UpdatePrivacySettingsInput {
    # Profile visibility
    profile_visibility: ProfileVisibility
    show_real_name: Boolean
    show_bio: Boolean
    show_avatar: Boolean
    show_city: Boolean
    show_dance_styles: Boolean
    show_stats: Boolean
    show_badges: Boolean

    # Activity visibility
    show_events_attending: Boolean
    show_events_attended: Boolean
    show_check_ins: Boolean
    show_leaderboard_rank: Boolean
    show_posts: Boolean
    show_likes: Boolean
    show_comments: Boolean

    # Discovery
    searchable_by_username: Boolean
    appear_in_suggestions: Boolean
    appear_in_event_attendees: Boolean
    appear_in_nearby: Boolean

    # Interactions
    allow_bond_requests: AllowBondRequestsFrom
    allow_messages: AllowMessagesFrom
    allow_event_invites: Boolean

    # Notifications
    notify_bonds_on_check_in: Boolean
    notify_bonds_on_achievement: Boolean
  }

  """
  Quick privacy preset - applies multiple settings at once
  """
  enum PrivacyPresetType {
    "Open: Public profile, everyone can find and message you"
    open
    "Social: Public profile, only bonds can message"
    social
    "Selective: Bonds-only profile, appear in suggestions"
    selective
    "Private: Hidden profile, no suggestions, bonds-only messages"
    private_mode
    "Ghost: Completely hidden, no interactions"
    ghost
  }

  input SearchUsersInput {
    "Username or display name to search"
    query: String!
    "Limit results"
    limit: Int
    "Offset for pagination"
    offset: Int
    "Only show users you can message"
    messageable_only: Boolean
  }

  # ==================== QUERIES ====================

  extend type Query {
    # Privacy settings
    myPrivacySettings: PrivacySettings!
    privacyPresets: [PrivacyPreset!]!

    # User discovery
    suggestedUsers(limit: Int, offset: Int): UserSuggestionConnection!
    searchUsers(input: SearchUsersInput!): UserSearchConnection!

    # Privacy checks
    canViewProfile(user_id: String!): CanViewResult!
    canMessageUser(user_id: String!): CanViewResult!
    canSendBondRequest(user_id: String!): CanViewResult!

    # Discovery lists (respecting privacy)
    myBonds(limit: Int, offset: Int): [User!]!
    leaderboardNearMe(range: Int): [User!]!
    usersAtEvent(event_id: ID!): [User!]!
  }

  # ==================== MUTATIONS ====================

  extend type Mutation {
    # Privacy settings
    updatePrivacySettings(input: UpdatePrivacySettingsInput!): PrivacySettings!
    applyPrivacyPreset(preset: PrivacyPresetType!): PrivacySettings!
    resetPrivacyToDefaults: PrivacySettings!

    # Suggestions
    dismissSuggestion(suggestion_id: ID!): Boolean!
    dismissAllSuggestions: Boolean!
    refreshSuggestions: UserSuggestionConnection!
  }
`

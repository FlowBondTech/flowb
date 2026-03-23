import { gql } from 'graphql-tag'

export const miniappTypeDefs = gql`
  # ============================================
  # TELEGRAM MINIAPP HELPERS
  # Optimized API endpoints for Telegram miniapp
  # ============================================

  # ============ TELEGRAM USER AUTH ============

  type TelegramUser {
    telegram_id: String!
    first_name: String!
    last_name: String
    username: String
    photo_url: String
    language_code: String
    is_premium: Boolean!
    danz_user: User
    is_linked: Boolean!
  }

  type TelegramAuthResult {
    success: Boolean!
    user: User
    is_new_user: Boolean!
    telegram_user: TelegramUser!
    access_token: String
    message: String
  }

  # ============ MINIAPP DATA BUNDLES ============
  # Optimized payloads to minimize API calls

  type MiniappHomeData {
    user: User!
    daily_stats: MiniappDailyStats!
    active_challenges: [MiniappChallenge!]!
    recent_activities: [MiniappActivity!]!
    leaderboard_preview: MiniappLeaderboardPreview!
    notifications_count: Int!
    streak_info: MiniappStreakInfo!
  }

  type MiniappDailyStats {
    xp_earned: Int!
    points_earned: Int!
    dance_minutes: Int!
    calories_burned: Int!
    sessions_count: Int!
    daily_goal_progress: Float!
  }

  type MiniappChallenge {
    id: String!
    title: String!
    progress: Int!
    target: Int!
    xp_reward: Int!
    expires_in_hours: Int
    icon: String!
  }

  type MiniappActivity {
    id: String!
    type: String!
    title: String!
    subtitle: String
    icon: String!
    timestamp: DateTime!
    xp_earned: Int
  }

  type MiniappLeaderboardPreview {
    my_rank: Int!
    my_xp: Int!
    top_3: [MiniappLeaderboardEntry!]!
    nearby: [MiniappLeaderboardEntry!]!
  }

  type MiniappLeaderboardEntry {
    rank: Int!
    username: String!
    avatar_url: String
    xp: Int!
    is_me: Boolean!
  }

  type MiniappStreakInfo {
    current: Int!
    longest: Int!
    streak_maintained_today: Boolean!
    next_milestone: Int
    milestone_reward: Int
  }

  # ============ QUICK ACTIONS ============

  type MiniappQuickSession {
    session_id: String!
    start_time: DateTime!
    mode: String!
    target_duration: Int
  }

  type MiniappRewardClaim {
    success: Boolean!
    reward_type: String!
    amount: Int!
    new_balance: Int!
    message: String!
  }

  # ============ SOCIAL FEATURES ============

  type MiniappFriend {
    user_id: String!
    username: String!
    display_name: String
    avatar_url: String
    level: Int!
    is_online: Boolean!
    last_active: DateTime
    dance_bond_strength: Int!
  }

  type MiniappShareContent {
    share_url: String!
    share_text: String!
    share_image_url: String
    telegram_deep_link: String!
  }

  # ============ NOTIFICATIONS ============

  type MiniappNotification {
    id: String!
    type: String!
    title: String!
    body: String!
    icon: String
    action_url: String
    is_read: Boolean!
    created_at: DateTime!
  }

  # ============ SETTINGS ============

  type MiniappSettings {
    notifications_enabled: Boolean!
    sound_enabled: Boolean!
    haptic_enabled: Boolean!
    language: String!
    theme: String!
    daily_reminder_time: String
    share_activity: Boolean!
  }

  # ============ INPUT TYPES ============

  input TelegramAuthInput {
    init_data: String!
    referral_code: String
  }

  input MiniappSettingsInput {
    notifications_enabled: Boolean
    sound_enabled: Boolean
    haptic_enabled: Boolean
    language: String
    theme: String
    daily_reminder_time: String
    share_activity: Boolean
  }

  input MiniappQuickSessionInput {
    mode: String!
    target_duration: Int
    challenge_id: String
  }

  # ============ QUERIES ============

  extend type Query {
    # Main data bundle (single call for home screen)
    miniappHome: MiniappHomeData!

    # Individual sections
    miniappDailyStats: MiniappDailyStats!
    miniappChallenges: [MiniappChallenge!]!
    miniappActivities(limit: Int): [MiniappActivity!]!
    miniappLeaderboard(type: String!, limit: Int): [MiniappLeaderboardEntry!]!

    # Social
    miniappFriends: [MiniappFriend!]!
    miniappOnlineFriends: [MiniappFriend!]!

    # Notifications
    miniappNotifications(limit: Int): [MiniappNotification!]!
    miniappUnreadCount: Int!

    # Settings
    miniappSettings: MiniappSettings!

    # Sharing
    miniappShareContent(content_type: String!, content_id: String): MiniappShareContent!
    miniappReferralLink: String!

    # Quick info
    miniappStreak: MiniappStreakInfo!
    miniappLevel: Int!
    miniappXP: Int!
    miniappPoints: Int!
  }

  # ============ MUTATIONS ============

  extend type Mutation {
    # Auth
    telegramAuth(input: TelegramAuthInput!): TelegramAuthResult!
    linkTelegramAccount(telegram_init_data: String!): TelegramAuthResult!
    unlinkTelegramAccount: MutationResponse!

    # Quick actions
    miniappStartQuickSession(input: MiniappQuickSessionInput!): MiniappQuickSession!
    miniappEndQuickSession(session_id: String!, stats: JSON!): MutationResponse!
    miniappClaimDailyReward: MiniappRewardClaim!
    miniappClaimChallengeReward(challenge_id: String!): MiniappRewardClaim!

    # Social
    miniappInviteFriend(telegram_user_id: String!): MutationResponse!
    miniappSendCheer(user_id: String!): MutationResponse!

    # Notifications
    miniappMarkNotificationRead(notification_id: String!): MutationResponse!
    miniappMarkAllNotificationsRead: MutationResponse!
    miniappRegisterPushToken(token: String!): MutationResponse!

    # Settings
    miniappUpdateSettings(input: MiniappSettingsInput!): MiniappSettings!

    # Tracking
    miniappTrackEvent(event: String!, data: JSON): MutationResponse!
  }
`

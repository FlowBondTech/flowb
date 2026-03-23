import { gql } from '@apollo/client'
import * as Apollo from '@apollo/client'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never
}
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never }
const defaultOptions = {} as const
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  DateTime: { input: any; output: any }
  JSON: { input: any; output: any }
}

export enum AcceptanceMode {
  AutoAccept = 'auto_accept',
  CategoryFilter = 'category_filter',
  Manual = 'manual',
}

export type Achievement = {
  __typename?: 'Achievement'
  achievement_type: Scalars['String']['output']
  danz_reward?: Maybe<Scalars['Float']['output']>
  description?: Maybe<Scalars['String']['output']>
  icon?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  title: Scalars['String']['output']
  unlocked_at?: Maybe<Scalars['DateTime']['output']>
  user_id: Scalars['String']['output']
  xp_reward?: Maybe<Scalars['Int']['output']>
}

export enum AchievementCategory {
  Duration = 'DURATION',
  Milestone = 'MILESTONE',
  Movement = 'MOVEMENT',
  Sessions = 'SESSIONS',
  Social = 'SOCIAL',
  Special = 'SPECIAL',
  Streak = 'STREAK',
}

export type AchievementCheckResult = {
  __typename?: 'AchievementCheckResult'
  newly_unlocked: Array<AchievementDetails>
  total_danz_earned: Scalars['Float']['output']
  total_xp_earned: Scalars['Int']['output']
}

export type AchievementDefinition = {
  __typename?: 'AchievementDefinition'
  category: AchievementCategory
  danz_reward: Scalars['Float']['output']
  description: Scalars['String']['output']
  hidden: Scalars['Boolean']['output']
  icon: Scalars['String']['output']
  rarity: AchievementRarity
  target: Scalars['Int']['output']
  title: Scalars['String']['output']
  type: Scalars['String']['output']
  xp_reward: Scalars['Int']['output']
}

export type AchievementDetails = {
  __typename?: 'AchievementDetails'
  achievement_type: Scalars['String']['output']
  category: AchievementCategory
  danz_reward: Scalars['Float']['output']
  description?: Maybe<Scalars['String']['output']>
  icon?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  is_unlocked: Scalars['Boolean']['output']
  progress?: Maybe<Scalars['Int']['output']>
  rarity: AchievementRarity
  target?: Maybe<Scalars['Int']['output']>
  title: Scalars['String']['output']
  unlocked_at?: Maybe<Scalars['DateTime']['output']>
  user_id: Scalars['String']['output']
  xp_reward: Scalars['Int']['output']
}

export type AchievementProgress = {
  __typename?: 'AchievementProgress'
  achievement_type: Scalars['String']['output']
  category: AchievementCategory
  current_progress: Scalars['Int']['output']
  danz_reward: Scalars['Float']['output']
  description: Scalars['String']['output']
  icon: Scalars['String']['output']
  is_unlocked: Scalars['Boolean']['output']
  percentage: Scalars['Float']['output']
  rarity: AchievementRarity
  target: Scalars['Int']['output']
  title: Scalars['String']['output']
  unlocked_at?: Maybe<Scalars['DateTime']['output']>
  xp_reward: Scalars['Int']['output']
}

export enum AchievementRarity {
  Common = 'COMMON',
  Epic = 'EPIC',
  Legendary = 'LEGENDARY',
  Rare = 'RARE',
  Uncommon = 'UNCOMMON',
}

export type AchievementStats = {
  __typename?: 'AchievementStats'
  by_category: Array<CategoryCount>
  by_rarity: Array<RarityCount>
  recent_unlocks: Array<AchievementDetails>
  total_available: Scalars['Int']['output']
  total_danz_earned: Scalars['Float']['output']
  total_unlocked: Scalars['Int']['output']
  total_xp_earned: Scalars['Int']['output']
}

export type AcquisitionChannel = {
  __typename?: 'AcquisitionChannel'
  channel: Scalars['String']['output']
  percentage: Scalars['Float']['output']
  users: Scalars['Int']['output']
}

export enum ActionType {
  Onboarding = 'onboarding',
  OpenAchievement = 'open_achievement',
  OpenBond = 'open_bond',
  OpenEvent = 'open_event',
  OpenGig = 'open_gig',
  OpenGigApplication = 'open_gig_application',
  OpenGigDashboard = 'open_gig_dashboard',
  OpenGigManagerDashboard = 'open_gig_manager_dashboard',
  OpenGigRoles = 'open_gig_roles',
  OpenNotifications = 'open_notifications',
  OpenPost = 'open_post',
  OpenProfile = 'open_profile',
  OpenSettings = 'open_settings',
}

export type ActiveUsersMetrics = {
  __typename?: 'ActiveUsersMetrics'
  dau: Scalars['Int']['output']
  dau_mau_ratio: Scalars['Float']['output']
  dau_wau_ratio: Scalars['Float']['output']
  mau: Scalars['Int']['output']
  trend: Array<TimeSeriesPoint>
  wau: Scalars['Int']['output']
}

export type Activity = {
  __typename?: 'Activity'
  activity_type: ActivityType
  color?: Maybe<Scalars['String']['output']>
  comments_count: Scalars['Int']['output']
  created_at: Scalars['DateTime']['output']
  description?: Maybe<Scalars['String']['output']>
  icon?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  is_highlighted: Scalars['Boolean']['output']
  is_liked_by_me?: Maybe<Scalars['Boolean']['output']>
  likes_count: Scalars['Int']['output']
  metadata?: Maybe<Scalars['JSON']['output']>
  points_earned?: Maybe<Scalars['Int']['output']>
  related_entity_id?: Maybe<Scalars['String']['output']>
  related_entity_type?: Maybe<Scalars['String']['output']>
  target_user?: Maybe<User>
  target_user_id?: Maybe<Scalars['String']['output']>
  title: Scalars['String']['output']
  user: User
  user_id: Scalars['String']['output']
  visibility: ActivityVisibility
  xp_earned?: Maybe<Scalars['Int']['output']>
}

export type ActivityFeed = {
  __typename?: 'ActivityFeed'
  activities: Array<Activity>
  has_more: Scalars['Boolean']['output']
  last_activity_id?: Maybe<Scalars['String']['output']>
  total_count: Scalars['Int']['output']
  unread_count: Scalars['Int']['output']
}

export type ActivityFilter = {
  from_date?: InputMaybe<Scalars['DateTime']['input']>
  has_rewards?: InputMaybe<Scalars['Boolean']['input']>
  to_date?: InputMaybe<Scalars['DateTime']['input']>
  types?: InputMaybe<Array<ActivityType>>
  user_id?: InputMaybe<Scalars['String']['input']>
  visibility?: InputMaybe<ActivityVisibility>
}

export type ActivityGroup = {
  __typename?: 'ActivityGroup'
  activities: Array<Activity>
  date: Scalars['String']['output']
  summary: Scalars['String']['output']
}

export type ActivityStats = {
  __typename?: 'ActivityStats'
  engagement_rate: Scalars['Float']['output']
  most_active_type?: Maybe<ActivityType>
  this_week_activities: Scalars['Int']['output']
  today_activities: Scalars['Int']['output']
  total_activities: Scalars['Int']['output']
  trending_now: Array<Activity>
}

export enum ActivityType {
  ChallengeCompleted = 'CHALLENGE_COMPLETED',
  ChallengeStarted = 'CHALLENGE_STARTED',
  ChallengeStreak = 'CHALLENGE_STREAK',
  DanceBondStrengthened = 'DANCE_BOND_STRENGTHENED',
  DanceMilestone = 'DANCE_MILESTONE',
  DanceSessionCompleted = 'DANCE_SESSION_COMPLETED',
  DanceSessionShared = 'DANCE_SESSION_SHARED',
  EventCheckin = 'EVENT_CHECKIN',
  EventCompleted = 'EVENT_COMPLETED',
  EventCreated = 'EVENT_CREATED',
  EventJoined = 'EVENT_JOINED',
  HighScoreAchieved = 'HIGH_SCORE_ACHIEVED',
  LeaderboardRankUp = 'LEADERBOARD_RANK_UP',
  NewDanceBond = 'NEW_DANCE_BOND',
  PostCommented = 'POST_COMMENTED',
  PostCreated = 'POST_CREATED',
  PostLiked = 'POST_LIKED',
  ReferralBonus = 'REFERRAL_BONUS',
  ReferralInvited = 'REFERRAL_INVITED',
  ReferralJoined = 'REFERRAL_JOINED',
  SeasonReward = 'SEASON_REWARD',
  SpecialAnnouncement = 'SPECIAL_ANNOUNCEMENT',
  UserAchievement = 'USER_ACHIEVEMENT',
  UserJoined = 'USER_JOINED',
  UserLevelUp = 'USER_LEVEL_UP',
  UserStreak = 'USER_STREAK',
}

export enum ActivityVisibility {
  Friends = 'FRIENDS',
  Private = 'PRIVATE',
  Public = 'PUBLIC',
}

export type AddParticipantsInput = {
  conversation_id: Scalars['ID']['input']
  user_ids: Array<Scalars['String']['input']>
}

export type AdminEventConnection = {
  __typename?: 'AdminEventConnection'
  cancelledCount: Scalars['Int']['output']
  events: Array<Event>
  pastCount: Scalars['Int']['output']
  totalCount: Scalars['Int']['output']
  upcomingCount: Scalars['Int']['output']
}

export type AdminNotification = {
  __typename?: 'AdminNotification'
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  message?: Maybe<Scalars['String']['output']>
  read: Scalars['Boolean']['output']
  recipient?: Maybe<User>
  recipient_id: Scalars['String']['output']
  sender?: Maybe<User>
  sender_id?: Maybe<Scalars['String']['output']>
  sender_type?: Maybe<Scalars['String']['output']>
  title: Scalars['String']['output']
  type: Scalars['String']['output']
}

export type AdminNotificationConnection = {
  __typename?: 'AdminNotificationConnection'
  notifications: Array<AdminNotification>
  totalCount: Scalars['Int']['output']
  unreadCount: Scalars['Int']['output']
}

export type AdminReferralStats = {
  __typename?: 'AdminReferralStats'
  completedReferrals: Scalars['Int']['output']
  conversionRate: Scalars['Float']['output']
  pendingReferrals: Scalars['Int']['output']
  referralsThisMonth: Scalars['Int']['output']
  topReferrers: Array<TopReferrer>
  totalPointsAwarded: Scalars['Int']['output']
  totalReferrals: Scalars['Int']['output']
}

export type AdminStats = {
  __typename?: 'AdminStats'
  activeUsers: Scalars['Int']['output']
  eventsThisMonth: Scalars['Int']['output']
  newUsersThisMonth: Scalars['Int']['output']
  totalEvents: Scalars['Int']['output']
  totalRevenue: Scalars['Float']['output']
  totalUsers: Scalars['Int']['output']
  upcomingEvents: Scalars['Int']['output']
}

export type AgeGroupMetric = {
  __typename?: 'AgeGroupMetric'
  group: Scalars['String']['output']
  percentage: Scalars['Float']['output']
  users: Scalars['Int']['output']
}

export type AllocationConfig = {
  __typename?: 'AllocationConfig'
  paidWorkersPercent: Scalars['Float']['output']
  platformFeePercent: Scalars['Float']['output']
  volunteerRewardsPercent: Scalars['Float']['output']
}

export type AllocationConfigInput = {
  paidWorkersPercent: Scalars['Float']['input']
  platformFeePercent: Scalars['Float']['input']
  volunteerRewardsPercent: Scalars['Float']['input']
}

export enum AllowBondRequestsFrom {
  Everyone = 'everyone',
  MutualEvents = 'mutual_events',
  None = 'none',
}

export enum AllowMessagesFrom {
  BondsOnly = 'bonds_only',
  Everyone = 'everyone',
  None = 'none',
}

export type AnalyticsComparison = {
  __typename?: 'AnalyticsComparison'
  change_percentage: Scalars['Float']['output']
  current_value: Scalars['Float']['output']
  metric: Scalars['String']['output']
  previous_value: Scalars['Float']['output']
  trend: Scalars['String']['output']
}

export type AnalyticsDateRange = {
  from: Scalars['DateTime']['input']
  to: Scalars['DateTime']['input']
}

export enum AnalyticsGranularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Week = 'WEEK',
}

export type AnalyticsOptions = {
  compare_to_previous?: InputMaybe<Scalars['Boolean']['input']>
  custom_range?: InputMaybe<AnalyticsDateRange>
  granularity?: InputMaybe<AnalyticsGranularity>
  period?: InputMaybe<AnalyticsPeriod>
}

export enum AnalyticsPeriod {
  AllTime = 'ALL_TIME',
  Custom = 'CUSTOM',
  Last_7Days = 'LAST_7_DAYS',
  Last_30Days = 'LAST_30_DAYS',
  Last_90Days = 'LAST_90_DAYS',
  LastMonth = 'LAST_MONTH',
  ThisMonth = 'THIS_MONTH',
  ThisYear = 'THIS_YEAR',
  Today = 'TODAY',
  Yesterday = 'YESTERDAY',
}

export enum ApplicationStatus {
  Approved = 'approved',
  Pending = 'pending',
  Rejected = 'rejected',
}

export type ApplyForGigRoleInput = {
  certifications?: InputMaybe<Array<Scalars['String']['input']>>
  experienceNotes?: InputMaybe<Scalars['String']['input']>
  portfolioUrls?: InputMaybe<Array<Scalars['String']['input']>>
  roleId: Scalars['ID']['input']
}

export enum ApprovalStatus {
  Approved = 'approved',
  Expired = 'expired',
  Pending = 'pending',
  Rejected = 'rejected',
}

export type AwardPointsInput = {
  action_key: Scalars['String']['input']
  metadata?: InputMaybe<Scalars['JSON']['input']>
  reference_id?: InputMaybe<Scalars['ID']['input']>
  reference_type?: InputMaybe<ReferenceType>
  user_id: Scalars['String']['input']
}

/** Bond request between two users */
export type BondRequest = {
  __typename?: 'BondRequest'
  created_at: Scalars['DateTime']['output']
  expires_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  /** Similarity data between users */
  match_reasons?: Maybe<MatchReasons>
  /** Optional message from requester */
  message?: Maybe<Scalars['String']['output']>
  /** User who received the request */
  recipient: User
  /** User who sent the request */
  requester: User
  responded_at?: Maybe<Scalars['DateTime']['output']>
  status: BondRequestStatus
  updated_at: Scalars['DateTime']['output']
}

/** Stats about user's bond requests */
export type BondRequestStats = {
  __typename?: 'BondRequestStats'
  /** Acceptance rate for sent requests */
  acceptance_rate?: Maybe<Scalars['Float']['output']>
  /** Pending requests received */
  pending_received: Scalars['Int']['output']
  /** Pending requests sent */
  pending_sent: Scalars['Int']['output']
  /** Total bonds formed */
  total_bonds: Scalars['Int']['output']
}

export enum BondRequestStatus {
  Accepted = 'accepted',
  Cancelled = 'cancelled',
  Expired = 'expired',
  Pending = 'pending',
  Rejected = 'rejected',
}

export enum BroadcastTarget {
  AllUsers = 'all_users',
  Dancers = 'dancers',
  EventParticipants = 'event_participants',
  Organizers = 'organizers',
}

/** Result of checking if bond request can be sent */
export type CanSendBondRequestResult = {
  __typename?: 'CanSendBondRequestResult'
  can_send: Scalars['Boolean']['output']
  /** Similarity data if can_send is true */
  match_reasons?: Maybe<MatchReasons>
  reason?: Maybe<Scalars['String']['output']>
}

/** Profile visibility check result */
export type CanViewResult = {
  __typename?: 'CanViewResult'
  can_view: Scalars['Boolean']['output']
  reason?: Maybe<Scalars['String']['output']>
}

export type CategoryBreakdown = {
  __typename?: 'CategoryBreakdown'
  amount: Scalars['Float']['output']
  category: Scalars['String']['output']
  percentage: Scalars['Float']['output']
}

export type CategoryCount = {
  __typename?: 'CategoryCount'
  category: AchievementCategory
  total: Scalars['Int']['output']
  unlocked: Scalars['Int']['output']
}

export type CategoryMetric = {
  __typename?: 'CategoryMetric'
  category: Scalars['String']['output']
  count: Scalars['Int']['output']
  percentage: Scalars['Float']['output']
}

export type CategorySponsorBreakdown = {
  __typename?: 'CategorySponsorBreakdown'
  category: Scalars['String']['output']
  count: Scalars['Int']['output']
  totalAmount: Scalars['Float']['output']
}

export type Challenge = {
  __typename?: 'Challenge'
  badge_reward?: Maybe<Scalars['String']['output']>
  category: ChallengeCategory
  challenge_type: ChallengeType
  cooldown_hours?: Maybe<Scalars['Int']['output']>
  created_at: Scalars['DateTime']['output']
  description: Scalars['String']['output']
  difficulty: ChallengeDifficulty
  ends_at?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  is_active: Scalars['Boolean']['output']
  is_repeatable: Scalars['Boolean']['output']
  max_completions?: Maybe<Scalars['Int']['output']>
  min_level?: Maybe<Scalars['Int']['output']>
  points_reward: Scalars['Int']['output']
  required_badges?: Maybe<Array<Scalars['String']['output']>>
  special_reward?: Maybe<Scalars['JSON']['output']>
  starts_at?: Maybe<Scalars['DateTime']['output']>
  target_unit: Scalars['String']['output']
  target_value: Scalars['Int']['output']
  time_limit_hours?: Maybe<Scalars['Int']['output']>
  title: Scalars['String']['output']
  updated_at: Scalars['DateTime']['output']
  xp_reward: Scalars['Int']['output']
}

export enum ChallengeCategory {
  Calories = 'CALORIES',
  Community = 'COMMUNITY',
  DanceTime = 'DANCE_TIME',
  Exploration = 'EXPLORATION',
  Mastery = 'MASTERY',
  MovementScore = 'MOVEMENT_SCORE',
  Social = 'SOCIAL',
  Streak = 'STREAK',
}

export enum ChallengeDifficulty {
  Easy = 'EASY',
  Extreme = 'EXTREME',
  Hard = 'HARD',
  Medium = 'MEDIUM',
}

export type ChallengeLeaderboard = {
  __typename?: 'ChallengeLeaderboard'
  entries: Array<ChallengeLeaderboardEntry>
  period: Scalars['String']['output']
}

export type ChallengeLeaderboardEntry = {
  __typename?: 'ChallengeLeaderboardEntry'
  challenges_completed: Scalars['Int']['output']
  points_earned: Scalars['Int']['output']
  rank: Scalars['Int']['output']
  user: User
  xp_earned: Scalars['Int']['output']
}

export type ChallengeProgress = {
  __typename?: 'ChallengeProgress'
  challenge: Challenge
  current_progress: Scalars['Int']['output']
  is_claimable: Scalars['Boolean']['output']
  percentage: Scalars['Float']['output']
  target_value: Scalars['Int']['output']
  time_remaining?: Maybe<Scalars['Int']['output']>
  user_challenge?: Maybe<UserChallenge>
}

export type ChallengeStats = {
  __typename?: 'ChallengeStats'
  badges_earned: Array<Scalars['String']['output']>
  challenges_by_difficulty: Scalars['JSON']['output']
  completion_rate: Scalars['Float']['output']
  current_streak: Scalars['Int']['output']
  favorite_category?: Maybe<ChallengeCategory>
  longest_streak: Scalars['Int']['output']
  total_completed: Scalars['Int']['output']
  total_points_earned: Scalars['Int']['output']
  total_xp_earned: Scalars['Int']['output']
}

export enum ChallengeStatus {
  Available = 'AVAILABLE',
  Claimed = 'CLAIMED',
  Completed = 'COMPLETED',
  Expired = 'EXPIRED',
  InProgress = 'IN_PROGRESS',
}

export enum ChallengeType {
  Daily = 'DAILY',
  Event = 'EVENT',
  Social = 'SOCIAL',
  Special = 'SPECIAL',
  Streak = 'STREAK',
  Weekly = 'WEEKLY',
}

export enum ChangelogCategory {
  Breaking = 'breaking',
  Deprecation = 'deprecation',
  Feature = 'feature',
  Fix = 'fix',
  Improvement = 'improvement',
  Performance = 'performance',
  Security = 'security',
}

export type ChangelogEntry = {
  __typename?: 'ChangelogEntry'
  category: ChangelogCategory
  created_at: Scalars['DateTime']['output']
  created_by?: Maybe<User>
  description?: Maybe<Scalars['String']['output']>
  feature_request?: Maybe<FeatureRequest>
  github_commit_sha?: Maybe<Scalars['String']['output']>
  github_pr_url?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  is_highlighted: Scalars['Boolean']['output']
  is_public: Scalars['Boolean']['output']
  project?: Maybe<Project>
  project_id?: Maybe<Scalars['ID']['output']>
  title: Scalars['String']['output']
  version: Scalars['String']['output']
}

export type ChangelogVersion = {
  __typename?: 'ChangelogVersion'
  entries: Array<ChangelogEntry>
  is_current: Scalars['Boolean']['output']
  release_date: Scalars['DateTime']['output']
  version: Scalars['String']['output']
}

export type CheckInEventInput = {
  event_id: Scalars['ID']['input']
  user_id: Scalars['String']['input']
}

export type CheckInResponse = {
  __typename?: 'CheckInResponse'
  event?: Maybe<Event>
  message: Scalars['String']['output']
  registration?: Maybe<EventRegistration>
  success: Scalars['Boolean']['output']
}

export type CheckOutEventInput = {
  attendance_id: Scalars['ID']['input']
}

export type CityMetric = {
  __typename?: 'CityMetric'
  city: Scalars['String']['output']
  country: Scalars['String']['output']
  percentage: Scalars['Float']['output']
  users: Scalars['Int']['output']
}

export type CohortData = {
  __typename?: 'CohortData'
  cohort_date: Scalars['String']['output']
  retention_days: Array<Scalars['Float']['output']>
  size: Scalars['Int']['output']
}

export type CompleteReferralInput = {
  referee_user_id: Scalars['String']['input']
  referral_code: Scalars['String']['input']
}

export enum ComponentStatus {
  Complete = 'complete',
  NotStarted = 'not_started',
  Partial = 'partial',
}

export type Conversation = {
  __typename?: 'Conversation'
  created_at: Scalars['DateTime']['output']
  created_by?: Maybe<User>
  id: Scalars['ID']['output']
  is_archived: Scalars['Boolean']['output']
  is_group: Scalars['Boolean']['output']
  is_muted: Scalars['Boolean']['output']
  last_message?: Maybe<Message>
  last_message_at?: Maybe<Scalars['DateTime']['output']>
  last_message_preview?: Maybe<Scalars['String']['output']>
  my_unread_count: Scalars['Int']['output']
  participant_count: Scalars['Int']['output']
  participants: Array<ConversationParticipant>
  title?: Maybe<Scalars['String']['output']>
  updated_at?: Maybe<Scalars['DateTime']['output']>
}

export type ConversationConnection = {
  __typename?: 'ConversationConnection'
  conversations: Array<Conversation>
  has_more: Scalars['Boolean']['output']
  total_count: Scalars['Int']['output']
  unread_conversations: Scalars['Int']['output']
}

export type ConversationFilter = {
  has_unread?: InputMaybe<Scalars['Boolean']['input']>
  is_archived?: InputMaybe<Scalars['Boolean']['input']>
  is_group?: InputMaybe<Scalars['Boolean']['input']>
  is_muted?: InputMaybe<Scalars['Boolean']['input']>
  search?: InputMaybe<Scalars['String']['input']>
}

export type ConversationParticipant = {
  __typename?: 'ConversationParticipant'
  id: Scalars['ID']['output']
  is_archived: Scalars['Boolean']['output']
  is_muted: Scalars['Boolean']['output']
  joined_at: Scalars['DateTime']['output']
  last_read_at?: Maybe<Scalars['DateTime']['output']>
  nickname?: Maybe<Scalars['String']['output']>
  role: ConversationParticipantRole
  unread_count: Scalars['Int']['output']
  user: User
}

export enum ConversationParticipantRole {
  Admin = 'admin',
  Member = 'member',
}

export type CountryMetric = {
  __typename?: 'CountryMetric'
  country: Scalars['String']['output']
  percentage: Scalars['Float']['output']
  users: Scalars['Int']['output']
}

export type CreateChallengeInput = {
  badge_reward?: InputMaybe<Scalars['String']['input']>
  category: ChallengeCategory
  challenge_type: ChallengeType
  cooldown_hours?: InputMaybe<Scalars['Int']['input']>
  description: Scalars['String']['input']
  difficulty: ChallengeDifficulty
  ends_at?: InputMaybe<Scalars['DateTime']['input']>
  is_repeatable?: InputMaybe<Scalars['Boolean']['input']>
  max_completions?: InputMaybe<Scalars['Int']['input']>
  min_level?: InputMaybe<Scalars['Int']['input']>
  points_reward: Scalars['Int']['input']
  required_badges?: InputMaybe<Array<Scalars['String']['input']>>
  special_reward?: InputMaybe<Scalars['JSON']['input']>
  starts_at?: InputMaybe<Scalars['DateTime']['input']>
  target_unit: Scalars['String']['input']
  target_value: Scalars['Int']['input']
  time_limit_hours?: InputMaybe<Scalars['Int']['input']>
  title: Scalars['String']['input']
  xp_reward: Scalars['Int']['input']
}

export type CreateChangelogEntryInput = {
  category: ChangelogCategory
  description?: InputMaybe<Scalars['String']['input']>
  feature_request_id?: InputMaybe<Scalars['String']['input']>
  github_commit_sha?: InputMaybe<Scalars['String']['input']>
  github_pr_url?: InputMaybe<Scalars['String']['input']>
  is_highlighted?: InputMaybe<Scalars['Boolean']['input']>
  is_public?: InputMaybe<Scalars['Boolean']['input']>
  project_id?: InputMaybe<Scalars['ID']['input']>
  title: Scalars['String']['input']
  version: Scalars['String']['input']
}

export type CreateCommentInput = {
  content: Scalars['String']['input']
  post_id: Scalars['ID']['input']
}

export type CreateDanceBondInput = {
  user_id: Scalars['String']['input']
}

export type CreateDevAlertInput = {
  action_label?: InputMaybe<Scalars['String']['input']>
  action_url?: InputMaybe<Scalars['String']['input']>
  alert_type: DevAlertType
  category?: InputMaybe<DevAlertCategory>
  expires_at?: InputMaybe<Scalars['DateTime']['input']>
  is_actionable?: InputMaybe<Scalars['Boolean']['input']>
  message: Scalars['String']['input']
  metadata?: InputMaybe<Scalars['JSON']['input']>
  priority?: InputMaybe<DevAlertPriority>
  project_id?: InputMaybe<Scalars['ID']['input']>
  source_id?: InputMaybe<Scalars['String']['input']>
  source_type?: InputMaybe<Scalars['String']['input']>
  target_roles?: InputMaybe<Array<Scalars['String']['input']>>
  target_users?: InputMaybe<Array<Scalars['String']['input']>>
  title: Scalars['String']['input']
}

export type CreateDevTaskInput = {
  assigned_to?: InputMaybe<Scalars['String']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  due_date?: InputMaybe<Scalars['String']['input']>
  estimated_hours?: InputMaybe<Scalars['Int']['input']>
  feature_request_id?: InputMaybe<Scalars['String']['input']>
  github_issue_url?: InputMaybe<Scalars['String']['input']>
  parent_task_id?: InputMaybe<Scalars['String']['input']>
  priority: TaskPriority
  project_id?: InputMaybe<Scalars['ID']['input']>
  sprint?: InputMaybe<Scalars['String']['input']>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  task_type: DevTaskType
  title: Scalars['String']['input']
}

export type CreateEventGigInput = {
  approvalMode?: InputMaybe<GigApprovalMode>
  bonusDanz?: InputMaybe<Scalars['Float']['input']>
  danzReward: Scalars['Float']['input']
  description?: InputMaybe<Scalars['String']['input']>
  eventId: Scalars['ID']['input']
  gigSource?: InputMaybe<GigSource>
  localRadiusKm?: InputMaybe<Scalars['Int']['input']>
  requiresLocal?: InputMaybe<Scalars['Boolean']['input']>
  roleId: Scalars['ID']['input']
  slotsAvailable: Scalars['Int']['input']
  specificRequirements?: InputMaybe<Scalars['String']['input']>
  timeCommitment?: InputMaybe<Scalars['String']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type CreateEventInput = {
  allow_sponsors?: InputMaybe<Scalars['Boolean']['input']>
  category?: InputMaybe<EventCategory>
  currency?: InputMaybe<Scalars['String']['input']>
  dance_styles?: InputMaybe<Array<Scalars['String']['input']>>
  description?: InputMaybe<Scalars['String']['input']>
  end_date_time: Scalars['DateTime']['input']
  image_url?: InputMaybe<Scalars['String']['input']>
  is_featured?: InputMaybe<Scalars['Boolean']['input']>
  is_public?: InputMaybe<Scalars['Boolean']['input']>
  is_recurring?: InputMaybe<Scalars['Boolean']['input']>
  is_virtual?: InputMaybe<Scalars['Boolean']['input']>
  location_address?: InputMaybe<Scalars['String']['input']>
  location_city?: InputMaybe<Scalars['String']['input']>
  location_latitude?: InputMaybe<Scalars['Float']['input']>
  location_longitude?: InputMaybe<Scalars['Float']['input']>
  location_name: Scalars['String']['input']
  max_capacity?: InputMaybe<Scalars['Int']['input']>
  price_danz?: InputMaybe<Scalars['Float']['input']>
  price_usd?: InputMaybe<Scalars['Float']['input']>
  recurrence_count?: InputMaybe<Scalars['Int']['input']>
  recurrence_days?: InputMaybe<Array<Scalars['String']['input']>>
  recurrence_end_date?: InputMaybe<Scalars['DateTime']['input']>
  recurrence_type?: InputMaybe<RecurrenceType>
  requirements?: InputMaybe<Scalars['String']['input']>
  skill_level?: InputMaybe<SkillLevel>
  sponsor_benefits?: InputMaybe<Scalars['String']['input']>
  sponsor_contact_email?: InputMaybe<Scalars['String']['input']>
  sponsor_tier_config?: InputMaybe<Scalars['JSON']['input']>
  start_date_time: Scalars['DateTime']['input']
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  title: Scalars['String']['input']
  virtual_link?: InputMaybe<Scalars['String']['input']>
}

export type CreateFeatureInventoryInput = {
  api_docs_url?: InputMaybe<Scalars['String']['input']>
  backend_status?: InputMaybe<ComponentStatus>
  category: FeatureInventoryCategory
  completion_percentage?: InputMaybe<Scalars['Int']['input']>
  database_status?: InputMaybe<ComponentStatus>
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>
  description?: InputMaybe<Scalars['String']['input']>
  estimated_hours?: InputMaybe<Scalars['Int']['input']>
  frontend_status?: InputMaybe<ComponentStatus>
  is_miniapp_ready?: InputMaybe<Scalars['Boolean']['input']>
  miniapp_api_available?: InputMaybe<Scalars['Boolean']['input']>
  name: Scalars['String']['input']
  notes?: InputMaybe<Scalars['String']['input']>
  priority?: InputMaybe<TaskPriority>
  project_id?: InputMaybe<Scalars['ID']['input']>
  related_files?: InputMaybe<Array<Scalars['String']['input']>>
  slug: Scalars['String']['input']
  status?: InputMaybe<FeatureImplementationStatus>
  target_version?: InputMaybe<Scalars['String']['input']>
}

export type CreateFeatureRequestInput = {
  category: FeatureRequestCategory
  description?: InputMaybe<Scalars['String']['input']>
  priority?: InputMaybe<TaskPriority>
  project_id?: InputMaybe<Scalars['ID']['input']>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  title: Scalars['String']['input']
}

export type CreateFreestyleSessionInput = {
  completed?: InputMaybe<Scalars['Boolean']['input']>
  duration_seconds: Scalars['Int']['input']
  motion_data?: InputMaybe<Scalars['JSON']['input']>
  movement_score: Scalars['Float']['input']
  music_source?: InputMaybe<MusicSource>
}

export type CreateNotificationInput = {
  action_data?: InputMaybe<Scalars['JSON']['input']>
  action_type?: InputMaybe<ActionType>
  event_id?: InputMaybe<Scalars['ID']['input']>
  gig_application_id?: InputMaybe<Scalars['ID']['input']>
  gig_id?: InputMaybe<Scalars['ID']['input']>
  message: Scalars['String']['input']
  post_id?: InputMaybe<Scalars['ID']['input']>
  recipient_id: Scalars['String']['input']
  title: Scalars['String']['input']
  type: NotificationType
}

export type CreatePointActionInput = {
  action_key: Scalars['String']['input']
  action_name: Scalars['String']['input']
  category: PointActionCategory
  description?: InputMaybe<Scalars['String']['input']>
  is_active?: InputMaybe<Scalars['Boolean']['input']>
  max_per_day?: InputMaybe<Scalars['Int']['input']>
  max_per_month?: InputMaybe<Scalars['Int']['input']>
  max_per_week?: InputMaybe<Scalars['Int']['input']>
  points_value: Scalars['Int']['input']
  requires_verification?: InputMaybe<Scalars['Boolean']['input']>
}

export type CreatePostInput = {
  content: Scalars['String']['input']
  event_id?: InputMaybe<Scalars['ID']['input']>
  is_public?: InputMaybe<Scalars['Boolean']['input']>
  location?: InputMaybe<Scalars['String']['input']>
  media_type?: InputMaybe<MediaType>
  media_url?: InputMaybe<Scalars['String']['input']>
}

export type CreateProjectInput = {
  color?: InputMaybe<Scalars['String']['input']>
  default_branch?: InputMaybe<Scalars['String']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  display_order?: InputMaybe<Scalars['Int']['input']>
  github_org?: InputMaybe<Scalars['String']['input']>
  github_repo?: InputMaybe<Scalars['String']['input']>
  icon?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
  platform?: InputMaybe<ProjectPlatform>
  project_type: ProjectType
  slug: Scalars['String']['input']
  tech_stack?: InputMaybe<Array<Scalars['String']['input']>>
}

export type CreateSponsorInput = {
  categories: Array<Scalars['String']['input']>
  companyDescription?: InputMaybe<Scalars['String']['input']>
  companyName: Scalars['String']['input']
  contactEmail: Scalars['String']['input']
  contactPhone?: InputMaybe<Scalars['String']['input']>
  logoUrl?: InputMaybe<Scalars['String']['input']>
  preferredDanceStyles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  preferredEventTypes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  preferredRegions?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  websiteUrl?: InputMaybe<Scalars['String']['input']>
}

export type CreateSponsorshipInput = {
  allocationConfig: AllocationConfigInput
  eventId: Scalars['ID']['input']
  flowAmount: Scalars['Float']['input']
  sponsorMessage?: InputMaybe<Scalars['String']['input']>
  visibility?: InputMaybe<SponsorshipVisibility>
}

export type CreateSubscriptionInput = {
  autoApprove?: InputMaybe<Scalars['Boolean']['input']>
  budgetAmount: Scalars['Float']['input']
  defaultAllocationConfig?: InputMaybe<AllocationConfigInput>
  defaultVisibility?: InputMaybe<SponsorshipVisibility>
  maxPerEvent?: InputMaybe<Scalars['Float']['input']>
  planType: SubscriptionPlanType
  sponsorshipMode: SponsorshipMode
  targetCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  verifiedEventsOnly?: InputMaybe<Scalars['Boolean']['input']>
}

export type CreatorNotificationPreferencesInput = {
  emailEnabled?: InputMaybe<Scalars['Boolean']['input']>
  notifyApprovalExpiring?: InputMaybe<Scalars['Boolean']['input']>
  notifyGoalReached?: InputMaybe<Scalars['Boolean']['input']>
  notifyNewSponsorship?: InputMaybe<Scalars['Boolean']['input']>
  notifySponsorshipApproved?: InputMaybe<Scalars['Boolean']['input']>
  pushEnabled?: InputMaybe<Scalars['Boolean']['input']>
}

export type CreatorSponsorshipNotificationPreferences = {
  __typename?: 'CreatorSponsorshipNotificationPreferences'
  emailEnabled: Scalars['Boolean']['output']
  notifyApprovalExpiring: Scalars['Boolean']['output']
  notifyGoalReached: Scalars['Boolean']['output']
  notifyNewSponsorship: Scalars['Boolean']['output']
  notifySponsorshipApproved: Scalars['Boolean']['output']
  pushEnabled: Scalars['Boolean']['output']
}

export type DailyActivity = {
  __typename?: 'DailyActivity'
  activity_date: Scalars['String']['output']
  app_opened: Scalars['Boolean']['output']
  app_opened_at?: Maybe<Scalars['DateTime']['output']>
  created_at: Scalars['DateTime']['output']
  events_attended: Scalars['Int']['output']
  first_session_completed: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  points_earned_today: Scalars['Int']['output']
  sessions_completed: Scalars['Int']['output']
  social_interactions: Scalars['Int']['output']
  streak_day: Scalars['Int']['output']
  total_dance_time: Scalars['Int']['output']
  updated_at: Scalars['DateTime']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

export type DailyChallengeset = {
  __typename?: 'DailyChallengeset'
  challenges: Array<Challenge>
  date: Scalars['String']['output']
  total_points_available: Scalars['Int']['output']
  total_xp_available: Scalars['Int']['output']
  user_progress?: Maybe<Array<UserChallenge>>
}

export type DailyWearableActivity = {
  __typename?: 'DailyWearableActivity'
  active_minutes: Scalars['Int']['output']
  calories: Scalars['Int']['output']
  dance_sessions: Scalars['Int']['output']
  date: Scalars['String']['output']
  heart_rate_avg?: Maybe<Scalars['Int']['output']>
  steps: Scalars['Int']['output']
}

export type DanceBond = {
  __typename?: 'DanceBond'
  bond_level: Scalars['Int']['output']
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  last_dance_date?: Maybe<Scalars['DateTime']['output']>
  otherUser?: Maybe<User>
  shared_events_count: Scalars['Int']['output']
  shared_sessions?: Maybe<Scalars['Int']['output']>
  total_dances: Scalars['Int']['output']
  updated_at: Scalars['DateTime']['output']
  user1: User
  user1_id: Scalars['String']['output']
  user2: User
  user2_id: Scalars['String']['output']
  user_id_1: Scalars['String']['output']
  user_id_2: Scalars['String']['output']
}

export type DanceMetrics = {
  __typename?: 'DanceMetrics'
  avg_movement_score: Scalars['Float']['output']
  avg_session_duration: Scalars['Float']['output']
  peak_hours: Array<HourlyMetric>
  popular_styles: Array<StyleMetric>
  sessions_this_week: Scalars['Int']['output']
  sessions_today: Scalars['Int']['output']
  total_calories_burned: Scalars['Int']['output']
  trend: Array<TimeSeriesPoint>
}

export type DanceSession = {
  __typename?: 'DanceSession'
  achievements_unlocked?: Maybe<Array<Scalars['String']['output']>>
  app_version?: Maybe<Scalars['String']['output']>
  bpm_average?: Maybe<Scalars['Float']['output']>
  bpm_peak?: Maybe<Scalars['Float']['output']>
  calories_burned?: Maybe<Scalars['Int']['output']>
  created_at: Scalars['DateTime']['output']
  dance_bonds_strengthened?: Maybe<Array<DanceBond>>
  device_type?: Maybe<Scalars['String']['output']>
  duration: Scalars['Int']['output']
  ended_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  is_shared: Scalars['Boolean']['output']
  level_at_session?: Maybe<Scalars['Int']['output']>
  level_ups?: Maybe<Scalars['Int']['output']>
  motion_intensity_avg?: Maybe<Scalars['Float']['output']>
  movement_score?: Maybe<Scalars['Int']['output']>
  session_quality?: Maybe<Scalars['Float']['output']>
  shared_with_user_ids?: Maybe<Array<Scalars['String']['output']>>
  shared_with_users?: Maybe<Array<User>>
  social_xp_bonus?: Maybe<Scalars['Int']['output']>
  started_at: Scalars['DateTime']['output']
  updated_at: Scalars['DateTime']['output']
  user: User
  user_id: Scalars['String']['output']
  xp_earned: Scalars['Int']['output']
}

export type DanceSessionConnection = {
  __typename?: 'DanceSessionConnection'
  pageInfo: PageInfo
  sessions: Array<DanceSession>
  totalCount: Scalars['Int']['output']
}

export type DanceSessionFilterInput = {
  from_date?: InputMaybe<Scalars['DateTime']['input']>
  is_shared?: InputMaybe<Scalars['Boolean']['input']>
  min_duration?: InputMaybe<Scalars['Int']['input']>
  min_score?: InputMaybe<Scalars['Int']['input']>
  to_date?: InputMaybe<Scalars['DateTime']['input']>
  user_id?: InputMaybe<Scalars['String']['input']>
}

export type DanceSessionStats = {
  __typename?: 'DanceSessionStats'
  average_bpm?: Maybe<Scalars['Float']['output']>
  best_duration: Scalars['Int']['output']
  best_score: Scalars['Int']['output']
  current_streak: Scalars['Int']['output']
  longest_streak: Scalars['Int']['output']
  total_calories: Scalars['Int']['output']
  total_duration: Scalars['Int']['output']
  total_sessions: Scalars['Int']['output']
  total_xp_earned: Scalars['Int']['output']
}

export type DanceStyleMetric = {
  __typename?: 'DanceStyleMetric'
  percentage: Scalars['Float']['output']
  style: Scalars['String']['output']
  users: Scalars['Int']['output']
}

export type DemographicsMetrics = {
  __typename?: 'DemographicsMetrics'
  by_age_group: Array<AgeGroupMetric>
  by_city: Array<CityMetric>
  by_country: Array<CountryMetric>
  by_dance_style: Array<DanceStyleMetric>
  by_skill_level: Array<SkillLevelMetric>
}

export type DevAlert = {
  __typename?: 'DevAlert'
  action_label?: Maybe<Scalars['String']['output']>
  action_url?: Maybe<Scalars['String']['output']>
  alert_type: DevAlertType
  category: DevAlertCategory
  created_at: Scalars['DateTime']['output']
  expires_at?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  is_actionable: Scalars['Boolean']['output']
  is_dismissed: Scalars['Boolean']['output']
  is_read: Scalars['Boolean']['output']
  message: Scalars['String']['output']
  metadata?: Maybe<Scalars['JSON']['output']>
  priority: DevAlertPriority
  project?: Maybe<Project>
  project_id?: Maybe<Scalars['ID']['output']>
  source_id?: Maybe<Scalars['String']['output']>
  source_type?: Maybe<Scalars['String']['output']>
  target_roles?: Maybe<Array<Scalars['String']['output']>>
  target_users?: Maybe<Array<Scalars['String']['output']>>
  title: Scalars['String']['output']
}

export enum DevAlertCategory {
  Api = 'api',
  Database = 'database',
  Deployment = 'deployment',
  FeatureRequest = 'feature_request',
  General = 'general',
  Payment = 'payment',
  Performance = 'performance',
  Security = 'security',
  System = 'system',
  UserReport = 'user_report',
}

export type DevAlertConnection = {
  __typename?: 'DevAlertConnection'
  alerts: Array<DevAlert>
  has_more: Scalars['Boolean']['output']
  total_count: Scalars['Int']['output']
  unread_count: Scalars['Int']['output']
}

export type DevAlertFilter = {
  alert_type?: InputMaybe<Array<DevAlertType>>
  category?: InputMaybe<Array<DevAlertCategory>>
  is_dismissed?: InputMaybe<Scalars['Boolean']['input']>
  is_read?: InputMaybe<Scalars['Boolean']['input']>
  priority?: InputMaybe<Array<DevAlertPriority>>
  project_id?: InputMaybe<Scalars['ID']['input']>
}

export enum DevAlertPriority {
  High = 'high',
  Low = 'low',
  Normal = 'normal',
  Urgent = 'urgent',
}

export enum DevAlertType {
  Critical = 'critical',
  Error = 'error',
  Info = 'info',
  Success = 'success',
  System = 'system',
  Warning = 'warning',
}

export type DevDashboardStats = {
  __typename?: 'DevDashboardStats'
  blocked_tasks: Scalars['Int']['output']
  completed_requests: Scalars['Int']['output']
  critical_alerts?: Maybe<Scalars['Int']['output']>
  github_open_issues?: Maybe<Scalars['Int']['output']>
  github_open_prs?: Maybe<Scalars['Int']['output']>
  github_rate_limit?: Maybe<GitHubRateLimit>
  implemented_features?: Maybe<Scalars['Int']['output']>
  in_progress_features?: Maybe<Scalars['Int']['output']>
  in_progress_requests: Scalars['Int']['output']
  in_progress_tasks: Scalars['Int']['output']
  latest_version?: Maybe<Scalars['String']['output']>
  pending_requests: Scalars['Int']['output']
  planned_features?: Maybe<Scalars['Int']['output']>
  todo_tasks: Scalars['Int']['output']
  total_changelog_entries: Scalars['Int']['output']
  total_feature_requests: Scalars['Int']['output']
  total_features?: Maybe<Scalars['Int']['output']>
  total_tasks: Scalars['Int']['output']
  unread_alerts?: Maybe<Scalars['Int']['output']>
}

export type DevTask = {
  __typename?: 'DevTask'
  actual_hours?: Maybe<Scalars['Int']['output']>
  assigned_to?: Maybe<User>
  completed_at?: Maybe<Scalars['DateTime']['output']>
  created_at: Scalars['DateTime']['output']
  created_by?: Maybe<User>
  description?: Maybe<Scalars['String']['output']>
  due_date?: Maybe<Scalars['String']['output']>
  estimated_hours?: Maybe<Scalars['Int']['output']>
  feature_request?: Maybe<FeatureRequest>
  github_issue_url?: Maybe<Scalars['String']['output']>
  github_pr_url?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  parent_task?: Maybe<DevTask>
  priority: TaskPriority
  project?: Maybe<Project>
  project_id?: Maybe<Scalars['ID']['output']>
  sprint?: Maybe<Scalars['String']['output']>
  started_at?: Maybe<Scalars['DateTime']['output']>
  status: DevTaskStatus
  subtasks?: Maybe<Array<DevTask>>
  tags?: Maybe<Array<Scalars['String']['output']>>
  task_type: DevTaskType
  title: Scalars['String']['output']
  updated_at: Scalars['DateTime']['output']
}

export type DevTaskConnection = {
  __typename?: 'DevTaskConnection'
  has_more: Scalars['Boolean']['output']
  tasks: Array<DevTask>
  total_count: Scalars['Int']['output']
}

export type DevTaskFilter = {
  assigned_to?: InputMaybe<Scalars['String']['input']>
  priority?: InputMaybe<Array<TaskPriority>>
  project_id?: InputMaybe<Scalars['ID']['input']>
  search?: InputMaybe<Scalars['String']['input']>
  sprint?: InputMaybe<Scalars['String']['input']>
  status?: InputMaybe<Array<DevTaskStatus>>
  task_type?: InputMaybe<Array<DevTaskType>>
}

export enum DevTaskStatus {
  Blocked = 'blocked',
  Done = 'done',
  InProgress = 'in_progress',
  Review = 'review',
  Testing = 'testing',
  Todo = 'todo',
}

export enum DevTaskType {
  Bug = 'bug',
  Documentation = 'documentation',
  Hotfix = 'hotfix',
  Research = 'research',
  Task = 'task',
  TechDebt = 'tech_debt',
}

export type DistributionBreakdown = {
  __typename?: 'DistributionBreakdown'
  platformFees: Scalars['Float']['output']
  volunteers: Scalars['Float']['output']
  workers: Scalars['Float']['output']
}

export type EconomyMetrics = {
  __typename?: 'EconomyMetrics'
  points_sources: Array<PointsSource>
  top_earners: Array<TopEarner>
  total_points_earned: Scalars['Float']['output']
  total_xp_earned: Scalars['Float']['output']
  trend: Array<TimeSeriesPoint>
  xp_distribution: Array<XpDistribution>
}

export type EngagementMetrics = {
  __typename?: 'EngagementMetrics'
  avg_dance_time_per_user: Scalars['Float']['output']
  avg_session_duration: Scalars['Float']['output']
  avg_sessions_per_user: Scalars['Float']['output']
  power_users_count: Scalars['Int']['output']
  power_users_percentage: Scalars['Float']['output']
}

export type Event = {
  __typename?: 'Event'
  allow_sponsors?: Maybe<Scalars['Boolean']['output']>
  category?: Maybe<EventCategory>
  checkin_code?: Maybe<Scalars['String']['output']>
  created_at: Scalars['DateTime']['output']
  currency?: Maybe<Scalars['String']['output']>
  current_capacity?: Maybe<Scalars['Int']['output']>
  dance_styles?: Maybe<Array<Scalars['String']['output']>>
  description?: Maybe<Scalars['String']['output']>
  distance?: Maybe<Scalars['Float']['output']>
  end_date_time: Scalars['DateTime']['output']
  facilitator?: Maybe<User>
  facilitator_id?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  image_url?: Maybe<Scalars['String']['output']>
  is_featured?: Maybe<Scalars['Boolean']['output']>
  is_public?: Maybe<Scalars['Boolean']['output']>
  is_recurring?: Maybe<Scalars['Boolean']['output']>
  is_registered?: Maybe<Scalars['Boolean']['output']>
  is_virtual?: Maybe<Scalars['Boolean']['output']>
  location_address?: Maybe<Scalars['String']['output']>
  location_city?: Maybe<Scalars['String']['output']>
  location_latitude?: Maybe<Scalars['Float']['output']>
  location_longitude?: Maybe<Scalars['Float']['output']>
  location_name: Scalars['String']['output']
  max_capacity?: Maybe<Scalars['Int']['output']>
  parent_event?: Maybe<Event>
  parent_event_id?: Maybe<Scalars['ID']['output']>
  participants?: Maybe<Array<EventRegistration>>
  price_danz?: Maybe<Scalars['Float']['output']>
  price_usd?: Maybe<Scalars['Float']['output']>
  recurrence_count?: Maybe<Scalars['Int']['output']>
  recurrence_days?: Maybe<Array<Scalars['String']['output']>>
  recurrence_end_date?: Maybe<Scalars['DateTime']['output']>
  recurrence_type?: Maybe<RecurrenceType>
  recurring_instances?: Maybe<Array<Event>>
  registration_count?: Maybe<Scalars['Int']['output']>
  requirements?: Maybe<Scalars['String']['output']>
  skill_level?: Maybe<SkillLevel>
  slug?: Maybe<Scalars['String']['output']>
  sponsor_benefits?: Maybe<Scalars['String']['output']>
  sponsor_contact_email?: Maybe<Scalars['String']['output']>
  sponsor_count?: Maybe<Scalars['Int']['output']>
  sponsor_tier_config?: Maybe<Scalars['JSON']['output']>
  start_date_time: Scalars['DateTime']['output']
  status?: Maybe<EventStatus>
  tags?: Maybe<Array<Scalars['String']['output']>>
  title: Scalars['String']['output']
  updated_at: Scalars['DateTime']['output']
  user_registration_status?: Maybe<RegistrationStatus>
  virtual_link?: Maybe<Scalars['String']['output']>
}

export type EventAttendance = {
  __typename?: 'EventAttendance'
  attendance_verified: Scalars['Boolean']['output']
  checked_in: Scalars['Boolean']['output']
  checked_in_at?: Maybe<Scalars['DateTime']['output']>
  checked_out: Scalars['Boolean']['output']
  checked_out_at?: Maybe<Scalars['DateTime']['output']>
  created_at: Scalars['DateTime']['output']
  duration_minutes: Scalars['Int']['output']
  event?: Maybe<Event>
  event_id: Scalars['ID']['output']
  id: Scalars['ID']['output']
  points_earned: Scalars['Int']['output']
  registration_id?: Maybe<Scalars['ID']['output']>
  updated_at: Scalars['DateTime']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
  verified_at?: Maybe<Scalars['DateTime']['output']>
  verified_by?: Maybe<Scalars['String']['output']>
  verifier?: Maybe<User>
}

export type EventAttendanceSummary = {
  __typename?: 'EventAttendanceSummary'
  avg_duration_minutes?: Maybe<Scalars['Float']['output']>
  avg_points_per_attendee?: Maybe<Scalars['Float']['output']>
  checked_in_count: Scalars['Int']['output']
  end_date?: Maybe<Scalars['DateTime']['output']>
  event_id: Scalars['ID']['output']
  event_name: Scalars['String']['output']
  start_date: Scalars['DateTime']['output']
  total_attendees: Scalars['Int']['output']
  total_points_awarded: Scalars['Int']['output']
  verified_count: Scalars['Int']['output']
}

export enum EventCategory {
  Ballet = 'ballet',
  Ballroom = 'ballroom',
  Battle = 'battle',
  Class = 'class',
  Contemporary = 'contemporary',
  Cultural = 'cultural',
  Fitness = 'fitness',
  HipHop = 'hip_hop',
  Jazz = 'jazz',
  Other = 'other',
  Performance = 'performance',
  Salsa = 'salsa',
  Social = 'social',
  Street = 'street',
  Workshop = 'workshop',
}

export type EventConnection = {
  __typename?: 'EventConnection'
  events: Array<Event>
  pageInfo: PageInfo
  totalCount: Scalars['Int']['output']
}

export type EventFilterInput = {
  category?: InputMaybe<EventCategory>
  city?: InputMaybe<Scalars['String']['input']>
  created_by?: InputMaybe<Scalars['String']['input']>
  created_by_me?: InputMaybe<Scalars['Boolean']['input']>
  dance_style?: InputMaybe<Scalars['String']['input']>
  endDate?: InputMaybe<Scalars['DateTime']['input']>
  exclude_instances?: InputMaybe<Scalars['Boolean']['input']>
  facilitator_id?: InputMaybe<Scalars['String']['input']>
  is_featured?: InputMaybe<Scalars['Boolean']['input']>
  is_recurring?: InputMaybe<Scalars['Boolean']['input']>
  is_virtual?: InputMaybe<Scalars['Boolean']['input']>
  maxPrice?: InputMaybe<Scalars['Float']['input']>
  minPrice?: InputMaybe<Scalars['Float']['input']>
  nearLocation?: InputMaybe<LocationInput>
  registered_by?: InputMaybe<Scalars['String']['input']>
  registered_by_me?: InputMaybe<Scalars['Boolean']['input']>
  skill_level?: InputMaybe<SkillLevel>
  startDate?: InputMaybe<Scalars['DateTime']['input']>
  status?: InputMaybe<EventStatus>
}

export type EventFlowPool = {
  __typename?: 'EventFlowPool'
  allocatedFlow: Scalars['Float']['output']
  completedAt?: Maybe<Scalars['DateTime']['output']>
  distributedFlow: Scalars['Float']['output']
  distributionStartedAt?: Maybe<Scalars['DateTime']['output']>
  event: Event
  id: Scalars['ID']['output']
  lockedAt?: Maybe<Scalars['DateTime']['output']>
  remainingFlow: Scalars['Float']['output']
  sponsors?: Maybe<Array<EventSponsorship>>
  status: PoolStatus
  totalFlow: Scalars['Float']['output']
}

export type EventGig = {
  __typename?: 'EventGig'
  applications?: Maybe<Array<GigApplication>>
  approvalMode: GigApprovalMode
  approvedApplications?: Maybe<Array<GigApplication>>
  bonusDanz?: Maybe<Scalars['Float']['output']>
  canApply: Scalars['Boolean']['output']
  createdAt: Scalars['DateTime']['output']
  createdBy: Scalars['String']['output']
  danzReward: Scalars['Float']['output']
  description?: Maybe<Scalars['String']['output']>
  event?: Maybe<Event>
  eventId: Scalars['ID']['output']
  gigSource: GigSource
  id: Scalars['ID']['output']
  localRadiusKm?: Maybe<Scalars['Int']['output']>
  myApplication?: Maybe<GigApplication>
  requiresLocal: Scalars['Boolean']['output']
  role: GigRole
  roleId: Scalars['ID']['output']
  slotsAvailable: Scalars['Int']['output']
  slotsFilled: Scalars['Int']['output']
  specificRequirements?: Maybe<Scalars['String']['output']>
  status: EventGigStatus
  timeCommitment?: Maybe<Scalars['String']['output']>
  title: Scalars['String']['output']
  updatedAt: Scalars['DateTime']['output']
}

export type EventGigManager = {
  __typename?: 'EventGigManager'
  assignedAt: Scalars['DateTime']['output']
  assignedBy: Scalars['String']['output']
  assigner: User
  event?: Maybe<Event>
  eventId: Scalars['ID']['output']
  id: Scalars['ID']['output']
  user: User
  userId: Scalars['String']['output']
}

export enum EventGigStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Filled = 'FILLED',
  InProgress = 'IN_PROGRESS',
  Open = 'OPEN',
}

export type EventLeaderboard = {
  __typename?: 'EventLeaderboard'
  event_id: Scalars['String']['output']
  event_name: Scalars['String']['output']
  leaderboard: Leaderboard
  prizes?: Maybe<Array<LeaderboardPrize>>
}

export type EventManager = {
  __typename?: 'EventManager'
  accepted_at?: Maybe<Scalars['DateTime']['output']>
  can_delete_event: Scalars['Boolean']['output']
  can_edit_details: Scalars['Boolean']['output']
  can_invite_managers: Scalars['Boolean']['output']
  can_manage_posts: Scalars['Boolean']['output']
  can_manage_registrations: Scalars['Boolean']['output']
  can_send_broadcasts: Scalars['Boolean']['output']
  created_at: Scalars['DateTime']['output']
  event?: Maybe<Event>
  event_id: Scalars['ID']['output']
  id: Scalars['ID']['output']
  invited_at?: Maybe<Scalars['DateTime']['output']>
  invited_by?: Maybe<Scalars['String']['output']>
  inviter?: Maybe<User>
  role: EventManagerRole
  status: EventManagerStatus
  updated_at?: Maybe<Scalars['DateTime']['output']>
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

export type EventManagerConnection = {
  __typename?: 'EventManagerConnection'
  managers: Array<EventManager>
  total_count: Scalars['Int']['output']
}

export type EventManagerPermissions = {
  __typename?: 'EventManagerPermissions'
  can_delete_event: Scalars['Boolean']['output']
  can_edit_details: Scalars['Boolean']['output']
  can_invite_managers: Scalars['Boolean']['output']
  can_manage_posts: Scalars['Boolean']['output']
  can_manage_registrations: Scalars['Boolean']['output']
  can_send_broadcasts: Scalars['Boolean']['output']
}

export enum EventManagerRole {
  Creator = 'creator',
  Manager = 'manager',
  Moderator = 'moderator',
}

export enum EventManagerStatus {
  Active = 'active',
  Declined = 'declined',
  Pending = 'pending',
  Removed = 'removed',
}

export type EventMetrics = {
  __typename?: 'EventMetrics'
  avg_attendance: Scalars['Float']['output']
  avg_rating: Scalars['Float']['output']
  completed_events: Scalars['Int']['output']
  popular_categories: Array<CategoryMetric>
  total_events: Scalars['Int']['output']
  total_registrations: Scalars['Int']['output']
  trend: Array<TimeSeriesPoint>
  upcoming_events: Scalars['Int']['output']
}

export type EventRegistration = {
  __typename?: 'EventRegistration'
  admin_notes?: Maybe<Scalars['String']['output']>
  check_in_time?: Maybe<Scalars['DateTime']['output']>
  checked_in?: Maybe<Scalars['Boolean']['output']>
  created_at?: Maybe<Scalars['DateTime']['output']>
  event?: Maybe<Event>
  event_id: Scalars['String']['output']
  id: Scalars['ID']['output']
  payment_amount?: Maybe<Scalars['Float']['output']>
  payment_date?: Maybe<Scalars['DateTime']['output']>
  payment_status?: Maybe<PaymentStatus>
  registration_date?: Maybe<Scalars['DateTime']['output']>
  status?: Maybe<RegistrationStatus>
  updated_at?: Maybe<Scalars['DateTime']['output']>
  user?: Maybe<User>
  user_id: Scalars['String']['output']
  user_notes?: Maybe<Scalars['String']['output']>
}

export enum EventSortBy {
  CreatedAtDesc = 'created_at_desc',
  DateAsc = 'date_asc',
  DateDesc = 'date_desc',
  PriceAsc = 'price_asc',
  PriceDesc = 'price_desc',
  TitleAsc = 'title_asc',
  TitleDesc = 'title_desc',
}

export type EventSponsorship = {
  __typename?: 'EventSponsorship'
  allocationConfig: AllocationConfig
  completedAt?: Maybe<Scalars['DateTime']['output']>
  completionNotes?: Maybe<Scalars['String']['output']>
  createdAt: Scalars['DateTime']['output']
  event: Event
  flowAllocated: Scalars['Float']['output']
  flowAmount: Scalars['Float']['output']
  flowDistributed: Scalars['Float']['output']
  id: Scalars['ID']['output']
  sponsor: Sponsor
  sponsorMessage?: Maybe<Scalars['String']['output']>
  status: SponsorshipStatus
  updatedAt: Scalars['DateTime']['output']
  visibility: SponsorshipVisibility
}

export type EventSponsorshipAnalytics = {
  __typename?: 'EventSponsorshipAnalytics'
  distributionBreakdown: DistributionBreakdown
  goalPercentage?: Maybe<Scalars['Float']['output']>
  numberOfSponsors: Scalars['Int']['output']
  sponsorsByCategory: Array<CategorySponsorBreakdown>
  sponsorsByTier: Array<TierBreakdown>
  totalReceived: Scalars['Float']['output']
}

export type EventSponsorshipSettings = {
  __typename?: 'EventSponsorshipSettings'
  acceptanceMode: AcceptanceMode
  autoAcceptAll: Scalars['Boolean']['output']
  blockedCategories?: Maybe<Array<Maybe<Scalars['String']['output']>>>
  currentTotal?: Maybe<Scalars['Float']['output']>
  eventId: Scalars['ID']['output']
  goalProgress?: Maybe<Scalars['Float']['output']>
  id: Scalars['ID']['output']
  minAutoAcceptAmount?: Maybe<Scalars['Float']['output']>
  notifyOnGoalReached: Scalars['Boolean']['output']
  notifyOnNewSponsor: Scalars['Boolean']['output']
  pitchMessage?: Maybe<Scalars['String']['output']>
  preferredCategories?: Maybe<Array<Maybe<Scalars['String']['output']>>>
  seekingSponsorship: Scalars['Boolean']['output']
  sponsorshipDeadline?: Maybe<Scalars['DateTime']['output']>
  sponsorshipGoal?: Maybe<Scalars['Float']['output']>
}

export type EventSponsorshipSettingsInput = {
  acceptanceMode?: InputMaybe<AcceptanceMode>
  autoAcceptAll?: InputMaybe<Scalars['Boolean']['input']>
  blockedCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  minAutoAcceptAmount?: InputMaybe<Scalars['Float']['input']>
  notifyOnGoalReached?: InputMaybe<Scalars['Boolean']['input']>
  notifyOnNewSponsor?: InputMaybe<Scalars['Boolean']['input']>
  pitchMessage?: InputMaybe<Scalars['String']['input']>
  preferredCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  seekingSponsorship?: InputMaybe<Scalars['Boolean']['input']>
  sponsorshipDeadline?: InputMaybe<Scalars['DateTime']['input']>
  sponsorshipGoal?: InputMaybe<Scalars['Float']['input']>
}

export enum EventStatus {
  Cancelled = 'cancelled',
  Ongoing = 'ongoing',
  Past = 'past',
  Upcoming = 'upcoming',
}

export type EventsForSponsorshipInput = {
  categories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  danceStyles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  dateFrom?: InputMaybe<Scalars['DateTime']['input']>
  dateTo?: InputMaybe<Scalars['DateTime']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  maxBudget?: InputMaybe<Scalars['Float']['input']>
  minCapacity?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  region?: InputMaybe<Scalars['String']['input']>
  verifiedCreatorsOnly?: InputMaybe<Scalars['Boolean']['input']>
}

export enum FeatureImplementationStatus {
  Implemented = 'implemented',
  InProgress = 'in_progress',
  NeedsRefactor = 'needs_refactor',
  NotStarted = 'not_started',
  PartiallyImplemented = 'partially_implemented',
  Planned = 'planned',
}

export type FeatureInventory = {
  __typename?: 'FeatureInventory'
  actual_hours?: Maybe<Scalars['Int']['output']>
  api_docs_url?: Maybe<Scalars['String']['output']>
  backend_status: ComponentStatus
  category: FeatureInventoryCategory
  completion_percentage: Scalars['Int']['output']
  created_at: Scalars['DateTime']['output']
  database_status: ComponentStatus
  dependencies?: Maybe<Array<Scalars['String']['output']>>
  description?: Maybe<Scalars['String']['output']>
  estimated_hours?: Maybe<Scalars['Int']['output']>
  frontend_status: ComponentStatus
  id: Scalars['ID']['output']
  is_miniapp_ready: Scalars['Boolean']['output']
  miniapp_api_available: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  notes?: Maybe<Scalars['String']['output']>
  priority?: Maybe<TaskPriority>
  project?: Maybe<Project>
  project_id?: Maybe<Scalars['ID']['output']>
  related_files?: Maybe<Array<Scalars['String']['output']>>
  slug: Scalars['String']['output']
  status: FeatureImplementationStatus
  target_version?: Maybe<Scalars['String']['output']>
  updated_at: Scalars['DateTime']['output']
}

export enum FeatureInventoryCategory {
  Admin = 'admin',
  Analytics = 'analytics',
  DanceSessions = 'dance_sessions',
  Developer = 'developer',
  Events = 'events',
  Integrations = 'integrations',
  Miniapps = 'miniapps',
  Notifications = 'notifications',
  Payments = 'payments',
  Referral = 'referral',
  Social = 'social',
  UserManagement = 'user_management',
}

export type FeatureInventoryConnection = {
  __typename?: 'FeatureInventoryConnection'
  features: Array<FeatureInventory>
  has_more: Scalars['Boolean']['output']
  total_count: Scalars['Int']['output']
}

export type FeatureInventoryFilter = {
  category?: InputMaybe<Array<FeatureInventoryCategory>>
  is_miniapp_ready?: InputMaybe<Scalars['Boolean']['input']>
  miniapp_api_available?: InputMaybe<Scalars['Boolean']['input']>
  priority?: InputMaybe<Array<TaskPriority>>
  project_id?: InputMaybe<Scalars['ID']['input']>
  search?: InputMaybe<Scalars['String']['input']>
  status?: InputMaybe<Array<FeatureImplementationStatus>>
}

export type FeatureInventoryStats = {
  __typename?: 'FeatureInventoryStats'
  average_completion: Scalars['Float']['output']
  by_category: Scalars['JSON']['output']
  by_status: Scalars['JSON']['output']
  miniapp_ready_count: Scalars['Int']['output']
  total: Scalars['Int']['output']
}

export type FeatureRequest = {
  __typename?: 'FeatureRequest'
  actual_hours?: Maybe<Scalars['Int']['output']>
  assigned_at?: Maybe<Scalars['DateTime']['output']>
  assigned_to?: Maybe<User>
  category: FeatureRequestCategory
  comments?: Maybe<Array<FeatureRequestComment>>
  completed_at?: Maybe<Scalars['DateTime']['output']>
  created_at: Scalars['DateTime']['output']
  description?: Maybe<Scalars['String']['output']>
  estimated_hours?: Maybe<Scalars['Int']['output']>
  github_issue_url?: Maybe<Scalars['String']['output']>
  github_pr_url?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  priority?: Maybe<TaskPriority>
  project?: Maybe<Project>
  project_id?: Maybe<Scalars['ID']['output']>
  requested_at: Scalars['DateTime']['output']
  requested_by?: Maybe<User>
  status: FeatureRequestStatus
  tags?: Maybe<Array<Scalars['String']['output']>>
  target_version?: Maybe<Scalars['String']['output']>
  title: Scalars['String']['output']
  updated_at: Scalars['DateTime']['output']
  user_vote?: Maybe<Scalars['String']['output']>
  votes: Scalars['Int']['output']
}

export enum FeatureRequestCategory {
  Bug = 'bug',
  Enhancement = 'enhancement',
  Integration = 'integration',
  Performance = 'performance',
  Security = 'security',
  Ux = 'ux',
}

export type FeatureRequestComment = {
  __typename?: 'FeatureRequestComment'
  content: Scalars['String']['output']
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  is_internal: Scalars['Boolean']['output']
  user?: Maybe<User>
}

export type FeatureRequestConnection = {
  __typename?: 'FeatureRequestConnection'
  has_more: Scalars['Boolean']['output']
  requests: Array<FeatureRequest>
  total_count: Scalars['Int']['output']
}

export type FeatureRequestFilter = {
  assigned_to?: InputMaybe<Scalars['String']['input']>
  category?: InputMaybe<Array<FeatureRequestCategory>>
  priority?: InputMaybe<Array<TaskPriority>>
  project_id?: InputMaybe<Scalars['ID']['input']>
  requested_by?: InputMaybe<Scalars['String']['input']>
  search?: InputMaybe<Scalars['String']['input']>
  status?: InputMaybe<Array<FeatureRequestStatus>>
}

export enum FeatureRequestStatus {
  Completed = 'completed',
  Deferred = 'deferred',
  InProgress = 'in_progress',
  Planned = 'planned',
  Rejected = 'rejected',
  Requested = 'requested',
  Testing = 'testing',
  UnderReview = 'under_review',
}

export type FeedResponse = {
  __typename?: 'FeedResponse'
  cursor?: Maybe<Scalars['String']['output']>
  has_more: Scalars['Boolean']['output']
  posts: Array<Post>
}

export type Feedback = {
  __typename?: 'Feedback'
  admin_notes?: Maybe<Scalars['String']['output']>
  app_version?: Maybe<Scalars['String']['output']>
  created_at: Scalars['DateTime']['output']
  device_info?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  message: Scalars['String']['output']
  resolved_at?: Maybe<Scalars['DateTime']['output']>
  resolved_by?: Maybe<Scalars['String']['output']>
  screenshot_url?: Maybe<Scalars['String']['output']>
  status: FeedbackStatus
  updated_at: Scalars['DateTime']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

export type FeedbackStats = {
  __typename?: 'FeedbackStats'
  dismissed: Scalars['Int']['output']
  in_progress: Scalars['Int']['output']
  pending: Scalars['Int']['output']
  resolved: Scalars['Int']['output']
  reviewed: Scalars['Int']['output']
  total: Scalars['Int']['output']
}

export enum FeedbackStatus {
  Dismissed = 'dismissed',
  InProgress = 'in_progress',
  Pending = 'pending',
  Resolved = 'resolved',
  Reviewed = 'reviewed',
}

export type FileUploadResponse = {
  __typename?: 'FileUploadResponse'
  filename?: Maybe<Scalars['String']['output']>
  message?: Maybe<Scalars['String']['output']>
  mimetype?: Maybe<Scalars['String']['output']>
  size?: Maybe<Scalars['Int']['output']>
  success: Scalars['Boolean']['output']
  url?: Maybe<Scalars['String']['output']>
}

export type FlowDanzSwap = {
  __typename?: 'FlowDanzSwap'
  completedAt?: Maybe<Scalars['DateTime']['output']>
  createdAt: Scalars['DateTime']['output']
  danzAmount?: Maybe<Scalars['Float']['output']>
  errorMessage?: Maybe<Scalars['String']['output']>
  exchangeRate?: Maybe<Scalars['Float']['output']>
  flowAmount: Scalars['Float']['output']
  id: Scalars['ID']['output']
  processedAt?: Maybe<Scalars['DateTime']['output']>
  status: Scalars['String']['output']
  triggerType: Scalars['String']['output']
  userId: Scalars['String']['output']
}

export type FlowTransaction = {
  __typename?: 'FlowTransaction'
  amount: Scalars['Float']['output']
  completedAt?: Maybe<Scalars['DateTime']['output']>
  createdAt: Scalars['DateTime']['output']
  description?: Maybe<Scalars['String']['output']>
  event?: Maybe<Event>
  fromUser?: Maybe<User>
  id: Scalars['ID']['output']
  metadata?: Maybe<Scalars['JSON']['output']>
  sponsor?: Maybe<Sponsor>
  status: TransactionStatus
  toUser?: Maybe<User>
  transactionType: FlowTransactionType
  txHash?: Maybe<Scalars['String']['output']>
}

export enum FlowTransactionType {
  GigPayment = 'gig_payment',
  PlatformFee = 'platform_fee',
  Refund = 'refund',
  SponsorDeposit = 'sponsor_deposit',
  SwapToDanz = 'swap_to_danz',
  VolunteerReward = 'volunteer_reward',
  Withdrawal = 'withdrawal',
}

export type FreestyleSession = {
  __typename?: 'FreestyleSession'
  achievements_unlocked?: Maybe<Array<Scalars['String']['output']>>
  completed: Scalars['Boolean']['output']
  created_at: Scalars['DateTime']['output']
  duration_seconds: Scalars['Int']['output']
  id: Scalars['ID']['output']
  motion_data?: Maybe<Scalars['JSON']['output']>
  movement_score: Scalars['Float']['output']
  music_source: MusicSource
  points_awarded: Scalars['Int']['output']
  session_date: Scalars['DateTime']['output']
  updated_at: Scalars['DateTime']['output']
  user: User
  user_id: Scalars['String']['output']
}

export type FreestyleSessionStats = {
  __typename?: 'FreestyleSessionStats'
  average_movement_score: Scalars['Float']['output']
  best_movement_score: Scalars['Float']['output']
  current_streak: Scalars['Int']['output']
  last_session_date?: Maybe<Scalars['DateTime']['output']>
  longest_streak: Scalars['Int']['output']
  sessions_this_week: Scalars['Int']['output']
  total_duration_seconds: Scalars['Int']['output']
  total_points: Scalars['Int']['output']
  total_sessions: Scalars['Int']['output']
}

export type GigApplication = {
  __typename?: 'GigApplication'
  aiReviewNotes?: Maybe<Scalars['JSON']['output']>
  aiReviewScore?: Maybe<Scalars['Float']['output']>
  aiReviewedAt?: Maybe<Scalars['DateTime']['output']>
  applicationNote?: Maybe<Scalars['String']['output']>
  checkInTime?: Maybe<Scalars['DateTime']['output']>
  checkOutTime?: Maybe<Scalars['DateTime']['output']>
  completionProof?: Maybe<Scalars['JSON']['output']>
  createdAt: Scalars['DateTime']['output']
  danzAwarded?: Maybe<Scalars['Float']['output']>
  danzAwardedAt?: Maybe<Scalars['DateTime']['output']>
  gig: EventGig
  gigId: Scalars['ID']['output']
  id: Scalars['ID']['output']
  organizerFeedback?: Maybe<Scalars['String']['output']>
  organizerRating?: Maybe<Scalars['Int']['output']>
  rejectionReason?: Maybe<Scalars['String']['output']>
  reviewedAt?: Maybe<Scalars['DateTime']['output']>
  reviewedBy?: Maybe<Scalars['String']['output']>
  reviewer?: Maybe<User>
  status: GigApplicationStatus
  submissions?: Maybe<Array<GigSubmission>>
  updatedAt: Scalars['DateTime']['output']
  user: User
  userId: Scalars['String']['output']
  userRole: UserGigRole
  userRoleId: Scalars['ID']['output']
  workerFeedback?: Maybe<Scalars['String']['output']>
  workerRating?: Maybe<Scalars['Int']['output']>
}

export enum GigApplicationStatus {
  AiReview = 'AI_REVIEW',
  Approved = 'APPROVED',
  Completed = 'COMPLETED',
  Pending = 'PENDING',
  Rejected = 'REJECTED',
  Withdrawn = 'WITHDRAWN',
}

export enum GigApprovalMode {
  Ai = 'AI',
  Auto = 'AUTO',
  Manual = 'MANUAL',
}

export type GigDashboard = {
  __typename?: 'GigDashboard'
  activeGigs: Array<GigApplication>
  availableGigs: Array<EventGig>
  myRoles: Array<UserGigRole>
  recentHistory: Array<GigApplication>
  stats: GigStats
}

export type GigManagerDashboard = {
  __typename?: 'GigManagerDashboard'
  pendingGigApplications: Array<GigApplication>
  pendingRoleApplications: Array<UserGigRole>
  pendingSubmissions: Array<GigSubmission>
  recentlyApproved: Array<GigApplication>
  stats: GigManagerStats
}

export type GigManagerStats = {
  __typename?: 'GigManagerStats'
  approvedCount: Scalars['Int']['output']
  averageReviewTime?: Maybe<Scalars['Float']['output']>
  rejectedCount: Scalars['Int']['output']
  todayReviewed: Scalars['Int']['output']
  totalReviewed: Scalars['Int']['output']
}

export type GigPaymentInput = {
  amount: Scalars['Float']['input']
  applicationId: Scalars['ID']['input']
  bonusDanz?: InputMaybe<Scalars['Float']['input']>
  eventId: Scalars['ID']['input']
  note?: InputMaybe<Scalars['String']['input']>
}

export type GigProofInput = {
  contentText?: InputMaybe<Scalars['String']['input']>
  contentUrl?: InputMaybe<Scalars['String']['input']>
  metadata?: InputMaybe<Scalars['JSON']['input']>
  submissionType: GigSubmissionType
}

export type GigRewardRate = {
  __typename?: 'GigRewardRate'
  actionType: Scalars['String']['output']
  baseAmount: Scalars['Float']['output']
  createdAt: Scalars['DateTime']['output']
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  maxAmount?: Maybe<Scalars['Float']['output']>
  minAmount?: Maybe<Scalars['Float']['output']>
  multiplier: Scalars['Float']['output']
  rateName: Scalars['String']['output']
  rateType: Scalars['String']['output']
  role?: Maybe<GigRole>
  roleId?: Maybe<Scalars['ID']['output']>
}

export type GigRole = {
  __typename?: 'GigRole'
  approvedWorkers?: Maybe<Scalars['Int']['output']>
  baseDanzRate: Scalars['Float']['output']
  category: GigRoleCategory
  createdAt: Scalars['DateTime']['output']
  description?: Maybe<Scalars['String']['output']>
  icon?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  registeredWorkers?: Maybe<Scalars['Int']['output']>
  requiresVerification: Scalars['Boolean']['output']
  slug: Scalars['String']['output']
  tier: Scalars['Int']['output']
  verificationRequirements?: Maybe<Scalars['JSON']['output']>
}

export enum GigRoleCategory {
  Creative = 'CREATIVE',
  Hospitality = 'HOSPITALITY',
  Operations = 'OPERATIONS',
  Safety = 'SAFETY',
  Technical = 'TECHNICAL',
}

export enum GigSource {
  Public = 'PUBLIC',
  Self = 'SELF',
}

export type GigStats = {
  __typename?: 'GigStats'
  activeRoles: Scalars['Int']['output']
  averageRating?: Maybe<Scalars['Float']['output']>
  currentApprovedGigs: Scalars['Int']['output']
  lastGigDate?: Maybe<Scalars['DateTime']['output']>
  pendingApplications: Scalars['Int']['output']
  totalDanzEarned: Scalars['Float']['output']
  totalGigsCompleted: Scalars['Int']['output']
}

export type GigSubmission = {
  __typename?: 'GigSubmission'
  aiReviewNotes?: Maybe<Scalars['JSON']['output']>
  aiReviewScore?: Maybe<Scalars['Float']['output']>
  aiReviewStatus?: Maybe<Scalars['String']['output']>
  application: GigApplication
  applicationId: Scalars['ID']['output']
  contentText?: Maybe<Scalars['String']['output']>
  contentUrl?: Maybe<Scalars['String']['output']>
  createdAt: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  manualReviewStatus?: Maybe<Scalars['String']['output']>
  metadata?: Maybe<Scalars['JSON']['output']>
  reviewedAt?: Maybe<Scalars['DateTime']['output']>
  reviewedBy?: Maybe<Scalars['String']['output']>
  submissionType: GigSubmissionType
}

export enum GigSubmissionType {
  Document = 'DOCUMENT',
  Link = 'LINK',
  Photo = 'PHOTO',
  Text = 'TEXT',
  Video = 'VIDEO',
}

export type GitHubAction = {
  __typename?: 'GitHubAction'
  branch: Scalars['String']['output']
  commit_sha: Scalars['String']['output']
  completed_at?: Maybe<Scalars['DateTime']['output']>
  conclusion?: Maybe<Scalars['String']['output']>
  duration_seconds?: Maybe<Scalars['Int']['output']>
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  started_at: Scalars['DateTime']['output']
  status: Scalars['String']['output']
  url: Scalars['String']['output']
  workflow_name: Scalars['String']['output']
}

export type GitHubCommit = {
  __typename?: 'GitHubCommit'
  additions?: Maybe<Scalars['Int']['output']>
  author: Scalars['String']['output']
  author_avatar?: Maybe<Scalars['String']['output']>
  date: Scalars['DateTime']['output']
  deletions?: Maybe<Scalars['Int']['output']>
  message: Scalars['String']['output']
  sha: Scalars['String']['output']
  url: Scalars['String']['output']
}

export type GitHubPullRequest = {
  __typename?: 'GitHubPullRequest'
  additions?: Maybe<Scalars['Int']['output']>
  author: Scalars['String']['output']
  author_avatar?: Maybe<Scalars['String']['output']>
  changed_files?: Maybe<Scalars['Int']['output']>
  closed_at?: Maybe<Scalars['DateTime']['output']>
  created_at: Scalars['DateTime']['output']
  deletions?: Maybe<Scalars['Int']['output']>
  draft?: Maybe<Scalars['Boolean']['output']>
  labels?: Maybe<Array<Scalars['String']['output']>>
  merged_at?: Maybe<Scalars['DateTime']['output']>
  number: Scalars['Int']['output']
  state: Scalars['String']['output']
  title: Scalars['String']['output']
  url: Scalars['String']['output']
}

export type GitHubRateLimit = {
  __typename?: 'GitHubRateLimit'
  limit: Scalars['Int']['output']
  remaining: Scalars['Int']['output']
  reset_at: Scalars['DateTime']['output']
  used: Scalars['Int']['output']
}

export type GitHubRelease = {
  __typename?: 'GitHubRelease'
  author: Scalars['String']['output']
  author_avatar?: Maybe<Scalars['String']['output']>
  body?: Maybe<Scalars['String']['output']>
  draft: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  prerelease: Scalars['Boolean']['output']
  published_at: Scalars['DateTime']['output']
  tag_name: Scalars['String']['output']
  url: Scalars['String']['output']
}

export type GitHubRepo = {
  __typename?: 'GitHubRepo'
  default_branch: Scalars['String']['output']
  description?: Maybe<Scalars['String']['output']>
  forks: Scalars['Int']['output']
  full_name: Scalars['String']['output']
  last_push: Scalars['DateTime']['output']
  name: Scalars['String']['output']
  open_issues: Scalars['Int']['output']
  open_prs?: Maybe<Scalars['Int']['output']>
  stars: Scalars['Int']['output']
  url: Scalars['String']['output']
}

export type HourlyMetric = {
  __typename?: 'HourlyMetric'
  hour: Scalars['Int']['output']
  value: Scalars['Int']['output']
}

export type ImpactMetrics = {
  __typename?: 'ImpactMetrics'
  communityEngagement: Scalars['Float']['output']
  totalDancersReached: Scalars['Int']['output']
  totalHoursSupported: Scalars['Float']['output']
}

export type InviteEventManagerInput = {
  can_edit_details?: InputMaybe<Scalars['Boolean']['input']>
  can_invite_managers?: InputMaybe<Scalars['Boolean']['input']>
  can_manage_posts?: InputMaybe<Scalars['Boolean']['input']>
  can_manage_registrations?: InputMaybe<Scalars['Boolean']['input']>
  can_send_broadcasts?: InputMaybe<Scalars['Boolean']['input']>
  event_id: Scalars['ID']['input']
  role?: InputMaybe<EventManagerRole>
  user_id: Scalars['String']['input']
}

export type Leaderboard = {
  __typename?: 'Leaderboard'
  current_user_entry?: Maybe<LeaderboardEntry>
  entries: Array<LeaderboardEntry>
  metric: LeaderboardMetric
  nearby_entries?: Maybe<Array<LeaderboardEntry>>
  period: Scalars['String']['output']
  total_participants: Scalars['Int']['output']
  type: LeaderboardType
  updated_at: Scalars['DateTime']['output']
}

export type LeaderboardEntry = {
  __typename?: 'LeaderboardEntry'
  avatar_url?: Maybe<Scalars['String']['output']>
  badges?: Maybe<Array<Scalars['String']['output']>>
  city?: Maybe<Scalars['String']['output']>
  country?: Maybe<Scalars['String']['output']>
  display_name?: Maybe<Scalars['String']['output']>
  is_current_user: Scalars['Boolean']['output']
  level: Scalars['Int']['output']
  previous_rank?: Maybe<Scalars['Int']['output']>
  rank: Scalars['Int']['output']
  rank_change?: Maybe<Scalars['Int']['output']>
  user_id: Scalars['String']['output']
  username: Scalars['String']['output']
  value: Scalars['Float']['output']
}

export type LeaderboardHistory = {
  __typename?: 'LeaderboardHistory'
  dates: Array<Scalars['String']['output']>
  ranks: Array<Scalars['Int']['output']>
  values: Array<Scalars['Float']['output']>
}

export enum LeaderboardMetric {
  Calories = 'CALORIES',
  ChallengesCompleted = 'CHALLENGES_COMPLETED',
  DanceTime = 'DANCE_TIME',
  EventsAttended = 'EVENTS_ATTENDED',
  MovementScore = 'MOVEMENT_SCORE',
  Points = 'POINTS',
  Referrals = 'REFERRALS',
  SocialEngagement = 'SOCIAL_ENGAGEMENT',
  Streak = 'STREAK',
  Xp = 'XP',
}

export type LeaderboardPrize = {
  __typename?: 'LeaderboardPrize'
  prize_description?: Maybe<Scalars['String']['output']>
  prize_type: Scalars['String']['output']
  prize_value: Scalars['String']['output']
  rank_from: Scalars['Int']['output']
  rank_to: Scalars['Int']['output']
}

export type LeaderboardSummary = {
  __typename?: 'LeaderboardSummary'
  friends_rank?: Maybe<Scalars['Int']['output']>
  global_rank?: Maybe<Scalars['Int']['output']>
  monthly_change?: Maybe<Scalars['Int']['output']>
  percentile?: Maybe<Scalars['Float']['output']>
  regional_rank?: Maybe<Scalars['Int']['output']>
  top_metric?: Maybe<LeaderboardMetric>
  top_metric_rank?: Maybe<Scalars['Int']['output']>
  weekly_change?: Maybe<Scalars['Int']['output']>
}

export enum LeaderboardType {
  AllTime = 'ALL_TIME',
  Event = 'EVENT',
  Friends = 'FRIENDS',
  Global = 'GLOBAL',
  Monthly = 'MONTHLY',
  Regional = 'REGIONAL',
  Weekly = 'WEEKLY',
}

export type LiveActivityUpdate = {
  __typename?: 'LiveActivityUpdate'
  activity: Activity
  timestamp: Scalars['DateTime']['output']
  type: Scalars['String']['output']
}

export type LiveMetrics = {
  __typename?: 'LiveMetrics'
  sessions_active: Array<TimeSeriesPoint>
  users_online: Array<TimeSeriesPoint>
  xp_per_minute: Array<TimeSeriesPoint>
}

export type LocationInput = {
  latitude: Scalars['Float']['input']
  longitude: Scalars['Float']['input']
  radius?: InputMaybe<Scalars['Float']['input']>
}

export type ManualPointsInput = {
  admin_note: Scalars['String']['input']
  metadata?: InputMaybe<Scalars['JSON']['input']>
  points_amount: Scalars['Int']['input']
  transaction_type: TransactionType
  user_id: Scalars['String']['input']
}

/** Match/similarity reasons between two users */
export type MatchReasons = {
  __typename?: 'MatchReasons'
  /** Overlapping dance styles */
  dance_styles: Array<Scalars['String']['output']>
  /** Overlapping music preferences */
  music_overlap: Array<Scalars['String']['output']>
  /** Number of mutual bonds */
  mutual_bonds: Scalars['Int']['output']
  /** Number of same events attended */
  same_events: Scalars['Int']['output']
  /** Overall similarity score (0-1) */
  similarity_score: Scalars['Float']['output']
}

export enum MediaType {
  Image = 'image',
  Video = 'video',
}

export type Message = {
  __typename?: 'Message'
  content: Scalars['String']['output']
  content_type: MessageContentType
  conversation_id: Scalars['ID']['output']
  created_at: Scalars['DateTime']['output']
  edited_at?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  is_deleted: Scalars['Boolean']['output']
  is_edited: Scalars['Boolean']['output']
  is_read_by_me: Scalars['Boolean']['output']
  media_metadata?: Maybe<Scalars['JSON']['output']>
  media_type?: Maybe<Scalars['String']['output']>
  media_url?: Maybe<Scalars['String']['output']>
  reaction_counts?: Maybe<Scalars['JSON']['output']>
  reactions: Array<MessageReaction>
  read_by_count: Scalars['Int']['output']
  reply_to?: Maybe<Message>
  sender: User
}

export type MessageConnection = {
  __typename?: 'MessageConnection'
  has_more: Scalars['Boolean']['output']
  messages: Array<Message>
  newest_message_id?: Maybe<Scalars['ID']['output']>
  oldest_message_id?: Maybe<Scalars['ID']['output']>
  total_count: Scalars['Int']['output']
}

export enum MessageContentType {
  File = 'file',
  Image = 'image',
  System = 'system',
  Text = 'text',
}

export type MessageReaction = {
  __typename?: 'MessageReaction'
  created_at: Scalars['DateTime']['output']
  emoji: Scalars['String']['output']
  id: Scalars['ID']['output']
  user: User
}

export enum MimeType {
  ApplicationMsword = 'APPLICATION_MSWORD',
  ApplicationPdf = 'APPLICATION_PDF',
  ApplicationVndOpenxmlformatsOfficedocumentWordprocessingmlDocument = 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_WORDPROCESSINGML_DOCUMENT',
  ImageGif = 'IMAGE_GIF',
  ImageJpeg = 'IMAGE_JPEG',
  ImagePng = 'IMAGE_PNG',
  ImageWebp = 'IMAGE_WEBP',
  VideoAvi = 'VIDEO_AVI',
  VideoMp4 = 'VIDEO_MP4',
  VideoQuicktime = 'VIDEO_QUICKTIME',
  VideoWebm = 'VIDEO_WEBM',
}

export type MiniappActivity = {
  __typename?: 'MiniappActivity'
  icon: Scalars['String']['output']
  id: Scalars['String']['output']
  subtitle?: Maybe<Scalars['String']['output']>
  timestamp: Scalars['DateTime']['output']
  title: Scalars['String']['output']
  type: Scalars['String']['output']
  xp_earned?: Maybe<Scalars['Int']['output']>
}

export type MiniappChallenge = {
  __typename?: 'MiniappChallenge'
  expires_in_hours?: Maybe<Scalars['Int']['output']>
  icon: Scalars['String']['output']
  id: Scalars['String']['output']
  progress: Scalars['Int']['output']
  target: Scalars['Int']['output']
  title: Scalars['String']['output']
  xp_reward: Scalars['Int']['output']
}

export type MiniappDailyStats = {
  __typename?: 'MiniappDailyStats'
  calories_burned: Scalars['Int']['output']
  daily_goal_progress: Scalars['Float']['output']
  dance_minutes: Scalars['Int']['output']
  points_earned: Scalars['Int']['output']
  sessions_count: Scalars['Int']['output']
  xp_earned: Scalars['Int']['output']
}

export type MiniappFriend = {
  __typename?: 'MiniappFriend'
  avatar_url?: Maybe<Scalars['String']['output']>
  dance_bond_strength: Scalars['Int']['output']
  display_name?: Maybe<Scalars['String']['output']>
  is_online: Scalars['Boolean']['output']
  last_active?: Maybe<Scalars['DateTime']['output']>
  level: Scalars['Int']['output']
  user_id: Scalars['String']['output']
  username: Scalars['String']['output']
}

export type MiniappHomeData = {
  __typename?: 'MiniappHomeData'
  active_challenges: Array<MiniappChallenge>
  daily_stats: MiniappDailyStats
  leaderboard_preview: MiniappLeaderboardPreview
  notifications_count: Scalars['Int']['output']
  recent_activities: Array<MiniappActivity>
  streak_info: MiniappStreakInfo
  user: User
}

export type MiniappLeaderboardEntry = {
  __typename?: 'MiniappLeaderboardEntry'
  avatar_url?: Maybe<Scalars['String']['output']>
  is_me: Scalars['Boolean']['output']
  rank: Scalars['Int']['output']
  username: Scalars['String']['output']
  xp: Scalars['Int']['output']
}

export type MiniappLeaderboardPreview = {
  __typename?: 'MiniappLeaderboardPreview'
  my_rank: Scalars['Int']['output']
  my_xp: Scalars['Int']['output']
  nearby: Array<MiniappLeaderboardEntry>
  top_3: Array<MiniappLeaderboardEntry>
}

export type MiniappNotification = {
  __typename?: 'MiniappNotification'
  action_url?: Maybe<Scalars['String']['output']>
  body: Scalars['String']['output']
  created_at: Scalars['DateTime']['output']
  icon?: Maybe<Scalars['String']['output']>
  id: Scalars['String']['output']
  is_read: Scalars['Boolean']['output']
  title: Scalars['String']['output']
  type: Scalars['String']['output']
}

export type MiniappQuickSession = {
  __typename?: 'MiniappQuickSession'
  mode: Scalars['String']['output']
  session_id: Scalars['String']['output']
  start_time: Scalars['DateTime']['output']
  target_duration?: Maybe<Scalars['Int']['output']>
}

export type MiniappQuickSessionInput = {
  challenge_id?: InputMaybe<Scalars['String']['input']>
  mode: Scalars['String']['input']
  target_duration?: InputMaybe<Scalars['Int']['input']>
}

export type MiniappRewardClaim = {
  __typename?: 'MiniappRewardClaim'
  amount: Scalars['Int']['output']
  message: Scalars['String']['output']
  new_balance: Scalars['Int']['output']
  reward_type: Scalars['String']['output']
  success: Scalars['Boolean']['output']
}

export type MiniappSettings = {
  __typename?: 'MiniappSettings'
  daily_reminder_time?: Maybe<Scalars['String']['output']>
  haptic_enabled: Scalars['Boolean']['output']
  language: Scalars['String']['output']
  notifications_enabled: Scalars['Boolean']['output']
  share_activity: Scalars['Boolean']['output']
  sound_enabled: Scalars['Boolean']['output']
  theme: Scalars['String']['output']
}

export type MiniappSettingsInput = {
  daily_reminder_time?: InputMaybe<Scalars['String']['input']>
  haptic_enabled?: InputMaybe<Scalars['Boolean']['input']>
  language?: InputMaybe<Scalars['String']['input']>
  notifications_enabled?: InputMaybe<Scalars['Boolean']['input']>
  share_activity?: InputMaybe<Scalars['Boolean']['input']>
  sound_enabled?: InputMaybe<Scalars['Boolean']['input']>
  theme?: InputMaybe<Scalars['String']['input']>
}

export type MiniappShareContent = {
  __typename?: 'MiniappShareContent'
  share_image_url?: Maybe<Scalars['String']['output']>
  share_text: Scalars['String']['output']
  share_url: Scalars['String']['output']
  telegram_deep_link: Scalars['String']['output']
}

export type MiniappStreakInfo = {
  __typename?: 'MiniappStreakInfo'
  current: Scalars['Int']['output']
  longest: Scalars['Int']['output']
  milestone_reward?: Maybe<Scalars['Int']['output']>
  next_milestone?: Maybe<Scalars['Int']['output']>
  streak_maintained_today: Scalars['Boolean']['output']
}

export enum MusicSource {
  Licensed = 'licensed',
  None = 'none',
  UserLibrary = 'user_library',
}

export type Mutation = {
  __typename?: 'Mutation'
  _empty?: Maybe<Scalars['String']['output']>
  abandonChallenge: MutationResponse
  acceptManagerInvitation: EventManager
  activateChallenge: Challenge
  addFeatureRequestComment: FeatureRequestComment
  addParticipants: Conversation
  addReaction: Message
  adminDeleteEvent: MutationResponse
  applyForGig: GigApplication
  applyForGigRole: UserGigRole
  applyPrivacyPreset: PrivacySettings
  approveOrganizer: User
  assignEventGigManager: EventGigManager
  awardManualPoints: PointTransaction
  awardPoints: PointTransaction
  blockTask: DevTask
  blockUser: UserBlock
  /** Cancel a pending request I sent */
  cancelBondRequest: Scalars['Boolean']['output']
  cancelEvent: Event
  cancelEventGig: EventGig
  cancelEventRegistration: MutationResponse
  cancelEventSponsorship: EventSponsorship
  cancelSponsorSubscription: SponsorSubscription
  /** Cancel a pending username change request */
  cancelUsernameChangeRequest: MutationResponse
  checkAchievements: AchievementCheckResult
  checkInEvent: EventAttendance
  checkInParticipant: EventRegistration
  checkInToGig: GigApplication
  checkInWithCode: CheckInResponse
  checkOutEvent: EventAttendance
  checkOutFromGig: GigApplication
  checkSystemHealth: Array<SystemHealth>
  claimAchievementReward: AchievementDetails
  claimChallengeReward: UserChallenge
  clearGitHubCache: Scalars['Boolean']['output']
  commentOnActivity: Activity
  completeEventDistribution: EventFlowPool
  completeGigAndAward: GigApplication
  completeReferral: Referral
  completeTask: DevTask
  createActivity: Activity
  createAnnouncement: Activity
  createChallenge: Challenge
  createChangelogEntry: ChangelogEntry
  createComment: PostComment
  createDanceBond: DanceBond
  createDevAlert: DevAlert
  createDevTask: DevTask
  createEvent: Event
  createEventGig: EventGig
  createEventLeaderboard: EventLeaderboard
  createEventSponsorship: EventSponsorship
  createFeatureInventory: FeatureInventory
  createFeatureRequest: FeatureRequest
  createFreestyleSession: FreestyleSession
  createNotification: Notification
  createPointAction: PointAction
  createPost: Post
  createProject: Project
  createSeason: SeasonalLeaderboard
  createSponsorProfile: Sponsor
  createSponsorSubscription: SponsorSubscription
  deactivateChallenge: Challenge
  declineManagerInvitation: EventManager
  deleteActivity: MutationResponse
  deleteChallenge: MutationResponse
  deleteChangelogEntry: Scalars['Boolean']['output']
  deleteComment: MutationResponse
  deleteConversation: Scalars['Boolean']['output']
  deleteDanceBond: MutationResponse
  deleteDanceSession: MutationResponse
  deleteDevAlert: Scalars['Boolean']['output']
  deleteDevTask: Scalars['Boolean']['output']
  deleteEvent: MutationResponse
  deleteEventGig: MutationResponse
  deleteFeatureInventory: Scalars['Boolean']['output']
  deleteFeatureRequest: Scalars['Boolean']['output']
  deleteFeatureRequestComment: Scalars['Boolean']['output']
  deleteFreestyleSession: MutationResponse
  deleteMessage: Scalars['Boolean']['output']
  deleteNotification: MutationResponse
  deletePointAction: MutationResponse
  deletePost: MutationResponse
  deleteProject: Scalars['Boolean']['output']
  deleteSponsorProfile: MutationResponse
  demoteGigManager: User
  dismissAllSuggestions: Scalars['Boolean']['output']
  dismissSuggestion: Scalars['Boolean']['output']
  distributeGigPayment: FlowTransaction
  distributeVolunteerReward: FlowTransaction
  endSeason: MutationResponse
  featureEvent: Event
  finalizeEventLeaderboard: EventLeaderboard
  generateAnalyticsReport: Scalars['String']['output']
  generateShareLinks: ShareLinks
  hideActivity: MutationResponse
  highlightActivity: Activity
  inviteEventManager: EventManager
  leaveConversation: Scalars['Boolean']['output']
  leaveEventAsManager: MutationResponse
  likeActivity: Activity
  likePost: MutationResponse
  linkTelegramAccount: TelegramAuthResult
  lockEventPool: EventFlowPool
  markActivitiesRead: MutationResponse
  markAlertDismissed: DevAlert
  markAlertRead: DevAlert
  markAllActivitiesRead: MutationResponse
  markAllAlertsRead: Scalars['Boolean']['output']
  markAllNotificationsRead: MutationResponse
  markConversationRead: Conversation
  markMessageRead: Message
  markNotificationRead: Notification
  markReferralCompleted: Referral
  miniappClaimChallengeReward: MiniappRewardClaim
  miniappClaimDailyReward: MiniappRewardClaim
  miniappEndQuickSession: MutationResponse
  miniappInviteFriend: MutationResponse
  miniappMarkAllNotificationsRead: MutationResponse
  miniappMarkNotificationRead: MutationResponse
  miniappRegisterPushToken: MutationResponse
  miniappSendCheer: MutationResponse
  miniappStartQuickSession: MiniappQuickSession
  miniappTrackEvent: MutationResponse
  miniappUpdateSettings: MiniappSettings
  nudgeReferral: MutationResponse
  pauseSponsorSubscription: SponsorSubscription
  processExpiredChallenges: MutationResponse
  promoteToAdmin: Conversation
  promoteToGigManager: User
  rateGigOrganizer: GigApplication
  rateGigWorker: GigApplication
  refreshAllLeaderboards: MutationResponse
  refreshAnalyticsCache: MutationResponse
  refreshDailyChallenges: DailyChallengeset
  refreshLeaderboard: Leaderboard
  refreshSuggestions: UserSuggestionConnection
  regenerateCheckinCode: Event
  registerForEvent: EventRegistration
  registerWearableDevice: WearableDevice
  removeEventGigManager: MutationResponse
  removeEventManager: MutationResponse
  removeFeatureRequestVote: FeatureRequest
  removeParticipant: Conversation
  removeReaction: Message
  removeWearableDevice: MutationResponse
  reportActivity: MutationResponse
  requestFlowToDanzSwap: FlowDanzSwap
  /** Request a username change. First change is auto-approved, subsequent changes require admin review. */
  requestUsernameChange: UsernameChangeResult
  requestWearableSync: WearableDevice
  resetPrivacyToDefaults: PrivacySettings
  /** Accept or reject a bond request */
  respondToBondRequest: BondRequest
  respondToSubscriptionMatch: SubscriptionAutoMatch
  resumeSponsorSubscription: SponsorSubscription
  reversePointTransaction: PointTransaction
  reviewGigApplication: GigApplication
  reviewGigRoleApplication: UserGigRole
  reviewGigSubmission: GigSubmission
  reviewOrganizerApplication: OrganizerApplication
  reviewSponsorshipApproval: SponsorshipApproval
  /** Admin: Review (approve/reject) a username change request */
  reviewUsernameChangeRequest: UsernameChangeRequest
  saveDanceSession: DanceSession
  sendAdminBroadcast: MutationResponse
  /** Send a bond request */
  sendBondRequest: BondRequest
  sendEventBroadcast: MutationResponse
  sendMessage: Message
  setPrimaryWearable: WearableDevice
  shareDanceSession: DanceSession
  startChallenge: UserChallenge
  startConversation: Conversation
  startTask: DevTask
  /** Submit feedback from user */
  submitFeedback: Feedback
  submitGigProof: GigSubmission
  submitOrganizerApplication: OrganizerApplication
  syncHealthData: WearableSyncResult
  syncMotionData: WearableSyncResult
  syncWearableData: WearableSyncResult
  telegramAuth: TelegramAuthResult
  togglePointAction: PointAction
  trackAppOpen: DailyActivity
  trackEvent: MutationResponse
  trackReferralClick: MutationResponse
  transferEventOwnership: EventManager
  triggerGitHubAction: Scalars['Boolean']['output']
  unblockUser: Scalars['Boolean']['output']
  unlikeActivity: Activity
  unlikePost: MutationResponse
  unlinkTelegramAccount: MutationResponse
  unlockEventPool: EventFlowPool
  updateChallenge: Challenge
  updateChallengeProgress: UserChallenge
  updateChangelogEntry: ChangelogEntry
  updateComment: PostComment
  updateConversation: Conversation
  updateCreatorSponsorshipNotificationPreferences: CreatorSponsorshipNotificationPreferences
  updateDanceBond: DanceBond
  updateDevTask: DevTask
  updateEvent: Event
  updateEventGig: EventGig
  updateEventManager: EventManager
  updateEventSponsorship: EventSponsorship
  updateEventSponsorshipSettings: EventSponsorshipSettings
  updateFeatureInventory: FeatureInventory
  updateFeatureRequest: FeatureRequest
  /** Update feedback status (admin only) */
  updateFeedbackStatus: Feedback
  updateFreestylePreferences: UserPreferences
  updateGigRoleApplication: UserGigRole
  updateMessage: Message
  updateNotificationPreferences: NotificationPreferences
  updatePointAction: PointAction
  updatePost: Post
  updatePrivacySettings: PrivacySettings
  updateProfile: User
  updateProject: Project
  updateRegistrationStatus: EventRegistration
  updateSponsorNotificationPreferences: SponsorNotificationPreferences
  updateSponsorProfile: Sponsor
  updateSponsorSubscription: SponsorSubscription
  updateUserRole: User
  updateWearableDevice: WearableDevice
  verifyEventAttendance: EventAttendance
  verifyPointTransaction: PointTransaction
  voteFeatureRequest: FeatureRequest
  withdrawFlow: FlowTransaction
  withdrawGigApplication: GigApplication
  withdrawGigRoleApplication: MutationResponse
}

export type MutationAbandonChallengeArgs = {
  challengeId: Scalars['String']['input']
}

export type MutationAcceptManagerInvitationArgs = {
  manager_id: Scalars['ID']['input']
}

export type MutationActivateChallengeArgs = {
  id: Scalars['String']['input']
}

export type MutationAddFeatureRequestCommentArgs = {
  content: Scalars['String']['input']
  feature_request_id: Scalars['ID']['input']
  is_internal?: InputMaybe<Scalars['Boolean']['input']>
}

export type MutationAddParticipantsArgs = {
  input: AddParticipantsInput
}

export type MutationAddReactionArgs = {
  emoji: Scalars['String']['input']
  message_id: Scalars['ID']['input']
}

export type MutationAdminDeleteEventArgs = {
  eventId: Scalars['ID']['input']
}

export type MutationApplyForGigArgs = {
  gigId: Scalars['ID']['input']
  note?: InputMaybe<Scalars['String']['input']>
}

export type MutationApplyForGigRoleArgs = {
  input: ApplyForGigRoleInput
}

export type MutationApplyPrivacyPresetArgs = {
  preset: PrivacyPresetType
}

export type MutationApproveOrganizerArgs = {
  approved: Scalars['Boolean']['input']
  rejection_reason?: InputMaybe<Scalars['String']['input']>
  userId: Scalars['String']['input']
}

export type MutationAssignEventGigManagerArgs = {
  eventId: Scalars['ID']['input']
  userId: Scalars['String']['input']
}

export type MutationAwardManualPointsArgs = {
  input: ManualPointsInput
}

export type MutationAwardPointsArgs = {
  input: AwardPointsInput
}

export type MutationBlockTaskArgs = {
  id: Scalars['ID']['input']
  reason?: InputMaybe<Scalars['String']['input']>
}

export type MutationBlockUserArgs = {
  reason?: InputMaybe<Scalars['String']['input']>
  user_id: Scalars['String']['input']
}

export type MutationCancelBondRequestArgs = {
  request_id: Scalars['ID']['input']
}

export type MutationCancelEventArgs = {
  id: Scalars['ID']['input']
}

export type MutationCancelEventGigArgs = {
  id: Scalars['ID']['input']
  reason?: InputMaybe<Scalars['String']['input']>
}

export type MutationCancelEventRegistrationArgs = {
  eventId: Scalars['ID']['input']
}

export type MutationCancelEventSponsorshipArgs = {
  id: Scalars['ID']['input']
  reason?: InputMaybe<Scalars['String']['input']>
}

export type MutationCancelSponsorSubscriptionArgs = {
  id: Scalars['ID']['input']
  reason?: InputMaybe<Scalars['String']['input']>
}

export type MutationCancelUsernameChangeRequestArgs = {
  request_id: Scalars['ID']['input']
}

export type MutationCheckInEventArgs = {
  input: CheckInEventInput
}

export type MutationCheckInParticipantArgs = {
  eventId: Scalars['ID']['input']
  userId: Scalars['String']['input']
}

export type MutationCheckInToGigArgs = {
  applicationId: Scalars['ID']['input']
}

export type MutationCheckInWithCodeArgs = {
  code: Scalars['String']['input']
}

export type MutationCheckOutEventArgs = {
  input: CheckOutEventInput
}

export type MutationCheckOutFromGigArgs = {
  applicationId: Scalars['ID']['input']
}

export type MutationClaimAchievementRewardArgs = {
  achievementType: Scalars['String']['input']
}

export type MutationClaimChallengeRewardArgs = {
  challengeId: Scalars['String']['input']
}

export type MutationClearGitHubCacheArgs = {
  cache_key?: InputMaybe<Scalars['String']['input']>
}

export type MutationCommentOnActivityArgs = {
  activityId: Scalars['String']['input']
  comment: Scalars['String']['input']
}

export type MutationCompleteEventDistributionArgs = {
  eventId: Scalars['ID']['input']
}

export type MutationCompleteGigAndAwardArgs = {
  applicationId: Scalars['ID']['input']
  bonusDanz?: InputMaybe<Scalars['Float']['input']>
}

export type MutationCompleteReferralArgs = {
  input: CompleteReferralInput
}

export type MutationCompleteTaskArgs = {
  actual_hours?: InputMaybe<Scalars['Int']['input']>
  id: Scalars['ID']['input']
}

export type MutationCreateActivityArgs = {
  description?: InputMaybe<Scalars['String']['input']>
  metadata?: InputMaybe<Scalars['JSON']['input']>
  targetUserId?: InputMaybe<Scalars['String']['input']>
  title: Scalars['String']['input']
  type: ActivityType
  userId: Scalars['String']['input']
  visibility?: InputMaybe<ActivityVisibility>
}

export type MutationCreateAnnouncementArgs = {
  description: Scalars['String']['input']
  metadata?: InputMaybe<Scalars['JSON']['input']>
  title: Scalars['String']['input']
}

export type MutationCreateChallengeArgs = {
  input: CreateChallengeInput
}

export type MutationCreateChangelogEntryArgs = {
  input: CreateChangelogEntryInput
}

export type MutationCreateCommentArgs = {
  input: CreateCommentInput
}

export type MutationCreateDanceBondArgs = {
  input: CreateDanceBondInput
  userId: Scalars['String']['input']
}

export type MutationCreateDevAlertArgs = {
  input: CreateDevAlertInput
}

export type MutationCreateDevTaskArgs = {
  input: CreateDevTaskInput
}

export type MutationCreateEventArgs = {
  input: CreateEventInput
}

export type MutationCreateEventGigArgs = {
  input: CreateEventGigInput
}

export type MutationCreateEventLeaderboardArgs = {
  eventId: Scalars['String']['input']
  prizes?: InputMaybe<Scalars['JSON']['input']>
}

export type MutationCreateEventSponsorshipArgs = {
  input: CreateSponsorshipInput
}

export type MutationCreateFeatureInventoryArgs = {
  input: CreateFeatureInventoryInput
}

export type MutationCreateFeatureRequestArgs = {
  input: CreateFeatureRequestInput
}

export type MutationCreateFreestyleSessionArgs = {
  input: CreateFreestyleSessionInput
}

export type MutationCreateNotificationArgs = {
  input: CreateNotificationInput
}

export type MutationCreatePointActionArgs = {
  input: CreatePointActionInput
}

export type MutationCreatePostArgs = {
  input: CreatePostInput
}

export type MutationCreateProjectArgs = {
  input: CreateProjectInput
}

export type MutationCreateSeasonArgs = {
  endsAt: Scalars['DateTime']['input']
  name: Scalars['String']['input']
  rewards: Scalars['JSON']['input']
  startsAt: Scalars['DateTime']['input']
}

export type MutationCreateSponsorProfileArgs = {
  input: CreateSponsorInput
}

export type MutationCreateSponsorSubscriptionArgs = {
  input: CreateSubscriptionInput
}

export type MutationDeactivateChallengeArgs = {
  id: Scalars['String']['input']
}

export type MutationDeclineManagerInvitationArgs = {
  manager_id: Scalars['ID']['input']
}

export type MutationDeleteActivityArgs = {
  activityId: Scalars['String']['input']
}

export type MutationDeleteChallengeArgs = {
  id: Scalars['String']['input']
}

export type MutationDeleteChangelogEntryArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteCommentArgs = {
  commentId: Scalars['ID']['input']
}

export type MutationDeleteConversationArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteDanceBondArgs = {
  bondId: Scalars['ID']['input']
}

export type MutationDeleteDanceSessionArgs = {
  sessionId: Scalars['ID']['input']
}

export type MutationDeleteDevAlertArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteDevTaskArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteEventArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteEventGigArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteFeatureInventoryArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteFeatureRequestArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteFeatureRequestCommentArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteFreestyleSessionArgs = {
  sessionId: Scalars['ID']['input']
}

export type MutationDeleteMessageArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteNotificationArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeletePointActionArgs = {
  action_key: Scalars['String']['input']
}

export type MutationDeletePostArgs = {
  postId: Scalars['ID']['input']
}

export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input']
}

export type MutationDemoteGigManagerArgs = {
  userId: Scalars['String']['input']
}

export type MutationDismissSuggestionArgs = {
  suggestion_id: Scalars['ID']['input']
}

export type MutationDistributeGigPaymentArgs = {
  input: GigPaymentInput
}

export type MutationDistributeVolunteerRewardArgs = {
  input: VolunteerRewardInput
}

export type MutationEndSeasonArgs = {
  seasonId: Scalars['String']['input']
}

export type MutationFeatureEventArgs = {
  eventId: Scalars['ID']['input']
  featured: Scalars['Boolean']['input']
}

export type MutationFinalizeEventLeaderboardArgs = {
  eventId: Scalars['String']['input']
}

export type MutationGenerateAnalyticsReportArgs = {
  format?: InputMaybe<Scalars['String']['input']>
  options?: InputMaybe<AnalyticsOptions>
  report_type: Scalars['String']['input']
}

export type MutationHideActivityArgs = {
  activityId: Scalars['String']['input']
}

export type MutationHighlightActivityArgs = {
  activityId: Scalars['String']['input']
}

export type MutationInviteEventManagerArgs = {
  input: InviteEventManagerInput
}

export type MutationLeaveConversationArgs = {
  id: Scalars['ID']['input']
}

export type MutationLeaveEventAsManagerArgs = {
  event_id: Scalars['ID']['input']
}

export type MutationLikeActivityArgs = {
  activityId: Scalars['String']['input']
}

export type MutationLikePostArgs = {
  postId: Scalars['ID']['input']
}

export type MutationLinkTelegramAccountArgs = {
  telegram_init_data: Scalars['String']['input']
}

export type MutationLockEventPoolArgs = {
  eventId: Scalars['ID']['input']
}

export type MutationMarkActivitiesReadArgs = {
  activityIds: Array<Scalars['String']['input']>
}

export type MutationMarkAlertDismissedArgs = {
  id: Scalars['ID']['input']
}

export type MutationMarkAlertReadArgs = {
  id: Scalars['ID']['input']
}

export type MutationMarkConversationReadArgs = {
  conversation_id: Scalars['ID']['input']
}

export type MutationMarkMessageReadArgs = {
  message_id: Scalars['ID']['input']
}

export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input']
}

export type MutationMarkReferralCompletedArgs = {
  referralId: Scalars['ID']['input']
}

export type MutationMiniappClaimChallengeRewardArgs = {
  challenge_id: Scalars['String']['input']
}

export type MutationMiniappEndQuickSessionArgs = {
  session_id: Scalars['String']['input']
  stats: Scalars['JSON']['input']
}

export type MutationMiniappInviteFriendArgs = {
  telegram_user_id: Scalars['String']['input']
}

export type MutationMiniappMarkNotificationReadArgs = {
  notification_id: Scalars['String']['input']
}

export type MutationMiniappRegisterPushTokenArgs = {
  token: Scalars['String']['input']
}

export type MutationMiniappSendCheerArgs = {
  user_id: Scalars['String']['input']
}

export type MutationMiniappStartQuickSessionArgs = {
  input: MiniappQuickSessionInput
}

export type MutationMiniappTrackEventArgs = {
  data?: InputMaybe<Scalars['JSON']['input']>
  event: Scalars['String']['input']
}

export type MutationMiniappUpdateSettingsArgs = {
  input: MiniappSettingsInput
}

export type MutationNudgeReferralArgs = {
  message?: InputMaybe<Scalars['String']['input']>
  referralId: Scalars['ID']['input']
}

export type MutationPauseSponsorSubscriptionArgs = {
  id: Scalars['ID']['input']
}

export type MutationPromoteToAdminArgs = {
  conversation_id: Scalars['ID']['input']
  user_id: Scalars['String']['input']
}

export type MutationPromoteToGigManagerArgs = {
  userId: Scalars['String']['input']
}

export type MutationRateGigOrganizerArgs = {
  applicationId: Scalars['ID']['input']
  feedback?: InputMaybe<Scalars['String']['input']>
  rating: Scalars['Int']['input']
}

export type MutationRateGigWorkerArgs = {
  applicationId: Scalars['ID']['input']
  feedback?: InputMaybe<Scalars['String']['input']>
  rating: Scalars['Int']['input']
}

export type MutationRefreshAnalyticsCacheArgs = {
  metrics?: InputMaybe<Array<Scalars['String']['input']>>
}

export type MutationRefreshLeaderboardArgs = {
  metric: LeaderboardMetric
  type: LeaderboardType
}

export type MutationRegenerateCheckinCodeArgs = {
  eventId: Scalars['ID']['input']
}

export type MutationRegisterForEventArgs = {
  eventId: Scalars['ID']['input']
  notes?: InputMaybe<Scalars['String']['input']>
}

export type MutationRegisterWearableDeviceArgs = {
  input: RegisterWearableInput
}

export type MutationRemoveEventGigManagerArgs = {
  eventId: Scalars['ID']['input']
  userId: Scalars['String']['input']
}

export type MutationRemoveEventManagerArgs = {
  manager_id: Scalars['ID']['input']
}

export type MutationRemoveFeatureRequestVoteArgs = {
  id: Scalars['ID']['input']
}

export type MutationRemoveParticipantArgs = {
  conversation_id: Scalars['ID']['input']
  user_id: Scalars['String']['input']
}

export type MutationRemoveReactionArgs = {
  emoji: Scalars['String']['input']
  message_id: Scalars['ID']['input']
}

export type MutationRemoveWearableDeviceArgs = {
  deviceId: Scalars['String']['input']
}

export type MutationReportActivityArgs = {
  activityId: Scalars['String']['input']
  reason: Scalars['String']['input']
}

export type MutationRequestFlowToDanzSwapArgs = {
  amount: Scalars['Float']['input']
}

export type MutationRequestUsernameChangeArgs = {
  input: RequestUsernameChangeInput
}

export type MutationRequestWearableSyncArgs = {
  deviceId: Scalars['String']['input']
}

export type MutationRespondToBondRequestArgs = {
  input: RespondToBondRequestInput
}

export type MutationRespondToSubscriptionMatchArgs = {
  approve: Scalars['Boolean']['input']
  matchId: Scalars['ID']['input']
}

export type MutationResumeSponsorSubscriptionArgs = {
  id: Scalars['ID']['input']
}

export type MutationReversePointTransactionArgs = {
  reason: Scalars['String']['input']
  transaction_id: Scalars['ID']['input']
}

export type MutationReviewGigApplicationArgs = {
  applicationId: Scalars['ID']['input']
  input: ReviewGigApplicationInput
}

export type MutationReviewGigRoleApplicationArgs = {
  approved: Scalars['Boolean']['input']
  id: Scalars['ID']['input']
  reason?: InputMaybe<Scalars['String']['input']>
}

export type MutationReviewGigSubmissionArgs = {
  input: ReviewGigSubmissionInput
  submissionId: Scalars['ID']['input']
}

export type MutationReviewOrganizerApplicationArgs = {
  input: ReviewApplicationInput
}

export type MutationReviewSponsorshipApprovalArgs = {
  approvalId: Scalars['ID']['input']
  decision: ApprovalStatus
  reason?: InputMaybe<Scalars['String']['input']>
}

export type MutationReviewUsernameChangeRequestArgs = {
  input: ReviewUsernameChangeInput
}

export type MutationSaveDanceSessionArgs = {
  input: SaveDanceSessionInput
}

export type MutationSendAdminBroadcastArgs = {
  input: SendBroadcastInput
}

export type MutationSendBondRequestArgs = {
  input: SendBondRequestInput
}

export type MutationSendEventBroadcastArgs = {
  input: SendEventBroadcastInput
}

export type MutationSendMessageArgs = {
  input: SendMessageInput
}

export type MutationSetPrimaryWearableArgs = {
  deviceId: Scalars['String']['input']
}

export type MutationShareDanceSessionArgs = {
  sessionId: Scalars['ID']['input']
  userIds: Array<Scalars['String']['input']>
}

export type MutationStartChallengeArgs = {
  challengeId: Scalars['String']['input']
}

export type MutationStartConversationArgs = {
  input: StartConversationInput
}

export type MutationStartTaskArgs = {
  id: Scalars['ID']['input']
}

export type MutationSubmitFeedbackArgs = {
  input: SubmitFeedbackInput
}

export type MutationSubmitGigProofArgs = {
  applicationId: Scalars['ID']['input']
  input: GigProofInput
}

export type MutationSubmitOrganizerApplicationArgs = {
  input: SubmitOrganizerApplicationInput
}

export type MutationSyncHealthDataArgs = {
  data: Array<WearableHealthDataInput>
}

export type MutationSyncMotionDataArgs = {
  data: Array<WearableMotionDataInput>
}

export type MutationSyncWearableDataArgs = {
  input: SyncWearableDataInput
}

export type MutationTelegramAuthArgs = {
  input: TelegramAuthInput
}

export type MutationTogglePointActionArgs = {
  action_key: Scalars['String']['input']
}

export type MutationTrackAppOpenArgs = {
  user_id: Scalars['String']['input']
}

export type MutationTrackEventArgs = {
  event_type: Scalars['String']['input']
  metadata?: InputMaybe<Scalars['JSON']['input']>
  user_id?: InputMaybe<Scalars['String']['input']>
}

export type MutationTrackReferralClickArgs = {
  input: TrackReferralClickInput
}

export type MutationTransferEventOwnershipArgs = {
  event_id: Scalars['ID']['input']
  new_creator_id: Scalars['String']['input']
}

export type MutationTriggerGitHubActionArgs = {
  ref?: InputMaybe<Scalars['String']['input']>
  repo: Scalars['String']['input']
  workflow_id: Scalars['String']['input']
}

export type MutationUnblockUserArgs = {
  user_id: Scalars['String']['input']
}

export type MutationUnlikeActivityArgs = {
  activityId: Scalars['String']['input']
}

export type MutationUnlikePostArgs = {
  postId: Scalars['ID']['input']
}

export type MutationUnlockEventPoolArgs = {
  eventId: Scalars['ID']['input']
}

export type MutationUpdateChallengeArgs = {
  id: Scalars['String']['input']
  input: CreateChallengeInput
}

export type MutationUpdateChallengeProgressArgs = {
  challengeId: Scalars['String']['input']
  progress: Scalars['Int']['input']
}

export type MutationUpdateChangelogEntryArgs = {
  id: Scalars['ID']['input']
  input: UpdateChangelogEntryInput
}

export type MutationUpdateCommentArgs = {
  commentId: Scalars['ID']['input']
  content: Scalars['String']['input']
}

export type MutationUpdateConversationArgs = {
  id: Scalars['ID']['input']
  input: UpdateConversationInput
}

export type MutationUpdateCreatorSponsorshipNotificationPreferencesArgs = {
  input: CreatorNotificationPreferencesInput
}

export type MutationUpdateDanceBondArgs = {
  level: Scalars['Int']['input']
  userId: Scalars['String']['input']
}

export type MutationUpdateDevTaskArgs = {
  id: Scalars['ID']['input']
  input: UpdateDevTaskInput
}

export type MutationUpdateEventArgs = {
  id: Scalars['ID']['input']
  input: UpdateEventInput
}

export type MutationUpdateEventGigArgs = {
  id: Scalars['ID']['input']
  input: UpdateEventGigInput
}

export type MutationUpdateEventManagerArgs = {
  input: UpdateEventManagerInput
}

export type MutationUpdateEventSponsorshipArgs = {
  id: Scalars['ID']['input']
  input: UpdateSponsorshipInput
}

export type MutationUpdateEventSponsorshipSettingsArgs = {
  eventId: Scalars['ID']['input']
  input: EventSponsorshipSettingsInput
}

export type MutationUpdateFeatureInventoryArgs = {
  id: Scalars['ID']['input']
  input: UpdateFeatureInventoryInput
}

export type MutationUpdateFeatureRequestArgs = {
  id: Scalars['ID']['input']
  input: UpdateFeatureRequestInput
}

export type MutationUpdateFeedbackStatusArgs = {
  input: UpdateFeedbackStatusInput
}

export type MutationUpdateFreestylePreferencesArgs = {
  input: UpdateUserPreferencesInput
}

export type MutationUpdateGigRoleApplicationArgs = {
  id: Scalars['ID']['input']
  input: UpdateGigRoleApplicationInput
}

export type MutationUpdateMessageArgs = {
  id: Scalars['ID']['input']
  input: UpdateMessageInput
}

export type MutationUpdateNotificationPreferencesArgs = {
  input: UpdateNotificationPreferencesInput
}

export type MutationUpdatePointActionArgs = {
  input: UpdatePointActionInput
}

export type MutationUpdatePostArgs = {
  input: UpdatePostInput
  postId: Scalars['ID']['input']
}

export type MutationUpdatePrivacySettingsArgs = {
  input: UpdatePrivacySettingsInput
}

export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput
}

export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input']
  input: UpdateProjectInput
}

export type MutationUpdateRegistrationStatusArgs = {
  adminNotes?: InputMaybe<Scalars['String']['input']>
  eventId: Scalars['ID']['input']
  status: RegistrationStatus
  userId: Scalars['String']['input']
}

export type MutationUpdateSponsorNotificationPreferencesArgs = {
  input: SponsorNotificationPreferencesInput
}

export type MutationUpdateSponsorProfileArgs = {
  input: UpdateSponsorInput
}

export type MutationUpdateSponsorSubscriptionArgs = {
  id: Scalars['ID']['input']
  input: UpdateSubscriptionInput
}

export type MutationUpdateUserRoleArgs = {
  role: UserRole
  userId: Scalars['String']['input']
}

export type MutationUpdateWearableDeviceArgs = {
  deviceId: Scalars['String']['input']
  input: RegisterWearableInput
}

export type MutationVerifyEventAttendanceArgs = {
  input: VerifyAttendanceInput
}

export type MutationVerifyPointTransactionArgs = {
  transaction_id: Scalars['ID']['input']
}

export type MutationVoteFeatureRequestArgs = {
  id: Scalars['ID']['input']
  vote: Scalars['String']['input']
}

export type MutationWithdrawFlowArgs = {
  amount: Scalars['Float']['input']
  destinationWallet: Scalars['String']['input']
}

export type MutationWithdrawGigApplicationArgs = {
  applicationId: Scalars['ID']['input']
}

export type MutationWithdrawGigRoleApplicationArgs = {
  id: Scalars['ID']['input']
}

export type MutationResponse = {
  __typename?: 'MutationResponse'
  code?: Maybe<Scalars['String']['output']>
  message?: Maybe<Scalars['String']['output']>
  success: Scalars['Boolean']['output']
}

export type NewUsersMetrics = {
  __typename?: 'NewUsersMetrics'
  acquisition_channels: Array<AcquisitionChannel>
  growth_rate: Scalars['Float']['output']
  this_month: Scalars['Int']['output']
  this_week: Scalars['Int']['output']
  today: Scalars['Int']['output']
  trend: Array<TimeSeriesPoint>
}

export type Notification = {
  __typename?: 'Notification'
  achievement_id?: Maybe<Scalars['ID']['output']>
  action_data?: Maybe<Scalars['JSON']['output']>
  action_type?: Maybe<ActionType>
  bond_id?: Maybe<Scalars['ID']['output']>
  broadcast_target?: Maybe<BroadcastTarget>
  created_at: Scalars['DateTime']['output']
  event?: Maybe<Event>
  event_id?: Maybe<Scalars['ID']['output']>
  expires_at?: Maybe<Scalars['DateTime']['output']>
  gig?: Maybe<EventGig>
  gigApplication?: Maybe<GigApplication>
  gig_application_id?: Maybe<Scalars['ID']['output']>
  gig_id?: Maybe<Scalars['ID']['output']>
  id: Scalars['ID']['output']
  is_broadcast: Scalars['Boolean']['output']
  message: Scalars['String']['output']
  post_id?: Maybe<Scalars['ID']['output']>
  push_sent: Scalars['Boolean']['output']
  push_sent_at?: Maybe<Scalars['DateTime']['output']>
  read: Scalars['Boolean']['output']
  read_at?: Maybe<Scalars['DateTime']['output']>
  recipient?: Maybe<User>
  recipient_id: Scalars['String']['output']
  sender?: Maybe<User>
  sender_id?: Maybe<Scalars['String']['output']>
  sender_type?: Maybe<SenderType>
  title: Scalars['String']['output']
  type: NotificationType
}

export type NotificationConnection = {
  __typename?: 'NotificationConnection'
  has_more: Scalars['Boolean']['output']
  notifications: Array<Notification>
  total_count: Scalars['Int']['output']
  unread_count: Scalars['Int']['output']
}

export type NotificationPreferences = {
  __typename?: 'NotificationPreferences'
  achievements: Scalars['Boolean']['output']
  admin_broadcasts: Scalars['Boolean']['output']
  created_at: Scalars['DateTime']['output']
  dance_bonds: Scalars['Boolean']['output']
  email_notifications: Scalars['Boolean']['output']
  event_manager_broadcasts: Scalars['Boolean']['output']
  event_updates: Scalars['Boolean']['output']
  gig_application_updates: Scalars['Boolean']['output']
  gig_opportunities: Scalars['Boolean']['output']
  gig_reminders: Scalars['Boolean']['output']
  gig_role_updates: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  post_interactions: Scalars['Boolean']['output']
  push_notifications: Scalars['Boolean']['output']
  quiet_hours_enabled: Scalars['Boolean']['output']
  quiet_hours_end?: Maybe<Scalars['String']['output']>
  quiet_hours_start?: Maybe<Scalars['String']['output']>
  updated_at: Scalars['DateTime']['output']
  user_id: Scalars['String']['output']
}

export enum NotificationType {
  Achievement = 'achievement',
  AdminBroadcast = 'admin_broadcast',
  DanceBond = 'dance_bond',
  EventManagerBroadcast = 'event_manager_broadcast',
  EventReminder = 'event_reminder',
  EventUpdate = 'event_update',
  GigApplicationApproved = 'gig_application_approved',
  GigApplicationReceived = 'gig_application_received',
  GigApplicationRejected = 'gig_application_rejected',
  GigCancelled = 'gig_cancelled',
  GigCompleted = 'gig_completed',
  GigOpportunity = 'gig_opportunity',
  GigPayment = 'gig_payment',
  GigRatingReceived = 'gig_rating_received',
  GigReminder = 'gig_reminder',
  GigRoleApproved = 'gig_role_approved',
  GigRoleRejected = 'gig_role_rejected',
  PostComment = 'post_comment',
  PostLike = 'post_like',
  Referral = 'referral',
  System = 'system',
}

export type OrganizerApplication = {
  __typename?: 'OrganizerApplication'
  additional_info?: Maybe<Scalars['String']['output']>
  admin_notes?: Maybe<Scalars['String']['output']>
  created_at: Scalars['String']['output']
  dance_styles?: Maybe<Array<Scalars['String']['output']>>
  experience?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  reason: Scalars['String']['output']
  reviewed_at?: Maybe<Scalars['String']['output']>
  reviewed_by?: Maybe<Scalars['String']['output']>
  reviewer?: Maybe<User>
  social_media?: Maybe<Scalars['String']['output']>
  status: ApplicationStatus
  updated_at: Scalars['String']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
  venue_address?: Maybe<Scalars['String']['output']>
  venue_capacity?: Maybe<Scalars['Int']['output']>
  venue_city?: Maybe<Scalars['String']['output']>
  venue_name?: Maybe<Scalars['String']['output']>
  website_url?: Maybe<Scalars['String']['output']>
}

export type OrganizerApplicationsResponse = {
  __typename?: 'OrganizerApplicationsResponse'
  applications: Array<OrganizerApplication>
  totalCount: Scalars['Int']['output']
}

export type PageInfo = {
  __typename?: 'PageInfo'
  endCursor?: Maybe<Scalars['String']['output']>
  hasNextPage: Scalars['Boolean']['output']
  hasPreviousPage: Scalars['Boolean']['output']
  startCursor?: Maybe<Scalars['String']['output']>
}

export type PaginationInput = {
  cursor?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export enum PaymentStatus {
  Free = 'free',
  Paid = 'paid',
  Pending = 'pending',
  Refunded = 'refunded',
}

export type PlatformAnalytics = {
  __typename?: 'PlatformAnalytics'
  dance_metrics: DanceMetrics
  economy_metrics: EconomyMetrics
  event_metrics: EventMetrics
  overview: PlatformOverview
  social_metrics: SocialMetrics
}

export type PlatformOverview = {
  __typename?: 'PlatformOverview'
  health_score: Scalars['Float']['output']
  total_dance_bonds: Scalars['Int']['output']
  total_dance_minutes: Scalars['Int']['output']
  total_dance_sessions: Scalars['Int']['output']
  total_events_hosted: Scalars['Int']['output']
  total_points_distributed: Scalars['Float']['output']
  total_xp_distributed: Scalars['Float']['output']
}

export type PointAction = {
  __typename?: 'PointAction'
  action_key: Scalars['String']['output']
  action_name: Scalars['String']['output']
  avg_points_per_transaction?: Maybe<Scalars['Float']['output']>
  category: PointActionCategory
  created_at: Scalars['DateTime']['output']
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  is_active: Scalars['Boolean']['output']
  last_awarded_at?: Maybe<Scalars['DateTime']['output']>
  max_per_day?: Maybe<Scalars['Int']['output']>
  max_per_month?: Maybe<Scalars['Int']['output']>
  max_per_week?: Maybe<Scalars['Int']['output']>
  points_value: Scalars['Int']['output']
  requires_verification: Scalars['Boolean']['output']
  total_points_awarded?: Maybe<Scalars['Int']['output']>
  total_transactions?: Maybe<Scalars['Int']['output']>
  unique_users?: Maybe<Scalars['Int']['output']>
  updated_at: Scalars['DateTime']['output']
}

export enum PointActionCategory {
  Achievement = 'achievement',
  Activity = 'activity',
  Admin = 'admin',
  Event = 'event',
  Referral = 'referral',
  Social = 'social',
  Special = 'special',
}

export type PointTransaction = {
  __typename?: 'PointTransaction'
  action?: Maybe<PointAction>
  action_key: Scalars['String']['output']
  admin_note?: Maybe<Scalars['String']['output']>
  admin_user?: Maybe<User>
  admin_user_id?: Maybe<Scalars['String']['output']>
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  metadata?: Maybe<Scalars['JSON']['output']>
  points_amount: Scalars['Int']['output']
  reference_id?: Maybe<Scalars['ID']['output']>
  reference_type?: Maybe<ReferenceType>
  status: TransactionStatus
  transaction_type: TransactionType
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

export type PointsOverview = {
  __typename?: 'PointsOverview'
  avg_points_per_user: Scalars['Float']['output']
  points_issued_this_month: Scalars['Int']['output']
  points_issued_this_week: Scalars['Int']['output']
  points_issued_today: Scalars['Int']['output']
  top_earning_action?: Maybe<PointAction>
  total_active_users: Scalars['Int']['output']
  total_points_issued: Scalars['Int']['output']
  total_points_spent: Scalars['Int']['output']
}

export type PointsSource = {
  __typename?: 'PointsSource'
  amount: Scalars['Float']['output']
  percentage: Scalars['Float']['output']
  source: Scalars['String']['output']
}

export enum PoolStatus {
  Completed = 'completed',
  Distributing = 'distributing',
  Locked = 'locked',
  Open = 'open',
}

export type Post = {
  __typename?: 'Post'
  comments_count: Scalars['Int']['output']
  content: Scalars['String']['output']
  created_at: Scalars['DateTime']['output']
  event?: Maybe<Event>
  event_id?: Maybe<Scalars['ID']['output']>
  id: Scalars['ID']['output']
  is_liked_by_me: Scalars['Boolean']['output']
  is_public: Scalars['Boolean']['output']
  likes_count: Scalars['Int']['output']
  location?: Maybe<Scalars['String']['output']>
  media_type?: Maybe<MediaType>
  media_url?: Maybe<Scalars['String']['output']>
  updated_at: Scalars['DateTime']['output']
  user: User
  user_id: Scalars['String']['output']
}

export type PostComment = {
  __typename?: 'PostComment'
  content: Scalars['String']['output']
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  post_id: Scalars['ID']['output']
  updated_at: Scalars['DateTime']['output']
  user: User
  user_id: Scalars['String']['output']
}

export type PostLike = {
  __typename?: 'PostLike'
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  post_id: Scalars['ID']['output']
  user: User
  user_id: Scalars['String']['output']
}

export type PostWithDetails = {
  __typename?: 'PostWithDetails'
  comments: Array<PostComment>
  comments_count: Scalars['Int']['output']
  content: Scalars['String']['output']
  created_at: Scalars['DateTime']['output']
  event?: Maybe<Event>
  event_id?: Maybe<Scalars['ID']['output']>
  id: Scalars['ID']['output']
  is_liked_by_me: Scalars['Boolean']['output']
  is_public: Scalars['Boolean']['output']
  likes: Array<PostLike>
  likes_count: Scalars['Int']['output']
  location?: Maybe<Scalars['String']['output']>
  media_type?: Maybe<MediaType>
  media_url?: Maybe<Scalars['String']['output']>
  updated_at: Scalars['DateTime']['output']
  user: User
  user_id: Scalars['String']['output']
}

/** Simplified privacy presets for quick setup */
export type PrivacyPreset = {
  __typename?: 'PrivacyPreset'
  allow_messages: AllowMessagesFrom
  appear_in_suggestions: Scalars['Boolean']['output']
  description: Scalars['String']['output']
  name: Scalars['String']['output']
  profile_visibility: ProfileVisibility
  searchable: Scalars['Boolean']['output']
}

/** Quick privacy preset - applies multiple settings at once */
export enum PrivacyPresetType {
  /** Ghost: Completely hidden, no interactions */
  Ghost = 'ghost',
  /** Open: Public profile, everyone can find and message you */
  Open = 'open',
  /** Private: Hidden profile, no suggestions, bonds-only messages */
  PrivateMode = 'private_mode',
  /** Selective: Bonds-only profile, appear in suggestions */
  Selective = 'selective',
  /** Social: Public profile, only bonds can message */
  Social = 'social',
}

/**
 * User privacy settings - controls visibility and discoverability
 * Simplified into logical groups for better UX
 */
export type PrivacySettings = {
  __typename?: 'PrivacySettings'
  allow_bond_requests: AllowBondRequestsFrom
  allow_event_invites: Scalars['Boolean']['output']
  allow_messages: AllowMessagesFrom
  appear_in_event_attendees: Scalars['Boolean']['output']
  appear_in_nearby: Scalars['Boolean']['output']
  appear_in_suggestions: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  notify_bonds_on_achievement: Scalars['Boolean']['output']
  notify_bonds_on_check_in: Scalars['Boolean']['output']
  /** Who can see your profile: public, bonds_only, or private */
  profile_visibility: ProfileVisibility
  searchable_by_username: Scalars['Boolean']['output']
  show_avatar: Scalars['Boolean']['output']
  show_badges: Scalars['Boolean']['output']
  show_bio: Scalars['Boolean']['output']
  show_check_ins: Scalars['Boolean']['output']
  show_city: Scalars['Boolean']['output']
  show_comments: Scalars['Boolean']['output']
  show_dance_styles: Scalars['Boolean']['output']
  show_events_attended: Scalars['Boolean']['output']
  show_events_attending: Scalars['Boolean']['output']
  show_leaderboard_rank: Scalars['Boolean']['output']
  show_likes: Scalars['Boolean']['output']
  show_posts: Scalars['Boolean']['output']
  show_real_name: Scalars['Boolean']['output']
  show_stats: Scalars['Boolean']['output']
  updated_at?: Maybe<Scalars['DateTime']['output']>
  user_id: Scalars['String']['output']
}

export enum ProfileVisibility {
  BondsOnly = 'bonds_only',
  Private = 'private',
  Public = 'public',
}

export type Project = {
  __typename?: 'Project'
  color?: Maybe<Scalars['String']['output']>
  created_at: Scalars['DateTime']['output']
  default_branch?: Maybe<Scalars['String']['output']>
  description?: Maybe<Scalars['String']['output']>
  display_order?: Maybe<Scalars['Int']['output']>
  feature_count?: Maybe<Scalars['Int']['output']>
  github_org?: Maybe<Scalars['String']['output']>
  github_repo?: Maybe<Scalars['String']['output']>
  icon?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  is_active: Scalars['Boolean']['output']
  is_archived: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  open_task_count?: Maybe<Scalars['Int']['output']>
  platform?: Maybe<ProjectPlatform>
  project_type: ProjectType
  slug: Scalars['String']['output']
  task_count?: Maybe<Scalars['Int']['output']>
  tech_stack?: Maybe<Array<Scalars['String']['output']>>
  updated_at: Scalars['DateTime']['output']
}

export enum ProjectPlatform {
  Admin = 'admin',
  Api = 'api',
  Mobile = 'mobile',
  Telegram = 'telegram',
  Web = 'web',
}

export enum ProjectType {
  App = 'app',
  Backend = 'backend',
  Docs = 'docs',
  Library = 'library',
}

export type Query = {
  __typename?: 'Query'
  _empty?: Maybe<Scalars['String']['output']>
  achievementDefinitions: Array<AchievementDefinition>
  achievementsByCategory: Array<AchievementProgress>
  activity?: Maybe<Activity>
  activityFeed: ActivityFeed
  activityFeedGrouped: Array<ActivityGroup>
  activityStats: ActivityStats
  adminDashboardAnalytics: Scalars['JSON']['output']
  adminStats: AdminStats
  allChallenges: Array<Challenge>
  /** Get all feedback (admin only) */
  allFeedback: Array<Feedback>
  allGigRoles: Array<GigRole>
  /** Admin: Get all username change requests with optional filters */
  allUsernameChangeRequests: UsernameChangeRequestConnection
  analyticsReport: Scalars['JSON']['output']
  availableChallenges: Array<Challenge>
  availableGigsForMe: Array<EventGig>
  /** Get a specific bond request */
  bondRequest?: Maybe<BondRequest>
  canMessageUser: CanViewResult
  canSendBondRequest: CanViewResult
  /** Check if I can send a bond request to a user */
  canSendBondRequestTo: CanSendBondRequestResult
  canViewProfile: CanViewResult
  challengeById?: Maybe<Challenge>
  challengeLeaderboard: ChallengeLeaderboard
  changelog: Array<ChangelogVersion>
  changelogEntry?: Maybe<ChangelogEntry>
  checkEventPermission: Scalars['Boolean']['output']
  checkUsername: Scalars['Boolean']['output']
  cohortAnalysis: Array<CohortData>
  compareMetrics: Array<AnalyticsComparison>
  completedFreestyleToday: Scalars['Boolean']['output']
  conversation?: Maybe<Conversation>
  creatorSponsorshipNotificationPreferences?: Maybe<CreatorSponsorshipNotificationPreferences>
  currentSeasonLeaderboard?: Maybe<SeasonalLeaderboard>
  dailyChallenges: DailyChallengeset
  danceAnalytics: DanceMetrics
  danceSession?: Maybe<DanceSession>
  devAlert?: Maybe<DevAlert>
  devAlerts: DevAlertConnection
  devDashboardStats?: Maybe<DevDashboardStats>
  devTask?: Maybe<DevTask>
  devTasks: DevTaskConnection
  /** Get or create a DM conversation with a user */
  dmConversation?: Maybe<Conversation>
  economyAnalytics: EconomyMetrics
  event?: Maybe<Event>
  eventAnalytics: EventMetrics
  eventByCheckinCode?: Maybe<Event>
  eventFlowPool?: Maybe<EventFlowPool>
  eventGig?: Maybe<EventGig>
  eventGigManagers: Array<EventGigManager>
  eventGigs: Array<EventGig>
  eventLeaderboard?: Maybe<EventLeaderboard>
  eventManager?: Maybe<EventManager>
  eventManagers: EventManagerConnection
  eventRegistrations: Array<EventRegistration>
  eventSponsors: Array<EventSponsorship>
  eventSponsorshipAnalytics?: Maybe<EventSponsorshipAnalytics>
  eventSponsorshipSettings?: Maybe<EventSponsorshipSettings>
  events: EventConnection
  eventsForSponsorship: Array<Event>
  featureInventory: FeatureInventoryConnection
  featureInventoryBySlug?: Maybe<FeatureInventory>
  featureInventoryItem?: Maybe<FeatureInventory>
  featureInventoryStats: FeatureInventoryStats
  featureRequest?: Maybe<FeatureRequest>
  featureRequests: FeatureRequestConnection
  /** Get feedback stats (admin only) */
  feedbackStats: FeedbackStats
  freestyleSession?: Maybe<FreestyleSession>
  friendsActivityFeed: ActivityFeed
  friendsDanceSessions: Array<DanceSession>
  friendsLeaderboard: Leaderboard
  getAdminReferralStats: AdminReferralStats
  getAllEventRegistrations: Array<EventRegistration>
  getAllEvents: AdminEventConnection
  getAllNotifications: AdminNotificationConnection
  getAllPointActions: Array<PointAction>
  getAllTransactions: TransactionHistory
  getAllUsers: Array<User>
  getDanceBond?: Maybe<DanceBond>
  getEventAttendance: Array<EventAttendance>
  getEventAttendanceSummaries: Array<EventAttendanceSummary>
  getEventPosts: Array<Post>
  getFeed: FeedResponse
  getMyDanceBonds: Array<DanceBond>
  getMyPosts: Array<Post>
  getMyReferrals: Array<UserReferralInfo>
  getPointAction?: Maybe<PointAction>
  getPointsOverview: PointsOverview
  getPost?: Maybe<PostWithDetails>
  getReferralByCode?: Maybe<Referral>
  getReferralChain: Array<ReferralChainNode>
  getReferralClickStats: Array<ReferralClickTracking>
  /** Get similarity/match data with another user */
  getSimilarityWith: MatchReasons
  getUploadUrl: UploadUrl
  getUserByUsername?: Maybe<User>
  getUserDailyActivity: Array<DailyActivity>
  getUserEventAttendance: Array<EventAttendance>
  getUserPointsSummaries: Array<UserPointsSummary>
  getUserPosts: Array<Post>
  getUserStats: UserStats
  getUserTransactions: TransactionHistory
  gigApplication?: Maybe<GigApplication>
  gigApplications: Array<GigApplication>
  gigManagerDashboard: GigManagerDashboard
  gigRewardRates: Array<GigRewardRate>
  gigRole?: Maybe<GigRole>
  githubActions: Array<GitHubAction>
  githubCommits: Array<GitHubCommit>
  githubPullRequests: Array<GitHubPullRequest>
  githubRateLimit?: Maybe<GitHubRateLimit>
  githubReleases: Array<GitHubRelease>
  githubRepos: Array<GitHubRepo>
  globalActivityFeed: ActivityFeed
  globalLeaderboard: Leaderboard
  isAchievementUnlocked: Scalars['Boolean']['output']
  isUserBlocked: Scalars['Boolean']['output']
  latestChangelog?: Maybe<ChangelogVersion>
  latestWearableReading?: Maybe<WearableHealthData>
  leaderboard: Leaderboard
  leaderboardNearMe: Array<User>
  me?: Maybe<User>
  message?: Maybe<Message>
  messages: MessageConnection
  metricTimeSeries: Array<TimeSeriesPoint>
  miniappActivities: Array<MiniappActivity>
  miniappChallenges: Array<MiniappChallenge>
  miniappDailyStats: MiniappDailyStats
  miniappFriends: Array<MiniappFriend>
  miniappHome: MiniappHomeData
  miniappLeaderboard: Array<MiniappLeaderboardEntry>
  miniappLevel: Scalars['Int']['output']
  miniappNotifications: Array<MiniappNotification>
  miniappOnlineFriends: Array<MiniappFriend>
  miniappPoints: Scalars['Int']['output']
  miniappReadyFeatures: Array<FeatureInventory>
  miniappReferralLink: Scalars['String']['output']
  miniappSettings: MiniappSettings
  miniappShareContent: MiniappShareContent
  miniappStreak: MiniappStreakInfo
  miniappUnreadCount: Scalars['Int']['output']
  miniappXP: Scalars['Int']['output']
  monthlyLeaderboard: Leaderboard
  myAchievementStats: AchievementStats
  myAchievements: Array<AchievementProgress>
  myActiveChallenges: Array<UserChallenge>
  myActivityFeed: ActivityFeed
  myActivityStats: ActivityStats
  myBlockedUsers: Array<UserBlock>
  /** Get bond request stats */
  myBondRequestStats: BondRequestStats
  myBonds: Array<User>
  myChallengeProgress?: Maybe<ChallengeProgress>
  myChallengeStats: ChallengeStats
  myCompletedChallenges: Array<UserChallenge>
  myConversations: ConversationConnection
  myDanceBonds: Array<DanceBond>
  myDanceSessionStats: DanceSessionStats
  myDanceSessions: DanceSessionConnection
  myDevAlerts: DevAlertConnection
  myDevTasks: Array<DevTask>
  myEventManagerRole?: Maybe<EventManager>
  myFlowBalance?: Maybe<UserFlowBalance>
  myFlowTransactions: Array<FlowTransaction>
  myFreestylePreferences: UserPreferences
  myFreestyleSessions: Array<FreestyleSession>
  myFreestyleStats: FreestyleSessionStats
  myGigApplications: Array<GigApplication>
  myGigDashboard: GigDashboard
  myGigRoles: Array<UserGigRole>
  myGigStats: GigStats
  myLeaderboardHistory: LeaderboardHistory
  myLeaderboardSummary: LeaderboardSummary
  myManagedEvents: Array<Event>
  myNotificationPreferences: NotificationPreferences
  myNotifications: NotificationConnection
  myOrganizerApplication?: Maybe<OrganizerApplication>
  /** Get pending bond requests received */
  myPendingBondRequests: Array<BondRequest>
  myPrivacySettings: PrivacySettings
  myReferralCode?: Maybe<ReferralCode>
  myReferralStats: ReferralStats
  myReferrals: Array<Referral>
  /** Get bond requests sent by me */
  mySentBondRequests: Array<BondRequest>
  mySponsorProfile?: Maybe<Sponsor>
  mySubscriptions: Array<SponsorSubscription>
  myUnlockedAchievements: Array<AchievementDetails>
  /** Get the current user's username change eligibility status */
  myUsernameChangeEligibility: UsernameChangeEligibility
  /** Get the current user's username change history */
  myUsernameChangeHistory: Array<UsernameChangeRequest>
  myVerificationStatus?: Maybe<VerifiedEventCreator>
  myWearableDevices: Array<WearableDevice>
  myWearableHealthData: Array<WearableHealthData>
  myWearableMotionData: Array<WearableMotionData>
  nearbyUsers: Array<LeaderboardEntry>
  notification?: Maybe<Notification>
  organizerApplication?: Maybe<OrganizerApplication>
  organizerApplications: OrganizerApplicationsResponse
  pendingOrganizerApplications: OrganizerApplicationsResponse
  pendingOrganizers: UserConnection
  pendingSponsorshipApprovals: Array<SponsorshipApproval>
  /** Admin: Get all pending username change requests */
  pendingUsernameChangeRequests: UsernameChangeRequestConnection
  platformAnalytics: PlatformAnalytics
  privacyPresets: Array<PrivacyPreset>
  project?: Maybe<Project>
  projectBySlug?: Maybe<Project>
  projects: Array<Project>
  publicEvent?: Maybe<Event>
  publicEvents: EventConnection
  realTimeAnalytics: RealTimeAnalytics
  recentActivities: Array<Activity>
  regionalLeaderboard: RegionalLeaderboard
  reportedContent?: Maybe<Scalars['JSON']['output']>
  searchMessages: MessageConnection
  searchUsers: UserSearchConnection
  seasonLeaderboard?: Maybe<SeasonalLeaderboard>
  socialAnalytics: SocialMetrics
  specialChallenges: Array<Challenge>
  sponsor?: Maybe<Sponsor>
  sponsorAnalytics?: Maybe<SponsorAnalytics>
  sponsorByUserId?: Maybe<Sponsor>
  sponsorCategories: Array<SponsorCategory>
  sponsorDashboard?: Maybe<SponsorDashboard>
  sponsorNotificationPreferences?: Maybe<SponsorNotificationPreferences>
  sprintTasks: Array<DevTask>
  subscription?: Maybe<SponsorSubscription>
  suggestedEventsForSponsor: Array<SuggestedEvent>
  suggestedUsers: UserSuggestionConnection
  systemHealth: Array<SystemHealth>
  topPerformers: Array<LeaderboardEntry>
  topVotedFeatures: Array<FeatureRequest>
  trendAnalysis: Array<TrendAnalysis>
  trendingActivities: Array<TrendingActivity>
  trendingNow: Array<Activity>
  unreadMessageCount: Scalars['Int']['output']
  unreadNotificationCount: Scalars['Int']['output']
  user?: Maybe<User>
  userActivities: Array<Activity>
  userAnalytics: UserAnalytics
  userGigRoles: Array<UserGigRole>
  users: UserConnection
  usersAtEvent: Array<User>
  verificationCriteria?: Maybe<VerificationCriteria>
  verifiedCreatorStatus?: Maybe<VerifiedEventCreator>
  wearableDevice?: Maybe<WearableDevice>
  wearableStats?: Maybe<WearableStats>
  weeklyChallenges: Array<Challenge>
  weeklyLeaderboard: Leaderboard
}

export type QueryAchievementsByCategoryArgs = {
  category: AchievementCategory
}

export type QueryActivityArgs = {
  id: Scalars['String']['input']
}

export type QueryActivityFeedArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<ActivityFilter>
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryActivityFeedGroupedArgs = {
  groupBy: Scalars['String']['input']
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryAllChallengesArgs = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>
  type?: InputMaybe<ChallengeType>
}

export type QueryAllFeedbackArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<FeedbackStatus>
}

export type QueryAllGigRolesArgs = {
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>
  category?: InputMaybe<GigRoleCategory>
  tier?: InputMaybe<Scalars['Int']['input']>
}

export type QueryAllUsernameChangeRequestsArgs = {
  pagination?: InputMaybe<PaginationInput>
  status?: InputMaybe<UsernameChangeStatus>
}

export type QueryAnalyticsReportArgs = {
  options?: InputMaybe<AnalyticsOptions>
  report_type: Scalars['String']['input']
}

export type QueryAvailableChallengesArgs = {
  category?: InputMaybe<ChallengeCategory>
  type?: InputMaybe<ChallengeType>
}

export type QueryAvailableGigsForMeArgs = {
  eventId?: InputMaybe<Scalars['ID']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryBondRequestArgs = {
  id: Scalars['ID']['input']
}

export type QueryCanMessageUserArgs = {
  user_id: Scalars['String']['input']
}

export type QueryCanSendBondRequestArgs = {
  user_id: Scalars['String']['input']
}

export type QueryCanSendBondRequestToArgs = {
  user_id: Scalars['String']['input']
}

export type QueryCanViewProfileArgs = {
  user_id: Scalars['String']['input']
}

export type QueryChallengeByIdArgs = {
  id: Scalars['String']['input']
}

export type QueryChallengeLeaderboardArgs = {
  period: Scalars['String']['input']
  type: ChallengeType
}

export type QueryChangelogArgs = {
  include_private?: InputMaybe<Scalars['Boolean']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryChangelogEntryArgs = {
  id: Scalars['ID']['input']
}

export type QueryCheckEventPermissionArgs = {
  event_id: Scalars['ID']['input']
  permission: Scalars['String']['input']
}

export type QueryCheckUsernameArgs = {
  username: Scalars['String']['input']
}

export type QueryCohortAnalysisArgs = {
  cohort_type: Scalars['String']['input']
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryCompareMetricsArgs = {
  metrics: Array<Scalars['String']['input']>
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryConversationArgs = {
  id: Scalars['ID']['input']
}

export type QueryDanceAnalyticsArgs = {
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryDanceSessionArgs = {
  id: Scalars['ID']['input']
}

export type QueryDevAlertArgs = {
  id: Scalars['ID']['input']
}

export type QueryDevAlertsArgs = {
  filter?: InputMaybe<DevAlertFilter>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryDevTaskArgs = {
  id: Scalars['ID']['input']
}

export type QueryDevTasksArgs = {
  filter?: InputMaybe<DevTaskFilter>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  sort_by?: InputMaybe<Scalars['String']['input']>
}

export type QueryDmConversationArgs = {
  user_id: Scalars['String']['input']
}

export type QueryEconomyAnalyticsArgs = {
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryEventArgs = {
  id: Scalars['ID']['input']
}

export type QueryEventAnalyticsArgs = {
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryEventByCheckinCodeArgs = {
  code: Scalars['String']['input']
}

export type QueryEventFlowPoolArgs = {
  eventId: Scalars['ID']['input']
}

export type QueryEventGigArgs = {
  id: Scalars['ID']['input']
}

export type QueryEventGigManagersArgs = {
  eventId: Scalars['ID']['input']
}

export type QueryEventGigsArgs = {
  eventId: Scalars['ID']['input']
}

export type QueryEventLeaderboardArgs = {
  eventId: Scalars['String']['input']
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryEventManagerArgs = {
  id: Scalars['ID']['input']
}

export type QueryEventManagersArgs = {
  event_id: Scalars['ID']['input']
}

export type QueryEventRegistrationsArgs = {
  eventId: Scalars['ID']['input']
  status?: InputMaybe<RegistrationStatus>
}

export type QueryEventSponsorsArgs = {
  eventId: Scalars['ID']['input']
}

export type QueryEventSponsorshipAnalyticsArgs = {
  eventId: Scalars['ID']['input']
}

export type QueryEventSponsorshipSettingsArgs = {
  eventId: Scalars['ID']['input']
}

export type QueryEventsArgs = {
  filter?: InputMaybe<EventFilterInput>
  pagination?: InputMaybe<PaginationInput>
  sortBy?: InputMaybe<EventSortBy>
}

export type QueryEventsForSponsorshipArgs = {
  input?: InputMaybe<EventsForSponsorshipInput>
}

export type QueryFeatureInventoryArgs = {
  filter?: InputMaybe<FeatureInventoryFilter>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  sort_by?: InputMaybe<Scalars['String']['input']>
}

export type QueryFeatureInventoryBySlugArgs = {
  slug: Scalars['String']['input']
}

export type QueryFeatureInventoryItemArgs = {
  id: Scalars['ID']['input']
}

export type QueryFeatureRequestArgs = {
  id: Scalars['ID']['input']
}

export type QueryFeatureRequestsArgs = {
  filter?: InputMaybe<FeatureRequestFilter>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  sort_by?: InputMaybe<Scalars['String']['input']>
}

export type QueryFreestyleSessionArgs = {
  id: Scalars['ID']['input']
}

export type QueryFriendsActivityFeedArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryFriendsDanceSessionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryFriendsLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
}

export type QueryGetAllEventsArgs = {
  category?: InputMaybe<EventCategory>
  facilitator_id?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<EventStatus>
}

export type QueryGetAllNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  type?: InputMaybe<Scalars['String']['input']>
}

export type QueryGetAllPointActionsArgs = {
  category?: InputMaybe<PointActionCategory>
  is_active?: InputMaybe<Scalars['Boolean']['input']>
}

export type QueryGetAllTransactionsArgs = {
  action_key?: InputMaybe<Scalars['String']['input']>
  end_date?: InputMaybe<Scalars['DateTime']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  start_date?: InputMaybe<Scalars['DateTime']['input']>
  status?: InputMaybe<TransactionStatus>
}

export type QueryGetDanceBondArgs = {
  userId: Scalars['String']['input']
}

export type QueryGetEventAttendanceArgs = {
  event_id: Scalars['ID']['input']
}

export type QueryGetEventPostsArgs = {
  eventId: Scalars['ID']['input']
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryGetFeedArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryGetMyPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryGetPointActionArgs = {
  action_key: Scalars['String']['input']
}

export type QueryGetPostArgs = {
  id: Scalars['ID']['input']
}

export type QueryGetReferralByCodeArgs = {
  code: Scalars['String']['input']
}

export type QueryGetReferralChainArgs = {
  userId?: InputMaybe<Scalars['String']['input']>
}

export type QueryGetReferralClickStatsArgs = {
  code: Scalars['String']['input']
}

export type QueryGetSimilarityWithArgs = {
  user_id: Scalars['String']['input']
}

export type QueryGetUploadUrlArgs = {
  fileName: Scalars['String']['input']
  mimeType: MimeType
  uploadType: UploadType
}

export type QueryGetUserByUsernameArgs = {
  username: Scalars['String']['input']
}

export type QueryGetUserDailyActivityArgs = {
  end_date: Scalars['String']['input']
  start_date: Scalars['String']['input']
  user_id: Scalars['String']['input']
}

export type QueryGetUserEventAttendanceArgs = {
  user_id: Scalars['String']['input']
}

export type QueryGetUserPointsSummariesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  sort_by?: InputMaybe<Scalars['String']['input']>
  sort_order?: InputMaybe<Scalars['String']['input']>
}

export type QueryGetUserPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  userId: Scalars['String']['input']
}

export type QueryGetUserStatsArgs = {
  userId?: InputMaybe<Scalars['String']['input']>
}

export type QueryGetUserTransactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<TransactionStatus>
  user_id: Scalars['String']['input']
}

export type QueryGigApplicationArgs = {
  id: Scalars['ID']['input']
}

export type QueryGigApplicationsArgs = {
  gigId: Scalars['ID']['input']
  status?: InputMaybe<GigApplicationStatus>
}

export type QueryGigRewardRatesArgs = {
  roleId?: InputMaybe<Scalars['ID']['input']>
}

export type QueryGigRoleArgs = {
  id?: InputMaybe<Scalars['ID']['input']>
  slug?: InputMaybe<Scalars['String']['input']>
}

export type QueryGithubActionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  repo: Scalars['String']['input']
}

export type QueryGithubCommitsArgs = {
  branch?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  repo: Scalars['String']['input']
}

export type QueryGithubPullRequestsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  repo: Scalars['String']['input']
  state?: InputMaybe<Scalars['String']['input']>
}

export type QueryGithubReleasesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  repo: Scalars['String']['input']
}

export type QueryGlobalActivityFeedArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryGlobalLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
}

export type QueryIsAchievementUnlockedArgs = {
  achievementType: Scalars['String']['input']
}

export type QueryIsUserBlockedArgs = {
  user_id: Scalars['String']['input']
}

export type QueryLatestWearableReadingArgs = {
  deviceId?: InputMaybe<Scalars['String']['input']>
}

export type QueryLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
  offset?: InputMaybe<Scalars['Int']['input']>
  type: LeaderboardType
}

export type QueryLeaderboardNearMeArgs = {
  range?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMessageArgs = {
  id: Scalars['ID']['input']
}

export type QueryMessagesArgs = {
  after_id?: InputMaybe<Scalars['ID']['input']>
  before_id?: InputMaybe<Scalars['ID']['input']>
  conversation_id: Scalars['ID']['input']
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMetricTimeSeriesArgs = {
  metric: Scalars['String']['input']
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryMiniappActivitiesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMiniappLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  type: Scalars['String']['input']
}

export type QueryMiniappNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMiniappShareContentArgs = {
  content_id?: InputMaybe<Scalars['String']['input']>
  content_type: Scalars['String']['input']
}

export type QueryMonthlyLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
}

export type QueryMyActivityFeedArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyBondsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyChallengeProgressArgs = {
  challengeId: Scalars['String']['input']
}

export type QueryMyCompletedChallengesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyConversationsArgs = {
  filter?: InputMaybe<ConversationFilter>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyDanceSessionsArgs = {
  filter?: InputMaybe<DanceSessionFilterInput>
  pagination?: InputMaybe<PaginationInput>
}

export type QueryMyDevAlertsArgs = {
  include_dismissed?: InputMaybe<Scalars['Boolean']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyEventManagerRoleArgs = {
  event_id: Scalars['ID']['input']
}

export type QueryMyFlowTransactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  type?: InputMaybe<FlowTransactionType>
}

export type QueryMyFreestyleSessionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyGigApplicationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<GigApplicationStatus>
}

export type QueryMyGigRolesArgs = {
  status?: InputMaybe<UserGigRoleStatus>
}

export type QueryMyLeaderboardHistoryArgs = {
  days?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
}

export type QueryMyNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  type?: InputMaybe<NotificationType>
  unread_only?: InputMaybe<Scalars['Boolean']['input']>
}

export type QueryMyPendingBondRequestsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyReferralsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<ReferralStatus>
}

export type QueryMySentBondRequestsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyWearableHealthDataArgs = {
  deviceId?: InputMaybe<Scalars['String']['input']>
  from?: InputMaybe<Scalars['DateTime']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  to?: InputMaybe<Scalars['DateTime']['input']>
}

export type QueryMyWearableMotionDataArgs = {
  deviceId?: InputMaybe<Scalars['String']['input']>
  from?: InputMaybe<Scalars['DateTime']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  sessionId?: InputMaybe<Scalars['String']['input']>
  to?: InputMaybe<Scalars['DateTime']['input']>
}

export type QueryNearbyUsersArgs = {
  metric: LeaderboardMetric
  range?: InputMaybe<Scalars['Int']['input']>
}

export type QueryNotificationArgs = {
  id: Scalars['ID']['input']
}

export type QueryOrganizerApplicationArgs = {
  id: Scalars['ID']['input']
}

export type QueryOrganizerApplicationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<ApplicationStatus>
}

export type QueryPendingOrganizerApplicationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryPendingOrganizersArgs = {
  pagination?: InputMaybe<PaginationInput>
}

export type QueryPendingSponsorshipApprovalsArgs = {
  eventId: Scalars['ID']['input']
}

export type QueryPendingUsernameChangeRequestsArgs = {
  pagination?: InputMaybe<PaginationInput>
}

export type QueryPlatformAnalyticsArgs = {
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryProjectArgs = {
  id: Scalars['ID']['input']
}

export type QueryProjectBySlugArgs = {
  slug: Scalars['String']['input']
}

export type QueryProjectsArgs = {
  include_archived?: InputMaybe<Scalars['Boolean']['input']>
}

export type QueryPublicEventArgs = {
  slug: Scalars['String']['input']
}

export type QueryPublicEventsArgs = {
  filter?: InputMaybe<EventFilterInput>
  pagination?: InputMaybe<PaginationInput>
  sortBy?: InputMaybe<EventSortBy>
}

export type QueryRecentActivitiesArgs = {
  since: Scalars['DateTime']['input']
  types?: InputMaybe<Array<ActivityType>>
}

export type QueryRegionalLeaderboardArgs = {
  city?: InputMaybe<Scalars['String']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
}

export type QueryReportedContentArgs = {
  pagination?: InputMaybe<PaginationInput>
  status?: InputMaybe<Scalars['String']['input']>
  type?: InputMaybe<Scalars['String']['input']>
}

export type QuerySearchMessagesArgs = {
  conversation_id?: InputMaybe<Scalars['ID']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  query: Scalars['String']['input']
}

export type QuerySearchUsersArgs = {
  input: SearchUsersInput
}

export type QuerySeasonLeaderboardArgs = {
  seasonId: Scalars['String']['input']
}

export type QuerySocialAnalyticsArgs = {
  options?: InputMaybe<AnalyticsOptions>
}

export type QuerySponsorArgs = {
  id: Scalars['ID']['input']
}

export type QuerySponsorAnalyticsArgs = {
  endDate: Scalars['DateTime']['input']
  periodType: Scalars['String']['input']
  startDate: Scalars['DateTime']['input']
}

export type QuerySponsorByUserIdArgs = {
  userId: Scalars['String']['input']
}

export type QuerySprintTasksArgs = {
  sprint: Scalars['String']['input']
}

export type QuerySubscriptionArgs = {
  id: Scalars['ID']['input']
}

export type QuerySuggestedEventsForSponsorArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QuerySuggestedUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryTopPerformersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
  period: Scalars['String']['input']
}

export type QueryTopVotedFeaturesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryTrendAnalysisArgs = {
  metrics: Array<Scalars['String']['input']>
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryTrendingActivitiesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
}

export type QueryUserArgs = {
  id: Scalars['String']['input']
}

export type QueryUserActivitiesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  userId: Scalars['String']['input']
}

export type QueryUserAnalyticsArgs = {
  options?: InputMaybe<AnalyticsOptions>
}

export type QueryUserGigRolesArgs = {
  userId: Scalars['ID']['input']
}

export type QueryUsersArgs = {
  filter?: InputMaybe<UserFilterInput>
  pagination?: InputMaybe<PaginationInput>
}

export type QueryUsersAtEventArgs = {
  event_id: Scalars['ID']['input']
}

export type QueryVerificationCriteriaArgs = {
  userId?: InputMaybe<Scalars['String']['input']>
}

export type QueryVerifiedCreatorStatusArgs = {
  userId?: InputMaybe<Scalars['String']['input']>
}

export type QueryWearableDeviceArgs = {
  deviceId: Scalars['String']['input']
}

export type QueryWearableStatsArgs = {
  deviceId?: InputMaybe<Scalars['String']['input']>
}

export type QueryWeeklyLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  metric: LeaderboardMetric
}

export type RarityCount = {
  __typename?: 'RarityCount'
  rarity: AchievementRarity
  total: Scalars['Int']['output']
  unlocked: Scalars['Int']['output']
}

export type RealTimeAnalytics = {
  __typename?: 'RealTimeAnalytics'
  active_dance_sessions: Scalars['Int']['output']
  api_requests_per_minute: Scalars['Int']['output']
  current_online_users: Scalars['Int']['output']
  events_in_progress: Scalars['Int']['output']
  live_metrics: LiveMetrics
  recent_sessions: Scalars['Int']['output']
  recent_signups: Scalars['Int']['output']
  system_load: Scalars['Float']['output']
}

export enum RecurrenceType {
  Biweekly = 'biweekly',
  Daily = 'daily',
  Monthly = 'monthly',
  None = 'none',
  Weekly = 'weekly',
}

export enum ReferenceType {
  Achievement = 'achievement',
  Admin = 'admin',
  DanceSession = 'dance_session',
  Event = 'event',
  Purchase = 'purchase',
  Referral = 'referral',
}

export type Referral = {
  __typename?: 'Referral'
  clicked_at: Scalars['DateTime']['output']
  completed_at?: Maybe<Scalars['DateTime']['output']>
  device_id?: Maybe<Scalars['String']['output']>
  first_session_completed_at?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  ip_address?: Maybe<Scalars['String']['output']>
  points_awarded: Scalars['Int']['output']
  referee?: Maybe<User>
  referee_user_id?: Maybe<Scalars['String']['output']>
  referral_code: Scalars['String']['output']
  referrer?: Maybe<User>
  referrer_user_id: Scalars['String']['output']
  signed_up_at?: Maybe<Scalars['DateTime']['output']>
  status: ReferralStatus
  user_agent?: Maybe<Scalars['String']['output']>
}

export type ReferralChainNode = {
  __typename?: 'ReferralChainNode'
  depth: Scalars['Int']['output']
  invited_by?: Maybe<Scalars['String']['output']>
  user_id: Scalars['String']['output']
  username?: Maybe<Scalars['String']['output']>
}

export type ReferralClickTracking = {
  __typename?: 'ReferralClickTracking'
  clicked_at: Scalars['DateTime']['output']
  device_info?: Maybe<Scalars['JSON']['output']>
  id: Scalars['ID']['output']
  ip_address?: Maybe<Scalars['String']['output']>
  referral_code: Scalars['String']['output']
  user_agent?: Maybe<Scalars['String']['output']>
}

export type ReferralCode = {
  __typename?: 'ReferralCode'
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  referral_code: Scalars['String']['output']
  share_url: Scalars['String']['output']
  total_clicks: Scalars['Int']['output']
  total_completed: Scalars['Int']['output']
  total_signups: Scalars['Int']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

export type ReferralStats = {
  __typename?: 'ReferralStats'
  completed_referrals: Scalars['Int']['output']
  conversion_rate: Scalars['Float']['output']
  pending_referrals: Scalars['Int']['output']
  total_clicks: Scalars['Int']['output']
  total_completed: Scalars['Int']['output']
  total_points_earned: Scalars['Int']['output']
  total_signups: Scalars['Int']['output']
}

export enum ReferralStatus {
  Clicked = 'clicked',
  Completed = 'completed',
  SignedUp = 'signed_up',
}

export type RegionBreakdown = {
  __typename?: 'RegionBreakdown'
  count: Scalars['Int']['output']
  region: Scalars['String']['output']
}

export type RegionalLeaderboard = {
  __typename?: 'RegionalLeaderboard'
  city?: Maybe<Scalars['String']['output']>
  country?: Maybe<Scalars['String']['output']>
  leaderboard: Leaderboard
  region: Scalars['String']['output']
}

export type RegisterWearableInput = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>
  device_model?: InputMaybe<Scalars['String']['input']>
  device_name?: InputMaybe<Scalars['String']['input']>
  device_type: WearableDeviceType
  firmware_version?: InputMaybe<Scalars['String']['input']>
  is_primary?: InputMaybe<Scalars['Boolean']['input']>
}

export enum RegistrationStatus {
  Attended = 'attended',
  Cancelled = 'cancelled',
  NoShow = 'no_show',
  Registered = 'registered',
}

export type RequestUsernameChangeInput = {
  /** The new username being requested */
  new_username: Scalars['String']['input']
  /** Optional reason for the change (helpful for review) */
  reason?: InputMaybe<Scalars['String']['input']>
}

export type RespondToBondRequestInput = {
  /** Accept or reject */
  accept: Scalars['Boolean']['input']
  /** Request ID */
  request_id: Scalars['ID']['input']
}

export type RetentionMetrics = {
  __typename?: 'RetentionMetrics'
  cohort_analysis: Array<CohortData>
  day_1: Scalars['Float']['output']
  day_7: Scalars['Float']['output']
  day_30: Scalars['Float']['output']
}

export type ReviewApplicationInput = {
  admin_notes?: InputMaybe<Scalars['String']['input']>
  application_id: Scalars['ID']['input']
  status: ApplicationStatus
}

export type ReviewGigApplicationInput = {
  approved: Scalars['Boolean']['input']
  bonusDanz?: InputMaybe<Scalars['Float']['input']>
  reason?: InputMaybe<Scalars['String']['input']>
}

export type ReviewGigSubmissionInput = {
  approved: Scalars['Boolean']['input']
  notes?: InputMaybe<Scalars['String']['input']>
}

export type ReviewUsernameChangeInput = {
  /** Admin note explaining the decision */
  admin_note?: InputMaybe<Scalars['String']['input']>
  /** Whether to approve or reject */
  approved: Scalars['Boolean']['input']
  /** The request ID to review */
  request_id: Scalars['ID']['input']
}

export type SaveDanceSessionInput = {
  achievements_unlocked?: InputMaybe<Array<Scalars['String']['input']>>
  app_version?: InputMaybe<Scalars['String']['input']>
  bpm_average?: InputMaybe<Scalars['Float']['input']>
  bpm_peak?: InputMaybe<Scalars['Float']['input']>
  calories_burned?: InputMaybe<Scalars['Int']['input']>
  device_type?: InputMaybe<Scalars['String']['input']>
  duration: Scalars['Int']['input']
  ended_at: Scalars['DateTime']['input']
  is_shared?: InputMaybe<Scalars['Boolean']['input']>
  motion_intensity_avg?: InputMaybe<Scalars['Float']['input']>
  movement_score?: InputMaybe<Scalars['Int']['input']>
  session_quality?: InputMaybe<Scalars['Float']['input']>
  shared_with_user_ids?: InputMaybe<Array<Scalars['String']['input']>>
  started_at: Scalars['DateTime']['input']
  xp_earned: Scalars['Int']['input']
}

export type SearchUsersInput = {
  /** Limit results */
  limit?: InputMaybe<Scalars['Int']['input']>
  /** Only show users you can message */
  messageable_only?: InputMaybe<Scalars['Boolean']['input']>
  /** Offset for pagination */
  offset?: InputMaybe<Scalars['Int']['input']>
  /** Username or display name to search */
  query: Scalars['String']['input']
}

export type SeasonReward = {
  __typename?: 'SeasonReward'
  max_rank: Scalars['Int']['output']
  min_rank: Scalars['Int']['output']
  rewards: Scalars['JSON']['output']
  tier: Scalars['String']['output']
}

export type SeasonalLeaderboard = {
  __typename?: 'SeasonalLeaderboard'
  current_rewards: Array<SeasonReward>
  ends_at: Scalars['DateTime']['output']
  leaderboard: Leaderboard
  season_id: Scalars['String']['output']
  season_name: Scalars['String']['output']
  starts_at: Scalars['DateTime']['output']
}

export type SendBondRequestInput = {
  /** Optional personal message */
  message?: InputMaybe<Scalars['String']['input']>
  /** User to send request to */
  recipient_id: Scalars['String']['input']
}

export type SendBroadcastInput = {
  action_data?: InputMaybe<Scalars['JSON']['input']>
  action_type?: InputMaybe<ActionType>
  broadcast_target: BroadcastTarget
  event_id?: InputMaybe<Scalars['ID']['input']>
  expires_at?: InputMaybe<Scalars['DateTime']['input']>
  message: Scalars['String']['input']
  title: Scalars['String']['input']
}

export type SendEventBroadcastInput = {
  action_data?: InputMaybe<Scalars['JSON']['input']>
  action_type?: InputMaybe<ActionType>
  event_id: Scalars['ID']['input']
  message: Scalars['String']['input']
  title: Scalars['String']['input']
}

export type SendMessageInput = {
  content: Scalars['String']['input']
  content_type?: InputMaybe<MessageContentType>
  conversation_id: Scalars['ID']['input']
  media_type?: InputMaybe<Scalars['String']['input']>
  media_url?: InputMaybe<Scalars['String']['input']>
  metadata?: InputMaybe<Scalars['JSON']['input']>
  reply_to_id?: InputMaybe<Scalars['ID']['input']>
}

export enum SenderType {
  Admin = 'admin',
  EventManager = 'event_manager',
  System = 'system',
  User = 'user',
}

export type ShareLinks = {
  __typename?: 'ShareLinks'
  referral_code: Scalars['String']['output']
  short_url: Scalars['String']['output']
  sms_template: Scalars['String']['output']
  social_media_template: Scalars['String']['output']
  whatsapp_template: Scalars['String']['output']
}

export enum SkillLevel {
  Advanced = 'advanced',
  All = 'all',
  Beginner = 'beginner',
  Intermediate = 'intermediate',
}

export type SkillLevelMetric = {
  __typename?: 'SkillLevelMetric'
  level: Scalars['String']['output']
  percentage: Scalars['Float']['output']
  users: Scalars['Int']['output']
}

export type SocialMetrics = {
  __typename?: 'SocialMetrics'
  avg_engagement_rate: Scalars['Float']['output']
  dance_bonds_created: Scalars['Int']['output']
  referrals_completed: Scalars['Int']['output']
  total_comments: Scalars['Int']['output']
  total_likes: Scalars['Int']['output']
  total_posts: Scalars['Int']['output']
  trend: Array<TimeSeriesPoint>
  viral_posts: Scalars['Int']['output']
}

export type Sponsor = {
  __typename?: 'Sponsor'
  categories: Array<Scalars['String']['output']>
  companyDescription?: Maybe<Scalars['String']['output']>
  companyName: Scalars['String']['output']
  contactEmail?: Maybe<Scalars['String']['output']>
  contactPhone?: Maybe<Scalars['String']['output']>
  createdAt: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  impactScore?: Maybe<SponsorImpactScore>
  isVerified: Scalars['Boolean']['output']
  logoUrl?: Maybe<Scalars['String']['output']>
  preferredDanceStyles?: Maybe<Array<Maybe<Scalars['String']['output']>>>
  preferredEventTypes?: Maybe<Array<Maybe<Scalars['String']['output']>>>
  preferredRegions?: Maybe<Array<Maybe<Scalars['String']['output']>>>
  sponsorships?: Maybe<Array<EventSponsorship>>
  subscriptions?: Maybe<Array<SponsorSubscription>>
  tier: SponsorTier
  totalDanzDistributed: Scalars['Float']['output']
  totalEventsSponsored: Scalars['Int']['output']
  totalFlowContributed: Scalars['Float']['output']
  updatedAt: Scalars['DateTime']['output']
  user?: Maybe<User>
  userId: Scalars['String']['output']
  verifiedAt?: Maybe<Scalars['DateTime']['output']>
  websiteUrl?: Maybe<Scalars['String']['output']>
}

export type SponsorAnalytics = {
  __typename?: 'SponsorAnalytics'
  brandImpressions: Scalars['Int']['output']
  costPerClick?: Maybe<Scalars['Float']['output']>
  costPerImpression?: Maybe<Scalars['Float']['output']>
  dancersReached: Scalars['Int']['output']
  eventsByDanceStyle: Array<StyleBreakdown>
  eventsByRegion: Array<RegionBreakdown>
  eventsSponsored: Scalars['Int']['output']
  spendingByCategory: Array<CategoryBreakdown>
  spendingTrend: Array<TrendDataPoint>
  totalFlowSpent: Scalars['Float']['output']
  websiteClicks: Scalars['Int']['output']
  workersSupported: Scalars['Int']['output']
}

export type SponsorCategory = {
  __typename?: 'SponsorCategory'
  description?: Maybe<Scalars['String']['output']>
  displayOrder?: Maybe<Scalars['Int']['output']>
  icon?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  slug: Scalars['String']['output']
  sponsorCount?: Maybe<Scalars['Int']['output']>
}

export type SponsorDashboard = {
  __typename?: 'SponsorDashboard'
  activeSponsorships: Array<EventSponsorship>
  pendingMatches: Array<SubscriptionAutoMatch>
  recentActivity: Array<FlowTransaction>
  sponsor: Sponsor
  stats: SponsorStats
  subscriptions: Array<SponsorSubscription>
  suggestedEvents: Array<SuggestedEvent>
}

export type SponsorImpactScore = {
  __typename?: 'SponsorImpactScore'
  grade: Scalars['String']['output']
  reachScore: Scalars['Int']['output']
  supportScore: Scalars['Int']['output']
  totalEvents: Scalars['Int']['output']
  totalInvested: Scalars['Float']['output']
  totalScore: Scalars['Int']['output']
}

export type SponsorNotificationPreferences = {
  __typename?: 'SponsorNotificationPreferences'
  digestDay: Scalars['String']['output']
  emailNewMatchingEvents: Scalars['Boolean']['output']
  emailSponsorshipUpdates: Scalars['Boolean']['output']
  emailSubscriptionBilling: Scalars['Boolean']['output']
  emailWeeklyDigest: Scalars['Boolean']['output']
  matchingEventsFrequency: Scalars['String']['output']
  pushBudgetWarnings: Scalars['Boolean']['output']
  pushNewMatchingEvents: Scalars['Boolean']['output']
  pushSponsorshipUpdates: Scalars['Boolean']['output']
}

export type SponsorNotificationPreferencesInput = {
  digestDay?: InputMaybe<Scalars['String']['input']>
  emailNewMatchingEvents?: InputMaybe<Scalars['Boolean']['input']>
  emailSponsorshipUpdates?: InputMaybe<Scalars['Boolean']['input']>
  emailSubscriptionBilling?: InputMaybe<Scalars['Boolean']['input']>
  emailWeeklyDigest?: InputMaybe<Scalars['Boolean']['input']>
  matchingEventsFrequency?: InputMaybe<Scalars['String']['input']>
  pushBudgetWarnings?: InputMaybe<Scalars['Boolean']['input']>
  pushNewMatchingEvents?: InputMaybe<Scalars['Boolean']['input']>
  pushSponsorshipUpdates?: InputMaybe<Scalars['Boolean']['input']>
}

export type SponsorStats = {
  __typename?: 'SponsorStats'
  averageEventRating?: Maybe<Scalars['Float']['output']>
  impactMetrics: ImpactMetrics
  totalEventsSponsored: Scalars['Int']['output']
  totalInvested: Scalars['Float']['output']
  totalWorkersSupported: Scalars['Int']['output']
}

export type SponsorSubscription = {
  __typename?: 'SponsorSubscription'
  autoApprove: Scalars['Boolean']['output']
  budgetAmount: Scalars['Float']['output']
  budgetRemaining: Scalars['Float']['output']
  budgetSpent: Scalars['Float']['output']
  cancelledAt?: Maybe<Scalars['DateTime']['output']>
  createdAt: Scalars['DateTime']['output']
  currentPeriodEnd?: Maybe<Scalars['DateTime']['output']>
  currentPeriodStart?: Maybe<Scalars['DateTime']['output']>
  defaultAllocationConfig?: Maybe<AllocationConfig>
  defaultVisibility: SponsorshipVisibility
  discountPercent: Scalars['Float']['output']
  eventsSponsored?: Maybe<Array<EventSponsorship>>
  id: Scalars['ID']['output']
  lastBilledAt?: Maybe<Scalars['DateTime']['output']>
  maxPerEvent?: Maybe<Scalars['Float']['output']>
  nextBillingDate?: Maybe<Scalars['DateTime']['output']>
  pendingMatches?: Maybe<Array<SubscriptionAutoMatch>>
  planType: SubscriptionPlanType
  sponsor: Sponsor
  sponsorshipMode: SponsorshipMode
  status: SubscriptionStatus
  targetCategories?: Maybe<Array<Maybe<Scalars['String']['output']>>>
  verifiedEventsOnly: Scalars['Boolean']['output']
}

export enum SponsorTier {
  Bronze = 'bronze',
  Diamond = 'diamond',
  Gold = 'gold',
  Platinum = 'platinum',
  Silver = 'silver',
}

export type SponsorshipApproval = {
  __typename?: 'SponsorshipApproval'
  autoExpired: Scalars['Boolean']['output']
  createdAt: Scalars['DateTime']['output']
  event?: Maybe<Event>
  eventId: Scalars['ID']['output']
  expiresAt: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  proposedFlowAmount: Scalars['Float']['output']
  proposedMessage?: Maybe<Scalars['String']['output']>
  proposedVisibility?: Maybe<SponsorshipVisibility>
  rejectionReason?: Maybe<Scalars['String']['output']>
  reviewedAt?: Maybe<Scalars['DateTime']['output']>
  reviewedBy?: Maybe<Scalars['String']['output']>
  sponsor?: Maybe<Sponsor>
  sponsorId: Scalars['ID']['output']
  sponsorship?: Maybe<EventSponsorship>
  status: ApprovalStatus
}

export enum SponsorshipMode {
  CategorySubscription = 'category_subscription',
  Hybrid = 'hybrid',
  SingleEvent = 'single_event',
  VerifiedOnly = 'verified_only',
}

export enum SponsorshipStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Completed = 'completed',
  Pending = 'pending',
  Refunded = 'refunded',
}

export enum SponsorshipVisibility {
  Anonymous = 'anonymous',
  Featured = 'featured',
  Visible = 'visible',
}

export type StartConversationInput = {
  /** Initial message content */
  initial_message?: InputMaybe<Scalars['String']['input']>
  /** User IDs for group conversations */
  participant_ids?: InputMaybe<Array<Scalars['String']['input']>>
  /** User ID to start conversation with (for DMs) */
  recipient_id?: InputMaybe<Scalars['String']['input']>
  /** Optional title for group conversations */
  title?: InputMaybe<Scalars['String']['input']>
}

export type StyleBreakdown = {
  __typename?: 'StyleBreakdown'
  count: Scalars['Int']['output']
  percentage: Scalars['Float']['output']
  style: Scalars['String']['output']
}

export type StyleMetric = {
  __typename?: 'StyleMetric'
  percentage: Scalars['Float']['output']
  sessions: Scalars['Int']['output']
  style: Scalars['String']['output']
}

export type SubmitFeedbackInput = {
  app_version?: InputMaybe<Scalars['String']['input']>
  device_info?: InputMaybe<Scalars['String']['input']>
  message: Scalars['String']['input']
  screenshot_url?: InputMaybe<Scalars['String']['input']>
}

export type SubmitOrganizerApplicationInput = {
  additional_info?: InputMaybe<Scalars['String']['input']>
  dance_styles?: InputMaybe<Array<Scalars['String']['input']>>
  experience?: InputMaybe<Scalars['String']['input']>
  reason: Scalars['String']['input']
  social_media?: InputMaybe<Scalars['String']['input']>
  venue_address?: InputMaybe<Scalars['String']['input']>
  venue_capacity?: InputMaybe<Scalars['Int']['input']>
  venue_city?: InputMaybe<Scalars['String']['input']>
  venue_name?: InputMaybe<Scalars['String']['input']>
  website_url?: InputMaybe<Scalars['String']['input']>
}

export type Subscription = {
  __typename?: 'Subscription'
  _empty?: Maybe<Scalars['String']['output']>
  /** Conversation updated (new participant, title change, etc) */
  conversationUpdated: Conversation
  /** New message in any of user's conversations */
  messageReceived: Message
  /** Message updated or deleted */
  messageUpdated: Message
  /** Typing indicator */
  userTyping: TypingIndicator
}

export type SubscriptionMessageUpdatedArgs = {
  conversation_id: Scalars['ID']['input']
}

export type SubscriptionUserTypingArgs = {
  conversation_id: Scalars['ID']['input']
}

export type SubscriptionAutoMatch = {
  __typename?: 'SubscriptionAutoMatch'
  createdAt: Scalars['DateTime']['output']
  event: Event
  expiresAt?: Maybe<Scalars['DateTime']['output']>
  flowAmount: Scalars['Float']['output']
  id: Scalars['ID']['output']
  matchReason: Scalars['String']['output']
  matchedCategories?: Maybe<Array<Maybe<Scalars['String']['output']>>>
  notifiedAt?: Maybe<Scalars['DateTime']['output']>
  respondedAt?: Maybe<Scalars['DateTime']['output']>
  sponsorship?: Maybe<EventSponsorship>
  status: ApprovalStatus
  subscriptionId: Scalars['ID']['output']
}

export enum SubscriptionPlanType {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export enum SubscriptionStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Expired = 'expired',
  Paused = 'paused',
}

export type SuggestedEvent = {
  __typename?: 'SuggestedEvent'
  categoryMatches: Array<Scalars['String']['output']>
  currentSponsorshipTotal?: Maybe<Scalars['Float']['output']>
  estimatedReach?: Maybe<Scalars['Int']['output']>
  event: Event
  matchReasons: Array<Scalars['String']['output']>
  matchScore: Scalars['Float']['output']
  sponsorshipGoal?: Maybe<Scalars['Float']['output']>
}

export enum SuggestionSource {
  LeaderboardProximity = 'leaderboard_proximity',
  MutualBonds = 'mutual_bonds',
  SameCity = 'same_city',
  SameEvents = 'same_events',
  SimilarStyles = 'similar_styles',
}

export type SyncWearableDataInput = {
  device_id: Scalars['String']['input']
  health_data?: InputMaybe<Array<WearableHealthDataInput>>
  motion_data?: InputMaybe<Array<WearableMotionDataInput>>
}

export type SystemHealth = {
  __typename?: 'SystemHealth'
  details?: Maybe<Scalars['JSON']['output']>
  error_message?: Maybe<Scalars['String']['output']>
  last_checked: Scalars['DateTime']['output']
  response_time_ms?: Maybe<Scalars['Int']['output']>
  service: Scalars['String']['output']
  status: Scalars['String']['output']
}

export enum TaskPriority {
  Critical = 'critical',
  High = 'high',
  Low = 'low',
  Medium = 'medium',
  NiceToHave = 'nice_to_have',
}

export type TelegramAuthInput = {
  init_data: Scalars['String']['input']
  referral_code?: InputMaybe<Scalars['String']['input']>
}

export type TelegramAuthResult = {
  __typename?: 'TelegramAuthResult'
  access_token?: Maybe<Scalars['String']['output']>
  is_new_user: Scalars['Boolean']['output']
  message?: Maybe<Scalars['String']['output']>
  success: Scalars['Boolean']['output']
  telegram_user: TelegramUser
  user?: Maybe<User>
}

export type TelegramUser = {
  __typename?: 'TelegramUser'
  danz_user?: Maybe<User>
  first_name: Scalars['String']['output']
  is_linked: Scalars['Boolean']['output']
  is_premium: Scalars['Boolean']['output']
  language_code?: Maybe<Scalars['String']['output']>
  last_name?: Maybe<Scalars['String']['output']>
  photo_url?: Maybe<Scalars['String']['output']>
  telegram_id: Scalars['String']['output']
  username?: Maybe<Scalars['String']['output']>
}

export type TierBreakdown = {
  __typename?: 'TierBreakdown'
  count: Scalars['Int']['output']
  tier: SponsorTier
}

export type TimeSeriesPoint = {
  __typename?: 'TimeSeriesPoint'
  label?: Maybe<Scalars['String']['output']>
  timestamp: Scalars['DateTime']['output']
  value: Scalars['Float']['output']
}

export type TopEarner = {
  __typename?: 'TopEarner'
  rank: Scalars['Int']['output']
  user: User
  xp_earned: Scalars['Float']['output']
}

export type TopReferrer = {
  __typename?: 'TopReferrer'
  display_name?: Maybe<Scalars['String']['output']>
  points_earned: Scalars['Int']['output']
  referral_count: Scalars['Int']['output']
  user_id: Scalars['String']['output']
  username?: Maybe<Scalars['String']['output']>
}

export type TrackReferralClickInput = {
  device_info?: InputMaybe<Scalars['JSON']['input']>
  ip_address?: InputMaybe<Scalars['String']['input']>
  referral_code: Scalars['String']['input']
  user_agent?: InputMaybe<Scalars['String']['input']>
}

export type TransactionHistory = {
  __typename?: 'TransactionHistory'
  has_more: Scalars['Boolean']['output']
  total_count: Scalars['Int']['output']
  transactions: Array<PointTransaction>
}

export enum TransactionStatus {
  Completed = 'completed',
  Failed = 'failed',
  Pending = 'pending',
  Reversed = 'reversed',
}

export enum TransactionType {
  Adjustment = 'adjustment',
  Bonus = 'bonus',
  Earn = 'earn',
  Penalty = 'penalty',
  Refund = 'refund',
  Spend = 'spend',
}

export type TrendAnalysis = {
  __typename?: 'TrendAnalysis'
  forecast_7_days?: Maybe<Scalars['Float']['output']>
  forecast_30_days?: Maybe<Scalars['Float']['output']>
  metric: Scalars['String']['output']
  seasonality?: Maybe<Scalars['String']['output']>
  trend_direction: Scalars['String']['output']
  trend_strength: Scalars['Float']['output']
}

export type TrendDataPoint = {
  __typename?: 'TrendDataPoint'
  amount: Scalars['Float']['output']
  period: Scalars['String']['output']
}

export type TrendingActivity = {
  __typename?: 'TrendingActivity'
  activity: Activity
  engagement_score: Scalars['Float']['output']
  trending_rank: Scalars['Int']['output']
}

export type TypingIndicator = {
  __typename?: 'TypingIndicator'
  conversation_id: Scalars['ID']['output']
  is_typing: Scalars['Boolean']['output']
  user: User
}

export type UnlockedAchievement = {
  __typename?: 'UnlockedAchievement'
  achievement: AchievementDetails
  is_new: Scalars['Boolean']['output']
}

export type UpdateChangelogEntryInput = {
  category?: InputMaybe<ChangelogCategory>
  description?: InputMaybe<Scalars['String']['input']>
  feature_request_id?: InputMaybe<Scalars['String']['input']>
  github_commit_sha?: InputMaybe<Scalars['String']['input']>
  github_pr_url?: InputMaybe<Scalars['String']['input']>
  is_highlighted?: InputMaybe<Scalars['Boolean']['input']>
  is_public?: InputMaybe<Scalars['Boolean']['input']>
  project_id?: InputMaybe<Scalars['ID']['input']>
  title?: InputMaybe<Scalars['String']['input']>
  version?: InputMaybe<Scalars['String']['input']>
}

export type UpdateConversationInput = {
  is_archived?: InputMaybe<Scalars['Boolean']['input']>
  is_muted?: InputMaybe<Scalars['Boolean']['input']>
  nickname?: InputMaybe<Scalars['String']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type UpdateDevTaskInput = {
  actual_hours?: InputMaybe<Scalars['Int']['input']>
  assigned_to?: InputMaybe<Scalars['String']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  due_date?: InputMaybe<Scalars['String']['input']>
  estimated_hours?: InputMaybe<Scalars['Int']['input']>
  github_issue_url?: InputMaybe<Scalars['String']['input']>
  github_pr_url?: InputMaybe<Scalars['String']['input']>
  priority?: InputMaybe<TaskPriority>
  project_id?: InputMaybe<Scalars['ID']['input']>
  sprint?: InputMaybe<Scalars['String']['input']>
  status?: InputMaybe<DevTaskStatus>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  task_type?: InputMaybe<DevTaskType>
  title?: InputMaybe<Scalars['String']['input']>
}

export type UpdateEventGigInput = {
  approvalMode?: InputMaybe<GigApprovalMode>
  bonusDanz?: InputMaybe<Scalars['Float']['input']>
  danzReward?: InputMaybe<Scalars['Float']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  gigSource?: InputMaybe<GigSource>
  localRadiusKm?: InputMaybe<Scalars['Int']['input']>
  requiresLocal?: InputMaybe<Scalars['Boolean']['input']>
  slotsAvailable?: InputMaybe<Scalars['Int']['input']>
  specificRequirements?: InputMaybe<Scalars['String']['input']>
  status?: InputMaybe<EventGigStatus>
  timeCommitment?: InputMaybe<Scalars['String']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type UpdateEventInput = {
  allow_sponsors?: InputMaybe<Scalars['Boolean']['input']>
  category?: InputMaybe<EventCategory>
  currency?: InputMaybe<Scalars['String']['input']>
  dance_styles?: InputMaybe<Array<Scalars['String']['input']>>
  description?: InputMaybe<Scalars['String']['input']>
  end_date_time?: InputMaybe<Scalars['DateTime']['input']>
  image_url?: InputMaybe<Scalars['String']['input']>
  is_featured?: InputMaybe<Scalars['Boolean']['input']>
  is_public?: InputMaybe<Scalars['Boolean']['input']>
  is_recurring?: InputMaybe<Scalars['Boolean']['input']>
  is_virtual?: InputMaybe<Scalars['Boolean']['input']>
  location_address?: InputMaybe<Scalars['String']['input']>
  location_city?: InputMaybe<Scalars['String']['input']>
  location_latitude?: InputMaybe<Scalars['Float']['input']>
  location_longitude?: InputMaybe<Scalars['Float']['input']>
  location_name?: InputMaybe<Scalars['String']['input']>
  max_capacity?: InputMaybe<Scalars['Int']['input']>
  price_danz?: InputMaybe<Scalars['Float']['input']>
  price_usd?: InputMaybe<Scalars['Float']['input']>
  recurrence_count?: InputMaybe<Scalars['Int']['input']>
  recurrence_days?: InputMaybe<Array<Scalars['String']['input']>>
  recurrence_end_date?: InputMaybe<Scalars['DateTime']['input']>
  recurrence_type?: InputMaybe<RecurrenceType>
  requirements?: InputMaybe<Scalars['String']['input']>
  skill_level?: InputMaybe<SkillLevel>
  sponsor_benefits?: InputMaybe<Scalars['String']['input']>
  sponsor_contact_email?: InputMaybe<Scalars['String']['input']>
  sponsor_tier_config?: InputMaybe<Scalars['JSON']['input']>
  start_date_time?: InputMaybe<Scalars['DateTime']['input']>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  title?: InputMaybe<Scalars['String']['input']>
  virtual_link?: InputMaybe<Scalars['String']['input']>
}

export type UpdateEventManagerInput = {
  can_edit_details?: InputMaybe<Scalars['Boolean']['input']>
  can_invite_managers?: InputMaybe<Scalars['Boolean']['input']>
  can_manage_posts?: InputMaybe<Scalars['Boolean']['input']>
  can_manage_registrations?: InputMaybe<Scalars['Boolean']['input']>
  can_send_broadcasts?: InputMaybe<Scalars['Boolean']['input']>
  manager_id: Scalars['ID']['input']
  role?: InputMaybe<EventManagerRole>
}

export type UpdateFeatureInventoryInput = {
  actual_hours?: InputMaybe<Scalars['Int']['input']>
  api_docs_url?: InputMaybe<Scalars['String']['input']>
  backend_status?: InputMaybe<ComponentStatus>
  category?: InputMaybe<FeatureInventoryCategory>
  completion_percentage?: InputMaybe<Scalars['Int']['input']>
  database_status?: InputMaybe<ComponentStatus>
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>
  description?: InputMaybe<Scalars['String']['input']>
  estimated_hours?: InputMaybe<Scalars['Int']['input']>
  frontend_status?: InputMaybe<ComponentStatus>
  is_miniapp_ready?: InputMaybe<Scalars['Boolean']['input']>
  miniapp_api_available?: InputMaybe<Scalars['Boolean']['input']>
  name?: InputMaybe<Scalars['String']['input']>
  notes?: InputMaybe<Scalars['String']['input']>
  priority?: InputMaybe<TaskPriority>
  project_id?: InputMaybe<Scalars['ID']['input']>
  related_files?: InputMaybe<Array<Scalars['String']['input']>>
  status?: InputMaybe<FeatureImplementationStatus>
  target_version?: InputMaybe<Scalars['String']['input']>
}

export type UpdateFeatureRequestInput = {
  actual_hours?: InputMaybe<Scalars['Int']['input']>
  assigned_to?: InputMaybe<Scalars['String']['input']>
  category?: InputMaybe<FeatureRequestCategory>
  description?: InputMaybe<Scalars['String']['input']>
  estimated_hours?: InputMaybe<Scalars['Int']['input']>
  github_issue_url?: InputMaybe<Scalars['String']['input']>
  github_pr_url?: InputMaybe<Scalars['String']['input']>
  priority?: InputMaybe<TaskPriority>
  project_id?: InputMaybe<Scalars['ID']['input']>
  status?: InputMaybe<FeatureRequestStatus>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  target_version?: InputMaybe<Scalars['String']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type UpdateFeedbackStatusInput = {
  admin_notes?: InputMaybe<Scalars['String']['input']>
  feedback_id: Scalars['ID']['input']
  status: FeedbackStatus
}

export type UpdateGigRoleApplicationInput = {
  certifications?: InputMaybe<Array<Scalars['String']['input']>>
  experienceNotes?: InputMaybe<Scalars['String']['input']>
  portfolioUrls?: InputMaybe<Array<Scalars['String']['input']>>
}

export type UpdateMessageInput = {
  content: Scalars['String']['input']
}

export type UpdateNotificationPreferencesInput = {
  achievements?: InputMaybe<Scalars['Boolean']['input']>
  admin_broadcasts?: InputMaybe<Scalars['Boolean']['input']>
  dance_bonds?: InputMaybe<Scalars['Boolean']['input']>
  email_notifications?: InputMaybe<Scalars['Boolean']['input']>
  event_manager_broadcasts?: InputMaybe<Scalars['Boolean']['input']>
  event_updates?: InputMaybe<Scalars['Boolean']['input']>
  gig_application_updates?: InputMaybe<Scalars['Boolean']['input']>
  gig_opportunities?: InputMaybe<Scalars['Boolean']['input']>
  gig_reminders?: InputMaybe<Scalars['Boolean']['input']>
  gig_role_updates?: InputMaybe<Scalars['Boolean']['input']>
  post_interactions?: InputMaybe<Scalars['Boolean']['input']>
  push_notifications?: InputMaybe<Scalars['Boolean']['input']>
  quiet_hours_enabled?: InputMaybe<Scalars['Boolean']['input']>
  quiet_hours_end?: InputMaybe<Scalars['String']['input']>
  quiet_hours_start?: InputMaybe<Scalars['String']['input']>
}

export type UpdatePointActionInput = {
  action_key: Scalars['String']['input']
  action_name?: InputMaybe<Scalars['String']['input']>
  category?: InputMaybe<PointActionCategory>
  description?: InputMaybe<Scalars['String']['input']>
  is_active?: InputMaybe<Scalars['Boolean']['input']>
  max_per_day?: InputMaybe<Scalars['Int']['input']>
  max_per_month?: InputMaybe<Scalars['Int']['input']>
  max_per_week?: InputMaybe<Scalars['Int']['input']>
  points_value?: InputMaybe<Scalars['Int']['input']>
  requires_verification?: InputMaybe<Scalars['Boolean']['input']>
}

export type UpdatePostInput = {
  content?: InputMaybe<Scalars['String']['input']>
  is_public?: InputMaybe<Scalars['Boolean']['input']>
  location?: InputMaybe<Scalars['String']['input']>
  media_type?: InputMaybe<MediaType>
  media_url?: InputMaybe<Scalars['String']['input']>
}

export type UpdatePrivacySettingsInput = {
  allow_bond_requests?: InputMaybe<AllowBondRequestsFrom>
  allow_event_invites?: InputMaybe<Scalars['Boolean']['input']>
  allow_messages?: InputMaybe<AllowMessagesFrom>
  appear_in_event_attendees?: InputMaybe<Scalars['Boolean']['input']>
  appear_in_nearby?: InputMaybe<Scalars['Boolean']['input']>
  appear_in_suggestions?: InputMaybe<Scalars['Boolean']['input']>
  notify_bonds_on_achievement?: InputMaybe<Scalars['Boolean']['input']>
  notify_bonds_on_check_in?: InputMaybe<Scalars['Boolean']['input']>
  profile_visibility?: InputMaybe<ProfileVisibility>
  searchable_by_username?: InputMaybe<Scalars['Boolean']['input']>
  show_avatar?: InputMaybe<Scalars['Boolean']['input']>
  show_badges?: InputMaybe<Scalars['Boolean']['input']>
  show_bio?: InputMaybe<Scalars['Boolean']['input']>
  show_check_ins?: InputMaybe<Scalars['Boolean']['input']>
  show_city?: InputMaybe<Scalars['Boolean']['input']>
  show_comments?: InputMaybe<Scalars['Boolean']['input']>
  show_dance_styles?: InputMaybe<Scalars['Boolean']['input']>
  show_events_attended?: InputMaybe<Scalars['Boolean']['input']>
  show_events_attending?: InputMaybe<Scalars['Boolean']['input']>
  show_leaderboard_rank?: InputMaybe<Scalars['Boolean']['input']>
  show_likes?: InputMaybe<Scalars['Boolean']['input']>
  show_posts?: InputMaybe<Scalars['Boolean']['input']>
  show_real_name?: InputMaybe<Scalars['Boolean']['input']>
  show_stats?: InputMaybe<Scalars['Boolean']['input']>
}

export type UpdateProfileInput = {
  age?: InputMaybe<Scalars['Int']['input']>
  allow_messages?: InputMaybe<Scalars['Boolean']['input']>
  avatar_url?: InputMaybe<Scalars['String']['input']>
  bio?: InputMaybe<Scalars['String']['input']>
  city?: InputMaybe<Scalars['String']['input']>
  company_name?: InputMaybe<Scalars['String']['input']>
  cover_image_url?: InputMaybe<Scalars['String']['input']>
  dance_styles?: InputMaybe<Array<Scalars['String']['input']>>
  display_name?: InputMaybe<Scalars['String']['input']>
  event_types?: InputMaybe<Array<Scalars['String']['input']>>
  favorite_music?: InputMaybe<Array<Scalars['String']['input']>>
  instagram?: InputMaybe<Scalars['String']['input']>
  invited_by?: InputMaybe<Scalars['String']['input']>
  is_public?: InputMaybe<Scalars['Boolean']['input']>
  latitude?: InputMaybe<Scalars['Float']['input']>
  location?: InputMaybe<Scalars['String']['input']>
  longitude?: InputMaybe<Scalars['Float']['input']>
  notification_preferences?: InputMaybe<Scalars['JSON']['input']>
  organizer_bio?: InputMaybe<Scalars['String']['input']>
  pronouns?: InputMaybe<Scalars['String']['input']>
  show_location?: InputMaybe<Scalars['Boolean']['input']>
  skill_level?: InputMaybe<SkillLevel>
  social_media_links?: InputMaybe<Scalars['JSON']['input']>
  tiktok?: InputMaybe<Scalars['String']['input']>
  twitter?: InputMaybe<Scalars['String']['input']>
  username?: InputMaybe<Scalars['String']['input']>
  website?: InputMaybe<Scalars['String']['input']>
  website_url?: InputMaybe<Scalars['String']['input']>
  youtube?: InputMaybe<Scalars['String']['input']>
}

export type UpdateProjectInput = {
  color?: InputMaybe<Scalars['String']['input']>
  default_branch?: InputMaybe<Scalars['String']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  display_order?: InputMaybe<Scalars['Int']['input']>
  github_org?: InputMaybe<Scalars['String']['input']>
  github_repo?: InputMaybe<Scalars['String']['input']>
  icon?: InputMaybe<Scalars['String']['input']>
  is_active?: InputMaybe<Scalars['Boolean']['input']>
  is_archived?: InputMaybe<Scalars['Boolean']['input']>
  name?: InputMaybe<Scalars['String']['input']>
  platform?: InputMaybe<ProjectPlatform>
  project_type?: InputMaybe<ProjectType>
  tech_stack?: InputMaybe<Array<Scalars['String']['input']>>
}

export type UpdateSponsorInput = {
  categories?: InputMaybe<Array<Scalars['String']['input']>>
  companyDescription?: InputMaybe<Scalars['String']['input']>
  companyName?: InputMaybe<Scalars['String']['input']>
  contactEmail?: InputMaybe<Scalars['String']['input']>
  contactPhone?: InputMaybe<Scalars['String']['input']>
  logoUrl?: InputMaybe<Scalars['String']['input']>
  preferredDanceStyles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  preferredEventTypes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  preferredRegions?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  websiteUrl?: InputMaybe<Scalars['String']['input']>
}

export type UpdateSponsorshipInput = {
  allocationConfig?: InputMaybe<AllocationConfigInput>
  sponsorMessage?: InputMaybe<Scalars['String']['input']>
  visibility?: InputMaybe<SponsorshipVisibility>
}

export type UpdateSubscriptionInput = {
  autoApprove?: InputMaybe<Scalars['Boolean']['input']>
  budgetAmount?: InputMaybe<Scalars['Float']['input']>
  defaultAllocationConfig?: InputMaybe<AllocationConfigInput>
  defaultVisibility?: InputMaybe<SponsorshipVisibility>
  maxPerEvent?: InputMaybe<Scalars['Float']['input']>
  targetCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>
  verifiedEventsOnly?: InputMaybe<Scalars['Boolean']['input']>
}

export type UpdateUserPreferencesInput = {
  daily_reminder_enabled?: InputMaybe<Scalars['Boolean']['input']>
  daily_reminder_time?: InputMaybe<Scalars['String']['input']>
  live_sessions_enabled?: InputMaybe<Scalars['Boolean']['input']>
}

export enum UploadType {
  Avatar = 'avatar',
  Cover = 'cover',
  Event = 'event',
  General = 'general',
  Post = 'post',
}

export type UploadUrl = {
  __typename?: 'UploadUrl'
  expires: Scalars['Int']['output']
  fields: Scalars['JSON']['output']
  key: Scalars['String']['output']
  maxSize: Scalars['Int']['output']
  publicUrl: Scalars['String']['output']
  success: Scalars['Boolean']['output']
  uploadUrl: Scalars['String']['output']
}

export type User = {
  __typename?: 'User'
  achievements?: Maybe<Array<Achievement>>
  age?: Maybe<Scalars['Int']['output']>
  allow_messages?: Maybe<Scalars['Boolean']['output']>
  avatar_url?: Maybe<Scalars['String']['output']>
  bio?: Maybe<Scalars['String']['output']>
  city?: Maybe<Scalars['String']['output']>
  company_name?: Maybe<Scalars['String']['output']>
  cover_image_url?: Maybe<Scalars['String']['output']>
  created_at?: Maybe<Scalars['DateTime']['output']>
  dance_bonds_count?: Maybe<Scalars['Int']['output']>
  dance_styles?: Maybe<Array<Scalars['String']['output']>>
  display_name?: Maybe<Scalars['String']['output']>
  event_types?: Maybe<Array<Scalars['String']['output']>>
  favorite_music?: Maybe<Array<Scalars['String']['output']>>
  gig_manager_approved_at?: Maybe<Scalars['DateTime']['output']>
  gig_manager_approved_by?: Maybe<Scalars['String']['output']>
  instagram?: Maybe<Scalars['String']['output']>
  invited_by?: Maybe<Scalars['String']['output']>
  is_admin?: Maybe<Scalars['Boolean']['output']>
  is_gig_manager?: Maybe<Scalars['Boolean']['output']>
  is_organizer_approved?: Maybe<Scalars['Boolean']['output']>
  is_premium?: Maybe<Scalars['String']['output']>
  is_public?: Maybe<Scalars['Boolean']['output']>
  last_active_at?: Maybe<Scalars['DateTime']['output']>
  latitude?: Maybe<Scalars['Float']['output']>
  level?: Maybe<Scalars['Int']['output']>
  location?: Maybe<Scalars['String']['output']>
  longest_streak?: Maybe<Scalars['Int']['output']>
  longitude?: Maybe<Scalars['Float']['output']>
  notification_preferences?: Maybe<Scalars['JSON']['output']>
  organizer_approved_at?: Maybe<Scalars['DateTime']['output']>
  organizer_approved_by?: Maybe<Scalars['String']['output']>
  organizer_bio?: Maybe<Scalars['String']['output']>
  organizer_rejection_reason?: Maybe<Scalars['String']['output']>
  organizer_requested_at?: Maybe<Scalars['DateTime']['output']>
  privy_id: Scalars['String']['output']
  pronouns?: Maybe<Scalars['String']['output']>
  referral_count?: Maybe<Scalars['Int']['output']>
  referral_points_earned?: Maybe<Scalars['Int']['output']>
  role?: Maybe<UserRole>
  show_location?: Maybe<Scalars['Boolean']['output']>
  skill_level?: Maybe<SkillLevel>
  social_media_links?: Maybe<Scalars['JSON']['output']>
  stripe_customer_id?: Maybe<Scalars['String']['output']>
  stripe_subscription_id?: Maybe<Scalars['String']['output']>
  subscription_cancelled_at?: Maybe<Scalars['DateTime']['output']>
  subscription_end_date?: Maybe<Scalars['DateTime']['output']>
  subscription_plan?: Maybe<Scalars['String']['output']>
  subscription_start_date?: Maybe<Scalars['DateTime']['output']>
  subscription_status?: Maybe<Scalars['String']['output']>
  subscription_tier?: Maybe<Scalars['String']['output']>
  tiktok?: Maybe<Scalars['String']['output']>
  total_achievements?: Maybe<Scalars['Int']['output']>
  total_dance_time?: Maybe<Scalars['Int']['output']>
  total_events_attended?: Maybe<Scalars['Int']['output']>
  total_events_created?: Maybe<Scalars['Int']['output']>
  total_sessions?: Maybe<Scalars['Int']['output']>
  twitter?: Maybe<Scalars['String']['output']>
  upcoming_events_count?: Maybe<Scalars['Int']['output']>
  updated_at?: Maybe<Scalars['DateTime']['output']>
  username?: Maybe<Scalars['String']['output']>
  website?: Maybe<Scalars['String']['output']>
  website_url?: Maybe<Scalars['String']['output']>
  xp?: Maybe<Scalars['Int']['output']>
  youtube?: Maybe<Scalars['String']['output']>
}

export type UserAnalytics = {
  __typename?: 'UserAnalytics'
  active_users: ActiveUsersMetrics
  demographics: DemographicsMetrics
  engagement: EngagementMetrics
  new_users: NewUsersMetrics
  retention: RetentionMetrics
  total_users: Scalars['Int']['output']
}

export type UserBlock = {
  __typename?: 'UserBlock'
  blocked_user: User
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  reason?: Maybe<Scalars['String']['output']>
}

export type UserChallenge = {
  __typename?: 'UserChallenge'
  challenge: Challenge
  challenge_id: Scalars['String']['output']
  claimed_at?: Maybe<Scalars['DateTime']['output']>
  completed_at?: Maybe<Scalars['DateTime']['output']>
  completion_count: Scalars['Int']['output']
  created_at: Scalars['DateTime']['output']
  expires_at?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  progress: Scalars['Int']['output']
  started_at: Scalars['DateTime']['output']
  status: ChallengeStatus
  updated_at: Scalars['DateTime']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

export type UserConnection = {
  __typename?: 'UserConnection'
  pageInfo: PageInfo
  totalCount: Scalars['Int']['output']
  users: Array<User>
}

export type UserFilterInput = {
  city?: InputMaybe<Scalars['String']['input']>
  dance_style?: InputMaybe<Scalars['String']['input']>
  is_organizer_approved?: InputMaybe<Scalars['Boolean']['input']>
  role?: InputMaybe<UserRole>
  skill_level?: InputMaybe<SkillLevel>
}

export type UserFlowBalance = {
  __typename?: 'UserFlowBalance'
  availableBalance: Scalars['Float']['output']
  pendingBalance: Scalars['Float']['output']
  totalEarned: Scalars['Float']['output']
  totalEventsWorked: Scalars['Int']['output']
  totalGigsCompleted: Scalars['Int']['output']
  totalWithdrawn: Scalars['Float']['output']
  userId: Scalars['String']['output']
}

export type UserGigRole = {
  __typename?: 'UserGigRole'
  certifications?: Maybe<Array<Scalars['String']['output']>>
  createdAt: Scalars['DateTime']['output']
  experienceNotes?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  portfolioUrls?: Maybe<Array<Scalars['String']['output']>>
  rating: Scalars['Float']['output']
  role: GigRole
  roleId: Scalars['ID']['output']
  status: UserGigRoleStatus
  totalDanzEarned: Scalars['Float']['output']
  totalGigsCompleted: Scalars['Int']['output']
  updatedAt: Scalars['DateTime']['output']
  user?: Maybe<User>
  userId: Scalars['String']['output']
  verifiedAt?: Maybe<Scalars['DateTime']['output']>
  verifiedBy?: Maybe<Scalars['String']['output']>
}

export enum UserGigRoleStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Rejected = 'REJECTED',
  Suspended = 'SUSPENDED',
}

export type UserPointsSummary = {
  __typename?: 'UserPointsSummary'
  current_points_balance: Scalars['Int']['output']
  last_transaction_at?: Maybe<Scalars['DateTime']['output']>
  level: Scalars['Int']['output']
  points_last_week: Scalars['Int']['output']
  privy_id: Scalars['String']['output']
  total_points_earned: Scalars['Int']['output']
  total_points_spent: Scalars['Int']['output']
  total_transactions: Scalars['Int']['output']
  transactions_last_week: Scalars['Int']['output']
  unique_actions: Scalars['Int']['output']
  username?: Maybe<Scalars['String']['output']>
  xp: Scalars['Int']['output']
}

export type UserPreferences = {
  __typename?: 'UserPreferences'
  daily_reminder_enabled: Scalars['Boolean']['output']
  daily_reminder_time: Scalars['String']['output']
  live_sessions_enabled: Scalars['Boolean']['output']
}

export type UserReferralInfo = {
  __typename?: 'UserReferralInfo'
  avatar_url?: Maybe<Scalars['String']['output']>
  created_at: Scalars['DateTime']['output']
  display_name?: Maybe<Scalars['String']['output']>
  invited_by?: Maybe<Scalars['String']['output']>
  privy_id: Scalars['String']['output']
  username?: Maybe<Scalars['String']['output']>
}

export enum UserRole {
  Admin = 'admin',
  Dev = 'dev',
  Manager = 'manager',
  Organizer = 'organizer',
  User = 'user',
}

export type UserSearchConnection = {
  __typename?: 'UserSearchConnection'
  has_more: Scalars['Boolean']['output']
  results: Array<UserSearchResult>
  total_count: Scalars['Int']['output']
}

/** Search result with privacy-aware user info */
export type UserSearchResult = {
  __typename?: 'UserSearchResult'
  /** Whether you can message them */
  can_message: Scalars['Boolean']['output']
  /** Whether you can see their full profile */
  can_view_profile: Scalars['Boolean']['output']
  /** Whether you have a bond */
  is_bond: Scalars['Boolean']['output']
  /** Mutual bonds count */
  mutual_bonds_count: Scalars['Int']['output']
  user: User
}

export type UserStats = {
  __typename?: 'UserStats'
  current_points_balance: Scalars['Int']['output']
  current_streak: Scalars['Int']['output']
  longest_streak: Scalars['Int']['output']
  points_earned: Scalars['Int']['output']
  referral_points_earned: Scalars['Int']['output']
  total_comments_made: Scalars['Int']['output']
  total_dance_bonds: Scalars['Int']['output']
  total_events_attended: Scalars['Int']['output']
  total_events_hosted: Scalars['Int']['output']
  total_likes_given: Scalars['Int']['output']
  total_likes_received: Scalars['Int']['output']
  total_posts_created: Scalars['Int']['output']
}

/** User suggestion with reason and score */
export type UserSuggestion = {
  __typename?: 'UserSuggestion'
  created_at: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  reason: Scalars['String']['output']
  score: Scalars['Float']['output']
  source: SuggestionSource
  user: User
}

export type UserSuggestionConnection = {
  __typename?: 'UserSuggestionConnection'
  has_more: Scalars['Boolean']['output']
  suggestions: Array<UserSuggestion>
  total_count: Scalars['Int']['output']
}

/** User's username change eligibility and history */
export type UsernameChangeEligibility = {
  __typename?: 'UsernameChangeEligibility'
  can_request: Scalars['Boolean']['output']
  change_count: Scalars['Int']['output']
  cooldown_ends_at?: Maybe<Scalars['DateTime']['output']>
  is_first_change: Scalars['Boolean']['output']
  last_change_at?: Maybe<Scalars['DateTime']['output']>
  message?: Maybe<Scalars['String']['output']>
  pending_request?: Maybe<UsernameChangeRequest>
  will_auto_approve: Scalars['Boolean']['output']
}

/** A request to change a user's username */
export type UsernameChangeRequest = {
  __typename?: 'UsernameChangeRequest'
  admin_note?: Maybe<Scalars['String']['output']>
  created_at: Scalars['DateTime']['output']
  current_username: Scalars['String']['output']
  id: Scalars['ID']['output']
  reason?: Maybe<Scalars['String']['output']>
  requested_username: Scalars['String']['output']
  reviewed_at?: Maybe<Scalars['DateTime']['output']>
  reviewed_by?: Maybe<Scalars['String']['output']>
  reviewer?: Maybe<User>
  status: UsernameChangeStatus
  updated_at: Scalars['DateTime']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

/** Admin view of pending username change requests */
export type UsernameChangeRequestConnection = {
  __typename?: 'UsernameChangeRequestConnection'
  pageInfo: PageInfo
  requests: Array<UsernameChangeRequest>
  totalCount: Scalars['Int']['output']
}

/** Result of a username change request submission */
export type UsernameChangeResult = {
  __typename?: 'UsernameChangeResult'
  auto_approved: Scalars['Boolean']['output']
  message: Scalars['String']['output']
  request?: Maybe<UsernameChangeRequest>
  success: Scalars['Boolean']['output']
}

/** Status of a username change request */
export enum UsernameChangeStatus {
  Approved = 'approved',
  AutoApproved = 'auto_approved',
  Pending = 'pending',
  Rejected = 'rejected',
}

export type VerificationCriteria = {
  __typename?: 'VerificationCriteria'
  attendeesNeeded: Scalars['Int']['output']
  averageRating: Scalars['Float']['output']
  eventsNeeded: Scalars['Int']['output']
  meetsCriteria: Scalars['Boolean']['output']
  ratingNeeded: Scalars['Float']['output']
  totalAttendees: Scalars['Int']['output']
  totalEvents: Scalars['Int']['output']
}

export type VerifiedEventCreator = {
  __typename?: 'VerifiedEventCreator'
  autoVerified: Scalars['Boolean']['output']
  averageEventRating: Scalars['Float']['output']
  id: Scalars['ID']['output']
  isVerified: Scalars['Boolean']['output']
  totalAttendeesServed: Scalars['Int']['output']
  totalEventsHosted: Scalars['Int']['output']
  user?: Maybe<User>
  userId: Scalars['String']['output']
  verificationNotes?: Maybe<Scalars['String']['output']>
  verificationType?: Maybe<Scalars['String']['output']>
  verifiedAt?: Maybe<Scalars['DateTime']['output']>
}

export type VerifyAttendanceInput = {
  attendance_id: Scalars['ID']['input']
  points_awarded: Scalars['Int']['input']
}

export type VolunteerRewardInput = {
  amount: Scalars['Float']['input']
  eventId: Scalars['ID']['input']
  reason: Scalars['String']['input']
  userId: Scalars['String']['input']
}

export type WearableDevice = {
  __typename?: 'WearableDevice'
  capabilities: Array<Scalars['String']['output']>
  created_at: Scalars['DateTime']['output']
  device_model?: Maybe<Scalars['String']['output']>
  device_name?: Maybe<Scalars['String']['output']>
  device_type: WearableDeviceType
  firmware_version?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  is_primary: Scalars['Boolean']['output']
  last_sync_at?: Maybe<Scalars['DateTime']['output']>
  sync_status: WearableSyncStatus
  updated_at: Scalars['DateTime']['output']
  user?: Maybe<User>
  user_id: Scalars['String']['output']
}

export enum WearableDeviceType {
  AppleWatch = 'APPLE_WATCH',
  Fitbit = 'FITBIT',
  GalaxyWatch = 'GALAXY_WATCH',
  Garmin = 'GARMIN',
  Other = 'OTHER',
  Oura = 'OURA',
  Whoop = 'WHOOP',
  Xiaomi = 'XIAOMI',
}

export type WearableHealthData = {
  __typename?: 'WearableHealthData'
  active_minutes?: Maybe<Scalars['Int']['output']>
  blood_oxygen?: Maybe<Scalars['Float']['output']>
  body_temperature?: Maybe<Scalars['Float']['output']>
  calories_active?: Maybe<Scalars['Int']['output']>
  calories_total?: Maybe<Scalars['Int']['output']>
  created_at: Scalars['DateTime']['output']
  device?: Maybe<WearableDevice>
  device_id: Scalars['String']['output']
  distance_meters?: Maybe<Scalars['Float']['output']>
  floors_climbed?: Maybe<Scalars['Int']['output']>
  heart_rate?: Maybe<Scalars['Int']['output']>
  heart_rate_variability?: Maybe<Scalars['Float']['output']>
  id: Scalars['ID']['output']
  raw_data?: Maybe<Scalars['JSON']['output']>
  recorded_at: Scalars['DateTime']['output']
  sleep_duration_minutes?: Maybe<Scalars['Int']['output']>
  sleep_quality_score?: Maybe<Scalars['Float']['output']>
  steps?: Maybe<Scalars['Int']['output']>
  stress_level?: Maybe<Scalars['Int']['output']>
  user_id: Scalars['String']['output']
}

export type WearableHealthDataInput = {
  active_minutes?: InputMaybe<Scalars['Int']['input']>
  blood_oxygen?: InputMaybe<Scalars['Float']['input']>
  body_temperature?: InputMaybe<Scalars['Float']['input']>
  calories_active?: InputMaybe<Scalars['Int']['input']>
  calories_total?: InputMaybe<Scalars['Int']['input']>
  device_id: Scalars['String']['input']
  distance_meters?: InputMaybe<Scalars['Float']['input']>
  floors_climbed?: InputMaybe<Scalars['Int']['input']>
  heart_rate?: InputMaybe<Scalars['Int']['input']>
  heart_rate_variability?: InputMaybe<Scalars['Float']['input']>
  raw_data?: InputMaybe<Scalars['JSON']['input']>
  recorded_at: Scalars['DateTime']['input']
  sleep_duration_minutes?: InputMaybe<Scalars['Int']['input']>
  sleep_quality_score?: InputMaybe<Scalars['Float']['input']>
  steps?: InputMaybe<Scalars['Int']['input']>
  stress_level?: InputMaybe<Scalars['Int']['input']>
}

export type WearableMotionData = {
  __typename?: 'WearableMotionData'
  accelerometer_x?: Maybe<Scalars['Float']['output']>
  accelerometer_y?: Maybe<Scalars['Float']['output']>
  accelerometer_z?: Maybe<Scalars['Float']['output']>
  bpm_detected?: Maybe<Scalars['Int']['output']>
  created_at: Scalars['DateTime']['output']
  dance_session?: Maybe<DanceSession>
  dance_session_id?: Maybe<Scalars['String']['output']>
  device?: Maybe<WearableDevice>
  device_id: Scalars['String']['output']
  gyroscope_x?: Maybe<Scalars['Float']['output']>
  gyroscope_y?: Maybe<Scalars['Float']['output']>
  gyroscope_z?: Maybe<Scalars['Float']['output']>
  id: Scalars['ID']['output']
  motion_intensity?: Maybe<Scalars['Float']['output']>
  movement_type?: Maybe<Scalars['String']['output']>
  recorded_at: Scalars['DateTime']['output']
  rhythm_accuracy?: Maybe<Scalars['Float']['output']>
  user_id: Scalars['String']['output']
}

export type WearableMotionDataInput = {
  accelerometer_x?: InputMaybe<Scalars['Float']['input']>
  accelerometer_y?: InputMaybe<Scalars['Float']['input']>
  accelerometer_z?: InputMaybe<Scalars['Float']['input']>
  bpm_detected?: InputMaybe<Scalars['Int']['input']>
  dance_session_id?: InputMaybe<Scalars['String']['input']>
  device_id: Scalars['String']['input']
  gyroscope_x?: InputMaybe<Scalars['Float']['input']>
  gyroscope_y?: InputMaybe<Scalars['Float']['input']>
  gyroscope_z?: InputMaybe<Scalars['Float']['input']>
  motion_intensity?: InputMaybe<Scalars['Float']['input']>
  movement_type?: InputMaybe<Scalars['String']['input']>
  recorded_at: Scalars['DateTime']['input']
  rhythm_accuracy?: InputMaybe<Scalars['Float']['input']>
}

export type WearableStats = {
  __typename?: 'WearableStats'
  average_heart_rate?: Maybe<Scalars['Float']['output']>
  average_steps_daily?: Maybe<Scalars['Float']['output']>
  device_id: Scalars['String']['output']
  last_7_days_activity: Array<DailyWearableActivity>
  total_active_minutes: Scalars['Int']['output']
  total_health_records: Scalars['Int']['output']
  total_motion_records: Scalars['Int']['output']
  total_syncs: Scalars['Int']['output']
}

export type WearableSyncResult = {
  __typename?: 'WearableSyncResult'
  errors?: Maybe<Array<Scalars['String']['output']>>
  failed_records: Scalars['Int']['output']
  last_sync_at?: Maybe<Scalars['DateTime']['output']>
  success: Scalars['Boolean']['output']
  synced_records: Scalars['Int']['output']
}

export enum WearableSyncStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Syncing = 'SYNCING',
}

export type XpDistribution = {
  __typename?: 'XPDistribution'
  amount: Scalars['Float']['output']
  percentage: Scalars['Float']['output']
  source: Scalars['String']['output']
}

export type EventBasicInfoFragment = {
  __typename?: 'Event'
  id: string
  title: string
  description?: string | null
  category?: EventCategory | null
  image_url?: string | null
  location_name: string
  location_address?: string | null
  location_city?: string | null
  location_latitude?: number | null
  location_longitude?: number | null
  start_date_time: any
  end_date_time: any
  price_usd?: number | null
  price_danz?: number | null
  skill_level?: SkillLevel | null
  is_virtual?: boolean | null
  is_featured?: boolean | null
  status?: EventStatus | null
  registration_count?: number | null
  is_recurring?: boolean | null
  recurrence_type?: RecurrenceType | null
}

export type EventFullInfoFragment = {
  __typename?: 'Event'
  id: string
  title: string
  description?: string | null
  category?: EventCategory | null
  image_url?: string | null
  location_name: string
  location_address?: string | null
  location_city?: string | null
  location_latitude?: number | null
  location_longitude?: number | null
  facilitator_id?: string | null
  max_capacity?: number | null
  current_capacity?: number | null
  price_usd?: number | null
  price_danz?: number | null
  is_featured?: boolean | null
  skill_level?: SkillLevel | null
  is_virtual?: boolean | null
  virtual_link?: string | null
  requirements?: string | null
  tags?: Array<string> | null
  dance_styles?: Array<string> | null
  currency?: string | null
  start_date_time: any
  end_date_time: any
  created_at: any
  updated_at: any
  status?: EventStatus | null
  is_registered?: boolean | null
  user_registration_status?: RegistrationStatus | null
  distance?: number | null
  registration_count?: number | null
  is_recurring?: boolean | null
  recurrence_type?: RecurrenceType | null
  recurrence_end_date?: any | null
  recurrence_days?: Array<string> | null
  recurrence_count?: number | null
  parent_event_id?: string | null
  facilitator?: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
    is_organizer_approved?: boolean | null
    company_name?: string | null
    organizer_bio?: string | null
    event_types?: Array<string> | null
    website?: string | null
    website_url?: string | null
    location?: string | null
    city?: string | null
    dance_styles?: Array<string> | null
    skill_level?: SkillLevel | null
  } | null
}

export type EventWithParticipantsFragment = {
  __typename?: 'Event'
  id: string
  title: string
  description?: string | null
  category?: EventCategory | null
  image_url?: string | null
  location_name: string
  location_address?: string | null
  location_city?: string | null
  location_latitude?: number | null
  location_longitude?: number | null
  facilitator_id?: string | null
  max_capacity?: number | null
  current_capacity?: number | null
  price_usd?: number | null
  price_danz?: number | null
  is_featured?: boolean | null
  skill_level?: SkillLevel | null
  is_virtual?: boolean | null
  virtual_link?: string | null
  requirements?: string | null
  tags?: Array<string> | null
  dance_styles?: Array<string> | null
  currency?: string | null
  start_date_time: any
  end_date_time: any
  created_at: any
  updated_at: any
  status?: EventStatus | null
  is_registered?: boolean | null
  user_registration_status?: RegistrationStatus | null
  distance?: number | null
  registration_count?: number | null
  is_recurring?: boolean | null
  recurrence_type?: RecurrenceType | null
  recurrence_end_date?: any | null
  recurrence_days?: Array<string> | null
  recurrence_count?: number | null
  parent_event_id?: string | null
  participants?: Array<{
    __typename?: 'EventRegistration'
    id: string
    user_id: string
    status?: RegistrationStatus | null
    registration_date?: any | null
    payment_status?: PaymentStatus | null
    user?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    } | null
  }> | null
  facilitator?: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
    is_organizer_approved?: boolean | null
    company_name?: string | null
    organizer_bio?: string | null
    event_types?: Array<string> | null
    website?: string | null
    website_url?: string | null
    location?: string | null
    city?: string | null
    dance_styles?: Array<string> | null
    skill_level?: SkillLevel | null
  } | null
}

export type GigRoleBasicFragment = {
  __typename?: 'GigRole'
  id: string
  name: string
  slug: string
  description?: string | null
  category: GigRoleCategory
  tier: number
  icon?: string | null
  baseDanzRate: number
  requiresVerification: boolean
  isActive: boolean
}

export type EventGigBasicFragment = {
  __typename?: 'EventGig'
  id: string
  eventId: string
  roleId: string
  title: string
  description?: string | null
  slotsAvailable: number
  slotsFilled: number
  danzReward: number
  bonusDanz?: number | null
  timeCommitment?: string | null
  specificRequirements?: string | null
  status: EventGigStatus
  createdAt: any
}

export type EventGigFullFragment = {
  __typename?: 'EventGig'
  canApply: boolean
  id: string
  eventId: string
  roleId: string
  title: string
  description?: string | null
  slotsAvailable: number
  slotsFilled: number
  danzReward: number
  bonusDanz?: number | null
  timeCommitment?: string | null
  specificRequirements?: string | null
  status: EventGigStatus
  createdAt: any
  role: {
    __typename?: 'GigRole'
    id: string
    name: string
    slug: string
    description?: string | null
    category: GigRoleCategory
    tier: number
    icon?: string | null
    baseDanzRate: number
    requiresVerification: boolean
    isActive: boolean
  }
  event?: {
    __typename?: 'Event'
    id: string
    title: string
    start_date_time: any
    end_date_time: any
    location_name: string
    location_city?: string | null
  } | null
  myApplication?: { __typename?: 'GigApplication'; id: string; status: GigApplicationStatus } | null
}

export type GigApplicationBasicFragment = {
  __typename?: 'GigApplication'
  id: string
  gigId: string
  userId: string
  status: GigApplicationStatus
  applicationNote?: string | null
  danzAwarded?: number | null
  createdAt: any
}

export type GigApplicationWithGigFragment = {
  __typename?: 'GigApplication'
  id: string
  gigId: string
  userId: string
  status: GigApplicationStatus
  applicationNote?: string | null
  danzAwarded?: number | null
  createdAt: any
  gig: {
    __typename?: 'EventGig'
    canApply: boolean
    id: string
    eventId: string
    roleId: string
    title: string
    description?: string | null
    slotsAvailable: number
    slotsFilled: number
    danzReward: number
    bonusDanz?: number | null
    timeCommitment?: string | null
    specificRequirements?: string | null
    status: EventGigStatus
    createdAt: any
    role: {
      __typename?: 'GigRole'
      id: string
      name: string
      slug: string
      description?: string | null
      category: GigRoleCategory
      tier: number
      icon?: string | null
      baseDanzRate: number
      requiresVerification: boolean
      isActive: boolean
    }
    event?: {
      __typename?: 'Event'
      id: string
      title: string
      start_date_time: any
      end_date_time: any
      location_name: string
      location_city?: string | null
    } | null
    myApplication?: {
      __typename?: 'GigApplication'
      id: string
      status: GigApplicationStatus
    } | null
  }
}

export type GigStatsBasicFragment = {
  __typename?: 'GigStats'
  totalGigsCompleted: number
  totalDanzEarned: number
  activeRoles: number
  currentApprovedGigs: number
  pendingApplications: number
  averageRating?: number | null
  lastGigDate?: any | null
}

export type PostBasicInfoFragment = {
  __typename?: 'Post'
  id: string
  user_id: string
  content: string
  media_url?: string | null
  media_type?: MediaType | null
  event_id?: string | null
  location?: string | null
  is_public: boolean
  likes_count: number
  comments_count: number
  is_liked_by_me: boolean
  created_at: any
  updated_at: any
}

export type PostCommentFragment = {
  __typename?: 'PostComment'
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: any
  updated_at: any
  user: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
  }
}

export type PostLikeFragment = {
  __typename?: 'PostLike'
  id: string
  post_id: string
  user_id: string
  created_at: any
  user: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
  }
}

export type PostWithUserFragment = {
  __typename?: 'Post'
  id: string
  user_id: string
  content: string
  media_url?: string | null
  media_type?: MediaType | null
  event_id?: string | null
  location?: string | null
  is_public: boolean
  likes_count: number
  comments_count: number
  is_liked_by_me: boolean
  created_at: any
  updated_at: any
  user: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
  }
}

export type PostWithDetailsFragment = {
  __typename?: 'PostWithDetails'
  id: string
  user_id: string
  content: string
  media_url?: string | null
  media_type?: MediaType | null
  event_id?: string | null
  location?: string | null
  is_public: boolean
  likes_count: number
  comments_count: number
  is_liked_by_me: boolean
  created_at: any
  updated_at: any
  user: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
  }
  likes: Array<{
    __typename?: 'PostLike'
    id: string
    post_id: string
    user_id: string
    created_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }>
  comments: Array<{
    __typename?: 'PostComment'
    id: string
    post_id: string
    user_id: string
    content: string
    created_at: any
    updated_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }>
}

export type UserBasicInfoFragment = {
  __typename?: 'User'
  privy_id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  cover_image_url?: string | null
  bio?: string | null
  role?: UserRole | null
}

export type UserFullInfoFragment = {
  __typename?: 'User'
  privy_id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  cover_image_url?: string | null
  bio?: string | null
  role?: UserRole | null
  location?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  website?: string | null
  website_url?: string | null
  instagram?: string | null
  tiktok?: string | null
  youtube?: string | null
  twitter?: string | null
  pronouns?: string | null
  dance_styles?: Array<string> | null
  skill_level?: SkillLevel | null
  favorite_music?: Array<string> | null
  age?: number | null
  is_public?: boolean | null
  allow_messages?: boolean | null
  show_location?: boolean | null
  notification_preferences?: any | null
  xp?: number | null
  level?: number | null
  subscription_tier?: string | null
  total_dance_time?: number | null
  total_sessions?: number | null
  longest_streak?: number | null
  is_organizer_approved?: boolean | null
  organizer_approved_by?: string | null
  organizer_approved_at?: any | null
  company_name?: string | null
  organizer_bio?: string | null
  event_types?: Array<string> | null
  invited_by?: string | null
  social_media_links?: any | null
  organizer_requested_at?: any | null
  organizer_rejection_reason?: string | null
  total_events_attended?: number | null
  total_events_created?: number | null
  upcoming_events_count?: number | null
  total_achievements?: number | null
  dance_bonds_count?: number | null
  created_at?: any | null
  updated_at?: any | null
  last_active_at?: any | null
}

export type UserOrganizerInfoFragment = {
  __typename?: 'User'
  privy_id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  cover_image_url?: string | null
  bio?: string | null
  role?: UserRole | null
  is_organizer_approved?: boolean | null
  company_name?: string | null
  organizer_bio?: string | null
  event_types?: Array<string> | null
  website?: string | null
  website_url?: string | null
  location?: string | null
  city?: string | null
  dance_styles?: Array<string> | null
  skill_level?: SkillLevel | null
}

export type CreateFreestyleSessionMutationVariables = Exact<{
  input: CreateFreestyleSessionInput
}>

export type CreateFreestyleSessionMutation = {
  __typename?: 'Mutation'
  createFreestyleSession: {
    __typename?: 'FreestyleSession'
    id: string
    user_id: string
    duration_seconds: number
    movement_score: number
    points_awarded: number
    music_source: MusicSource
    completed: boolean
    session_date: any
    created_at: any
    achievements_unlocked?: Array<string> | null
  }
}

export type UpdateFreestylePreferencesMutationVariables = Exact<{
  input: UpdateUserPreferencesInput
}>

export type UpdateFreestylePreferencesMutation = {
  __typename?: 'Mutation'
  updateFreestylePreferences: {
    __typename?: 'UserPreferences'
    daily_reminder_enabled: boolean
    daily_reminder_time: string
    live_sessions_enabled: boolean
  }
}

export type CheckAchievementsMutationVariables = Exact<{ [key: string]: never }>

export type CheckAchievementsMutation = {
  __typename?: 'Mutation'
  checkAchievements: {
    __typename?: 'AchievementCheckResult'
    total_xp_earned: number
    total_danz_earned: number
    newly_unlocked: Array<{
      __typename?: 'AchievementDetails'
      id: string
      achievement_type: string
      title: string
      description?: string | null
      icon?: string | null
      category: AchievementCategory
      rarity: AchievementRarity
      xp_reward: number
      danz_reward: number
      unlocked_at?: any | null
      is_unlocked: boolean
    }>
  }
}

export type ClaimAchievementRewardMutationVariables = Exact<{
  achievementType: Scalars['String']['input']
}>

export type ClaimAchievementRewardMutation = {
  __typename?: 'Mutation'
  claimAchievementReward: {
    __typename?: 'AchievementDetails'
    id: string
    achievement_type: string
    title: string
    description?: string | null
    icon?: string | null
    category: AchievementCategory
    rarity: AchievementRarity
    xp_reward: number
    danz_reward: number
    unlocked_at?: any | null
  }
}

export type SendBondRequestMutationVariables = Exact<{
  input: SendBondRequestInput
}>

export type SendBondRequestMutation = {
  __typename?: 'Mutation'
  sendBondRequest: {
    __typename?: 'BondRequest'
    id: string
    status: BondRequestStatus
    message?: string | null
    created_at: any
    expires_at: any
    requester: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    recipient: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    match_reasons?: {
      __typename?: 'MatchReasons'
      mutual_bonds: number
      same_events: number
      music_overlap: Array<string>
      dance_styles: Array<string>
      similarity_score: number
    } | null
  }
}

export type RespondToBondRequestMutationVariables = Exact<{
  input: RespondToBondRequestInput
}>

export type RespondToBondRequestMutation = {
  __typename?: 'Mutation'
  respondToBondRequest: {
    __typename?: 'BondRequest'
    id: string
    status: BondRequestStatus
    message?: string | null
    responded_at?: any | null
    requester: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    recipient: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }
}

export type CancelBondRequestMutationVariables = Exact<{
  requestId: Scalars['ID']['input']
}>

export type CancelBondRequestMutation = { __typename?: 'Mutation'; cancelBondRequest: boolean }

export type StartChallengeMutationVariables = Exact<{
  challengeId: Scalars['String']['input']
}>

export type StartChallengeMutation = {
  __typename?: 'Mutation'
  startChallenge: {
    __typename?: 'UserChallenge'
    id: string
    challenge_id: string
    status: ChallengeStatus
    progress: number
    started_at: any
    expires_at?: any | null
    challenge: {
      __typename?: 'Challenge'
      id: string
      title: string
      target_value: number
      xp_reward: number
    }
  }
}

export type ClaimChallengeRewardMutationVariables = Exact<{
  challengeId: Scalars['String']['input']
}>

export type ClaimChallengeRewardMutation = {
  __typename?: 'Mutation'
  claimChallengeReward: {
    __typename?: 'UserChallenge'
    id: string
    status: ChallengeStatus
    claimed_at?: any | null
    challenge: { __typename?: 'Challenge'; xp_reward: number; points_reward: number }
  }
}

export type AbandonChallengeMutationVariables = Exact<{
  challengeId: Scalars['String']['input']
}>

export type AbandonChallengeMutation = {
  __typename?: 'Mutation'
  abandonChallenge: { __typename?: 'MutationResponse'; success: boolean; message?: string | null }
}

export type CheckInWithCodeMutationVariables = Exact<{
  code: Scalars['String']['input']
}>

export type CheckInWithCodeMutation = {
  __typename?: 'Mutation'
  checkInWithCode: {
    __typename?: 'CheckInResponse'
    success: boolean
    message: string
    event?: {
      __typename?: 'Event'
      id: string
      title: string
      location_name: string
      start_date_time: any
      end_date_time: any
      checkin_code?: string | null
      facilitator?: {
        __typename?: 'User'
        privy_id: string
        display_name?: string | null
        username?: string | null
      } | null
    } | null
    registration?: {
      __typename?: 'EventRegistration'
      id: string
      checked_in?: boolean | null
      check_in_time?: any | null
      status?: RegistrationStatus | null
    } | null
  }
}

export type RegenerateCheckinCodeMutationVariables = Exact<{
  eventId: Scalars['ID']['input']
}>

export type RegenerateCheckinCodeMutation = {
  __typename?: 'Mutation'
  regenerateCheckinCode: {
    __typename?: 'Event'
    id: string
    title: string
    checkin_code?: string | null
  }
}

export type CreateEventMutationVariables = Exact<{
  input: CreateEventInput
}>

export type CreateEventMutation = {
  __typename?: 'Mutation'
  createEvent: {
    __typename?: 'Event'
    id: string
    title: string
    description?: string | null
    category?: EventCategory | null
    image_url?: string | null
    location_name: string
    location_address?: string | null
    location_city?: string | null
    location_latitude?: number | null
    location_longitude?: number | null
    facilitator_id?: string | null
    max_capacity?: number | null
    current_capacity?: number | null
    price_usd?: number | null
    price_danz?: number | null
    is_featured?: boolean | null
    skill_level?: SkillLevel | null
    is_virtual?: boolean | null
    virtual_link?: string | null
    requirements?: string | null
    tags?: Array<string> | null
    dance_styles?: Array<string> | null
    currency?: string | null
    start_date_time: any
    end_date_time: any
    created_at: any
    updated_at: any
    status?: EventStatus | null
    is_registered?: boolean | null
    user_registration_status?: RegistrationStatus | null
    distance?: number | null
    registration_count?: number | null
    is_recurring?: boolean | null
    recurrence_type?: RecurrenceType | null
    recurrence_end_date?: any | null
    recurrence_days?: Array<string> | null
    recurrence_count?: number | null
    parent_event_id?: string | null
    facilitator?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
      is_organizer_approved?: boolean | null
      company_name?: string | null
      organizer_bio?: string | null
      event_types?: Array<string> | null
      website?: string | null
      website_url?: string | null
      location?: string | null
      city?: string | null
      dance_styles?: Array<string> | null
      skill_level?: SkillLevel | null
    } | null
  }
}

export type UpdateEventMutationVariables = Exact<{
  id: Scalars['ID']['input']
  input: UpdateEventInput
}>

export type UpdateEventMutation = {
  __typename?: 'Mutation'
  updateEvent: {
    __typename?: 'Event'
    id: string
    title: string
    description?: string | null
    category?: EventCategory | null
    image_url?: string | null
    location_name: string
    location_address?: string | null
    location_city?: string | null
    location_latitude?: number | null
    location_longitude?: number | null
    facilitator_id?: string | null
    max_capacity?: number | null
    current_capacity?: number | null
    price_usd?: number | null
    price_danz?: number | null
    is_featured?: boolean | null
    skill_level?: SkillLevel | null
    is_virtual?: boolean | null
    virtual_link?: string | null
    requirements?: string | null
    tags?: Array<string> | null
    dance_styles?: Array<string> | null
    currency?: string | null
    start_date_time: any
    end_date_time: any
    created_at: any
    updated_at: any
    status?: EventStatus | null
    is_registered?: boolean | null
    user_registration_status?: RegistrationStatus | null
    distance?: number | null
    registration_count?: number | null
    is_recurring?: boolean | null
    recurrence_type?: RecurrenceType | null
    recurrence_end_date?: any | null
    recurrence_days?: Array<string> | null
    recurrence_count?: number | null
    parent_event_id?: string | null
    facilitator?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
      is_organizer_approved?: boolean | null
      company_name?: string | null
      organizer_bio?: string | null
      event_types?: Array<string> | null
      website?: string | null
      website_url?: string | null
      location?: string | null
      city?: string | null
      dance_styles?: Array<string> | null
      skill_level?: SkillLevel | null
    } | null
  }
}

export type DeleteEventMutationVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type DeleteEventMutation = {
  __typename?: 'Mutation'
  deleteEvent: { __typename?: 'MutationResponse'; success: boolean; message?: string | null }
}

export type RegisterForEventMutationVariables = Exact<{
  eventId: Scalars['ID']['input']
  notes?: InputMaybe<Scalars['String']['input']>
}>

export type RegisterForEventMutation = {
  __typename?: 'Mutation'
  registerForEvent: {
    __typename?: 'EventRegistration'
    id: string
    event_id: string
    user_id: string
    status?: RegistrationStatus | null
    registration_date?: any | null
    payment_status?: PaymentStatus | null
    payment_amount?: number | null
    event?: {
      __typename?: 'Event'
      id: string
      title: string
      description?: string | null
      category?: EventCategory | null
      image_url?: string | null
      location_name: string
      location_address?: string | null
      location_city?: string | null
      location_latitude?: number | null
      location_longitude?: number | null
      start_date_time: any
      end_date_time: any
      price_usd?: number | null
      price_danz?: number | null
      skill_level?: SkillLevel | null
      is_virtual?: boolean | null
      is_featured?: boolean | null
      status?: EventStatus | null
      registration_count?: number | null
      is_recurring?: boolean | null
      recurrence_type?: RecurrenceType | null
    } | null
    user?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    } | null
  }
}

export type CancelEventRegistrationMutationVariables = Exact<{
  eventId: Scalars['ID']['input']
}>

export type CancelEventRegistrationMutation = {
  __typename?: 'Mutation'
  cancelEventRegistration: {
    __typename?: 'MutationResponse'
    success: boolean
    message?: string | null
  }
}

export type CheckInParticipantMutationVariables = Exact<{
  eventId: Scalars['ID']['input']
  userId: Scalars['String']['input']
}>

export type CheckInParticipantMutation = {
  __typename?: 'Mutation'
  checkInParticipant: {
    __typename?: 'EventRegistration'
    id: string
    checked_in?: boolean | null
    check_in_time?: any | null
  }
}

export type CreatePostMutationVariables = Exact<{
  input: CreatePostInput
}>

export type CreatePostMutation = {
  __typename?: 'Mutation'
  createPost: {
    __typename?: 'Post'
    id: string
    user_id: string
    content: string
    media_url?: string | null
    media_type?: MediaType | null
    event_id?: string | null
    location?: string | null
    is_public: boolean
    likes_count: number
    comments_count: number
    is_liked_by_me: boolean
    created_at: any
    updated_at: any
  }
}

export type UpdatePostMutationVariables = Exact<{
  postId: Scalars['ID']['input']
  input: UpdatePostInput
}>

export type UpdatePostMutation = {
  __typename?: 'Mutation'
  updatePost: {
    __typename?: 'Post'
    id: string
    user_id: string
    content: string
    media_url?: string | null
    media_type?: MediaType | null
    event_id?: string | null
    location?: string | null
    is_public: boolean
    likes_count: number
    comments_count: number
    is_liked_by_me: boolean
    created_at: any
    updated_at: any
  }
}

export type DeletePostMutationVariables = Exact<{
  postId: Scalars['ID']['input']
}>

export type DeletePostMutation = {
  __typename?: 'Mutation'
  deletePost: { __typename?: 'MutationResponse'; success: boolean; message?: string | null }
}

export type LikePostMutationVariables = Exact<{
  postId: Scalars['ID']['input']
}>

export type LikePostMutation = {
  __typename?: 'Mutation'
  likePost: { __typename?: 'MutationResponse'; success: boolean; message?: string | null }
}

export type UnlikePostMutationVariables = Exact<{
  postId: Scalars['ID']['input']
}>

export type UnlikePostMutation = {
  __typename?: 'Mutation'
  unlikePost: { __typename?: 'MutationResponse'; success: boolean; message?: string | null }
}

export type CreateCommentMutationVariables = Exact<{
  input: CreateCommentInput
}>

export type CreateCommentMutation = {
  __typename?: 'Mutation'
  createComment: {
    __typename?: 'PostComment'
    id: string
    post_id: string
    user_id: string
    content: string
    created_at: any
    updated_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }
}

export type UpdateCommentMutationVariables = Exact<{
  commentId: Scalars['ID']['input']
  content: Scalars['String']['input']
}>

export type UpdateCommentMutation = {
  __typename?: 'Mutation'
  updateComment: {
    __typename?: 'PostComment'
    id: string
    post_id: string
    user_id: string
    content: string
    created_at: any
    updated_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }
}

export type DeleteCommentMutationVariables = Exact<{
  commentId: Scalars['ID']['input']
}>

export type DeleteCommentMutation = {
  __typename?: 'Mutation'
  deleteComment: { __typename?: 'MutationResponse'; success: boolean; message?: string | null }
}

export type ApplyForGigMutationVariables = Exact<{
  gigId: Scalars['ID']['input']
  note?: InputMaybe<Scalars['String']['input']>
}>

export type ApplyForGigMutation = {
  __typename?: 'Mutation'
  applyForGig: {
    __typename?: 'GigApplication'
    id: string
    gigId: string
    userId: string
    status: GigApplicationStatus
    applicationNote?: string | null
    danzAwarded?: number | null
    createdAt: any
    gig: {
      __typename?: 'EventGig'
      canApply: boolean
      id: string
      eventId: string
      roleId: string
      title: string
      description?: string | null
      slotsAvailable: number
      slotsFilled: number
      danzReward: number
      bonusDanz?: number | null
      timeCommitment?: string | null
      specificRequirements?: string | null
      status: EventGigStatus
      createdAt: any
      role: {
        __typename?: 'GigRole'
        id: string
        name: string
        slug: string
        description?: string | null
        category: GigRoleCategory
        tier: number
        icon?: string | null
        baseDanzRate: number
        requiresVerification: boolean
        isActive: boolean
      }
      event?: {
        __typename?: 'Event'
        id: string
        title: string
        start_date_time: any
        end_date_time: any
        location_name: string
        location_city?: string | null
      } | null
      myApplication?: {
        __typename?: 'GigApplication'
        id: string
        status: GigApplicationStatus
      } | null
    }
  }
}

export type WithdrawGigApplicationMutationVariables = Exact<{
  applicationId: Scalars['ID']['input']
}>

export type WithdrawGigApplicationMutation = {
  __typename?: 'Mutation'
  withdrawGigApplication: {
    __typename?: 'GigApplication'
    id: string
    gigId: string
    userId: string
    status: GigApplicationStatus
    applicationNote?: string | null
    danzAwarded?: number | null
    createdAt: any
  }
}

export type ReviewGigApplicationMutationVariables = Exact<{
  applicationId: Scalars['ID']['input']
  input: ReviewGigApplicationInput
}>

export type ReviewGigApplicationMutation = {
  __typename?: 'Mutation'
  reviewGigApplication: {
    __typename?: 'GigApplication'
    id: string
    status: GigApplicationStatus
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
    }
  }
}

export type MarkNotificationReadMutationVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type MarkNotificationReadMutation = {
  __typename?: 'Mutation'
  markNotificationRead: {
    __typename?: 'Notification'
    id: string
    read: boolean
    read_at?: any | null
  }
}

export type MarkAllNotificationsReadMutationVariables = Exact<{ [key: string]: never }>

export type MarkAllNotificationsReadMutation = {
  __typename?: 'Mutation'
  markAllNotificationsRead: {
    __typename?: 'MutationResponse'
    success: boolean
    message?: string | null
  }
}

export type DeleteNotificationMutationVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type DeleteNotificationMutation = {
  __typename?: 'Mutation'
  deleteNotification: { __typename?: 'MutationResponse'; success: boolean; message?: string | null }
}

export type UpdatePrivacySettingsMutationVariables = Exact<{
  input: UpdatePrivacySettingsInput
}>

export type UpdatePrivacySettingsMutation = {
  __typename?: 'Mutation'
  updatePrivacySettings: {
    __typename?: 'PrivacySettings'
    id: string
    user_id: string
    profile_visibility: ProfileVisibility
    show_real_name: boolean
    show_bio: boolean
    show_avatar: boolean
    show_city: boolean
    show_dance_styles: boolean
    show_stats: boolean
    show_badges: boolean
    show_events_attending: boolean
    show_events_attended: boolean
    show_check_ins: boolean
    show_leaderboard_rank: boolean
    show_posts: boolean
    show_likes: boolean
    show_comments: boolean
    searchable_by_username: boolean
    appear_in_suggestions: boolean
    appear_in_event_attendees: boolean
    appear_in_nearby: boolean
    allow_bond_requests: AllowBondRequestsFrom
    allow_messages: AllowMessagesFrom
    allow_event_invites: boolean
    notify_bonds_on_check_in: boolean
    notify_bonds_on_achievement: boolean
    updated_at?: any | null
  }
}

export type ApplyPrivacyPresetMutationVariables = Exact<{
  preset: PrivacyPresetType
}>

export type ApplyPrivacyPresetMutation = {
  __typename?: 'Mutation'
  applyPrivacyPreset: {
    __typename?: 'PrivacySettings'
    id: string
    user_id: string
    profile_visibility: ProfileVisibility
    show_real_name: boolean
    show_bio: boolean
    show_avatar: boolean
    show_city: boolean
    show_dance_styles: boolean
    show_stats: boolean
    show_badges: boolean
    show_events_attending: boolean
    show_events_attended: boolean
    show_check_ins: boolean
    show_leaderboard_rank: boolean
    show_posts: boolean
    show_likes: boolean
    show_comments: boolean
    searchable_by_username: boolean
    appear_in_suggestions: boolean
    appear_in_event_attendees: boolean
    appear_in_nearby: boolean
    allow_bond_requests: AllowBondRequestsFrom
    allow_messages: AllowMessagesFrom
    allow_event_invites: boolean
    notify_bonds_on_check_in: boolean
    notify_bonds_on_achievement: boolean
    updated_at?: any | null
  }
}

export type ResetPrivacyToDefaultsMutationVariables = Exact<{ [key: string]: never }>

export type ResetPrivacyToDefaultsMutation = {
  __typename?: 'Mutation'
  resetPrivacyToDefaults: {
    __typename?: 'PrivacySettings'
    id: string
    user_id: string
    profile_visibility: ProfileVisibility
    updated_at?: any | null
  }
}

export type DismissSuggestionMutationVariables = Exact<{
  suggestionId: Scalars['ID']['input']
}>

export type DismissSuggestionMutation = { __typename?: 'Mutation'; dismissSuggestion: boolean }

export type RefreshSuggestionsMutationVariables = Exact<{ [key: string]: never }>

export type RefreshSuggestionsMutation = {
  __typename?: 'Mutation'
  refreshSuggestions: {
    __typename?: 'UserSuggestionConnection'
    total_count: number
    has_more: boolean
    suggestions: Array<{
      __typename?: 'UserSuggestion'
      id: string
      source: SuggestionSource
      score: number
      reason: string
      user: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
      }
    }>
  }
}

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput
}>

export type UpdateProfileMutation = {
  __typename?: 'Mutation'
  updateProfile: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
    location?: string | null
    city?: string | null
    latitude?: number | null
    longitude?: number | null
    website?: string | null
    website_url?: string | null
    instagram?: string | null
    tiktok?: string | null
    youtube?: string | null
    twitter?: string | null
    pronouns?: string | null
    dance_styles?: Array<string> | null
    skill_level?: SkillLevel | null
    favorite_music?: Array<string> | null
    age?: number | null
    is_public?: boolean | null
    allow_messages?: boolean | null
    show_location?: boolean | null
    notification_preferences?: any | null
    xp?: number | null
    level?: number | null
    subscription_tier?: string | null
    total_dance_time?: number | null
    total_sessions?: number | null
    longest_streak?: number | null
    is_organizer_approved?: boolean | null
    organizer_approved_by?: string | null
    organizer_approved_at?: any | null
    company_name?: string | null
    organizer_bio?: string | null
    event_types?: Array<string> | null
    invited_by?: string | null
    social_media_links?: any | null
    organizer_requested_at?: any | null
    organizer_rejection_reason?: string | null
    total_events_attended?: number | null
    total_events_created?: number | null
    upcoming_events_count?: number | null
    total_achievements?: number | null
    dance_bonds_count?: number | null
    created_at?: any | null
    updated_at?: any | null
    last_active_at?: any | null
  }
}

export type CreateDanceBondMutationVariables = Exact<{
  userId: Scalars['String']['input']
  input: CreateDanceBondInput
}>

export type CreateDanceBondMutation = {
  __typename?: 'Mutation'
  createDanceBond: {
    __typename?: 'DanceBond'
    id: string
    user_id_1: string
    user_id_2: string
    bond_level: number
    shared_events_count: number
    total_dances: number
    last_dance_date?: any | null
    created_at: any
    updated_at: any
  }
}

export type GetFreestylePreferencesQueryVariables = Exact<{ [key: string]: never }>

export type GetFreestylePreferencesQuery = {
  __typename?: 'Query'
  myFreestylePreferences: {
    __typename?: 'UserPreferences'
    daily_reminder_enabled: boolean
    daily_reminder_time: string
    live_sessions_enabled: boolean
  }
}

export type GetFreestyleSessionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetFreestyleSessionsQuery = {
  __typename?: 'Query'
  myFreestyleSessions: Array<{
    __typename?: 'FreestyleSession'
    id: string
    duration_seconds: number
    movement_score: number
    points_awarded: number
    music_source: MusicSource
    session_date: any
    completed: boolean
    created_at: any
  }>
}

export type GetFreestyleStatsQueryVariables = Exact<{ [key: string]: never }>

export type GetFreestyleStatsQuery = {
  __typename?: 'Query'
  completedFreestyleToday: boolean
  myFreestyleStats: {
    __typename?: 'FreestyleSessionStats'
    total_sessions: number
    total_duration_seconds: number
    total_points: number
    average_movement_score: number
    best_movement_score: number
    sessions_this_week: number
    current_streak: number
    longest_streak: number
    last_session_date?: any | null
  }
}

export type MyAchievementsQueryVariables = Exact<{ [key: string]: never }>

export type MyAchievementsQuery = {
  __typename?: 'Query'
  myAchievements: Array<{
    __typename?: 'AchievementProgress'
    achievement_type: string
    title: string
    description: string
    icon: string
    category: AchievementCategory
    rarity: AchievementRarity
    xp_reward: number
    danz_reward: number
    current_progress: number
    target: number
    percentage: number
    is_unlocked: boolean
    unlocked_at?: any | null
  }>
}

export type MyUnlockedAchievementsQueryVariables = Exact<{ [key: string]: never }>

export type MyUnlockedAchievementsQuery = {
  __typename?: 'Query'
  myUnlockedAchievements: Array<{
    __typename?: 'AchievementDetails'
    id: string
    user_id: string
    achievement_type: string
    title: string
    description?: string | null
    icon?: string | null
    category: AchievementCategory
    rarity: AchievementRarity
    xp_reward: number
    danz_reward: number
    unlocked_at?: any | null
    is_unlocked: boolean
  }>
}

export type MyAchievementStatsQueryVariables = Exact<{ [key: string]: never }>

export type MyAchievementStatsQuery = {
  __typename?: 'Query'
  myAchievementStats: {
    __typename?: 'AchievementStats'
    total_unlocked: number
    total_available: number
    total_xp_earned: number
    total_danz_earned: number
    by_category: Array<{
      __typename?: 'CategoryCount'
      category: AchievementCategory
      unlocked: number
      total: number
    }>
    by_rarity: Array<{
      __typename?: 'RarityCount'
      rarity: AchievementRarity
      unlocked: number
      total: number
    }>
    recent_unlocks: Array<{
      __typename?: 'AchievementDetails'
      id: string
      achievement_type: string
      title: string
      description?: string | null
      icon?: string | null
      category: AchievementCategory
      rarity: AchievementRarity
      xp_reward: number
      danz_reward: number
      unlocked_at?: any | null
    }>
  }
}

export type AchievementDefinitionsQueryVariables = Exact<{ [key: string]: never }>

export type AchievementDefinitionsQuery = {
  __typename?: 'Query'
  achievementDefinitions: Array<{
    __typename?: 'AchievementDefinition'
    type: string
    title: string
    description: string
    icon: string
    category: AchievementCategory
    rarity: AchievementRarity
    xp_reward: number
    danz_reward: number
    target: number
    hidden: boolean
  }>
}

export type AchievementsByCategoryQueryVariables = Exact<{
  category: AchievementCategory
}>

export type AchievementsByCategoryQuery = {
  __typename?: 'Query'
  achievementsByCategory: Array<{
    __typename?: 'AchievementProgress'
    achievement_type: string
    title: string
    description: string
    icon: string
    category: AchievementCategory
    rarity: AchievementRarity
    xp_reward: number
    danz_reward: number
    current_progress: number
    target: number
    percentage: number
    is_unlocked: boolean
    unlocked_at?: any | null
  }>
}

export type IsAchievementUnlockedQueryVariables = Exact<{
  achievementType: Scalars['String']['input']
}>

export type IsAchievementUnlockedQuery = { __typename?: 'Query'; isAchievementUnlocked: boolean }

export type GetMyPendingBondRequestsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetMyPendingBondRequestsQuery = {
  __typename?: 'Query'
  myPendingBondRequests: Array<{
    __typename?: 'BondRequest'
    id: string
    status: BondRequestStatus
    message?: string | null
    created_at: any
    expires_at: any
    requester: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    recipient: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    match_reasons?: {
      __typename?: 'MatchReasons'
      mutual_bonds: number
      same_events: number
      music_overlap: Array<string>
      dance_styles: Array<string>
      similarity_score: number
    } | null
  }>
}

export type GetMySentBondRequestsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetMySentBondRequestsQuery = {
  __typename?: 'Query'
  mySentBondRequests: Array<{
    __typename?: 'BondRequest'
    id: string
    status: BondRequestStatus
    message?: string | null
    created_at: any
    updated_at: any
    responded_at?: any | null
    expires_at: any
    requester: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    recipient: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    match_reasons?: {
      __typename?: 'MatchReasons'
      mutual_bonds: number
      same_events: number
      music_overlap: Array<string>
      dance_styles: Array<string>
      similarity_score: number
    } | null
  }>
}

export type GetBondRequestQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetBondRequestQuery = {
  __typename?: 'Query'
  bondRequest?: {
    __typename?: 'BondRequest'
    id: string
    status: BondRequestStatus
    message?: string | null
    created_at: any
    updated_at: any
    responded_at?: any | null
    expires_at: any
    requester: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    recipient: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    match_reasons?: {
      __typename?: 'MatchReasons'
      mutual_bonds: number
      same_events: number
      music_overlap: Array<string>
      dance_styles: Array<string>
      similarity_score: number
    } | null
  } | null
}

export type CanSendBondRequestToQueryVariables = Exact<{
  userId: Scalars['String']['input']
}>

export type CanSendBondRequestToQuery = {
  __typename?: 'Query'
  canSendBondRequestTo: {
    __typename?: 'CanSendBondRequestResult'
    can_send: boolean
    reason?: string | null
    match_reasons?: {
      __typename?: 'MatchReasons'
      mutual_bonds: number
      same_events: number
      music_overlap: Array<string>
      dance_styles: Array<string>
      similarity_score: number
    } | null
  }
}

export type GetSimilarityWithQueryVariables = Exact<{
  userId: Scalars['String']['input']
}>

export type GetSimilarityWithQuery = {
  __typename?: 'Query'
  getSimilarityWith: {
    __typename?: 'MatchReasons'
    mutual_bonds: number
    same_events: number
    music_overlap: Array<string>
    dance_styles: Array<string>
    similarity_score: number
  }
}

export type GetMyBondRequestStatsQueryVariables = Exact<{ [key: string]: never }>

export type GetMyBondRequestStatsQuery = {
  __typename?: 'Query'
  myBondRequestStats: {
    __typename?: 'BondRequestStats'
    pending_sent: number
    pending_received: number
    total_bonds: number
    acceptance_rate?: number | null
  }
}

export type GetDailyChallengesQueryVariables = Exact<{ [key: string]: never }>

export type GetDailyChallengesQuery = {
  __typename?: 'Query'
  dailyChallenges: {
    __typename?: 'DailyChallengeset'
    date: string
    total_xp_available: number
    total_points_available: number
    challenges: Array<{
      __typename?: 'Challenge'
      id: string
      title: string
      description: string
      challenge_type: ChallengeType
      difficulty: ChallengeDifficulty
      category: ChallengeCategory
      target_value: number
      target_unit: string
      xp_reward: number
      points_reward: number
      time_limit_hours?: number | null
    }>
    user_progress?: Array<{
      __typename?: 'UserChallenge'
      id: string
      challenge_id: string
      status: ChallengeStatus
      progress: number
      started_at: any
      completed_at?: any | null
      expires_at?: any | null
    }> | null
  }
}

export type GetMyChallengesQueryVariables = Exact<{ [key: string]: never }>

export type GetMyChallengesQuery = {
  __typename?: 'Query'
  myActiveChallenges: Array<{
    __typename?: 'UserChallenge'
    id: string
    challenge_id: string
    status: ChallengeStatus
    progress: number
    started_at: any
    expires_at?: any | null
    challenge: {
      __typename?: 'Challenge'
      id: string
      title: string
      description: string
      difficulty: ChallengeDifficulty
      category: ChallengeCategory
      target_value: number
      target_unit: string
      xp_reward: number
      points_reward: number
    }
  }>
}

export type GetMyChallengeStatsQueryVariables = Exact<{ [key: string]: never }>

export type GetMyChallengeStatsQuery = {
  __typename?: 'Query'
  myChallengeStats: {
    __typename?: 'ChallengeStats'
    total_completed: number
    total_xp_earned: number
    total_points_earned: number
    current_streak: number
    longest_streak: number
    completion_rate: number
    challenges_by_difficulty: any
  }
}

export type GetEventByCheckinCodeQueryVariables = Exact<{
  code: Scalars['String']['input']
}>

export type GetEventByCheckinCodeQuery = {
  __typename?: 'Query'
  eventByCheckinCode?: {
    __typename?: 'Event'
    id: string
    title: string
    description?: string | null
    location_name: string
    start_date_time: any
    end_date_time: any
    is_registered?: boolean | null
    checkin_code?: string | null
    facilitator?: {
      __typename?: 'User'
      privy_id: string
      display_name?: string | null
      username?: string | null
      avatar_url?: string | null
    } | null
  } | null
}

export type GetEventsQueryVariables = Exact<{
  filter?: InputMaybe<EventFilterInput>
  pagination?: InputMaybe<PaginationInput>
  sortBy?: InputMaybe<EventSortBy>
}>

export type GetEventsQuery = {
  __typename?: 'Query'
  events: {
    __typename?: 'EventConnection'
    totalCount: number
    events: Array<{
      __typename?: 'Event'
      id: string
      title: string
      description?: string | null
      category?: EventCategory | null
      image_url?: string | null
      location_name: string
      location_address?: string | null
      location_city?: string | null
      location_latitude?: number | null
      location_longitude?: number | null
      facilitator_id?: string | null
      max_capacity?: number | null
      current_capacity?: number | null
      price_usd?: number | null
      price_danz?: number | null
      is_featured?: boolean | null
      skill_level?: SkillLevel | null
      is_virtual?: boolean | null
      virtual_link?: string | null
      requirements?: string | null
      tags?: Array<string> | null
      dance_styles?: Array<string> | null
      currency?: string | null
      start_date_time: any
      end_date_time: any
      created_at: any
      updated_at: any
      status?: EventStatus | null
      is_registered?: boolean | null
      user_registration_status?: RegistrationStatus | null
      distance?: number | null
      registration_count?: number | null
      is_recurring?: boolean | null
      recurrence_type?: RecurrenceType | null
      recurrence_end_date?: any | null
      recurrence_days?: Array<string> | null
      recurrence_count?: number | null
      parent_event_id?: string | null
      facilitator?: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
        is_organizer_approved?: boolean | null
        company_name?: string | null
        organizer_bio?: string | null
        event_types?: Array<string> | null
        website?: string | null
        website_url?: string | null
        location?: string | null
        city?: string | null
        dance_styles?: Array<string> | null
        skill_level?: SkillLevel | null
      } | null
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type GetEventQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetEventQuery = {
  __typename?: 'Query'
  event?: {
    __typename?: 'Event'
    id: string
    title: string
    description?: string | null
    category?: EventCategory | null
    image_url?: string | null
    location_name: string
    location_address?: string | null
    location_city?: string | null
    location_latitude?: number | null
    location_longitude?: number | null
    facilitator_id?: string | null
    max_capacity?: number | null
    current_capacity?: number | null
    price_usd?: number | null
    price_danz?: number | null
    is_featured?: boolean | null
    skill_level?: SkillLevel | null
    is_virtual?: boolean | null
    virtual_link?: string | null
    requirements?: string | null
    tags?: Array<string> | null
    dance_styles?: Array<string> | null
    currency?: string | null
    start_date_time: any
    end_date_time: any
    created_at: any
    updated_at: any
    status?: EventStatus | null
    is_registered?: boolean | null
    user_registration_status?: RegistrationStatus | null
    distance?: number | null
    registration_count?: number | null
    is_recurring?: boolean | null
    recurrence_type?: RecurrenceType | null
    recurrence_end_date?: any | null
    recurrence_days?: Array<string> | null
    recurrence_count?: number | null
    parent_event_id?: string | null
    participants?: Array<{
      __typename?: 'EventRegistration'
      id: string
      user_id: string
      status?: RegistrationStatus | null
      registration_date?: any | null
      payment_status?: PaymentStatus | null
      user?: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
      } | null
    }> | null
    facilitator?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
      is_organizer_approved?: boolean | null
      company_name?: string | null
      organizer_bio?: string | null
      event_types?: Array<string> | null
      website?: string | null
      website_url?: string | null
      location?: string | null
      city?: string | null
      dance_styles?: Array<string> | null
      skill_level?: SkillLevel | null
    } | null
  } | null
}

export type GetEventsNearLocationQueryVariables = Exact<{
  latitude: Scalars['Float']['input']
  longitude: Scalars['Float']['input']
  radius?: InputMaybe<Scalars['Float']['input']>
}>

export type GetEventsNearLocationQuery = {
  __typename?: 'Query'
  events: {
    __typename?: 'EventConnection'
    totalCount: number
    events: Array<{
      __typename?: 'Event'
      id: string
      title: string
      description?: string | null
      category?: EventCategory | null
      image_url?: string | null
      location_name: string
      location_address?: string | null
      location_city?: string | null
      location_latitude?: number | null
      location_longitude?: number | null
      facilitator_id?: string | null
      max_capacity?: number | null
      current_capacity?: number | null
      price_usd?: number | null
      price_danz?: number | null
      is_featured?: boolean | null
      skill_level?: SkillLevel | null
      is_virtual?: boolean | null
      virtual_link?: string | null
      requirements?: string | null
      tags?: Array<string> | null
      dance_styles?: Array<string> | null
      currency?: string | null
      start_date_time: any
      end_date_time: any
      created_at: any
      updated_at: any
      status?: EventStatus | null
      is_registered?: boolean | null
      user_registration_status?: RegistrationStatus | null
      distance?: number | null
      registration_count?: number | null
      is_recurring?: boolean | null
      recurrence_type?: RecurrenceType | null
      recurrence_end_date?: any | null
      recurrence_days?: Array<string> | null
      recurrence_count?: number | null
      parent_event_id?: string | null
      facilitator?: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
        is_organizer_approved?: boolean | null
        company_name?: string | null
        organizer_bio?: string | null
        event_types?: Array<string> | null
        website?: string | null
        website_url?: string | null
        location?: string | null
        city?: string | null
        dance_styles?: Array<string> | null
        skill_level?: SkillLevel | null
      } | null
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type GetMyRegisteredEventsQueryVariables = Exact<{ [key: string]: never }>

export type GetMyRegisteredEventsQuery = {
  __typename?: 'Query'
  events: {
    __typename?: 'EventConnection'
    totalCount: number
    events: Array<{
      __typename?: 'Event'
      id: string
      title: string
      description?: string | null
      category?: EventCategory | null
      image_url?: string | null
      location_name: string
      location_address?: string | null
      location_city?: string | null
      location_latitude?: number | null
      location_longitude?: number | null
      facilitator_id?: string | null
      max_capacity?: number | null
      current_capacity?: number | null
      price_usd?: number | null
      price_danz?: number | null
      is_featured?: boolean | null
      skill_level?: SkillLevel | null
      is_virtual?: boolean | null
      virtual_link?: string | null
      requirements?: string | null
      tags?: Array<string> | null
      dance_styles?: Array<string> | null
      currency?: string | null
      start_date_time: any
      end_date_time: any
      created_at: any
      updated_at: any
      status?: EventStatus | null
      is_registered?: boolean | null
      user_registration_status?: RegistrationStatus | null
      distance?: number | null
      registration_count?: number | null
      is_recurring?: boolean | null
      recurrence_type?: RecurrenceType | null
      recurrence_end_date?: any | null
      recurrence_days?: Array<string> | null
      recurrence_count?: number | null
      parent_event_id?: string | null
      facilitator?: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
        is_organizer_approved?: boolean | null
        company_name?: string | null
        organizer_bio?: string | null
        event_types?: Array<string> | null
        website?: string | null
        website_url?: string | null
        location?: string | null
        city?: string | null
        dance_styles?: Array<string> | null
        skill_level?: SkillLevel | null
      } | null
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type GetMyCreatedEventsQueryVariables = Exact<{ [key: string]: never }>

export type GetMyCreatedEventsQuery = {
  __typename?: 'Query'
  events: {
    __typename?: 'EventConnection'
    totalCount: number
    events: Array<{
      __typename?: 'Event'
      id: string
      title: string
      description?: string | null
      category?: EventCategory | null
      image_url?: string | null
      location_name: string
      location_address?: string | null
      location_city?: string | null
      location_latitude?: number | null
      location_longitude?: number | null
      facilitator_id?: string | null
      max_capacity?: number | null
      current_capacity?: number | null
      price_usd?: number | null
      price_danz?: number | null
      is_featured?: boolean | null
      skill_level?: SkillLevel | null
      is_virtual?: boolean | null
      virtual_link?: string | null
      requirements?: string | null
      tags?: Array<string> | null
      dance_styles?: Array<string> | null
      currency?: string | null
      start_date_time: any
      end_date_time: any
      created_at: any
      updated_at: any
      status?: EventStatus | null
      is_registered?: boolean | null
      user_registration_status?: RegistrationStatus | null
      distance?: number | null
      registration_count?: number | null
      is_recurring?: boolean | null
      recurrence_type?: RecurrenceType | null
      recurrence_end_date?: any | null
      recurrence_days?: Array<string> | null
      recurrence_count?: number | null
      parent_event_id?: string | null
      facilitator?: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
        is_organizer_approved?: boolean | null
        company_name?: string | null
        organizer_bio?: string | null
        event_types?: Array<string> | null
        website?: string | null
        website_url?: string | null
        location?: string | null
        city?: string | null
        dance_styles?: Array<string> | null
        skill_level?: SkillLevel | null
      } | null
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type GetOrganizerEventsQueryVariables = Exact<{
  organizerId: Scalars['String']['input']
}>

export type GetOrganizerEventsQuery = {
  __typename?: 'Query'
  events: {
    __typename?: 'EventConnection'
    totalCount: number
    events: Array<{
      __typename?: 'Event'
      id: string
      title: string
      description?: string | null
      category?: EventCategory | null
      image_url?: string | null
      location_name: string
      location_address?: string | null
      location_city?: string | null
      location_latitude?: number | null
      location_longitude?: number | null
      facilitator_id?: string | null
      max_capacity?: number | null
      current_capacity?: number | null
      price_usd?: number | null
      price_danz?: number | null
      is_featured?: boolean | null
      skill_level?: SkillLevel | null
      is_virtual?: boolean | null
      virtual_link?: string | null
      requirements?: string | null
      tags?: Array<string> | null
      dance_styles?: Array<string> | null
      currency?: string | null
      start_date_time: any
      end_date_time: any
      created_at: any
      updated_at: any
      status?: EventStatus | null
      is_registered?: boolean | null
      user_registration_status?: RegistrationStatus | null
      distance?: number | null
      registration_count?: number | null
      is_recurring?: boolean | null
      recurrence_type?: RecurrenceType | null
      recurrence_end_date?: any | null
      recurrence_days?: Array<string> | null
      recurrence_count?: number | null
      parent_event_id?: string | null
      facilitator?: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
        is_organizer_approved?: boolean | null
        company_name?: string | null
        organizer_bio?: string | null
        event_types?: Array<string> | null
        website?: string | null
        website_url?: string | null
        location?: string | null
        city?: string | null
        dance_styles?: Array<string> | null
        skill_level?: SkillLevel | null
      } | null
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type GetPastEventsQueryVariables = Exact<{ [key: string]: never }>

export type GetPastEventsQuery = {
  __typename?: 'Query'
  events: {
    __typename?: 'EventConnection'
    totalCount: number
    events: Array<{
      __typename?: 'Event'
      id: string
      title: string
      description?: string | null
      category?: EventCategory | null
      image_url?: string | null
      location_name: string
      location_address?: string | null
      location_city?: string | null
      location_latitude?: number | null
      location_longitude?: number | null
      facilitator_id?: string | null
      max_capacity?: number | null
      current_capacity?: number | null
      price_usd?: number | null
      price_danz?: number | null
      is_featured?: boolean | null
      skill_level?: SkillLevel | null
      is_virtual?: boolean | null
      virtual_link?: string | null
      requirements?: string | null
      tags?: Array<string> | null
      dance_styles?: Array<string> | null
      currency?: string | null
      start_date_time: any
      end_date_time: any
      created_at: any
      updated_at: any
      status?: EventStatus | null
      is_registered?: boolean | null
      user_registration_status?: RegistrationStatus | null
      distance?: number | null
      registration_count?: number | null
      is_recurring?: boolean | null
      recurrence_type?: RecurrenceType | null
      recurrence_end_date?: any | null
      recurrence_days?: Array<string> | null
      recurrence_count?: number | null
      parent_event_id?: string | null
      facilitator?: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
        is_organizer_approved?: boolean | null
        company_name?: string | null
        organizer_bio?: string | null
        event_types?: Array<string> | null
        website?: string | null
        website_url?: string | null
        location?: string | null
        city?: string | null
        dance_styles?: Array<string> | null
        skill_level?: SkillLevel | null
      } | null
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type GetEventRegistrationsQueryVariables = Exact<{
  eventId: Scalars['ID']['input']
  status?: InputMaybe<RegistrationStatus>
}>

export type GetEventRegistrationsQuery = {
  __typename?: 'Query'
  eventRegistrations: Array<{
    __typename?: 'EventRegistration'
    id: string
    event_id: string
    user_id: string
    status?: RegistrationStatus | null
    registration_date?: any | null
    payment_status?: PaymentStatus | null
    payment_amount?: number | null
    user?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    } | null
  }>
}

export type GetFeedQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  cursor?: InputMaybe<Scalars['String']['input']>
}>

export type GetFeedQuery = {
  __typename?: 'Query'
  getFeed: {
    __typename?: 'FeedResponse'
    has_more: boolean
    cursor?: string | null
    posts: Array<{
      __typename?: 'Post'
      id: string
      user_id: string
      content: string
      media_url?: string | null
      media_type?: MediaType | null
      event_id?: string | null
      location?: string | null
      is_public: boolean
      likes_count: number
      comments_count: number
      is_liked_by_me: boolean
      created_at: any
      updated_at: any
      user: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
      }
    }>
  }
}

export type GetPostQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetPostQuery = {
  __typename?: 'Query'
  getPost?: {
    __typename?: 'PostWithDetails'
    id: string
    user_id: string
    content: string
    media_url?: string | null
    media_type?: MediaType | null
    event_id?: string | null
    location?: string | null
    is_public: boolean
    likes_count: number
    comments_count: number
    is_liked_by_me: boolean
    created_at: any
    updated_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
    likes: Array<{
      __typename?: 'PostLike'
      id: string
      post_id: string
      user_id: string
      created_at: any
      user: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
      }
    }>
    comments: Array<{
      __typename?: 'PostComment'
      id: string
      post_id: string
      user_id: string
      content: string
      created_at: any
      updated_at: any
      user: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        cover_image_url?: string | null
        bio?: string | null
        role?: UserRole | null
      }
    }>
  } | null
}

export type GetMyPostsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetMyPostsQuery = {
  __typename?: 'Query'
  getMyPosts: Array<{
    __typename?: 'Post'
    id: string
    user_id: string
    content: string
    media_url?: string | null
    media_type?: MediaType | null
    event_id?: string | null
    location?: string | null
    is_public: boolean
    likes_count: number
    comments_count: number
    is_liked_by_me: boolean
    created_at: any
    updated_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }>
}

export type GetUserPostsQueryVariables = Exact<{
  userId: Scalars['String']['input']
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetUserPostsQuery = {
  __typename?: 'Query'
  getUserPosts: Array<{
    __typename?: 'Post'
    id: string
    user_id: string
    content: string
    media_url?: string | null
    media_type?: MediaType | null
    event_id?: string | null
    location?: string | null
    is_public: boolean
    likes_count: number
    comments_count: number
    is_liked_by_me: boolean
    created_at: any
    updated_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }>
}

export type GetEventPostsQueryVariables = Exact<{
  eventId: Scalars['ID']['input']
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetEventPostsQuery = {
  __typename?: 'Query'
  getEventPosts: Array<{
    __typename?: 'Post'
    id: string
    user_id: string
    content: string
    media_url?: string | null
    media_type?: MediaType | null
    event_id?: string | null
    location?: string | null
    is_public: boolean
    likes_count: number
    comments_count: number
    is_liked_by_me: boolean
    created_at: any
    updated_at: any
    user: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }
  }>
}

export type GetMyGigDashboardQueryVariables = Exact<{ [key: string]: never }>

export type GetMyGigDashboardQuery = {
  __typename?: 'Query'
  myGigDashboard: {
    __typename?: 'GigDashboard'
    stats: {
      __typename?: 'GigStats'
      totalGigsCompleted: number
      totalDanzEarned: number
      activeRoles: number
      currentApprovedGigs: number
      pendingApplications: number
      averageRating?: number | null
      lastGigDate?: any | null
    }
    availableGigs: Array<{
      __typename?: 'EventGig'
      canApply: boolean
      id: string
      eventId: string
      roleId: string
      title: string
      description?: string | null
      slotsAvailable: number
      slotsFilled: number
      danzReward: number
      bonusDanz?: number | null
      timeCommitment?: string | null
      specificRequirements?: string | null
      status: EventGigStatus
      createdAt: any
      role: {
        __typename?: 'GigRole'
        id: string
        name: string
        slug: string
        description?: string | null
        category: GigRoleCategory
        tier: number
        icon?: string | null
        baseDanzRate: number
        requiresVerification: boolean
        isActive: boolean
      }
      event?: {
        __typename?: 'Event'
        id: string
        title: string
        start_date_time: any
        end_date_time: any
        location_name: string
        location_city?: string | null
      } | null
      myApplication?: {
        __typename?: 'GigApplication'
        id: string
        status: GigApplicationStatus
      } | null
    }>
    activeGigs: Array<{
      __typename?: 'GigApplication'
      id: string
      gigId: string
      userId: string
      status: GigApplicationStatus
      applicationNote?: string | null
      danzAwarded?: number | null
      createdAt: any
      gig: {
        __typename?: 'EventGig'
        canApply: boolean
        id: string
        eventId: string
        roleId: string
        title: string
        description?: string | null
        slotsAvailable: number
        slotsFilled: number
        danzReward: number
        bonusDanz?: number | null
        timeCommitment?: string | null
        specificRequirements?: string | null
        status: EventGigStatus
        createdAt: any
        role: {
          __typename?: 'GigRole'
          id: string
          name: string
          slug: string
          description?: string | null
          category: GigRoleCategory
          tier: number
          icon?: string | null
          baseDanzRate: number
          requiresVerification: boolean
          isActive: boolean
        }
        event?: {
          __typename?: 'Event'
          id: string
          title: string
          start_date_time: any
          end_date_time: any
          location_name: string
          location_city?: string | null
        } | null
        myApplication?: {
          __typename?: 'GigApplication'
          id: string
          status: GigApplicationStatus
        } | null
      }
    }>
    recentHistory: Array<{
      __typename?: 'GigApplication'
      id: string
      gigId: string
      userId: string
      status: GigApplicationStatus
      applicationNote?: string | null
      danzAwarded?: number | null
      createdAt: any
      gig: {
        __typename?: 'EventGig'
        canApply: boolean
        id: string
        eventId: string
        roleId: string
        title: string
        description?: string | null
        slotsAvailable: number
        slotsFilled: number
        danzReward: number
        bonusDanz?: number | null
        timeCommitment?: string | null
        specificRequirements?: string | null
        status: EventGigStatus
        createdAt: any
        role: {
          __typename?: 'GigRole'
          id: string
          name: string
          slug: string
          description?: string | null
          category: GigRoleCategory
          tier: number
          icon?: string | null
          baseDanzRate: number
          requiresVerification: boolean
          isActive: boolean
        }
        event?: {
          __typename?: 'Event'
          id: string
          title: string
          start_date_time: any
          end_date_time: any
          location_name: string
          location_city?: string | null
        } | null
        myApplication?: {
          __typename?: 'GigApplication'
          id: string
          status: GigApplicationStatus
        } | null
      }
    }>
  }
}

export type GetAvailableGigsForMeQueryVariables = Exact<{
  eventId?: InputMaybe<Scalars['ID']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetAvailableGigsForMeQuery = {
  __typename?: 'Query'
  availableGigsForMe: Array<{
    __typename?: 'EventGig'
    canApply: boolean
    id: string
    eventId: string
    roleId: string
    title: string
    description?: string | null
    slotsAvailable: number
    slotsFilled: number
    danzReward: number
    bonusDanz?: number | null
    timeCommitment?: string | null
    specificRequirements?: string | null
    status: EventGigStatus
    createdAt: any
    role: {
      __typename?: 'GigRole'
      id: string
      name: string
      slug: string
      description?: string | null
      category: GigRoleCategory
      tier: number
      icon?: string | null
      baseDanzRate: number
      requiresVerification: boolean
      isActive: boolean
    }
    event?: {
      __typename?: 'Event'
      id: string
      title: string
      start_date_time: any
      end_date_time: any
      location_name: string
      location_city?: string | null
    } | null
    myApplication?: {
      __typename?: 'GigApplication'
      id: string
      status: GigApplicationStatus
    } | null
  }>
}

export type GetGigManagerDashboardQueryVariables = Exact<{ [key: string]: never }>

export type GetGigManagerDashboardQuery = {
  __typename?: 'Query'
  gigManagerDashboard: {
    __typename?: 'GigManagerDashboard'
    pendingGigApplications: Array<{
      __typename?: 'GigApplication'
      id: string
      gigId: string
      userId: string
      status: GigApplicationStatus
      applicationNote?: string | null
      createdAt: any
      user: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
      }
      gig: {
        __typename?: 'EventGig'
        id: string
        eventId: string
        roleId: string
        title: string
        description?: string | null
        danzReward: number
        role: {
          __typename?: 'GigRole'
          id: string
          name: string
          slug: string
          icon?: string | null
          category: GigRoleCategory
        }
        event?: {
          __typename?: 'Event'
          id: string
          title: string
          start_date_time: any
          location_name: string
        } | null
      }
    }>
    stats: {
      __typename?: 'GigManagerStats'
      totalReviewed: number
      approvedCount: number
      rejectedCount: number
      averageReviewTime?: number | null
      todayReviewed: number
    }
  }
}

export type GetGlobalLeaderboardQueryVariables = Exact<{
  metric: LeaderboardMetric
  limit?: InputMaybe<Scalars['Int']['input']>
}>

export type GetGlobalLeaderboardQuery = {
  __typename?: 'Query'
  globalLeaderboard: {
    __typename?: 'Leaderboard'
    type: LeaderboardType
    metric: LeaderboardMetric
    period: string
    updated_at: any
    total_participants: number
    entries: Array<{
      __typename?: 'LeaderboardEntry'
      rank: number
      previous_rank?: number | null
      rank_change?: number | null
      user_id: string
      username: string
      display_name?: string | null
      avatar_url?: string | null
      level: number
      value: number
      is_current_user: boolean
      country?: string | null
    }>
    current_user_entry?: {
      __typename?: 'LeaderboardEntry'
      rank: number
      value: number
      is_current_user: boolean
    } | null
    nearby_entries?: Array<{
      __typename?: 'LeaderboardEntry'
      rank: number
      username: string
      avatar_url?: string | null
      value: number
      is_current_user: boolean
    }> | null
  }
}

export type GetWeeklyLeaderboardQueryVariables = Exact<{
  metric: LeaderboardMetric
  limit?: InputMaybe<Scalars['Int']['input']>
}>

export type GetWeeklyLeaderboardQuery = {
  __typename?: 'Query'
  weeklyLeaderboard: {
    __typename?: 'Leaderboard'
    type: LeaderboardType
    metric: LeaderboardMetric
    period: string
    total_participants: number
    entries: Array<{
      __typename?: 'LeaderboardEntry'
      rank: number
      user_id: string
      username: string
      display_name?: string | null
      avatar_url?: string | null
      level: number
      value: number
      is_current_user: boolean
    }>
    current_user_entry?: { __typename?: 'LeaderboardEntry'; rank: number; value: number } | null
  }
}

export type GetMyLeaderboardSummaryQueryVariables = Exact<{ [key: string]: never }>

export type GetMyLeaderboardSummaryQuery = {
  __typename?: 'Query'
  myLeaderboardSummary: {
    __typename?: 'LeaderboardSummary'
    global_rank?: number | null
    regional_rank?: number | null
    friends_rank?: number | null
    weekly_change?: number | null
    top_metric?: LeaderboardMetric | null
    top_metric_rank?: number | null
    percentile?: number | null
  }
}

export type GetMyNotificationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  type?: InputMaybe<NotificationType>
  unread_only?: InputMaybe<Scalars['Boolean']['input']>
}>

export type GetMyNotificationsQuery = {
  __typename?: 'Query'
  myNotifications: {
    __typename?: 'NotificationConnection'
    has_more: boolean
    total_count: number
    unread_count: number
    notifications: Array<{
      __typename?: 'Notification'
      id: string
      title: string
      message: string
      type: NotificationType
      read: boolean
      created_at: any
      action_type?: ActionType | null
      action_data?: any | null
      event_id?: string | null
      post_id?: string | null
      achievement_id?: string | null
      bond_id?: string | null
      sender?: {
        __typename?: 'User'
        privy_id: string
        display_name?: string | null
        username?: string | null
        avatar_url?: string | null
      } | null
      event?: { __typename?: 'Event'; id: string; title: string } | null
    }>
  }
}

export type GetUnreadNotificationCountQueryVariables = Exact<{ [key: string]: never }>

export type GetUnreadNotificationCountQuery = {
  __typename?: 'Query'
  unreadNotificationCount: number
}

export type GetMyPrivacySettingsQueryVariables = Exact<{ [key: string]: never }>

export type GetMyPrivacySettingsQuery = {
  __typename?: 'Query'
  myPrivacySettings: {
    __typename?: 'PrivacySettings'
    id: string
    user_id: string
    profile_visibility: ProfileVisibility
    show_real_name: boolean
    show_bio: boolean
    show_avatar: boolean
    show_city: boolean
    show_dance_styles: boolean
    show_stats: boolean
    show_badges: boolean
    show_events_attending: boolean
    show_events_attended: boolean
    show_check_ins: boolean
    show_leaderboard_rank: boolean
    show_posts: boolean
    show_likes: boolean
    show_comments: boolean
    searchable_by_username: boolean
    appear_in_suggestions: boolean
    appear_in_event_attendees: boolean
    appear_in_nearby: boolean
    allow_bond_requests: AllowBondRequestsFrom
    allow_messages: AllowMessagesFrom
    allow_event_invites: boolean
    notify_bonds_on_check_in: boolean
    notify_bonds_on_achievement: boolean
    updated_at?: any | null
  }
}

export type GetPrivacyPresetsQueryVariables = Exact<{ [key: string]: never }>

export type GetPrivacyPresetsQuery = {
  __typename?: 'Query'
  privacyPresets: Array<{
    __typename?: 'PrivacyPreset'
    name: string
    description: string
    profile_visibility: ProfileVisibility
    searchable: boolean
    appear_in_suggestions: boolean
    allow_messages: AllowMessagesFrom
  }>
}

export type GetSuggestedUsersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetSuggestedUsersQuery = {
  __typename?: 'Query'
  suggestedUsers: {
    __typename?: 'UserSuggestionConnection'
    total_count: number
    has_more: boolean
    suggestions: Array<{
      __typename?: 'UserSuggestion'
      id: string
      source: SuggestionSource
      score: number
      reason: string
      created_at: any
      user: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        city?: string | null
      }
    }>
  }
}

export type SearchUsersQueryVariables = Exact<{
  input: SearchUsersInput
}>

export type SearchUsersQuery = {
  __typename?: 'Query'
  searchUsers: {
    __typename?: 'UserSearchConnection'
    total_count: number
    has_more: boolean
    results: Array<{
      __typename?: 'UserSearchResult'
      can_view_profile: boolean
      can_message: boolean
      is_bond: boolean
      mutual_bonds_count: number
      user: {
        __typename?: 'User'
        privy_id: string
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        city?: string | null
      }
    }>
  }
}

export type CanViewProfileQueryVariables = Exact<{
  userId: Scalars['String']['input']
}>

export type CanViewProfileQuery = {
  __typename?: 'Query'
  canViewProfile: { __typename?: 'CanViewResult'; can_view: boolean; reason?: string | null }
}

export type CanMessageUserQueryVariables = Exact<{
  userId: Scalars['String']['input']
}>

export type CanMessageUserQuery = {
  __typename?: 'Query'
  canMessageUser: { __typename?: 'CanViewResult'; can_view: boolean; reason?: string | null }
}

export type GetMyBondsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetMyBondsQuery = {
  __typename?: 'Query'
  myBonds: Array<{
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    city?: string | null
  }>
}

export type GetMyReferralStatsQueryVariables = Exact<{ [key: string]: never }>

export type GetMyReferralStatsQuery = {
  __typename?: 'Query'
  myReferralStats: {
    __typename?: 'ReferralStats'
    total_signups: number
    total_completed: number
    total_clicks: number
    total_points_earned: number
    pending_referrals: number
    completed_referrals: number
    conversion_rate: number
  }
  myReferralCode?: {
    __typename?: 'ReferralCode'
    id: string
    referral_code: string
    share_url: string
    total_clicks: number
    total_signups: number
    total_completed: number
    created_at: any
  } | null
}

export type GetMyReferralsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<ReferralStatus>
}>

export type GetMyReferralsQuery = {
  __typename?: 'Query'
  myReferrals: Array<{
    __typename?: 'Referral'
    id: string
    referral_code: string
    status: ReferralStatus
    points_awarded: number
    clicked_at: any
    completed_at?: any | null
    signed_up_at?: any | null
    first_session_completed_at?: any | null
    referee?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    } | null
  }>
}

export type GetReferralChainQueryVariables = Exact<{
  userId?: InputMaybe<Scalars['String']['input']>
}>

export type GetReferralChainQuery = {
  __typename?: 'Query'
  getReferralChain: Array<{
    __typename?: 'ReferralChainNode'
    user_id: string
    username?: string | null
    invited_by?: string | null
    depth: number
  }>
}

export type GetUserTransactionsQueryVariables = Exact<{
  user_id: Scalars['String']['input']
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<TransactionStatus>
}>

export type GetUserTransactionsQuery = {
  __typename?: 'Query'
  getUserTransactions: {
    __typename?: 'TransactionHistory'
    has_more: boolean
    total_count: number
    transactions: Array<{
      __typename?: 'PointTransaction'
      id: string
      action_key: string
      points_amount: number
      status: TransactionStatus
      transaction_type: TransactionType
      created_at: any
      reference_id?: string | null
      reference_type?: ReferenceType | null
      metadata?: any | null
      action?: {
        __typename?: 'PointAction'
        id: string
        action_name: string
        description?: string | null
        points_value: number
      } | null
    }>
  }
}

export type GetUploadUrlQueryVariables = Exact<{
  fileName: Scalars['String']['input']
  mimeType: MimeType
  uploadType: UploadType
}>

export type GetUploadUrlQuery = {
  __typename?: 'Query'
  getUploadUrl: {
    __typename?: 'UploadUrl'
    success: boolean
    uploadUrl: string
    fields: any
    key: string
    publicUrl: string
    expires: number
    maxSize: number
  }
}

export type GetMyProfileQueryVariables = Exact<{ [key: string]: never }>

export type GetMyProfileQuery = {
  __typename?: 'Query'
  me?: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
    location?: string | null
    city?: string | null
    latitude?: number | null
    longitude?: number | null
    website?: string | null
    website_url?: string | null
    instagram?: string | null
    tiktok?: string | null
    youtube?: string | null
    twitter?: string | null
    pronouns?: string | null
    dance_styles?: Array<string> | null
    skill_level?: SkillLevel | null
    favorite_music?: Array<string> | null
    age?: number | null
    is_public?: boolean | null
    allow_messages?: boolean | null
    show_location?: boolean | null
    notification_preferences?: any | null
    xp?: number | null
    level?: number | null
    subscription_tier?: string | null
    total_dance_time?: number | null
    total_sessions?: number | null
    longest_streak?: number | null
    is_organizer_approved?: boolean | null
    organizer_approved_by?: string | null
    organizer_approved_at?: any | null
    company_name?: string | null
    organizer_bio?: string | null
    event_types?: Array<string> | null
    invited_by?: string | null
    social_media_links?: any | null
    organizer_requested_at?: any | null
    organizer_rejection_reason?: string | null
    total_events_attended?: number | null
    total_events_created?: number | null
    upcoming_events_count?: number | null
    total_achievements?: number | null
    dance_bonds_count?: number | null
    created_at?: any | null
    updated_at?: any | null
    last_active_at?: any | null
  } | null
}

export type GetUserByIdQueryVariables = Exact<{
  id: Scalars['String']['input']
}>

export type GetUserByIdQuery = {
  __typename?: 'Query'
  user?: {
    __typename?: 'User'
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    bio?: string | null
    role?: UserRole | null
    location?: string | null
    city?: string | null
    latitude?: number | null
    longitude?: number | null
    website?: string | null
    website_url?: string | null
    instagram?: string | null
    tiktok?: string | null
    youtube?: string | null
    twitter?: string | null
    pronouns?: string | null
    dance_styles?: Array<string> | null
    skill_level?: SkillLevel | null
    favorite_music?: Array<string> | null
    age?: number | null
    is_public?: boolean | null
    allow_messages?: boolean | null
    show_location?: boolean | null
    notification_preferences?: any | null
    xp?: number | null
    level?: number | null
    subscription_tier?: string | null
    total_dance_time?: number | null
    total_sessions?: number | null
    longest_streak?: number | null
    is_organizer_approved?: boolean | null
    organizer_approved_by?: string | null
    organizer_approved_at?: any | null
    company_name?: string | null
    organizer_bio?: string | null
    event_types?: Array<string> | null
    invited_by?: string | null
    social_media_links?: any | null
    organizer_requested_at?: any | null
    organizer_rejection_reason?: string | null
    total_events_attended?: number | null
    total_events_created?: number | null
    upcoming_events_count?: number | null
    total_achievements?: number | null
    dance_bonds_count?: number | null
    created_at?: any | null
    updated_at?: any | null
    last_active_at?: any | null
  } | null
}

export type GetUsersQueryVariables = Exact<{
  filter?: InputMaybe<UserFilterInput>
  pagination?: InputMaybe<PaginationInput>
}>

export type GetUsersQuery = {
  __typename?: 'Query'
  users: {
    __typename?: 'UserConnection'
    totalCount: number
    users: Array<{
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type CheckUsernameQueryVariables = Exact<{
  username: Scalars['String']['input']
}>

export type CheckUsernameQuery = { __typename?: 'Query'; checkUsername: boolean }

export type GetMyDanceBondsQueryVariables = Exact<{ [key: string]: never }>

export type GetMyDanceBondsQuery = {
  __typename?: 'Query'
  myDanceBonds: Array<{
    __typename?: 'DanceBond'
    id: string
    user1_id: string
    user2_id: string
    bond_level: number
    shared_sessions?: number | null
    created_at: any
    updated_at: any
    otherUser?: {
      __typename?: 'User'
      privy_id: string
      username?: string | null
      display_name?: string | null
      avatar_url?: string | null
      cover_image_url?: string | null
      bio?: string | null
      role?: UserRole | null
    } | null
  }>
}

export const EventBasicInfoFragmentDoc = gql`
    fragment EventBasicInfo on Event {
  id
  title
  description
  category
  image_url
  location_name
  location_address
  location_city
  location_latitude
  location_longitude
  start_date_time
  end_date_time
  price_usd
  price_danz
  skill_level
  is_virtual
  is_featured
  status
  registration_count
  is_recurring
  recurrence_type
}
    `
export const UserOrganizerInfoFragmentDoc = gql`
    fragment UserOrganizerInfo on User {
  privy_id
  username
  display_name
  avatar_url
  cover_image_url
  bio
  role
  is_organizer_approved
  company_name
  organizer_bio
  event_types
  website
  website_url
  location
  city
  dance_styles
  skill_level
}
    `
export const EventFullInfoFragmentDoc = gql`
    fragment EventFullInfo on Event {
  id
  title
  description
  category
  image_url
  location_name
  location_address
  location_city
  location_latitude
  location_longitude
  facilitator_id
  facilitator {
    ...UserOrganizerInfo
  }
  max_capacity
  current_capacity
  price_usd
  price_danz
  is_featured
  skill_level
  is_virtual
  virtual_link
  requirements
  tags
  dance_styles
  currency
  start_date_time
  end_date_time
  created_at
  updated_at
  status
  is_registered
  user_registration_status
  distance
  registration_count
  is_recurring
  recurrence_type
  recurrence_end_date
  recurrence_days
  recurrence_count
  parent_event_id
}
    ${UserOrganizerInfoFragmentDoc}`
export const UserBasicInfoFragmentDoc = gql`
    fragment UserBasicInfo on User {
  privy_id
  username
  display_name
  avatar_url
  cover_image_url
  bio
  role
}
    `
export const EventWithParticipantsFragmentDoc = gql`
    fragment EventWithParticipants on Event {
  ...EventFullInfo
  participants {
    id
    user_id
    status
    registration_date
    payment_status
    user {
      ...UserBasicInfo
    }
  }
}
    ${EventFullInfoFragmentDoc}
${UserBasicInfoFragmentDoc}`
export const GigApplicationBasicFragmentDoc = gql`
    fragment GigApplicationBasic on GigApplication {
  id
  gigId
  userId
  status
  applicationNote
  danzAwarded
  createdAt
}
    `
export const EventGigBasicFragmentDoc = gql`
    fragment EventGigBasic on EventGig {
  id
  eventId
  roleId
  title
  description
  slotsAvailable
  slotsFilled
  danzReward
  bonusDanz
  timeCommitment
  specificRequirements
  status
  createdAt
}
    `
export const GigRoleBasicFragmentDoc = gql`
    fragment GigRoleBasic on GigRole {
  id
  name
  slug
  description
  category
  tier
  icon
  baseDanzRate
  requiresVerification
  isActive
}
    `
export const EventGigFullFragmentDoc = gql`
    fragment EventGigFull on EventGig {
  ...EventGigBasic
  role {
    ...GigRoleBasic
  }
  event {
    id
    title
    start_date_time
    end_date_time
    location_name
    location_city
  }
  canApply
  myApplication {
    id
    status
  }
}
    ${EventGigBasicFragmentDoc}
${GigRoleBasicFragmentDoc}`
export const GigApplicationWithGigFragmentDoc = gql`
    fragment GigApplicationWithGig on GigApplication {
  ...GigApplicationBasic
  gig {
    ...EventGigFull
  }
}
    ${GigApplicationBasicFragmentDoc}
${EventGigFullFragmentDoc}`
export const GigStatsBasicFragmentDoc = gql`
    fragment GigStatsBasic on GigStats {
  totalGigsCompleted
  totalDanzEarned
  activeRoles
  currentApprovedGigs
  pendingApplications
  averageRating
  lastGigDate
}
    `
export const PostBasicInfoFragmentDoc = gql`
    fragment PostBasicInfo on Post {
  id
  user_id
  content
  media_url
  media_type
  event_id
  location
  is_public
  likes_count
  comments_count
  is_liked_by_me
  created_at
  updated_at
}
    `
export const PostWithUserFragmentDoc = gql`
    fragment PostWithUser on Post {
  ...PostBasicInfo
  user {
    ...UserBasicInfo
  }
}
    ${PostBasicInfoFragmentDoc}
${UserBasicInfoFragmentDoc}`
export const PostLikeFragmentDoc = gql`
    fragment PostLike on PostLike {
  id
  post_id
  user_id
  created_at
  user {
    ...UserBasicInfo
  }
}
    ${UserBasicInfoFragmentDoc}`
export const PostCommentFragmentDoc = gql`
    fragment PostComment on PostComment {
  id
  post_id
  user_id
  content
  created_at
  updated_at
  user {
    ...UserBasicInfo
  }
}
    ${UserBasicInfoFragmentDoc}`
export const PostWithDetailsFragmentDoc = gql`
    fragment PostWithDetails on PostWithDetails {
  id
  user_id
  content
  media_url
  media_type
  event_id
  location
  is_public
  likes_count
  comments_count
  is_liked_by_me
  created_at
  updated_at
  user {
    ...UserBasicInfo
  }
  likes {
    ...PostLike
  }
  comments {
    ...PostComment
  }
}
    ${UserBasicInfoFragmentDoc}
${PostLikeFragmentDoc}
${PostCommentFragmentDoc}`
export const UserFullInfoFragmentDoc = gql`
    fragment UserFullInfo on User {
  privy_id
  username
  display_name
  avatar_url
  cover_image_url
  bio
  role
  location
  city
  latitude
  longitude
  website
  website_url
  instagram
  tiktok
  youtube
  twitter
  pronouns
  dance_styles
  skill_level
  favorite_music
  age
  is_public
  allow_messages
  show_location
  notification_preferences
  xp
  level
  subscription_tier
  total_dance_time
  total_sessions
  longest_streak
  is_organizer_approved
  organizer_approved_by
  organizer_approved_at
  company_name
  organizer_bio
  event_types
  invited_by
  social_media_links
  organizer_requested_at
  organizer_rejection_reason
  total_events_attended
  total_events_created
  upcoming_events_count
  total_achievements
  dance_bonds_count
  created_at
  updated_at
  last_active_at
}
    `
export const CreateFreestyleSessionDocument = gql`
    mutation CreateFreestyleSession($input: CreateFreestyleSessionInput!) {
  createFreestyleSession(input: $input) {
    id
    user_id
    duration_seconds
    movement_score
    points_awarded
    music_source
    completed
    session_date
    created_at
    achievements_unlocked
  }
}
    `
export type CreateFreestyleSessionMutationFn = Apollo.MutationFunction<
  CreateFreestyleSessionMutation,
  CreateFreestyleSessionMutationVariables
>

/**
 * __useCreateFreestyleSessionMutation__
 *
 * To run a mutation, you first call `useCreateFreestyleSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFreestyleSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFreestyleSessionMutation, { data, loading, error }] = useCreateFreestyleSessionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateFreestyleSessionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateFreestyleSessionMutation,
    CreateFreestyleSessionMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<
    CreateFreestyleSessionMutation,
    CreateFreestyleSessionMutationVariables
  >(CreateFreestyleSessionDocument, options)
}
export type CreateFreestyleSessionMutationHookResult = ReturnType<
  typeof useCreateFreestyleSessionMutation
>
export type CreateFreestyleSessionMutationResult =
  Apollo.MutationResult<CreateFreestyleSessionMutation>
export type CreateFreestyleSessionMutationOptions = Apollo.BaseMutationOptions<
  CreateFreestyleSessionMutation,
  CreateFreestyleSessionMutationVariables
>
export const UpdateFreestylePreferencesDocument = gql`
    mutation UpdateFreestylePreferences($input: UpdateUserPreferencesInput!) {
  updateFreestylePreferences(input: $input) {
    daily_reminder_enabled
    daily_reminder_time
    live_sessions_enabled
  }
}
    `
export type UpdateFreestylePreferencesMutationFn = Apollo.MutationFunction<
  UpdateFreestylePreferencesMutation,
  UpdateFreestylePreferencesMutationVariables
>

/**
 * __useUpdateFreestylePreferencesMutation__
 *
 * To run a mutation, you first call `useUpdateFreestylePreferencesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFreestylePreferencesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFreestylePreferencesMutation, { data, loading, error }] = useUpdateFreestylePreferencesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateFreestylePreferencesMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateFreestylePreferencesMutation,
    UpdateFreestylePreferencesMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<
    UpdateFreestylePreferencesMutation,
    UpdateFreestylePreferencesMutationVariables
  >(UpdateFreestylePreferencesDocument, options)
}
export type UpdateFreestylePreferencesMutationHookResult = ReturnType<
  typeof useUpdateFreestylePreferencesMutation
>
export type UpdateFreestylePreferencesMutationResult =
  Apollo.MutationResult<UpdateFreestylePreferencesMutation>
export type UpdateFreestylePreferencesMutationOptions = Apollo.BaseMutationOptions<
  UpdateFreestylePreferencesMutation,
  UpdateFreestylePreferencesMutationVariables
>
export const CheckAchievementsDocument = gql`
    mutation CheckAchievements {
  checkAchievements {
    newly_unlocked {
      id
      achievement_type
      title
      description
      icon
      category
      rarity
      xp_reward
      danz_reward
      unlocked_at
      is_unlocked
    }
    total_xp_earned
    total_danz_earned
  }
}
    `
export type CheckAchievementsMutationFn = Apollo.MutationFunction<
  CheckAchievementsMutation,
  CheckAchievementsMutationVariables
>

/**
 * __useCheckAchievementsMutation__
 *
 * To run a mutation, you first call `useCheckAchievementsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCheckAchievementsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [checkAchievementsMutation, { data, loading, error }] = useCheckAchievementsMutation({
 *   variables: {
 *   },
 * });
 */
export function useCheckAchievementsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CheckAchievementsMutation,
    CheckAchievementsMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CheckAchievementsMutation, CheckAchievementsMutationVariables>(
    CheckAchievementsDocument,
    options,
  )
}
export type CheckAchievementsMutationHookResult = ReturnType<typeof useCheckAchievementsMutation>
export type CheckAchievementsMutationResult = Apollo.MutationResult<CheckAchievementsMutation>
export type CheckAchievementsMutationOptions = Apollo.BaseMutationOptions<
  CheckAchievementsMutation,
  CheckAchievementsMutationVariables
>
export const ClaimAchievementRewardDocument = gql`
    mutation ClaimAchievementReward($achievementType: String!) {
  claimAchievementReward(achievementType: $achievementType) {
    id
    achievement_type
    title
    description
    icon
    category
    rarity
    xp_reward
    danz_reward
    unlocked_at
  }
}
    `
export type ClaimAchievementRewardMutationFn = Apollo.MutationFunction<
  ClaimAchievementRewardMutation,
  ClaimAchievementRewardMutationVariables
>

/**
 * __useClaimAchievementRewardMutation__
 *
 * To run a mutation, you first call `useClaimAchievementRewardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useClaimAchievementRewardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [claimAchievementRewardMutation, { data, loading, error }] = useClaimAchievementRewardMutation({
 *   variables: {
 *      achievementType: // value for 'achievementType'
 *   },
 * });
 */
export function useClaimAchievementRewardMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ClaimAchievementRewardMutation,
    ClaimAchievementRewardMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<
    ClaimAchievementRewardMutation,
    ClaimAchievementRewardMutationVariables
  >(ClaimAchievementRewardDocument, options)
}
export type ClaimAchievementRewardMutationHookResult = ReturnType<
  typeof useClaimAchievementRewardMutation
>
export type ClaimAchievementRewardMutationResult =
  Apollo.MutationResult<ClaimAchievementRewardMutation>
export type ClaimAchievementRewardMutationOptions = Apollo.BaseMutationOptions<
  ClaimAchievementRewardMutation,
  ClaimAchievementRewardMutationVariables
>
export const SendBondRequestDocument = gql`
    mutation SendBondRequest($input: SendBondRequestInput!) {
  sendBondRequest(input: $input) {
    id
    requester {
      ...UserBasicInfo
    }
    recipient {
      ...UserBasicInfo
    }
    status
    message
    match_reasons {
      mutual_bonds
      same_events
      music_overlap
      dance_styles
      similarity_score
    }
    created_at
    expires_at
  }
}
    ${UserBasicInfoFragmentDoc}`
export type SendBondRequestMutationFn = Apollo.MutationFunction<
  SendBondRequestMutation,
  SendBondRequestMutationVariables
>

/**
 * __useSendBondRequestMutation__
 *
 * To run a mutation, you first call `useSendBondRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendBondRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendBondRequestMutation, { data, loading, error }] = useSendBondRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendBondRequestMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SendBondRequestMutation,
    SendBondRequestMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<SendBondRequestMutation, SendBondRequestMutationVariables>(
    SendBondRequestDocument,
    options,
  )
}
export type SendBondRequestMutationHookResult = ReturnType<typeof useSendBondRequestMutation>
export type SendBondRequestMutationResult = Apollo.MutationResult<SendBondRequestMutation>
export type SendBondRequestMutationOptions = Apollo.BaseMutationOptions<
  SendBondRequestMutation,
  SendBondRequestMutationVariables
>
export const RespondToBondRequestDocument = gql`
    mutation RespondToBondRequest($input: RespondToBondRequestInput!) {
  respondToBondRequest(input: $input) {
    id
    requester {
      ...UserBasicInfo
    }
    recipient {
      ...UserBasicInfo
    }
    status
    message
    responded_at
  }
}
    ${UserBasicInfoFragmentDoc}`
export type RespondToBondRequestMutationFn = Apollo.MutationFunction<
  RespondToBondRequestMutation,
  RespondToBondRequestMutationVariables
>

/**
 * __useRespondToBondRequestMutation__
 *
 * To run a mutation, you first call `useRespondToBondRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRespondToBondRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [respondToBondRequestMutation, { data, loading, error }] = useRespondToBondRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRespondToBondRequestMutation(
  baseOptions?: Apollo.MutationHookOptions<
    RespondToBondRequestMutation,
    RespondToBondRequestMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<RespondToBondRequestMutation, RespondToBondRequestMutationVariables>(
    RespondToBondRequestDocument,
    options,
  )
}
export type RespondToBondRequestMutationHookResult = ReturnType<
  typeof useRespondToBondRequestMutation
>
export type RespondToBondRequestMutationResult = Apollo.MutationResult<RespondToBondRequestMutation>
export type RespondToBondRequestMutationOptions = Apollo.BaseMutationOptions<
  RespondToBondRequestMutation,
  RespondToBondRequestMutationVariables
>
export const CancelBondRequestDocument = gql`
    mutation CancelBondRequest($requestId: ID!) {
  cancelBondRequest(request_id: $requestId)
}
    `
export type CancelBondRequestMutationFn = Apollo.MutationFunction<
  CancelBondRequestMutation,
  CancelBondRequestMutationVariables
>

/**
 * __useCancelBondRequestMutation__
 *
 * To run a mutation, you first call `useCancelBondRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelBondRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelBondRequestMutation, { data, loading, error }] = useCancelBondRequestMutation({
 *   variables: {
 *      requestId: // value for 'requestId'
 *   },
 * });
 */
export function useCancelBondRequestMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CancelBondRequestMutation,
    CancelBondRequestMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CancelBondRequestMutation, CancelBondRequestMutationVariables>(
    CancelBondRequestDocument,
    options,
  )
}
export type CancelBondRequestMutationHookResult = ReturnType<typeof useCancelBondRequestMutation>
export type CancelBondRequestMutationResult = Apollo.MutationResult<CancelBondRequestMutation>
export type CancelBondRequestMutationOptions = Apollo.BaseMutationOptions<
  CancelBondRequestMutation,
  CancelBondRequestMutationVariables
>
export const StartChallengeDocument = gql`
    mutation StartChallenge($challengeId: String!) {
  startChallenge(challengeId: $challengeId) {
    id
    challenge_id
    status
    progress
    started_at
    expires_at
    challenge {
      id
      title
      target_value
      xp_reward
    }
  }
}
    `
export type StartChallengeMutationFn = Apollo.MutationFunction<
  StartChallengeMutation,
  StartChallengeMutationVariables
>

/**
 * __useStartChallengeMutation__
 *
 * To run a mutation, you first call `useStartChallengeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartChallengeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startChallengeMutation, { data, loading, error }] = useStartChallengeMutation({
 *   variables: {
 *      challengeId: // value for 'challengeId'
 *   },
 * });
 */
export function useStartChallengeMutation(
  baseOptions?: Apollo.MutationHookOptions<StartChallengeMutation, StartChallengeMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<StartChallengeMutation, StartChallengeMutationVariables>(
    StartChallengeDocument,
    options,
  )
}
export type StartChallengeMutationHookResult = ReturnType<typeof useStartChallengeMutation>
export type StartChallengeMutationResult = Apollo.MutationResult<StartChallengeMutation>
export type StartChallengeMutationOptions = Apollo.BaseMutationOptions<
  StartChallengeMutation,
  StartChallengeMutationVariables
>
export const ClaimChallengeRewardDocument = gql`
    mutation ClaimChallengeReward($challengeId: String!) {
  claimChallengeReward(challengeId: $challengeId) {
    id
    status
    claimed_at
    challenge {
      xp_reward
      points_reward
    }
  }
}
    `
export type ClaimChallengeRewardMutationFn = Apollo.MutationFunction<
  ClaimChallengeRewardMutation,
  ClaimChallengeRewardMutationVariables
>

/**
 * __useClaimChallengeRewardMutation__
 *
 * To run a mutation, you first call `useClaimChallengeRewardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useClaimChallengeRewardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [claimChallengeRewardMutation, { data, loading, error }] = useClaimChallengeRewardMutation({
 *   variables: {
 *      challengeId: // value for 'challengeId'
 *   },
 * });
 */
export function useClaimChallengeRewardMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ClaimChallengeRewardMutation,
    ClaimChallengeRewardMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<ClaimChallengeRewardMutation, ClaimChallengeRewardMutationVariables>(
    ClaimChallengeRewardDocument,
    options,
  )
}
export type ClaimChallengeRewardMutationHookResult = ReturnType<
  typeof useClaimChallengeRewardMutation
>
export type ClaimChallengeRewardMutationResult = Apollo.MutationResult<ClaimChallengeRewardMutation>
export type ClaimChallengeRewardMutationOptions = Apollo.BaseMutationOptions<
  ClaimChallengeRewardMutation,
  ClaimChallengeRewardMutationVariables
>
export const AbandonChallengeDocument = gql`
    mutation AbandonChallenge($challengeId: String!) {
  abandonChallenge(challengeId: $challengeId) {
    success
    message
  }
}
    `
export type AbandonChallengeMutationFn = Apollo.MutationFunction<
  AbandonChallengeMutation,
  AbandonChallengeMutationVariables
>

/**
 * __useAbandonChallengeMutation__
 *
 * To run a mutation, you first call `useAbandonChallengeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAbandonChallengeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [abandonChallengeMutation, { data, loading, error }] = useAbandonChallengeMutation({
 *   variables: {
 *      challengeId: // value for 'challengeId'
 *   },
 * });
 */
export function useAbandonChallengeMutation(
  baseOptions?: Apollo.MutationHookOptions<
    AbandonChallengeMutation,
    AbandonChallengeMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<AbandonChallengeMutation, AbandonChallengeMutationVariables>(
    AbandonChallengeDocument,
    options,
  )
}
export type AbandonChallengeMutationHookResult = ReturnType<typeof useAbandonChallengeMutation>
export type AbandonChallengeMutationResult = Apollo.MutationResult<AbandonChallengeMutation>
export type AbandonChallengeMutationOptions = Apollo.BaseMutationOptions<
  AbandonChallengeMutation,
  AbandonChallengeMutationVariables
>
export const CheckInWithCodeDocument = gql`
    mutation CheckInWithCode($code: String!) {
  checkInWithCode(code: $code) {
    success
    message
    event {
      id
      title
      location_name
      start_date_time
      end_date_time
      checkin_code
      facilitator {
        privy_id
        display_name
        username
      }
    }
    registration {
      id
      checked_in
      check_in_time
      status
    }
  }
}
    `
export type CheckInWithCodeMutationFn = Apollo.MutationFunction<
  CheckInWithCodeMutation,
  CheckInWithCodeMutationVariables
>

/**
 * __useCheckInWithCodeMutation__
 *
 * To run a mutation, you first call `useCheckInWithCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCheckInWithCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [checkInWithCodeMutation, { data, loading, error }] = useCheckInWithCodeMutation({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useCheckInWithCodeMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CheckInWithCodeMutation,
    CheckInWithCodeMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CheckInWithCodeMutation, CheckInWithCodeMutationVariables>(
    CheckInWithCodeDocument,
    options,
  )
}
export type CheckInWithCodeMutationHookResult = ReturnType<typeof useCheckInWithCodeMutation>
export type CheckInWithCodeMutationResult = Apollo.MutationResult<CheckInWithCodeMutation>
export type CheckInWithCodeMutationOptions = Apollo.BaseMutationOptions<
  CheckInWithCodeMutation,
  CheckInWithCodeMutationVariables
>
export const RegenerateCheckinCodeDocument = gql`
    mutation RegenerateCheckinCode($eventId: ID!) {
  regenerateCheckinCode(eventId: $eventId) {
    id
    title
    checkin_code
  }
}
    `
export type RegenerateCheckinCodeMutationFn = Apollo.MutationFunction<
  RegenerateCheckinCodeMutation,
  RegenerateCheckinCodeMutationVariables
>

/**
 * __useRegenerateCheckinCodeMutation__
 *
 * To run a mutation, you first call `useRegenerateCheckinCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegenerateCheckinCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [regenerateCheckinCodeMutation, { data, loading, error }] = useRegenerateCheckinCodeMutation({
 *   variables: {
 *      eventId: // value for 'eventId'
 *   },
 * });
 */
export function useRegenerateCheckinCodeMutation(
  baseOptions?: Apollo.MutationHookOptions<
    RegenerateCheckinCodeMutation,
    RegenerateCheckinCodeMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<RegenerateCheckinCodeMutation, RegenerateCheckinCodeMutationVariables>(
    RegenerateCheckinCodeDocument,
    options,
  )
}
export type RegenerateCheckinCodeMutationHookResult = ReturnType<
  typeof useRegenerateCheckinCodeMutation
>
export type RegenerateCheckinCodeMutationResult =
  Apollo.MutationResult<RegenerateCheckinCodeMutation>
export type RegenerateCheckinCodeMutationOptions = Apollo.BaseMutationOptions<
  RegenerateCheckinCodeMutation,
  RegenerateCheckinCodeMutationVariables
>
export const CreateEventDocument = gql`
    mutation CreateEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    ...EventFullInfo
  }
}
    ${EventFullInfoFragmentDoc}`
export type CreateEventMutationFn = Apollo.MutationFunction<
  CreateEventMutation,
  CreateEventMutationVariables
>

/**
 * __useCreateEventMutation__
 *
 * To run a mutation, you first call `useCreateEventMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateEventMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createEventMutation, { data, loading, error }] = useCreateEventMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateEventMutation(
  baseOptions?: Apollo.MutationHookOptions<CreateEventMutation, CreateEventMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CreateEventMutation, CreateEventMutationVariables>(
    CreateEventDocument,
    options,
  )
}
export type CreateEventMutationHookResult = ReturnType<typeof useCreateEventMutation>
export type CreateEventMutationResult = Apollo.MutationResult<CreateEventMutation>
export type CreateEventMutationOptions = Apollo.BaseMutationOptions<
  CreateEventMutation,
  CreateEventMutationVariables
>
export const UpdateEventDocument = gql`
    mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
  updateEvent(id: $id, input: $input) {
    ...EventFullInfo
  }
}
    ${EventFullInfoFragmentDoc}`
export type UpdateEventMutationFn = Apollo.MutationFunction<
  UpdateEventMutation,
  UpdateEventMutationVariables
>

/**
 * __useUpdateEventMutation__
 *
 * To run a mutation, you first call `useUpdateEventMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateEventMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateEventMutation, { data, loading, error }] = useUpdateEventMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateEventMutation(
  baseOptions?: Apollo.MutationHookOptions<UpdateEventMutation, UpdateEventMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<UpdateEventMutation, UpdateEventMutationVariables>(
    UpdateEventDocument,
    options,
  )
}
export type UpdateEventMutationHookResult = ReturnType<typeof useUpdateEventMutation>
export type UpdateEventMutationResult = Apollo.MutationResult<UpdateEventMutation>
export type UpdateEventMutationOptions = Apollo.BaseMutationOptions<
  UpdateEventMutation,
  UpdateEventMutationVariables
>
export const DeleteEventDocument = gql`
    mutation DeleteEvent($id: ID!) {
  deleteEvent(id: $id) {
    success
    message
  }
}
    `
export type DeleteEventMutationFn = Apollo.MutationFunction<
  DeleteEventMutation,
  DeleteEventMutationVariables
>

/**
 * __useDeleteEventMutation__
 *
 * To run a mutation, you first call `useDeleteEventMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteEventMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteEventMutation, { data, loading, error }] = useDeleteEventMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteEventMutation(
  baseOptions?: Apollo.MutationHookOptions<DeleteEventMutation, DeleteEventMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<DeleteEventMutation, DeleteEventMutationVariables>(
    DeleteEventDocument,
    options,
  )
}
export type DeleteEventMutationHookResult = ReturnType<typeof useDeleteEventMutation>
export type DeleteEventMutationResult = Apollo.MutationResult<DeleteEventMutation>
export type DeleteEventMutationOptions = Apollo.BaseMutationOptions<
  DeleteEventMutation,
  DeleteEventMutationVariables
>
export const RegisterForEventDocument = gql`
    mutation RegisterForEvent($eventId: ID!, $notes: String) {
  registerForEvent(eventId: $eventId, notes: $notes) {
    id
    event_id
    user_id
    status
    registration_date
    payment_status
    payment_amount
    event {
      ...EventBasicInfo
    }
    user {
      ...UserBasicInfo
    }
  }
}
    ${EventBasicInfoFragmentDoc}
${UserBasicInfoFragmentDoc}`
export type RegisterForEventMutationFn = Apollo.MutationFunction<
  RegisterForEventMutation,
  RegisterForEventMutationVariables
>

/**
 * __useRegisterForEventMutation__
 *
 * To run a mutation, you first call `useRegisterForEventMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterForEventMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerForEventMutation, { data, loading, error }] = useRegisterForEventMutation({
 *   variables: {
 *      eventId: // value for 'eventId'
 *      notes: // value for 'notes'
 *   },
 * });
 */
export function useRegisterForEventMutation(
  baseOptions?: Apollo.MutationHookOptions<
    RegisterForEventMutation,
    RegisterForEventMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<RegisterForEventMutation, RegisterForEventMutationVariables>(
    RegisterForEventDocument,
    options,
  )
}
export type RegisterForEventMutationHookResult = ReturnType<typeof useRegisterForEventMutation>
export type RegisterForEventMutationResult = Apollo.MutationResult<RegisterForEventMutation>
export type RegisterForEventMutationOptions = Apollo.BaseMutationOptions<
  RegisterForEventMutation,
  RegisterForEventMutationVariables
>
export const CancelEventRegistrationDocument = gql`
    mutation CancelEventRegistration($eventId: ID!) {
  cancelEventRegistration(eventId: $eventId) {
    success
    message
  }
}
    `
export type CancelEventRegistrationMutationFn = Apollo.MutationFunction<
  CancelEventRegistrationMutation,
  CancelEventRegistrationMutationVariables
>

/**
 * __useCancelEventRegistrationMutation__
 *
 * To run a mutation, you first call `useCancelEventRegistrationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelEventRegistrationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelEventRegistrationMutation, { data, loading, error }] = useCancelEventRegistrationMutation({
 *   variables: {
 *      eventId: // value for 'eventId'
 *   },
 * });
 */
export function useCancelEventRegistrationMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CancelEventRegistrationMutation,
    CancelEventRegistrationMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<
    CancelEventRegistrationMutation,
    CancelEventRegistrationMutationVariables
  >(CancelEventRegistrationDocument, options)
}
export type CancelEventRegistrationMutationHookResult = ReturnType<
  typeof useCancelEventRegistrationMutation
>
export type CancelEventRegistrationMutationResult =
  Apollo.MutationResult<CancelEventRegistrationMutation>
export type CancelEventRegistrationMutationOptions = Apollo.BaseMutationOptions<
  CancelEventRegistrationMutation,
  CancelEventRegistrationMutationVariables
>
export const CheckInParticipantDocument = gql`
    mutation CheckInParticipant($eventId: ID!, $userId: String!) {
  checkInParticipant(eventId: $eventId, userId: $userId) {
    id
    checked_in
    check_in_time
  }
}
    `
export type CheckInParticipantMutationFn = Apollo.MutationFunction<
  CheckInParticipantMutation,
  CheckInParticipantMutationVariables
>

/**
 * __useCheckInParticipantMutation__
 *
 * To run a mutation, you first call `useCheckInParticipantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCheckInParticipantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [checkInParticipantMutation, { data, loading, error }] = useCheckInParticipantMutation({
 *   variables: {
 *      eventId: // value for 'eventId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useCheckInParticipantMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CheckInParticipantMutation,
    CheckInParticipantMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CheckInParticipantMutation, CheckInParticipantMutationVariables>(
    CheckInParticipantDocument,
    options,
  )
}
export type CheckInParticipantMutationHookResult = ReturnType<typeof useCheckInParticipantMutation>
export type CheckInParticipantMutationResult = Apollo.MutationResult<CheckInParticipantMutation>
export type CheckInParticipantMutationOptions = Apollo.BaseMutationOptions<
  CheckInParticipantMutation,
  CheckInParticipantMutationVariables
>
export const CreatePostDocument = gql`
    mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ...PostBasicInfo
  }
}
    ${PostBasicInfoFragmentDoc}`
export type CreatePostMutationFn = Apollo.MutationFunction<
  CreatePostMutation,
  CreatePostMutationVariables
>

/**
 * __useCreatePostMutation__
 *
 * To run a mutation, you first call `useCreatePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPostMutation, { data, loading, error }] = useCreatePostMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreatePostMutation(
  baseOptions?: Apollo.MutationHookOptions<CreatePostMutation, CreatePostMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CreatePostMutation, CreatePostMutationVariables>(
    CreatePostDocument,
    options,
  )
}
export type CreatePostMutationHookResult = ReturnType<typeof useCreatePostMutation>
export type CreatePostMutationResult = Apollo.MutationResult<CreatePostMutation>
export type CreatePostMutationOptions = Apollo.BaseMutationOptions<
  CreatePostMutation,
  CreatePostMutationVariables
>
export const UpdatePostDocument = gql`
    mutation UpdatePost($postId: ID!, $input: UpdatePostInput!) {
  updatePost(postId: $postId, input: $input) {
    ...PostBasicInfo
  }
}
    ${PostBasicInfoFragmentDoc}`
export type UpdatePostMutationFn = Apollo.MutationFunction<
  UpdatePostMutation,
  UpdatePostMutationVariables
>

/**
 * __useUpdatePostMutation__
 *
 * To run a mutation, you first call `useUpdatePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePostMutation, { data, loading, error }] = useUpdatePostMutation({
 *   variables: {
 *      postId: // value for 'postId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdatePostMutation(
  baseOptions?: Apollo.MutationHookOptions<UpdatePostMutation, UpdatePostMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<UpdatePostMutation, UpdatePostMutationVariables>(
    UpdatePostDocument,
    options,
  )
}
export type UpdatePostMutationHookResult = ReturnType<typeof useUpdatePostMutation>
export type UpdatePostMutationResult = Apollo.MutationResult<UpdatePostMutation>
export type UpdatePostMutationOptions = Apollo.BaseMutationOptions<
  UpdatePostMutation,
  UpdatePostMutationVariables
>
export const DeletePostDocument = gql`
    mutation DeletePost($postId: ID!) {
  deletePost(postId: $postId) {
    success
    message
  }
}
    `
export type DeletePostMutationFn = Apollo.MutationFunction<
  DeletePostMutation,
  DeletePostMutationVariables
>

/**
 * __useDeletePostMutation__
 *
 * To run a mutation, you first call `useDeletePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePostMutation, { data, loading, error }] = useDeletePostMutation({
 *   variables: {
 *      postId: // value for 'postId'
 *   },
 * });
 */
export function useDeletePostMutation(
  baseOptions?: Apollo.MutationHookOptions<DeletePostMutation, DeletePostMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<DeletePostMutation, DeletePostMutationVariables>(
    DeletePostDocument,
    options,
  )
}
export type DeletePostMutationHookResult = ReturnType<typeof useDeletePostMutation>
export type DeletePostMutationResult = Apollo.MutationResult<DeletePostMutation>
export type DeletePostMutationOptions = Apollo.BaseMutationOptions<
  DeletePostMutation,
  DeletePostMutationVariables
>
export const LikePostDocument = gql`
    mutation LikePost($postId: ID!) {
  likePost(postId: $postId) {
    success
    message
  }
}
    `
export type LikePostMutationFn = Apollo.MutationFunction<
  LikePostMutation,
  LikePostMutationVariables
>

/**
 * __useLikePostMutation__
 *
 * To run a mutation, you first call `useLikePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLikePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [likePostMutation, { data, loading, error }] = useLikePostMutation({
 *   variables: {
 *      postId: // value for 'postId'
 *   },
 * });
 */
export function useLikePostMutation(
  baseOptions?: Apollo.MutationHookOptions<LikePostMutation, LikePostMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<LikePostMutation, LikePostMutationVariables>(LikePostDocument, options)
}
export type LikePostMutationHookResult = ReturnType<typeof useLikePostMutation>
export type LikePostMutationResult = Apollo.MutationResult<LikePostMutation>
export type LikePostMutationOptions = Apollo.BaseMutationOptions<
  LikePostMutation,
  LikePostMutationVariables
>
export const UnlikePostDocument = gql`
    mutation UnlikePost($postId: ID!) {
  unlikePost(postId: $postId) {
    success
    message
  }
}
    `
export type UnlikePostMutationFn = Apollo.MutationFunction<
  UnlikePostMutation,
  UnlikePostMutationVariables
>

/**
 * __useUnlikePostMutation__
 *
 * To run a mutation, you first call `useUnlikePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlikePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlikePostMutation, { data, loading, error }] = useUnlikePostMutation({
 *   variables: {
 *      postId: // value for 'postId'
 *   },
 * });
 */
export function useUnlikePostMutation(
  baseOptions?: Apollo.MutationHookOptions<UnlikePostMutation, UnlikePostMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<UnlikePostMutation, UnlikePostMutationVariables>(
    UnlikePostDocument,
    options,
  )
}
export type UnlikePostMutationHookResult = ReturnType<typeof useUnlikePostMutation>
export type UnlikePostMutationResult = Apollo.MutationResult<UnlikePostMutation>
export type UnlikePostMutationOptions = Apollo.BaseMutationOptions<
  UnlikePostMutation,
  UnlikePostMutationVariables
>
export const CreateCommentDocument = gql`
    mutation CreateComment($input: CreateCommentInput!) {
  createComment(input: $input) {
    ...PostComment
  }
}
    ${PostCommentFragmentDoc}`
export type CreateCommentMutationFn = Apollo.MutationFunction<
  CreateCommentMutation,
  CreateCommentMutationVariables
>

/**
 * __useCreateCommentMutation__
 *
 * To run a mutation, you first call `useCreateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCommentMutation, { data, loading, error }] = useCreateCommentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCommentMutation(
  baseOptions?: Apollo.MutationHookOptions<CreateCommentMutation, CreateCommentMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CreateCommentMutation, CreateCommentMutationVariables>(
    CreateCommentDocument,
    options,
  )
}
export type CreateCommentMutationHookResult = ReturnType<typeof useCreateCommentMutation>
export type CreateCommentMutationResult = Apollo.MutationResult<CreateCommentMutation>
export type CreateCommentMutationOptions = Apollo.BaseMutationOptions<
  CreateCommentMutation,
  CreateCommentMutationVariables
>
export const UpdateCommentDocument = gql`
    mutation UpdateComment($commentId: ID!, $content: String!) {
  updateComment(commentId: $commentId, content: $content) {
    ...PostComment
  }
}
    ${PostCommentFragmentDoc}`
export type UpdateCommentMutationFn = Apollo.MutationFunction<
  UpdateCommentMutation,
  UpdateCommentMutationVariables
>

/**
 * __useUpdateCommentMutation__
 *
 * To run a mutation, you first call `useUpdateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCommentMutation, { data, loading, error }] = useUpdateCommentMutation({
 *   variables: {
 *      commentId: // value for 'commentId'
 *      content: // value for 'content'
 *   },
 * });
 */
export function useUpdateCommentMutation(
  baseOptions?: Apollo.MutationHookOptions<UpdateCommentMutation, UpdateCommentMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<UpdateCommentMutation, UpdateCommentMutationVariables>(
    UpdateCommentDocument,
    options,
  )
}
export type UpdateCommentMutationHookResult = ReturnType<typeof useUpdateCommentMutation>
export type UpdateCommentMutationResult = Apollo.MutationResult<UpdateCommentMutation>
export type UpdateCommentMutationOptions = Apollo.BaseMutationOptions<
  UpdateCommentMutation,
  UpdateCommentMutationVariables
>
export const DeleteCommentDocument = gql`
    mutation DeleteComment($commentId: ID!) {
  deleteComment(commentId: $commentId) {
    success
    message
  }
}
    `
export type DeleteCommentMutationFn = Apollo.MutationFunction<
  DeleteCommentMutation,
  DeleteCommentMutationVariables
>

/**
 * __useDeleteCommentMutation__
 *
 * To run a mutation, you first call `useDeleteCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCommentMutation, { data, loading, error }] = useDeleteCommentMutation({
 *   variables: {
 *      commentId: // value for 'commentId'
 *   },
 * });
 */
export function useDeleteCommentMutation(
  baseOptions?: Apollo.MutationHookOptions<DeleteCommentMutation, DeleteCommentMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<DeleteCommentMutation, DeleteCommentMutationVariables>(
    DeleteCommentDocument,
    options,
  )
}
export type DeleteCommentMutationHookResult = ReturnType<typeof useDeleteCommentMutation>
export type DeleteCommentMutationResult = Apollo.MutationResult<DeleteCommentMutation>
export type DeleteCommentMutationOptions = Apollo.BaseMutationOptions<
  DeleteCommentMutation,
  DeleteCommentMutationVariables
>
export const ApplyForGigDocument = gql`
    mutation ApplyForGig($gigId: ID!, $note: String) {
  applyForGig(gigId: $gigId, note: $note) {
    ...GigApplicationWithGig
  }
}
    ${GigApplicationWithGigFragmentDoc}`
export type ApplyForGigMutationFn = Apollo.MutationFunction<
  ApplyForGigMutation,
  ApplyForGigMutationVariables
>

/**
 * __useApplyForGigMutation__
 *
 * To run a mutation, you first call `useApplyForGigMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApplyForGigMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [applyForGigMutation, { data, loading, error }] = useApplyForGigMutation({
 *   variables: {
 *      gigId: // value for 'gigId'
 *      note: // value for 'note'
 *   },
 * });
 */
export function useApplyForGigMutation(
  baseOptions?: Apollo.MutationHookOptions<ApplyForGigMutation, ApplyForGigMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<ApplyForGigMutation, ApplyForGigMutationVariables>(
    ApplyForGigDocument,
    options,
  )
}
export type ApplyForGigMutationHookResult = ReturnType<typeof useApplyForGigMutation>
export type ApplyForGigMutationResult = Apollo.MutationResult<ApplyForGigMutation>
export type ApplyForGigMutationOptions = Apollo.BaseMutationOptions<
  ApplyForGigMutation,
  ApplyForGigMutationVariables
>
export const WithdrawGigApplicationDocument = gql`
    mutation WithdrawGigApplication($applicationId: ID!) {
  withdrawGigApplication(applicationId: $applicationId) {
    ...GigApplicationBasic
  }
}
    ${GigApplicationBasicFragmentDoc}`
export type WithdrawGigApplicationMutationFn = Apollo.MutationFunction<
  WithdrawGigApplicationMutation,
  WithdrawGigApplicationMutationVariables
>

/**
 * __useWithdrawGigApplicationMutation__
 *
 * To run a mutation, you first call `useWithdrawGigApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWithdrawGigApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [withdrawGigApplicationMutation, { data, loading, error }] = useWithdrawGigApplicationMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *   },
 * });
 */
export function useWithdrawGigApplicationMutation(
  baseOptions?: Apollo.MutationHookOptions<
    WithdrawGigApplicationMutation,
    WithdrawGigApplicationMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<
    WithdrawGigApplicationMutation,
    WithdrawGigApplicationMutationVariables
  >(WithdrawGigApplicationDocument, options)
}
export type WithdrawGigApplicationMutationHookResult = ReturnType<
  typeof useWithdrawGigApplicationMutation
>
export type WithdrawGigApplicationMutationResult =
  Apollo.MutationResult<WithdrawGigApplicationMutation>
export type WithdrawGigApplicationMutationOptions = Apollo.BaseMutationOptions<
  WithdrawGigApplicationMutation,
  WithdrawGigApplicationMutationVariables
>
export const ReviewGigApplicationDocument = gql`
    mutation ReviewGigApplication($applicationId: ID!, $input: ReviewGigApplicationInput!) {
  reviewGigApplication(applicationId: $applicationId, input: $input) {
    id
    status
    user {
      privy_id
      username
      display_name
      avatar_url
    }
  }
}
    `
export type ReviewGigApplicationMutationFn = Apollo.MutationFunction<
  ReviewGigApplicationMutation,
  ReviewGigApplicationMutationVariables
>

/**
 * __useReviewGigApplicationMutation__
 *
 * To run a mutation, you first call `useReviewGigApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReviewGigApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reviewGigApplicationMutation, { data, loading, error }] = useReviewGigApplicationMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useReviewGigApplicationMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ReviewGigApplicationMutation,
    ReviewGigApplicationMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<ReviewGigApplicationMutation, ReviewGigApplicationMutationVariables>(
    ReviewGigApplicationDocument,
    options,
  )
}
export type ReviewGigApplicationMutationHookResult = ReturnType<
  typeof useReviewGigApplicationMutation
>
export type ReviewGigApplicationMutationResult = Apollo.MutationResult<ReviewGigApplicationMutation>
export type ReviewGigApplicationMutationOptions = Apollo.BaseMutationOptions<
  ReviewGigApplicationMutation,
  ReviewGigApplicationMutationVariables
>
export const MarkNotificationReadDocument = gql`
    mutation MarkNotificationRead($id: ID!) {
  markNotificationRead(id: $id) {
    id
    read
    read_at
  }
}
    `
export type MarkNotificationReadMutationFn = Apollo.MutationFunction<
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables
>

/**
 * __useMarkNotificationReadMutation__
 *
 * To run a mutation, you first call `useMarkNotificationReadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkNotificationReadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markNotificationReadMutation, { data, loading, error }] = useMarkNotificationReadMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMarkNotificationReadMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MarkNotificationReadMutation,
    MarkNotificationReadMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<MarkNotificationReadMutation, MarkNotificationReadMutationVariables>(
    MarkNotificationReadDocument,
    options,
  )
}
export type MarkNotificationReadMutationHookResult = ReturnType<
  typeof useMarkNotificationReadMutation
>
export type MarkNotificationReadMutationResult = Apollo.MutationResult<MarkNotificationReadMutation>
export type MarkNotificationReadMutationOptions = Apollo.BaseMutationOptions<
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables
>
export const MarkAllNotificationsReadDocument = gql`
    mutation MarkAllNotificationsRead {
  markAllNotificationsRead {
    success
    message
  }
}
    `
export type MarkAllNotificationsReadMutationFn = Apollo.MutationFunction<
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables
>

/**
 * __useMarkAllNotificationsReadMutation__
 *
 * To run a mutation, you first call `useMarkAllNotificationsReadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkAllNotificationsReadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markAllNotificationsReadMutation, { data, loading, error }] = useMarkAllNotificationsReadMutation({
 *   variables: {
 *   },
 * });
 */
export function useMarkAllNotificationsReadMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MarkAllNotificationsReadMutation,
    MarkAllNotificationsReadMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<
    MarkAllNotificationsReadMutation,
    MarkAllNotificationsReadMutationVariables
  >(MarkAllNotificationsReadDocument, options)
}
export type MarkAllNotificationsReadMutationHookResult = ReturnType<
  typeof useMarkAllNotificationsReadMutation
>
export type MarkAllNotificationsReadMutationResult =
  Apollo.MutationResult<MarkAllNotificationsReadMutation>
export type MarkAllNotificationsReadMutationOptions = Apollo.BaseMutationOptions<
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables
>
export const DeleteNotificationDocument = gql`
    mutation DeleteNotification($id: ID!) {
  deleteNotification(id: $id) {
    success
    message
  }
}
    `
export type DeleteNotificationMutationFn = Apollo.MutationFunction<
  DeleteNotificationMutation,
  DeleteNotificationMutationVariables
>

/**
 * __useDeleteNotificationMutation__
 *
 * To run a mutation, you first call `useDeleteNotificationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteNotificationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteNotificationMutation, { data, loading, error }] = useDeleteNotificationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteNotificationMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteNotificationMutation,
    DeleteNotificationMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<DeleteNotificationMutation, DeleteNotificationMutationVariables>(
    DeleteNotificationDocument,
    options,
  )
}
export type DeleteNotificationMutationHookResult = ReturnType<typeof useDeleteNotificationMutation>
export type DeleteNotificationMutationResult = Apollo.MutationResult<DeleteNotificationMutation>
export type DeleteNotificationMutationOptions = Apollo.BaseMutationOptions<
  DeleteNotificationMutation,
  DeleteNotificationMutationVariables
>
export const UpdatePrivacySettingsDocument = gql`
    mutation UpdatePrivacySettings($input: UpdatePrivacySettingsInput!) {
  updatePrivacySettings(input: $input) {
    id
    user_id
    profile_visibility
    show_real_name
    show_bio
    show_avatar
    show_city
    show_dance_styles
    show_stats
    show_badges
    show_events_attending
    show_events_attended
    show_check_ins
    show_leaderboard_rank
    show_posts
    show_likes
    show_comments
    searchable_by_username
    appear_in_suggestions
    appear_in_event_attendees
    appear_in_nearby
    allow_bond_requests
    allow_messages
    allow_event_invites
    notify_bonds_on_check_in
    notify_bonds_on_achievement
    updated_at
  }
}
    `
export type UpdatePrivacySettingsMutationFn = Apollo.MutationFunction<
  UpdatePrivacySettingsMutation,
  UpdatePrivacySettingsMutationVariables
>

/**
 * __useUpdatePrivacySettingsMutation__
 *
 * To run a mutation, you first call `useUpdatePrivacySettingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePrivacySettingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePrivacySettingsMutation, { data, loading, error }] = useUpdatePrivacySettingsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdatePrivacySettingsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdatePrivacySettingsMutation,
    UpdatePrivacySettingsMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<UpdatePrivacySettingsMutation, UpdatePrivacySettingsMutationVariables>(
    UpdatePrivacySettingsDocument,
    options,
  )
}
export type UpdatePrivacySettingsMutationHookResult = ReturnType<
  typeof useUpdatePrivacySettingsMutation
>
export type UpdatePrivacySettingsMutationResult =
  Apollo.MutationResult<UpdatePrivacySettingsMutation>
export type UpdatePrivacySettingsMutationOptions = Apollo.BaseMutationOptions<
  UpdatePrivacySettingsMutation,
  UpdatePrivacySettingsMutationVariables
>
export const ApplyPrivacyPresetDocument = gql`
    mutation ApplyPrivacyPreset($preset: PrivacyPresetType!) {
  applyPrivacyPreset(preset: $preset) {
    id
    user_id
    profile_visibility
    show_real_name
    show_bio
    show_avatar
    show_city
    show_dance_styles
    show_stats
    show_badges
    show_events_attending
    show_events_attended
    show_check_ins
    show_leaderboard_rank
    show_posts
    show_likes
    show_comments
    searchable_by_username
    appear_in_suggestions
    appear_in_event_attendees
    appear_in_nearby
    allow_bond_requests
    allow_messages
    allow_event_invites
    notify_bonds_on_check_in
    notify_bonds_on_achievement
    updated_at
  }
}
    `
export type ApplyPrivacyPresetMutationFn = Apollo.MutationFunction<
  ApplyPrivacyPresetMutation,
  ApplyPrivacyPresetMutationVariables
>

/**
 * __useApplyPrivacyPresetMutation__
 *
 * To run a mutation, you first call `useApplyPrivacyPresetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApplyPrivacyPresetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [applyPrivacyPresetMutation, { data, loading, error }] = useApplyPrivacyPresetMutation({
 *   variables: {
 *      preset: // value for 'preset'
 *   },
 * });
 */
export function useApplyPrivacyPresetMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ApplyPrivacyPresetMutation,
    ApplyPrivacyPresetMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<ApplyPrivacyPresetMutation, ApplyPrivacyPresetMutationVariables>(
    ApplyPrivacyPresetDocument,
    options,
  )
}
export type ApplyPrivacyPresetMutationHookResult = ReturnType<typeof useApplyPrivacyPresetMutation>
export type ApplyPrivacyPresetMutationResult = Apollo.MutationResult<ApplyPrivacyPresetMutation>
export type ApplyPrivacyPresetMutationOptions = Apollo.BaseMutationOptions<
  ApplyPrivacyPresetMutation,
  ApplyPrivacyPresetMutationVariables
>
export const ResetPrivacyToDefaultsDocument = gql`
    mutation ResetPrivacyToDefaults {
  resetPrivacyToDefaults {
    id
    user_id
    profile_visibility
    updated_at
  }
}
    `
export type ResetPrivacyToDefaultsMutationFn = Apollo.MutationFunction<
  ResetPrivacyToDefaultsMutation,
  ResetPrivacyToDefaultsMutationVariables
>

/**
 * __useResetPrivacyToDefaultsMutation__
 *
 * To run a mutation, you first call `useResetPrivacyToDefaultsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetPrivacyToDefaultsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetPrivacyToDefaultsMutation, { data, loading, error }] = useResetPrivacyToDefaultsMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetPrivacyToDefaultsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ResetPrivacyToDefaultsMutation,
    ResetPrivacyToDefaultsMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<
    ResetPrivacyToDefaultsMutation,
    ResetPrivacyToDefaultsMutationVariables
  >(ResetPrivacyToDefaultsDocument, options)
}
export type ResetPrivacyToDefaultsMutationHookResult = ReturnType<
  typeof useResetPrivacyToDefaultsMutation
>
export type ResetPrivacyToDefaultsMutationResult =
  Apollo.MutationResult<ResetPrivacyToDefaultsMutation>
export type ResetPrivacyToDefaultsMutationOptions = Apollo.BaseMutationOptions<
  ResetPrivacyToDefaultsMutation,
  ResetPrivacyToDefaultsMutationVariables
>
export const DismissSuggestionDocument = gql`
    mutation DismissSuggestion($suggestionId: ID!) {
  dismissSuggestion(suggestion_id: $suggestionId)
}
    `
export type DismissSuggestionMutationFn = Apollo.MutationFunction<
  DismissSuggestionMutation,
  DismissSuggestionMutationVariables
>

/**
 * __useDismissSuggestionMutation__
 *
 * To run a mutation, you first call `useDismissSuggestionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDismissSuggestionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dismissSuggestionMutation, { data, loading, error }] = useDismissSuggestionMutation({
 *   variables: {
 *      suggestionId: // value for 'suggestionId'
 *   },
 * });
 */
export function useDismissSuggestionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DismissSuggestionMutation,
    DismissSuggestionMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<DismissSuggestionMutation, DismissSuggestionMutationVariables>(
    DismissSuggestionDocument,
    options,
  )
}
export type DismissSuggestionMutationHookResult = ReturnType<typeof useDismissSuggestionMutation>
export type DismissSuggestionMutationResult = Apollo.MutationResult<DismissSuggestionMutation>
export type DismissSuggestionMutationOptions = Apollo.BaseMutationOptions<
  DismissSuggestionMutation,
  DismissSuggestionMutationVariables
>
export const RefreshSuggestionsDocument = gql`
    mutation RefreshSuggestions {
  refreshSuggestions {
    suggestions {
      id
      user {
        privy_id
        username
        display_name
        avatar_url
      }
      source
      score
      reason
    }
    total_count
    has_more
  }
}
    `
export type RefreshSuggestionsMutationFn = Apollo.MutationFunction<
  RefreshSuggestionsMutation,
  RefreshSuggestionsMutationVariables
>

/**
 * __useRefreshSuggestionsMutation__
 *
 * To run a mutation, you first call `useRefreshSuggestionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshSuggestionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshSuggestionsMutation, { data, loading, error }] = useRefreshSuggestionsMutation({
 *   variables: {
 *   },
 * });
 */
export function useRefreshSuggestionsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    RefreshSuggestionsMutation,
    RefreshSuggestionsMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<RefreshSuggestionsMutation, RefreshSuggestionsMutationVariables>(
    RefreshSuggestionsDocument,
    options,
  )
}
export type RefreshSuggestionsMutationHookResult = ReturnType<typeof useRefreshSuggestionsMutation>
export type RefreshSuggestionsMutationResult = Apollo.MutationResult<RefreshSuggestionsMutation>
export type RefreshSuggestionsMutationOptions = Apollo.BaseMutationOptions<
  RefreshSuggestionsMutation,
  RefreshSuggestionsMutationVariables
>
export const UpdateProfileDocument = gql`
    mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    ...UserFullInfo
  }
}
    ${UserFullInfoFragmentDoc}`
export type UpdateProfileMutationFn = Apollo.MutationFunction<
  UpdateProfileMutation,
  UpdateProfileMutationVariables
>

/**
 * __useUpdateProfileMutation__
 *
 * To run a mutation, you first call `useUpdateProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfileMutation, { data, loading, error }] = useUpdateProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfileMutation(
  baseOptions?: Apollo.MutationHookOptions<UpdateProfileMutation, UpdateProfileMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<UpdateProfileMutation, UpdateProfileMutationVariables>(
    UpdateProfileDocument,
    options,
  )
}
export type UpdateProfileMutationHookResult = ReturnType<typeof useUpdateProfileMutation>
export type UpdateProfileMutationResult = Apollo.MutationResult<UpdateProfileMutation>
export type UpdateProfileMutationOptions = Apollo.BaseMutationOptions<
  UpdateProfileMutation,
  UpdateProfileMutationVariables
>
export const CreateDanceBondDocument = gql`
    mutation CreateDanceBond($userId: String!, $input: CreateDanceBondInput!) {
  createDanceBond(userId: $userId, input: $input) {
    id
    user_id_1
    user_id_2
    bond_level
    shared_events_count
    total_dances
    last_dance_date
    created_at
    updated_at
  }
}
    `
export type CreateDanceBondMutationFn = Apollo.MutationFunction<
  CreateDanceBondMutation,
  CreateDanceBondMutationVariables
>

/**
 * __useCreateDanceBondMutation__
 *
 * To run a mutation, you first call `useCreateDanceBondMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDanceBondMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDanceBondMutation, { data, loading, error }] = useCreateDanceBondMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDanceBondMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateDanceBondMutation,
    CreateDanceBondMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<CreateDanceBondMutation, CreateDanceBondMutationVariables>(
    CreateDanceBondDocument,
    options,
  )
}
export type CreateDanceBondMutationHookResult = ReturnType<typeof useCreateDanceBondMutation>
export type CreateDanceBondMutationResult = Apollo.MutationResult<CreateDanceBondMutation>
export type CreateDanceBondMutationOptions = Apollo.BaseMutationOptions<
  CreateDanceBondMutation,
  CreateDanceBondMutationVariables
>
export const GetFreestylePreferencesDocument = gql`
    query GetFreestylePreferences {
  myFreestylePreferences {
    daily_reminder_enabled
    daily_reminder_time
    live_sessions_enabled
  }
}
    `

/**
 * __useGetFreestylePreferencesQuery__
 *
 * To run a query within a React component, call `useGetFreestylePreferencesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFreestylePreferencesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFreestylePreferencesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetFreestylePreferencesQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetFreestylePreferencesQuery,
    GetFreestylePreferencesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetFreestylePreferencesQuery, GetFreestylePreferencesQueryVariables>(
    GetFreestylePreferencesDocument,
    options,
  )
}
export function useGetFreestylePreferencesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetFreestylePreferencesQuery,
    GetFreestylePreferencesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetFreestylePreferencesQuery, GetFreestylePreferencesQueryVariables>(
    GetFreestylePreferencesDocument,
    options,
  )
}
export function useGetFreestylePreferencesSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetFreestylePreferencesQuery,
        GetFreestylePreferencesQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<
    GetFreestylePreferencesQuery,
    GetFreestylePreferencesQueryVariables
  >(GetFreestylePreferencesDocument, options)
}
export type GetFreestylePreferencesQueryHookResult = ReturnType<
  typeof useGetFreestylePreferencesQuery
>
export type GetFreestylePreferencesLazyQueryHookResult = ReturnType<
  typeof useGetFreestylePreferencesLazyQuery
>
export type GetFreestylePreferencesSuspenseQueryHookResult = ReturnType<
  typeof useGetFreestylePreferencesSuspenseQuery
>
export type GetFreestylePreferencesQueryResult = Apollo.QueryResult<
  GetFreestylePreferencesQuery,
  GetFreestylePreferencesQueryVariables
>
export const GetFreestyleSessionsDocument = gql`
    query GetFreestyleSessions($limit: Int, $offset: Int) {
  myFreestyleSessions(limit: $limit, offset: $offset) {
    id
    duration_seconds
    movement_score
    points_awarded
    music_source
    session_date
    completed
    created_at
  }
}
    `

/**
 * __useGetFreestyleSessionsQuery__
 *
 * To run a query within a React component, call `useGetFreestyleSessionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFreestyleSessionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFreestyleSessionsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetFreestyleSessionsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetFreestyleSessionsQuery,
    GetFreestyleSessionsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetFreestyleSessionsQuery, GetFreestyleSessionsQueryVariables>(
    GetFreestyleSessionsDocument,
    options,
  )
}
export function useGetFreestyleSessionsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetFreestyleSessionsQuery,
    GetFreestyleSessionsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetFreestyleSessionsQuery, GetFreestyleSessionsQueryVariables>(
    GetFreestyleSessionsDocument,
    options,
  )
}
export function useGetFreestyleSessionsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetFreestyleSessionsQuery,
        GetFreestyleSessionsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetFreestyleSessionsQuery, GetFreestyleSessionsQueryVariables>(
    GetFreestyleSessionsDocument,
    options,
  )
}
export type GetFreestyleSessionsQueryHookResult = ReturnType<typeof useGetFreestyleSessionsQuery>
export type GetFreestyleSessionsLazyQueryHookResult = ReturnType<
  typeof useGetFreestyleSessionsLazyQuery
>
export type GetFreestyleSessionsSuspenseQueryHookResult = ReturnType<
  typeof useGetFreestyleSessionsSuspenseQuery
>
export type GetFreestyleSessionsQueryResult = Apollo.QueryResult<
  GetFreestyleSessionsQuery,
  GetFreestyleSessionsQueryVariables
>
export const GetFreestyleStatsDocument = gql`
    query GetFreestyleStats {
  myFreestyleStats {
    total_sessions
    total_duration_seconds
    total_points
    average_movement_score
    best_movement_score
    sessions_this_week
    current_streak
    longest_streak
    last_session_date
  }
  completedFreestyleToday
}
    `

/**
 * __useGetFreestyleStatsQuery__
 *
 * To run a query within a React component, call `useGetFreestyleStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFreestyleStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFreestyleStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetFreestyleStatsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetFreestyleStatsQuery, GetFreestyleStatsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetFreestyleStatsQuery, GetFreestyleStatsQueryVariables>(
    GetFreestyleStatsDocument,
    options,
  )
}
export function useGetFreestyleStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetFreestyleStatsQuery,
    GetFreestyleStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetFreestyleStatsQuery, GetFreestyleStatsQueryVariables>(
    GetFreestyleStatsDocument,
    options,
  )
}
export function useGetFreestyleStatsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetFreestyleStatsQuery, GetFreestyleStatsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetFreestyleStatsQuery, GetFreestyleStatsQueryVariables>(
    GetFreestyleStatsDocument,
    options,
  )
}
export type GetFreestyleStatsQueryHookResult = ReturnType<typeof useGetFreestyleStatsQuery>
export type GetFreestyleStatsLazyQueryHookResult = ReturnType<typeof useGetFreestyleStatsLazyQuery>
export type GetFreestyleStatsSuspenseQueryHookResult = ReturnType<
  typeof useGetFreestyleStatsSuspenseQuery
>
export type GetFreestyleStatsQueryResult = Apollo.QueryResult<
  GetFreestyleStatsQuery,
  GetFreestyleStatsQueryVariables
>
export const MyAchievementsDocument = gql`
    query MyAchievements {
  myAchievements {
    achievement_type
    title
    description
    icon
    category
    rarity
    xp_reward
    danz_reward
    current_progress
    target
    percentage
    is_unlocked
    unlocked_at
  }
}
    `

/**
 * __useMyAchievementsQuery__
 *
 * To run a query within a React component, call `useMyAchievementsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyAchievementsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyAchievementsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyAchievementsQuery(
  baseOptions?: Apollo.QueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<MyAchievementsQuery, MyAchievementsQueryVariables>(
    MyAchievementsDocument,
    options,
  )
}
export function useMyAchievementsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<MyAchievementsQuery, MyAchievementsQueryVariables>(
    MyAchievementsDocument,
    options,
  )
}
export function useMyAchievementsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<MyAchievementsQuery, MyAchievementsQueryVariables>(
    MyAchievementsDocument,
    options,
  )
}
export type MyAchievementsQueryHookResult = ReturnType<typeof useMyAchievementsQuery>
export type MyAchievementsLazyQueryHookResult = ReturnType<typeof useMyAchievementsLazyQuery>
export type MyAchievementsSuspenseQueryHookResult = ReturnType<
  typeof useMyAchievementsSuspenseQuery
>
export type MyAchievementsQueryResult = Apollo.QueryResult<
  MyAchievementsQuery,
  MyAchievementsQueryVariables
>
export const MyUnlockedAchievementsDocument = gql`
    query MyUnlockedAchievements {
  myUnlockedAchievements {
    id
    user_id
    achievement_type
    title
    description
    icon
    category
    rarity
    xp_reward
    danz_reward
    unlocked_at
    is_unlocked
  }
}
    `

/**
 * __useMyUnlockedAchievementsQuery__
 *
 * To run a query within a React component, call `useMyUnlockedAchievementsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyUnlockedAchievementsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyUnlockedAchievementsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyUnlockedAchievementsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    MyUnlockedAchievementsQuery,
    MyUnlockedAchievementsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<MyUnlockedAchievementsQuery, MyUnlockedAchievementsQueryVariables>(
    MyUnlockedAchievementsDocument,
    options,
  )
}
export function useMyUnlockedAchievementsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    MyUnlockedAchievementsQuery,
    MyUnlockedAchievementsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<MyUnlockedAchievementsQuery, MyUnlockedAchievementsQueryVariables>(
    MyUnlockedAchievementsDocument,
    options,
  )
}
export function useMyUnlockedAchievementsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        MyUnlockedAchievementsQuery,
        MyUnlockedAchievementsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<MyUnlockedAchievementsQuery, MyUnlockedAchievementsQueryVariables>(
    MyUnlockedAchievementsDocument,
    options,
  )
}
export type MyUnlockedAchievementsQueryHookResult = ReturnType<
  typeof useMyUnlockedAchievementsQuery
>
export type MyUnlockedAchievementsLazyQueryHookResult = ReturnType<
  typeof useMyUnlockedAchievementsLazyQuery
>
export type MyUnlockedAchievementsSuspenseQueryHookResult = ReturnType<
  typeof useMyUnlockedAchievementsSuspenseQuery
>
export type MyUnlockedAchievementsQueryResult = Apollo.QueryResult<
  MyUnlockedAchievementsQuery,
  MyUnlockedAchievementsQueryVariables
>
export const MyAchievementStatsDocument = gql`
    query MyAchievementStats {
  myAchievementStats {
    total_unlocked
    total_available
    total_xp_earned
    total_danz_earned
    by_category {
      category
      unlocked
      total
    }
    by_rarity {
      rarity
      unlocked
      total
    }
    recent_unlocks {
      id
      achievement_type
      title
      description
      icon
      category
      rarity
      xp_reward
      danz_reward
      unlocked_at
    }
  }
}
    `

/**
 * __useMyAchievementStatsQuery__
 *
 * To run a query within a React component, call `useMyAchievementStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyAchievementStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyAchievementStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyAchievementStatsQuery(
  baseOptions?: Apollo.QueryHookOptions<MyAchievementStatsQuery, MyAchievementStatsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<MyAchievementStatsQuery, MyAchievementStatsQueryVariables>(
    MyAchievementStatsDocument,
    options,
  )
}
export function useMyAchievementStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    MyAchievementStatsQuery,
    MyAchievementStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<MyAchievementStatsQuery, MyAchievementStatsQueryVariables>(
    MyAchievementStatsDocument,
    options,
  )
}
export function useMyAchievementStatsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<MyAchievementStatsQuery, MyAchievementStatsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<MyAchievementStatsQuery, MyAchievementStatsQueryVariables>(
    MyAchievementStatsDocument,
    options,
  )
}
export type MyAchievementStatsQueryHookResult = ReturnType<typeof useMyAchievementStatsQuery>
export type MyAchievementStatsLazyQueryHookResult = ReturnType<
  typeof useMyAchievementStatsLazyQuery
>
export type MyAchievementStatsSuspenseQueryHookResult = ReturnType<
  typeof useMyAchievementStatsSuspenseQuery
>
export type MyAchievementStatsQueryResult = Apollo.QueryResult<
  MyAchievementStatsQuery,
  MyAchievementStatsQueryVariables
>
export const AchievementDefinitionsDocument = gql`
    query AchievementDefinitions {
  achievementDefinitions {
    type
    title
    description
    icon
    category
    rarity
    xp_reward
    danz_reward
    target
    hidden
  }
}
    `

/**
 * __useAchievementDefinitionsQuery__
 *
 * To run a query within a React component, call `useAchievementDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAchievementDefinitionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAchievementDefinitionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useAchievementDefinitionsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    AchievementDefinitionsQuery,
    AchievementDefinitionsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<AchievementDefinitionsQuery, AchievementDefinitionsQueryVariables>(
    AchievementDefinitionsDocument,
    options,
  )
}
export function useAchievementDefinitionsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    AchievementDefinitionsQuery,
    AchievementDefinitionsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<AchievementDefinitionsQuery, AchievementDefinitionsQueryVariables>(
    AchievementDefinitionsDocument,
    options,
  )
}
export function useAchievementDefinitionsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        AchievementDefinitionsQuery,
        AchievementDefinitionsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<AchievementDefinitionsQuery, AchievementDefinitionsQueryVariables>(
    AchievementDefinitionsDocument,
    options,
  )
}
export type AchievementDefinitionsQueryHookResult = ReturnType<
  typeof useAchievementDefinitionsQuery
>
export type AchievementDefinitionsLazyQueryHookResult = ReturnType<
  typeof useAchievementDefinitionsLazyQuery
>
export type AchievementDefinitionsSuspenseQueryHookResult = ReturnType<
  typeof useAchievementDefinitionsSuspenseQuery
>
export type AchievementDefinitionsQueryResult = Apollo.QueryResult<
  AchievementDefinitionsQuery,
  AchievementDefinitionsQueryVariables
>
export const AchievementsByCategoryDocument = gql`
    query AchievementsByCategory($category: AchievementCategory!) {
  achievementsByCategory(category: $category) {
    achievement_type
    title
    description
    icon
    category
    rarity
    xp_reward
    danz_reward
    current_progress
    target
    percentage
    is_unlocked
    unlocked_at
  }
}
    `

/**
 * __useAchievementsByCategoryQuery__
 *
 * To run a query within a React component, call `useAchievementsByCategoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useAchievementsByCategoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAchievementsByCategoryQuery({
 *   variables: {
 *      category: // value for 'category'
 *   },
 * });
 */
export function useAchievementsByCategoryQuery(
  baseOptions: Apollo.QueryHookOptions<
    AchievementsByCategoryQuery,
    AchievementsByCategoryQueryVariables
  > &
    ({ variables: AchievementsByCategoryQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<AchievementsByCategoryQuery, AchievementsByCategoryQueryVariables>(
    AchievementsByCategoryDocument,
    options,
  )
}
export function useAchievementsByCategoryLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    AchievementsByCategoryQuery,
    AchievementsByCategoryQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<AchievementsByCategoryQuery, AchievementsByCategoryQueryVariables>(
    AchievementsByCategoryDocument,
    options,
  )
}
export function useAchievementsByCategorySuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        AchievementsByCategoryQuery,
        AchievementsByCategoryQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<AchievementsByCategoryQuery, AchievementsByCategoryQueryVariables>(
    AchievementsByCategoryDocument,
    options,
  )
}
export type AchievementsByCategoryQueryHookResult = ReturnType<
  typeof useAchievementsByCategoryQuery
>
export type AchievementsByCategoryLazyQueryHookResult = ReturnType<
  typeof useAchievementsByCategoryLazyQuery
>
export type AchievementsByCategorySuspenseQueryHookResult = ReturnType<
  typeof useAchievementsByCategorySuspenseQuery
>
export type AchievementsByCategoryQueryResult = Apollo.QueryResult<
  AchievementsByCategoryQuery,
  AchievementsByCategoryQueryVariables
>
export const IsAchievementUnlockedDocument = gql`
    query IsAchievementUnlocked($achievementType: String!) {
  isAchievementUnlocked(achievementType: $achievementType)
}
    `

/**
 * __useIsAchievementUnlockedQuery__
 *
 * To run a query within a React component, call `useIsAchievementUnlockedQuery` and pass it any options that fit your needs.
 * When your component renders, `useIsAchievementUnlockedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIsAchievementUnlockedQuery({
 *   variables: {
 *      achievementType: // value for 'achievementType'
 *   },
 * });
 */
export function useIsAchievementUnlockedQuery(
  baseOptions: Apollo.QueryHookOptions<
    IsAchievementUnlockedQuery,
    IsAchievementUnlockedQueryVariables
  > &
    ({ variables: IsAchievementUnlockedQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<IsAchievementUnlockedQuery, IsAchievementUnlockedQueryVariables>(
    IsAchievementUnlockedDocument,
    options,
  )
}
export function useIsAchievementUnlockedLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    IsAchievementUnlockedQuery,
    IsAchievementUnlockedQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<IsAchievementUnlockedQuery, IsAchievementUnlockedQueryVariables>(
    IsAchievementUnlockedDocument,
    options,
  )
}
export function useIsAchievementUnlockedSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        IsAchievementUnlockedQuery,
        IsAchievementUnlockedQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<IsAchievementUnlockedQuery, IsAchievementUnlockedQueryVariables>(
    IsAchievementUnlockedDocument,
    options,
  )
}
export type IsAchievementUnlockedQueryHookResult = ReturnType<typeof useIsAchievementUnlockedQuery>
export type IsAchievementUnlockedLazyQueryHookResult = ReturnType<
  typeof useIsAchievementUnlockedLazyQuery
>
export type IsAchievementUnlockedSuspenseQueryHookResult = ReturnType<
  typeof useIsAchievementUnlockedSuspenseQuery
>
export type IsAchievementUnlockedQueryResult = Apollo.QueryResult<
  IsAchievementUnlockedQuery,
  IsAchievementUnlockedQueryVariables
>
export const GetMyPendingBondRequestsDocument = gql`
    query GetMyPendingBondRequests($limit: Int, $offset: Int) {
  myPendingBondRequests(limit: $limit, offset: $offset) {
    id
    requester {
      ...UserBasicInfo
    }
    recipient {
      ...UserBasicInfo
    }
    status
    message
    match_reasons {
      mutual_bonds
      same_events
      music_overlap
      dance_styles
      similarity_score
    }
    created_at
    expires_at
  }
}
    ${UserBasicInfoFragmentDoc}`

/**
 * __useGetMyPendingBondRequestsQuery__
 *
 * To run a query within a React component, call `useGetMyPendingBondRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPendingBondRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPendingBondRequestsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetMyPendingBondRequestsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetMyPendingBondRequestsQuery,
    GetMyPendingBondRequestsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyPendingBondRequestsQuery, GetMyPendingBondRequestsQueryVariables>(
    GetMyPendingBondRequestsDocument,
    options,
  )
}
export function useGetMyPendingBondRequestsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyPendingBondRequestsQuery,
    GetMyPendingBondRequestsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyPendingBondRequestsQuery, GetMyPendingBondRequestsQueryVariables>(
    GetMyPendingBondRequestsDocument,
    options,
  )
}
export function useGetMyPendingBondRequestsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetMyPendingBondRequestsQuery,
        GetMyPendingBondRequestsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<
    GetMyPendingBondRequestsQuery,
    GetMyPendingBondRequestsQueryVariables
  >(GetMyPendingBondRequestsDocument, options)
}
export type GetMyPendingBondRequestsQueryHookResult = ReturnType<
  typeof useGetMyPendingBondRequestsQuery
>
export type GetMyPendingBondRequestsLazyQueryHookResult = ReturnType<
  typeof useGetMyPendingBondRequestsLazyQuery
>
export type GetMyPendingBondRequestsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyPendingBondRequestsSuspenseQuery
>
export type GetMyPendingBondRequestsQueryResult = Apollo.QueryResult<
  GetMyPendingBondRequestsQuery,
  GetMyPendingBondRequestsQueryVariables
>
export const GetMySentBondRequestsDocument = gql`
    query GetMySentBondRequests($limit: Int, $offset: Int) {
  mySentBondRequests(limit: $limit, offset: $offset) {
    id
    requester {
      ...UserBasicInfo
    }
    recipient {
      ...UserBasicInfo
    }
    status
    message
    match_reasons {
      mutual_bonds
      same_events
      music_overlap
      dance_styles
      similarity_score
    }
    created_at
    updated_at
    responded_at
    expires_at
  }
}
    ${UserBasicInfoFragmentDoc}`

/**
 * __useGetMySentBondRequestsQuery__
 *
 * To run a query within a React component, call `useGetMySentBondRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMySentBondRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMySentBondRequestsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetMySentBondRequestsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetMySentBondRequestsQuery,
    GetMySentBondRequestsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMySentBondRequestsQuery, GetMySentBondRequestsQueryVariables>(
    GetMySentBondRequestsDocument,
    options,
  )
}
export function useGetMySentBondRequestsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMySentBondRequestsQuery,
    GetMySentBondRequestsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMySentBondRequestsQuery, GetMySentBondRequestsQueryVariables>(
    GetMySentBondRequestsDocument,
    options,
  )
}
export function useGetMySentBondRequestsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetMySentBondRequestsQuery,
        GetMySentBondRequestsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMySentBondRequestsQuery, GetMySentBondRequestsQueryVariables>(
    GetMySentBondRequestsDocument,
    options,
  )
}
export type GetMySentBondRequestsQueryHookResult = ReturnType<typeof useGetMySentBondRequestsQuery>
export type GetMySentBondRequestsLazyQueryHookResult = ReturnType<
  typeof useGetMySentBondRequestsLazyQuery
>
export type GetMySentBondRequestsSuspenseQueryHookResult = ReturnType<
  typeof useGetMySentBondRequestsSuspenseQuery
>
export type GetMySentBondRequestsQueryResult = Apollo.QueryResult<
  GetMySentBondRequestsQuery,
  GetMySentBondRequestsQueryVariables
>
export const GetBondRequestDocument = gql`
    query GetBondRequest($id: ID!) {
  bondRequest(id: $id) {
    id
    requester {
      ...UserBasicInfo
    }
    recipient {
      ...UserBasicInfo
    }
    status
    message
    match_reasons {
      mutual_bonds
      same_events
      music_overlap
      dance_styles
      similarity_score
    }
    created_at
    updated_at
    responded_at
    expires_at
  }
}
    ${UserBasicInfoFragmentDoc}`

/**
 * __useGetBondRequestQuery__
 *
 * To run a query within a React component, call `useGetBondRequestQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBondRequestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBondRequestQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBondRequestQuery(
  baseOptions: Apollo.QueryHookOptions<GetBondRequestQuery, GetBondRequestQueryVariables> &
    ({ variables: GetBondRequestQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetBondRequestQuery, GetBondRequestQueryVariables>(
    GetBondRequestDocument,
    options,
  )
}
export function useGetBondRequestLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetBondRequestQuery, GetBondRequestQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetBondRequestQuery, GetBondRequestQueryVariables>(
    GetBondRequestDocument,
    options,
  )
}
export function useGetBondRequestSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetBondRequestQuery, GetBondRequestQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetBondRequestQuery, GetBondRequestQueryVariables>(
    GetBondRequestDocument,
    options,
  )
}
export type GetBondRequestQueryHookResult = ReturnType<typeof useGetBondRequestQuery>
export type GetBondRequestLazyQueryHookResult = ReturnType<typeof useGetBondRequestLazyQuery>
export type GetBondRequestSuspenseQueryHookResult = ReturnType<
  typeof useGetBondRequestSuspenseQuery
>
export type GetBondRequestQueryResult = Apollo.QueryResult<
  GetBondRequestQuery,
  GetBondRequestQueryVariables
>
export const CanSendBondRequestToDocument = gql`
    query CanSendBondRequestTo($userId: String!) {
  canSendBondRequestTo(user_id: $userId) {
    can_send
    reason
    match_reasons {
      mutual_bonds
      same_events
      music_overlap
      dance_styles
      similarity_score
    }
  }
}
    `

/**
 * __useCanSendBondRequestToQuery__
 *
 * To run a query within a React component, call `useCanSendBondRequestToQuery` and pass it any options that fit your needs.
 * When your component renders, `useCanSendBondRequestToQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCanSendBondRequestToQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useCanSendBondRequestToQuery(
  baseOptions: Apollo.QueryHookOptions<
    CanSendBondRequestToQuery,
    CanSendBondRequestToQueryVariables
  > &
    ({ variables: CanSendBondRequestToQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<CanSendBondRequestToQuery, CanSendBondRequestToQueryVariables>(
    CanSendBondRequestToDocument,
    options,
  )
}
export function useCanSendBondRequestToLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CanSendBondRequestToQuery,
    CanSendBondRequestToQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<CanSendBondRequestToQuery, CanSendBondRequestToQueryVariables>(
    CanSendBondRequestToDocument,
    options,
  )
}
export function useCanSendBondRequestToSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        CanSendBondRequestToQuery,
        CanSendBondRequestToQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<CanSendBondRequestToQuery, CanSendBondRequestToQueryVariables>(
    CanSendBondRequestToDocument,
    options,
  )
}
export type CanSendBondRequestToQueryHookResult = ReturnType<typeof useCanSendBondRequestToQuery>
export type CanSendBondRequestToLazyQueryHookResult = ReturnType<
  typeof useCanSendBondRequestToLazyQuery
>
export type CanSendBondRequestToSuspenseQueryHookResult = ReturnType<
  typeof useCanSendBondRequestToSuspenseQuery
>
export type CanSendBondRequestToQueryResult = Apollo.QueryResult<
  CanSendBondRequestToQuery,
  CanSendBondRequestToQueryVariables
>
export const GetSimilarityWithDocument = gql`
    query GetSimilarityWith($userId: String!) {
  getSimilarityWith(user_id: $userId) {
    mutual_bonds
    same_events
    music_overlap
    dance_styles
    similarity_score
  }
}
    `

/**
 * __useGetSimilarityWithQuery__
 *
 * To run a query within a React component, call `useGetSimilarityWithQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSimilarityWithQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSimilarityWithQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetSimilarityWithQuery(
  baseOptions: Apollo.QueryHookOptions<GetSimilarityWithQuery, GetSimilarityWithQueryVariables> &
    ({ variables: GetSimilarityWithQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetSimilarityWithQuery, GetSimilarityWithQueryVariables>(
    GetSimilarityWithDocument,
    options,
  )
}
export function useGetSimilarityWithLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetSimilarityWithQuery,
    GetSimilarityWithQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetSimilarityWithQuery, GetSimilarityWithQueryVariables>(
    GetSimilarityWithDocument,
    options,
  )
}
export function useGetSimilarityWithSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetSimilarityWithQuery, GetSimilarityWithQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetSimilarityWithQuery, GetSimilarityWithQueryVariables>(
    GetSimilarityWithDocument,
    options,
  )
}
export type GetSimilarityWithQueryHookResult = ReturnType<typeof useGetSimilarityWithQuery>
export type GetSimilarityWithLazyQueryHookResult = ReturnType<typeof useGetSimilarityWithLazyQuery>
export type GetSimilarityWithSuspenseQueryHookResult = ReturnType<
  typeof useGetSimilarityWithSuspenseQuery
>
export type GetSimilarityWithQueryResult = Apollo.QueryResult<
  GetSimilarityWithQuery,
  GetSimilarityWithQueryVariables
>
export const GetMyBondRequestStatsDocument = gql`
    query GetMyBondRequestStats {
  myBondRequestStats {
    pending_sent
    pending_received
    total_bonds
    acceptance_rate
  }
}
    `

/**
 * __useGetMyBondRequestStatsQuery__
 *
 * To run a query within a React component, call `useGetMyBondRequestStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyBondRequestStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyBondRequestStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyBondRequestStatsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetMyBondRequestStatsQuery,
    GetMyBondRequestStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyBondRequestStatsQuery, GetMyBondRequestStatsQueryVariables>(
    GetMyBondRequestStatsDocument,
    options,
  )
}
export function useGetMyBondRequestStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyBondRequestStatsQuery,
    GetMyBondRequestStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyBondRequestStatsQuery, GetMyBondRequestStatsQueryVariables>(
    GetMyBondRequestStatsDocument,
    options,
  )
}
export function useGetMyBondRequestStatsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetMyBondRequestStatsQuery,
        GetMyBondRequestStatsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyBondRequestStatsQuery, GetMyBondRequestStatsQueryVariables>(
    GetMyBondRequestStatsDocument,
    options,
  )
}
export type GetMyBondRequestStatsQueryHookResult = ReturnType<typeof useGetMyBondRequestStatsQuery>
export type GetMyBondRequestStatsLazyQueryHookResult = ReturnType<
  typeof useGetMyBondRequestStatsLazyQuery
>
export type GetMyBondRequestStatsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyBondRequestStatsSuspenseQuery
>
export type GetMyBondRequestStatsQueryResult = Apollo.QueryResult<
  GetMyBondRequestStatsQuery,
  GetMyBondRequestStatsQueryVariables
>
export const GetDailyChallengesDocument = gql`
    query GetDailyChallenges {
  dailyChallenges {
    date
    challenges {
      id
      title
      description
      challenge_type
      difficulty
      category
      target_value
      target_unit
      xp_reward
      points_reward
      time_limit_hours
    }
    user_progress {
      id
      challenge_id
      status
      progress
      started_at
      completed_at
      expires_at
    }
    total_xp_available
    total_points_available
  }
}
    `

/**
 * __useGetDailyChallengesQuery__
 *
 * To run a query within a React component, call `useGetDailyChallengesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDailyChallengesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDailyChallengesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetDailyChallengesQuery(
  baseOptions?: Apollo.QueryHookOptions<GetDailyChallengesQuery, GetDailyChallengesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetDailyChallengesQuery, GetDailyChallengesQueryVariables>(
    GetDailyChallengesDocument,
    options,
  )
}
export function useGetDailyChallengesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetDailyChallengesQuery,
    GetDailyChallengesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetDailyChallengesQuery, GetDailyChallengesQueryVariables>(
    GetDailyChallengesDocument,
    options,
  )
}
export function useGetDailyChallengesSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetDailyChallengesQuery, GetDailyChallengesQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetDailyChallengesQuery, GetDailyChallengesQueryVariables>(
    GetDailyChallengesDocument,
    options,
  )
}
export type GetDailyChallengesQueryHookResult = ReturnType<typeof useGetDailyChallengesQuery>
export type GetDailyChallengesLazyQueryHookResult = ReturnType<
  typeof useGetDailyChallengesLazyQuery
>
export type GetDailyChallengesSuspenseQueryHookResult = ReturnType<
  typeof useGetDailyChallengesSuspenseQuery
>
export type GetDailyChallengesQueryResult = Apollo.QueryResult<
  GetDailyChallengesQuery,
  GetDailyChallengesQueryVariables
>
export const GetMyChallengesDocument = gql`
    query GetMyChallenges {
  myActiveChallenges {
    id
    challenge_id
    status
    progress
    started_at
    expires_at
    challenge {
      id
      title
      description
      difficulty
      category
      target_value
      target_unit
      xp_reward
      points_reward
    }
  }
}
    `

/**
 * __useGetMyChallengesQuery__
 *
 * To run a query within a React component, call `useGetMyChallengesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyChallengesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyChallengesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyChallengesQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyChallengesQuery, GetMyChallengesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyChallengesQuery, GetMyChallengesQueryVariables>(
    GetMyChallengesDocument,
    options,
  )
}
export function useGetMyChallengesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetMyChallengesQuery, GetMyChallengesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyChallengesQuery, GetMyChallengesQueryVariables>(
    GetMyChallengesDocument,
    options,
  )
}
export function useGetMyChallengesSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyChallengesQuery, GetMyChallengesQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyChallengesQuery, GetMyChallengesQueryVariables>(
    GetMyChallengesDocument,
    options,
  )
}
export type GetMyChallengesQueryHookResult = ReturnType<typeof useGetMyChallengesQuery>
export type GetMyChallengesLazyQueryHookResult = ReturnType<typeof useGetMyChallengesLazyQuery>
export type GetMyChallengesSuspenseQueryHookResult = ReturnType<
  typeof useGetMyChallengesSuspenseQuery
>
export type GetMyChallengesQueryResult = Apollo.QueryResult<
  GetMyChallengesQuery,
  GetMyChallengesQueryVariables
>
export const GetMyChallengeStatsDocument = gql`
    query GetMyChallengeStats {
  myChallengeStats {
    total_completed
    total_xp_earned
    total_points_earned
    current_streak
    longest_streak
    completion_rate
    challenges_by_difficulty
  }
}
    `

/**
 * __useGetMyChallengeStatsQuery__
 *
 * To run a query within a React component, call `useGetMyChallengeStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyChallengeStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyChallengeStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyChallengeStatsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetMyChallengeStatsQuery,
    GetMyChallengeStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyChallengeStatsQuery, GetMyChallengeStatsQueryVariables>(
    GetMyChallengeStatsDocument,
    options,
  )
}
export function useGetMyChallengeStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyChallengeStatsQuery,
    GetMyChallengeStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyChallengeStatsQuery, GetMyChallengeStatsQueryVariables>(
    GetMyChallengeStatsDocument,
    options,
  )
}
export function useGetMyChallengeStatsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyChallengeStatsQuery, GetMyChallengeStatsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyChallengeStatsQuery, GetMyChallengeStatsQueryVariables>(
    GetMyChallengeStatsDocument,
    options,
  )
}
export type GetMyChallengeStatsQueryHookResult = ReturnType<typeof useGetMyChallengeStatsQuery>
export type GetMyChallengeStatsLazyQueryHookResult = ReturnType<
  typeof useGetMyChallengeStatsLazyQuery
>
export type GetMyChallengeStatsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyChallengeStatsSuspenseQuery
>
export type GetMyChallengeStatsQueryResult = Apollo.QueryResult<
  GetMyChallengeStatsQuery,
  GetMyChallengeStatsQueryVariables
>
export const GetEventByCheckinCodeDocument = gql`
    query GetEventByCheckinCode($code: String!) {
  eventByCheckinCode(code: $code) {
    id
    title
    description
    location_name
    start_date_time
    end_date_time
    is_registered
    checkin_code
    facilitator {
      privy_id
      display_name
      username
      avatar_url
    }
  }
}
    `

/**
 * __useGetEventByCheckinCodeQuery__
 *
 * To run a query within a React component, call `useGetEventByCheckinCodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventByCheckinCodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventByCheckinCodeQuery({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useGetEventByCheckinCodeQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetEventByCheckinCodeQuery,
    GetEventByCheckinCodeQueryVariables
  > &
    ({ variables: GetEventByCheckinCodeQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetEventByCheckinCodeQuery, GetEventByCheckinCodeQueryVariables>(
    GetEventByCheckinCodeDocument,
    options,
  )
}
export function useGetEventByCheckinCodeLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetEventByCheckinCodeQuery,
    GetEventByCheckinCodeQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetEventByCheckinCodeQuery, GetEventByCheckinCodeQueryVariables>(
    GetEventByCheckinCodeDocument,
    options,
  )
}
export function useGetEventByCheckinCodeSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetEventByCheckinCodeQuery,
        GetEventByCheckinCodeQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetEventByCheckinCodeQuery, GetEventByCheckinCodeQueryVariables>(
    GetEventByCheckinCodeDocument,
    options,
  )
}
export type GetEventByCheckinCodeQueryHookResult = ReturnType<typeof useGetEventByCheckinCodeQuery>
export type GetEventByCheckinCodeLazyQueryHookResult = ReturnType<
  typeof useGetEventByCheckinCodeLazyQuery
>
export type GetEventByCheckinCodeSuspenseQueryHookResult = ReturnType<
  typeof useGetEventByCheckinCodeSuspenseQuery
>
export type GetEventByCheckinCodeQueryResult = Apollo.QueryResult<
  GetEventByCheckinCodeQuery,
  GetEventByCheckinCodeQueryVariables
>
export const GetEventsDocument = gql`
    query GetEvents($filter: EventFilterInput, $pagination: PaginationInput, $sortBy: EventSortBy) {
  events(filter: $filter, pagination: $pagination, sortBy: $sortBy) {
    events {
      ...EventFullInfo
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${EventFullInfoFragmentDoc}`

/**
 * __useGetEventsQuery__
 *
 * To run a query within a React component, call `useGetEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *      sortBy: // value for 'sortBy'
 *   },
 * });
 */
export function useGetEventsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetEventsQuery, GetEventsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options)
}
export function useGetEventsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options)
}
export function useGetEventsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetEventsQuery, GetEventsQueryVariables>(
    GetEventsDocument,
    options,
  )
}
export type GetEventsQueryHookResult = ReturnType<typeof useGetEventsQuery>
export type GetEventsLazyQueryHookResult = ReturnType<typeof useGetEventsLazyQuery>
export type GetEventsSuspenseQueryHookResult = ReturnType<typeof useGetEventsSuspenseQuery>
export type GetEventsQueryResult = Apollo.QueryResult<GetEventsQuery, GetEventsQueryVariables>
export const GetEventDocument = gql`
    query GetEvent($id: ID!) {
  event(id: $id) {
    ...EventWithParticipants
  }
}
    ${EventWithParticipantsFragmentDoc}`

/**
 * __useGetEventQuery__
 *
 * To run a query within a React component, call `useGetEventQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetEventQuery(
  baseOptions: Apollo.QueryHookOptions<GetEventQuery, GetEventQueryVariables> &
    ({ variables: GetEventQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetEventQuery, GetEventQueryVariables>(GetEventDocument, options)
}
export function useGetEventLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetEventQuery, GetEventQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetEventQuery, GetEventQueryVariables>(GetEventDocument, options)
}
export function useGetEventSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetEventQuery, GetEventQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetEventQuery, GetEventQueryVariables>(GetEventDocument, options)
}
export type GetEventQueryHookResult = ReturnType<typeof useGetEventQuery>
export type GetEventLazyQueryHookResult = ReturnType<typeof useGetEventLazyQuery>
export type GetEventSuspenseQueryHookResult = ReturnType<typeof useGetEventSuspenseQuery>
export type GetEventQueryResult = Apollo.QueryResult<GetEventQuery, GetEventQueryVariables>
export const GetEventsNearLocationDocument = gql`
    query GetEventsNearLocation($latitude: Float!, $longitude: Float!, $radius: Float) {
  events(
    filter: {nearLocation: {latitude: $latitude, longitude: $longitude, radius: $radius}, status: upcoming}
  ) {
    events {
      ...EventFullInfo
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${EventFullInfoFragmentDoc}`

/**
 * __useGetEventsNearLocationQuery__
 *
 * To run a query within a React component, call `useGetEventsNearLocationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventsNearLocationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventsNearLocationQuery({
 *   variables: {
 *      latitude: // value for 'latitude'
 *      longitude: // value for 'longitude'
 *      radius: // value for 'radius'
 *   },
 * });
 */
export function useGetEventsNearLocationQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetEventsNearLocationQuery,
    GetEventsNearLocationQueryVariables
  > &
    ({ variables: GetEventsNearLocationQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetEventsNearLocationQuery, GetEventsNearLocationQueryVariables>(
    GetEventsNearLocationDocument,
    options,
  )
}
export function useGetEventsNearLocationLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetEventsNearLocationQuery,
    GetEventsNearLocationQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetEventsNearLocationQuery, GetEventsNearLocationQueryVariables>(
    GetEventsNearLocationDocument,
    options,
  )
}
export function useGetEventsNearLocationSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetEventsNearLocationQuery,
        GetEventsNearLocationQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetEventsNearLocationQuery, GetEventsNearLocationQueryVariables>(
    GetEventsNearLocationDocument,
    options,
  )
}
export type GetEventsNearLocationQueryHookResult = ReturnType<typeof useGetEventsNearLocationQuery>
export type GetEventsNearLocationLazyQueryHookResult = ReturnType<
  typeof useGetEventsNearLocationLazyQuery
>
export type GetEventsNearLocationSuspenseQueryHookResult = ReturnType<
  typeof useGetEventsNearLocationSuspenseQuery
>
export type GetEventsNearLocationQueryResult = Apollo.QueryResult<
  GetEventsNearLocationQuery,
  GetEventsNearLocationQueryVariables
>
export const GetMyRegisteredEventsDocument = gql`
    query GetMyRegisteredEvents {
  events(filter: {registered_by_me: true}) {
    events {
      ...EventFullInfo
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${EventFullInfoFragmentDoc}`

/**
 * __useGetMyRegisteredEventsQuery__
 *
 * To run a query within a React component, call `useGetMyRegisteredEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyRegisteredEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyRegisteredEventsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyRegisteredEventsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetMyRegisteredEventsQuery,
    GetMyRegisteredEventsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyRegisteredEventsQuery, GetMyRegisteredEventsQueryVariables>(
    GetMyRegisteredEventsDocument,
    options,
  )
}
export function useGetMyRegisteredEventsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyRegisteredEventsQuery,
    GetMyRegisteredEventsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyRegisteredEventsQuery, GetMyRegisteredEventsQueryVariables>(
    GetMyRegisteredEventsDocument,
    options,
  )
}
export function useGetMyRegisteredEventsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetMyRegisteredEventsQuery,
        GetMyRegisteredEventsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyRegisteredEventsQuery, GetMyRegisteredEventsQueryVariables>(
    GetMyRegisteredEventsDocument,
    options,
  )
}
export type GetMyRegisteredEventsQueryHookResult = ReturnType<typeof useGetMyRegisteredEventsQuery>
export type GetMyRegisteredEventsLazyQueryHookResult = ReturnType<
  typeof useGetMyRegisteredEventsLazyQuery
>
export type GetMyRegisteredEventsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyRegisteredEventsSuspenseQuery
>
export type GetMyRegisteredEventsQueryResult = Apollo.QueryResult<
  GetMyRegisteredEventsQuery,
  GetMyRegisteredEventsQueryVariables
>
export const GetMyCreatedEventsDocument = gql`
    query GetMyCreatedEvents {
  events(filter: {created_by_me: true}) {
    events {
      ...EventFullInfo
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${EventFullInfoFragmentDoc}`

/**
 * __useGetMyCreatedEventsQuery__
 *
 * To run a query within a React component, call `useGetMyCreatedEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyCreatedEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyCreatedEventsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyCreatedEventsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyCreatedEventsQuery, GetMyCreatedEventsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyCreatedEventsQuery, GetMyCreatedEventsQueryVariables>(
    GetMyCreatedEventsDocument,
    options,
  )
}
export function useGetMyCreatedEventsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyCreatedEventsQuery,
    GetMyCreatedEventsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyCreatedEventsQuery, GetMyCreatedEventsQueryVariables>(
    GetMyCreatedEventsDocument,
    options,
  )
}
export function useGetMyCreatedEventsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyCreatedEventsQuery, GetMyCreatedEventsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyCreatedEventsQuery, GetMyCreatedEventsQueryVariables>(
    GetMyCreatedEventsDocument,
    options,
  )
}
export type GetMyCreatedEventsQueryHookResult = ReturnType<typeof useGetMyCreatedEventsQuery>
export type GetMyCreatedEventsLazyQueryHookResult = ReturnType<
  typeof useGetMyCreatedEventsLazyQuery
>
export type GetMyCreatedEventsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyCreatedEventsSuspenseQuery
>
export type GetMyCreatedEventsQueryResult = Apollo.QueryResult<
  GetMyCreatedEventsQuery,
  GetMyCreatedEventsQueryVariables
>
export const GetOrganizerEventsDocument = gql`
    query GetOrganizerEvents($organizerId: String!) {
  events(filter: {facilitator_id: $organizerId}) {
    events {
      ...EventFullInfo
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${EventFullInfoFragmentDoc}`

/**
 * __useGetOrganizerEventsQuery__
 *
 * To run a query within a React component, call `useGetOrganizerEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOrganizerEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOrganizerEventsQuery({
 *   variables: {
 *      organizerId: // value for 'organizerId'
 *   },
 * });
 */
export function useGetOrganizerEventsQuery(
  baseOptions: Apollo.QueryHookOptions<GetOrganizerEventsQuery, GetOrganizerEventsQueryVariables> &
    ({ variables: GetOrganizerEventsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetOrganizerEventsQuery, GetOrganizerEventsQueryVariables>(
    GetOrganizerEventsDocument,
    options,
  )
}
export function useGetOrganizerEventsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetOrganizerEventsQuery,
    GetOrganizerEventsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetOrganizerEventsQuery, GetOrganizerEventsQueryVariables>(
    GetOrganizerEventsDocument,
    options,
  )
}
export function useGetOrganizerEventsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetOrganizerEventsQuery, GetOrganizerEventsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetOrganizerEventsQuery, GetOrganizerEventsQueryVariables>(
    GetOrganizerEventsDocument,
    options,
  )
}
export type GetOrganizerEventsQueryHookResult = ReturnType<typeof useGetOrganizerEventsQuery>
export type GetOrganizerEventsLazyQueryHookResult = ReturnType<
  typeof useGetOrganizerEventsLazyQuery
>
export type GetOrganizerEventsSuspenseQueryHookResult = ReturnType<
  typeof useGetOrganizerEventsSuspenseQuery
>
export type GetOrganizerEventsQueryResult = Apollo.QueryResult<
  GetOrganizerEventsQuery,
  GetOrganizerEventsQueryVariables
>
export const GetPastEventsDocument = gql`
    query GetPastEvents {
  events(filter: {status: past}) {
    events {
      ...EventFullInfo
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${EventFullInfoFragmentDoc}`

/**
 * __useGetPastEventsQuery__
 *
 * To run a query within a React component, call `useGetPastEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPastEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPastEventsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPastEventsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetPastEventsQuery, GetPastEventsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetPastEventsQuery, GetPastEventsQueryVariables>(
    GetPastEventsDocument,
    options,
  )
}
export function useGetPastEventsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetPastEventsQuery, GetPastEventsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetPastEventsQuery, GetPastEventsQueryVariables>(
    GetPastEventsDocument,
    options,
  )
}
export function useGetPastEventsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetPastEventsQuery, GetPastEventsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetPastEventsQuery, GetPastEventsQueryVariables>(
    GetPastEventsDocument,
    options,
  )
}
export type GetPastEventsQueryHookResult = ReturnType<typeof useGetPastEventsQuery>
export type GetPastEventsLazyQueryHookResult = ReturnType<typeof useGetPastEventsLazyQuery>
export type GetPastEventsSuspenseQueryHookResult = ReturnType<typeof useGetPastEventsSuspenseQuery>
export type GetPastEventsQueryResult = Apollo.QueryResult<
  GetPastEventsQuery,
  GetPastEventsQueryVariables
>
export const GetEventRegistrationsDocument = gql`
    query GetEventRegistrations($eventId: ID!, $status: RegistrationStatus) {
  eventRegistrations(eventId: $eventId, status: $status) {
    id
    event_id
    user_id
    status
    registration_date
    payment_status
    payment_amount
    user {
      ...UserBasicInfo
    }
  }
}
    ${UserBasicInfoFragmentDoc}`

/**
 * __useGetEventRegistrationsQuery__
 *
 * To run a query within a React component, call `useGetEventRegistrationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventRegistrationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventRegistrationsQuery({
 *   variables: {
 *      eventId: // value for 'eventId'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useGetEventRegistrationsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetEventRegistrationsQuery,
    GetEventRegistrationsQueryVariables
  > &
    ({ variables: GetEventRegistrationsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetEventRegistrationsQuery, GetEventRegistrationsQueryVariables>(
    GetEventRegistrationsDocument,
    options,
  )
}
export function useGetEventRegistrationsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetEventRegistrationsQuery,
    GetEventRegistrationsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetEventRegistrationsQuery, GetEventRegistrationsQueryVariables>(
    GetEventRegistrationsDocument,
    options,
  )
}
export function useGetEventRegistrationsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetEventRegistrationsQuery,
        GetEventRegistrationsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetEventRegistrationsQuery, GetEventRegistrationsQueryVariables>(
    GetEventRegistrationsDocument,
    options,
  )
}
export type GetEventRegistrationsQueryHookResult = ReturnType<typeof useGetEventRegistrationsQuery>
export type GetEventRegistrationsLazyQueryHookResult = ReturnType<
  typeof useGetEventRegistrationsLazyQuery
>
export type GetEventRegistrationsSuspenseQueryHookResult = ReturnType<
  typeof useGetEventRegistrationsSuspenseQuery
>
export type GetEventRegistrationsQueryResult = Apollo.QueryResult<
  GetEventRegistrationsQuery,
  GetEventRegistrationsQueryVariables
>
export const GetFeedDocument = gql`
    query GetFeed($limit: Int, $cursor: String) {
  getFeed(limit: $limit, cursor: $cursor) {
    posts {
      ...PostWithUser
    }
    has_more
    cursor
  }
}
    ${PostWithUserFragmentDoc}`

/**
 * __useGetFeedQuery__
 *
 * To run a query within a React component, call `useGetFeedQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFeedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFeedQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useGetFeedQuery(
  baseOptions?: Apollo.QueryHookOptions<GetFeedQuery, GetFeedQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetFeedQuery, GetFeedQueryVariables>(GetFeedDocument, options)
}
export function useGetFeedLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetFeedQuery, GetFeedQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetFeedQuery, GetFeedQueryVariables>(GetFeedDocument, options)
}
export function useGetFeedSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetFeedQuery, GetFeedQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetFeedQuery, GetFeedQueryVariables>(GetFeedDocument, options)
}
export type GetFeedQueryHookResult = ReturnType<typeof useGetFeedQuery>
export type GetFeedLazyQueryHookResult = ReturnType<typeof useGetFeedLazyQuery>
export type GetFeedSuspenseQueryHookResult = ReturnType<typeof useGetFeedSuspenseQuery>
export type GetFeedQueryResult = Apollo.QueryResult<GetFeedQuery, GetFeedQueryVariables>
export const GetPostDocument = gql`
    query GetPost($id: ID!) {
  getPost(id: $id) {
    ...PostWithDetails
  }
}
    ${PostWithDetailsFragmentDoc}`

/**
 * __useGetPostQuery__
 *
 * To run a query within a React component, call `useGetPostQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPostQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPostQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetPostQuery(
  baseOptions: Apollo.QueryHookOptions<GetPostQuery, GetPostQueryVariables> &
    ({ variables: GetPostQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetPostQuery, GetPostQueryVariables>(GetPostDocument, options)
}
export function useGetPostLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetPostQuery, GetPostQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetPostQuery, GetPostQueryVariables>(GetPostDocument, options)
}
export function useGetPostSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetPostQuery, GetPostQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetPostQuery, GetPostQueryVariables>(GetPostDocument, options)
}
export type GetPostQueryHookResult = ReturnType<typeof useGetPostQuery>
export type GetPostLazyQueryHookResult = ReturnType<typeof useGetPostLazyQuery>
export type GetPostSuspenseQueryHookResult = ReturnType<typeof useGetPostSuspenseQuery>
export type GetPostQueryResult = Apollo.QueryResult<GetPostQuery, GetPostQueryVariables>
export const GetMyPostsDocument = gql`
    query GetMyPosts($limit: Int, $offset: Int) {
  getMyPosts(limit: $limit, offset: $offset) {
    ...PostWithUser
  }
}
    ${PostWithUserFragmentDoc}`

/**
 * __useGetMyPostsQuery__
 *
 * To run a query within a React component, call `useGetMyPostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPostsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetMyPostsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyPostsQuery, GetMyPostsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyPostsQuery, GetMyPostsQueryVariables>(GetMyPostsDocument, options)
}
export function useGetMyPostsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetMyPostsQuery, GetMyPostsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyPostsQuery, GetMyPostsQueryVariables>(GetMyPostsDocument, options)
}
export function useGetMyPostsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyPostsQuery, GetMyPostsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyPostsQuery, GetMyPostsQueryVariables>(
    GetMyPostsDocument,
    options,
  )
}
export type GetMyPostsQueryHookResult = ReturnType<typeof useGetMyPostsQuery>
export type GetMyPostsLazyQueryHookResult = ReturnType<typeof useGetMyPostsLazyQuery>
export type GetMyPostsSuspenseQueryHookResult = ReturnType<typeof useGetMyPostsSuspenseQuery>
export type GetMyPostsQueryResult = Apollo.QueryResult<GetMyPostsQuery, GetMyPostsQueryVariables>
export const GetUserPostsDocument = gql`
    query GetUserPosts($userId: String!, $limit: Int, $offset: Int) {
  getUserPosts(userId: $userId, limit: $limit, offset: $offset) {
    ...PostWithUser
  }
}
    ${PostWithUserFragmentDoc}`

/**
 * __useGetUserPostsQuery__
 *
 * To run a query within a React component, call `useGetUserPostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserPostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserPostsQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetUserPostsQuery(
  baseOptions: Apollo.QueryHookOptions<GetUserPostsQuery, GetUserPostsQueryVariables> &
    ({ variables: GetUserPostsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetUserPostsQuery, GetUserPostsQueryVariables>(
    GetUserPostsDocument,
    options,
  )
}
export function useGetUserPostsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetUserPostsQuery, GetUserPostsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetUserPostsQuery, GetUserPostsQueryVariables>(
    GetUserPostsDocument,
    options,
  )
}
export function useGetUserPostsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetUserPostsQuery, GetUserPostsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetUserPostsQuery, GetUserPostsQueryVariables>(
    GetUserPostsDocument,
    options,
  )
}
export type GetUserPostsQueryHookResult = ReturnType<typeof useGetUserPostsQuery>
export type GetUserPostsLazyQueryHookResult = ReturnType<typeof useGetUserPostsLazyQuery>
export type GetUserPostsSuspenseQueryHookResult = ReturnType<typeof useGetUserPostsSuspenseQuery>
export type GetUserPostsQueryResult = Apollo.QueryResult<
  GetUserPostsQuery,
  GetUserPostsQueryVariables
>
export const GetEventPostsDocument = gql`
    query GetEventPosts($eventId: ID!, $limit: Int, $offset: Int) {
  getEventPosts(eventId: $eventId, limit: $limit, offset: $offset) {
    ...PostWithUser
  }
}
    ${PostWithUserFragmentDoc}`

/**
 * __useGetEventPostsQuery__
 *
 * To run a query within a React component, call `useGetEventPostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventPostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventPostsQuery({
 *   variables: {
 *      eventId: // value for 'eventId'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetEventPostsQuery(
  baseOptions: Apollo.QueryHookOptions<GetEventPostsQuery, GetEventPostsQueryVariables> &
    ({ variables: GetEventPostsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetEventPostsQuery, GetEventPostsQueryVariables>(
    GetEventPostsDocument,
    options,
  )
}
export function useGetEventPostsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetEventPostsQuery, GetEventPostsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetEventPostsQuery, GetEventPostsQueryVariables>(
    GetEventPostsDocument,
    options,
  )
}
export function useGetEventPostsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetEventPostsQuery, GetEventPostsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetEventPostsQuery, GetEventPostsQueryVariables>(
    GetEventPostsDocument,
    options,
  )
}
export type GetEventPostsQueryHookResult = ReturnType<typeof useGetEventPostsQuery>
export type GetEventPostsLazyQueryHookResult = ReturnType<typeof useGetEventPostsLazyQuery>
export type GetEventPostsSuspenseQueryHookResult = ReturnType<typeof useGetEventPostsSuspenseQuery>
export type GetEventPostsQueryResult = Apollo.QueryResult<
  GetEventPostsQuery,
  GetEventPostsQueryVariables
>
export const GetMyGigDashboardDocument = gql`
    query GetMyGigDashboard {
  myGigDashboard {
    stats {
      ...GigStatsBasic
    }
    availableGigs {
      ...EventGigFull
    }
    activeGigs {
      ...GigApplicationWithGig
    }
    recentHistory {
      ...GigApplicationWithGig
    }
  }
}
    ${GigStatsBasicFragmentDoc}
${EventGigFullFragmentDoc}
${GigApplicationWithGigFragmentDoc}`

/**
 * __useGetMyGigDashboardQuery__
 *
 * To run a query within a React component, call `useGetMyGigDashboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyGigDashboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyGigDashboardQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyGigDashboardQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyGigDashboardQuery, GetMyGigDashboardQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyGigDashboardQuery, GetMyGigDashboardQueryVariables>(
    GetMyGigDashboardDocument,
    options,
  )
}
export function useGetMyGigDashboardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyGigDashboardQuery,
    GetMyGigDashboardQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyGigDashboardQuery, GetMyGigDashboardQueryVariables>(
    GetMyGigDashboardDocument,
    options,
  )
}
export function useGetMyGigDashboardSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyGigDashboardQuery, GetMyGigDashboardQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyGigDashboardQuery, GetMyGigDashboardQueryVariables>(
    GetMyGigDashboardDocument,
    options,
  )
}
export type GetMyGigDashboardQueryHookResult = ReturnType<typeof useGetMyGigDashboardQuery>
export type GetMyGigDashboardLazyQueryHookResult = ReturnType<typeof useGetMyGigDashboardLazyQuery>
export type GetMyGigDashboardSuspenseQueryHookResult = ReturnType<
  typeof useGetMyGigDashboardSuspenseQuery
>
export type GetMyGigDashboardQueryResult = Apollo.QueryResult<
  GetMyGigDashboardQuery,
  GetMyGigDashboardQueryVariables
>
export const GetAvailableGigsForMeDocument = gql`
    query GetAvailableGigsForMe($eventId: ID, $limit: Int, $offset: Int) {
  availableGigsForMe(eventId: $eventId, limit: $limit, offset: $offset) {
    ...EventGigFull
  }
}
    ${EventGigFullFragmentDoc}`

/**
 * __useGetAvailableGigsForMeQuery__
 *
 * To run a query within a React component, call `useGetAvailableGigsForMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAvailableGigsForMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAvailableGigsForMeQuery({
 *   variables: {
 *      eventId: // value for 'eventId'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetAvailableGigsForMeQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetAvailableGigsForMeQuery,
    GetAvailableGigsForMeQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetAvailableGigsForMeQuery, GetAvailableGigsForMeQueryVariables>(
    GetAvailableGigsForMeDocument,
    options,
  )
}
export function useGetAvailableGigsForMeLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetAvailableGigsForMeQuery,
    GetAvailableGigsForMeQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetAvailableGigsForMeQuery, GetAvailableGigsForMeQueryVariables>(
    GetAvailableGigsForMeDocument,
    options,
  )
}
export function useGetAvailableGigsForMeSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetAvailableGigsForMeQuery,
        GetAvailableGigsForMeQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetAvailableGigsForMeQuery, GetAvailableGigsForMeQueryVariables>(
    GetAvailableGigsForMeDocument,
    options,
  )
}
export type GetAvailableGigsForMeQueryHookResult = ReturnType<typeof useGetAvailableGigsForMeQuery>
export type GetAvailableGigsForMeLazyQueryHookResult = ReturnType<
  typeof useGetAvailableGigsForMeLazyQuery
>
export type GetAvailableGigsForMeSuspenseQueryHookResult = ReturnType<
  typeof useGetAvailableGigsForMeSuspenseQuery
>
export type GetAvailableGigsForMeQueryResult = Apollo.QueryResult<
  GetAvailableGigsForMeQuery,
  GetAvailableGigsForMeQueryVariables
>
export const GetGigManagerDashboardDocument = gql`
    query GetGigManagerDashboard {
  gigManagerDashboard {
    pendingGigApplications {
      id
      gigId
      userId
      status
      applicationNote
      createdAt
      user {
        privy_id
        username
        display_name
        avatar_url
      }
      gig {
        id
        eventId
        roleId
        title
        description
        danzReward
        role {
          id
          name
          slug
          icon
          category
        }
        event {
          id
          title
          start_date_time
          location_name
        }
      }
    }
    stats {
      totalReviewed
      approvedCount
      rejectedCount
      averageReviewTime
      todayReviewed
    }
  }
}
    `

/**
 * __useGetGigManagerDashboardQuery__
 *
 * To run a query within a React component, call `useGetGigManagerDashboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGigManagerDashboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGigManagerDashboardQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetGigManagerDashboardQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetGigManagerDashboardQuery,
    GetGigManagerDashboardQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetGigManagerDashboardQuery, GetGigManagerDashboardQueryVariables>(
    GetGigManagerDashboardDocument,
    options,
  )
}
export function useGetGigManagerDashboardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetGigManagerDashboardQuery,
    GetGigManagerDashboardQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetGigManagerDashboardQuery, GetGigManagerDashboardQueryVariables>(
    GetGigManagerDashboardDocument,
    options,
  )
}
export function useGetGigManagerDashboardSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetGigManagerDashboardQuery,
        GetGigManagerDashboardQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetGigManagerDashboardQuery, GetGigManagerDashboardQueryVariables>(
    GetGigManagerDashboardDocument,
    options,
  )
}
export type GetGigManagerDashboardQueryHookResult = ReturnType<
  typeof useGetGigManagerDashboardQuery
>
export type GetGigManagerDashboardLazyQueryHookResult = ReturnType<
  typeof useGetGigManagerDashboardLazyQuery
>
export type GetGigManagerDashboardSuspenseQueryHookResult = ReturnType<
  typeof useGetGigManagerDashboardSuspenseQuery
>
export type GetGigManagerDashboardQueryResult = Apollo.QueryResult<
  GetGigManagerDashboardQuery,
  GetGigManagerDashboardQueryVariables
>
export const GetGlobalLeaderboardDocument = gql`
    query GetGlobalLeaderboard($metric: LeaderboardMetric!, $limit: Int) {
  globalLeaderboard(metric: $metric, limit: $limit) {
    type
    metric
    period
    updated_at
    total_participants
    entries {
      rank
      previous_rank
      rank_change
      user_id
      username
      display_name
      avatar_url
      level
      value
      is_current_user
      country
    }
    current_user_entry {
      rank
      value
      is_current_user
    }
    nearby_entries {
      rank
      username
      avatar_url
      value
      is_current_user
    }
  }
}
    `

/**
 * __useGetGlobalLeaderboardQuery__
 *
 * To run a query within a React component, call `useGetGlobalLeaderboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGlobalLeaderboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGlobalLeaderboardQuery({
 *   variables: {
 *      metric: // value for 'metric'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetGlobalLeaderboardQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetGlobalLeaderboardQuery,
    GetGlobalLeaderboardQueryVariables
  > &
    ({ variables: GetGlobalLeaderboardQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetGlobalLeaderboardQuery, GetGlobalLeaderboardQueryVariables>(
    GetGlobalLeaderboardDocument,
    options,
  )
}
export function useGetGlobalLeaderboardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetGlobalLeaderboardQuery,
    GetGlobalLeaderboardQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetGlobalLeaderboardQuery, GetGlobalLeaderboardQueryVariables>(
    GetGlobalLeaderboardDocument,
    options,
  )
}
export function useGetGlobalLeaderboardSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetGlobalLeaderboardQuery,
        GetGlobalLeaderboardQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetGlobalLeaderboardQuery, GetGlobalLeaderboardQueryVariables>(
    GetGlobalLeaderboardDocument,
    options,
  )
}
export type GetGlobalLeaderboardQueryHookResult = ReturnType<typeof useGetGlobalLeaderboardQuery>
export type GetGlobalLeaderboardLazyQueryHookResult = ReturnType<
  typeof useGetGlobalLeaderboardLazyQuery
>
export type GetGlobalLeaderboardSuspenseQueryHookResult = ReturnType<
  typeof useGetGlobalLeaderboardSuspenseQuery
>
export type GetGlobalLeaderboardQueryResult = Apollo.QueryResult<
  GetGlobalLeaderboardQuery,
  GetGlobalLeaderboardQueryVariables
>
export const GetWeeklyLeaderboardDocument = gql`
    query GetWeeklyLeaderboard($metric: LeaderboardMetric!, $limit: Int) {
  weeklyLeaderboard(metric: $metric, limit: $limit) {
    type
    metric
    period
    total_participants
    entries {
      rank
      user_id
      username
      display_name
      avatar_url
      level
      value
      is_current_user
    }
    current_user_entry {
      rank
      value
    }
  }
}
    `

/**
 * __useGetWeeklyLeaderboardQuery__
 *
 * To run a query within a React component, call `useGetWeeklyLeaderboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWeeklyLeaderboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetWeeklyLeaderboardQuery({
 *   variables: {
 *      metric: // value for 'metric'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetWeeklyLeaderboardQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetWeeklyLeaderboardQuery,
    GetWeeklyLeaderboardQueryVariables
  > &
    ({ variables: GetWeeklyLeaderboardQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetWeeklyLeaderboardQuery, GetWeeklyLeaderboardQueryVariables>(
    GetWeeklyLeaderboardDocument,
    options,
  )
}
export function useGetWeeklyLeaderboardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetWeeklyLeaderboardQuery,
    GetWeeklyLeaderboardQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetWeeklyLeaderboardQuery, GetWeeklyLeaderboardQueryVariables>(
    GetWeeklyLeaderboardDocument,
    options,
  )
}
export function useGetWeeklyLeaderboardSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetWeeklyLeaderboardQuery,
        GetWeeklyLeaderboardQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetWeeklyLeaderboardQuery, GetWeeklyLeaderboardQueryVariables>(
    GetWeeklyLeaderboardDocument,
    options,
  )
}
export type GetWeeklyLeaderboardQueryHookResult = ReturnType<typeof useGetWeeklyLeaderboardQuery>
export type GetWeeklyLeaderboardLazyQueryHookResult = ReturnType<
  typeof useGetWeeklyLeaderboardLazyQuery
>
export type GetWeeklyLeaderboardSuspenseQueryHookResult = ReturnType<
  typeof useGetWeeklyLeaderboardSuspenseQuery
>
export type GetWeeklyLeaderboardQueryResult = Apollo.QueryResult<
  GetWeeklyLeaderboardQuery,
  GetWeeklyLeaderboardQueryVariables
>
export const GetMyLeaderboardSummaryDocument = gql`
    query GetMyLeaderboardSummary {
  myLeaderboardSummary {
    global_rank
    regional_rank
    friends_rank
    weekly_change
    top_metric
    top_metric_rank
    percentile
  }
}
    `

/**
 * __useGetMyLeaderboardSummaryQuery__
 *
 * To run a query within a React component, call `useGetMyLeaderboardSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyLeaderboardSummaryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyLeaderboardSummaryQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyLeaderboardSummaryQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetMyLeaderboardSummaryQuery,
    GetMyLeaderboardSummaryQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyLeaderboardSummaryQuery, GetMyLeaderboardSummaryQueryVariables>(
    GetMyLeaderboardSummaryDocument,
    options,
  )
}
export function useGetMyLeaderboardSummaryLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyLeaderboardSummaryQuery,
    GetMyLeaderboardSummaryQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyLeaderboardSummaryQuery, GetMyLeaderboardSummaryQueryVariables>(
    GetMyLeaderboardSummaryDocument,
    options,
  )
}
export function useGetMyLeaderboardSummarySuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetMyLeaderboardSummaryQuery,
        GetMyLeaderboardSummaryQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<
    GetMyLeaderboardSummaryQuery,
    GetMyLeaderboardSummaryQueryVariables
  >(GetMyLeaderboardSummaryDocument, options)
}
export type GetMyLeaderboardSummaryQueryHookResult = ReturnType<
  typeof useGetMyLeaderboardSummaryQuery
>
export type GetMyLeaderboardSummaryLazyQueryHookResult = ReturnType<
  typeof useGetMyLeaderboardSummaryLazyQuery
>
export type GetMyLeaderboardSummarySuspenseQueryHookResult = ReturnType<
  typeof useGetMyLeaderboardSummarySuspenseQuery
>
export type GetMyLeaderboardSummaryQueryResult = Apollo.QueryResult<
  GetMyLeaderboardSummaryQuery,
  GetMyLeaderboardSummaryQueryVariables
>
export const GetMyNotificationsDocument = gql`
    query GetMyNotifications($limit: Int, $offset: Int, $type: NotificationType, $unread_only: Boolean) {
  myNotifications(
    limit: $limit
    offset: $offset
    type: $type
    unread_only: $unread_only
  ) {
    notifications {
      id
      title
      message
      type
      read
      created_at
      action_type
      action_data
      event_id
      post_id
      achievement_id
      bond_id
      sender {
        privy_id
        display_name
        username
        avatar_url
      }
      event {
        id
        title
      }
    }
    has_more
    total_count
    unread_count
  }
}
    `

/**
 * __useGetMyNotificationsQuery__
 *
 * To run a query within a React component, call `useGetMyNotificationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyNotificationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyNotificationsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      type: // value for 'type'
 *      unread_only: // value for 'unread_only'
 *   },
 * });
 */
export function useGetMyNotificationsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyNotificationsQuery, GetMyNotificationsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyNotificationsQuery, GetMyNotificationsQueryVariables>(
    GetMyNotificationsDocument,
    options,
  )
}
export function useGetMyNotificationsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyNotificationsQuery,
    GetMyNotificationsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyNotificationsQuery, GetMyNotificationsQueryVariables>(
    GetMyNotificationsDocument,
    options,
  )
}
export function useGetMyNotificationsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyNotificationsQuery, GetMyNotificationsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyNotificationsQuery, GetMyNotificationsQueryVariables>(
    GetMyNotificationsDocument,
    options,
  )
}
export type GetMyNotificationsQueryHookResult = ReturnType<typeof useGetMyNotificationsQuery>
export type GetMyNotificationsLazyQueryHookResult = ReturnType<
  typeof useGetMyNotificationsLazyQuery
>
export type GetMyNotificationsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyNotificationsSuspenseQuery
>
export type GetMyNotificationsQueryResult = Apollo.QueryResult<
  GetMyNotificationsQuery,
  GetMyNotificationsQueryVariables
>
export const GetUnreadNotificationCountDocument = gql`
    query GetUnreadNotificationCount {
  unreadNotificationCount
}
    `

/**
 * __useGetUnreadNotificationCountQuery__
 *
 * To run a query within a React component, call `useGetUnreadNotificationCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUnreadNotificationCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUnreadNotificationCountQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUnreadNotificationCountQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetUnreadNotificationCountQuery,
    GetUnreadNotificationCountQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetUnreadNotificationCountQuery, GetUnreadNotificationCountQueryVariables>(
    GetUnreadNotificationCountDocument,
    options,
  )
}
export function useGetUnreadNotificationCountLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetUnreadNotificationCountQuery,
    GetUnreadNotificationCountQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<
    GetUnreadNotificationCountQuery,
    GetUnreadNotificationCountQueryVariables
  >(GetUnreadNotificationCountDocument, options)
}
export function useGetUnreadNotificationCountSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetUnreadNotificationCountQuery,
        GetUnreadNotificationCountQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<
    GetUnreadNotificationCountQuery,
    GetUnreadNotificationCountQueryVariables
  >(GetUnreadNotificationCountDocument, options)
}
export type GetUnreadNotificationCountQueryHookResult = ReturnType<
  typeof useGetUnreadNotificationCountQuery
>
export type GetUnreadNotificationCountLazyQueryHookResult = ReturnType<
  typeof useGetUnreadNotificationCountLazyQuery
>
export type GetUnreadNotificationCountSuspenseQueryHookResult = ReturnType<
  typeof useGetUnreadNotificationCountSuspenseQuery
>
export type GetUnreadNotificationCountQueryResult = Apollo.QueryResult<
  GetUnreadNotificationCountQuery,
  GetUnreadNotificationCountQueryVariables
>
export const GetMyPrivacySettingsDocument = gql`
    query GetMyPrivacySettings {
  myPrivacySettings {
    id
    user_id
    profile_visibility
    show_real_name
    show_bio
    show_avatar
    show_city
    show_dance_styles
    show_stats
    show_badges
    show_events_attending
    show_events_attended
    show_check_ins
    show_leaderboard_rank
    show_posts
    show_likes
    show_comments
    searchable_by_username
    appear_in_suggestions
    appear_in_event_attendees
    appear_in_nearby
    allow_bond_requests
    allow_messages
    allow_event_invites
    notify_bonds_on_check_in
    notify_bonds_on_achievement
    updated_at
  }
}
    `

/**
 * __useGetMyPrivacySettingsQuery__
 *
 * To run a query within a React component, call `useGetMyPrivacySettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPrivacySettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPrivacySettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyPrivacySettingsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetMyPrivacySettingsQuery,
    GetMyPrivacySettingsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyPrivacySettingsQuery, GetMyPrivacySettingsQueryVariables>(
    GetMyPrivacySettingsDocument,
    options,
  )
}
export function useGetMyPrivacySettingsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyPrivacySettingsQuery,
    GetMyPrivacySettingsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyPrivacySettingsQuery, GetMyPrivacySettingsQueryVariables>(
    GetMyPrivacySettingsDocument,
    options,
  )
}
export function useGetMyPrivacySettingsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        GetMyPrivacySettingsQuery,
        GetMyPrivacySettingsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyPrivacySettingsQuery, GetMyPrivacySettingsQueryVariables>(
    GetMyPrivacySettingsDocument,
    options,
  )
}
export type GetMyPrivacySettingsQueryHookResult = ReturnType<typeof useGetMyPrivacySettingsQuery>
export type GetMyPrivacySettingsLazyQueryHookResult = ReturnType<
  typeof useGetMyPrivacySettingsLazyQuery
>
export type GetMyPrivacySettingsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyPrivacySettingsSuspenseQuery
>
export type GetMyPrivacySettingsQueryResult = Apollo.QueryResult<
  GetMyPrivacySettingsQuery,
  GetMyPrivacySettingsQueryVariables
>
export const GetPrivacyPresetsDocument = gql`
    query GetPrivacyPresets {
  privacyPresets {
    name
    description
    profile_visibility
    searchable
    appear_in_suggestions
    allow_messages
  }
}
    `

/**
 * __useGetPrivacyPresetsQuery__
 *
 * To run a query within a React component, call `useGetPrivacyPresetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPrivacyPresetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPrivacyPresetsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPrivacyPresetsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetPrivacyPresetsQuery, GetPrivacyPresetsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetPrivacyPresetsQuery, GetPrivacyPresetsQueryVariables>(
    GetPrivacyPresetsDocument,
    options,
  )
}
export function useGetPrivacyPresetsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetPrivacyPresetsQuery,
    GetPrivacyPresetsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetPrivacyPresetsQuery, GetPrivacyPresetsQueryVariables>(
    GetPrivacyPresetsDocument,
    options,
  )
}
export function useGetPrivacyPresetsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetPrivacyPresetsQuery, GetPrivacyPresetsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetPrivacyPresetsQuery, GetPrivacyPresetsQueryVariables>(
    GetPrivacyPresetsDocument,
    options,
  )
}
export type GetPrivacyPresetsQueryHookResult = ReturnType<typeof useGetPrivacyPresetsQuery>
export type GetPrivacyPresetsLazyQueryHookResult = ReturnType<typeof useGetPrivacyPresetsLazyQuery>
export type GetPrivacyPresetsSuspenseQueryHookResult = ReturnType<
  typeof useGetPrivacyPresetsSuspenseQuery
>
export type GetPrivacyPresetsQueryResult = Apollo.QueryResult<
  GetPrivacyPresetsQuery,
  GetPrivacyPresetsQueryVariables
>
export const GetSuggestedUsersDocument = gql`
    query GetSuggestedUsers($limit: Int, $offset: Int) {
  suggestedUsers(limit: $limit, offset: $offset) {
    suggestions {
      id
      user {
        privy_id
        username
        display_name
        avatar_url
        city
      }
      source
      score
      reason
      created_at
    }
    total_count
    has_more
  }
}
    `

/**
 * __useGetSuggestedUsersQuery__
 *
 * To run a query within a React component, call `useGetSuggestedUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSuggestedUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSuggestedUsersQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetSuggestedUsersQuery(
  baseOptions?: Apollo.QueryHookOptions<GetSuggestedUsersQuery, GetSuggestedUsersQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetSuggestedUsersQuery, GetSuggestedUsersQueryVariables>(
    GetSuggestedUsersDocument,
    options,
  )
}
export function useGetSuggestedUsersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetSuggestedUsersQuery,
    GetSuggestedUsersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetSuggestedUsersQuery, GetSuggestedUsersQueryVariables>(
    GetSuggestedUsersDocument,
    options,
  )
}
export function useGetSuggestedUsersSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetSuggestedUsersQuery, GetSuggestedUsersQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetSuggestedUsersQuery, GetSuggestedUsersQueryVariables>(
    GetSuggestedUsersDocument,
    options,
  )
}
export type GetSuggestedUsersQueryHookResult = ReturnType<typeof useGetSuggestedUsersQuery>
export type GetSuggestedUsersLazyQueryHookResult = ReturnType<typeof useGetSuggestedUsersLazyQuery>
export type GetSuggestedUsersSuspenseQueryHookResult = ReturnType<
  typeof useGetSuggestedUsersSuspenseQuery
>
export type GetSuggestedUsersQueryResult = Apollo.QueryResult<
  GetSuggestedUsersQuery,
  GetSuggestedUsersQueryVariables
>
export const SearchUsersDocument = gql`
    query SearchUsers($input: SearchUsersInput!) {
  searchUsers(input: $input) {
    results {
      user {
        privy_id
        username
        display_name
        avatar_url
        city
      }
      can_view_profile
      can_message
      is_bond
      mutual_bonds_count
    }
    total_count
    has_more
  }
}
    `

/**
 * __useSearchUsersQuery__
 *
 * To run a query within a React component, call `useSearchUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchUsersQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSearchUsersQuery(
  baseOptions: Apollo.QueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables> &
    ({ variables: SearchUsersQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<SearchUsersQuery, SearchUsersQueryVariables>(SearchUsersDocument, options)
}
export function useSearchUsersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<SearchUsersQuery, SearchUsersQueryVariables>(
    SearchUsersDocument,
    options,
  )
}
export function useSearchUsersSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<SearchUsersQuery, SearchUsersQueryVariables>(
    SearchUsersDocument,
    options,
  )
}
export type SearchUsersQueryHookResult = ReturnType<typeof useSearchUsersQuery>
export type SearchUsersLazyQueryHookResult = ReturnType<typeof useSearchUsersLazyQuery>
export type SearchUsersSuspenseQueryHookResult = ReturnType<typeof useSearchUsersSuspenseQuery>
export type SearchUsersQueryResult = Apollo.QueryResult<SearchUsersQuery, SearchUsersQueryVariables>
export const CanViewProfileDocument = gql`
    query CanViewProfile($userId: String!) {
  canViewProfile(user_id: $userId) {
    can_view
    reason
  }
}
    `

/**
 * __useCanViewProfileQuery__
 *
 * To run a query within a React component, call `useCanViewProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useCanViewProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCanViewProfileQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useCanViewProfileQuery(
  baseOptions: Apollo.QueryHookOptions<CanViewProfileQuery, CanViewProfileQueryVariables> &
    ({ variables: CanViewProfileQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<CanViewProfileQuery, CanViewProfileQueryVariables>(
    CanViewProfileDocument,
    options,
  )
}
export function useCanViewProfileLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<CanViewProfileQuery, CanViewProfileQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<CanViewProfileQuery, CanViewProfileQueryVariables>(
    CanViewProfileDocument,
    options,
  )
}
export function useCanViewProfileSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<CanViewProfileQuery, CanViewProfileQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<CanViewProfileQuery, CanViewProfileQueryVariables>(
    CanViewProfileDocument,
    options,
  )
}
export type CanViewProfileQueryHookResult = ReturnType<typeof useCanViewProfileQuery>
export type CanViewProfileLazyQueryHookResult = ReturnType<typeof useCanViewProfileLazyQuery>
export type CanViewProfileSuspenseQueryHookResult = ReturnType<
  typeof useCanViewProfileSuspenseQuery
>
export type CanViewProfileQueryResult = Apollo.QueryResult<
  CanViewProfileQuery,
  CanViewProfileQueryVariables
>
export const CanMessageUserDocument = gql`
    query CanMessageUser($userId: String!) {
  canMessageUser(user_id: $userId) {
    can_view
    reason
  }
}
    `

/**
 * __useCanMessageUserQuery__
 *
 * To run a query within a React component, call `useCanMessageUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useCanMessageUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCanMessageUserQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useCanMessageUserQuery(
  baseOptions: Apollo.QueryHookOptions<CanMessageUserQuery, CanMessageUserQueryVariables> &
    ({ variables: CanMessageUserQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<CanMessageUserQuery, CanMessageUserQueryVariables>(
    CanMessageUserDocument,
    options,
  )
}
export function useCanMessageUserLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<CanMessageUserQuery, CanMessageUserQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<CanMessageUserQuery, CanMessageUserQueryVariables>(
    CanMessageUserDocument,
    options,
  )
}
export function useCanMessageUserSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<CanMessageUserQuery, CanMessageUserQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<CanMessageUserQuery, CanMessageUserQueryVariables>(
    CanMessageUserDocument,
    options,
  )
}
export type CanMessageUserQueryHookResult = ReturnType<typeof useCanMessageUserQuery>
export type CanMessageUserLazyQueryHookResult = ReturnType<typeof useCanMessageUserLazyQuery>
export type CanMessageUserSuspenseQueryHookResult = ReturnType<
  typeof useCanMessageUserSuspenseQuery
>
export type CanMessageUserQueryResult = Apollo.QueryResult<
  CanMessageUserQuery,
  CanMessageUserQueryVariables
>
export const GetMyBondsDocument = gql`
    query GetMyBonds($limit: Int, $offset: Int) {
  myBonds(limit: $limit, offset: $offset) {
    privy_id
    username
    display_name
    avatar_url
    city
  }
}
    `

/**
 * __useGetMyBondsQuery__
 *
 * To run a query within a React component, call `useGetMyBondsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyBondsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyBondsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetMyBondsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyBondsQuery, GetMyBondsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyBondsQuery, GetMyBondsQueryVariables>(GetMyBondsDocument, options)
}
export function useGetMyBondsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetMyBondsQuery, GetMyBondsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyBondsQuery, GetMyBondsQueryVariables>(GetMyBondsDocument, options)
}
export function useGetMyBondsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyBondsQuery, GetMyBondsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyBondsQuery, GetMyBondsQueryVariables>(
    GetMyBondsDocument,
    options,
  )
}
export type GetMyBondsQueryHookResult = ReturnType<typeof useGetMyBondsQuery>
export type GetMyBondsLazyQueryHookResult = ReturnType<typeof useGetMyBondsLazyQuery>
export type GetMyBondsSuspenseQueryHookResult = ReturnType<typeof useGetMyBondsSuspenseQuery>
export type GetMyBondsQueryResult = Apollo.QueryResult<GetMyBondsQuery, GetMyBondsQueryVariables>
export const GetMyReferralStatsDocument = gql`
    query GetMyReferralStats {
  myReferralStats {
    total_signups
    total_completed
    total_clicks
    total_points_earned
    pending_referrals
    completed_referrals
    conversion_rate
  }
  myReferralCode {
    id
    referral_code
    share_url
    total_clicks
    total_signups
    total_completed
    created_at
  }
}
    `

/**
 * __useGetMyReferralStatsQuery__
 *
 * To run a query within a React component, call `useGetMyReferralStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyReferralStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyReferralStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyReferralStatsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyReferralStatsQuery, GetMyReferralStatsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyReferralStatsQuery, GetMyReferralStatsQueryVariables>(
    GetMyReferralStatsDocument,
    options,
  )
}
export function useGetMyReferralStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMyReferralStatsQuery,
    GetMyReferralStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyReferralStatsQuery, GetMyReferralStatsQueryVariables>(
    GetMyReferralStatsDocument,
    options,
  )
}
export function useGetMyReferralStatsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyReferralStatsQuery, GetMyReferralStatsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyReferralStatsQuery, GetMyReferralStatsQueryVariables>(
    GetMyReferralStatsDocument,
    options,
  )
}
export type GetMyReferralStatsQueryHookResult = ReturnType<typeof useGetMyReferralStatsQuery>
export type GetMyReferralStatsLazyQueryHookResult = ReturnType<
  typeof useGetMyReferralStatsLazyQuery
>
export type GetMyReferralStatsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyReferralStatsSuspenseQuery
>
export type GetMyReferralStatsQueryResult = Apollo.QueryResult<
  GetMyReferralStatsQuery,
  GetMyReferralStatsQueryVariables
>
export const GetMyReferralsDocument = gql`
    query GetMyReferrals($limit: Int, $offset: Int, $status: ReferralStatus) {
  myReferrals(limit: $limit, offset: $offset, status: $status) {
    id
    referral_code
    status
    points_awarded
    clicked_at
    completed_at
    signed_up_at
    first_session_completed_at
    referee {
      ...UserBasicInfo
    }
  }
}
    ${UserBasicInfoFragmentDoc}`

/**
 * __useGetMyReferralsQuery__
 *
 * To run a query within a React component, call `useGetMyReferralsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyReferralsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyReferralsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useGetMyReferralsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyReferralsQuery, GetMyReferralsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyReferralsQuery, GetMyReferralsQueryVariables>(
    GetMyReferralsDocument,
    options,
  )
}
export function useGetMyReferralsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetMyReferralsQuery, GetMyReferralsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyReferralsQuery, GetMyReferralsQueryVariables>(
    GetMyReferralsDocument,
    options,
  )
}
export function useGetMyReferralsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyReferralsQuery, GetMyReferralsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyReferralsQuery, GetMyReferralsQueryVariables>(
    GetMyReferralsDocument,
    options,
  )
}
export type GetMyReferralsQueryHookResult = ReturnType<typeof useGetMyReferralsQuery>
export type GetMyReferralsLazyQueryHookResult = ReturnType<typeof useGetMyReferralsLazyQuery>
export type GetMyReferralsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyReferralsSuspenseQuery
>
export type GetMyReferralsQueryResult = Apollo.QueryResult<
  GetMyReferralsQuery,
  GetMyReferralsQueryVariables
>
export const GetReferralChainDocument = gql`
    query GetReferralChain($userId: String) {
  getReferralChain(userId: $userId) {
    user_id
    username
    invited_by
    depth
  }
}
    `

/**
 * __useGetReferralChainQuery__
 *
 * To run a query within a React component, call `useGetReferralChainQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReferralChainQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReferralChainQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetReferralChainQuery(
  baseOptions?: Apollo.QueryHookOptions<GetReferralChainQuery, GetReferralChainQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetReferralChainQuery, GetReferralChainQueryVariables>(
    GetReferralChainDocument,
    options,
  )
}
export function useGetReferralChainLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetReferralChainQuery, GetReferralChainQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetReferralChainQuery, GetReferralChainQueryVariables>(
    GetReferralChainDocument,
    options,
  )
}
export function useGetReferralChainSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetReferralChainQuery, GetReferralChainQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetReferralChainQuery, GetReferralChainQueryVariables>(
    GetReferralChainDocument,
    options,
  )
}
export type GetReferralChainQueryHookResult = ReturnType<typeof useGetReferralChainQuery>
export type GetReferralChainLazyQueryHookResult = ReturnType<typeof useGetReferralChainLazyQuery>
export type GetReferralChainSuspenseQueryHookResult = ReturnType<
  typeof useGetReferralChainSuspenseQuery
>
export type GetReferralChainQueryResult = Apollo.QueryResult<
  GetReferralChainQuery,
  GetReferralChainQueryVariables
>
export const GetUserTransactionsDocument = gql`
    query GetUserTransactions($user_id: String!, $limit: Int, $offset: Int, $status: TransactionStatus) {
  getUserTransactions(
    user_id: $user_id
    limit: $limit
    offset: $offset
    status: $status
  ) {
    transactions {
      id
      action_key
      points_amount
      status
      transaction_type
      created_at
      reference_id
      reference_type
      metadata
      action {
        id
        action_name
        description
        points_value
      }
    }
    has_more
    total_count
  }
}
    `

/**
 * __useGetUserTransactionsQuery__
 *
 * To run a query within a React component, call `useGetUserTransactionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserTransactionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserTransactionsQuery({
 *   variables: {
 *      user_id: // value for 'user_id'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useGetUserTransactionsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetUserTransactionsQuery,
    GetUserTransactionsQueryVariables
  > &
    ({ variables: GetUserTransactionsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetUserTransactionsQuery, GetUserTransactionsQueryVariables>(
    GetUserTransactionsDocument,
    options,
  )
}
export function useGetUserTransactionsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetUserTransactionsQuery,
    GetUserTransactionsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetUserTransactionsQuery, GetUserTransactionsQueryVariables>(
    GetUserTransactionsDocument,
    options,
  )
}
export function useGetUserTransactionsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetUserTransactionsQuery, GetUserTransactionsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetUserTransactionsQuery, GetUserTransactionsQueryVariables>(
    GetUserTransactionsDocument,
    options,
  )
}
export type GetUserTransactionsQueryHookResult = ReturnType<typeof useGetUserTransactionsQuery>
export type GetUserTransactionsLazyQueryHookResult = ReturnType<
  typeof useGetUserTransactionsLazyQuery
>
export type GetUserTransactionsSuspenseQueryHookResult = ReturnType<
  typeof useGetUserTransactionsSuspenseQuery
>
export type GetUserTransactionsQueryResult = Apollo.QueryResult<
  GetUserTransactionsQuery,
  GetUserTransactionsQueryVariables
>
export const GetUploadUrlDocument = gql`
    query GetUploadUrl($fileName: String!, $mimeType: MimeType!, $uploadType: UploadType!) {
  getUploadUrl(fileName: $fileName, mimeType: $mimeType, uploadType: $uploadType) {
    success
    uploadUrl
    fields
    key
    publicUrl
    expires
    maxSize
  }
}
    `

/**
 * __useGetUploadUrlQuery__
 *
 * To run a query within a React component, call `useGetUploadUrlQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUploadUrlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUploadUrlQuery({
 *   variables: {
 *      fileName: // value for 'fileName'
 *      mimeType: // value for 'mimeType'
 *      uploadType: // value for 'uploadType'
 *   },
 * });
 */
export function useGetUploadUrlQuery(
  baseOptions: Apollo.QueryHookOptions<GetUploadUrlQuery, GetUploadUrlQueryVariables> &
    ({ variables: GetUploadUrlQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetUploadUrlQuery, GetUploadUrlQueryVariables>(
    GetUploadUrlDocument,
    options,
  )
}
export function useGetUploadUrlLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetUploadUrlQuery, GetUploadUrlQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetUploadUrlQuery, GetUploadUrlQueryVariables>(
    GetUploadUrlDocument,
    options,
  )
}
export function useGetUploadUrlSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetUploadUrlQuery, GetUploadUrlQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetUploadUrlQuery, GetUploadUrlQueryVariables>(
    GetUploadUrlDocument,
    options,
  )
}
export type GetUploadUrlQueryHookResult = ReturnType<typeof useGetUploadUrlQuery>
export type GetUploadUrlLazyQueryHookResult = ReturnType<typeof useGetUploadUrlLazyQuery>
export type GetUploadUrlSuspenseQueryHookResult = ReturnType<typeof useGetUploadUrlSuspenseQuery>
export type GetUploadUrlQueryResult = Apollo.QueryResult<
  GetUploadUrlQuery,
  GetUploadUrlQueryVariables
>
export const GetMyProfileDocument = gql`
    query GetMyProfile {
  me {
    ...UserFullInfo
  }
}
    ${UserFullInfoFragmentDoc}`

/**
 * __useGetMyProfileQuery__
 *
 * To run a query within a React component, call `useGetMyProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyProfileQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyProfileQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyProfileQuery, GetMyProfileQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyProfileQuery, GetMyProfileQueryVariables>(
    GetMyProfileDocument,
    options,
  )
}
export function useGetMyProfileLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetMyProfileQuery, GetMyProfileQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyProfileQuery, GetMyProfileQueryVariables>(
    GetMyProfileDocument,
    options,
  )
}
export function useGetMyProfileSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyProfileQuery, GetMyProfileQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyProfileQuery, GetMyProfileQueryVariables>(
    GetMyProfileDocument,
    options,
  )
}
export type GetMyProfileQueryHookResult = ReturnType<typeof useGetMyProfileQuery>
export type GetMyProfileLazyQueryHookResult = ReturnType<typeof useGetMyProfileLazyQuery>
export type GetMyProfileSuspenseQueryHookResult = ReturnType<typeof useGetMyProfileSuspenseQuery>
export type GetMyProfileQueryResult = Apollo.QueryResult<
  GetMyProfileQuery,
  GetMyProfileQueryVariables
>
export const GetUserByIdDocument = gql`
    query GetUserById($id: String!) {
  user(id: $id) {
    ...UserFullInfo
  }
}
    ${UserFullInfoFragmentDoc}`

/**
 * __useGetUserByIdQuery__
 *
 * To run a query within a React component, call `useGetUserByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetUserByIdQuery(
  baseOptions: Apollo.QueryHookOptions<GetUserByIdQuery, GetUserByIdQueryVariables> &
    ({ variables: GetUserByIdQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetUserByIdQuery, GetUserByIdQueryVariables>(GetUserByIdDocument, options)
}
export function useGetUserByIdLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetUserByIdQuery, GetUserByIdQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetUserByIdQuery, GetUserByIdQueryVariables>(
    GetUserByIdDocument,
    options,
  )
}
export function useGetUserByIdSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetUserByIdQuery, GetUserByIdQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetUserByIdQuery, GetUserByIdQueryVariables>(
    GetUserByIdDocument,
    options,
  )
}
export type GetUserByIdQueryHookResult = ReturnType<typeof useGetUserByIdQuery>
export type GetUserByIdLazyQueryHookResult = ReturnType<typeof useGetUserByIdLazyQuery>
export type GetUserByIdSuspenseQueryHookResult = ReturnType<typeof useGetUserByIdSuspenseQuery>
export type GetUserByIdQueryResult = Apollo.QueryResult<GetUserByIdQuery, GetUserByIdQueryVariables>
export const GetUsersDocument = gql`
    query GetUsers($filter: UserFilterInput, $pagination: PaginationInput) {
  users(filter: $filter, pagination: $pagination) {
    users {
      ...UserBasicInfo
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${UserBasicInfoFragmentDoc}`

/**
 * __useGetUsersQuery__
 *
 * To run a query within a React component, call `useGetUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUsersQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGetUsersQuery(
  baseOptions?: Apollo.QueryHookOptions<GetUsersQuery, GetUsersQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, options)
}
export function useGetUsersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetUsersQuery, GetUsersQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, options)
}
export function useGetUsersSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetUsersQuery, GetUsersQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, options)
}
export type GetUsersQueryHookResult = ReturnType<typeof useGetUsersQuery>
export type GetUsersLazyQueryHookResult = ReturnType<typeof useGetUsersLazyQuery>
export type GetUsersSuspenseQueryHookResult = ReturnType<typeof useGetUsersSuspenseQuery>
export type GetUsersQueryResult = Apollo.QueryResult<GetUsersQuery, GetUsersQueryVariables>
export const CheckUsernameDocument = gql`
    query CheckUsername($username: String!) {
  checkUsername(username: $username)
}
    `

/**
 * __useCheckUsernameQuery__
 *
 * To run a query within a React component, call `useCheckUsernameQuery` and pass it any options that fit your needs.
 * When your component renders, `useCheckUsernameQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCheckUsernameQuery({
 *   variables: {
 *      username: // value for 'username'
 *   },
 * });
 */
export function useCheckUsernameQuery(
  baseOptions: Apollo.QueryHookOptions<CheckUsernameQuery, CheckUsernameQueryVariables> &
    ({ variables: CheckUsernameQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<CheckUsernameQuery, CheckUsernameQueryVariables>(
    CheckUsernameDocument,
    options,
  )
}
export function useCheckUsernameLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<CheckUsernameQuery, CheckUsernameQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<CheckUsernameQuery, CheckUsernameQueryVariables>(
    CheckUsernameDocument,
    options,
  )
}
export function useCheckUsernameSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<CheckUsernameQuery, CheckUsernameQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<CheckUsernameQuery, CheckUsernameQueryVariables>(
    CheckUsernameDocument,
    options,
  )
}
export type CheckUsernameQueryHookResult = ReturnType<typeof useCheckUsernameQuery>
export type CheckUsernameLazyQueryHookResult = ReturnType<typeof useCheckUsernameLazyQuery>
export type CheckUsernameSuspenseQueryHookResult = ReturnType<typeof useCheckUsernameSuspenseQuery>
export type CheckUsernameQueryResult = Apollo.QueryResult<
  CheckUsernameQuery,
  CheckUsernameQueryVariables
>
export const GetMyDanceBondsDocument = gql`
    query GetMyDanceBonds {
  myDanceBonds {
    id
    user1_id
    user2_id
    bond_level
    shared_sessions
    created_at
    updated_at
    otherUser {
      ...UserBasicInfo
    }
  }
}
    ${UserBasicInfoFragmentDoc}`

/**
 * __useGetMyDanceBondsQuery__
 *
 * To run a query within a React component, call `useGetMyDanceBondsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyDanceBondsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyDanceBondsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyDanceBondsQuery(
  baseOptions?: Apollo.QueryHookOptions<GetMyDanceBondsQuery, GetMyDanceBondsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetMyDanceBondsQuery, GetMyDanceBondsQueryVariables>(
    GetMyDanceBondsDocument,
    options,
  )
}
export function useGetMyDanceBondsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetMyDanceBondsQuery, GetMyDanceBondsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetMyDanceBondsQuery, GetMyDanceBondsQueryVariables>(
    GetMyDanceBondsDocument,
    options,
  )
}
export function useGetMyDanceBondsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<GetMyDanceBondsQuery, GetMyDanceBondsQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetMyDanceBondsQuery, GetMyDanceBondsQueryVariables>(
    GetMyDanceBondsDocument,
    options,
  )
}
export type GetMyDanceBondsQueryHookResult = ReturnType<typeof useGetMyDanceBondsQuery>
export type GetMyDanceBondsLazyQueryHookResult = ReturnType<typeof useGetMyDanceBondsLazyQuery>
export type GetMyDanceBondsSuspenseQueryHookResult = ReturnType<
  typeof useGetMyDanceBondsSuspenseQuery
>
export type GetMyDanceBondsQueryResult = Apollo.QueryResult<
  GetMyDanceBondsQuery,
  GetMyDanceBondsQueryVariables
>

export interface PossibleTypesResultData {
  possibleTypes: {
    [key: string]: string[]
  }
}
const result: PossibleTypesResultData = {
  possibleTypes: {},
}
export default result

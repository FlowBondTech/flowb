import { gql } from 'graphql-tag'

export const analyticsTypeDefs = gql`
  # ============================================
  # ANALYTICS DASHBOARD QUERIES
  # Comprehensive analytics for admin dashboard and insights
  # ============================================

  enum AnalyticsPeriod {
    TODAY
    YESTERDAY
    LAST_7_DAYS
    LAST_30_DAYS
    LAST_90_DAYS
    THIS_MONTH
    LAST_MONTH
    THIS_YEAR
    ALL_TIME
    CUSTOM
  }

  enum AnalyticsGranularity {
    HOUR
    DAY
    WEEK
    MONTH
  }

  # ============ USER ANALYTICS ============

  type UserAnalytics {
    total_users: Int!
    active_users: ActiveUsersMetrics!
    new_users: NewUsersMetrics!
    retention: RetentionMetrics!
    engagement: EngagementMetrics!
    demographics: DemographicsMetrics!
  }

  type ActiveUsersMetrics {
    dau: Int!
    wau: Int!
    mau: Int!
    dau_wau_ratio: Float!
    dau_mau_ratio: Float!
    trend: [TimeSeriesPoint!]!
  }

  type NewUsersMetrics {
    today: Int!
    this_week: Int!
    this_month: Int!
    growth_rate: Float!
    trend: [TimeSeriesPoint!]!
    acquisition_channels: [AcquisitionChannel!]!
  }

  type RetentionMetrics {
    day_1: Float!
    day_7: Float!
    day_30: Float!
    cohort_analysis: [CohortData!]!
  }

  type EngagementMetrics {
    avg_session_duration: Float!
    avg_sessions_per_user: Float!
    avg_dance_time_per_user: Float!
    power_users_count: Int!
    power_users_percentage: Float!
  }

  type DemographicsMetrics {
    by_country: [CountryMetric!]!
    by_city: [CityMetric!]!
    by_skill_level: [SkillLevelMetric!]!
    by_dance_style: [DanceStyleMetric!]!
    by_age_group: [AgeGroupMetric!]!
  }

  type AcquisitionChannel {
    channel: String!
    users: Int!
    percentage: Float!
  }

  type CohortData {
    cohort_date: String!
    size: Int!
    retention_days: [Float!]!
  }

  type CountryMetric {
    country: String!
    users: Int!
    percentage: Float!
  }

  type CityMetric {
    city: String!
    country: String!
    users: Int!
    percentage: Float!
  }

  type SkillLevelMetric {
    level: String!
    users: Int!
    percentage: Float!
  }

  type DanceStyleMetric {
    style: String!
    users: Int!
    percentage: Float!
  }

  type AgeGroupMetric {
    group: String!
    users: Int!
    percentage: Float!
  }

  # ============ PLATFORM ANALYTICS ============

  type PlatformAnalytics {
    overview: PlatformOverview!
    dance_metrics: DanceMetrics!
    event_metrics: EventMetrics!
    social_metrics: SocialMetrics!
    economy_metrics: EconomyMetrics!
  }

  type PlatformOverview {
    total_xp_distributed: Float!
    total_points_distributed: Float!
    total_dance_sessions: Int!
    total_dance_minutes: Int!
    total_events_hosted: Int!
    total_dance_bonds: Int!
    health_score: Float!
  }

  type DanceMetrics {
    sessions_today: Int!
    sessions_this_week: Int!
    avg_session_duration: Float!
    avg_movement_score: Float!
    total_calories_burned: Int!
    peak_hours: [HourlyMetric!]!
    popular_styles: [StyleMetric!]!
    trend: [TimeSeriesPoint!]!
  }

  type EventMetrics {
    total_events: Int!
    upcoming_events: Int!
    completed_events: Int!
    avg_attendance: Float!
    avg_rating: Float!
    total_registrations: Int!
    popular_categories: [CategoryMetric!]!
    trend: [TimeSeriesPoint!]!
  }

  type SocialMetrics {
    total_posts: Int!
    total_comments: Int!
    total_likes: Int!
    avg_engagement_rate: Float!
    viral_posts: Int!
    dance_bonds_created: Int!
    referrals_completed: Int!
    trend: [TimeSeriesPoint!]!
  }

  type EconomyMetrics {
    total_xp_earned: Float!
    total_points_earned: Float!
    xp_distribution: [XPDistribution!]!
    points_sources: [PointsSource!]!
    top_earners: [TopEarner!]!
    trend: [TimeSeriesPoint!]!
  }

  # ============ HELPER TYPES ============

  type TimeSeriesPoint {
    timestamp: DateTime!
    value: Float!
    label: String
  }

  type HourlyMetric {
    hour: Int!
    value: Int!
  }

  type StyleMetric {
    style: String!
    sessions: Int!
    percentage: Float!
  }

  type CategoryMetric {
    category: String!
    count: Int!
    percentage: Float!
  }

  type XPDistribution {
    source: String!
    amount: Float!
    percentage: Float!
  }

  type PointsSource {
    source: String!
    amount: Float!
    percentage: Float!
  }

  type TopEarner {
    user: User!
    xp_earned: Float!
    rank: Int!
  }

  # ============ REAL-TIME ANALYTICS ============

  type RealTimeAnalytics {
    current_online_users: Int!
    active_dance_sessions: Int!
    events_in_progress: Int!
    recent_signups: Int!
    recent_sessions: Int!
    system_load: Float!
    api_requests_per_minute: Int!
    live_metrics: LiveMetrics!
  }

  type LiveMetrics {
    users_online: [TimeSeriesPoint!]!
    sessions_active: [TimeSeriesPoint!]!
    xp_per_minute: [TimeSeriesPoint!]!
  }

  # ============ COMPARISON & TRENDS ============

  type AnalyticsComparison {
    metric: String!
    current_value: Float!
    previous_value: Float!
    change_percentage: Float!
    trend: String!
  }

  type TrendAnalysis {
    metric: String!
    trend_direction: String!
    trend_strength: Float!
    forecast_7_days: Float
    forecast_30_days: Float
    seasonality: String
  }

  # ============ INPUT TYPES ============

  input AnalyticsDateRange {
    from: DateTime!
    to: DateTime!
  }

  input AnalyticsOptions {
    period: AnalyticsPeriod
    custom_range: AnalyticsDateRange
    granularity: AnalyticsGranularity
    compare_to_previous: Boolean
  }

  # ============ QUERIES ============

  extend type Query {
    # Main analytics dashboards
    userAnalytics(options: AnalyticsOptions): UserAnalytics!
    platformAnalytics(options: AnalyticsOptions): PlatformAnalytics!
    realTimeAnalytics: RealTimeAnalytics!

    # Specific metrics
    danceAnalytics(options: AnalyticsOptions): DanceMetrics!
    eventAnalytics(options: AnalyticsOptions): EventMetrics!
    socialAnalytics(options: AnalyticsOptions): SocialMetrics!
    economyAnalytics(options: AnalyticsOptions): EconomyMetrics!

    # Time series data
    metricTimeSeries(
      metric: String!
      options: AnalyticsOptions
    ): [TimeSeriesPoint!]!

    # Comparisons
    compareMetrics(
      metrics: [String!]!
      options: AnalyticsOptions
    ): [AnalyticsComparison!]!

    # Trends
    trendAnalysis(
      metrics: [String!]!
      options: AnalyticsOptions
    ): [TrendAnalysis!]!

    # Cohort analysis
    cohortAnalysis(
      cohort_type: String!
      options: AnalyticsOptions
    ): [CohortData!]!

    # Custom reports
    analyticsReport(
      report_type: String!
      options: AnalyticsOptions
    ): JSON!

    # Admin-only comprehensive analytics
    adminDashboardAnalytics: JSON!
  }

  # ============ MUTATIONS ============

  extend type Mutation {
    # Analytics tracking (internal)
    trackEvent(
      event_type: String!
      user_id: String
      metadata: JSON
    ): MutationResponse!

    # Report generation
    generateAnalyticsReport(
      report_type: String!
      options: AnalyticsOptions
      format: String
    ): String!

    # Cache management
    refreshAnalyticsCache(metrics: [String!]): MutationResponse!
  }
`

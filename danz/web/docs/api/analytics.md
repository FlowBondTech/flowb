# Analytics API

The Analytics API provides comprehensive metrics and insights for the admin dashboard and user statistics.

## Overview

The analytics system tracks:
- **User Metrics** - Growth, retention, engagement
- **Dance Metrics** - Sessions, duration, styles
- **Financial Metrics** - Token distribution, rewards
- **Platform Health** - Performance, errors, usage

## Query Types

### User Analytics

```graphql
query GetUserAnalytics(
  $period: AnalyticsPeriod!
  $startDate: DateTime
  $endDate: DateTime
) {
  getUserAnalytics(
    period: $period
    startDate: $startDate
    endDate: $endDate
  ) {
    total_users
    new_users
    active_users
    returning_users
    churn_rate
    growth_rate
    average_session_duration
    user_growth_chart {
      date
      new_users
      total_users
    }
  }
}
```

**Period Options:**
- `TODAY` - Current day
- `YESTERDAY` - Previous day
- `LAST_7_DAYS` - Rolling week
- `LAST_30_DAYS` - Rolling month
- `THIS_MONTH` - Calendar month
- `LAST_MONTH` - Previous month
- `THIS_YEAR` - Calendar year
- `CUSTOM` - Custom date range

### Dance Analytics

```graphql
query GetDanceAnalytics(
  $period: AnalyticsPeriod!
  $groupBy: AnalyticsGroupBy
) {
  getDanceAnalytics(
    period: $period
    groupBy: $groupBy
  ) {
    total_sessions
    total_dance_minutes
    total_calories_burned
    average_session_duration
    unique_dancers
    sessions_per_user
    popular_styles {
      style
      session_count
      percentage
    }
    peak_hours {
      hour
      session_count
    }
    dance_trends {
      date
      sessions
      minutes
      calories
    }
  }
}
```

**Group By Options:**
- `HOUR` - Hourly breakdown
- `DAY` - Daily breakdown
- `WEEK` - Weekly breakdown
- `MONTH` - Monthly breakdown

### Engagement Analytics

```graphql
query GetEngagementAnalytics($period: AnalyticsPeriod!) {
  getEngagementAnalytics(period: $period) {
    daily_active_users
    weekly_active_users
    monthly_active_users
    dau_mau_ratio
    average_sessions_per_day
    feature_usage {
      feature
      usage_count
      unique_users
    }
    retention_cohorts {
      cohort_date
      day_1
      day_7
      day_14
      day_30
    }
  }
}
```

### Revenue Analytics

```graphql
query GetRevenueAnalytics($period: AnalyticsPeriod!) {
  getRevenueAnalytics(period: $period) {
    total_tokens_distributed
    tokens_earned_from_dancing
    tokens_earned_from_challenges
    tokens_earned_from_referrals
    average_tokens_per_user
    token_distribution_chart {
      date
      amount
      source
    }
  }
}
```

### Geographic Analytics

```graphql
query GetGeographicAnalytics($period: AnalyticsPeriod!) {
  getGeographicAnalytics(period: $period) {
    users_by_country {
      country
      country_code
      user_count
      percentage
    }
    users_by_city {
      city
      country
      user_count
    }
    activity_by_timezone {
      timezone
      peak_hour
      active_users
    }
  }
}
```

### Funnel Analytics

```graphql
query GetFunnelAnalytics(
  $funnelType: FunnelType!
  $period: AnalyticsPeriod!
) {
  getFunnelAnalytics(
    funnelType: $funnelType
    period: $period
  ) {
    stages {
      name
      users
      conversion_rate
      drop_off_rate
    }
    overall_conversion
    average_time_to_convert
  }
}
```

**Funnel Types:**
- `ONBOARDING` - Registration to first dance
- `ACTIVATION` - First dance to regular user
- `MONETIZATION` - Free to token earner
- `REFERRAL` - User to referrer

### Cohort Analysis

```graphql
query GetCohortAnalysis(
  $cohortType: CohortType!
  $period: AnalyticsPeriod!
) {
  getCohortAnalysis(
    cohortType: $cohortType
    period: $period
  ) {
    cohorts {
      cohort_date
      cohort_size
      retention {
        day
        users
        percentage
      }
    }
    average_retention_curve {
      day
      percentage
    }
  }
}
```

### Real-time Analytics

```graphql
query GetRealtimeAnalytics {
  getRealtimeAnalytics {
    active_users_now
    active_sessions_now
    events_per_minute
    top_activities {
      type
      count
    }
    live_map {
      city
      lat
      lng
      active_users
    }
  }
}
```

## Admin Operations

### Track Custom Event

```graphql
mutation TrackAnalyticsEvent(
  $event: String!
  $properties: JSON
  $userId: String
) {
  trackAnalyticsEvent(
    event: $event
    properties: $properties
    userId: $userId
  ) {
    success
    message
  }
}
```

### Refresh Analytics Cache

```graphql
mutation RefreshAnalyticsCache($metrics: [String!]) {
  refreshAnalyticsCache(metrics: $metrics) {
    success
    message
  }
}
```

### Export Analytics

```graphql
query ExportAnalytics(
  $reportType: ReportType!
  $period: AnalyticsPeriod!
  $format: ExportFormat!
) {
  exportAnalytics(
    reportType: $reportType
    period: $period
    format: $format
  ) {
    download_url
    expires_at
    file_size
  }
}
```

**Export Formats:**
- `CSV` - Comma-separated values
- `JSON` - JSON format
- `PDF` - PDF report

## Subscriptions

### Real-time Metrics

```graphql
subscription OnMetricsUpdate {
  metricsUpdated {
    metric
    value
    change
    timestamp
  }
}
```

## Database Schema

### analytics_events

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User reference (nullable) |
| event_name | TEXT | Event identifier |
| event_data | JSONB | Event properties |
| session_id | TEXT | Session identifier |
| device_type | TEXT | Device type |
| platform | TEXT | Web/iOS/Android |
| country | TEXT | User country |
| city | TEXT | User city |
| created_at | TIMESTAMPTZ | Event time |

## Pre-built Dashboards

The analytics system supports these dashboard views:

### Executive Dashboard
- Total users, DAU, MAU
- Revenue metrics
- Growth trends
- Key KPIs

### Product Dashboard
- Feature usage
- User journeys
- Retention curves
- Conversion funnels

### Dance Dashboard
- Session metrics
- Popular styles
- Peak hours
- Calories/minutes trends

### Geographic Dashboard
- User distribution map
- Country breakdown
- City rankings
- Timezone activity

## Metrics Definitions

| Metric | Definition |
|--------|------------|
| **DAU** | Unique users with 1+ session in 24h |
| **WAU** | Unique users with 1+ session in 7 days |
| **MAU** | Unique users with 1+ session in 30 days |
| **Retention** | % of cohort returning on day N |
| **Churn** | % of users inactive for 30+ days |
| **Engagement** | Average sessions per active user |

## Caching Strategy

Analytics queries are cached for performance:

| Query Type | Cache Duration |
|------------|----------------|
| Real-time | No cache |
| Hourly | 5 minutes |
| Daily | 1 hour |
| Weekly | 6 hours |
| Monthly | 24 hours |

## Rate Limits

| Operation | Limit |
|-----------|-------|
| Dashboard queries | 60/minute |
| Export requests | 10/hour |
| Real-time subscriptions | 5 concurrent |

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PERIOD` | Unknown analytics period |
| `DATE_RANGE_TOO_LARGE` | Max 1 year range |
| `EXPORT_IN_PROGRESS` | Export already running |
| `INSUFFICIENT_DATA` | Not enough data for analysis |
| `ADMIN_ONLY` | Requires admin privileges |

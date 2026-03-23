# Leaderboards API

The Leaderboards API provides competitive rankings across multiple scopes and metrics to drive engagement.

## Leaderboard Types

| Type | Scope | Description |
|------|-------|-------------|
| `GLOBAL` | All users | Worldwide rankings |
| `REGIONAL` | Country/Region | Geographic rankings |
| `CITY` | City | Local community |
| `FRIENDS` | Connections | Friend competition |
| `EVENT` | Event participants | Event-specific |
| `STYLE` | Dance style | Style specialists |
| `SEASONAL` | Time period | Season rankings |

## Ranking Metrics

| Metric | Description |
|--------|-------------|
| `XP` | Total experience points |
| `DANCE_MINUTES` | Total dance time |
| `CALORIES` | Calories burned |
| `STREAK` | Current streak days |
| `SESSIONS` | Total sessions |
| `ACHIEVEMENTS` | Achievements earned |

## Queries

### Get Leaderboard

```graphql
query GetLeaderboard(
  $type: LeaderboardType!
  $metric: LeaderboardMetric!
  $period: LeaderboardPeriod
  $region: String
  $style: DanceStyle
  $limit: Int
  $offset: Int
) {
  getLeaderboard(
    type: $type
    metric: $metric
    period: $period
    region: $region
    style: $style
    limit: $limit
    offset: $offset
  ) {
    entries {
      rank
      user {
        privy_id
        display_name
        avatar_url
        level
        country
        city
      }
      score
      change  # Rank change since last period
    }
    total_entries
    my_entry {
      rank
      score
      change
    }
    period_start
    period_end
  }
}
```

**Period Options:**
- `ALL_TIME` - All historical data
- `SEASON` - Current season
- `MONTHLY` - Current month
- `WEEKLY` - Current week
- `DAILY` - Today

### Get My Rankings

```graphql
query GetMyRankings {
  getMyRankings {
    global {
      metric
      rank
      score
      percentile
    }
    regional {
      region
      metric
      rank
      score
    }
    friends {
      metric
      rank
      score
      total_friends
    }
  }
}
```

### Get Leaderboard Around Me

Shows ranks around the user's position.

```graphql
query GetLeaderboardAroundMe(
  $type: LeaderboardType!
  $metric: LeaderboardMetric!
  $range: Int  # Positions above/below (default 5)
) {
  getLeaderboardAroundMe(
    type: $type
    metric: $metric
    range: $range
  ) {
    entries {
      rank
      user {
        privy_id
        display_name
        avatar_url
      }
      score
      is_me
    }
    my_rank
    total_entries
  }
}
```

### Get Friends Leaderboard

```graphql
query GetFriendsLeaderboard(
  $metric: LeaderboardMetric!
  $period: LeaderboardPeriod
) {
  getFriendsLeaderboard(
    metric: $metric
    period: $period
  ) {
    entries {
      rank
      user {
        privy_id
        display_name
        avatar_url
        is_online
      }
      score
      last_active_at
    }
    my_rank
  }
}
```

### Get Event Leaderboard

```graphql
query GetEventLeaderboard(
  $eventId: String!
  $limit: Int
  $offset: Int
) {
  getEventLeaderboard(
    eventId: $eventId
    limit: $limit
    offset: $offset
  ) {
    event {
      id
      name
    }
    entries {
      rank
      user {
        privy_id
        display_name
        avatar_url
      }
      score
      dance_minutes
      calories_burned
    }
    prizes {
      rank_range
      description
      reward_tokens
    }
  }
}
```

## Subscriptions

### Real-time Leaderboard Updates

```graphql
subscription OnLeaderboardUpdate(
  $type: LeaderboardType!
  $metric: LeaderboardMetric!
) {
  leaderboardUpdated(type: $type, metric: $metric) {
    entries {
      rank
      user_id
      display_name
      score
      change
    }
    updated_at
  }
}
```

### My Rank Changed

```graphql
subscription OnMyRankChanged {
  myRankChanged {
    leaderboard_type
    metric
    old_rank
    new_rank
    score
  }
}
```

## Seasons

Leaderboards can be seasonal with rewards for top performers.

### Get Current Season

```graphql
query GetCurrentSeason {
  getCurrentSeason {
    id
    name
    theme
    starts_at
    ends_at
    days_remaining
    rewards {
      rank_range
      reward_tokens
      reward_badge_id
      badge {
        name
        image_url
      }
    }
  }
}
```

### Get Season History

```graphql
query GetSeasonHistory($limit: Int) {
  getSeasonHistory(limit: $limit) {
    id
    name
    starts_at
    ends_at
    my_final_rank
    my_rewards {
      tokens_earned
      badge_earned
    }
    winner {
      display_name
      avatar_url
      final_score
    }
  }
}
```

## Admin Operations

### Refresh Leaderboards

```graphql
mutation RefreshAllLeaderboards {
  refreshAllLeaderboards {
    success
    message
  }
}
```

### End Season

```graphql
mutation EndSeason($seasonId: String!) {
  endSeason(seasonId: $seasonId) {
    success
    message
  }
}
```

## Response Examples

### Global XP Leaderboard

```json
{
  "data": {
    "getLeaderboard": {
      "entries": [
        {
          "rank": 1,
          "user": {
            "privy_id": "did:privy:abc123",
            "display_name": "DanceKing",
            "avatar_url": "https://...",
            "level": 42,
            "country": "US"
          },
          "score": 125000,
          "change": 0
        },
        {
          "rank": 2,
          "user": {
            "display_name": "RhythmQueen",
            "level": 39
          },
          "score": 118500,
          "change": 2
        }
      ],
      "total_entries": 15420,
      "my_entry": {
        "rank": 847,
        "score": 12500,
        "change": -3
      },
      "period_start": "2024-01-01T00:00:00Z",
      "period_end": null
    }
  }
}
```

## Calculation Logic

### Score Updates

Scores are updated in near real-time when:
- Dance sessions complete
- Challenges are finished
- Achievements are earned
- Daily rewards are claimed

### Rank Calculation

```sql
-- Ranks calculated using window functions
SELECT
  user_id,
  score,
  RANK() OVER (ORDER BY score DESC) as rank,
  PERCENT_RANK() OVER (ORDER BY score DESC) as percentile
FROM leaderboard_entries
WHERE leaderboard_type = 'GLOBAL'
  AND metric = 'XP'
```

### Tie-Breaking

When scores are equal:
1. Earlier achievement time wins
2. Higher secondary metric (e.g., sessions for XP ties)
3. Account age (newer accounts win ties)

## Rate Limits

| Operation | Limit |
|-----------|-------|
| Leaderboard queries | 60/minute |
| Real-time subscriptions | 5 concurrent |
| Admin refresh | 1/hour |

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_LEADERBOARD_TYPE` | Unknown leaderboard type |
| `INVALID_METRIC` | Unknown ranking metric |
| `INVALID_PERIOD` | Unknown time period |
| `REGION_NOT_FOUND` | Invalid region code |
| `EVENT_NOT_FOUND` | Event doesn't exist |
| `SEASON_NOT_FOUND` | Season doesn't exist |

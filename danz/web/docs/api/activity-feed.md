# Activity Feed API

The Activity Feed API provides a real-time social stream showing user activities across the platform.

## Activity Types

### User Activities
| Type | Description |
|------|-------------|
| `DANCE_SESSION_COMPLETED` | Finished a dance session |
| `ACHIEVEMENT_UNLOCKED` | Earned a new achievement |
| `CHALLENGE_COMPLETED` | Completed a challenge |
| `LEVEL_UP` | Reached a new level |
| `STREAK_MILESTONE` | Hit a streak milestone (7, 30, 100 days) |

### Social Activities
| Type | Description |
|------|-------------|
| `NEW_FOLLOWER` | Someone followed the user |
| `DANCE_BOND_CREATED` | New dance bond formed |
| `EVENT_JOINED` | Joined an event |
| `EVENT_CREATED` | Created a new event |

### Competitive Activities
| Type | Description |
|------|-------------|
| `LEADERBOARD_RANK_UP` | Moved up in rankings |
| `TOP_10_ACHIEVED` | Entered top 10 |
| `NEW_HIGH_SCORE` | Personal best |

## Queries

### Get Activity Feed

```graphql
query GetActivityFeed(
  $feedType: FeedType
  $limit: Int
  $cursor: String
  $activityTypes: [ActivityType!]
) {
  getActivityFeed(
    feedType: $feedType
    limit: $limit
    cursor: $cursor
    activityTypes: $activityTypes
  ) {
    items {
      id
      type
      user {
        privy_id
        display_name
        avatar_url
      }
      data
      is_liked
      like_count
      comment_count
      created_at
    }
    next_cursor
    has_more
  }
}
```

**Feed Types:**
- `GLOBAL` - All public activities
- `FOLLOWING` - Only from followed users
- `PERSONAL` - User's own activities
- `FRIENDS` - Mutual connections only

### Get Activity Details

```graphql
query GetActivityDetails($activityId: String!) {
  getActivityDetails(activityId: $activityId) {
    id
    type
    user {
      privy_id
      display_name
      avatar_url
      level
    }
    data
    is_liked
    like_count
    comments {
      id
      user {
        display_name
        avatar_url
      }
      content
      created_at
    }
    comment_count
    visibility
    created_at
  }
}
```

### Get Activity Comments

```graphql
query GetActivityComments(
  $activityId: String!
  $limit: Int
  $offset: Int
) {
  getActivityComments(
    activityId: $activityId
    limit: $limit
    offset: $offset
  ) {
    items {
      id
      user {
        privy_id
        display_name
        avatar_url
      }
      content
      is_liked
      like_count
      created_at
    }
    total_count
    has_more
  }
}
```

### Get User Activity Stats

```graphql
query GetUserActivityStats($userId: String, $period: StatsPeriod) {
  getUserActivityStats(userId: $userId, period: $period) {
    total_activities
    total_likes_received
    total_comments_received
    top_activity_type
    engagement_rate
    most_active_day
  }
}
```

## Mutations

### Like/Unlike Activity

```graphql
mutation LikeActivity($activityId: String!) {
  likeActivity(activityId: $activityId) {
    id
    is_liked
    like_count
  }
}

mutation UnlikeActivity($activityId: String!) {
  unlikeActivity(activityId: $activityId) {
    id
    is_liked
    like_count
  }
}
```

### Add Comment

```graphql
mutation AddActivityComment($input: AddActivityCommentInput!) {
  addActivityComment(input: $input) {
    id
    content
    user {
      display_name
      avatar_url
    }
    created_at
  }
}
```

**Input:**
```typescript
interface AddActivityCommentInput {
  activity_id: string
  content: string          // Max 500 characters
  parent_comment_id?: string  // For replies
}
```

### Delete Comment

```graphql
mutation DeleteActivityComment($commentId: String!) {
  deleteActivityComment(commentId: $commentId) {
    success
    message
  }
}
```

### Hide Activity

Hide an activity from your feed.

```graphql
mutation HideActivity($activityId: String!) {
  hideActivity(activityId: $activityId) {
    success
    message
  }
}
```

### Report Activity

```graphql
mutation ReportActivity($activityId: String!, $reason: String!) {
  reportActivity(activityId: $activityId, reason: $reason) {
    success
    message
  }
}
```

### Mark Activities Read

```graphql
mutation MarkActivitiesRead($activityIds: [String!]!) {
  markActivitiesRead(activityIds: $activityIds) {
    success
    message
  }
}

mutation MarkAllActivitiesRead {
  markAllActivitiesRead {
    success
    message
  }
}
```

## Subscriptions

### New Activity

```graphql
subscription OnNewActivity($feedType: FeedType!) {
  newActivity(feedType: $feedType) {
    id
    type
    user {
      display_name
      avatar_url
    }
    data
    created_at
  }
}
```

### Activity Updated

```graphql
subscription OnActivityUpdated($activityId: String!) {
  activityUpdated(activityId: $activityId) {
    id
    like_count
    comment_count
    is_liked
  }
}
```

## Activity Data Formats

Each activity type has a specific data payload:

### Dance Session Completed

```json
{
  "session_id": "uuid",
  "duration_minutes": 45,
  "calories_burned": 320,
  "dance_style": "hip_hop",
  "xp_earned": 150,
  "achievements_unlocked": ["first_session"]
}
```

### Achievement Unlocked

```json
{
  "achievement_id": "uuid",
  "achievement_name": "Dance Master",
  "achievement_icon": "https://...",
  "achievement_rarity": "rare",
  "xp_earned": 500
}
```

### Level Up

```json
{
  "old_level": 9,
  "new_level": 10,
  "xp_total": 5000,
  "rewards_unlocked": ["premium_badge", "new_style"]
}
```

### Leaderboard Rank Up

```json
{
  "leaderboard_type": "global",
  "metric": "xp",
  "old_rank": 150,
  "new_rank": 95,
  "score": 12500
}
```

## Database Schema

### activities

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | Activity creator |
| type | ENUM | Activity type |
| data | JSONB | Activity-specific data |
| visibility | ENUM | PUBLIC/FRIENDS/PRIVATE |
| like_count | INTEGER | Total likes (denormalized) |
| comment_count | INTEGER | Total comments (denormalized) |
| is_pinned | BOOLEAN | Pinned to profile |
| created_at | TIMESTAMPTZ | Creation time |

### activity_likes

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| activity_id | UUID | Activity reference |
| user_id | TEXT | User who liked |
| created_at | TIMESTAMPTZ | Like time |

### activity_comments

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| activity_id | UUID | Activity reference |
| user_id | TEXT | Commenter |
| parent_comment_id | UUID | For nested replies |
| content | TEXT | Comment text |
| like_count | INTEGER | Comment likes |
| created_at | TIMESTAMPTZ | Comment time |

## Privacy & Visibility

Activities respect user privacy settings:

| Visibility | Who Can See |
|------------|-------------|
| `PUBLIC` | Everyone |
| `FRIENDS` | Mutual connections only |
| `PRIVATE` | Only the user |

Users can also:
- Hide specific activities from their feed
- Block users from appearing in feed
- Disable activity generation entirely

## Rate Limits

| Operation | Limit |
|-----------|-------|
| Feed queries | 120/minute |
| Like/unlike | 60/minute |
| Comments | 30/minute |
| Reports | 10/minute |

## Error Codes

| Code | Description |
|------|-------------|
| `ACTIVITY_NOT_FOUND` | Activity doesn't exist |
| `ALREADY_LIKED` | Already liked this activity |
| `NOT_LIKED` | Haven't liked this activity |
| `COMMENT_TOO_LONG` | Exceeds 500 characters |
| `ACTIVITY_HIDDEN` | Activity is hidden from user |
| `CANNOT_COMMENT` | Comments disabled |
| `RATE_LIMITED` | Too many requests |

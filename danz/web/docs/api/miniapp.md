# Telegram Miniapp API

The Miniapp API provides optimized endpoints for the Telegram miniapp with lightweight responses and seamless authentication.

## Overview

The Telegram miniapp is designed for:
- **Quick Sessions** - Start dancing in seconds
- **Lightweight Data** - Optimized for mobile/Telegram
- **Social Features** - Friend invites, cheers
- **Compact UI** - Essential info only

## Authentication

### Telegram Auth Flow

```graphql
mutation AuthenticateWithTelegram($initData: String!) {
  authenticateWithTelegram(initData: $initData) {
    token
    user {
      privy_id
      display_name
      avatar_url
      telegram_id
      telegram_username
    }
    is_new_user
  }
}
```

The `initData` comes from Telegram's WebApp API:
```typescript
const initData = window.Telegram.WebApp.initData
```

### Link Telegram Account

For existing users linking their Telegram:

```graphql
mutation LinkTelegramAccount($telegramData: TelegramLinkInput!) {
  linkTelegramAccount(telegramData: $telegramData) {
    success
    user {
      telegram_id
      telegram_username
    }
  }
}
```

### Unlink Telegram Account

```graphql
mutation UnlinkTelegramAccount {
  unlinkTelegramAccount {
    success
    message
  }
}
```

## Quick Session

Streamlined session start for instant dancing.

### Start Quick Session

```graphql
mutation MiniappStartQuickSession($style: DanceStyle) {
  miniappStartQuickSession(style: $style) {
    session_id
    style
    started_at
    streak_day
    daily_goal_progress
  }
}
```

### End Quick Session

```graphql
mutation MiniappEndQuickSession(
  $session_id: String!
  $stats: JSON!
) {
  miniappEndQuickSession(
    session_id: $session_id
    stats: $stats
  ) {
    success
    message
  }
}
```

**Stats payload:**
```json
{
  "duration_seconds": 300,
  "calories_estimate": 45,
  "avg_heart_rate": 110
}
```

## Compact Queries

### Get Miniapp Home

Single query for the home screen:

```graphql
query GetMiniappHome {
  getMiniappHome {
    user {
      display_name
      avatar_url
      level
      xp
      xp_to_next_level
      streak_days
      tokens_balance
    }
    today_stats {
      dance_minutes
      calories
      sessions
      daily_goal_progress
    }
    active_challenges {
      id
      title
      progress_percentage
      ends_at
    }
    friends_dancing_now {
      display_name
      avatar_url
      dance_style
    }
  }
}
```

### Get Compact Leaderboard

```graphql
query GetMiniappLeaderboard($type: LeaderboardType!) {
  getMiniappLeaderboard(type: $type) {
    top_3 {
      rank
      display_name
      avatar_url
      score
    }
    my_position {
      rank
      score
      above {
        display_name
        score
      }
      below {
        display_name
        score
      }
    }
  }
}
```

### Get Quick Stats

```graphql
query GetMiniappQuickStats {
  getMiniappQuickStats {
    today_minutes
    today_calories
    current_streak
    weekly_rank
    pending_rewards
  }
}
```

### Get Friends List

```graphql
query GetMiniappFriends {
  getMiniappFriends {
    friends {
      user_id
      display_name
      avatar_url
      telegram_username
      is_online
      last_dance_at
    }
    pending_invites
    friend_count
  }
}
```

## Social Features

### Invite Friend

```graphql
mutation MiniappInviteFriend($telegram_user_id: String!) {
  miniappInviteFriend(telegram_user_id: $telegram_user_id) {
    success
    message
  }
}
```

### Send Cheer

Send encouragement to a friend:

```graphql
mutation MiniappSendCheer($user_id: String!) {
  miniappSendCheer(user_id: $user_id) {
    success
    message
  }
}
```

### Get Invite Link

```graphql
query GetMiniappInviteLink {
  getMiniappInviteLink {
    link
    referral_code
    total_invites
    successful_invites
    pending_rewards
  }
}
```

## Notifications

### Get Notifications

```graphql
query GetMiniappNotifications($limit: Int) {
  getMiniappNotifications(limit: $limit) {
    items {
      id
      type
      title
      body
      data
      is_read
      created_at
    }
    unread_count
  }
}
```

### Mark Notification Read

```graphql
mutation MiniappMarkNotificationRead($notification_id: String!) {
  miniappMarkNotificationRead(notification_id: $notification_id) {
    success
    message
  }
}

mutation MiniappMarkAllNotificationsRead {
  miniappMarkAllNotificationsRead {
    success
    message
  }
}
```

### Register Push Token

```graphql
mutation MiniappRegisterPushToken($token: String!) {
  miniappRegisterPushToken(token: $token) {
    success
    message
  }
}
```

## Daily Rewards

### Get Daily Reward Status

```graphql
query GetMiniappDailyReward {
  getMiniappDailyReward {
    can_claim
    streak_day
    today_reward {
      xp
      tokens
      bonus_multiplier
    }
    next_milestone {
      day
      reward_description
    }
    claim_expires_at
  }
}
```

### Claim Daily Reward

```graphql
mutation MiniappClaimDailyReward {
  miniappClaimDailyReward {
    xp_earned
    tokens_earned
    bonus_earned
    new_streak_day
    milestone_reached
  }
}
```

## Event Tracking

### Track Miniapp Event

```graphql
mutation MiniappTrackEvent($event: String!, $data: JSON) {
  miniappTrackEvent(event: $event, data: $data) {
    success
    message
  }
}
```

**Common events:**
- `miniapp_opened`
- `session_started`
- `session_completed`
- `friend_invited`
- `reward_claimed`

## Subscriptions

### Friends Activity

```graphql
subscription OnMiniappFriendActivity {
  miniappFriendActivity {
    friend_id
    display_name
    activity_type
    message
  }
}
```

## Database Schema

### push_tokens

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User reference |
| token | TEXT | Push token |
| platform | TEXT | telegram/ios/android |
| is_active | BOOLEAN | Token active |
| created_at | TIMESTAMPTZ | Registration time |
| last_used_at | TIMESTAMPTZ | Last push sent |

### daily_rewards

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User reference |
| streak_day | INTEGER | Current streak day |
| reward_xp | INTEGER | XP earned |
| reward_tokens | DECIMAL | Tokens earned |
| bonus_multiplier | FLOAT | Streak bonus |
| claimed_at | TIMESTAMPTZ | Claim time |

## Response Size Optimization

Miniapp responses are optimized for size:

| Standard API | Miniapp API | Reduction |
|--------------|-------------|-----------|
| ~5KB user profile | ~800B compact | 84% |
| ~3KB leaderboard | ~600B compact | 80% |
| ~2KB challenges | ~400B compact | 80% |

## Telegram WebApp Integration

### Initialize

```typescript
import { WebApp } from '@twa-dev/sdk'

// Initialize
WebApp.ready()
WebApp.expand()

// Get user data
const user = WebApp.initDataUnsafe.user
const initData = WebApp.initData

// Authenticate
const { data } = await client.mutate({
  mutation: AUTHENTICATE_WITH_TELEGRAM,
  variables: { initData }
})
```

### Theme Integration

```typescript
// Match Telegram theme
const themeParams = WebApp.themeParams
const bgColor = themeParams.bg_color
const textColor = themeParams.text_color
```

### Haptic Feedback

```typescript
// Provide haptic feedback
WebApp.HapticFeedback.impactOccurred('medium')
WebApp.HapticFeedback.notificationOccurred('success')
```

### Main Button

```typescript
// Configure main button
WebApp.MainButton.setText('Start Dancing')
WebApp.MainButton.show()
WebApp.MainButton.onClick(() => {
  startQuickSession()
})
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TELEGRAM_DATA` | Invalid initData |
| `TELEGRAM_NOT_LINKED` | Account not linked |
| `ALREADY_LINKED` | Telegram already linked |
| `SESSION_EXPIRED` | Quick session expired |
| `DAILY_REWARD_CLAIMED` | Already claimed today |
| `FRIEND_NOT_FOUND` | Invalid friend ID |
| `CHEER_COOLDOWN` | Can only cheer once per hour |

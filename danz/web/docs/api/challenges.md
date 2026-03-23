# Challenges API

The Challenges API powers the gamification system with daily, weekly, and special challenges that reward users for dancing.

## Challenge Types

| Type | Duration | Reset |
|------|----------|-------|
| `DAILY` | 24 hours | Midnight UTC |
| `WEEKLY` | 7 days | Monday UTC |
| `SPECIAL` | Variable | Event-based |
| `EVENT` | Event duration | Event end |
| `COMMUNITY` | Variable | Goal completion |

## Challenge Categories

- `DANCE_TIME` - Total dance minutes
- `CALORIES` - Calories burned
- `SESSIONS` - Number of sessions
- `STREAK` - Consecutive days
- `SOCIAL` - Social interactions
- `STYLE` - Specific dance styles
- `EVENT` - Event participation

## Queries

### Get Available Challenges

```graphql
query GetAvailableChallenges($type: ChallengeType) {
  getAvailableChallenges(type: $type) {
    id
    title
    description
    type
    category
    target_value
    current_value
    progress_percentage
    reward_xp
    reward_tokens
    reward_badge_id
    starts_at
    ends_at
    is_joined
    participant_count
  }
}
```

### Get My Challenges

```graphql
query GetMyChallenges($status: ChallengeStatus) {
  getMyChallenges(status: $status) {
    challenge {
      id
      title
      type
      target_value
    }
    status
    progress
    progress_percentage
    started_at
    completed_at
    reward_claimed
  }
}
```

**Status Options:**
- `ACTIVE` - Currently in progress
- `COMPLETED` - Finished successfully
- `FAILED` - Expired without completion
- `ABANDONED` - User quit early

### Get Challenge Details

```graphql
query GetChallengeDetails($challengeId: String!) {
  getChallengeDetails(challengeId: $challengeId) {
    id
    title
    description
    type
    category
    target_value
    reward_xp
    reward_tokens
    reward_badge_id
    badge {
      id
      name
      image_url
    }
    milestones {
      percentage
      reward_xp
      description
    }
    leaderboard {
      user {
        display_name
        avatar_url
      }
      progress
      rank
    }
    starts_at
    ends_at
    participant_count
  }
}
```

### Get Challenge Leaderboard

```graphql
query GetChallengeLeaderboard(
  $challengeId: String!
  $limit: Int
  $offset: Int
) {
  getChallengeLeaderboard(
    challengeId: $challengeId
    limit: $limit
    offset: $offset
  ) {
    entries {
      user {
        privy_id
        display_name
        avatar_url
      }
      progress
      progress_percentage
      rank
      completed_at
    }
    total_participants
    my_rank
  }
}
```

## Mutations

### Join a Challenge

```graphql
mutation JoinChallenge($challengeId: String!) {
  joinChallenge(challengeId: $challengeId) {
    id
    status
    progress
    started_at
  }
}
```

### Update Challenge Progress

::: info Automatic Updates
Progress is automatically updated when users complete dance sessions, earn achievements, or perform tracked activities. Manual updates are typically only needed for special integrations.
:::

```graphql
mutation UpdateChallengeProgress($input: UpdateChallengeProgressInput!) {
  updateChallengeProgress(input: $input) {
    id
    progress
    progress_percentage
    status
    milestones_reached
  }
}
```

### Claim Challenge Reward

```graphql
mutation ClaimChallengeReward($challengeId: String!) {
  claimChallengeReward(challengeId: $challengeId) {
    xp_earned
    tokens_earned
    badge_earned {
      id
      name
      image_url
    }
  }
}
```

### Abandon Challenge

```graphql
mutation AbandonChallenge($challengeId: String!) {
  abandonChallenge(challengeId: $challengeId) {
    success
    message
  }
}
```

## Subscriptions

### Challenge Progress Updates

```graphql
subscription OnChallengeProgress($challengeId: String!) {
  challengeProgressUpdated(challengeId: $challengeId) {
    user_id
    progress
    progress_percentage
    rank_change
  }
}
```

### Challenge Completed

```graphql
subscription OnChallengeCompleted {
  challengeCompleted {
    challenge_id
    challenge_title
    reward_xp
    reward_tokens
    badge_earned
  }
}
```

## Pre-seeded Challenges

The platform comes with these default daily challenges:

| Challenge | Target | Reward |
|-----------|--------|--------|
| Daily Dancer | 15 min dance time | 50 XP |
| Calorie Crusher | 200 calories | 75 XP |
| Session Starter | 3 sessions | 100 XP |
| Heart Racer | 120 avg BPM for 10 min | 60 XP |
| Style Explorer | Try 2 dance styles | 80 XP |
| Social Butterfly | 5 social interactions | 40 XP |
| Early Bird | Dance before 9 AM | 30 XP |
| Night Owl | Dance after 9 PM | 30 XP |

## Database Schema

### challenges

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Challenge name |
| description | TEXT | Full description |
| type | ENUM | DAILY/WEEKLY/SPECIAL/EVENT |
| category | ENUM | Challenge category |
| target_value | INTEGER | Goal to reach |
| target_unit | TEXT | Unit (minutes, calories, etc.) |
| reward_xp | INTEGER | XP reward |
| reward_tokens | DECIMAL | Token reward |
| reward_badge_id | UUID | Badge reward reference |
| is_active | BOOLEAN | Currently available |
| is_featured | BOOLEAN | Featured challenge |
| max_participants | INTEGER | Optional limit |
| starts_at | TIMESTAMPTZ | Start time |
| ends_at | TIMESTAMPTZ | End time |
| created_at | TIMESTAMPTZ | Creation time |

### user_challenges

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User reference |
| challenge_id | UUID | Challenge reference |
| status | ENUM | ACTIVE/COMPLETED/FAILED/ABANDONED |
| progress | INTEGER | Current progress value |
| milestones_reached | INTEGER[] | Completed milestones |
| started_at | TIMESTAMPTZ | Join time |
| completed_at | TIMESTAMPTZ | Completion time |
| reward_claimed | BOOLEAN | Reward claimed flag |
| reward_claimed_at | TIMESTAMPTZ | Claim time |

## Example: Daily Challenge Flow

```typescript
// 1. Get today's challenges
const { data } = await client.query({
  query: GET_AVAILABLE_CHALLENGES,
  variables: { type: 'DAILY' }
})

// 2. Join a challenge
await client.mutate({
  mutation: JOIN_CHALLENGE,
  variables: { challengeId: challenge.id }
})

// 3. Progress updates automatically when dancing...

// 4. Check progress
const { data: myChallenge } = await client.query({
  query: GET_MY_CHALLENGES,
  variables: { status: 'ACTIVE' }
})

// 5. Claim reward when complete
if (myChallenge.status === 'COMPLETED' && !myChallenge.reward_claimed) {
  await client.mutate({
    mutation: CLAIM_CHALLENGE_REWARD,
    variables: { challengeId: challenge.id }
  })
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `CHALLENGE_NOT_FOUND` | Challenge doesn't exist |
| `ALREADY_JOINED` | User already participating |
| `CHALLENGE_FULL` | Max participants reached |
| `CHALLENGE_EXPIRED` | Challenge has ended |
| `CHALLENGE_NOT_STARTED` | Challenge hasn't begun |
| `NOT_PARTICIPATING` | User not in challenge |
| `REWARD_ALREADY_CLAIMED` | Reward already claimed |
| `CHALLENGE_NOT_COMPLETED` | Can't claim incomplete |

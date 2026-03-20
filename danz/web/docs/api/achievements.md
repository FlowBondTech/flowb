# Achievements API

GraphQL operations for the achievement and gamification system.

## Types

### Achievement Type

```graphql
type Achievement {
  id: ID!
  user: User!
  achievementType: String!
  title: String!
  description: String
  icon: String
  xpReward: Int!
  danzReward: Float!
  unlockedAt: DateTime!
}

type AchievementDefinition {
  type: String!
  title: String!
  description: String!
  icon: String!
  xpReward: Int!
  danzReward: Float!
  category: AchievementCategory!
  requirement: AchievementRequirement!
}

enum AchievementCategory {
  events
  social
  streaks
  milestones
  special
}

type AchievementRequirement {
  type: RequirementType!
  count: Int
  duration: Int  # days
  condition: String
}

enum RequirementType {
  event_count
  bond_count
  streak_days
  xp_total
  dance_time
  special_action
}
```

## Achievement Definitions

### Events Category

| Achievement | Requirement | XP Reward |
|------------|-------------|-----------|
| **First Steps** | Attend 1 event | 100 |
| **Regular Dancer** | Attend 10 events | 500 |
| **Event Enthusiast** | Attend 25 events | 1000 |
| **Dance Legend** | Attend 100 events | 5000 |
| **Event Creator** | Create 1 event | 200 |
| **Community Builder** | Create 10 events | 1000 |

### Social Category

| Achievement | Requirement | XP Reward |
|------------|-------------|-----------|
| **First Bond** | Create 1 dance bond | 50 |
| **Social Butterfly** | Create 10 dance bonds | 300 |
| **Dance Family** | Create 50 dance bonds | 1500 |
| **Bond Master** | Reach level 50 bond | 2000 |

### Streaks Category

| Achievement | Requirement | XP Reward |
|------------|-------------|-----------|
| **Week Warrior** | 7 day streak | 200 |
| **Monthly Mover** | 30 day streak | 1000 |
| **Dedicated Dancer** | 100 day streak | 5000 |

### Milestones Category

| Achievement | Requirement | XP Reward |
|------------|-------------|-----------|
| **Level 5** | Reach level 5 | 250 |
| **Level 10** | Reach level 10 | 500 |
| **Level 25** | Reach level 25 | 2500 |
| **Level 50** | Reach level 50 | 10000 |

## Queries

### Get My Achievements

<div class="api-method query">QUERY</div>

```graphql
query GetMyAchievements {
  myAchievements {
    id
    achievementType
    title
    description
    icon
    xpReward
    danzReward
    unlockedAt
  }
}
```

### Get Achievement Progress

<div class="api-method query">QUERY</div>

```graphql
query GetAchievementProgress {
  achievementProgress {
    achievementType
    title
    description
    icon
    category
    requirement {
      type
      count
    }
    currentProgress
    isUnlocked
    unlockedAt
  }
}
```

**Response:**

```json
{
  "data": {
    "achievementProgress": [
      {
        "achievementType": "regular_dancer",
        "title": "Regular Dancer",
        "description": "Attend 10 events",
        "icon": "trophy",
        "category": "events",
        "requirement": {
          "type": "event_count",
          "count": 10
        },
        "currentProgress": 7,
        "isUnlocked": false,
        "unlockedAt": null
      },
      {
        "achievementType": "first_steps",
        "title": "First Steps",
        "description": "Attend your first event",
        "icon": "star",
        "category": "events",
        "requirement": {
          "type": "event_count",
          "count": 1
        },
        "currentProgress": 7,
        "isUnlocked": true,
        "unlockedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Get User Achievements

<div class="api-method query">QUERY</div>

```graphql
query GetUserAchievements($userId: ID!) {
  userAchievements(userId: $userId) {
    id
    achievementType
    title
    icon
    unlockedAt
  }
}
```

### Get Available Achievements

<div class="api-method query">QUERY</div>

```graphql
query GetAvailableAchievements($category: AchievementCategory) {
  availableAchievements(category: $category) {
    type
    title
    description
    icon
    xpReward
    danzReward
    category
    requirement {
      type
      count
    }
  }
}
```

### Get Leaderboard

<div class="api-method query">QUERY</div>

```graphql
query GetLeaderboard($type: LeaderboardType!, $limit: Int) {
  leaderboard(type: $type, limit: $limit) {
    rank
    user {
      privyId
      displayName
      avatarUrl
      level
    }
    score
  }
}

enum LeaderboardType {
  xp
  achievements
  events_attended
  dance_bonds
  streak
}
```

## Mutations

### Claim Achievement

<div class="api-method mutation">MUTATION</div>

Some achievements require manual claiming.

```graphql
mutation ClaimAchievement($achievementType: String!) {
  claimAchievement(achievementType: $achievementType) {
    id
    title
    xpReward
    danzReward
    unlockedAt
  }
}
```

## Subscriptions

### Achievement Unlocked

```graphql
subscription OnAchievementUnlocked {
  achievementUnlocked {
    id
    achievementType
    title
    description
    icon
    xpReward
    danzReward
    unlockedAt
  }
}
```

## XP & Leveling System

### XP Sources

| Action | XP Earned |
|--------|-----------|
| Attend event | 50-200 |
| Create event | 100 |
| Create dance bond | 25 |
| Daily login | 10 |
| Complete profile | 100 |
| First post | 25 |
| Achievement unlock | Varies |

### Level Thresholds

```typescript
const XP_PER_LEVEL = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2100,   // Level 7
  2800,   // Level 8
  3600,   // Level 9
  4500,   // Level 10
  // ... continues with increasing gaps
]

function getLevelFromXP(xp: number): number {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (xp >= XP_PER_LEVEL[i]) return i + 1
  }
  return 1
}
```

### Level Benefits

| Level | Benefits |
|-------|----------|
| 1-4 | Basic access |
| 5-9 | Profile badge, priority registration |
| 10-19 | Custom profile themes |
| 20-29 | Early event access |
| 30-49 | VIP event invites |
| 50+ | Legend status, exclusive perks |

## Achievement Triggers

Achievements are automatically checked and awarded when:

1. **Event Check-in** - Event count achievements
2. **Bond Creation** - Social achievements
3. **Daily Login** - Streak achievements
4. **XP Gain** - Milestone achievements
5. **Profile Update** - Profile completion

### Backend Implementation

```typescript
// Check achievements after event check-in
async function checkEventAchievements(userId: string) {
  const stats = await getUserStats(userId)

  const eventAchievements = [
    { type: 'first_steps', count: 1 },
    { type: 'regular_dancer', count: 10 },
    { type: 'event_enthusiast', count: 25 },
    { type: 'dance_legend', count: 100 },
  ]

  for (const achievement of eventAchievements) {
    if (stats.totalEventsAttended >= achievement.count) {
      await unlockAchievement(userId, achievement.type)
    }
  }
}
```

## Examples

### Achievement Display Component

```typescript
import { useGetAchievementProgressQuery } from '@/generated/graphql'

function AchievementsPage() {
  const { data, loading } = useGetAchievementProgressQuery()

  const unlocked = data?.achievementProgress.filter(a => a.isUnlocked) || []
  const inProgress = data?.achievementProgress.filter(a => !a.isUnlocked) || []

  return (
    <div>
      <h2>Unlocked ({unlocked.length})</h2>
      <AchievementGrid achievements={unlocked} />

      <h2>In Progress</h2>
      {inProgress.map(achievement => (
        <AchievementProgress
          key={achievement.achievementType}
          achievement={achievement}
        />
      ))}
    </div>
  )
}

function AchievementProgress({ achievement }) {
  const progress = achievement.currentProgress / achievement.requirement.count

  return (
    <div className="achievement-card">
      <Icon name={achievement.icon} />
      <h3>{achievement.title}</h3>
      <p>{achievement.description}</p>
      <ProgressBar value={progress} />
      <span>{achievement.currentProgress} / {achievement.requirement.count}</span>
    </div>
  )
}
```

## Next Steps

- [Social API](/api/social) - Dance bonds and feed
- [Users API](/api/users) - User stats and XP
- [Database Schema](/database/schema) - Achievements table

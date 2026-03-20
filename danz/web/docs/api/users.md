# Users API

GraphQL operations for user management.

## Types

### User Type

```graphql
type User {
  # Identity
  privyId: ID!
  username: String
  displayName: String

  # Profile
  bio: String
  avatarUrl: String
  coverImageUrl: String

  # Location
  location: String
  city: String
  latitude: Float
  longitude: Float

  # Social Links
  website: String
  instagram: String
  tiktok: String
  youtube: String
  twitter: String

  # Dance Info
  danceStyles: [String!]
  skillLevel: SkillLevel
  favoriteMusic: [String!]

  # Demographics
  age: Int
  pronouns: String

  # Privacy
  isPublic: Boolean!
  allowMessages: Boolean!
  showLocation: Boolean!

  # Gamification
  xp: Int!
  level: Int!

  # Stats
  totalDanceTime: Int!
  totalSessions: Int!
  longestStreak: Int!
  totalEventsAttended: Int!
  totalEventsCreated: Int!
  totalAchievements: Int!
  danceBondsCount: Int!

  # Role
  role: UserRole!
  isOrganizerApproved: Boolean!

  # Subscription
  subscriptionTier: SubscriptionTier!
  isPremium: String!

  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
  lastActiveAt: DateTime
}

enum SkillLevel {
  all
  beginner
  intermediate
  advanced
}

enum UserRole {
  user
  organizer
  manager
  admin
}

enum SubscriptionTier {
  free
  mover
  groover
  legend
}
```

## Queries

### Get Current User

<div class="api-method query">QUERY</div>

Returns the authenticated user's profile.

```graphql
query Me {
  me {
    privyId
    username
    displayName
    avatarUrl
    bio
    danceStyles
    skillLevel
    xp
    level
    subscriptionTier
    totalEventsAttended
    danceBondsCount
  }
}
```

**Response:**

```json
{
  "data": {
    "me": {
      "privyId": "did:privy:abc123",
      "username": "dancer_jane",
      "displayName": "Jane Doe",
      "avatarUrl": "https://s3.../avatar.jpg",
      "bio": "Salsa enthusiast from NYC",
      "danceStyles": ["salsa", "bachata"],
      "skillLevel": "intermediate",
      "xp": 2500,
      "level": 5,
      "subscriptionTier": "mover",
      "totalEventsAttended": 12,
      "danceBondsCount": 8
    }
  }
}
```

### Get User by ID

<div class="api-method query">QUERY</div>

```graphql
query GetUser($privyId: ID!) {
  user(privyId: $privyId) {
    privyId
    username
    displayName
    avatarUrl
    bio
    danceStyles
    skillLevel
    city
    isPublic
  }
}
```

**Variables:**

```json
{
  "privyId": "did:privy:abc123"
}
```

### Search Users

<div class="api-method query">QUERY</div>

```graphql
query SearchUsers($filters: UserFilters, $limit: Int, $offset: Int) {
  users(filters: $filters, limit: $limit, offset: $offset) {
    privyId
    username
    displayName
    avatarUrl
    city
    danceStyles
    skillLevel
  }
}

input UserFilters {
  city: String
  danceStyles: [String!]
  skillLevel: SkillLevel
  search: String
}
```

**Variables:**

```json
{
  "filters": {
    "city": "New York",
    "danceStyles": ["salsa"],
    "skillLevel": "intermediate"
  },
  "limit": 20,
  "offset": 0
}
```

### Check Username Availability

<div class="api-method query">QUERY</div>

```graphql
query CheckUsername($username: String!) {
  isUsernameAvailable(username: $username)
}
```

**Response:**

```json
{
  "data": {
    "isUsernameAvailable": true
  }
}
```

## Mutations

### Create User

<div class="api-method mutation">MUTATION</div>

Create a new user profile after Privy authentication.

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    privyId
    username
    displayName
    avatarUrl
    createdAt
  }
}

input CreateUserInput {
  username: String!
  displayName: String
  bio: String
  avatarUrl: String
  danceStyles: [String!]
  skillLevel: SkillLevel
  city: String
  age: Int
  pronouns: String
}
```

**Variables:**

```json
{
  "input": {
    "username": "dancer_jane",
    "displayName": "Jane Doe",
    "bio": "Love dancing salsa!",
    "danceStyles": ["salsa", "bachata"],
    "skillLevel": "intermediate",
    "city": "New York"
  }
}
```

### Update Profile

<div class="api-method mutation">MUTATION</div>

```graphql
mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    privyId
    username
    displayName
    bio
    avatarUrl
    danceStyles
    updatedAt
  }
}

input UpdateProfileInput {
  username: String
  displayName: String
  bio: String
  avatarUrl: String
  coverImageUrl: String
  danceStyles: [String!]
  skillLevel: SkillLevel
  favoriteMusic: [String!]
  city: String
  location: String
  website: String
  instagram: String
  tiktok: String
  youtube: String
  twitter: String
  age: Int
  pronouns: String
  isPublic: Boolean
  allowMessages: Boolean
  showLocation: Boolean
}
```

### Update Privacy Settings

<div class="api-method mutation">MUTATION</div>

```graphql
mutation UpdatePrivacy($input: PrivacySettingsInput!) {
  updatePrivacySettings(input: $input) {
    isPublic
    allowMessages
    showLocation
  }
}

input PrivacySettingsInput {
  isPublic: Boolean
  allowMessages: Boolean
  showLocation: Boolean
}
```

### Request Organizer Role

<div class="api-method mutation">MUTATION</div>

```graphql
mutation RequestOrganizerRole($input: OrganizerRequestInput!) {
  requestOrganizerRole(input: $input) {
    privyId
    role
    organizerRequestedAt
  }
}

input OrganizerRequestInput {
  companyName: String
  organizerBio: String!
  eventTypes: [String!]!
  websiteUrl: String
  socialMediaLinks: JSON
}
```

### Delete Account

<div class="api-method mutation">MUTATION</div>

```graphql
mutation DeleteAccount {
  deleteAccount {
    success
    message
  }
}
```

## Subscriptions (Admin)

### Approve Organizer

<div class="api-method mutation">MUTATION</div>

Requires `manager` or `admin` role.

```graphql
mutation ApproveOrganizer($userId: ID!) {
  approveOrganizer(userId: $userId) {
    privyId
    role
    isOrganizerApproved
    organizerApprovedAt
  }
}
```

### Reject Organizer

<div class="api-method mutation">MUTATION</div>

```graphql
mutation RejectOrganizer($userId: ID!, $reason: String!) {
  rejectOrganizer(userId: $userId, reason: $reason) {
    privyId
    organizerRejectionReason
  }
}
```

## Field Resolvers

### Computed Fields

```graphql
type User {
  # Computed: next level XP requirement
  xpToNextLevel: Int!

  # Computed: percentage to next level
  levelProgress: Float!

  # Computed: user's upcoming events
  upcomingEvents: [Event!]!

  # Computed: user's achievements
  achievements: [Achievement!]!

  # Computed: user's dance bonds
  danceBonds: [DanceBond!]!
}
```

## Error Handling

| Error Code | Description |
|------------|-------------|
| `UNAUTHENTICATED` | Not logged in |
| `USERNAME_TAKEN` | Username already exists |
| `INVALID_USERNAME` | Username doesn't match pattern |
| `USER_NOT_FOUND` | User doesn't exist |
| `FORBIDDEN` | Not authorized for action |

## Examples

### Complete Onboarding Flow

```typescript
import {
  useCreateUserMutation,
  useGetUploadUrlMutation,
} from '@/generated/graphql'

async function completeOnboarding(formData: OnboardingForm) {
  // 1. Upload avatar if provided
  let avatarUrl = null
  if (formData.avatar) {
    const { data: uploadData } = await getUploadUrl({
      variables: {
        input: {
          filename: formData.avatar.name,
          contentType: formData.avatar.type,
          folder: 'avatars',
        },
      },
    })

    // Upload to S3
    await uploadToS3(uploadData.getUploadUrl, formData.avatar)
    avatarUrl = uploadData.getUploadUrl.fileUrl
  }

  // 2. Create user
  const { data } = await createUser({
    variables: {
      input: {
        username: formData.username,
        displayName: formData.displayName,
        bio: formData.bio,
        avatarUrl,
        danceStyles: formData.danceStyles,
        skillLevel: formData.skillLevel,
        city: formData.city,
      },
    },
  })

  return data.createUser
}
```

## Next Steps

- [Events API](/api/events) - Event operations
- [Achievements API](/api/achievements) - Achievement system
- [Social API](/api/social) - Social features

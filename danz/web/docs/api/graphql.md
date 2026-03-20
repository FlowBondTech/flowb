# GraphQL API Reference

Complete GraphQL API documentation for the DANZ platform.

## Overview

The DANZ API is built with Apollo Server 4 and provides a single GraphQL endpoint for all data operations.

**Endpoint**: `https://api.danz.xyz/graphql` (production) | `http://localhost:8080/graphql` (development)

## Authentication

All authenticated requests require a Privy JWT token in the Authorization header:

```http
POST /graphql HTTP/1.1
Content-Type: application/json
Authorization: Bearer <privy-jwt-token>
```

## Schema Types

### User Types

```graphql
type User {
  privyId: ID!
  username: String
  displayName: String
  bio: String
  avatarUrl: String
  coverImageUrl: String

  # Location
  location: String
  city: String
  latitude: Float
  longitude: Float

  # Social
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

### Event Types

```graphql
type Event {
  id: ID!
  title: String!
  description: String
  category: EventCategory
  imageUrl: String

  # Location
  locationName: String!
  locationAddress: String
  locationCity: String
  locationLatitude: Float
  locationLongitude: Float
  isVirtual: Boolean!
  virtualLink: String

  # Organizer
  facilitator: User
  facilitatorId: String

  # Capacity
  maxCapacity: Int!
  currentCapacity: Int!
  spotsAvailable: Int!

  # Pricing
  priceUsd: Float
  priceDanz: Float
  currency: String!
  isFree: Boolean!

  # Schedule
  startDateTime: DateTime!
  endDateTime: DateTime!
  duration: Int! # minutes

  # Metadata
  skillLevel: SkillLevel
  requirements: String
  tags: [String!]
  danceStyles: [String!]
  isFeatured: Boolean!

  # User-specific
  isRegistered: Boolean
  registration: EventRegistration

  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum EventCategory {
  salsa
  hip_hop
  contemporary
  ballet
  jazz
  ballroom
  street
  cultural
  fitness
  class
  social
  battle
  workshop
  performance
  other
}

type EventRegistration {
  id: ID!
  event: Event!
  user: User!
  status: RegistrationStatus!
  paymentStatus: PaymentStatus!
  paymentAmount: Float
  paymentDate: DateTime
  checkedIn: Boolean!
  checkInTime: DateTime
  registrationDate: DateTime!
}

enum RegistrationStatus {
  registered
  waitlisted
  cancelled
  attended
  no_show
}

enum PaymentStatus {
  pending
  paid
  refunded
  free
}
```

### Social Types

```graphql
type DanceBond {
  id: ID!
  user1: User!
  user2: User!
  bondLevel: Int!
  sharedSessions: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FeedPost {
  id: ID!
  user: User!
  content: String!
  mediaUrls: [String!]
  mediaType: MediaType
  likesCount: Int!
  commentsCount: Int!
  sharesCount: Int!
  postType: PostType!
  isPublic: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum MediaType {
  image
  video
  mixed
}

enum PostType {
  post
  achievement
  event
  challenge
}

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

type Notification {
  id: ID!
  user: User!
  type: NotificationType!
  title: String!
  message: String
  data: JSON
  isRead: Boolean!
  createdAt: DateTime!
}

enum NotificationType {
  achievement
  event
  social
  system
  reward
}
```

## Queries

### User Queries

<div class="api-method query">QUERY</div>

#### `me`

Get the current authenticated user's profile.

```graphql
query Me {
  me {
    privyId
    username
    displayName
    avatarUrl
    xp
    level
    subscriptionTier
    # ... other fields
  }
}
```

<div class="api-method query">QUERY</div>

#### `user(privyId: ID!)`

Get a specific user by their Privy ID.

```graphql
query GetUser($privyId: ID!) {
  user(privyId: $privyId) {
    privyId
    username
    displayName
    avatarUrl
    bio
    danceStyles
    # ... other fields
  }
}
```

<div class="api-method query">QUERY</div>

#### `users(filters: UserFilters)`

Get a list of users with optional filters.

```graphql
query GetUsers($filters: UserFilters) {
  users(filters: $filters) {
    privyId
    username
    displayName
    city
    danceStyles
  }
}

input UserFilters {
  city: String
  danceStyles: [String!]
  skillLevel: SkillLevel
  limit: Int
  offset: Int
}
```

### Event Queries

<div class="api-method query">QUERY</div>

#### `events(filters: EventFilters)`

Get events with optional filters.

```graphql
query GetEvents($filters: EventFilters) {
  events(filters: $filters) {
    id
    title
    category
    startDateTime
    locationName
    locationCity
    facilitator {
      displayName
      avatarUrl
    }
    currentCapacity
    maxCapacity
    priceUsd
    isFree
  }
}

input EventFilters {
  category: EventCategory
  city: String
  startDate: DateTime
  endDate: DateTime
  skillLevel: SkillLevel
  isVirtual: Boolean
  isFeatured: Boolean
  facilitatorId: String
  limit: Int
  offset: Int
}
```

<div class="api-method query">QUERY</div>

#### `event(id: ID!)`

Get a specific event by ID.

```graphql
query GetEvent($id: ID!) {
  event(id: $id) {
    id
    title
    description
    category
    imageUrl
    startDateTime
    endDateTime
    locationName
    locationAddress
    locationCity
    facilitator {
      privyId
      displayName
      avatarUrl
    }
    maxCapacity
    currentCapacity
    priceUsd
    isRegistered
    registration {
      status
      paymentStatus
    }
  }
}
```

<div class="api-method query">QUERY</div>

#### `myRegistrations`

Get current user's event registrations.

```graphql
query MyRegistrations {
  myRegistrations {
    id
    status
    paymentStatus
    registrationDate
    event {
      id
      title
      startDateTime
      locationName
    }
  }
}
```

## Mutations

### User Mutations

<div class="api-method mutation">MUTATION</div>

#### `createUser(input: CreateUserInput!)`

Create a new user profile after Privy authentication.

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    privyId
    username
    displayName
    avatarUrl
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
}
```

<div class="api-method mutation">MUTATION</div>

#### `updateProfile(input: UpdateProfileInput!)`

Update the current user's profile.

```graphql
mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    privyId
    username
    displayName
    bio
    avatarUrl
    danceStyles
    skillLevel
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
  city: String
  website: String
  instagram: String
  tiktok: String
  youtube: String
  twitter: String
}
```

### Event Mutations

<div class="api-method mutation">MUTATION</div>

#### `createEvent(input: CreateEventInput!)`

Create a new event (organizers only).

```graphql
mutation CreateEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    id
    title
    startDateTime
    locationName
  }
}

input CreateEventInput {
  title: String!
  description: String
  category: EventCategory!
  imageUrl: String
  locationName: String!
  locationAddress: String
  locationCity: String
  locationLatitude: Float
  locationLongitude: Float
  isVirtual: Boolean
  virtualLink: String
  startDateTime: DateTime!
  endDateTime: DateTime!
  maxCapacity: Int
  priceUsd: Float
  skillLevel: SkillLevel
  requirements: String
  tags: [String!]
  danceStyles: [String!]
}
```

<div class="api-method mutation">MUTATION</div>

#### `registerForEvent(eventId: ID!)`

Register for an event.

```graphql
mutation RegisterForEvent($eventId: ID!) {
  registerForEvent(eventId: $eventId) {
    id
    status
    paymentStatus
    event {
      id
      title
    }
  }
}
```

<div class="api-method mutation">MUTATION</div>

#### `cancelRegistration(registrationId: ID!)`

Cancel an event registration.

```graphql
mutation CancelRegistration($registrationId: ID!) {
  cancelRegistration(registrationId: $registrationId) {
    id
    status
  }
}
```

### Social Mutations

<div class="api-method mutation">MUTATION</div>

#### `createDanceBond(userId: ID!)`

Create a dance bond with another user.

```graphql
mutation CreateDanceBond($userId: ID!) {
  createDanceBond(userId: $userId) {
    id
    bondLevel
    user1 { displayName }
    user2 { displayName }
  }
}
```

<div class="api-method mutation">MUTATION</div>

#### `createPost(input: CreatePostInput!)`

Create a feed post.

```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    content
    mediaUrls
    createdAt
  }
}

input CreatePostInput {
  content: String!
  mediaUrls: [String!]
  mediaType: MediaType
  postType: PostType
  isPublic: Boolean
}
```

### Upload Mutations

<div class="api-method mutation">MUTATION</div>

#### `getUploadUrl(input: UploadInput!)`

Get a presigned URL for file upload.

```graphql
mutation GetUploadUrl($input: UploadInput!) {
  getUploadUrl(input: $input) {
    uploadUrl
    fileUrl
    fields
  }
}

input UploadInput {
  filename: String!
  contentType: String!
  folder: String
}
```

## Error Handling

GraphQL errors include an extensions object with error codes:

```json
{
  "errors": [
    {
      "message": "Not authenticated",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

| Code | Description |
|------|-------------|
| `UNAUTHENTICATED` | Missing or invalid JWT token |
| `FORBIDDEN` | User lacks permission |
| `BAD_USER_INPUT` | Invalid input data |
| `NOT_FOUND` | Resource not found |
| `INTERNAL_SERVER_ERROR` | Server error |

## Code Generation

Frontend apps use GraphQL Codegen to generate TypeScript types and React hooks:

```bash
# In danz-web or danz-miniapp
bun run codegen
```

Generated hooks:

```typescript
import {
  useGetMyProfileQuery,
  useUpdateProfileMutation,
  useGetEventsQuery,
  useRegisterForEventMutation,
} from '@/generated/graphql'

// Usage
const { data, loading, error } = useGetMyProfileQuery()
const [updateProfile] = useUpdateProfileMutation()
```

## Next Steps

- [Authentication](/api/authentication) - Auth details
- [Users API](/api/users) - User operations
- [Events API](/api/events) - Event operations

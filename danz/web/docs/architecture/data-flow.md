# Data Flow

Detailed data flow diagrams for key operations in the DANZ platform.

## Authentication Flow

### Login with Privy

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Privy   │     │  Backend │     │ Supabase │
│   App    │     │  Server  │     │  Server  │     │    DB    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. User clicks login           │                │
     │────────────────────────────────▶│                │
     │                │                │                │
     │  2. Privy modal opens           │                │
     │◀────────────────────────────────│                │
     │                │                │                │
     │  3. User authenticates          │                │
     │───────────────▶│                │                │
     │                │                │                │
     │  4. Privy returns JWT           │                │
     │◀───────────────│                │                │
     │                │                │                │
     │  5. Client sends GraphQL request with JWT        │
     │────────────────────────────────▶│                │
     │                │                │                │
     │                │  6. Verify JWT │                │
     │                │◀───────────────│                │
     │                │  7. Valid ✓    │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │  8. Lookup user│
     │                │                │───────────────▶│
     │                │                │  9. User data  │
     │                │                │◀───────────────│
     │                │                │                │
     │  10. Return user profile        │                │
     │◀────────────────────────────────│                │
     │                │                │                │
```

### First-Time User (Onboarding)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Backend │     │ Supabase │     │   S3     │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. Login success (no user record)               │
     │────────────────────────────────▶│                │
     │                │                │                │
     │  2. Show onboarding form        │                │
     │◀────────────────────────────────│                │
     │                │                │                │
     │  3. User fills profile + avatar │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │  4. Upload avatar               │
     │                │────────────────────────────────▶│
     │                │  5. S3 URL                      │
     │                │◀────────────────────────────────│
     │                │                │                │
     │                │  6. Create user│                │
     │                │───────────────▶│                │
     │                │  7. User created               │
     │                │◀───────────────│                │
     │                │                │                │
     │  8. Onboarding complete         │                │
     │◀────────────────────────────────│                │
```

## Event Operations

### Event Discovery

```graphql
query GetEvents($filters: EventFiltersInput) {
  events(filters: $filters) {
    id
    title
    category
    startDateTime
    location {
      name
      city
    }
    facilitator {
      displayName
      avatarUrl
    }
    currentCapacity
    maxCapacity
    priceUsd
  }
}
```

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Backend │     │ Supabase │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │  getEvents()   │                │
     │───────────────▶│                │
     │                │  SELECT events │
     │                │  JOIN users    │
     │                │  WHERE filters │
     │                │───────────────▶│
     │                │  Results       │
     │                │◀───────────────│
     │  Events list   │                │
     │◀───────────────│                │
```

### Event Registration with Payment

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Backend │     │ Supabase │     │  Stripe  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. registerForEvent(eventId)   │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │  2. Check capacity              │
     │                │───────────────▶│                │
     │                │  3. Spots available            │
     │                │◀───────────────│                │
     │                │                │                │
     │                │  4. Create registration        │
     │                │  (status: pending)             │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │  5. Create payment intent      │
     │                │────────────────────────────────▶│
     │                │  6. Client secret               │
     │                │◀────────────────────────────────│
     │                │                │                │
     │  7. Return registration + payment intent        │
     │◀───────────────│                │                │
     │                │                │                │
     │  8. User completes payment (Stripe Elements)    │
     │────────────────────────────────────────────────▶│
     │                │                │                │
     │                │  9. Webhook: payment_succeeded  │
     │                │◀────────────────────────────────│
     │                │                │                │
     │                │  10. Update registration       │
     │                │  (status: paid)                │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
```

## Social Features

### Creating a Feed Post

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Backend │     │    S3    │     │ Supabase │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. Upload media files          │                │
     │───────────────▶│                │                │
     │                │  2. Get presigned URLs          │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │  3. Presigned URLs              │                │
     │◀───────────────│                │                │
     │                │                │                │
     │  4. Direct upload to S3         │                │
     │────────────────────────────────▶│                │
     │  5. Success                     │                │
     │◀────────────────────────────────│                │
     │                │                │                │
     │  6. createPost(content, mediaUrls)               │
     │───────────────▶│                │                │
     │                │                │  7. INSERT     │
     │                │────────────────────────────────▶│
     │                │                │  8. Post data  │
     │                │◀────────────────────────────────│
     │  9. Post created                │                │
     │◀───────────────│                │                │
```

### Dance Bond Formation

```graphql
mutation CreateDanceBond($userId: ID!) {
  createDanceBond(userId: $userId) {
    id
    bondLevel
    sharedSessions
    user1 { displayName }
    user2 { displayName }
  }
}
```

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  User A  │     │  Backend │     │ Supabase │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │  createDanceBond(userB)         │
     │───────────────▶│                │
     │                │                │
     │                │  Check existing│
     │                │───────────────▶│
     │                │  No bond ✓     │
     │                │◀───────────────│
     │                │                │
     │                │  INSERT bond   │
     │                │  (level: 1)    │
     │                │───────────────▶│
     │                │◀───────────────│
     │                │                │
     │                │  Notify User B │
     │                │───────────────▶│
     │                │◀───────────────│
     │                │                │
     │  Bond created  │                │
     │◀───────────────│                │
```

## Achievement System

### Unlocking an Achievement

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Trigger │     │  Backend │     │ Supabase │
│  Event   │     │  Logic   │     │    DB    │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │  1. Event completed             │
     │  (check-in, post, etc.)         │
     │───────────────▶│                │
     │                │                │
     │                │  2. Check achievement criteria  │
     │                │───────────────▶│
     │                │  3. User stats │
     │                │◀───────────────│
     │                │                │
     │                │  4. Achievement unlocked?       │
     │                │  (e.g., 10 events attended)     │
     │                │                │
     │                │  5. INSERT achievement          │
     │                │───────────────▶│
     │                │◀───────────────│
     │                │                │
     │                │  6. Update user XP              │
     │                │───────────────▶│
     │                │◀───────────────│
     │                │                │
     │                │  7. Create notification         │
     │                │───────────────▶│
     │                │◀───────────────│
```

## Subscription Management

### Stripe Webhook Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Stripe  │     │  Backend │     │ Supabase │     │  Client  │
│  Server  │     │ Webhook  │     │    DB    │     │   App    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  customer.subscription.created  │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │  Verify signature               │
     │                │  Extract data  │                │
     │                │                │                │
     │                │  UPDATE users  │                │
     │                │  SET subscription_status,      │
     │                │      subscription_plan,        │
     │                │      is_premium               │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │  INSERT subscription_history   │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │                │                │
     │  200 OK        │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │                │                │  Next request  │
     │                │                │  returns updated│
     │                │                │  premium status│
     │                │                │◀───────────────│
```

## Real-time Updates (Future)

### Supabase Real-time

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Client A │     │ Supabase │     │ Client B │
│          │     │ Realtime │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │  Subscribe to feed_posts        │
     │───────────────▶│                │
     │  ✓ Subscribed  │                │
     │◀───────────────│                │
     │                │                │
     │                │  New post by B │
     │                │◀───────────────│
     │                │                │
     │  Broadcast     │                │
     │◀───────────────│                │
     │                │                │
     │  UI updates    │                │
     │                │                │
```

## Next Steps

- [Security Architecture](/architecture/security) - Security details
- [Database Schema](/database/schema) - Table definitions
- [API Reference](/api/graphql) - GraphQL operations

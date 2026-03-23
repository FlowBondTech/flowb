# Social API

GraphQL operations for social features: dance bonds, feed posts, and notifications.

## Dance Bonds

### Types

```graphql
type DanceBond {
  id: ID!
  user1: User!
  user2: User!
  bondLevel: Int!  # 1-100
  sharedSessions: Int!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Computed
  otherUser: User!  # The other user in the bond (relative to current user)
}
```

### Queries

<div class="api-method query">QUERY</div>

#### Get My Dance Bonds

```graphql
query GetMyDanceBonds($limit: Int, $offset: Int) {
  myDanceBonds(limit: $limit, offset: $offset) {
    id
    bondLevel
    sharedSessions
    otherUser {
      privyId
      displayName
      avatarUrl
      city
    }
    createdAt
  }
}
```

<div class="api-method query">QUERY</div>

#### Get Bond with User

```graphql
query GetBondWithUser($userId: ID!) {
  bondWithUser(userId: $userId) {
    id
    bondLevel
    sharedSessions
    createdAt
    updatedAt
  }
}
```

<div class="api-method query">QUERY</div>

#### Get Suggested Bonds

```graphql
query GetSuggestedBonds($limit: Int) {
  suggestedBonds(limit: $limit) {
    user {
      privyId
      displayName
      avatarUrl
      city
      danceStyles
    }
    reason  # "Same city", "Similar dance styles", etc.
    mutualBonds: Int
  }
}
```

### Mutations

<div class="api-method mutation">MUTATION</div>

#### Create Dance Bond

```graphql
mutation CreateDanceBond($userId: ID!) {
  createDanceBond(userId: $userId) {
    id
    bondLevel
    otherUser {
      displayName
    }
  }
}
```

<div class="api-method mutation">MUTATION</div>

#### Remove Dance Bond

```graphql
mutation RemoveDanceBond($bondId: ID!) {
  removeDanceBond(bondId: $bondId) {
    success
    message
  }
}
```

### Bond Level System

Bond levels increase through shared activities:

| Activity | Bond XP |
|----------|---------|
| Create bond | +1 level |
| Attend same event | +2 levels |
| Message exchange | +1 level |
| Shared achievement | +3 levels |

```typescript
// Bond level benefits
const BOND_TIERS = {
  acquaintance: { min: 1, max: 10 },
  friend: { min: 11, max: 30 },
  close_friend: { min: 31, max: 60 },
  dance_partner: { min: 61, max: 90 },
  soul_mate: { min: 91, max: 100 },
}
```

---

## Feed Posts

### Types

```graphql
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

  # User context
  isLiked: Boolean!  # Has current user liked?
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

type PostComment {
  id: ID!
  post: FeedPost!
  user: User!
  content: String!
  createdAt: DateTime!
}
```

### Queries

<div class="api-method query">QUERY</div>

#### Get Feed

```graphql
query GetFeed($limit: Int, $offset: Int, $type: FeedType) {
  feed(limit: $limit, offset: $offset, type: $type) {
    id
    content
    mediaUrls
    mediaType
    likesCount
    commentsCount
    postType
    isLiked
    createdAt
    user {
      privyId
      displayName
      avatarUrl
    }
  }
}

enum FeedType {
  all        # All public posts
  following  # Posts from dance bonds
  own        # Current user's posts
}
```

<div class="api-method query">QUERY</div>

#### Get Post

```graphql
query GetPost($id: ID!) {
  post(id: $id) {
    id
    content
    mediaUrls
    mediaType
    likesCount
    commentsCount
    postType
    isLiked
    createdAt
    user {
      privyId
      displayName
      avatarUrl
    }
    comments(limit: 20) {
      id
      content
      createdAt
      user {
        displayName
        avatarUrl
      }
    }
  }
}
```

<div class="api-method query">QUERY</div>

#### Get User Posts

```graphql
query GetUserPosts($userId: ID!, $limit: Int, $offset: Int) {
  userPosts(userId: $userId, limit: $limit, offset: $offset) {
    id
    content
    mediaUrls
    likesCount
    commentsCount
    createdAt
  }
}
```

### Mutations

<div class="api-method mutation">MUTATION</div>

#### Create Post

```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    content
    mediaUrls
    postType
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

<div class="api-method mutation">MUTATION</div>

#### Delete Post

```graphql
mutation DeletePost($id: ID!) {
  deletePost(id: $id) {
    success
  }
}
```

<div class="api-method mutation">MUTATION</div>

#### Like Post

```graphql
mutation LikePost($postId: ID!) {
  likePost(postId: $postId) {
    id
    likesCount
    isLiked
  }
}
```

<div class="api-method mutation">MUTATION</div>

#### Unlike Post

```graphql
mutation UnlikePost($postId: ID!) {
  unlikePost(postId: $postId) {
    id
    likesCount
    isLiked
  }
}
```

<div class="api-method mutation">MUTATION</div>

#### Add Comment

```graphql
mutation AddComment($postId: ID!, $content: String!) {
  addComment(postId: $postId, content: $content) {
    id
    content
    createdAt
    user {
      displayName
      avatarUrl
    }
  }
}
```

---

## Notifications

### Types

```graphql
type Notification {
  id: ID!
  type: NotificationType!
  title: String!
  message: String
  data: JSON
  isRead: Boolean!
  createdAt: DateTime!
}

enum NotificationType {
  achievement    # Achievement unlocked
  event          # Event reminder, registration confirmed
  social         # New dance bond, post like
  system         # System announcements
  reward         # XP earned, level up
}
```

### Queries

<div class="api-method query">QUERY</div>

#### Get Notifications

```graphql
query GetNotifications($limit: Int, $unreadOnly: Boolean) {
  notifications(limit: $limit, unreadOnly: $unreadOnly) {
    id
    type
    title
    message
    data
    isRead
    createdAt
  }
}
```

<div class="api-method query">QUERY</div>

#### Get Unread Count

```graphql
query GetUnreadCount {
  unreadNotificationCount
}
```

### Mutations

<div class="api-method mutation">MUTATION</div>

#### Mark as Read

```graphql
mutation MarkNotificationRead($id: ID!) {
  markNotificationRead(id: $id) {
    id
    isRead
  }
}
```

<div class="api-method mutation">MUTATION</div>

#### Mark All as Read

```graphql
mutation MarkAllNotificationsRead {
  markAllNotificationsRead {
    success
    count
  }
}
```

### Notification Data Structures

```typescript
// Achievement notification
{
  type: 'achievement',
  title: 'Achievement Unlocked!',
  message: 'You earned "Regular Dancer"',
  data: {
    achievementType: 'regular_dancer',
    xpReward: 500
  }
}

// Event notification
{
  type: 'event',
  title: 'Event Reminder',
  message: 'Salsa Night starts in 1 hour',
  data: {
    eventId: 'event-123',
    eventTitle: 'Salsa Night'
  }
}

// Social notification
{
  type: 'social',
  title: 'New Dance Bond',
  message: 'Jane Doe connected with you',
  data: {
    userId: 'did:privy:abc',
    userName: 'Jane Doe'
  }
}
```

---

## Examples

### Social Feed Component

```typescript
import {
  useGetFeedQuery,
  useLikePostMutation,
  useCreatePostMutation,
} from '@/generated/graphql'

function SocialFeed() {
  const { data, loading, fetchMore } = useGetFeedQuery({
    variables: { limit: 20, type: 'following' },
  })

  const [likePost] = useLikePostMutation()
  const [createPost] = useCreatePostMutation()

  const handleLike = async (postId: string) => {
    await likePost({
      variables: { postId },
      optimisticResponse: {
        likePost: {
          id: postId,
          likesCount: (data?.feed.find(p => p.id === postId)?.likesCount || 0) + 1,
          isLiked: true,
        },
      },
    })
  }

  return (
    <div>
      <CreatePostForm onSubmit={createPost} />
      {data?.feed.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => handleLike(post.id)}
        />
      ))}
    </div>
  )
}
```

### Dance Bond Request

```typescript
import { useCreateDanceBondMutation } from '@/generated/graphql'

function UserProfile({ user }) {
  const [createBond, { loading }] = useCreateDanceBondMutation()

  const handleConnect = async () => {
    await createBond({
      variables: { userId: user.privyId },
      refetchQueries: ['GetMyDanceBonds'],
    })
  }

  return (
    <div>
      <h2>{user.displayName}</h2>
      <button onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting...' : 'Create Dance Bond'}
      </button>
    </div>
  )
}
```

## Next Steps

- [Users API](/api/users) - User profiles
- [Events API](/api/events) - Event management
- [Database: Social](/database/social) - Social tables schema

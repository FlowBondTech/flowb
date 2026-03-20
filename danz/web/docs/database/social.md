# Social Database

Database documentation for social features: dance bonds, feed posts, and notifications.

## Dance Bonds Table

Social connections between dancers with relationship levels.

### Table Structure

```sql
CREATE TABLE public.dance_bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  user2_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  bond_level INTEGER DEFAULT 1,
  shared_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)  -- Ensures consistent ordering
);
```

### Column Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated unique identifier |
| `user1_id` | TEXT | First user (alphabetically lower ID) |
| `user2_id` | TEXT | Second user (alphabetically higher ID) |
| `bond_level` | INTEGER | Relationship strength (1-100) |
| `shared_sessions` | INTEGER | Count of shared activities |
| `created_at` | TIMESTAMPTZ | Bond creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last activity timestamp |

### Bond Level System

```
┌────────────────────────────────────────────────────────────────────┐
│                      BOND LEVEL TIERS                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1-10:   ACQUAINTANCE  │  Just connected                         │
│  11-30:  FRIEND        │  Some shared activities                 │
│  31-60:  CLOSE FRIEND  │  Regular dance partners                 │
│  61-90:  DANCE PARTNER │  Strong connection                      │
│  91-100: SOUL MATE     │  Legendary bond                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Bond XP System

| Activity | Bond Level Increase |
|----------|---------------------|
| Create bond | +1 level |
| Attend same event | +2 levels |
| Message exchange | +1 level |
| Shared achievement | +3 levels |
| Dance together (check-in) | +5 levels |

### Constraints

```sql
-- Level range
CONSTRAINT valid_bond_level CHECK (bond_level >= 1 AND bond_level <= 100)

-- Consistent user ordering (prevents duplicates)
CONSTRAINT ordered_users CHECK (user1_id < user2_id)

-- Unique bond per user pair
CONSTRAINT unique_bond UNIQUE(user1_id, user2_id)

-- No self-bonds
CONSTRAINT no_self_bond CHECK (user1_id != user2_id)
```

### Indexes

```sql
-- User's bonds lookup
CREATE INDEX idx_bonds_user1 ON dance_bonds(user1_id);
CREATE INDEX idx_bonds_user2 ON dance_bonds(user2_id);

-- Bond level filtering
CREATE INDEX idx_bonds_level ON dance_bonds(bond_level DESC);

-- Recent activity
CREATE INDEX idx_bonds_updated ON dance_bonds(updated_at DESC);
```

---

## Feed Posts Table

Social feed with media support and engagement tracking.

### Table Structure

```sql
CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[],
  media_type TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  post_type TEXT DEFAULT 'post',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Column Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated unique identifier |
| `user_id` | TEXT | Post author |
| `content` | TEXT | Post text content |
| `media_urls` | TEXT[] | Array of media URLs |
| `media_type` | TEXT | `image`, `video`, `mixed` |
| `likes_count` | INTEGER | Cached like count |
| `comments_count` | INTEGER | Cached comment count |
| `shares_count` | INTEGER | Cached share count |
| `post_type` | TEXT | Post category |
| `is_public` | BOOLEAN | Visibility setting |

### Post Types

| Type | Description | Auto-Generated |
|------|-------------|----------------|
| `post` | Regular user post | No |
| `achievement` | Achievement unlock post | Yes |
| `event` | Event-related post | No |
| `challenge` | Challenge completion | Yes |

### Supporting Tables

#### Post Likes

```sql
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(post_id, user_id)
);
```

#### Post Comments

```sql
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
-- User's posts
CREATE INDEX idx_posts_user ON feed_posts(user_id);

-- Feed timeline
CREATE INDEX idx_posts_created ON feed_posts(created_at DESC);

-- Public posts only
CREATE INDEX idx_posts_public ON feed_posts(created_at DESC)
  WHERE is_public = true;

-- Post type filtering
CREATE INDEX idx_posts_type ON feed_posts(post_type);

-- Likes lookup
CREATE INDEX idx_likes_post ON post_likes(post_id);
CREATE INDEX idx_likes_user ON post_likes(user_id);

-- Comments lookup
CREATE INDEX idx_comments_post ON post_comments(post_id);
```

---

## Notifications Table

User notifications for various system events.

### Table Structure

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Column Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated unique identifier |
| `user_id` | TEXT | Recipient user |
| `type` | TEXT | Notification category |
| `title` | TEXT | Notification title |
| `message` | TEXT | Notification body |
| `data` | JSONB | Additional structured data |
| `is_read` | BOOLEAN | Read status |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Notification Types

| Type | Description | Example Title |
|------|-------------|---------------|
| `achievement` | Achievement unlocked | "Achievement Unlocked!" |
| `event` | Event reminders/updates | "Event Reminder" |
| `social` | Social interactions | "New Dance Bond" |
| `system` | System announcements | "New Feature Available" |
| `reward` | XP/token rewards | "XP Earned!" |

### Data Structure Examples

```typescript
// Achievement notification
{
  type: 'achievement',
  title: 'Achievement Unlocked!',
  message: 'You earned "Regular Dancer"',
  data: {
    achievementType: 'regular_dancer',
    xpReward: 500,
    icon: 'trophy'
  }
}

// Event notification
{
  type: 'event',
  title: 'Event Reminder',
  message: 'Salsa Night starts in 1 hour',
  data: {
    eventId: 'uuid-here',
    eventTitle: 'Salsa Night',
    startTime: '2024-01-15T19:00:00Z'
  }
}

// Social notification
{
  type: 'social',
  title: 'New Dance Bond',
  message: 'Jane Doe connected with you',
  data: {
    userId: 'did:privy:abc',
    userName: 'Jane Doe',
    avatarUrl: 'https://...'
  }
}

// Reward notification
{
  type: 'reward',
  title: 'XP Earned!',
  message: 'You earned 100 XP for attending Salsa Night',
  data: {
    xpAmount: 100,
    source: 'event_attendance',
    eventId: 'uuid-here'
  }
}
```

### Indexes

```sql
-- User notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- Type filtering
CREATE INDEX idx_notifications_type ON notifications(type);

-- Recent notifications
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

---

## Common Queries

### Get User's Dance Bonds

```sql
SELECT
  b.id,
  b.bond_level,
  b.shared_sessions,
  b.created_at,
  b.updated_at,
  u.privy_id,
  u.display_name,
  u.avatar_url,
  u.city,
  u.dance_styles
FROM dance_bonds b
JOIN users u ON (
  CASE
    WHEN b.user1_id = $1 THEN b.user2_id
    ELSE b.user1_id
  END = u.privy_id
)
WHERE b.user1_id = $1 OR b.user2_id = $1
ORDER BY b.bond_level DESC, b.updated_at DESC
LIMIT $2 OFFSET $3;
```

### Check Bond Between Users

```sql
SELECT
  id,
  bond_level,
  shared_sessions,
  created_at
FROM dance_bonds
WHERE (user1_id = LEAST($1, $2) AND user2_id = GREATEST($1, $2));
```

### Create Dance Bond

```sql
INSERT INTO dance_bonds (user1_id, user2_id, bond_level)
VALUES (LEAST($1, $2), GREATEST($1, $2), 1)
ON CONFLICT (user1_id, user2_id) DO NOTHING
RETURNING *;
```

### Get Social Feed

```sql
-- Following feed (posts from dance bonds)
SELECT
  p.id,
  p.content,
  p.media_urls,
  p.media_type,
  p.likes_count,
  p.comments_count,
  p.post_type,
  p.created_at,
  u.privy_id as user_id,
  u.display_name,
  u.avatar_url,
  EXISTS(
    SELECT 1 FROM post_likes
    WHERE post_id = p.id AND user_id = $1
  ) as is_liked
FROM feed_posts p
JOIN users u ON p.user_id = u.privy_id
WHERE p.is_public = true
  AND (
    p.user_id = $1
    OR EXISTS (
      SELECT 1 FROM dance_bonds
      WHERE (user1_id = $1 AND user2_id = p.user_id)
         OR (user2_id = $1 AND user1_id = p.user_id)
    )
  )
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;
```

### Like Post

```sql
-- Insert like
INSERT INTO post_likes (post_id, user_id)
VALUES ($1, $2)
ON CONFLICT (post_id, user_id) DO NOTHING;

-- Update count
UPDATE feed_posts
SET likes_count = (
  SELECT COUNT(*) FROM post_likes WHERE post_id = $1
)
WHERE id = $1;
```

### Get User Notifications

```sql
SELECT
  id,
  type,
  title,
  message,
  data,
  is_read,
  created_at
FROM notifications
WHERE user_id = $1
  AND ($2::boolean IS NULL OR is_read = $2)
ORDER BY created_at DESC
LIMIT $3;
```

### Mark Notifications Read

```sql
-- Single notification
UPDATE notifications
SET is_read = true
WHERE id = $1 AND user_id = $2;

-- All notifications
UPDATE notifications
SET is_read = true
WHERE user_id = $1 AND is_read = false;
```

### Get Suggested Bonds

```sql
SELECT
  u.privy_id,
  u.display_name,
  u.avatar_url,
  u.city,
  u.dance_styles,
  CASE
    WHEN u.city = (SELECT city FROM users WHERE privy_id = $1) THEN 'Same city'
    WHEN u.dance_styles && (SELECT dance_styles FROM users WHERE privy_id = $1) THEN 'Similar dance styles'
    ELSE 'Suggested for you'
  END as reason,
  (
    SELECT COUNT(*) FROM dance_bonds b1
    JOIN dance_bonds b2 ON (
      (b1.user1_id = b2.user1_id OR b1.user1_id = b2.user2_id OR
       b1.user2_id = b2.user1_id OR b1.user2_id = b2.user2_id)
      AND NOT (b1.user1_id = b2.user1_id AND b1.user2_id = b2.user2_id)
    )
    WHERE (b1.user1_id = $1 OR b1.user2_id = $1)
      AND (b2.user1_id = u.privy_id OR b2.user2_id = u.privy_id)
  ) as mutual_bonds
FROM users u
WHERE u.privy_id != $1
  AND u.is_public = true
  AND NOT EXISTS (
    SELECT 1 FROM dance_bonds
    WHERE (user1_id = LEAST($1, u.privy_id) AND user2_id = GREATEST($1, u.privy_id))
  )
ORDER BY
  CASE WHEN u.city = (SELECT city FROM users WHERE privy_id = $1) THEN 0 ELSE 1 END,
  mutual_bonds DESC
LIMIT $2;
```

---

## Triggers

### Update Bond User Counts

```sql
CREATE OR REPLACE FUNCTION update_user_bond_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET dance_bonds_count = dance_bonds_count + 1
    WHERE privy_id IN (NEW.user1_id, NEW.user2_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET dance_bonds_count = dance_bonds_count - 1
    WHERE privy_id IN (OLD.user1_id, OLD.user2_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bond_counts
  AFTER INSERT OR DELETE ON dance_bonds
  FOR EACH ROW
  EXECUTE FUNCTION update_user_bond_count();
```

### Create Bond Notification

```sql
CREATE OR REPLACE FUNCTION notify_new_bond()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify both users
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES
    (NEW.user1_id, 'social', 'New Dance Bond',
     (SELECT display_name FROM users WHERE privy_id = NEW.user2_id) || ' connected with you',
     jsonb_build_object('userId', NEW.user2_id, 'bondId', NEW.id)),
    (NEW.user2_id, 'social', 'New Dance Bond',
     (SELECT display_name FROM users WHERE privy_id = NEW.user1_id) || ' connected with you',
     jsonb_build_object('userId', NEW.user1_id, 'bondId', NEW.id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_bond_create
  AFTER INSERT ON dance_bonds
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_bond();
```

### Update Post Counts

```sql
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();
```

---

## Row Level Security (RLS)

```sql
-- Dance Bonds
ALTER TABLE dance_bonds ENABLE ROW LEVEL SECURITY;

-- Users can see bonds they're part of
CREATE POLICY bonds_select_own ON dance_bonds
  FOR SELECT
  USING (
    user1_id = current_setting('app.user_id') OR
    user2_id = current_setting('app.user_id')
  );

-- Feed Posts
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Public posts visible to all
CREATE POLICY posts_select_public ON feed_posts
  FOR SELECT
  USING (is_public = true);

-- Own posts always visible
CREATE POLICY posts_select_own ON feed_posts
  FOR SELECT
  USING (user_id = current_setting('app.user_id'));

-- Update/delete own posts only
CREATE POLICY posts_modify_own ON feed_posts
  FOR ALL
  USING (user_id = current_setting('app.user_id'));

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (user_id = current_setting('app.user_id'));
```

---

## TypeScript Types

```typescript
interface DanceBond {
  id: string
  user1Id: string
  user2Id: string
  bondLevel: number
  sharedSessions: number
  createdAt: Date
  updatedAt: Date

  // Computed
  otherUser?: User
  tier?: BondTier
}

type BondTier =
  | 'acquaintance'  // 1-10
  | 'friend'        // 11-30
  | 'close_friend'  // 31-60
  | 'dance_partner' // 61-90
  | 'soul_mate'     // 91-100

interface FeedPost {
  id: string
  userId: string
  content: string
  mediaUrls: string[]
  mediaType: 'image' | 'video' | 'mixed' | null
  likesCount: number
  commentsCount: number
  sharesCount: number
  postType: 'post' | 'achievement' | 'event' | 'challenge'
  isPublic: boolean
  createdAt: Date
  updatedAt: Date

  // Relations
  user?: User
  isLiked?: boolean
}

interface PostComment {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date

  // Relations
  user?: User
}

interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string | null
  data: Record<string, any> | null
  isRead: boolean
  createdAt: Date
}

type NotificationType =
  | 'achievement'
  | 'event'
  | 'social'
  | 'system'
  | 'reward'
```

## Next Steps

- [Users Database](/database/users) - User profiles and subscriptions
- [Events Database](/database/events) - Events and registrations
- [Database Indexes](/database/indexes) - Performance optimization

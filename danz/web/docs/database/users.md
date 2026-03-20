# Users Database

Comprehensive documentation for user-related database tables and operations.

## Users Table

The core user table stores profile data, gamification stats, subscription info, and organizer details.

### Table Structure

```sql
CREATE TABLE public.users (
  -- Primary Key (Privy DID)
  privy_id TEXT PRIMARY KEY,

  -- Profile Information
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,

  -- Location Data
  location TEXT,
  city TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),

  -- Social Links
  website TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  twitter TEXT,

  -- Dance Information
  dance_styles TEXT[],
  skill_level TEXT,
  favorite_music TEXT[],

  -- Demographics
  age INTEGER,
  pronouns TEXT,

  -- Privacy Settings
  is_public BOOLEAN DEFAULT true,
  allow_messages BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT true,
  notification_preferences JSONB,

  -- Gamification
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,

  -- Statistics
  total_dance_time INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_events_attended INTEGER DEFAULT 0,
  total_events_created INTEGER DEFAULT 0,
  upcoming_events_count INTEGER DEFAULT 0,
  total_achievements INTEGER DEFAULT 0,
  dance_bonds_count INTEGER DEFAULT 0,

  -- Role & Permissions
  role TEXT DEFAULT 'user',
  is_organizer_approved BOOLEAN DEFAULT false,
  organizer_approved_by TEXT,
  organizer_approved_at TIMESTAMPTZ,
  organizer_requested_at TIMESTAMPTZ,
  organizer_rejection_reason TEXT,

  -- Organizer Details
  company_name VARCHAR(255),
  event_types TEXT[],
  organizer_bio TEXT,

  -- Subscription (Stripe)
  subscription_tier TEXT DEFAULT 'free',
  is_premium TEXT DEFAULT 'inactive',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_plan TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  subscription_cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Referral
  invited_by VARCHAR(255),
  social_media_links JSONB DEFAULT '{}',
  website_url VARCHAR(500)
);
```

### Column Details

#### Identity Columns

| Column | Type | Description |
|--------|------|-------------|
| `privy_id` | TEXT | Primary key from Privy authentication (DID format) |
| `username` | TEXT | Unique username, 3-30 chars, alphanumeric + underscore |
| `display_name` | TEXT | Display name shown in UI |

#### Profile Columns

| Column | Type | Description |
|--------|------|-------------|
| `bio` | TEXT | User biography/description |
| `avatar_url` | TEXT | S3 URL for profile image |
| `cover_image_url` | TEXT | S3 URL for cover/banner image |

#### Location Columns

| Column | Type | Description |
|--------|------|-------------|
| `location` | TEXT | Free-text location description |
| `city` | TEXT | City name for filtering |
| `latitude` | NUMERIC(10,8) | GPS latitude |
| `longitude` | NUMERIC(11,8) | GPS longitude |

#### Dance Information

| Column | Type | Description |
|--------|------|-------------|
| `dance_styles` | TEXT[] | Array of dance style tags |
| `skill_level` | TEXT | `all`, `beginner`, `intermediate`, `advanced` |
| `favorite_music` | TEXT[] | Array of music genre tags |

#### Role System

| Value | Description | Permissions |
|-------|-------------|-------------|
| `user` | Standard user | View events, register, create bonds |
| `organizer` | Event creator | All user permissions + create/manage events |
| `manager` | Platform manager | All organizer + approve organizers |
| `admin` | Administrator | Full system access |

#### Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| `free` | $0 | Basic access, limited events |
| `mover` | $9.99/mo | Priority registration, profile badge |
| `groover` | $19.99/mo | All mover + exclusive events |
| `legend` | $49.99/mo | All groover + VIP access |

### Constraints

```sql
-- Username validation
CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')

-- Age range
CONSTRAINT valid_age CHECK (age >= 13 AND age <= 120)

-- Skill level enum
CONSTRAINT valid_skill_level CHECK (
  skill_level IN ('all', 'beginner', 'intermediate', 'advanced')
)

-- Role enum
CONSTRAINT valid_role CHECK (
  role IN ('user', 'manager', 'admin', 'organizer')
)

-- Subscription tier enum
CONSTRAINT valid_subscription_tier CHECK (
  subscription_tier IN ('free', 'mover', 'groover', 'legend')
)

-- Subscription plan enum
CONSTRAINT valid_subscription_plan CHECK (
  subscription_plan IN ('monthly', 'yearly')
)
```

### Indexes

```sql
-- Username lookup
CREATE INDEX idx_users_username ON users(username);

-- City-based filtering
CREATE INDEX idx_users_city ON users(city);

-- Dance style filtering (GIN for array contains)
CREATE INDEX idx_users_dance_styles ON users USING GIN(dance_styles);

-- Role filtering
CREATE INDEX idx_users_role ON users(role);

-- Leaderboard queries
CREATE INDEX idx_users_xp ON users(xp DESC);

-- Stripe customer lookup
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
```

---

## Subscription History Table

Tracks billing events and subscription changes.

### Table Structure

```sql
CREATE TABLE public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  plan TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Event Types

| Event | Description | Trigger |
|-------|-------------|---------|
| `created` | Subscription created | New subscriber |
| `updated` | Subscription modified | Plan change |
| `cancelled` | Subscription cancelled | User cancellation |
| `reactivated` | Subscription resumed | Resume after cancel |
| `payment_failed` | Payment failed | Stripe webhook |
| `payment_succeeded` | Payment processed | Stripe webhook |

### Example Records

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "did:privy:abc123",
  "stripe_subscription_id": "sub_1234567890",
  "status": "active",
  "plan": "monthly",
  "event_type": "created",
  "metadata": {
    "tier": "mover",
    "amount": 999,
    "currency": "usd"
  }
}
```

---

## Common Queries

### Get User Profile

```sql
SELECT
  privy_id,
  username,
  display_name,
  avatar_url,
  bio,
  dance_styles,
  skill_level,
  xp,
  level,
  subscription_tier,
  total_events_attended,
  dance_bonds_count
FROM users
WHERE privy_id = $1;
```

### Search Users by Dance Style

```sql
SELECT
  privy_id,
  username,
  display_name,
  avatar_url,
  city,
  dance_styles,
  skill_level
FROM users
WHERE $1 = ANY(dance_styles)
  AND is_public = true
ORDER BY xp DESC
LIMIT 20 OFFSET $2;
```

### Get Leaderboard

```sql
SELECT
  privy_id,
  display_name,
  avatar_url,
  xp,
  level,
  total_achievements,
  ROW_NUMBER() OVER (ORDER BY xp DESC) as rank
FROM users
WHERE is_public = true
ORDER BY xp DESC
LIMIT $1;
```

### Update User Stats After Event

```sql
UPDATE users
SET
  total_events_attended = total_events_attended + 1,
  xp = xp + $2,
  level = CASE
    WHEN xp + $2 >= (SELECT threshold FROM level_thresholds WHERE level = users.level + 1)
    THEN level + 1
    ELSE level
  END,
  updated_at = NOW()
WHERE privy_id = $1;
```

### Check Username Availability

```sql
SELECT EXISTS(
  SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)
) as is_taken;
```

---

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Public profile viewing
CREATE POLICY users_select_public ON users
  FOR SELECT
  USING (is_public = true);

-- Own profile full access
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (privy_id = current_setting('app.user_id'));

-- Update own profile only
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (privy_id = current_setting('app.user_id'));

-- Admin full access
CREATE POLICY users_admin_all ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = current_setting('app.user_id')
      AND role = 'admin'
    )
  );
```

---

## Triggers

### Update Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### XP Level Up Trigger

```sql
CREATE OR REPLACE FUNCTION check_level_up()
RETURNS TRIGGER AS $$
DECLARE
  new_level INTEGER;
BEGIN
  -- Calculate level from XP
  SELECT level INTO new_level
  FROM level_thresholds
  WHERE threshold <= NEW.xp
  ORDER BY level DESC
  LIMIT 1;

  IF new_level > OLD.level THEN
    NEW.level = new_level;
    -- Could trigger notification here
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_check_level_up
  BEFORE UPDATE OF xp ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_level_up();
```

---

## TypeScript Types

```typescript
interface User {
  privyId: string
  username: string | null
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  coverImageUrl: string | null

  // Location
  location: string | null
  city: string | null
  latitude: number | null
  longitude: number | null

  // Social
  website: string | null
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  twitter: string | null

  // Dance
  danceStyles: string[]
  skillLevel: 'all' | 'beginner' | 'intermediate' | 'advanced' | null
  favoriteMusic: string[]

  // Demographics
  age: number | null
  pronouns: string | null

  // Privacy
  isPublic: boolean
  allowMessages: boolean
  showLocation: boolean
  notificationPreferences: {
    push: boolean
    email: boolean
    dance_reminders: boolean
  }

  // Gamification
  xp: number
  level: number

  // Stats
  totalDanceTime: number
  totalSessions: number
  longestStreak: number
  totalEventsAttended: number
  totalEventsCreated: number
  upcomingEventsCount: number
  totalAchievements: number
  danceBondsCount: number

  // Role
  role: 'user' | 'organizer' | 'manager' | 'admin'
  isOrganizerApproved: boolean

  // Subscription
  subscriptionTier: 'free' | 'mover' | 'groover' | 'legend'
  isPremium: string
  stripeCustomerId: string | null
  subscriptionStatus: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
  lastActiveAt: Date | null
}
```

## Next Steps

- [Events Database](/database/events) - Events and registrations
- [Social Database](/database/social) - Bonds, posts, notifications
- [Database Indexes](/database/indexes) - Performance optimization

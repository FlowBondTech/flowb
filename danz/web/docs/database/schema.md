# Database Schema

Complete PostgreSQL database schema for the DANZ platform, hosted on Supabase.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DANZ DATABASE SCHEMA                            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   USERS     │────────▶│   EVENTS    │◀────────│REGISTRATIONS│
│             │         │             │         │             │
│ privy_id PK │         │ id PK       │         │ id PK       │
│ username    │◀────────│facilitator_id│        │ event_id FK │
│ display_name│         │ title       │         │ user_id FK  │
│ bio         │         │ description │         │ status      │
│ avatar_url  │         │ category    │         │ payment_*   │
│ xp          │         │ start_date  │         └─────────────┘
│ level       │         │ location_*  │
│ role        │         │ price_*     │
│ stripe_*    │         │ capacity    │
└──────┬──────┘         └─────────────┘
       │
       │         ┌─────────────┐         ┌─────────────┐
       ├────────▶│ACHIEVEMENTS │         │ DANCE_BONDS │
       │         │             │         │             │
       │         │ id PK       │         │ id PK       │
       │         │ user_id FK  │◀────────│ user1_id FK │
       │         │ type        │         │ user2_id FK │
       │         │ title       │         │ bond_level  │
       │         │ xp_reward   │         │ sessions    │
       │         └─────────────┘         └─────────────┘
       │
       │         ┌─────────────┐         ┌─────────────┐
       ├────────▶│ FEED_POSTS  │         │NOTIFICATIONS│
       │         │             │         │             │
       │         │ id PK       │         │ id PK       │
       │         │ user_id FK  │◀────────│ user_id FK  │
       │         │ content     │         │ type        │
       │         │ media_urls  │         │ title       │
       │         │ likes_count │         │ is_read     │
       │         └─────────────┘         └─────────────┘
       │
       └────────▶┌─────────────┐
                 │SUBSCRIPTION │
                 │  _HISTORY   │
                 │ id PK       │
                 │ user_id FK  │
                 │ status      │
                 │ event_type  │
                 └─────────────┘
```

## Tables Overview

| Table | Description | Primary Key | Foreign Keys |
|-------|-------------|-------------|--------------|
| `users` | User profiles and subscriptions | `privy_id` | - |
| `events` | Dance events | `id` (uuid) | `facilitator_id` |
| `event_registrations` | Event signups | `id` (uuid) | `event_id`, `user_id` |
| `achievements` | Unlocked achievements | `id` (uuid) | `user_id` |
| `dance_bonds` | Social connections | `id` (uuid) | `user1_id`, `user2_id` |
| `feed_posts` | Social feed posts | `id` (uuid) | `user_id` |
| `notifications` | User notifications | `id` (uuid) | `user_id` |
| `subscription_history` | Billing history | `id` (uuid) | `user_id` |

## Detailed Table Schemas

### Users Table

The core user table with profile, stats, and subscription data.

```sql
CREATE TABLE public.users (
  -- Primary Key
  privy_id TEXT PRIMARY KEY,

  -- Profile
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,

  -- Location
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

  -- Dance Info
  dance_styles TEXT[],
  skill_level TEXT CHECK (skill_level IN ('all', 'beginner', 'intermediate', 'advanced')),
  favorite_music TEXT[],

  -- Demographics
  age INTEGER CHECK (age >= 13 AND age <= 120),
  pronouns TEXT,

  -- Privacy Settings
  is_public BOOLEAN DEFAULT true,
  allow_messages BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{"push": true, "email": true, "dance_reminders": true}',

  -- Gamification
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,

  -- Stats
  total_dance_time INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_events_attended INTEGER DEFAULT 0,
  total_events_created INTEGER DEFAULT 0,
  upcoming_events_count INTEGER DEFAULT 0,
  total_achievements INTEGER DEFAULT 0,
  dance_bonds_count INTEGER DEFAULT 0,

  -- Role & Organizer
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin', 'organizer')),
  is_organizer_approved BOOLEAN DEFAULT false,
  organizer_approved_by TEXT REFERENCES users(privy_id),
  organizer_approved_at TIMESTAMPTZ,
  organizer_requested_at TIMESTAMPTZ,
  organizer_rejection_reason TEXT,
  company_name VARCHAR(255),
  event_types TEXT[],
  organizer_bio TEXT,

  -- Subscription (Stripe)
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'mover', 'groover', 'legend')),
  is_premium TEXT DEFAULT 'inactive',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_plan TEXT CHECK (subscription_plan IN ('monthly', 'yearly')),
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
  website_url VARCHAR(500),

  -- Constraints
  CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);
```

#### Key Indexes

```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_dance_styles ON users USING GIN(dance_styles);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_xp ON users(xp DESC);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
```

---

### Events Table

Dance events with location, pricing, and capacity.

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN (
    'salsa', 'hip-hop', 'contemporary', 'ballet', 'jazz',
    'ballroom', 'street', 'cultural', 'fitness', 'class',
    'social', 'battle', 'workshop', 'performance', 'other'
  )),
  image_url TEXT,

  -- Location
  location_name TEXT NOT NULL,
  location_address TEXT,
  location_city TEXT,
  location_latitude NUMERIC(10, 8),
  location_longitude NUMERIC(11, 8),
  is_virtual BOOLEAN DEFAULT false,
  virtual_link TEXT,

  -- Organizer
  facilitator_id TEXT REFERENCES users(privy_id) ON DELETE SET NULL,

  -- Capacity
  max_capacity INTEGER DEFAULT 50,
  current_capacity INTEGER DEFAULT 0,

  -- Pricing
  price_usd NUMERIC(10, 2),
  price_danz NUMERIC(20, 2),
  currency TEXT DEFAULT 'USD',

  -- Scheduling
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,

  -- Metadata
  skill_level TEXT DEFAULT 'all',
  requirements TEXT,
  tags TEXT[],
  dance_styles TEXT[],
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT events_date_time_check CHECK (end_date_time > start_date_time)
);
```

---

### Event Registrations Table

Tracks user signups for events with payment status.

```sql
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'registered' CHECK (status IN (
    'registered', 'waitlisted', 'cancelled', 'attended', 'no-show'
  )),

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'refunded', 'free'
  )),
  payment_amount NUMERIC(10, 2),
  payment_date TIMESTAMPTZ,

  -- Check-in
  checked_in BOOLEAN DEFAULT false,
  check_in_time TIMESTAMPTZ,

  -- Notes
  user_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(event_id, user_id)
);
```

---

### Achievements Table

User achievements and rewards.

```sql
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  danz_reward NUMERIC(20, 2) DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, achievement_type)
);
```

---

### Dance Bonds Table

Social connections between dancers.

```sql
CREATE TABLE public.dance_bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  user2_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  bond_level INTEGER DEFAULT 1 CHECK (bond_level >= 1 AND bond_level <= 100),
  shared_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)  -- Ensures consistent ordering
);
```

---

### Feed Posts Table

Social feed with media support.

```sql
CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[],
  media_type TEXT CHECK (media_type IN ('image', 'video', 'mixed')),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  post_type TEXT DEFAULT 'post' CHECK (post_type IN (
    'post', 'achievement', 'event', 'challenge'
  )),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

### Notifications Table

User notifications.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(privy_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'achievement', 'event', 'social', 'system', 'reward'
  )),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

### Subscription History Table

Billing event history.

```sql
CREATE TABLE public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  plan TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'updated', 'cancelled', 'reactivated',
    'payment_failed', 'payment_succeeded'
  )),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## Database Functions

### Update Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Event Capacity Trigger

```sql
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'registered' THEN
    UPDATE events SET current_capacity = current_capacity + 1
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'registered' THEN
    UPDATE events SET current_capacity = current_capacity - 1
    WHERE id = OLD.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'registered' AND NEW.status != 'registered' THEN
      UPDATE events SET current_capacity = current_capacity - 1
      WHERE id = NEW.event_id;
    ELSIF OLD.status != 'registered' AND NEW.status = 'registered' THEN
      UPDATE events SET current_capacity = current_capacity + 1
      WHERE id = NEW.event_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Next Steps

- [Users Table Details](/database/users) - Full users documentation
- [Events Tables](/database/events) - Events and registrations
- [API Reference](/api/graphql) - GraphQL operations

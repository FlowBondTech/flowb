# Database Indexes

Performance optimization through strategic indexing for the DANZ platform.

## Index Strategy Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                     INDEX STRATEGY MATRIX                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  PRIMARY KEYS     │  UUID or TEXT (Privy ID)                      │
│  FOREIGN KEYS     │  Auto-indexed for joins                       │
│  SEARCH COLUMNS   │  B-tree for equality, GIN for arrays         │
│  TIME COLUMNS     │  B-tree with DESC for recent-first           │
│  BOOLEAN FLAGS    │  Partial indexes for filtered queries        │
│  TEXT SEARCH      │  GIN with tsvector for full-text             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Users Table Indexes

### Primary & Unique Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX users_pkey ON users(privy_id);

-- Unique username
CREATE UNIQUE INDEX idx_users_username_unique ON users(username);

-- Unique Stripe customer ID
CREATE UNIQUE INDEX idx_users_stripe_customer_unique ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
```

### Search & Filter Indexes

```sql
-- Username search (case-insensitive)
CREATE INDEX idx_users_username_lower ON users(LOWER(username));

-- City filtering
CREATE INDEX idx_users_city ON users(city);

-- Role filtering
CREATE INDEX idx_users_role ON users(role);

-- Skill level filtering
CREATE INDEX idx_users_skill_level ON users(skill_level);
```

### Array Indexes (GIN)

```sql
-- Dance styles (contains any)
CREATE INDEX idx_users_dance_styles ON users USING GIN(dance_styles);

-- Favorite music (contains any)
CREATE INDEX idx_users_favorite_music ON users USING GIN(favorite_music);

-- Example query using GIN index
-- SELECT * FROM users WHERE dance_styles && ARRAY['salsa', 'bachata'];
```

### Leaderboard Indexes

```sql
-- XP leaderboard (descending)
CREATE INDEX idx_users_xp ON users(xp DESC);

-- Level leaderboard
CREATE INDEX idx_users_level ON users(level DESC, xp DESC);

-- Events attended ranking
CREATE INDEX idx_users_events_attended ON users(total_events_attended DESC);

-- Dance bonds ranking
CREATE INDEX idx_users_bonds_count ON users(dance_bonds_count DESC);
```

### Partial Indexes

```sql
-- Active premium users
CREATE INDEX idx_users_premium ON users(subscription_tier, subscription_status)
  WHERE subscription_status = 'active';

-- Organizers only
CREATE INDEX idx_users_organizers ON users(privy_id)
  WHERE role = 'organizer' AND is_organizer_approved = true;

-- Public profiles only
CREATE INDEX idx_users_public ON users(city, dance_styles)
  WHERE is_public = true;

-- Pending organizer requests
CREATE INDEX idx_users_organizer_pending ON users(organizer_requested_at)
  WHERE role = 'user' AND organizer_requested_at IS NOT NULL;
```

### Composite Indexes

```sql
-- City + skill level search
CREATE INDEX idx_users_city_skill ON users(city, skill_level)
  WHERE is_public = true;

-- Role + active status
CREATE INDEX idx_users_role_active ON users(role, last_active_at DESC);
```

---

## Events Table Indexes

### Primary & Foreign Key Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX events_pkey ON events(id);

-- Facilitator lookup
CREATE INDEX idx_events_facilitator ON events(facilitator_id);
```

### Date/Time Indexes

```sql
-- Upcoming events (most common query)
CREATE INDEX idx_events_start_date ON events(start_date_time);

-- End date for duration calculations
CREATE INDEX idx_events_end_date ON events(end_date_time);

-- Upcoming events partial index
CREATE INDEX idx_events_upcoming ON events(start_date_time)
  WHERE start_date_time > NOW();

-- Past events for history
CREATE INDEX idx_events_past ON events(start_date_time DESC)
  WHERE start_date_time < NOW();
```

### Filter Indexes

```sql
-- Category filtering
CREATE INDEX idx_events_category ON events(category);

-- City filtering
CREATE INDEX idx_events_city ON events(location_city);

-- Virtual event filtering
CREATE INDEX idx_events_virtual ON events(is_virtual);

-- Skill level filtering
CREATE INDEX idx_events_skill_level ON events(skill_level);
```

### Feature Indexes

```sql
-- Featured events
CREATE INDEX idx_events_featured ON events(start_date_time)
  WHERE is_featured = true AND start_date_time > NOW();

-- Free events
CREATE INDEX idx_events_free ON events(start_date_time)
  WHERE price_usd IS NULL OR price_usd = 0;

-- Events with spots available
CREATE INDEX idx_events_available ON events(start_date_time)
  WHERE current_capacity < max_capacity AND start_date_time > NOW();
```

### Array Indexes

```sql
-- Dance styles filtering
CREATE INDEX idx_events_dance_styles ON events USING GIN(dance_styles);

-- Tags filtering
CREATE INDEX idx_events_tags ON events USING GIN(tags);
```

### Composite Indexes

```sql
-- City + date (common filter combo)
CREATE INDEX idx_events_city_date ON events(location_city, start_date_time)
  WHERE start_date_time > NOW();

-- Category + date
CREATE INDEX idx_events_category_date ON events(category, start_date_time)
  WHERE start_date_time > NOW();

-- Facilitator + date (organizer's events)
CREATE INDEX idx_events_facilitator_date ON events(facilitator_id, start_date_time DESC);
```

### Geographic Index

```sql
-- Location-based queries (requires PostGIS)
CREATE INDEX idx_events_location ON events
  USING GIST(ST_MakePoint(location_longitude, location_latitude))
  WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;
```

---

## Event Registrations Indexes

### Primary & Foreign Key Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX event_registrations_pkey ON event_registrations(id);

-- Event lookup
CREATE INDEX idx_registrations_event ON event_registrations(event_id);

-- User lookup
CREATE INDEX idx_registrations_user ON event_registrations(user_id);

-- Unique user per event
CREATE UNIQUE INDEX idx_registrations_unique ON event_registrations(event_id, user_id);
```

### Status Indexes

```sql
-- Registration status filtering
CREATE INDEX idx_registrations_status ON event_registrations(status);

-- Payment status filtering
CREATE INDEX idx_registrations_payment ON event_registrations(payment_status);

-- Check-in status
CREATE INDEX idx_registrations_checkin ON event_registrations(checked_in);
```

### Composite Indexes

```sql
-- Event's registered attendees
CREATE INDEX idx_registrations_event_registered ON event_registrations(event_id)
  WHERE status = 'registered';

-- Event's waitlist
CREATE INDEX idx_registrations_event_waitlist ON event_registrations(event_id, registration_date)
  WHERE status = 'waitlisted';

-- User's upcoming registrations
CREATE INDEX idx_registrations_user_upcoming ON event_registrations(user_id, registration_date DESC)
  WHERE status IN ('registered', 'waitlisted');

-- Pending payments
CREATE INDEX idx_registrations_pending_payment ON event_registrations(event_id)
  WHERE payment_status = 'pending';
```

---

## Social Tables Indexes

### Dance Bonds Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX dance_bonds_pkey ON dance_bonds(id);

-- User pair lookup (unique)
CREATE UNIQUE INDEX idx_bonds_user_pair ON dance_bonds(user1_id, user2_id);

-- Find bonds by either user
CREATE INDEX idx_bonds_user1 ON dance_bonds(user1_id);
CREATE INDEX idx_bonds_user2 ON dance_bonds(user2_id);

-- Bond level ranking
CREATE INDEX idx_bonds_level ON dance_bonds(bond_level DESC);

-- Recent activity
CREATE INDEX idx_bonds_updated ON dance_bonds(updated_at DESC);

-- Strong bonds only (for suggestions)
CREATE INDEX idx_bonds_strong ON dance_bonds(bond_level)
  WHERE bond_level >= 30;
```

### Feed Posts Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX feed_posts_pkey ON feed_posts(id);

-- User's posts
CREATE INDEX idx_posts_user ON feed_posts(user_id);

-- Feed timeline
CREATE INDEX idx_posts_timeline ON feed_posts(created_at DESC);

-- Public feed
CREATE INDEX idx_posts_public_timeline ON feed_posts(created_at DESC)
  WHERE is_public = true;

-- Post type filtering
CREATE INDEX idx_posts_type ON feed_posts(post_type, created_at DESC);

-- Popular posts (for trending)
CREATE INDEX idx_posts_popular ON feed_posts(likes_count DESC, created_at DESC)
  WHERE is_public = true AND created_at > NOW() - INTERVAL '7 days';
```

### Post Likes Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX post_likes_pkey ON post_likes(id);

-- Unique like per user per post
CREATE UNIQUE INDEX idx_likes_unique ON post_likes(post_id, user_id);

-- Post's likes
CREATE INDEX idx_likes_post ON post_likes(post_id);

-- User's likes
CREATE INDEX idx_likes_user ON post_likes(user_id);
```

### Post Comments Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX post_comments_pkey ON post_comments(id);

-- Post's comments
CREATE INDEX idx_comments_post ON post_comments(post_id, created_at);

-- User's comments
CREATE INDEX idx_comments_user ON post_comments(user_id);
```

### Notifications Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX notifications_pkey ON notifications(id);

-- User's notifications (with recent first)
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Unread notifications only
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- Type filtering
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);
```

---

## Achievements Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX achievements_pkey ON achievements(id);

-- User's achievements
CREATE INDEX idx_achievements_user ON achievements(user_id);

-- Unique achievement per user
CREATE UNIQUE INDEX idx_achievements_unique ON achievements(user_id, achievement_type);

-- Recent achievements (for feed)
CREATE INDEX idx_achievements_recent ON achievements(unlocked_at DESC);
```

---

## Subscription History Indexes

```sql
-- Primary key (auto-created)
CREATE UNIQUE INDEX subscription_history_pkey ON subscription_history(id);

-- User's history
CREATE INDEX idx_sub_history_user ON subscription_history(user_id, created_at DESC);

-- Event type filtering
CREATE INDEX idx_sub_history_event ON subscription_history(event_type, created_at DESC);

-- Stripe subscription lookup
CREATE INDEX idx_sub_history_stripe ON subscription_history(stripe_subscription_id);
```

---

## Index Performance Guidelines

### When to Use B-tree (Default)

- Equality comparisons (`=`)
- Range queries (`<`, `>`, `BETWEEN`)
- Sorting (`ORDER BY`)
- Pattern matching (`LIKE 'prefix%'`)

### When to Use GIN

- Array contains (`&&`, `@>`, `<@`)
- JSONB queries
- Full-text search (`@@`)

### When to Use Partial Indexes

- Queries always filter by a specific value
- Large tables with small active subsets
- Boolean flags where one value is much more common

```sql
-- Good: Most queries are for upcoming events
CREATE INDEX idx_events_upcoming ON events(start_date_time)
  WHERE start_date_time > NOW();

-- Good: Most queries are for public profiles
CREATE INDEX idx_users_public ON users(city)
  WHERE is_public = true;
```

### When to Use Composite Indexes

- Multiple columns frequently queried together
- Column order matters: high selectivity first
- Can serve multiple queries (leftmost prefix)

```sql
-- This index serves both queries:
-- 1. WHERE city = 'NYC' AND skill_level = 'advanced'
-- 2. WHERE city = 'NYC'
CREATE INDEX idx_users_city_skill ON users(city, skill_level);
```

---

## Monitoring & Maintenance

### Check Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Find Unused Indexes

```sql
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan AS scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Check Index Sizes

```sql
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

### Reindex After Major Changes

```sql
-- Reindex specific table
REINDEX TABLE users;

-- Reindex entire database (maintenance window)
REINDEX DATABASE danz;

-- Concurrent reindex (less locking)
REINDEX TABLE CONCURRENTLY users;
```

### Analyze Tables

```sql
-- Update statistics for query planner
ANALYZE users;
ANALYZE events;
ANALYZE event_registrations;

-- Or all tables
ANALYZE;
```

---

## Index Creation Tips

::: tip Index Naming Convention
Follow pattern: `idx_[table]_[columns]_[optional_suffix]`
- `idx_users_city`
- `idx_events_start_date`
- `idx_registrations_event_status`
:::

::: warning Concurrent Index Creation
For production systems, always create indexes concurrently to avoid locking:
```sql
CREATE INDEX CONCURRENTLY idx_events_new ON events(new_column);
```
:::

::: danger Index Overhead
Every index:
- Slows down INSERT/UPDATE/DELETE operations
- Consumes disk space
- Requires maintenance

Only create indexes that serve actual query patterns.
:::

## Next Steps

- [Users Database](/database/users) - User table details
- [Events Database](/database/events) - Event tables
- [Social Database](/database/social) - Social tables
- [API Reference](/api/graphql) - GraphQL operations

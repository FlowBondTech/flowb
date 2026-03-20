# Cross-Platform Tables

Database schema for wearables, challenges, activity feed, and other cross-platform features.

## Overview

These tables support the cross-platform experience across:
- Web dashboard
- Mobile app (iOS/Android)
- Telegram miniapp
- Wearable devices

## Wearable Tables

### wearable_devices

Registered smartwatches and fitness trackers.

```sql
CREATE TABLE public.wearable_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    device_type TEXT NOT NULL,  -- APPLE_WATCH, FITBIT, GARMIN, etc.
    device_id TEXT NOT NULL,    -- Unique device identifier
    device_name TEXT,           -- User-friendly name
    device_model TEXT,
    firmware_version TEXT,
    is_primary BOOLEAN DEFAULT false,
    battery_level INTEGER,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- Indexes
CREATE INDEX idx_wearable_devices_user_id ON public.wearable_devices(user_id);
CREATE INDEX idx_wearable_devices_device_type ON public.wearable_devices(device_type);
```

### wearable_health_data

Health metrics from wearable devices.

```sql
CREATE TABLE public.wearable_health_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.wearable_devices(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    heart_rate INTEGER,              -- BPM
    heart_rate_variability FLOAT,    -- HRV in ms
    resting_heart_rate INTEGER,
    steps INTEGER,
    distance_meters FLOAT,
    calories_burned INTEGER,
    active_minutes INTEGER,
    sleep_minutes INTEGER,
    blood_oxygen FLOAT,              -- SpO2 %
    stress_level INTEGER,            -- 0-100
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_wearable_health_user_id ON public.wearable_health_data(user_id);
CREATE INDEX idx_wearable_health_device_id ON public.wearable_health_data(device_id);
CREATE INDEX idx_wearable_health_recorded_at ON public.wearable_health_data(recorded_at);
```

### wearable_motion_data

Real-time motion data during dance sessions.

```sql
CREATE TABLE public.wearable_motion_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.wearable_devices(id) ON DELETE CASCADE,
    dance_session_id UUID,           -- Optional session link
    recorded_at TIMESTAMPTZ NOT NULL,
    accelerometer_x FLOAT,
    accelerometer_y FLOAT,
    accelerometer_z FLOAT,
    gyroscope_x FLOAT,
    gyroscope_y FLOAT,
    gyroscope_z FLOAT,
    motion_intensity FLOAT,          -- 0-100
    movement_type TEXT,              -- Detected dance style
    bpm_detected INTEGER,
    rhythm_accuracy FLOAT,           -- 0-100
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wearable_motion_user_id ON public.wearable_motion_data(user_id);
CREATE INDEX idx_wearable_motion_device_id ON public.wearable_motion_data(device_id);
CREATE INDEX idx_wearable_motion_recorded_at ON public.wearable_motion_data(recorded_at);
```

## Challenge Tables

### challenges

Challenge definitions and configurations.

```sql
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,              -- DAILY, WEEKLY, SPECIAL, EVENT, COMMUNITY
    category TEXT NOT NULL,          -- DANCE_TIME, CALORIES, SESSIONS, etc.
    target_value INTEGER NOT NULL,
    target_unit TEXT,                -- minutes, calories, count
    reward_xp INTEGER DEFAULT 0,
    reward_tokens DECIMAL(18, 8) DEFAULT 0,
    reward_badge_id UUID REFERENCES public.badges(id),
    difficulty TEXT DEFAULT 'medium', -- easy, medium, hard, extreme
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    max_participants INTEGER,
    min_level INTEGER DEFAULT 1,
    required_badge_id UUID,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    recurrence TEXT,                 -- daily, weekly, monthly, none
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_challenges_type ON public.challenges(type);
CREATE INDEX idx_challenges_is_active ON public.challenges(is_active);
CREATE INDEX idx_challenges_starts_at ON public.challenges(starts_at);
```

### user_challenges

User participation and progress in challenges.

```sql
CREATE TABLE public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',    -- active, completed, failed, abandoned
    progress INTEGER DEFAULT 0,
    progress_percentage FLOAT DEFAULT 0,
    milestones_reached INTEGER[] DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- Indexes
CREATE INDEX idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);
CREATE INDEX idx_user_challenges_status ON public.user_challenges(status);
```

## Activity Feed Tables

### activities

Main activity feed entries.

```sql
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    type TEXT NOT NULL,              -- Activity type enum
    data JSONB DEFAULT '{}',         -- Activity-specific data
    visibility TEXT DEFAULT 'public', -- public, friends, private
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_type ON public.activities(type);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_activities_visibility ON public.activities(visibility);
```

### activity_likes

Likes on activities.

```sql
CREATE TABLE public.activity_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- Indexes
CREATE INDEX idx_activity_likes_activity_id ON public.activity_likes(activity_id);
CREATE INDEX idx_activity_likes_user_id ON public.activity_likes(user_id);
```

### activity_comments

Comments on activities.

```sql
CREATE TABLE public.activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.activity_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_comments_activity_id ON public.activity_comments(activity_id);
CREATE INDEX idx_activity_comments_user_id ON public.activity_comments(user_id);
```

## Analytics & Tracking Tables

### analytics_events

User behavior and engagement tracking.

```sql
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES public.users(privy_id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    device_type TEXT,
    platform TEXT,                   -- web, ios, android, telegram
    app_version TEXT,
    country TEXT,
    city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
```

### daily_rewards

Daily login reward tracking.

```sql
CREATE TABLE public.daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    streak_day INTEGER NOT NULL,
    reward_xp INTEGER DEFAULT 0,
    reward_tokens DECIMAL(18, 8) DEFAULT 0,
    bonus_multiplier FLOAT DEFAULT 1.0,
    milestone_bonus JSONB,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_rewards_user_id ON public.daily_rewards(user_id);
CREATE INDEX idx_daily_rewards_claimed_at ON public.daily_rewards(claimed_at);
```

### push_tokens

Push notification tokens for all platforms.

```sql
CREATE TABLE public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,          -- ios, android, telegram, web
    device_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(user_id, token)
);

-- Indexes
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_platform ON public.push_tokens(platform);
```

## Row Level Security

All tables have RLS enabled with user-specific policies:

```sql
-- Example: wearable_devices policy
ALTER TABLE public.wearable_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY wearable_devices_user_policy ON public.wearable_devices
    FOR ALL USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Example: activities policy (with visibility)
CREATE POLICY activities_read_policy ON public.activities
    FOR SELECT USING (
        visibility = 'public'
        OR user_id = current_setting('request.jwt.claims')::json->>'sub'
        OR (visibility = 'friends' AND user_id IN (
            SELECT friend_id FROM friendships
            WHERE user_id = current_setting('request.jwt.claims')::json->>'sub'
        ))
    );
```

## Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to tables with updated_at
CREATE TRIGGER update_wearable_devices_updated_at
    BEFORE UPDATE ON public.wearable_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON public.challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_challenges_updated_at
    BEFORE UPDATE ON public.user_challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Performance Considerations

### Partitioning (Future)

For high-volume tables, consider partitioning:

```sql
-- Partition analytics_events by month
CREATE TABLE public.analytics_events (
    -- columns
) PARTITION BY RANGE (created_at);

CREATE TABLE analytics_events_2024_01
    PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Data Retention

Consider data retention policies:

| Table | Retention | Action |
|-------|-----------|--------|
| wearable_motion_data | 90 days | Archive to cold storage |
| analytics_events | 1 year | Aggregate and delete |
| activity_comments | Permanent | Keep |

## Migration

Migration file: `migrations/043_cross_platform_features.sql`

Run with:
```bash
psql $DATABASE_URL -f migrations/043_cross_platform_features.sql
```

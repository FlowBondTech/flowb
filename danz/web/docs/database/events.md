# Events Database

Database documentation for events, registrations, and event management.

## Events Table

Core table for dance events with location, scheduling, and pricing.

### Table Structure

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
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
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Column Details

#### Identity & Content

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated unique identifier |
| `title` | TEXT | Event title (required) |
| `description` | TEXT | Full event description |
| `category` | TEXT | Event category enum |
| `image_url` | TEXT | S3 URL for event image |

#### Location

| Column | Type | Description |
|--------|------|-------------|
| `location_name` | TEXT | Venue name (required) |
| `location_address` | TEXT | Street address |
| `location_city` | TEXT | City for filtering |
| `location_latitude` | NUMERIC | GPS latitude |
| `location_longitude` | NUMERIC | GPS longitude |
| `is_virtual` | BOOLEAN | True if online event |
| `virtual_link` | TEXT | URL for virtual event |

#### Scheduling

| Column | Type | Description |
|--------|------|-------------|
| `start_date_time` | TIMESTAMPTZ | Event start (required) |
| `end_date_time` | TIMESTAMPTZ | Event end (required) |

#### Capacity & Pricing

| Column | Type | Description |
|--------|------|-------------|
| `max_capacity` | INTEGER | Maximum attendees (default: 50) |
| `current_capacity` | INTEGER | Current registered count |
| `price_usd` | NUMERIC | USD price (null = free) |
| `price_danz` | NUMERIC | DANZ token price |
| `currency` | TEXT | Price currency code |

### Event Categories

| Category | Description |
|----------|-------------|
| `salsa` | Salsa dance events |
| `hip_hop` | Hip-hop dance |
| `contemporary` | Contemporary/modern |
| `ballet` | Ballet classes |
| `jazz` | Jazz dance |
| `ballroom` | Ballroom dance |
| `street` | Street dance |
| `cultural` | Cultural/folk dance |
| `fitness` | Dance fitness |
| `class` | Dance classes |
| `social` | Social dance nights |
| `battle` | Dance battles |
| `workshop` | Workshops/masterclasses |
| `performance` | Shows/performances |
| `other` | Other events |

### Constraints

```sql
-- Date validation
CONSTRAINT events_date_time_check
  CHECK (end_date_time > start_date_time)

-- Category enum
CONSTRAINT valid_category CHECK (category IN (
  'salsa', 'hip-hop', 'contemporary', 'ballet', 'jazz',
  'ballroom', 'street', 'cultural', 'fitness', 'class',
  'social', 'battle', 'workshop', 'performance', 'other'
))

-- Skill level enum
CONSTRAINT valid_skill_level CHECK (
  skill_level IN ('all', 'beginner', 'intermediate', 'advanced')
)

-- Capacity check
CONSTRAINT valid_capacity CHECK (
  max_capacity > 0 AND current_capacity >= 0 AND current_capacity <= max_capacity
)
```

### Indexes

```sql
-- Date range queries
CREATE INDEX idx_events_start_date ON events(start_date_time);
CREATE INDEX idx_events_end_date ON events(end_date_time);

-- Category filtering
CREATE INDEX idx_events_category ON events(category);

-- City filtering
CREATE INDEX idx_events_city ON events(location_city);

-- Facilitator events
CREATE INDEX idx_events_facilitator ON events(facilitator_id);

-- Featured events
CREATE INDEX idx_events_featured ON events(is_featured)
  WHERE is_featured = true;

-- Upcoming events
CREATE INDEX idx_events_upcoming ON events(start_date_time)
  WHERE start_date_time > NOW();

-- Dance style filtering
CREATE INDEX idx_events_dance_styles ON events USING GIN(dance_styles);

-- Composite for common queries
CREATE INDEX idx_events_city_date ON events(location_city, start_date_time);
```

---

## Event Registrations Table

Tracks user event signups, payments, and check-ins.

### Table Structure

```sql
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'registered',

  -- Payment
  payment_status TEXT DEFAULT 'pending',
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

### Registration Status Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  registered │────▶│  attended   │     │  cancelled  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                  ▲                    ▲
       │                  │                    │
       ▼                  │                    │
┌─────────────┐           │                    │
│  waitlisted │───────────┘                    │
└─────────────┘                                │
       │                                       │
       └───────────────────────────────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   no-show   │
                                        └─────────────┘
```

### Status Values

| Status | Description | Transition From |
|--------|-------------|-----------------|
| `registered` | Confirmed registration | Initial |
| `waitlisted` | On waitlist (event full) | Initial |
| `cancelled` | User cancelled | registered, waitlisted |
| `attended` | Checked in at event | registered |
| `no-show` | Didn't attend | registered |

### Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Awaiting payment |
| `paid` | Payment complete |
| `refunded` | Payment refunded |
| `free` | Free event |

### Indexes

```sql
-- Event attendees lookup
CREATE INDEX idx_registrations_event ON event_registrations(event_id);

-- User registrations
CREATE INDEX idx_registrations_user ON event_registrations(user_id);

-- Status filtering
CREATE INDEX idx_registrations_status ON event_registrations(status);

-- Payment status
CREATE INDEX idx_registrations_payment ON event_registrations(payment_status);

-- Check-in status
CREATE INDEX idx_registrations_checkin ON event_registrations(checked_in);

-- Composite for common queries
CREATE INDEX idx_registrations_event_status ON event_registrations(event_id, status);
```

---

## Common Queries

### Get Upcoming Events

```sql
SELECT
  e.id,
  e.title,
  e.description,
  e.category,
  e.image_url,
  e.start_date_time,
  e.end_date_time,
  e.location_name,
  e.location_city,
  e.is_virtual,
  e.max_capacity,
  e.current_capacity,
  (e.max_capacity - e.current_capacity) as spots_available,
  e.price_usd,
  e.is_featured,
  u.display_name as facilitator_name,
  u.avatar_url as facilitator_avatar
FROM events e
LEFT JOIN users u ON e.facilitator_id = u.privy_id
WHERE e.start_date_time > NOW()
ORDER BY e.start_date_time ASC
LIMIT $1 OFFSET $2;
```

### Get Events with Filters

```sql
SELECT
  e.*,
  u.display_name as facilitator_name,
  EXISTS(
    SELECT 1 FROM event_registrations
    WHERE event_id = e.id AND user_id = $1 AND status = 'registered'
  ) as is_registered
FROM events e
LEFT JOIN users u ON e.facilitator_id = u.privy_id
WHERE e.start_date_time > NOW()
  AND ($2::text IS NULL OR e.category = $2)
  AND ($3::text IS NULL OR e.location_city = $3)
  AND ($4::text[] IS NULL OR e.dance_styles && $4)
  AND ($5::boolean IS NULL OR e.is_virtual = $5)
ORDER BY e.start_date_time ASC
LIMIT $6 OFFSET $7;
```

### Get User Registrations

```sql
SELECT
  r.id,
  r.status,
  r.payment_status,
  r.checked_in,
  r.registration_date,
  e.id as event_id,
  e.title,
  e.start_date_time,
  e.end_date_time,
  e.location_name,
  e.image_url
FROM event_registrations r
JOIN events e ON r.event_id = e.id
WHERE r.user_id = $1
  AND ($2::text IS NULL OR r.status = $2)
ORDER BY e.start_date_time DESC;
```

### Register for Event

```sql
-- Check availability first
SELECT
  max_capacity - current_capacity as spots_available,
  price_usd,
  start_date_time
FROM events
WHERE id = $1;

-- Insert registration
INSERT INTO event_registrations (event_id, user_id, status, payment_status)
VALUES (
  $1,
  $2,
  CASE
    WHEN (SELECT max_capacity - current_capacity FROM events WHERE id = $1) > 0
    THEN 'registered'
    ELSE 'waitlisted'
  END,
  CASE
    WHEN (SELECT price_usd FROM events WHERE id = $1) IS NULL
    THEN 'free'
    ELSE 'pending'
  END
)
RETURNING *;
```

### Check In Attendee

```sql
UPDATE event_registrations
SET
  checked_in = true,
  check_in_time = NOW(),
  status = 'attended',
  updated_at = NOW()
WHERE id = $1
  AND event_id = $2
RETURNING *;
```

### Event Statistics

```sql
SELECT
  COUNT(*) as total_registrations,
  COUNT(*) FILTER (WHERE status = 'registered') as registered,
  COUNT(*) FILTER (WHERE status = 'waitlisted') as waitlisted,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE status = 'attended') as attended,
  COUNT(*) FILTER (WHERE status = 'no-show') as no_shows,
  COUNT(*) FILTER (WHERE checked_in = true) as checked_in,
  COUNT(*) FILTER (WHERE payment_status = 'paid') as paid
FROM event_registrations
WHERE event_id = $1;
```

---

## Triggers

### Event Capacity Trigger

Automatically updates `current_capacity` when registrations change.

```sql
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'registered' THEN
    UPDATE events
    SET current_capacity = current_capacity + 1
    WHERE id = NEW.event_id;

  ELSIF TG_OP = 'DELETE' AND OLD.status = 'registered' THEN
    UPDATE events
    SET current_capacity = current_capacity - 1
    WHERE id = OLD.event_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed FROM registered
    IF OLD.status = 'registered' AND NEW.status != 'registered' THEN
      UPDATE events
      SET current_capacity = current_capacity - 1
      WHERE id = NEW.event_id;
    -- Status changed TO registered
    ELSIF OLD.status != 'registered' AND NEW.status = 'registered' THEN
      UPDATE events
      SET current_capacity = current_capacity + 1
      WHERE id = NEW.event_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_capacity
  AFTER INSERT OR UPDATE OR DELETE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participant_count();
```

### Waitlist Promotion Trigger

Promotes waitlisted users when spots open up.

```sql
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
BEGIN
  -- When someone cancels or is removed
  IF OLD.status = 'registered' AND (NEW.status = 'cancelled' OR TG_OP = 'DELETE') THEN
    -- Find oldest waitlisted registration
    UPDATE event_registrations
    SET status = 'registered',
        updated_at = NOW()
    WHERE id = (
      SELECT id FROM event_registrations
      WHERE event_id = OLD.event_id
        AND status = 'waitlisted'
      ORDER BY registration_date ASC
      LIMIT 1
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promote_waitlist
  AFTER UPDATE OR DELETE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION promote_from_waitlist();
```

### User Stats Update Trigger

Updates user statistics when they attend an event.

```sql
CREATE OR REPLACE FUNCTION update_user_event_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'attended' AND OLD.status != 'attended' THEN
    UPDATE users
    SET
      total_events_attended = total_events_attended + 1,
      xp = xp + 100,  -- Base XP for attendance
      updated_at = NOW()
    WHERE privy_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_on_attendance
  AFTER UPDATE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_event_stats();
```

---

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Events: Public read
CREATE POLICY events_select_all ON events
  FOR SELECT
  USING (true);

-- Events: Organizer can update own
CREATE POLICY events_update_organizer ON events
  FOR UPDATE
  USING (facilitator_id = current_setting('app.user_id'));

-- Events: Organizer/Admin can insert
CREATE POLICY events_insert ON events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = current_setting('app.user_id')
      AND role IN ('organizer', 'admin')
    )
  );

-- Registrations: User can see own
CREATE POLICY registrations_select_own ON event_registrations
  FOR SELECT
  USING (user_id = current_setting('app.user_id'));

-- Registrations: Organizer can see event's registrations
CREATE POLICY registrations_select_organizer ON event_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id
      AND facilitator_id = current_setting('app.user_id')
    )
  );
```

---

## TypeScript Types

```typescript
interface Event {
  id: string
  title: string
  description: string | null
  category: EventCategory | null
  imageUrl: string | null

  // Location
  locationName: string
  locationAddress: string | null
  locationCity: string | null
  locationLatitude: number | null
  locationLongitude: number | null
  isVirtual: boolean
  virtualLink: string | null

  // Organizer
  facilitatorId: string | null
  facilitator?: User

  // Capacity
  maxCapacity: number
  currentCapacity: number
  spotsAvailable: number  // Computed

  // Pricing
  priceUsd: number | null
  priceDanz: number | null
  currency: string
  isFree: boolean  // Computed

  // Scheduling
  startDateTime: Date
  endDateTime: Date
  duration: number  // Computed (minutes)

  // Metadata
  skillLevel: SkillLevel | null
  requirements: string | null
  tags: string[]
  danceStyles: string[]
  isFeatured: boolean

  // User context
  isRegistered?: boolean
  registration?: EventRegistration

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

type EventCategory =
  | 'salsa' | 'hip_hop' | 'contemporary' | 'ballet' | 'jazz'
  | 'ballroom' | 'street' | 'cultural' | 'fitness' | 'class'
  | 'social' | 'battle' | 'workshop' | 'performance' | 'other'

interface EventRegistration {
  id: string
  eventId: string
  userId: string
  status: RegistrationStatus
  paymentStatus: PaymentStatus
  paymentAmount: number | null
  paymentDate: Date | null
  checkedIn: boolean
  checkInTime: Date | null
  userNotes: string | null
  registrationDate: Date
  createdAt: Date
  updatedAt: Date
}

type RegistrationStatus =
  | 'registered' | 'waitlisted' | 'cancelled' | 'attended' | 'no_show'

type PaymentStatus =
  | 'pending' | 'paid' | 'refunded' | 'free'
```

## Next Steps

- [Users Database](/database/users) - User profiles and subscriptions
- [Social Database](/database/social) - Bonds, posts, notifications
- [Database Indexes](/database/indexes) - Performance optimization

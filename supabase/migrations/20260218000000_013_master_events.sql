-- 013: Master events database, zones, venues, categories, booths, cross-platform identity
-- Replaces ad-hoc flowb_discovered_events with rich canonical event storage

-- ============================================================================
-- 1a. flowb_zones - EthDenver zones + activation areas
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  icon text,
  zone_type text NOT NULL DEFAULT 'theme' CHECK (zone_type IN ('theme', 'activation', 'general')),
  floor text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed zones
INSERT INTO flowb_zones (slug, name, description, color, icon, zone_type, sort_order) VALUES
  ('etherspace', 'ETHERSPACE', 'Main conference and keynote zone', '#6366f1', 'rocket', 'theme', 1),
  ('devtopia', 'Devtopia', 'Developer-focused zone with workshops and hackathons', '#10b981', 'code', 'theme', 2),
  ('new-france-village', 'New France Village', 'Cultural and community gathering zone', '#f59e0b', 'flag', 'theme', 3),
  ('futurllama', 'Futurllama', 'Future tech and innovation zone', '#8b5cf6', 'sparkles', 'theme', 4),
  ('prosperia', 'Prosperia', 'DeFi, RWA, and financial innovation zone', '#ef4444', 'trending-up', 'theme', 5),
  ('camp-buidl', 'Camp BUIDL', 'Hands-on building and hacking space', '#22c55e', 'hammer', 'activation', 6),
  ('art-gallery', 'Art Gallery', 'Digital and physical art exhibitions', '#ec4899', 'palette', 'activation', 7),
  ('makerspace', 'MakerSpace', 'Hardware hacking and maker projects', '#f97316', 'wrench', 'activation', 8),
  ('podcast-lounge', 'Podcast Lounge', 'Live podcast recordings and interviews', '#06b6d4', 'mic', 'activation', 9),
  ('poker-area', 'Poker Area', 'Crypto poker tournaments and games', '#84cc16', 'spade', 'activation', 10),
  ('museum-ethereum', 'Museum of Ethereum', 'History and evolution of Ethereum', '#a855f7', 'landmark', 'activation', 11),
  ('vibecode-arena', 'Vibecode Arena', 'Live coding competitions and demos', '#14b8a6', 'zap', 'activation', 12),
  ('general', 'General', 'Side events and off-venue activities', '#6b7280', 'map-pin', 'general', 99)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 1b. flowb_venues - Location registry
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_venues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  short_name text,
  address text,
  city text,
  state text,
  zip text,
  latitude double precision,
  longitude double precision,
  venue_type text DEFAULT 'conference' CHECK (venue_type IN ('conference', 'bar', 'restaurant', 'coworking', 'outdoor', 'hotel', 'other')),
  capacity integer,
  website_url text,
  image_url text,
  zone_id uuid REFERENCES flowb_zones(id),
  is_main_venue boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed main venue
INSERT INTO flowb_venues (slug, name, short_name, address, city, state, zip, latitude, longitude, venue_type, is_main_venue) VALUES
  ('national-western-center', 'National Western Center', 'NWC', '4850 National Western Dr', 'Denver', 'CO', '80216', 39.7832, -104.9714, 'conference', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 1c. flowb_event_categories - Taxonomy
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_event_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  parent_id uuid REFERENCES flowb_event_categories(id),
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed 25 categories
INSERT INTO flowb_event_categories (slug, name, icon, color, sort_order) VALUES
  ('defi', 'DeFi', 'coins', '#6366f1', 1),
  ('ai', 'AI & ML', 'brain', '#8b5cf6', 2),
  ('infrastructure', 'Infrastructure', 'server', '#3b82f6', 3),
  ('social', 'Social', 'users', '#ec4899', 4),
  ('workshop', 'Workshop', 'wrench', '#f97316', 5),
  ('party', 'Party', 'music', '#ef4444', 6),
  ('networking', 'Networking', 'handshake', '#10b981', 7),
  ('hackathon', 'Hackathon', 'code', '#22c55e', 8),
  ('panel', 'Panel', 'mic', '#06b6d4', 9),
  ('demo-day', 'Demo Day', 'presentation', '#a855f7', 10),
  ('nft', 'NFT', 'image', '#f59e0b', 11),
  ('gaming', 'Gaming', 'gamepad', '#84cc16', 12),
  ('privacy', 'Privacy', 'shield', '#64748b', 13),
  ('governance', 'Governance', 'vote', '#0ea5e9', 14),
  ('rwa', 'RWA', 'building', '#d97706', 15),
  ('stablecoins', 'Stablecoins', 'dollar-sign', '#16a34a', 16),
  ('depin', 'DePIN', 'wifi', '#7c3aed', 17),
  ('developer', 'Developer', 'terminal', '#059669', 18),
  ('identity', 'Identity', 'fingerprint', '#4f46e5', 19),
  ('food-drink', 'Food & Drink', 'utensils', '#dc2626', 20),
  ('wellness', 'Wellness', 'heart', '#db2777', 21),
  ('sports', 'Sports', 'trophy', '#ca8a04', 22),
  ('brunch', 'Brunch', 'coffee', '#92400e', 23),
  ('poker', 'Poker', 'spade', '#15803d', 24),
  ('other', 'Other', 'more-horizontal', '#6b7280', 99)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 1d. flowb_events - Master events table
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identity
  source text NOT NULL,
  source_event_id text,
  title text NOT NULL,
  title_slug text NOT NULL,
  description text,

  -- Time
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean DEFAULT false,
  timezone text DEFAULT 'America/Denver',

  -- Location (denormalized + FK)
  venue_id uuid REFERENCES flowb_venues(id),
  venue_name text,
  venue_address text,
  city text DEFAULT 'Denver',
  latitude double precision,
  longitude double precision,
  is_virtual boolean DEFAULT false,
  virtual_url text,

  -- Pricing
  is_free boolean,
  price numeric(10,2),
  price_currency text DEFAULT 'USD',
  ticket_url text,

  -- Media
  image_url text,
  cover_url text,
  url text,

  -- Organizer
  organizer_name text,
  organizer_url text,

  -- Classification
  event_type text DEFAULT 'side_event' CHECK (event_type IN ('main_stage', 'side_event', 'party', 'workshop', 'hackathon', 'meetup', 'activation')),
  zone_id uuid REFERENCES flowb_zones(id),
  tags text[] DEFAULT '{}',
  source_metadata jsonb DEFAULT '{}',

  -- Curation
  featured boolean DEFAULT false,
  hidden boolean DEFAULT false,
  admin_note text,
  quality_score numeric(3,2) DEFAULT 0,

  -- Scanner
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  last_synced timestamptz DEFAULT now(),
  sync_hash text,
  stale boolean DEFAULT false,

  -- Social / posting
  posted_to_farcaster boolean DEFAULT false,
  posted_at timestamptz,
  rsvp_count integer DEFAULT 0,
  share_count integer DEFAULT 0,

  UNIQUE(source, title_slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flowb_events_starts_at ON flowb_events (starts_at) WHERE NOT hidden;
CREATE INDEX IF NOT EXISTS idx_flowb_events_featured ON flowb_events (featured, starts_at) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_flowb_events_source ON flowb_events (source, source_event_id);
CREATE INDEX IF NOT EXISTS idx_flowb_events_title_slug ON flowb_events (title_slug);
CREATE INDEX IF NOT EXISTS idx_flowb_events_zone ON flowb_events (zone_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_flowb_events_city ON flowb_events (city, starts_at);
CREATE INDEX IF NOT EXISTS idx_flowb_events_tags ON flowb_events USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_flowb_events_metadata ON flowb_events USING gin (source_metadata);
CREATE INDEX IF NOT EXISTS idx_flowb_events_stale ON flowb_events (stale) WHERE stale = true;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_flowb_events_fts ON flowb_events USING gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(organizer_name, ''))
);

-- Geo index (for future map features)
CREATE INDEX IF NOT EXISTS idx_flowb_events_geo ON flowb_events (latitude, longitude) WHERE latitude IS NOT NULL;

-- ============================================================================
-- 1e. flowb_event_category_map - Many-to-many
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_event_category_map (
  event_id uuid NOT NULL REFERENCES flowb_events(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES flowb_event_categories(id) ON DELETE CASCADE,
  confidence numeric(3,2) DEFAULT 1.0,
  source text DEFAULT 'auto' CHECK (source IN ('auto', 'admin')),
  PRIMARY KEY (event_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_flowb_ecm_category ON flowb_event_category_map (category_id);

-- ============================================================================
-- 1f. flowb_booths - Exhibitors at main venue
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_booths (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  booth_number text,
  zone_id uuid REFERENCES flowb_zones(id),
  venue_id uuid REFERENCES flowb_venues(id),
  sponsor_tier text DEFAULT 'community' CHECK (sponsor_tier IN ('diamond', 'gold', 'silver', 'bronze', 'community')),
  company_url text,
  logo_url text,
  banner_url text,
  twitter_url text,
  farcaster_url text,
  discord_url text,
  telegram_url text,
  floor text,
  latitude double precision,
  longitude double precision,
  has_swag boolean DEFAULT false,
  has_demo boolean DEFAULT false,
  has_hiring boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flowb_booths_zone ON flowb_booths (zone_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_flowb_booths_tier ON flowb_booths (sponsor_tier) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_flowb_booths_tags ON flowb_booths USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_flowb_booths_featured ON flowb_booths (featured) WHERE featured = true;

-- ============================================================================
-- 1g. flowb_identities - Cross-platform identity linking
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_identities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('telegram', 'farcaster', 'web')),
  platform_user_id text NOT NULL,
  privy_id text,
  display_name text,
  avatar_url text,
  linked_at timestamptz DEFAULT now(),
  UNIQUE(platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_flowb_identities_canonical ON flowb_identities (canonical_id);
CREATE INDEX IF NOT EXISTS idx_flowb_identities_privy ON flowb_identities (privy_id) WHERE privy_id IS NOT NULL;

-- ============================================================================
-- 1h. RLS + Data migration
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE flowb_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_event_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_identities ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
CREATE POLICY "service_role_zones" ON flowb_zones FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_venues" ON flowb_venues FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_categories" ON flowb_event_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_events" ON flowb_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_ecm" ON flowb_event_category_map FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_booths" ON flowb_booths FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_identities" ON flowb_identities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read access for non-sensitive tables
CREATE POLICY "public_read_zones" ON flowb_zones FOR SELECT USING (true);
CREATE POLICY "public_read_venues" ON flowb_venues FOR SELECT USING (true);
CREATE POLICY "public_read_categories" ON flowb_event_categories FOR SELECT USING (true);
CREATE POLICY "public_read_events" ON flowb_events FOR SELECT USING (NOT hidden);
CREATE POLICY "public_read_ecm" ON flowb_event_category_map FOR SELECT USING (true);
CREATE POLICY "public_read_booths" ON flowb_booths FOR SELECT USING (active);

-- Migrate existing data from flowb_discovered_events into flowb_events
INSERT INTO flowb_events (
  source, source_event_id, title, title_slug, starts_at,
  venue_name, city, is_free, url,
  featured, hidden, admin_note,
  posted_to_farcaster, first_seen, last_seen
)
SELECT
  source, source_event_id, title, title_slug, starts_at,
  venue_name, city, is_free, url,
  coalesce(featured, false), coalesce(hidden, false), admin_note,
  coalesce(posted_to_farcaster, false), coalesce(first_seen, created_at), coalesce(last_seen, created_at)
FROM flowb_discovered_events
ON CONFLICT (source, title_slug) DO NOTHING;

-- Rename old table to archive (keep it for safety)
ALTER TABLE IF EXISTS flowb_discovered_events RENAME TO flowb_discovered_events_archive;

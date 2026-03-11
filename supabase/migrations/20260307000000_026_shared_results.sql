-- Shared search results & interaction tracking
-- Supports flowb.me/r/{code} shareable result pages

CREATE TABLE IF NOT EXISTS flowb_shared_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text,
  results jsonb NOT NULL,
  query_context jsonb DEFAULT '{}',
  sharer_user_id text,
  sharer_display_name text,
  view_count integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  csv_downloads integer DEFAULT 0,
  share_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_shared_results_code ON flowb_shared_results (code);
CREATE INDEX idx_shared_results_sharer ON flowb_shared_results (sharer_user_id) WHERE sharer_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS flowb_share_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_code text NOT NULL,
  viewer_ip_hash text,
  interaction_type text NOT NULL CHECK (interaction_type IN ('view','csv_download','reshare','event_click')),
  event_id text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_share_interactions_code ON flowb_share_interactions (result_code);

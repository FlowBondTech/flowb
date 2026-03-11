-- ============================================================================
-- Migration 028: Crew Biz Settings & Shared Activity Feed
-- ============================================================================
-- Adds crew-level settings for business feature sharing:
-- - Which features are visible to crew members (locations, leads, meetings, etc.)
-- - Crew activity feed for business updates
-- - Shared lead pipeline view per crew
-- ============================================================================

-- 1. Add biz settings columns to flowb_groups
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS biz_enabled boolean DEFAULT false;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS share_locations boolean DEFAULT true;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS share_leads boolean DEFAULT false;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS share_meetings boolean DEFAULT true;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS share_referrals boolean DEFAULT false;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS share_earnings boolean DEFAULT false;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS share_pipeline boolean DEFAULT false;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS notify_lead_updates boolean DEFAULT true;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS notify_meeting_updates boolean DEFAULT true;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS notify_checkins boolean DEFAULT true;
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS notify_wins boolean DEFAULT true;

-- 2. Crew biz activity feed (cross-feature activity stream)
CREATE TABLE IF NOT EXISTS flowb_crew_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES flowb_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT,
  activity_type TEXT NOT NULL, -- lead_created, lead_stage_change, lead_won, meeting_scheduled, meeting_completed, checkin, location_update, referral_earned
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crew_activities_crew ON flowb_crew_activities(crew_id, created_at DESC);
CREATE INDEX idx_crew_activities_type ON flowb_crew_activities(crew_id, activity_type);

-- 3. Shared leads within a crew (link leads to crews)
CREATE TABLE IF NOT EXISTS flowb_crew_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES flowb_groups(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES flowb_leads(id) ON DELETE CASCADE,
  shared_by TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'team', -- team | admin_only
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, lead_id)
);

CREATE INDEX idx_crew_leads_crew ON flowb_crew_leads(crew_id);
CREATE INDEX idx_crew_leads_lead ON flowb_crew_leads(lead_id);

-- 4. Crew member settings (per-member overrides)
CREATE TABLE IF NOT EXISTS flowb_crew_member_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES flowb_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  share_my_location boolean DEFAULT true,
  share_my_leads boolean DEFAULT true,
  share_my_meetings boolean DEFAULT true,
  mute_notifications boolean DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

-- 5. RLS
ALTER TABLE flowb_crew_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_crew_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_crew_member_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_crew_activities" ON flowb_crew_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_crew_leads" ON flowb_crew_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_crew_member_settings" ON flowb_crew_member_settings FOR ALL USING (true) WITH CHECK (true);

-- Migration: Organizer Applications
-- Date: 2025-12-02
-- Description: Creates the organizer_applications table for users to apply to become event organizers

-- ================================================
-- 1. Organizer Applications Table
-- ================================================

CREATE TABLE IF NOT EXISTS organizer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,

  -- Application details
  reason TEXT NOT NULL,
  experience TEXT,
  venue_name VARCHAR(200),
  venue_address VARCHAR(500),
  venue_city VARCHAR(100),
  venue_capacity INT,
  dance_styles TEXT[],
  website_url VARCHAR(500),
  social_media VARCHAR(500),
  additional_info TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by VARCHAR(100) REFERENCES users(privy_id),
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. Indexes
-- ================================================

CREATE INDEX IF NOT EXISTS idx_organizer_applications_user_id ON organizer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_applications_status ON organizer_applications(status);
CREATE INDEX IF NOT EXISTS idx_organizer_applications_created_at ON organizer_applications(created_at DESC);

-- ================================================
-- 3. Updated_at Trigger
-- ================================================

DROP TRIGGER IF EXISTS update_organizer_applications_updated_at ON organizer_applications;
CREATE TRIGGER update_organizer_applications_updated_at
  BEFORE UPDATE ON organizer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 4. Row Level Security
-- ================================================

ALTER TABLE organizer_applications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_organizer_applications" ON organizer_applications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- Done!
-- ================================================

COMMENT ON TABLE organizer_applications IS 'User applications to become event organizers';

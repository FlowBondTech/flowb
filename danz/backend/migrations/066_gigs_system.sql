-- Migration: Gigs System - Complete Gig Economy for DANZ Events
-- Date: 2025-01-XX
-- Description: Comprehensive gig system with roles, applications, submissions, and rewards

-- ============================================================================
-- 1. GIG ROLES TABLE - Master role definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gig_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- 'operations', 'creative', 'technical', 'hospitality', 'safety'
  tier INTEGER NOT NULL DEFAULT 1, -- 1-4 skill tier
  icon TEXT, -- emoji or icon name
  base_danz_rate NUMERIC(20,2) DEFAULT 0, -- base $DANZ per gig
  requires_verification BOOLEAN DEFAULT false,
  verification_requirements JSONB, -- e.g., {"certifications": ["first_aid"]}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT gig_roles_pkey PRIMARY KEY (id),
  CONSTRAINT gig_roles_category_check CHECK (
    category IN ('operations', 'creative', 'technical', 'hospitality', 'safety')
  ),
  CONSTRAINT gig_roles_tier_check CHECK (tier >= 1 AND tier <= 4)
);

CREATE INDEX idx_gig_roles_category ON public.gig_roles USING btree (category);
CREATE INDEX idx_gig_roles_tier ON public.gig_roles USING btree (tier);
CREATE INDEX idx_gig_roles_active ON public.gig_roles USING btree (is_active) WHERE is_active = true;
CREATE INDEX idx_gig_roles_slug ON public.gig_roles USING btree (slug);

-- ============================================================================
-- 2. USER GIG ROLES TABLE - User's active roles/skills
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_gig_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  portfolio_urls TEXT[], -- proof of work URLs
  certifications TEXT[], -- relevant certifications
  experience_notes TEXT,
  rating NUMERIC(3,2) DEFAULT 0, -- 0-5 average rating
  total_gigs_completed INTEGER DEFAULT 0,
  total_danz_earned NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT user_gig_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_gig_roles_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT user_gig_roles_role_id_fkey FOREIGN KEY (role_id)
    REFERENCES gig_roles(id) ON DELETE CASCADE,
  CONSTRAINT user_gig_roles_verified_by_fkey FOREIGN KEY (verified_by)
    REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT user_gig_roles_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'suspended')
  ),
  CONSTRAINT user_gig_roles_unique_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_gig_roles_user ON public.user_gig_roles USING btree (user_id);
CREATE INDEX idx_user_gig_roles_role ON public.user_gig_roles USING btree (role_id);
CREATE INDEX idx_user_gig_roles_status ON public.user_gig_roles USING btree (status);
CREATE INDEX idx_user_gig_roles_approved ON public.user_gig_roles USING btree (user_id, status) WHERE status = 'approved';

-- ============================================================================
-- 3. EVENT GIGS TABLE - Gigs available at events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_gigs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  role_id UUID NOT NULL,
  title TEXT NOT NULL, -- Custom title if needed
  description TEXT,
  slots_available INTEGER NOT NULL DEFAULT 1,
  slots_filled INTEGER DEFAULT 0,
  danz_reward NUMERIC(20,2) NOT NULL, -- $DANZ for completion
  bonus_danz NUMERIC(20,2) DEFAULT 0, -- Performance bonus
  time_commitment TEXT, -- "2 hours before event"
  specific_requirements TEXT,
  approval_mode TEXT NOT NULL DEFAULT 'manual', -- 'ai', 'manual', 'auto'
  gig_source TEXT NOT NULL DEFAULT 'public', -- 'public' or 'self'
  requires_local BOOLEAN DEFAULT false,
  local_radius_km INTEGER DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'filled', 'in_progress', 'completed', 'cancelled'
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT event_gigs_pkey PRIMARY KEY (id),
  CONSTRAINT event_gigs_event_id_fkey FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT event_gigs_role_id_fkey FOREIGN KEY (role_id)
    REFERENCES gig_roles(id) ON DELETE CASCADE,
  CONSTRAINT event_gigs_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT event_gigs_approval_mode_check CHECK (
    approval_mode IN ('ai', 'manual', 'auto')
  ),
  CONSTRAINT event_gigs_gig_source_check CHECK (
    gig_source IN ('public', 'self')
  ),
  CONSTRAINT event_gigs_status_check CHECK (
    status IN ('open', 'filled', 'in_progress', 'completed', 'cancelled')
  ),
  CONSTRAINT event_gigs_slots_check CHECK (slots_available >= 0 AND slots_filled >= 0)
);

CREATE INDEX idx_event_gigs_event ON public.event_gigs USING btree (event_id);
CREATE INDEX idx_event_gigs_role ON public.event_gigs USING btree (role_id);
CREATE INDEX idx_event_gigs_status ON public.event_gigs USING btree (status);
CREATE INDEX idx_event_gigs_open ON public.event_gigs USING btree (event_id, status) WHERE status = 'open';
CREATE INDEX idx_event_gigs_created_by ON public.event_gigs USING btree (created_by);

-- ============================================================================
-- 4. GIG APPLICATIONS TABLE - User applications for gigs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gig_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  user_role_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'ai_review', 'approved', 'rejected', 'withdrawn', 'completed'
  application_note TEXT, -- User's pitch

  -- AI Review fields (for future AI integration)
  ai_review_score NUMERIC(3,2), -- 0-1 confidence score
  ai_review_notes JSONB, -- AI reasoning
  ai_reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Manual review
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Work tracking
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  completion_proof JSONB, -- photos, notes, etc.

  -- Ratings
  organizer_rating INTEGER, -- 1-5
  organizer_feedback TEXT,
  worker_rating INTEGER, -- 1-5 (rate the organizer)
  worker_feedback TEXT,

  -- Payment
  danz_awarded NUMERIC(20,2) DEFAULT 0,
  danz_awarded_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT gig_applications_pkey PRIMARY KEY (id),
  CONSTRAINT gig_applications_gig_id_fkey FOREIGN KEY (gig_id)
    REFERENCES event_gigs(id) ON DELETE CASCADE,
  CONSTRAINT gig_applications_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT gig_applications_user_role_id_fkey FOREIGN KEY (user_role_id)
    REFERENCES user_gig_roles(id) ON DELETE CASCADE,
  CONSTRAINT gig_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT gig_applications_status_check CHECK (
    status IN ('pending', 'ai_review', 'approved', 'rejected', 'withdrawn', 'completed')
  ),
  CONSTRAINT gig_applications_rating_check CHECK (
    (organizer_rating IS NULL OR (organizer_rating >= 1 AND organizer_rating <= 5)) AND
    (worker_rating IS NULL OR (worker_rating >= 1 AND worker_rating <= 5))
  ),
  CONSTRAINT gig_applications_unique_user_gig UNIQUE (gig_id, user_id)
);

CREATE INDEX idx_gig_applications_gig ON public.gig_applications USING btree (gig_id);
CREATE INDEX idx_gig_applications_user ON public.gig_applications USING btree (user_id);
CREATE INDEX idx_gig_applications_status ON public.gig_applications USING btree (status);
CREATE INDEX idx_gig_applications_pending ON public.gig_applications USING btree (gig_id, status) WHERE status = 'pending';
CREATE INDEX idx_gig_applications_approved ON public.gig_applications USING btree (gig_id, status) WHERE status = 'approved';
CREATE INDEX idx_gig_applications_created ON public.gig_applications USING btree (created_at DESC);

-- ============================================================================
-- 5. GIG SUBMISSIONS TABLE - Proof of work submissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gig_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  submission_type TEXT NOT NULL, -- 'photo', 'video', 'link', 'text', 'document'
  content_url TEXT,
  content_text TEXT,
  metadata JSONB,

  -- AI Review fields (for future AI integration)
  ai_review_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_review'
  ai_review_score NUMERIC(3,2),
  ai_review_notes JSONB,

  -- Manual review
  manual_review_status TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT gig_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT gig_submissions_application_id_fkey FOREIGN KEY (application_id)
    REFERENCES gig_applications(id) ON DELETE CASCADE,
  CONSTRAINT gig_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT gig_submissions_type_check CHECK (
    submission_type IN ('photo', 'video', 'link', 'text', 'document')
  ),
  CONSTRAINT gig_submissions_ai_status_check CHECK (
    ai_review_status IN ('pending', 'approved', 'rejected', 'needs_review')
  )
);

CREATE INDEX idx_gig_submissions_application ON public.gig_submissions USING btree (application_id);
CREATE INDEX idx_gig_submissions_status ON public.gig_submissions USING btree (ai_review_status);
CREATE INDEX idx_gig_submissions_created ON public.gig_submissions USING btree (created_at DESC);

-- ============================================================================
-- 6. GIG REWARD RATES TABLE - Configurable $DANZ rates per role/action
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gig_reward_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  role_id UUID, -- null = applies to all roles
  action_type TEXT NOT NULL, -- 'completion', 'bonus', 'referral', 'rating_bonus'
  rate_name TEXT NOT NULL, -- 'Marketing Base Rate', 'Cleanup Hourly'
  rate_type TEXT NOT NULL, -- 'fixed', 'hourly', 'percentage'
  base_amount NUMERIC(20,2) NOT NULL,
  multiplier NUMERIC(5,2) DEFAULT 1.0, -- for tier bonuses
  min_amount NUMERIC(20,2),
  max_amount NUMERIC(20,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT gig_reward_rates_pkey PRIMARY KEY (id),
  CONSTRAINT gig_reward_rates_role_id_fkey FOREIGN KEY (role_id)
    REFERENCES gig_roles(id) ON DELETE CASCADE,
  CONSTRAINT gig_reward_rates_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT gig_reward_rates_action_type_check CHECK (
    action_type IN ('completion', 'bonus', 'referral', 'rating_bonus', 'streak_bonus')
  ),
  CONSTRAINT gig_reward_rates_rate_type_check CHECK (
    rate_type IN ('fixed', 'hourly', 'percentage')
  )
);

CREATE INDEX idx_gig_reward_rates_role ON public.gig_reward_rates USING btree (role_id);
CREATE INDEX idx_gig_reward_rates_action ON public.gig_reward_rates USING btree (action_type);
CREATE INDEX idx_gig_reward_rates_active ON public.gig_reward_rates USING btree (is_active) WHERE is_active = true;

-- ============================================================================
-- 7. EVENT GIG MANAGERS TABLE - Per-event gig manager assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_gig_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT event_gig_managers_pkey PRIMARY KEY (id),
  CONSTRAINT event_gig_managers_event_id_fkey FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT event_gig_managers_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT event_gig_managers_assigned_by_fkey FOREIGN KEY (assigned_by)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT event_gig_managers_unique_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_gig_managers_event ON public.event_gig_managers USING btree (event_id);
CREATE INDEX idx_event_gig_managers_user ON public.event_gig_managers USING btree (user_id);

-- ============================================================================
-- 8. UPDATE USERS TABLE - Add gig manager fields
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_gig_manager BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gig_manager_approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gig_manager_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS total_gig_danz_earned NUMERIC(20,2) DEFAULT 0;

-- Add foreign key for gig_manager_approved_by (check if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_gig_manager_approved_by_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_gig_manager_approved_by_fkey
      FOREIGN KEY (gig_manager_approved_by) REFERENCES users(privy_id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_users_is_gig_manager ON public.users USING btree (is_gig_manager) WHERE is_gig_manager = true;

-- ============================================================================
-- 9. ADD GIG-RELATED POINT ACTIONS
-- ============================================================================

INSERT INTO point_actions (action_key, action_name, description, points_value, category, is_active) VALUES
  ('gig_completion', 'Gig Completion', 'Completed a gig task', 0, 'activity', true),
  ('gig_bonus', 'Gig Performance Bonus', 'Performance bonus for gig', 0, 'activity', true),
  ('gig_rating_bonus', 'Gig High Rating Bonus', 'High rating bonus (4.5+)', 25, 'activity', true),
  ('gig_streak_bonus', 'Gig Streak Bonus', '5 consecutive gigs completed', 100, 'activity', true),
  ('gig_referral', 'Gig Worker Referral', 'Referred a gig worker', 50, 'referral', true)
ON CONFLICT (action_key) DO NOTHING;

-- ============================================================================
-- 10. SEED GIG ROLES DATA (14 roles)
-- ============================================================================

INSERT INTO gig_roles (name, slug, description, category, tier, icon, base_danz_rate, requires_verification, verification_requirements) VALUES
  -- Tier 1: Beginner
  ('Cleanup Crew', 'cleanup-crew', 'Post-event restoration including venue cleanup, trash disposal, and packing equipment', 'operations', 1, '🧹', 50.00, false, NULL),
  ('Setup Crew', 'setup-crew', 'Pre-event preparation including stage setup, equipment, and decorations', 'operations', 1, '🔧', 50.00, false, NULL),
  ('Food & Beverage', 'food-beverage', 'Refreshments setup, serving, restocking, and cleanup', 'hospitality', 1, '🍕', 60.00, false, NULL),

  -- Tier 2: Intermediate
  ('Door/Check-in', 'door-checkin', 'Registration desk duties including checking attendees, handling payments, and wristbands', 'operations', 2, '🚪', 75.00, false, NULL),
  ('Social Media', 'social-media', 'Live coverage including stories, posts, engagement, and tagging', 'creative', 2, '📱', 100.00, false, NULL),
  ('DJ Assistant', 'dj-assistant', 'Sound support including equipment setup, playlist management, and cables', 'technical', 2, '🎧', 100.00, false, NULL),

  -- Tier 3: Skilled
  ('Marketer', 'marketer', 'Promote events locally through flyer distribution, social posts, and word-of-mouth', 'creative', 3, '📣', 150.00, false, NULL),
  ('Photographer', 'photographer', 'Document the event with action shots, group photos, and story highlights', 'creative', 3, '📷', 200.00, false, NULL),
  ('Videographer', 'videographer', 'Video content creation including reels, TikToks, and event recaps', 'creative', 3, '🎬', 250.00, false, NULL),
  ('Teaching Assistant', 'teaching-assistant', 'Support instructors with demo assistance, student help, and corrections', 'technical', 3, '💃', 150.00, false, NULL),

  -- Tier 4: Expert
  ('Host/MC', 'host-mc', 'Event hosting including announcements, energy, and crowd engagement', 'creative', 4, '🎤', 300.00, false, NULL),
  ('Security', 'security', 'Event safety including crowd control, access points, and incident response', 'safety', 4, '🛡️', 200.00, false, NULL),
  ('First Aid', 'first-aid', 'Medical support including basic first aid and emergency coordination', 'safety', 4, '🏥', 250.00, true, '{"certifications": ["first_aid", "cpr"]}'),
  ('Translation', 'translation', 'Language support including real-time translation and signage', 'technical', 4, '🌐', 200.00, false, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 11. SEED DEFAULT REWARD RATES
-- ============================================================================

-- Insert default completion rates for each role
INSERT INTO gig_reward_rates (role_id, action_type, rate_name, rate_type, base_amount, multiplier, description)
SELECT
  id as role_id,
  'completion' as action_type,
  name || ' Base Rate' as rate_name,
  'fixed' as rate_type,
  base_danz_rate as base_amount,
  1.0 as multiplier,
  'Base completion rate for ' || name as description
FROM gig_roles
ON CONFLICT DO NOTHING;

-- Insert bonus rates for each role
INSERT INTO gig_reward_rates (role_id, action_type, rate_name, rate_type, base_amount, multiplier, description)
SELECT
  id as role_id,
  'bonus' as action_type,
  name || ' Performance Bonus' as rate_name,
  'fixed' as rate_type,
  CASE
    WHEN tier = 1 THEN 10.00
    WHEN tier = 2 THEN 20.00
    WHEN tier = 3 THEN 50.00
    WHEN tier = 4 THEN 75.00
    ELSE 10.00
  END as base_amount,
  1.0 as multiplier,
  'Performance bonus for ' || name as description
FROM gig_roles
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. DATABASE FUNCTIONS
-- ============================================================================

-- Function: Update slots_filled when application approved
CREATE OR REPLACE FUNCTION update_gig_slots_on_application()
RETURNS TRIGGER AS $$
BEGIN
  -- When application is approved, increment slots_filled
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE event_gigs
    SET
      slots_filled = slots_filled + 1,
      status = CASE
        WHEN slots_filled + 1 >= slots_available THEN 'filled'
        ELSE status
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.gig_id;
  END IF;

  -- When application is withdrawn or rejected after being approved
  IF OLD.status = 'approved' AND NEW.status IN ('withdrawn', 'rejected') THEN
    UPDATE event_gigs
    SET
      slots_filled = GREATEST(0, slots_filled - 1),
      status = CASE
        WHEN status = 'filled' THEN 'open'
        ELSE status
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.gig_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update user gig stats on completion
CREATE OR REPLACE FUNCTION update_user_gig_stats_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update user_gig_roles stats
    UPDATE user_gig_roles
    SET
      total_gigs_completed = total_gigs_completed + 1,
      total_danz_earned = total_danz_earned + COALESCE(NEW.danz_awarded, 0),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_role_id;

    -- Update users total gig earnings
    UPDATE users
    SET
      total_gig_danz_earned = COALESCE(total_gig_danz_earned, 0) + COALESCE(NEW.danz_awarded, 0),
      updated_at = CURRENT_TIMESTAMP
    WHERE privy_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update user_gig_roles rating
CREATE OR REPLACE FUNCTION update_user_gig_role_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organizer_rating IS NOT NULL AND (OLD.organizer_rating IS NULL OR OLD.organizer_rating != NEW.organizer_rating) THEN
    UPDATE user_gig_roles
    SET
      rating = (
        SELECT COALESCE(AVG(organizer_rating), 0)
        FROM gig_applications
        WHERE user_role_id = NEW.user_role_id
          AND organizer_rating IS NOT NULL
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_role_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Award $DANZ for gig completion
CREATE OR REPLACE FUNCTION award_gig_danz(
  p_application_id UUID,
  p_bonus_amount NUMERIC DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_application RECORD;
  v_gig RECORD;
  v_total_reward NUMERIC;
BEGIN
  -- Get application details
  SELECT * INTO v_application
  FROM gig_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id;
  END IF;

  -- Get gig details
  SELECT * INTO v_gig
  FROM event_gigs
  WHERE id = v_application.gig_id;

  -- Calculate total reward
  v_total_reward := v_gig.danz_reward + COALESCE(p_bonus_amount, 0);

  -- Update application with award
  UPDATE gig_applications
  SET
    danz_awarded = v_total_reward,
    danz_awarded_at = CURRENT_TIMESTAMP,
    status = 'completed',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_application_id;

  -- Create point transaction
  INSERT INTO point_transactions (
    user_id,
    action_key,
    points_amount,
    transaction_type,
    reference_id,
    reference_type,
    metadata,
    status
  ) VALUES (
    v_application.user_id,
    'gig_completion',
    v_total_reward::INTEGER,
    'earn',
    p_application_id,
    'gig',
    jsonb_build_object(
      'gig_id', v_application.gig_id,
      'event_id', v_gig.event_id,
      'role_id', v_gig.role_id,
      'base_reward', v_gig.danz_reward,
      'bonus', p_bonus_amount
    ),
    'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. TRIGGERS
-- ============================================================================

-- Trigger: Update gig slots on application status change
DROP TRIGGER IF EXISTS trigger_update_gig_slots ON gig_applications;
CREATE TRIGGER trigger_update_gig_slots
  AFTER INSERT OR UPDATE OF status ON gig_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_gig_slots_on_application();

-- Trigger: Update user gig stats on completion
DROP TRIGGER IF EXISTS trigger_update_user_gig_stats ON gig_applications;
CREATE TRIGGER trigger_update_user_gig_stats
  AFTER UPDATE OF status ON gig_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gig_stats_on_completion();

-- Trigger: Update user_gig_role rating on organizer rating
DROP TRIGGER IF EXISTS trigger_update_gig_role_rating ON gig_applications;
CREATE TRIGGER trigger_update_gig_role_rating
  AFTER UPDATE OF organizer_rating ON gig_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gig_role_rating();

-- Trigger: Update timestamps
DROP TRIGGER IF EXISTS trigger_update_gig_roles_timestamp ON gig_roles;
CREATE TRIGGER trigger_update_gig_roles_timestamp
  BEFORE UPDATE ON gig_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_gig_roles_timestamp ON user_gig_roles;
CREATE TRIGGER trigger_update_user_gig_roles_timestamp
  BEFORE UPDATE ON user_gig_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_event_gigs_timestamp ON event_gigs;
CREATE TRIGGER trigger_update_event_gigs_timestamp
  BEFORE UPDATE ON event_gigs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_gig_applications_timestamp ON gig_applications;
CREATE TRIGGER trigger_update_gig_applications_timestamp
  BEFORE UPDATE ON gig_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_gig_reward_rates_timestamp ON gig_reward_rates;
CREATE TRIGGER trigger_update_gig_reward_rates_timestamp
  BEFORE UPDATE ON gig_reward_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 14. VIEWS FOR ANALYTICS
-- ============================================================================

-- View: Gig worker performance summary
CREATE OR REPLACE VIEW gig_worker_performance AS
SELECT
  u.privy_id,
  u.username,
  u.total_gig_danz_earned,
  COUNT(DISTINCT ugr.role_id) as active_roles,
  COUNT(CASE WHEN ga.status = 'completed' THEN 1 END) as total_gigs_completed,
  COUNT(CASE WHEN ga.status = 'approved' THEN 1 END) as current_approved_gigs,
  AVG(ga.organizer_rating) as avg_rating,
  MAX(ga.updated_at) as last_gig_date
FROM users u
LEFT JOIN user_gig_roles ugr ON u.privy_id = ugr.user_id AND ugr.status = 'approved'
LEFT JOIN gig_applications ga ON u.privy_id = ga.user_id
GROUP BY u.privy_id, u.username, u.total_gig_danz_earned;

-- View: Event gig summary
CREATE OR REPLACE VIEW event_gig_summary AS
SELECT
  e.id as event_id,
  e.title as event_title,
  e.start_date_time,
  COUNT(eg.id) as total_gigs,
  SUM(eg.slots_available) as total_slots,
  SUM(eg.slots_filled) as filled_slots,
  COUNT(CASE WHEN eg.status = 'open' THEN 1 END) as open_gigs,
  COUNT(CASE WHEN eg.status = 'filled' THEN 1 END) as filled_gigs,
  SUM(eg.danz_reward) as total_danz_pool
FROM events e
LEFT JOIN event_gigs eg ON e.id = eg.event_id
GROUP BY e.id, e.title, e.start_date_time;

-- View: Gig role popularity
CREATE OR REPLACE VIEW gig_role_popularity AS
SELECT
  gr.id as role_id,
  gr.name,
  gr.slug,
  gr.tier,
  gr.category,
  COUNT(DISTINCT ugr.user_id) as registered_workers,
  COUNT(DISTINCT CASE WHEN ugr.status = 'approved' THEN ugr.user_id END) as approved_workers,
  COUNT(DISTINCT eg.id) as gigs_created,
  COUNT(DISTINCT CASE WHEN ga.status = 'completed' THEN ga.id END) as gigs_completed,
  AVG(ugr.rating) as avg_worker_rating
FROM gig_roles gr
LEFT JOIN user_gig_roles ugr ON gr.id = ugr.role_id
LEFT JOIN event_gigs eg ON gr.id = eg.role_id
LEFT JOIN gig_applications ga ON eg.id = ga.gig_id
GROUP BY gr.id, gr.name, gr.slug, gr.tier, gr.category;

-- ============================================================================
-- 15. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE gig_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gig_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_reward_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_gig_managers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view gig roles
CREATE POLICY gig_roles_select_all ON gig_roles
  FOR SELECT
  USING (true);

-- Policy: Users can view their own gig roles
CREATE POLICY user_gig_roles_select_own ON user_gig_roles
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own gig role applications
CREATE POLICY user_gig_roles_insert_own ON user_gig_roles
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own gig role applications
CREATE POLICY user_gig_roles_update_own ON user_gig_roles
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Policy: Anyone can view event gigs
CREATE POLICY event_gigs_select_all ON event_gigs
  FOR SELECT
  USING (true);

-- Policy: Event creators and gig managers can manage event gigs
CREATE POLICY event_gigs_manage ON event_gigs
  FOR ALL
  USING (
    auth.uid()::text = created_by
    OR EXISTS (
      SELECT 1 FROM event_gig_managers egm
      WHERE egm.event_id = event_gigs.event_id
        AND egm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND (is_admin = true OR is_gig_manager = true)
    )
  );

-- Policy: Users can view their own applications
CREATE POLICY gig_applications_select_own ON gig_applications
  FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR EXISTS (
      SELECT 1 FROM event_gigs eg
      WHERE eg.id = gig_applications.gig_id
        AND eg.created_by = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND (is_admin = true OR is_gig_manager = true)
    )
  );

-- Policy: Users can insert their own applications
CREATE POLICY gig_applications_insert_own ON gig_applications
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own applications, organizers can review
CREATE POLICY gig_applications_update ON gig_applications
  FOR UPDATE
  USING (
    auth.uid()::text = user_id
    OR EXISTS (
      SELECT 1 FROM event_gigs eg
      WHERE eg.id = gig_applications.gig_id
        AND eg.created_by = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM event_gig_managers egm
      JOIN event_gigs eg ON eg.event_id = egm.event_id
      WHERE eg.id = gig_applications.gig_id
        AND egm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND (is_admin = true OR is_gig_manager = true)
    )
  );

-- Policy: Applicants can view and manage their own submissions
CREATE POLICY gig_submissions_own ON gig_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gig_applications ga
      WHERE ga.id = gig_submissions.application_id
        AND ga.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND (is_admin = true OR is_gig_manager = true)
    )
  );

-- Policy: Anyone can view reward rates
CREATE POLICY gig_reward_rates_select_all ON gig_reward_rates
  FOR SELECT
  USING (true);

-- Policy: Admins can manage reward rates
CREATE POLICY gig_reward_rates_admin_all ON gig_reward_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND is_admin = true
    )
  );

-- Policy: Event gig managers visibility
CREATE POLICY event_gig_managers_select ON event_gig_managers
  FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR auth.uid()::text = assigned_by
    OR EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND (is_admin = true OR is_gig_manager = true)
    )
  );

-- Policy: Event creators can assign gig managers
CREATE POLICY event_gig_managers_manage ON event_gig_managers
  FOR ALL
  USING (
    auth.uid()::text = assigned_by
    OR EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND is_admin = true
    )
  );

-- ============================================================================
-- 16. GRANT PERMISSIONS
-- ============================================================================

-- Service role gets full access
GRANT ALL ON public.gig_roles TO service_role;
GRANT ALL ON public.user_gig_roles TO service_role;
GRANT ALL ON public.event_gigs TO service_role;
GRANT ALL ON public.gig_applications TO service_role;
GRANT ALL ON public.gig_submissions TO service_role;
GRANT ALL ON public.gig_reward_rates TO service_role;
GRANT ALL ON public.event_gig_managers TO service_role;

-- Authenticated users get appropriate access
GRANT SELECT ON public.gig_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_gig_roles TO authenticated;
GRANT SELECT ON public.event_gigs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gig_applications TO authenticated;
GRANT SELECT, INSERT ON public.gig_submissions TO authenticated;
GRANT SELECT ON public.gig_reward_rates TO authenticated;
GRANT SELECT ON public.event_gig_managers TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

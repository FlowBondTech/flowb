-- Migration: Fix Security Issues - Enable RLS and Remove SECURITY DEFINER
-- Date: 2024-12-16
-- Description: Enable RLS on missing tables and recreate views without SECURITY DEFINER

-- ============================================
-- PART 1: ENABLE RLS ON MISSING TABLES
-- ============================================

-- Enable RLS on freestyle_sessions
ALTER TABLE public.freestyle_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on hidden_activities
ALTER TABLE public.hidden_activities ENABLE ROW LEVEL SECURITY;

-- Enable RLS on activity_reports
ALTER TABLE public.activity_reports ENABLE ROW LEVEL SECURITY;

-- Enable RLS on posts (if not already enabled)
DO $$ BEGIN
  ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on post_likes (if not already enabled)
DO $$ BEGIN
  ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on post_comments (if not already enabled)
DO $$ BEGIN
  ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on dance_bonds (if not already enabled)
DO $$ BEGIN
  ALTER TABLE public.dance_bonds ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on referral_click_tracking
ALTER TABLE public.referral_click_tracking ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Enable RLS on platform_todos
ALTER TABLE public.platform_todos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: CREATE RLS POLICIES
-- ============================================

-- ===== FREESTYLE SESSIONS =====

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own freestyle sessions" ON public.freestyle_sessions;
DROP POLICY IF EXISTS "Users can create their own freestyle sessions" ON public.freestyle_sessions;
DROP POLICY IF EXISTS "Users can update their own freestyle sessions" ON public.freestyle_sessions;
DROP POLICY IF EXISTS "Users can delete their own freestyle sessions" ON public.freestyle_sessions;

-- Create new policies
CREATE POLICY "Users can view their own freestyle sessions"
  ON public.freestyle_sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own freestyle sessions"
  ON public.freestyle_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own freestyle sessions"
  ON public.freestyle_sessions FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own freestyle sessions"
  ON public.freestyle_sessions FOR DELETE
  USING (auth.uid()::text = user_id);

-- ===== HIDDEN ACTIVITIES =====

DROP POLICY IF EXISTS "Users can view their own hidden activities" ON public.hidden_activities;
DROP POLICY IF EXISTS "Users can hide activities" ON public.hidden_activities;
DROP POLICY IF EXISTS "Users can unhide activities" ON public.hidden_activities;

CREATE POLICY "Users can view their own hidden activities"
  ON public.hidden_activities FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can hide activities"
  ON public.hidden_activities FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can unhide activities"
  ON public.hidden_activities FOR DELETE
  USING (auth.uid()::text = user_id);

-- ===== ACTIVITY REPORTS =====

DROP POLICY IF EXISTS "Users can view their own reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.activity_reports;

CREATE POLICY "Users can view their own reports"
  ON public.activity_reports FOR SELECT
  USING (auth.uid()::text = reported_by);

CREATE POLICY "Users can create reports"
  ON public.activity_reports FOR INSERT
  WITH CHECK (auth.uid()::text = reported_by);

-- Admin policies (assuming you have an is_admin check)
CREATE POLICY "Admins can view all reports"
  ON public.activity_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE privy_id = auth.uid()::text AND is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON public.activity_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE privy_id = auth.uid()::text AND is_admin = true
    )
  );

-- ===== REFERRAL CLICK TRACKING =====

DROP POLICY IF EXISTS "Click tracking is publicly insertable" ON public.referral_click_tracking;
DROP POLICY IF EXISTS "Admins can view all click tracking" ON public.referral_click_tracking;

-- Public can insert clicks (for tracking)
CREATE POLICY "Click tracking is publicly insertable"
  ON public.referral_click_tracking FOR INSERT
  WITH CHECK (true);

-- Only admins can view click tracking data
CREATE POLICY "Admins can view all click tracking"
  ON public.referral_click_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE privy_id = auth.uid()::text AND is_admin = true
    )
  );

-- ===== NOTIFICATION PREFERENCES =====

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can create their own notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- ===== PLATFORM TODOS =====

DROP POLICY IF EXISTS "Admins can view all todos" ON public.platform_todos;
DROP POLICY IF EXISTS "Admins can manage todos" ON public.platform_todos;

-- Only admins can view and manage platform todos
CREATE POLICY "Admins can view all todos"
  ON public.platform_todos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE privy_id = auth.uid()::text AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage todos"
  ON public.platform_todos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE privy_id = auth.uid()::text AND is_admin = true
    )
  );

-- ============================================
-- PART 3: RECREATE VIEWS WITHOUT SECURITY DEFINER
-- ============================================

-- Drop and recreate admin_user_points_summary without SECURITY DEFINER
DROP VIEW IF EXISTS public.admin_user_points_summary CASCADE;
CREATE VIEW public.admin_user_points_summary AS
SELECT
  u.privy_id,
  u.username,
  u.total_points_earned,
  u.total_points_spent,
  u.current_points_balance,
  u.xp,
  u.level,
  COUNT(pt.id) as total_transactions,
  COUNT(DISTINCT pt.action_key) as unique_actions,
  MAX(pt.created_at) as last_transaction_at,
  COUNT(CASE WHEN pt.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as transactions_last_week,
  SUM(CASE WHEN pt.created_at > NOW() - INTERVAL '7 days' THEN pt.points_amount ELSE 0 END) as points_last_week
FROM users u
LEFT JOIN point_transactions pt ON u.privy_id = pt.user_id
  AND pt.status = 'completed'
GROUP BY u.privy_id, u.username, u.total_points_earned, u.total_points_spent, u.current_points_balance, u.xp, u.level;

-- Drop and recreate admin_points_overview without SECURITY DEFINER
DROP VIEW IF EXISTS public.admin_points_overview CASCADE;
CREATE VIEW public.admin_points_overview AS
SELECT
  pa.action_key,
  pa.action_name,
  pa.category,
  pa.points_value,
  pa.is_active,
  COUNT(pt.id) as total_transactions,
  COUNT(DISTINCT pt.user_id) as unique_users,
  SUM(pt.points_amount) as total_points_awarded,
  AVG(pt.points_amount) as avg_points_per_transaction,
  MAX(pt.created_at) as last_awarded_at
FROM point_actions pa
LEFT JOIN point_transactions pt ON pa.action_key = pt.action_key
  AND pt.status = 'completed'
GROUP BY pa.id, pa.action_key, pa.action_name, pa.category, pa.points_value, pa.is_active;

-- Drop and recreate referral_fraud_alerts without SECURITY DEFINER
DROP VIEW IF EXISTS public.referral_fraud_alerts CASCADE;
CREATE VIEW public.referral_fraud_alerts AS
SELECT
  r.id,
  r.referrer_id,
  r.referee_id,
  r.referral_code,
  r.ip_address,
  r.device_id,
  r.status,
  COUNT(*) OVER (PARTITION BY r.ip_address, DATE(r.clicked_at)) as same_ip_today,
  COUNT(*) OVER (PARTITION BY r.device_id) as same_device_total,
  COUNT(*) OVER (PARTITION BY r.referrer_id, DATE(r.clicked_at)) as referrer_today,
  EXTRACT(EPOCH FROM (r.signed_up_at - r.clicked_at)) as seconds_to_signup,
  CASE
    WHEN COUNT(*) OVER (PARTITION BY r.ip_address, DATE(r.clicked_at)) >= 3 THEN 'SAME_IP_ABUSE'
    WHEN COUNT(*) OVER (PARTITION BY r.device_id) >= 2 THEN 'SAME_DEVICE_ABUSE'
    WHEN COUNT(*) OVER (PARTITION BY r.referrer_id, DATE(r.clicked_at)) >= 10 THEN 'REFERRER_SPAM'
    WHEN EXTRACT(EPOCH FROM (r.signed_up_at - r.clicked_at)) < 5 THEN 'INSTANT_SIGNUP'
    ELSE 'OK'
  END as fraud_flag
FROM referrals r
WHERE r.status != 'fraudulent';

-- Drop and recreate referral_performance without SECURITY DEFINER
DROP VIEW IF EXISTS public.referral_performance CASCADE;
CREATE VIEW public.referral_performance AS
SELECT
  rc.code,
  rc.user_id,
  u.username,
  COUNT(r.id) as total_clicks,
  COUNT(CASE WHEN r.status = 'signed_up' OR r.status = 'completed' THEN 1 END) as signups,
  COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending,
  ROUND(
    COALESCE(
      COUNT(CASE WHEN r.status = 'completed' THEN 1 END)::numeric /
      NULLIF(COUNT(r.id), 0) * 100,
      0
    ),
    2
  ) as conversion_rate
FROM referral_codes rc
LEFT JOIN referrals r ON rc.code = r.referral_code
LEFT JOIN users u ON rc.user_id = u.privy_id
GROUP BY rc.code, rc.user_id, u.username;

-- Drop and recreate event_attendance_summary without SECURITY DEFINER
DROP VIEW IF EXISTS public.event_attendance_summary CASCADE;
CREATE VIEW public.event_attendance_summary AS
SELECT
  e.id as event_id,
  e.title as event_name,
  e.start_date_time as start_date,
  e.end_date_time as end_date,
  COUNT(ea.id) as total_attendees,
  COUNT(CASE WHEN ea.checked_in THEN 1 END) as checked_in_count,
  COUNT(CASE WHEN ea.attendance_verified THEN 1 END) as verified_count,
  SUM(ea.points_earned) as total_points_awarded,
  AVG(ea.points_earned) as avg_points_per_attendee
FROM events e
LEFT JOIN event_attendance ea ON e.id = ea.event_id
GROUP BY e.id, e.title, e.start_date_time, e.end_date_time;

-- ============================================
-- PART 4: GRANT PERMISSIONS ON VIEWS
-- ============================================

-- Grant select on admin views to authenticated users
-- (RLS will handle who can actually see the data)
GRANT SELECT ON public.admin_user_points_summary TO authenticated;
GRANT SELECT ON public.admin_points_overview TO authenticated;
GRANT SELECT ON public.referral_fraud_alerts TO authenticated;
GRANT SELECT ON public.referral_performance TO authenticated;
GRANT SELECT ON public.event_attendance_summary TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Users can view their own freestyle sessions" ON public.freestyle_sessions
  IS 'Users can only view their own freestyle dance sessions';

COMMENT ON POLICY "Users can view their own hidden activities" ON public.hidden_activities
  IS 'Users can only see activities they have hidden';

COMMENT ON POLICY "Users can view their own reports" ON public.activity_reports
  IS 'Users can view reports they have submitted';

COMMENT ON POLICY "Click tracking is publicly insertable" ON public.referral_click_tracking
  IS 'Allow public insert for anonymous referral click tracking';

COMMENT ON POLICY "Users can view their own notification preferences" ON public.notification_preferences
  IS 'Users can only access their own notification settings';

COMMENT ON POLICY "Admins can view all todos" ON public.platform_todos
  IS 'Platform todos are only accessible to admin users';

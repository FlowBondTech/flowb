CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.point_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  action_name TEXT NOT NULL,
  description TEXT,
  points_value INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_verification BOOLEAN DEFAULT false,
  max_per_day INTEGER NULL,
  max_per_week INTEGER NULL,
  max_per_month INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT point_actions_pkey PRIMARY KEY (id),
  CONSTRAINT point_actions_category_check CHECK (
    category IN ('social', 'activity', 'event', 'referral', 'achievement', 'special', 'admin')
  )
);

CREATE INDEX idx_point_actions_key ON public.point_actions USING btree (action_key);
CREATE INDEX idx_point_actions_category ON public.point_actions USING btree (category);
CREATE INDEX idx_point_actions_active ON public.point_actions USING btree (is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action_key TEXT NOT NULL,
  points_amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'earn',
  reference_id UUID NULL,
  reference_type TEXT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  admin_user_id TEXT NULL,
  admin_note TEXT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT point_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT point_transactions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT point_transactions_admin_user_id_fkey FOREIGN KEY (admin_user_id)
    REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT point_transactions_type_check CHECK (
    transaction_type IN ('earn', 'spend', 'bonus', 'penalty', 'adjustment', 'refund')
  ),
  CONSTRAINT point_transactions_status_check CHECK (
    status IN ('pending', 'completed', 'reversed', 'failed')
  ),
  CONSTRAINT point_transactions_reference_type_check CHECK (
    reference_type IS NULL OR reference_type IN ('dance_session', 'event', 'referral', 'achievement', 'purchase', 'admin')
  )
);

CREATE INDEX idx_point_transactions_user ON public.point_transactions USING btree (user_id);
CREATE INDEX idx_point_transactions_action ON public.point_transactions USING btree (action_key);
CREATE INDEX idx_point_transactions_created ON public.point_transactions USING btree (created_at DESC);
CREATE INDEX idx_point_transactions_reference ON public.point_transactions USING btree (reference_id, reference_type);
CREATE INDEX idx_point_transactions_status ON public.point_transactions USING btree (status);

CREATE TABLE IF NOT EXISTS public.daily_activity_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  activity_date DATE NOT NULL,
  app_opened BOOLEAN DEFAULT false,
  app_opened_at TIMESTAMP WITH TIME ZONE NULL,
  first_session_completed BOOLEAN DEFAULT false,
  sessions_completed INTEGER DEFAULT 0,
  total_dance_time INTEGER DEFAULT 0,
  events_attended INTEGER DEFAULT 0,
  social_interactions INTEGER DEFAULT 0,
  points_earned_today INTEGER DEFAULT 0,
  streak_day INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT daily_activity_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT daily_activity_tracking_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT daily_activity_tracking_unique_user_date UNIQUE (user_id, activity_date)
);

CREATE INDEX idx_daily_activity_user ON public.daily_activity_tracking USING btree (user_id);
CREATE INDEX idx_daily_activity_date ON public.daily_activity_tracking USING btree (activity_date DESC);
CREATE INDEX idx_daily_activity_user_date ON public.daily_activity_tracking USING btree (user_id, activity_date DESC);

CREATE TABLE IF NOT EXISTS public.event_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  registration_id UUID NULL,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE NULL,
  checked_out BOOLEAN DEFAULT false,
  checked_out_at TIMESTAMP WITH TIME ZONE NULL,
  duration_minutes INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  attendance_verified BOOLEAN DEFAULT false,
  verified_by TEXT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT event_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT event_attendance_event_id_fkey FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT event_attendance_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT event_attendance_registration_id_fkey FOREIGN KEY (registration_id)
    REFERENCES event_registrations(id) ON DELETE SET NULL,
  CONSTRAINT event_attendance_verified_by_fkey FOREIGN KEY (verified_by)
    REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT event_attendance_unique_user_event UNIQUE (user_id, event_id)
);

CREATE INDEX idx_event_attendance_event ON public.event_attendance USING btree (event_id);
CREATE INDEX idx_event_attendance_user ON public.event_attendance USING btree (user_id);
CREATE INDEX idx_event_attendance_checked_in ON public.event_attendance USING btree (checked_in_at DESC);
CREATE INDEX idx_event_attendance_verified ON public.event_attendance USING btree (attendance_verified);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_role TEXT NULL,
  ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_points_spent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_points_balance INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users USING btree (is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_users_points_balance ON public.users USING btree (current_points_balance DESC);

CREATE OR REPLACE FUNCTION award_points(
  p_user_id TEXT,
  p_action_key TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_action RECORD;
  v_transaction_id UUID;
  v_today_count INTEGER;
  v_week_count INTEGER;
  v_month_count INTEGER;
BEGIN
  SELECT * INTO v_action
  FROM point_actions
  WHERE action_key = p_action_key
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Point action not found or inactive: %', p_action_key;
  END IF;

  IF v_action.max_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_count
    FROM point_transactions
    WHERE user_id = p_user_id
      AND action_key = p_action_key
      AND created_at > CURRENT_DATE;

    IF v_today_count >= v_action.max_per_day THEN
      RAISE EXCEPTION 'Daily limit reached for action: %', p_action_key;
    END IF;
  END IF;

  IF v_action.max_per_week IS NOT NULL THEN
    SELECT COUNT(*) INTO v_week_count
    FROM point_transactions
    WHERE user_id = p_user_id
      AND action_key = p_action_key
      AND created_at > CURRENT_DATE - INTERVAL '7 days';

    IF v_week_count >= v_action.max_per_week THEN
      RAISE EXCEPTION 'Weekly limit reached for action: %', p_action_key;
    END IF;
  END IF;

  IF v_action.max_per_month IS NOT NULL THEN
    SELECT COUNT(*) INTO v_month_count
    FROM point_transactions
    WHERE user_id = p_user_id
      AND action_key = p_action_key
      AND created_at > CURRENT_DATE - INTERVAL '30 days';

    IF v_month_count >= v_action.max_per_month THEN
      RAISE EXCEPTION 'Monthly limit reached for action: %', p_action_key;
    END IF;
  END IF;

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
    p_user_id,
    p_action_key,
    v_action.points_value,
    'earn',
    p_reference_id,
    p_reference_type,
    p_metadata,
    CASE WHEN v_action.requires_verification THEN 'pending' ELSE 'completed' END
  )
  RETURNING id INTO v_transaction_id;

  IF NOT v_action.requires_verification THEN
    UPDATE users
    SET
      xp = COALESCE(xp, 0) + v_action.points_value,
      total_points_earned = COALESCE(total_points_earned, 0) + v_action.points_value,
      current_points_balance = COALESCE(current_points_balance, 0) + v_action.points_value,
      updated_at = NOW()
    WHERE privy_id = p_user_id;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_points_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE users
    SET
      xp = COALESCE(xp, 0) + NEW.points_amount,
      total_points_earned = CASE
        WHEN NEW.transaction_type IN ('earn', 'bonus')
        THEN COALESCE(total_points_earned, 0) + NEW.points_amount
        ELSE total_points_earned
      END,
      total_points_spent = CASE
        WHEN NEW.transaction_type IN ('spend', 'penalty')
        THEN COALESCE(total_points_spent, 0) + ABS(NEW.points_amount)
        ELSE total_points_spent
      END,
      current_points_balance = COALESCE(current_points_balance, 0) + NEW.points_amount,
      updated_at = NOW()
    WHERE privy_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_points
  AFTER INSERT OR UPDATE OF status ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_from_transaction();

CREATE OR REPLACE FUNCTION track_daily_activity(
  p_user_id TEXT,
  p_activity_type TEXT
) RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO daily_activity_tracking (user_id, activity_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  CASE p_activity_type
    WHEN 'app_open' THEN
      UPDATE daily_activity_tracking
      SET
        app_opened = true,
        app_opened_at = CASE WHEN app_opened_at IS NULL THEN NOW() ELSE app_opened_at END,
        updated_at = NOW()
      WHERE user_id = p_user_id AND activity_date = v_today;

    WHEN 'session_complete' THEN
      UPDATE daily_activity_tracking
      SET
        first_session_completed = CASE WHEN sessions_completed = 0 THEN true ELSE first_session_completed END,
        sessions_completed = sessions_completed + 1,
        updated_at = NOW()
      WHERE user_id = p_user_id AND activity_date = v_today;

    WHEN 'event_attend' THEN
      UPDATE daily_activity_tracking
      SET
        events_attended = events_attended + 1,
        updated_at = NOW()
      WHERE user_id = p_user_id AND activity_date = v_today;

    WHEN 'social_interact' THEN
      UPDATE daily_activity_tracking
      SET
        social_interactions = social_interactions + 1,
        updated_at = NOW()
      WHERE user_id = p_user_id AND activity_date = v_today;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE VIEW admin_points_overview AS
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

CREATE OR REPLACE VIEW admin_user_points_summary AS
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

CREATE OR REPLACE VIEW event_attendance_summary AS
SELECT
  e.id as event_id,
  e.title as event_name,
  e.start_date_time as start_date,
  e.end_date_time as end_date,
  COUNT(ea.id) as total_attendees,
  COUNT(CASE WHEN ea.checked_in THEN 1 END) as checked_in_count,
  COUNT(CASE WHEN ea.attendance_verified THEN 1 END) as verified_count,
  AVG(ea.duration_minutes) as avg_duration_minutes,
  SUM(ea.points_earned) as total_points_awarded,
  AVG(ea.points_earned) as avg_points_per_attendee
FROM events e
LEFT JOIN event_attendance ea ON e.id = ea.event_id
GROUP BY e.id, e.title, e.start_date_time, e.end_date_time;

INSERT INTO point_actions (action_key, action_name, description, points_value, category, max_per_day) VALUES
('daily_app_open', 'Daily App Open', 'Open the app for the first time each day', 5, 'activity', 1),
('first_session_daily', 'First Dance Session Today', 'Complete your first dance session of the day', 10, 'activity', 1),
('session_complete', 'Dance Session Complete', 'Complete any dance session', 5, 'activity', 10),
('high_score_session', 'High Score Session', 'Achieve a movement score above 80', 15, 'activity', 5),
('social_share', 'Share on Social Media', 'Share your dance session on social media', 10, 'social', 3),
('comment_post', 'Comment on Post', 'Leave a comment on a community post', 2, 'social', 20),
('create_post', 'Create Post', 'Share a post in the community feed', 5, 'social', 5),
('event_signup', 'Event Registration', 'Sign up for a dance event', 10, 'event', NULL),
('paid_event_signup', 'Paid Event Registration', 'Register for a paid dance event', 25, 'event', NULL),
('event_attend_checkin', 'Event Check-In', 'Check in to a dance event', 15, 'event', NULL),
('event_attend_30min', 'Event 30 Min Attendance', 'Stay at an event for at least 30 minutes', 20, 'event', NULL),
('event_attend_60min', 'Event 60 Min Attendance', 'Stay at an event for at least 60 minutes', 35, 'event', NULL),
('event_attend_complete', 'Event Full Attendance', 'Stay at an event for the full duration', 50, 'event', NULL),
('referral_complete', 'Referral Completed', 'Friend completes their first dance session', 20, 'referral', NULL),
('referral_friend_event', 'Referred Friend Attends Event', 'Bonus points when your referred friend attends an event', 15, 'referral', NULL),
('referral_friend_paid_event', 'Referred Friend Paid Event', 'Bonus points when your referred friend attends a paid event', 30, 'referral', NULL),
('referral_milestone_5', 'Referral Milestone: 5 Friends', 'Bonus for referring 5 friends who attended events', 100, 'referral', NULL),
('referral_milestone_10', 'Referral Milestone: 10 Friends', 'Bonus for referring 10 friends who attended events', 250, 'referral', NULL),
('achievement_unlock', 'Achievement Unlocked', 'Unlock any achievement', 10, 'achievement', NULL),
('streak_7days', '7 Day Streak', 'Maintain a 7 day dance streak', 50, 'achievement', NULL),
('streak_30days', '30 Day Streak', 'Maintain a 30 day dance streak', 200, 'achievement', NULL),
('admin_bonus', 'Admin Bonus', 'Manual bonus points from admin', 0, 'admin', NULL),
('admin_penalty', 'Admin Penalty', 'Manual penalty from admin', 0, 'admin', NULL)
ON CONFLICT (action_key) DO NOTHING;

CREATE OR REPLACE FUNCTION award_referrer_on_friend_event()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id TEXT;
  v_is_paid_event BOOLEAN;
  v_referral_count INTEGER;
BEGIN
  IF NEW.checked_in = true AND (OLD.checked_in IS NULL OR OLD.checked_in = false) THEN
    SELECT referred_by INTO v_referrer_id
    FROM users
    WHERE privy_id = NEW.user_id;

    IF v_referrer_id IS NOT NULL THEN
      SELECT
        CASE
          WHEN e.price IS NOT NULL AND e.price > 0 THEN true
          ELSE false
        END INTO v_is_paid_event
      FROM events e
      WHERE e.id = NEW.event_id;

      IF v_is_paid_event THEN
        PERFORM award_points(
          p_user_id := v_referrer_id,
          p_action_key := 'referral_friend_paid_event',
          p_reference_id := NEW.id,
          p_reference_type := 'event',
          p_metadata := jsonb_build_object(
            'referee_id', NEW.user_id,
            'event_id', NEW.event_id,
            'event_type', 'paid'
          )
        );
      ELSE
        PERFORM award_points(
          p_user_id := v_referrer_id,
          p_action_key := 'referral_friend_event',
          p_reference_id := NEW.id,
          p_reference_type := 'event',
          p_metadata := jsonb_build_object(
            'referee_id', NEW.user_id,
            'event_id', NEW.event_id,
            'event_type', 'free'
          )
        );
      END IF;

      SELECT COUNT(DISTINCT ea.id) INTO v_referral_count
      FROM event_attendance ea
      INNER JOIN users u ON ea.user_id = u.privy_id
      WHERE u.referred_by = v_referrer_id
        AND ea.checked_in = true;

      IF v_referral_count = 5 THEN
        PERFORM award_points(
          p_user_id := v_referrer_id,
          p_action_key := 'referral_milestone_5',
          p_reference_type := 'achievement',
          p_metadata := jsonb_build_object('milestone', 5, 'type', 'event_attendance')
        );
      ELSIF v_referral_count = 10 THEN
        PERFORM award_points(
          p_user_id := v_referrer_id,
          p_action_key := 'referral_milestone_10',
          p_reference_type := 'achievement',
          p_metadata := jsonb_build_object('milestone', 10, 'type', 'event_attendance')
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_award_referrer_on_friend_event ON event_attendance;
CREATE TRIGGER trigger_award_referrer_on_friend_event
  AFTER INSERT OR UPDATE OF checked_in ON event_attendance
  FOR EACH ROW
  EXECUTE FUNCTION award_referrer_on_friend_event();

ALTER TABLE point_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY point_actions_select_all ON point_actions
  FOR SELECT
  USING (true);

CREATE POLICY point_actions_admin_all ON point_actions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND is_admin = true
    )
  );

CREATE POLICY point_transactions_select_own ON point_transactions
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY point_transactions_admin_all ON point_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND is_admin = true
    )
  );

CREATE POLICY daily_activity_select_own ON daily_activity_tracking
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY daily_activity_admin_all ON daily_activity_tracking
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND is_admin = true
    )
  );

CREATE POLICY event_attendance_select_own ON event_attendance
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY event_attendance_admin_all ON event_attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_id = auth.uid()::text
        AND is_admin = true
    )
  );

GRANT ALL ON public.point_actions TO service_role;
GRANT ALL ON public.point_transactions TO service_role;
GRANT ALL ON public.daily_activity_tracking TO service_role;
GRANT ALL ON public.event_attendance TO service_role;

GRANT SELECT ON public.point_actions TO authenticated;
GRANT SELECT ON public.point_transactions TO authenticated;
GRANT SELECT ON public.daily_activity_tracking TO authenticated;
GRANT SELECT ON public.event_attendance TO authenticated;

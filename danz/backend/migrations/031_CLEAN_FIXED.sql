CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT referral_codes_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes USING btree (code);
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes USING btree (user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referee_id TEXT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  signed_up_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  device_id TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT referrals_referral_code_fkey FOREIGN KEY (referral_code) REFERENCES referral_codes(code) ON DELETE CASCADE,
  CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'signed_up', 'completed', 'expired', 'fraudulent')),
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referee_id)
);

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);
CREATE INDEX idx_referrals_referee ON public.referrals USING btree (referee_id);
CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);
CREATE INDEX idx_referrals_status ON public.referrals USING btree (status);
CREATE INDEX idx_referrals_clicked_at ON public.referrals USING btree (clicked_at DESC);
CREATE UNIQUE INDEX idx_referrals_unique_referee ON public.referrals (referee_id) WHERE referee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 20,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  CONSTRAINT referral_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT referral_rewards_unique_referral UNIQUE (referral_id, user_id)
);

CREATE INDEX idx_referral_rewards_user ON public.referral_rewards USING btree (user_id);
CREATE INDEX idx_referral_rewards_referral ON public.referral_rewards USING btree (referral_id);

CREATE TABLE IF NOT EXISTS public.referral_click_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  device_id TEXT,
  device_type TEXT,
  country_code TEXT,
  city TEXT,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT referral_click_tracking_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_click_tracking_code ON public.referral_click_tracking USING btree (referral_code);
CREATE INDEX idx_click_tracking_clicked_at ON public.referral_click_tracking USING btree (clicked_at DESC);
CREATE INDEX idx_click_tracking_ip ON public.referral_click_tracking USING btree (ip_address);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_points_earned INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_referred_by_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_referred_by_fkey
      FOREIGN KEY (referred_by) REFERENCES users(username) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users USING btree (referred_by);

CREATE OR REPLACE FUNCTION create_referral_code_on_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL AND (OLD.username IS NULL OR OLD.username != NEW.username) THEN
    INSERT INTO referral_codes (user_id, code)
    VALUES (NEW.privy_id, NEW.username)
    ON CONFLICT (user_id)
    DO UPDATE SET
      code = EXCLUDED.code,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_referrer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE users
    SET
      referral_count = referral_count + 1,
      referral_points_earned = referral_points_earned + 20,
      xp = COALESCE(xp, 0) + 20
    WHERE privy_id = NEW.referrer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_referral_fraud(
  p_referrer_id TEXT,
  p_ip_address TEXT,
  p_device_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_same_ip_count INTEGER;
  v_same_device_count INTEGER;
  v_recent_referrals_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_same_ip_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND ip_address = p_ip_address
    AND clicked_at > NOW() - INTERVAL '24 hours';

  IF v_same_ip_count >= 3 THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO v_same_device_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND device_id = p_device_id
    AND clicked_at > NOW() - INTERVAL '7 days';

  IF v_same_device_count >= 2 THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO v_recent_referrals_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND clicked_at > NOW() - INTERVAL '1 hour';

  IF v_recent_referrals_count >= 5 THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION expire_old_referrals()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE referrals
  SET status = 'expired',
      updated_at = CURRENT_TIMESTAMP
  WHERE status = 'pending'
    AND clicked_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_referral_code ON users;
CREATE TRIGGER trigger_create_referral_code
  AFTER UPDATE OF username ON users
  FOR EACH ROW
  WHEN (NEW.username IS NOT NULL)
  EXECUTE FUNCTION create_referral_code_on_username();

DROP TRIGGER IF EXISTS trigger_update_referrer_stats ON referrals;
CREATE TRIGGER trigger_update_referrer_stats
  AFTER UPDATE OF status ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrer_stats();

DROP TRIGGER IF EXISTS trigger_update_referrals_timestamp ON referrals;
CREATE TRIGGER trigger_update_referrals_timestamp
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE VIEW referral_fraud_alerts AS
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

CREATE OR REPLACE VIEW referral_performance AS
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
  ) as conversion_rate,
  u.referral_points_earned
FROM referral_codes rc
JOIN users u ON rc.user_id = u.privy_id
LEFT JOIN referrals r ON rc.code = r.referral_code
GROUP BY rc.code, rc.user_id, u.username, u.referral_points_earned;

INSERT INTO referral_codes (user_id, code, created_at)
SELECT
  privy_id,
  username,
  CURRENT_TIMESTAMP
FROM users
WHERE username IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_codes_select_own ON referral_codes
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY referrals_select_own ON referrals
  FOR SELECT
  USING (auth.uid()::text = referrer_id OR auth.uid()::text = referee_id);

CREATE POLICY referrals_insert_public ON referrals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY referral_rewards_select_own ON referral_rewards
  FOR SELECT
  USING (auth.uid()::text = user_id);

GRANT ALL ON public.referral_codes TO service_role;
GRANT ALL ON public.referrals TO service_role;
GRANT ALL ON public.referral_rewards TO service_role;
GRANT ALL ON public.referral_click_tracking TO service_role;

GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referrals TO authenticated;
GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT INSERT ON public.referrals TO authenticated;
GRANT INSERT ON public.referral_click_tracking TO authenticated;

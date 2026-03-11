-- ============================================================================
-- 017: Products, subscriptions, and pricing tiers
-- ============================================================================

-- Product catalog
CREATE TABLE IF NOT EXISTS flowb_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('one_time', 'subscription', 'consumable')),
  category TEXT NOT NULL CHECK (category IN ('boost', 'agent', 'skill', 'premium', 'enterprise', 'custom')),

  -- Pricing
  base_price_usdc NUMERIC(12,6) NOT NULL,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  telegram_stars_price INTEGER,

  -- Subscription details (for recurring products)
  billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly', 'weekly')),
  trial_days INTEGER DEFAULT 0,

  -- Features and metadata
  features JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Display
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,

  -- For business users (biz flow purpose)
  biz_only BOOLEAN DEFAULT false,

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS flowb_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES flowb_products(id),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),

  -- Payment details
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'crypto', 'telegram_stars', 'apple_pay')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  -- Period tracking
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,

  -- Usage tracking (for consumable products)
  usage_count INTEGER DEFAULT 0,
  usage_limit INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active subscription per product per user
  UNIQUE(user_id, product_id)
);

-- User purchased products (one-time purchases)
CREATE TABLE IF NOT EXISTS flowb_user_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES flowb_products(id),
  order_id UUID,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, product_id, order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON flowb_products(category) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_products_featured ON flowb_products(featured, sort_order) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON flowb_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON flowb_subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON flowb_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_products_user ON flowb_user_products(user_id);

-- RLS
ALTER TABLE flowb_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_products" ON flowb_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_subscriptions" ON flowb_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_user_products" ON flowb_user_products FOR ALL USING (true) WITH CHECK (true);

-- Insert default products
INSERT INTO flowb_products (slug, name, description, product_type, category, base_price_usdc, telegram_stars_price, features, icon, sort_order) VALUES
  -- Boosts
  ('event-boost-basic', 'Event Boost - Basic', 'Promote your event to 500 more users for 24 hours', 'one_time', 'boost', 5.00, 250, '["500 additional impressions", "24h promotion", "Basic analytics"]', 'rocket', 1),
  ('event-boost-pro', 'Event Boost - Pro', 'Promote your event to 2000 users with featured placement', 'one_time', 'boost', 15.00, 750, '["2000 additional impressions", "Featured placement", "48h promotion", "Detailed analytics"]', 'rocket', 2),
  ('event-boost-mega', 'Event Boost - Mega', 'Maximum visibility with push notifications', 'one_time', 'boost', 50.00, 2500, '["10000 additional impressions", "Featured + pinned", "72h promotion", "Push notification blast", "Premium analytics"]', 'rocket', 3),

  -- Agent
  ('flowb-agent-monthly', 'FlowB Agent', 'Personal AI assistant for event discovery and networking', 'subscription', 'agent', 9.99, 500, '["Personalized recommendations", "Smart scheduling", "Networking suggestions", "Event reminders", "Priority support"]', 'robot', 10),

  -- Agent Skills
  ('skill-crypto-insights', 'Crypto Insights Skill', 'Add crypto price alerts and DeFi tracking to your agent', 'one_time', 'skill', 4.99, 250, '["Real-time price alerts", "DeFi protocol tracking", "Portfolio insights", "Token launch alerts"]', 'chart', 20),
  ('skill-pro-networking', 'Pro Networking Skill', 'Advanced networking features for business connections', 'one_time', 'skill', 7.99, 400, '["Contact recommendations", "Follow-up reminders", "Connection scoring", "Meeting scheduler", "CRM sync"]', 'users', 21),
  ('skill-event-intel', 'Event Intel Skill', 'Deep insights into events before attending', 'one_time', 'skill', 6.99, 350, '["Attendee analytics", "Speaker backgrounds", "Similar events", "Optimal arrival times"]', 'eye', 22),

  -- Premium
  ('premium-monthly', 'FlowB Premium', 'Full access to all premium features', 'subscription', 'premium', 19.99, 1000, '["Ad-free experience", "Priority event access", "Exclusive content", "FlowB Agent included", "All skills included", "Premium badge", "Early access to new features"]', 'crown', 30),
  ('premium-yearly', 'FlowB Premium (Yearly)', 'Save 20% with annual subscription', 'subscription', 'premium', 191.88, 9600, '["Everything in Premium", "2 months free", "Priority support", "Custom agent training"]', 'crown', 31),

  -- Enterprise / Biz
  ('enterprise-starter', 'Enterprise Starter', 'For small teams and startups', 'subscription', 'enterprise', 99.99, NULL, '["Up to 10 team members", "Team analytics dashboard", "Lead tracking", "Event ROI metrics", "Dedicated support"]', 'building', 40),
  ('enterprise-pro', 'Enterprise Pro', 'For growing businesses', 'subscription', 'enterprise', 299.99, NULL, '["Up to 50 team members", "Advanced analytics", "API access", "Custom integrations", "Account manager", "Onboarding training"]', 'building', 41)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_price_usdc = EXCLUDED.base_price_usdc,
  telegram_stars_price = EXCLUDED.telegram_stars_price,
  features = EXCLUDED.features,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Mark enterprise products as biz_only
UPDATE flowb_products SET biz_only = true WHERE category = 'enterprise';

-- Helper function to check if user has active subscription/product
CREATE OR REPLACE FUNCTION user_has_product(p_user_id TEXT, p_product_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_product_id UUID;
  v_has_subscription BOOLEAN;
  v_has_purchase BOOLEAN;
BEGIN
  SELECT id INTO v_product_id FROM flowb_products WHERE slug = p_product_slug AND active = true;
  IF v_product_id IS NULL THEN RETURN false; END IF;

  -- Check subscriptions
  SELECT EXISTS(
    SELECT 1 FROM flowb_subscriptions
    WHERE user_id = p_user_id AND product_id = v_product_id
    AND status IN ('active', 'trialing') AND current_period_end > now()
  ) INTO v_has_subscription;

  IF v_has_subscription THEN RETURN true; END IF;

  -- Check one-time purchases
  SELECT EXISTS(
    SELECT 1 FROM flowb_user_products
    WHERE user_id = p_user_id AND product_id = v_product_id
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_purchase;

  RETURN v_has_purchase;
END;
$$ LANGUAGE plpgsql;

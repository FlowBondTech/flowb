-- Migration: Feature Inventory and Dev Alerts System
-- Date: 2025-12-12
-- Description: Creates tables for tracking feature implementation status and dev user alerts

-- ================================================
-- 1. Feature Inventory Table
-- Tracks implementation status of all platform features
-- ================================================

CREATE TABLE IF NOT EXISTS feature_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feature identification
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  -- Categorization
  category VARCHAR(50) NOT NULL
    CHECK (category IN (
      'user_management', 'events', 'social', 'payments',
      'referral', 'dance_sessions', 'notifications',
      'admin', 'developer', 'miniapps', 'analytics', 'integrations'
    )),

  -- Implementation status
  status VARCHAR(30) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'planned', 'in_progress', 'partially_implemented', 'implemented', 'needs_refactor')),

  -- Completion tracking (0-100)
  completion_percentage INT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Priority for development
  priority VARCHAR(20) DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low', 'nice_to_have')),

  -- Technical details
  backend_status VARCHAR(30) DEFAULT 'not_started'
    CHECK (backend_status IN ('not_started', 'partial', 'complete')),
  frontend_status VARCHAR(30) DEFAULT 'not_started'
    CHECK (frontend_status IN ('not_started', 'partial', 'complete')),
  database_status VARCHAR(30) DEFAULT 'not_started'
    CHECK (database_status IN ('not_started', 'partial', 'complete')),

  -- Documentation
  api_docs_url VARCHAR(500),
  related_files TEXT[], -- Array of file paths
  dependencies TEXT[], -- Array of feature slugs this depends on
  notes TEXT,

  -- Miniapp relevance
  is_miniapp_ready BOOLEAN DEFAULT false,
  miniapp_api_available BOOLEAN DEFAULT false,

  -- Metadata
  estimated_hours INT,
  actual_hours INT,
  target_version VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feature_inventory
CREATE INDEX IF NOT EXISTS idx_feature_inventory_category ON feature_inventory(category);
CREATE INDEX IF NOT EXISTS idx_feature_inventory_status ON feature_inventory(status);
CREATE INDEX IF NOT EXISTS idx_feature_inventory_priority ON feature_inventory(priority);
CREATE INDEX IF NOT EXISTS idx_feature_inventory_slug ON feature_inventory(slug);
CREATE INDEX IF NOT EXISTS idx_feature_inventory_miniapp ON feature_inventory(is_miniapp_ready);

-- ================================================
-- 2. Dev Alerts Table
-- Notifications for dev/admin users
-- ================================================

CREATE TABLE IF NOT EXISTS dev_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert content
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,

  -- Alert type
  alert_type VARCHAR(30) NOT NULL DEFAULT 'info'
    CHECK (alert_type IN ('info', 'warning', 'error', 'critical', 'success', 'system')),

  -- Categorization
  category VARCHAR(50) NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'general', 'deployment', 'security', 'performance',
      'database', 'api', 'payment', 'user_report', 'feature_request', 'system'
    )),

  -- Targeting
  target_roles TEXT[] DEFAULT ARRAY['dev', 'admin'], -- Which roles should see this
  target_users TEXT[], -- Specific user privy_ids (null = all matching roles)

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_actionable BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  action_label VARCHAR(50),

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Source tracking
  source_type VARCHAR(50), -- 'system', 'user_report', 'webhook', 'cron', etc.
  source_id VARCHAR(200), -- Reference to related entity

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dev_alerts
CREATE INDEX IF NOT EXISTS idx_dev_alerts_type ON dev_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_category ON dev_alerts(category);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_priority ON dev_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_created_at ON dev_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_is_read ON dev_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_expires ON dev_alerts(expires_at);

-- ================================================
-- 3. Dev Alert Read Status Table
-- Tracks which users have read which alerts
-- ================================================

CREATE TABLE IF NOT EXISTS dev_alert_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES dev_alerts(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,

  UNIQUE(alert_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_alert_reads_alert ON dev_alert_reads(alert_id);
CREATE INDEX IF NOT EXISTS idx_dev_alert_reads_user ON dev_alert_reads(user_id);

-- ================================================
-- 4. Triggers for updated_at
-- ================================================

DROP TRIGGER IF EXISTS update_feature_inventory_updated_at ON feature_inventory;
CREATE TRIGGER update_feature_inventory_updated_at
  BEFORE UPDATE ON feature_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dev_alerts_updated_at ON dev_alerts;
CREATE TRIGGER update_dev_alerts_updated_at
  BEFORE UPDATE ON dev_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 5. Row Level Security
-- ================================================

ALTER TABLE feature_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_alert_reads ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_feature_inventory" ON feature_inventory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dev_alerts" ON dev_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dev_alert_reads" ON dev_alert_reads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- 6. Initial Feature Inventory Data
-- Based on current implementation analysis
-- ================================================

-- User Management Features (95% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('User Authentication', 'user-auth', 'Privy-based authentication with wallet and email support', 'user_management', 'implemented', 95, 'complete', 'complete', 'complete', true, true, 'critical', 'Core feature, fully implemented'),
('User Profile Management', 'user-profile', 'Profile creation, updates, avatar management', 'user_management', 'implemented', 95, 'complete', 'complete', 'complete', true, true, 'critical', 'Includes bio, location, dance styles'),
('User Stats Tracking', 'user-stats', 'Dance sessions, events attended, achievements tracking', 'user_management', 'implemented', 90, 'complete', 'complete', 'complete', true, true, 'high', 'Real-time stats updates'),
('User Role Management', 'user-roles', 'Role-based access (user, organizer, manager, dev, admin)', 'user_management', 'implemented', 95, 'complete', 'complete', 'complete', false, false, 'critical', 'Full RBAC implementation')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Events Features (90% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Event Creation', 'event-creation', 'Full event creation with all fields', 'events', 'implemented', 95, 'complete', 'complete', 'complete', true, true, 'critical', 'Supports all event types'),
('Event Registration', 'event-registration', 'User registration/RSVP system', 'events', 'implemented', 95, 'complete', 'complete', 'complete', true, true, 'critical', 'Includes waitlist support'),
('Event Discovery', 'event-discovery', 'Browse, search, filter events', 'events', 'implemented', 90, 'complete', 'complete', 'complete', true, true, 'critical', 'Location-based discovery'),
('Recurring Events', 'recurring-events', 'Support for recurring event patterns', 'events', 'partially_implemented', 60, 'complete', 'partial', 'complete', false, true, 'high', 'Backend ready, UI needs work'),
('Event Check-in', 'event-checkin', 'QR code based check-in system', 'events', 'partially_implemented', 40, 'partial', 'partial', 'partial', false, false, 'medium', 'Basic implementation exists')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Payments Features (85% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Stripe Subscriptions', 'stripe-subscriptions', 'Premium subscription management', 'payments', 'implemented', 95, 'complete', 'complete', 'complete', false, false, 'critical', 'Full lifecycle management'),
('Billing Portal', 'billing-portal', 'Stripe customer billing portal', 'payments', 'implemented', 95, 'complete', 'complete', 'complete', false, false, 'high', 'Self-service management'),
('Subscription History', 'subscription-history', 'Track subscription changes and payments', 'payments', 'implemented', 90, 'complete', 'partial', 'complete', false, false, 'medium', 'Logging implemented'),
('Event Payments', 'event-payments', 'Pay for paid events', 'payments', 'not_started', 0, 'not_started', 'not_started', 'partial', false, false, 'high', 'Schema ready, logic needed')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Social Features (70% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Social Feed', 'social-feed', 'Activity feed and posts', 'social', 'partially_implemented', 70, 'complete', 'partial', 'complete', true, true, 'high', 'Backend complete, UI in progress'),
('Dance Bonds', 'dance-bonds', 'User connections and follow system', 'social', 'partially_implemented', 50, 'partial', 'partial', 'complete', true, true, 'medium', 'Basic implementation'),
('User Search', 'user-search', 'Find and discover other dancers', 'social', 'partially_implemented', 60, 'partial', 'partial', 'complete', true, true, 'medium', 'Basic search implemented'),
('Messaging', 'messaging', 'Direct messaging between users', 'social', 'not_started', 0, 'not_started', 'not_started', 'not_started', false, false, 'low', 'Future feature')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Referral System (90% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Referral Codes', 'referral-codes', 'Generate and share referral codes', 'referral', 'implemented', 95, 'complete', 'complete', 'complete', true, true, 'high', 'Unique code generation'),
('Referral Tracking', 'referral-tracking', 'Track referrals and conversions', 'referral', 'implemented', 90, 'complete', 'complete', 'complete', true, true, 'high', 'Full funnel tracking'),
('Referral Rewards', 'referral-rewards', 'Points/rewards for referrals', 'referral', 'partially_implemented', 60, 'partial', 'partial', 'complete', false, false, 'medium', 'Basic points system')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Dance Sessions (75% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Session Tracking', 'session-tracking', 'Log and track dance practice sessions', 'dance_sessions', 'partially_implemented', 75, 'complete', 'partial', 'complete', true, true, 'high', 'Backend complete'),
('Session Stats', 'session-stats', 'Statistics and analytics for sessions', 'dance_sessions', 'partially_implemented', 60, 'partial', 'partial', 'complete', true, true, 'medium', 'Basic stats available'),
('Freestyle Sessions', 'freestyle-sessions', 'Spontaneous dance session logging', 'dance_sessions', 'partially_implemented', 50, 'partial', 'partial', 'partial', true, false, 'medium', 'Needs UI polish')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Notifications (60% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('In-App Notifications', 'in-app-notifications', 'Real-time in-app notification system', 'notifications', 'partially_implemented', 70, 'complete', 'partial', 'complete', false, true, 'high', 'Polling-based, needs real-time'),
('Discord Webhooks', 'discord-webhooks', 'Platform event notifications to Discord', 'notifications', 'implemented', 95, 'complete', 'complete', 'complete', false, false, 'medium', 'Full webhook coverage'),
('Email Notifications', 'email-notifications', 'Transactional email system', 'notifications', 'not_started', 0, 'not_started', 'not_started', 'not_started', false, false, 'medium', 'Planned feature'),
('Push Notifications', 'push-notifications', 'Mobile push notification support', 'notifications', 'not_started', 0, 'not_started', 'not_started', 'not_started', false, false, 'medium', 'Mobile app feature')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Admin Features (80% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Admin Dashboard', 'admin-dashboard', 'Platform statistics and overview', 'admin', 'implemented', 90, 'complete', 'complete', 'complete', false, false, 'critical', 'Comprehensive stats'),
('User Management Admin', 'admin-user-management', 'Manage users, roles, bans', 'admin', 'implemented', 85, 'complete', 'partial', 'complete', false, false, 'critical', 'Core admin feature'),
('Event Management Admin', 'admin-event-management', 'Manage and moderate events', 'admin', 'partially_implemented', 70, 'partial', 'partial', 'complete', false, false, 'high', 'Basic implementation'),
('Points Management', 'admin-points', 'Manage user points and rewards', 'admin', 'implemented', 90, 'complete', 'complete', 'complete', false, false, 'high', 'Full CRUD'),
('Organizer Applications', 'organizer-applications', 'Review and approve organizer requests', 'admin', 'partially_implemented', 60, 'partial', 'partial', 'complete', false, false, 'high', 'Basic workflow exists')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Developer Features (85% complete)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Feature Requests', 'feature-requests', 'User feature request and voting system', 'developer', 'implemented', 95, 'complete', 'complete', 'complete', false, false, 'high', 'Full voting system'),
('Dev Tasks', 'dev-tasks', 'Kanban task management for development', 'developer', 'implemented', 90, 'complete', 'complete', 'complete', false, false, 'high', 'Sprint support'),
('Changelog', 'changelog', 'Version changelog tracking', 'developer', 'implemented', 90, 'complete', 'complete', 'complete', false, false, 'medium', 'Public/private entries'),
('GitHub Integration', 'github-integration', 'GitHub API integration for commits, PRs', 'developer', 'implemented', 85, 'complete', 'complete', 'complete', false, false, 'medium', 'Cached API calls'),
('System Health', 'system-health', 'System health monitoring', 'developer', 'implemented', 80, 'complete', 'complete', 'complete', false, false, 'high', 'Basic health checks'),
('Feature Inventory', 'feature-inventory', 'Track all platform feature implementation', 'developer', 'in_progress', 50, 'partial', 'not_started', 'partial', false, false, 'medium', 'This feature!'),
('Dev Alerts', 'dev-alerts', 'Alert system for dev/admin users', 'developer', 'in_progress', 50, 'partial', 'not_started', 'partial', false, false, 'medium', 'Being implemented')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Mini-App Platform (Planned)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('Mini-App SDK', 'miniapp-sdk', 'SDK for building mini-apps', 'miniapps', 'planned', 10, 'partial', 'not_started', 'not_started', false, false, 'high', 'Architecture planned'),
('Mini-App Store', 'miniapp-store', 'Marketplace for mini-apps', 'miniapps', 'not_started', 0, 'not_started', 'not_started', 'not_started', false, false, 'medium', 'Future feature'),
('Mini-App Authentication', 'miniapp-auth', 'OAuth for mini-app access', 'miniapps', 'not_started', 0, 'not_started', 'not_started', 'not_started', false, false, 'high', 'Needed for SDK')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- Analytics (Planned)
INSERT INTO feature_inventory (name, slug, description, category, status, completion_percentage, backend_status, frontend_status, database_status, is_miniapp_ready, miniapp_api_available, priority, notes) VALUES
('User Analytics', 'user-analytics', 'User behavior and engagement analytics', 'analytics', 'not_started', 0, 'not_started', 'not_started', 'not_started', false, false, 'medium', 'Planned'),
('Event Analytics', 'event-analytics', 'Event performance analytics', 'analytics', 'not_started', 0, 'not_started', 'not_started', 'not_started', false, false, 'medium', 'Planned'),
('Platform Metrics', 'platform-metrics', 'Overall platform health metrics', 'analytics', 'partially_implemented', 40, 'partial', 'partial', 'partial', false, false, 'medium', 'Basic stats exist')
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  completion_percentage = EXCLUDED.completion_percentage,
  updated_at = NOW();

-- ================================================
-- 7. Initial System Alert
-- ================================================

INSERT INTO dev_alerts (title, message, alert_type, category, priority, is_actionable, action_url, action_label, source_type)
VALUES (
  'Feature Inventory System Deployed',
  'The feature inventory and dev alerts system has been deployed. You can now track feature implementation status and receive system alerts.',
  'success',
  'system',
  'normal',
  true,
  '/dashboard/admin/dev?tab=features',
  'View Features',
  'system'
);

-- ================================================
-- Done!
-- ================================================

COMMENT ON TABLE feature_inventory IS 'Tracks implementation status of all platform features';
COMMENT ON TABLE dev_alerts IS 'Notification system for dev and admin users';
COMMENT ON TABLE dev_alert_reads IS 'Tracks alert read status per user';

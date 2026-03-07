-- ============================================================================
-- 027: FlowB Business Platform
-- Adds: referrals, automations, billing, notification upgrades, meeting enhancements
-- ============================================================================

-- ============================================================================
-- 1. Meeting Enhancements (extends 024_meetings)
-- ============================================================================

-- Add new columns to meetings for business features
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS briefing_notes text;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS suggested_agenda text[];
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS action_items text[];
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS follow_up_status text DEFAULT 'none' CHECK (follow_up_status IN ('none','drafted','sent'));
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS follow_up_message text;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS outcome_notes text;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS crew_id uuid;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS event_id text;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS video_link text;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'in_person' CHECK (location_type IN ('in_person','video','phone','hybrid'));
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS recurrence jsonb;
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Relax status constraint to include more states
ALTER TABLE flowb_meetings DROP CONSTRAINT IF EXISTS flowb_meetings_status_check;
ALTER TABLE flowb_meetings ADD CONSTRAINT flowb_meetings_status_check
  CHECK (status IN ('draft','scheduled','confirmed','in_progress','completed','cancelled'));

-- Relax meeting_type constraint
ALTER TABLE flowb_meetings DROP CONSTRAINT IF EXISTS flowb_meetings_meeting_type_check;
ALTER TABLE flowb_meetings ADD CONSTRAINT flowb_meetings_meeting_type_check
  CHECK (meeting_type IN ('coffee','call','lunch','workshop','demo','one_on_one','group','standup','pitch','other'));

-- Add platform/platform_id to attendees for cross-platform invite
ALTER TABLE flowb_meeting_attendees ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE flowb_meeting_attendees ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE flowb_meeting_attendees ADD COLUMN IF NOT EXISTS platform_id text;
ALTER TABLE flowb_meeting_attendees ADD COLUMN IF NOT EXISTS is_organizer boolean DEFAULT false;
ALTER TABLE flowb_meeting_attendees ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE flowb_meeting_attendees ADD COLUMN IF NOT EXISTS rsvp_at timestamptz;

-- Meeting notes table (separate from chat messages)
CREATE TABLE IF NOT EXISTS flowb_meeting_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    uuid NOT NULL REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  author_id     text NOT NULL,
  content       text NOT NULL,
  note_type     text DEFAULT 'note' CHECK (note_type IN ('note','action_item','decision','question')),
  is_ai_generated boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting ON flowb_meeting_notes(meeting_id);

ALTER TABLE flowb_meeting_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_meeting_notes" ON flowb_meeting_notes FOR ALL USING (true) WITH CHECK (true);

-- Add message_type to meeting messages
ALTER TABLE flowb_meeting_messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text','system','file','link','action_item'));
ALTER TABLE flowb_meeting_messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- ============================================================================
-- 2. Leads Enhancement (extends 025_flowb_leads_standalone)
-- ============================================================================

ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS score integer DEFAULT 0;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS probability numeric(5,2);
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS expected_close_date date;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS platform_id text;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS twitter text;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE flowb_leads ADD COLUMN IF NOT EXISTS meeting_stage text DEFAULT 'none' CHECK (meeting_stage IN ('none','suggested','scheduled','completed'));

-- Lead activity timeline
CREATE TABLE IF NOT EXISTS flowb_lead_activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid NOT NULL REFERENCES flowb_leads(id) ON DELETE CASCADE,
  user_id       text NOT NULL,
  activity_type text NOT NULL, -- stage_change, note_added, meeting_created, email_sent, call_logged, message_sent
  description   text,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON flowb_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created ON flowb_lead_activities(created_at);

ALTER TABLE flowb_lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_lead_activities" ON flowb_lead_activities FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. Referral & Commission System
-- ============================================================================

-- Referral programs (event organizers opt-in)
CREATE TABLE IF NOT EXISTS flowb_referral_programs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                text NOT NULL,
  organizer_id            text NOT NULL,
  commission_rate         numeric(5,4) NOT NULL DEFAULT 0.10,
  commission_type         text DEFAULT 'percentage' CHECK (commission_type IN ('percentage','fixed_amount')),
  fixed_amount            numeric(10,2),
  max_commission_per_ticket numeric(10,2),
  max_total_payout        numeric(10,2),
  total_paid_out          numeric(10,2) DEFAULT 0,
  is_active               boolean DEFAULT true,
  starts_at               timestamptz,
  expires_at              timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_programs_event ON flowb_referral_programs(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_programs_organizer ON flowb_referral_programs(organizer_id);

-- Engagement tracking (who did what with which event)
CREATE TABLE IF NOT EXISTS flowb_referral_engagement (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  event_id      text NOT NULL,
  crew_id       uuid,
  action        text NOT NULL CHECK (action IN ('rsvp_going','rsvp_maybe','share','chat_mention','view','comment','invite','checkin','social_post')),
  weight        integer NOT NULL CHECK (weight BETWEEN 1 AND 5),
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_engagement_user ON flowb_referral_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_engagement_event ON flowb_referral_engagement(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_engagement_crew ON flowb_referral_engagement(crew_id);

-- Referral links (trackable URLs)
CREATE TABLE IF NOT EXISTS flowb_referral_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      text NOT NULL,
  creator_id    text NOT NULL,
  crew_id       uuid,
  short_code    text UNIQUE NOT NULL,
  link_type     text DEFAULT 'event' CHECK (link_type IN ('event','ticket')),
  clicks        integer DEFAULT 0,
  conversions   integer DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_links_event ON flowb_referral_links(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_code ON flowb_referral_links(short_code);
CREATE INDEX IF NOT EXISTS idx_referral_links_creator ON flowb_referral_links(creator_id);

-- Click tracking
CREATE TABLE IF NOT EXISTS flowb_referral_clicks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id             uuid REFERENCES flowb_referral_links(id),
  visitor_id          text,
  visitor_fingerprint text,
  referrer_url        text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_link ON flowb_referral_clicks(link_id);

-- Ticket sale commissions
CREATE TABLE IF NOT EXISTS flowb_referral_commissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      uuid REFERENCES flowb_referral_programs(id),
  event_id        text NOT NULL,
  ticket_ref      text NOT NULL,
  ticket_price    numeric(10,2) NOT NULL,
  total_commission numeric(10,2) NOT NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','verified','distributed','paid')),
  buyer_id        text,
  source_link_id  uuid REFERENCES flowb_referral_links(id),
  source_crew_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_event ON flowb_referral_commissions(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON flowb_referral_commissions(status);

-- Individual commission splits (per user per ticket)
CREATE TABLE IF NOT EXISTS flowb_referral_splits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id     uuid REFERENCES flowb_referral_commissions(id) ON DELETE CASCADE,
  user_id           text NOT NULL,
  engagement_weight numeric(5,2) NOT NULL,
  share_percentage  numeric(5,4) NOT NULL,
  amount            numeric(10,2) NOT NULL,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','credited','withdrawn')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_splits_user ON flowb_referral_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_splits_commission ON flowb_referral_splits(commission_id);

-- Payout ledger
CREATE TABLE IF NOT EXISTS flowb_referral_payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  amount          numeric(10,2) NOT NULL,
  payment_method  text NOT NULL CHECK (payment_method IN ('usdc_wallet','stripe','points_conversion','flowb_credit')),
  payment_ref     text,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_payouts_user ON flowb_referral_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_status ON flowb_referral_payouts(status);

-- RLS for all referral tables
ALTER TABLE flowb_referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_referral_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_referral_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srp_referral_programs" ON flowb_referral_programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_referral_engagement" ON flowb_referral_engagement FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_referral_links" ON flowb_referral_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_referral_clicks" ON flowb_referral_clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_referral_commissions" ON flowb_referral_commissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_referral_splits" ON flowb_referral_splits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_referral_payouts" ON flowb_referral_payouts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. Automation Engine
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_automations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  name            text NOT NULL,
  description     text,
  trigger_type    text NOT NULL CHECK (trigger_type IN ('schedule','event','lead_stage','meeting_complete','meeting_reminder','contact_inactive','referral_sale','manual')),
  trigger_config  jsonb NOT NULL DEFAULT '{}',  -- cron expression, conditions, etc.
  action_type     text NOT NULL CHECK (action_type IN ('send_message','create_meeting','update_lead','create_task','send_email','ai_suggestion','webhook')),
  action_config   jsonb NOT NULL DEFAULT '{}',  -- template, target, params
  is_active       boolean DEFAULT true,
  approval_mode   text DEFAULT 'auto' CHECK (approval_mode IN ('auto','ask_first')),
  max_per_day     integer DEFAULT 5,
  run_count       integer DEFAULT 0,
  last_run_at     timestamptz,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_user ON flowb_automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON flowb_automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_active ON flowb_automations(is_active) WHERE is_active = true;

-- Automation execution log
CREATE TABLE IF NOT EXISTS flowb_automation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id   uuid NOT NULL REFERENCES flowb_automations(id) ON DELETE CASCADE,
  trigger_data    jsonb DEFAULT '{}',
  action_data     jsonb DEFAULT '{}',
  status          text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','skipped','pending_approval')),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_log_automation ON flowb_automation_log(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_created ON flowb_automation_log(created_at);

ALTER TABLE flowb_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srp_automations" ON flowb_automations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_automation_log" ON flowb_automation_log FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at for automations
CREATE OR REPLACE FUNCTION update_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_automations_updated_at
  BEFORE UPDATE ON flowb_automations
  FOR EACH ROW EXECUTE FUNCTION update_automations_updated_at();

-- ============================================================================
-- 5. Billing / Subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             text NOT NULL UNIQUE,
  tier                text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','team','business')),
  stripe_customer_id  text,
  stripe_subscription_id text,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','cancelled','trialing')),
  current_period_start timestamptz,
  current_period_end  timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  team_size           integer DEFAULT 1,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON flowb_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON flowb_subscriptions(stripe_customer_id);

CREATE TABLE IF NOT EXISTS flowb_usage_tracking (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  feature         text NOT NULL, -- ai_chat, meetings, automations, leads, boards
  count           integer DEFAULT 1,
  period_start    date NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON flowb_usage_tracking(user_id, period_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_unique ON flowb_usage_tracking(user_id, feature, period_start);

ALTER TABLE flowb_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srp_subscriptions" ON flowb_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "srp_usage_tracking" ON flowb_usage_tracking FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. Notification System Upgrades
-- ============================================================================

-- Add priority + biz fields to sessions
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS biz_mode_enabled boolean DEFAULT false;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS primary_biz_channel text DEFAULT 'auto';
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS biz_quiet_hours_start integer DEFAULT 20;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS biz_quiet_hours_end integer DEFAULT 8;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS biz_daily_notification_limit integer DEFAULT 15;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS dnd_enabled boolean DEFAULT false;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS digest_frequency text DEFAULT 'daily';
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS connected_platforms text[] DEFAULT '{}';

-- Digest queue (for P2 batch messages)
CREATE TABLE IF NOT EXISTS flowb_digest_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  message_type  text NOT NULL,
  content       jsonb NOT NULL,
  priority      text DEFAULT 'p2' CHECK (priority IN ('p0','p1','p2')),
  is_biz        boolean DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_digest_queue_user ON flowb_digest_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_queue_unsent ON flowb_digest_queue(user_id) WHERE sent_at IS NULL;

ALTER TABLE flowb_digest_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srp_digest_queue" ON flowb_digest_queue FOR ALL USING (true) WITH CHECK (true);

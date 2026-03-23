-- Migration: Sponsorship Notification Preferences
-- Date: 2026-01-17
-- Description: Notification preferences and triggers for sponsorship system

-- ============================================================================
-- SPONSOR NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,

  -- Email preferences
  email_new_matching_events BOOLEAN DEFAULT true,
  email_sponsorship_updates BOOLEAN DEFAULT true,
  email_subscription_billing BOOLEAN DEFAULT true,
  email_weekly_digest BOOLEAN DEFAULT true,

  -- Push preferences
  push_new_matching_events BOOLEAN DEFAULT true,
  push_sponsorship_updates BOOLEAN DEFAULT true,
  push_budget_warnings BOOLEAN DEFAULT true,

  -- Frequency
  matching_events_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate/daily/weekly
  digest_day VARCHAR(10) DEFAULT 'monday',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sponsor_notification_prefs_unique UNIQUE (sponsor_id),
  CONSTRAINT sponsor_notification_frequency_check CHECK (
    matching_events_frequency IN ('immediate', 'daily', 'weekly')
  )
);

CREATE INDEX IF NOT EXISTS idx_sponsor_notification_prefs_sponsor ON public.sponsor_notification_preferences(sponsor_id);

-- ============================================================================
-- CREATOR SPONSORSHIP NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_sponsorship_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Sponsorship notifications
  notify_new_sponsorship BOOLEAN DEFAULT true,
  notify_sponsorship_approved BOOLEAN DEFAULT true,
  notify_goal_reached BOOLEAN DEFAULT true,
  notify_approval_expiring BOOLEAN DEFAULT true,

  -- Channel preferences
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT creator_sponsorship_notif_prefs_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_sponsorship_notif_prefs_user ON public.creator_sponsorship_notification_preferences(user_id);

-- ============================================================================
-- ADD SPONSORSHIP NOTIFICATION TYPES
-- ============================================================================

-- Insert new notification types for sponsorship system
INSERT INTO public.notification_types (type, description, category, default_enabled) VALUES
  ('sponsorship_received', 'New sponsorship request received', 'sponsorship', true),
  ('sponsorship_approved', 'Your sponsorship was approved', 'sponsorship', true),
  ('sponsorship_rejected', 'Your sponsorship was not accepted', 'sponsorship', true),
  ('sponsorship_goal_reached', 'Event reached sponsorship goal', 'sponsorship', true),
  ('new_matching_event', 'New event matches your preferences', 'sponsorship', true),
  ('payment_received', 'Payment received from sponsorship', 'sponsorship', true),
  ('subscription_renewal', 'Subscription renewal reminder', 'sponsorship', true),
  ('budget_warning', 'Sponsorship budget running low', 'sponsorship', true),
  ('event_complete_sponsor', 'Sponsored event completed', 'sponsorship', true),
  ('approval_expiring', 'Sponsorship approval expiring soon', 'sponsorship', true),
  ('swap_complete', 'FLOW to DANZ swap completed', 'sponsorship', true),
  ('withdrawal_complete', 'Withdrawal completed', 'sponsorship', true)
ON CONFLICT (type) DO NOTHING;

-- ============================================================================
-- NOTIFICATION HELPER FUNCTIONS
-- ============================================================================

-- Create notification for sponsorship events
CREATE OR REPLACE FUNCTION create_sponsorship_notification(
  p_user_id TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_data
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Notify sponsor of sponsorship status change
CREATE OR REPLACE FUNCTION notify_sponsor_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_sponsor RECORD;
  v_event RECORD;
  v_prefs RECORD;
BEGIN
  -- Get sponsor details
  SELECT s.*, u.privy_id as user_privy_id
  INTO v_sponsor
  FROM public.sponsors s
  JOIN public.users u ON s.user_id = u.privy_id
  WHERE s.id = NEW.sponsor_id;

  -- Get event details
  SELECT * INTO v_event FROM public.events WHERE id = NEW.event_id;

  -- Get notification preferences
  SELECT * INTO v_prefs
  FROM public.sponsor_notification_preferences
  WHERE sponsor_id = NEW.sponsor_id;

  -- Only notify if preferences allow
  IF v_prefs IS NULL OR v_prefs.push_sponsorship_updates THEN
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
      -- Sponsorship approved
      PERFORM create_sponsorship_notification(
        v_sponsor.user_id,
        'sponsorship_approved',
        'Sponsorship Approved!',
        format('Your %s $FLOW sponsorship for "%s" has been approved.', NEW.flow_amount, v_event.title),
        jsonb_build_object(
          'event_id', NEW.event_id,
          'event_title', v_event.title,
          'flow_amount', NEW.flow_amount,
          'sponsorship_id', NEW.id
        )
      );
    ELSIF NEW.status = 'completed' THEN
      -- Event completed
      PERFORM create_sponsorship_notification(
        v_sponsor.user_id,
        'event_complete_sponsor',
        'Sponsored Event Completed',
        format('"%s" has completed! Your sponsorship supported the event.', v_event.title),
        jsonb_build_object(
          'event_id', NEW.event_id,
          'event_title', v_event.title,
          'flow_distributed', NEW.flow_distributed,
          'sponsorship_id', NEW.id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_sponsor_status ON public.event_sponsorships;
CREATE TRIGGER trigger_notify_sponsor_status
  AFTER INSERT OR UPDATE OF status ON public.event_sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION notify_sponsor_status_change();

-- Notify event creator of new sponsorship
CREATE OR REPLACE FUNCTION notify_creator_new_sponsorship()
RETURNS TRIGGER AS $$
DECLARE
  v_event RECORD;
  v_sponsor RECORD;
  v_prefs RECORD;
BEGIN
  -- Get event with creator
  SELECT * INTO v_event FROM public.events WHERE id = NEW.event_id;

  -- Get sponsor details
  SELECT * INTO v_sponsor FROM public.sponsors WHERE id = NEW.sponsor_id;

  -- Get creator notification preferences
  SELECT * INTO v_prefs
  FROM public.creator_sponsorship_notification_preferences
  WHERE user_id = v_event.creator_id;

  -- Only notify if preferences allow
  IF v_prefs IS NULL OR v_prefs.notify_new_sponsorship THEN
    IF NEW.status = 'pending' THEN
      PERFORM create_sponsorship_notification(
        v_event.creator_id,
        'sponsorship_received',
        'New Sponsorship Request!',
        format('%s wants to sponsor "%s" with %s $FLOW', v_sponsor.company_name, v_event.title, NEW.flow_amount),
        jsonb_build_object(
          'event_id', NEW.event_id,
          'event_title', v_event.title,
          'sponsor_id', NEW.sponsor_id,
          'sponsor_name', v_sponsor.company_name,
          'sponsor_logo', v_sponsor.logo_url,
          'flow_amount', NEW.flow_amount,
          'visibility', NEW.visibility,
          'message', NEW.sponsor_message,
          'requires_approval', true,
          'sponsorship_id', NEW.id
        )
      );
    ELSIF NEW.status = 'active' AND OLD.status = 'pending' THEN
      -- Notify of activation (could be auto-approved)
      PERFORM create_sponsorship_notification(
        v_event.creator_id,
        'sponsorship_approved',
        'Sponsorship Activated',
        format('%s sponsorship of %s $FLOW is now active!', v_sponsor.company_name, NEW.flow_amount),
        jsonb_build_object(
          'event_id', NEW.event_id,
          'sponsor_name', v_sponsor.company_name,
          'flow_amount', NEW.flow_amount,
          'sponsorship_id', NEW.id
        )
      );
    END IF;
  END IF;

  -- Check if goal reached
  IF NEW.status = 'active' THEN
    DECLARE
      v_settings RECORD;
      v_total DECIMAL;
    BEGIN
      SELECT * INTO v_settings
      FROM public.event_sponsorship_settings
      WHERE event_id = NEW.event_id;

      IF v_settings IS NOT NULL AND v_settings.sponsorship_goal IS NOT NULL THEN
        v_total := get_event_total_sponsorship(NEW.event_id);

        IF v_total >= v_settings.sponsorship_goal THEN
          -- Check if already notified (could use a flag, for now just notify)
          IF v_prefs IS NULL OR v_prefs.notify_goal_reached THEN
            PERFORM create_sponsorship_notification(
              v_event.creator_id,
              'sponsorship_goal_reached',
              'Sponsorship Goal Reached!',
              format('"%s" has reached its sponsorship goal of %s $FLOW!', v_event.title, v_settings.sponsorship_goal),
              jsonb_build_object(
                'event_id', NEW.event_id,
                'event_title', v_event.title,
                'goal', v_settings.sponsorship_goal,
                'total', v_total
              )
            );
          END IF;
        END IF;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_creator_sponsorship ON public.event_sponsorships;
CREATE TRIGGER trigger_notify_creator_sponsorship
  AFTER INSERT OR UPDATE OF status ON public.event_sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_new_sponsorship();

-- Notify worker of payment received
CREATE OR REPLACE FUNCTION notify_worker_payment_received()
RETURNS TRIGGER AS $$
DECLARE
  v_event RECORD;
BEGIN
  IF NEW.transaction_type = 'gig_payment' AND NEW.status = 'completed'
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    SELECT * INTO v_event FROM public.events WHERE id = NEW.event_id;

    PERFORM create_sponsorship_notification(
      NEW.to_user_id,
      'payment_received',
      'Payment Received!',
      format('You received %s $FLOW for your work at "%s"', NEW.amount, COALESCE(v_event.title, 'event')),
      jsonb_build_object(
        'amount', NEW.amount,
        'event_id', NEW.event_id,
        'event_title', v_event.title,
        'transaction_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_payment_received ON public.flow_transactions;
CREATE TRIGGER trigger_notify_payment_received
  AFTER INSERT OR UPDATE OF status ON public.flow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_worker_payment_received();

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sponsor_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsor_notification_prefs_updated_at ON public.sponsor_notification_preferences;
CREATE TRIGGER trigger_sponsor_notification_prefs_updated_at
  BEFORE UPDATE ON public.sponsor_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsor_notification_prefs_updated_at();

CREATE OR REPLACE FUNCTION update_creator_sponsorship_notif_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_creator_sponsorship_notif_prefs_updated_at ON public.creator_sponsorship_notification_preferences;
CREATE TRIGGER trigger_creator_sponsorship_notif_prefs_updated_at
  BEFORE UPDATE ON public.creator_sponsorship_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_sponsorship_notif_prefs_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.sponsor_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_sponsorship_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Sponsors manage their own preferences
CREATE POLICY "sponsor_notif_prefs_own" ON public.sponsor_notification_preferences
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsor_id AND s.user_id = auth.uid()::text
  )
);

-- Creators manage their own preferences
CREATE POLICY "creator_sponsorship_notif_prefs_own" ON public.creator_sponsorship_notification_preferences
FOR ALL TO authenticated USING (user_id = auth.uid()::text);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.sponsor_notification_preferences TO authenticated;
GRANT ALL ON public.sponsor_notification_preferences TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.creator_sponsorship_notification_preferences TO authenticated;
GRANT ALL ON public.creator_sponsorship_notification_preferences TO service_role;

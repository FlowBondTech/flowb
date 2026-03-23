-- Migration: Add gig notification support
-- Date: 2025-01-17
-- Description: Adds gig-related fields to notifications and notification_preferences tables

-- ============================================================================
-- ADD GIG FIELDS TO NOTIFICATIONS TABLE
-- ============================================================================

-- Add gig_id column to notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS gig_id UUID REFERENCES public.event_gigs(id) ON DELETE SET NULL;

-- Add gig_application_id column to notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS gig_application_id UUID REFERENCES public.gig_applications(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_notifications_gig_id ON public.notifications(gig_id);
CREATE INDEX IF NOT EXISTS idx_notifications_gig_application_id ON public.notifications(gig_application_id);

-- ============================================================================
-- ADD GIG NOTIFICATION PREFERENCES
-- ============================================================================

-- Add gig notification preference columns
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS gig_role_updates BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS gig_application_updates BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS gig_opportunities BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS gig_reminders BOOLEAN NOT NULL DEFAULT true;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.notifications.gig_id IS 'Reference to the event_gig for gig-related notifications';
COMMENT ON COLUMN public.notifications.gig_application_id IS 'Reference to the gig_application for application-related notifications';

COMMENT ON COLUMN public.notification_preferences.gig_role_updates IS 'Receive notifications when gig role applications are approved/rejected';
COMMENT ON COLUMN public.notification_preferences.gig_application_updates IS 'Receive notifications about gig application status changes';
COMMENT ON COLUMN public.notification_preferences.gig_opportunities IS 'Receive notifications about new gig opportunities matching your roles';
COMMENT ON COLUMN public.notification_preferences.gig_reminders IS 'Receive reminder notifications for upcoming gigs';

-- ============================================================================
-- VERIFY
-- ============================================================================

DO $$
BEGIN
  -- Verify notifications columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'gig_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: gig_id column added to notifications';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'gig_application_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: gig_application_id column added to notifications';
  END IF;

  -- Verify notification_preferences columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'gig_role_updates'
  ) THEN
    RAISE NOTICE 'SUCCESS: gig notification preference columns added';
  END IF;
END
$$;

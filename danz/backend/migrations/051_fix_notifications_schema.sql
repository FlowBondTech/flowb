-- Migration: Fix Notifications Schema
-- Date: 2025-12-16
-- Description: Fix notifications table schema to match resolver expectations
-- Issue: Table has 'user_id' but resolver expects 'recipient_id', plus missing columns

-- Step 1: Rename user_id to recipient_id (if user_id exists and recipient_id doesn't)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN user_id TO recipient_id;
  END IF;
END $$;

-- Step 1b: Rename is_read to read (if is_read exists and read doesn't)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'is_read'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'read'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN is_read TO read;
  END IF;
END $$;

-- Step 2: Add missing columns if they don't exist

-- Sender Information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN sender_id VARCHAR(255);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN sender_type VARCHAR(50);
  END IF;
END $$;

-- Related Entities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'event_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN event_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'post_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN post_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'achievement_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN achievement_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'bond_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN bond_id UUID;
  END IF;
END $$;

-- Notification State
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'read'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Broadcast Information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'is_broadcast'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_broadcast BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'broadcast_target'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN broadcast_target VARCHAR(50);
  END IF;
END $$;

-- Action/Deep Link
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'action_type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN action_type VARCHAR(50);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'action_data'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN action_data JSONB;
  END IF;
END $$;

-- Push Notification Status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'push_sent'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN push_sent BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'push_sent_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN push_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Step 3: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read, recipient_id);

-- Step 4: Add foreign key constraints if they don't exist
-- Note: Using DO block to check if constraint exists before adding

DO $$
BEGIN
  -- Add foreign key for recipient_id to users if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_recipient_id_fkey'
    AND table_name = 'notifications'
  ) THEN
    -- Only add if recipient_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'recipient_id'
    ) THEN
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_recipient_id_fkey
        FOREIGN KEY (recipient_id)
        REFERENCES public.users(privy_id)
        ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add recipient_id foreign key: %', SQLERRM;
END $$;

-- Step 5: Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Notification Type Preferences
  admin_broadcasts BOOLEAN DEFAULT TRUE,
  event_manager_broadcasts BOOLEAN DEFAULT TRUE,
  event_updates BOOLEAN DEFAULT TRUE,
  dance_bonds BOOLEAN DEFAULT TRUE,
  post_interactions BOOLEAN DEFAULT TRUE,
  achievements BOOLEAN DEFAULT TRUE,

  -- Delivery Method Preferences
  push_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,

  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Verification query (run this to check the schema after migration)
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position;

-- Migration: Create Event Managers System
-- Date: 2025-11-24
-- Description: Add event managers system with role-based permissions

-- Create event_managers table
CREATE TABLE IF NOT EXISTS public.event_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Manager Role & Permissions
  role VARCHAR(50) NOT NULL DEFAULT 'manager', -- 'creator', 'manager', 'moderator'

  -- Granular Permissions
  can_edit_details BOOLEAN DEFAULT TRUE, -- Edit event title, description, location, etc.
  can_manage_registrations BOOLEAN DEFAULT TRUE, -- Approve/decline registrations, check-in users
  can_send_broadcasts BOOLEAN DEFAULT TRUE, -- Send notifications to participants
  can_manage_posts BOOLEAN DEFAULT FALSE, -- Delete inappropriate posts related to event
  can_invite_managers BOOLEAN DEFAULT FALSE, -- Invite other managers
  can_delete_event BOOLEAN DEFAULT FALSE, -- Only creator should have this

  -- Invitation Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'pending', 'active', 'declined', 'removed'
  invited_by VARCHAR(255) REFERENCES public.users(privy_id),
  invited_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(event_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_event_managers_event ON public.event_managers(event_id);
CREATE INDEX idx_event_managers_user ON public.event_managers(user_id);
CREATE INDEX idx_event_managers_status ON public.event_managers(status);

-- Add creator_id to events table to explicitly track event creator
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS creator_id VARCHAR(255) REFERENCES public.users(privy_id);

-- Migrate existing data: organizer_id becomes creator_id
UPDATE public.events SET creator_id = organizer_id WHERE creator_id IS NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_events_creator ON public.events(creator_id);

-- Create event_managers entries for all existing event creators
INSERT INTO public.event_managers (event_id, user_id, role, status, can_edit_details, can_manage_registrations, can_send_broadcasts, can_manage_posts, can_invite_managers, can_delete_event)
SELECT
  id as event_id,
  creator_id as user_id,
  'creator' as role,
  'active' as status,
  true, true, true, true, true, true
FROM public.events
WHERE creator_id IS NOT NULL
ON CONFLICT (event_id, user_id) DO NOTHING;

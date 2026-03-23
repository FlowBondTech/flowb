-- Migration: Create Notification System
-- Date: 2025-11-24
-- Description: Add notifications and notification preferences tables

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Notification Type & Content
  type VARCHAR(50) NOT NULL, -- 'admin_broadcast', 'event_manager_broadcast', 'event_update', 'dance_bond', 'post_like', 'post_comment', 'achievement'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Sender Information
  sender_id VARCHAR(255), -- privy_id of sender (null for system notifications)
  sender_type VARCHAR(50), -- 'admin', 'event_manager', 'user', 'system'

  -- Recipient Information
  recipient_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Related Entities
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  achievement_id UUID,
  bond_id UUID REFERENCES public.dance_bonds(id) ON DELETE CASCADE,

  -- Notification State
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Broadcast Information (for admin/manager broadcasts)
  is_broadcast BOOLEAN DEFAULT FALSE,
  broadcast_target VARCHAR(50), -- 'all_users', 'event_participants', 'organizers', 'dancers'

  -- Action/Deep Link
  action_type VARCHAR(50), -- 'open_event', 'open_post', 'open_profile', 'open_achievement'
  action_data JSONB, -- Additional data for the action

  -- Push Notification Status
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration for broadcasts
);

-- Indexes for performance
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(read, recipient_id);
CREATE INDEX idx_notifications_event ON public.notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_notifications_broadcast ON public.notifications(is_broadcast, broadcast_target) WHERE is_broadcast = TRUE;

-- Create notification_preferences table
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

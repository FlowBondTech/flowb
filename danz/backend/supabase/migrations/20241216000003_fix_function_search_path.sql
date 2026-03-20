-- Migration: Fix Function Search Path Security
-- Date: 2024-12-16
-- Description: Set search_path to empty string on all functions to prevent search path injection attacks
--
-- Functions with mutable search_path can be exploited by attackers to inject malicious
-- functions into the search path. Setting search_path = '' ensures functions only use
-- fully qualified names (schema.object) which prevents this attack vector.

-- Activity functions
ALTER FUNCTION public.increment_activity_likes(p_activity_id uuid)
  SET search_path = '';

ALTER FUNCTION public.decrement_activity_likes(p_activity_id uuid)
  SET search_path = '';

ALTER FUNCTION public.increment_activity_comments(p_activity_id uuid)
  SET search_path = '';

-- Admin/dangerous function
ALTER FUNCTION public.exec_sql(sql text)
  SET search_path = '';

-- User stats functions
ALTER FUNCTION public.increment_user_stats(p_user_id text, p_xp integer, p_points integer)
  SET search_path = '';

ALTER FUNCTION public.update_user_achievement_count()
  SET search_path = '';

ALTER FUNCTION public.update_user_dance_bonds_count()
  SET search_path = '';

ALTER FUNCTION public.update_user_created_events_count()
  SET search_path = '';

ALTER FUNCTION public.update_user_event_stats()
  SET search_path = '';

-- Conversation/messaging functions
ALTER FUNCTION public.update_conversation_last_message()
  SET search_path = '';

ALTER FUNCTION public.get_or_create_dm_conversation(user1_id character varying, user2_id character varying)
  SET search_path = '';

ALTER FUNCTION public.mark_conversation_read(conv_id uuid, reader_id character varying)
  SET search_path = '';

-- Referral system functions
ALTER FUNCTION public.create_referral_code_on_username()
  SET search_path = '';

ALTER FUNCTION public.update_referrer_stats()
  SET search_path = '';

ALTER FUNCTION public.check_referral_fraud(p_referrer_id text, p_ip_address text, p_device_id text)
  SET search_path = '';

ALTER FUNCTION public.expire_old_referrals()
  SET search_path = '';

ALTER FUNCTION public.award_referrer_on_friend_event()
  SET search_path = '';

-- Privacy functions
ALTER FUNCTION public.initialize_user_privacy()
  SET search_path = '';

ALTER FUNCTION public.can_view_profile(viewer_id character varying, target_id character varying)
  SET search_path = '';

ALTER FUNCTION public.can_message_user(sender_id character varying, recipient_id character varying)
  SET search_path = '';

-- Points system functions
ALTER FUNCTION public.award_points(p_user_id text, p_action_key text, p_reference_id uuid, p_reference_type text, p_metadata jsonb)
  SET search_path = '';

ALTER FUNCTION public.update_user_points_from_transaction()
  SET search_path = '';

-- User suggestions
ALTER FUNCTION public.generate_user_suggestions(target_user_id character varying)
  SET search_path = '';

-- Activity tracking
ALTER FUNCTION public.track_daily_activity(p_user_id text, p_activity_type text)
  SET search_path = '';

-- Utility functions
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = '';

-- Add comments for documentation
COMMENT ON FUNCTION public.exec_sql(text) IS
  'SECURITY WARNING: This function executes arbitrary SQL and should only be accessible to admin users. Search path fixed to prevent injection attacks.';

COMMENT ON FUNCTION public.award_points(text, text, uuid, text, jsonb) IS
  'Awards points to users with proper search path security to prevent exploitation.';

COMMENT ON FUNCTION public.check_referral_fraud(text, text, text) IS
  'Fraud detection with secure search path to prevent tampering.';

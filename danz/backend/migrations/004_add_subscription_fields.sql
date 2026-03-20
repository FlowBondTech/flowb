-- Migration: Add subscription fields for Stripe integration
-- Date: 2025-01-18
-- Description: Adds is_premium status, Stripe customer ID, and subscription management fields

-- Add subscription fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_premium text DEFAULT 'inactive' CHECK (
  is_premium IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing')
),
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (
  subscription_status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')
),
ADD COLUMN IF NOT EXISTS subscription_plan text CHECK (
  subscription_plan IN ('monthly', 'yearly')
),
ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_cancelled_at timestamp with time zone;

-- Create index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
ON public.users USING btree (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Create index for premium users
CREATE INDEX IF NOT EXISTS idx_users_is_premium
ON public.users USING btree (is_premium)
WHERE is_premium = 'active';

-- Create subscription history table for tracking changes
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  stripe_subscription_id text,
  status text NOT NULL,
  plan text,
  event_type text NOT NULL CHECK (
    event_type IN ('created', 'updated', 'cancelled', 'reactivated', 'payment_failed', 'payment_succeeded')
  ),
  metadata jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subscription_history_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_history_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (privy_id) ON DELETE CASCADE
);

-- Create index for subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id
ON public.subscription_history USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at
ON public.subscription_history USING btree (created_at DESC);

-- Comment on new columns
COMMENT ON COLUMN public.users.is_premium IS 'Premium subscription status: active, inactive, cancelled, past_due, trialing';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.users.stripe_subscription_id IS 'Current active Stripe subscription ID';
COMMENT ON COLUMN public.users.subscription_status IS 'Detailed Stripe subscription status';
COMMENT ON COLUMN public.users.subscription_plan IS 'Current subscription plan: monthly or yearly';
COMMENT ON COLUMN public.users.subscription_start_date IS 'When the current subscription period started';
COMMENT ON COLUMN public.users.subscription_end_date IS 'When the current subscription period ends';
COMMENT ON COLUMN public.users.subscription_cancelled_at IS 'Timestamp when user cancelled subscription (will remain active until end date)';
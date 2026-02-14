-- Migration: Support Telegram Login Widget auth flow
-- The widget flow doesn't use verification codes, so we need to:
-- 1. Make the 'code' column nullable (widget verifications have no code)
-- 2. Add auth_date and photo_url columns for widget data
-- 3. Add a unique constraint on platform + platform_user_id for upserts

-- Allow code to be nullable (widget verifications don't have one)
-- These are idempotent - safe to re-run
DO $$ BEGIN
  ALTER TABLE pending_verifications ALTER COLUMN code DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE pending_verifications ALTER COLUMN code DROP DEFAULT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Drop the unique constraint on code alone (conflicts with NULL codes)
ALTER TABLE pending_verifications DROP CONSTRAINT IF EXISTS pending_verifications_code_key;

-- Make expires_at nullable (widget verifications don't expire the same way)
DO $$ BEGIN
  ALTER TABLE pending_verifications ALTER COLUMN expires_at DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Add widget-specific columns
ALTER TABLE pending_verifications ADD COLUMN IF NOT EXISTS auth_date BIGINT;
ALTER TABLE pending_verifications ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add unique constraint for upserts (one verification per platform+user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_verifications_platform_user_unique
  ON pending_verifications(platform, platform_user_id);

-- Drop the old composite constraint if it exists
ALTER TABLE pending_verifications DROP CONSTRAINT IF EXISTS unique_pending_platform_user;

-- Migration 076: Pending Verifications Table
-- Purpose: Store verification codes for linking chat platforms (Telegram, Discord, etc.) to DANZ.Now accounts
-- Used by: FlowB OpenClaw plugin, danz-web /link page

CREATE TABLE IF NOT EXISTS public.pending_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Verification code (e.g., "ABC123")
  code VARCHAR(10) NOT NULL UNIQUE,

  -- Platform info (telegram, discord, farcaster, openclaw)
  platform VARCHAR(20) NOT NULL,
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Link to DANZ user (filled when verification completes)
  danz_privy_id VARCHAR(255)
);

-- Index for code lookup (used during verification on /link page)
CREATE INDEX IF NOT EXISTS idx_pending_verifications_code
  ON public.pending_verifications(code)
  WHERE verified_at IS NULL;

-- Index for checking user's pending verifications
CREATE INDEX IF NOT EXISTS idx_pending_verifications_platform_user
  ON public.pending_verifications(platform, platform_user_id);

-- Index for cleanup of expired verifications
CREATE INDEX IF NOT EXISTS idx_pending_verifications_expires
  ON public.pending_verifications(expires_at)
  WHERE verified_at IS NULL;

-- RLS Policies
ALTER TABLE public.pending_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access for verification lookup
CREATE POLICY "Allow anonymous code lookup" ON public.pending_verifications
  FOR SELECT
  USING (true);

-- Allow anonymous insert for creating new verifications (from FlowB plugin)
CREATE POLICY "Allow anonymous insert" ON public.pending_verifications
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous update for completing verifications
CREATE POLICY "Allow anonymous update" ON public.pending_verifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to cleanup expired verifications (can be called by a cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.pending_verifications
  WHERE verified_at IS NULL
    AND expires_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON TABLE public.pending_verifications IS 'Stores verification codes for linking chat platforms (Telegram, Discord, Farcaster) to DANZ.Now accounts via FlowB plugin';
COMMENT ON FUNCTION public.cleanup_expired_verifications IS 'Removes expired verification codes older than 7 days. Can be scheduled as a cron job.';

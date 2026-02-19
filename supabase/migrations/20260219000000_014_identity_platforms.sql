-- ============================================================================
-- 014: Expand flowb_identities platform support
-- Adds discord, twitter, github, apple, email, phone platforms for cross-platform account linking
-- ============================================================================

-- Drop the old CHECK constraint and add a new one with all platforms
ALTER TABLE flowb_identities DROP CONSTRAINT IF EXISTS flowb_identities_platform_check;
ALTER TABLE flowb_identities ADD CONSTRAINT flowb_identities_platform_check
  CHECK (platform IN ('telegram', 'farcaster', 'web', 'discord', 'twitter', 'github', 'apple', 'email', 'phone'));

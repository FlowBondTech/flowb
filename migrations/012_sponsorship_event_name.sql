-- Add event_name column to sponsorships so the featured banner can display
-- a human-readable name instead of a raw URL.

ALTER TABLE flowb_sponsorships
  ADD COLUMN IF NOT EXISTS event_name TEXT;

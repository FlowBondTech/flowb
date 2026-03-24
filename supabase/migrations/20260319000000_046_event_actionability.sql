-- Migration 046: Event Actionability System
-- Distinguishes actionable (RSVP-able) events from informational (external/aggregated) events.
-- Only actionable events support full RSVP, crew notifications, and check-in.

-- 1. Add actionability columns to flowb_events
ALTER TABLE flowb_events
  ADD COLUMN IF NOT EXISTS is_actionable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS claimed_by text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- 2. Index for filtering actionable events
CREATE INDEX IF NOT EXISTS idx_flowb_events_actionable ON flowb_events (is_actionable) WHERE is_actionable = true;

-- 3. Backfill: user-created events are actionable
UPDATE flowb_events SET is_actionable = true WHERE source IN ('community', 'web', 'user');

-- 4. Bookmarks table for non-actionable events (save/watch without RSVP semantics)
CREATE TABLE IF NOT EXISTS flowb_event_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_id uuid NOT NULL REFERENCES flowb_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_flowb_event_bookmarks_user ON flowb_event_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flowb_event_bookmarks_event ON flowb_event_bookmarks (event_id);

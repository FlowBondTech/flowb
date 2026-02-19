-- Add featured_event as a valid target_type for sponsorships
-- This allows users to bid for the featured event spot on the home screen

ALTER TABLE flowb_sponsorships
  DROP CONSTRAINT IF EXISTS flowb_sponsorships_target_type_check;

ALTER TABLE flowb_sponsorships
  ADD CONSTRAINT flowb_sponsorships_target_type_check
  CHECK (target_type IN ('event', 'location', 'featured_event'));

-- Add display_name columns so leaderboards and member lists show real names
-- instead of raw user_id (telegram_12345 etc.)

ALTER TABLE flowb_group_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE flowb_user_points ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE flowb_checkins ADD COLUMN IF NOT EXISTS display_name TEXT;

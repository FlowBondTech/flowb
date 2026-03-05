-- Rename danz_username → display_name in flowb_sessions
-- Part of DANZ → FlowB branding cleanup

-- Add display_name if it doesn't exist yet, then migrate data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flowb_sessions' AND column_name = 'danz_username'
  ) THEN
    -- Add display_name column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'flowb_sessions' AND column_name = 'display_name'
    ) THEN
      ALTER TABLE flowb_sessions ADD COLUMN display_name TEXT;
    END IF;

    -- Copy data from danz_username to display_name where display_name is null
    UPDATE flowb_sessions
    SET display_name = danz_username
    WHERE display_name IS NULL AND danz_username IS NOT NULL;

    -- Drop the old column
    ALTER TABLE flowb_sessions DROP COLUMN danz_username;
  END IF;
END $$;

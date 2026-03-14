-- 032: Notification feed columns + app_id for push tokens
-- Extends flowb_notification_log for display in notification feed apps (StephAlert)
-- Adds app_id to push tokens so different apps can register separately

-- Feed display columns on notification_log
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS priority text DEFAULT 'p1';
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE flowb_notification_log ADD COLUMN IF NOT EXISTS data jsonb;

-- Index for efficient feed queries (unread notifications for a user, newest first)
CREATE INDEX IF NOT EXISTS idx_notification_log_feed
  ON flowb_notification_log (recipient_id, sent_at DESC)
  WHERE read_at IS NULL;

-- App ID on push tokens (allows StephAlert vs main FlowB app tokens)
ALTER TABLE flowb_push_tokens ADD COLUMN IF NOT EXISTS app_id text DEFAULT 'me.flowb.app';

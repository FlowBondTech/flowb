-- Feedback & Feature Requests
-- Users can submit bugs, feature requests, or general feedback from any platform

CREATE TABLE IF NOT EXISTS flowb_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,                       -- telegram_123 / farcaster_456 / web_xxx / NULL for anon
  platform TEXT NOT NULL DEFAULT 'web', -- telegram, farcaster, web
  type TEXT NOT NULL DEFAULT 'feedback', -- bug, feature, feedback
  message TEXT NOT NULL,
  contact TEXT,                       -- optional contact info
  screen TEXT,                        -- which screen they were on
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_flowb_feedback_created ON flowb_feedback(created_at DESC);
CREATE INDEX idx_flowb_feedback_type ON flowb_feedback(type);
CREATE INDEX idx_flowb_feedback_user ON flowb_feedback(user_id);

-- RLS
ALTER TABLE flowb_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_feedback" ON flowb_feedback
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

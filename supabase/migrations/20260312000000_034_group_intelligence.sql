-- 034: Group Intelligence
-- Per-group intelligence configuration and extracted business signals

-- ============================================================================
-- flowb_group_intelligence: Per-group intelligence config (1:1 with channels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_group_intelligence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       BIGINT NOT NULL UNIQUE,
  channel_id    UUID REFERENCES flowb_channels(id) ON DELETE SET NULL,
  enabled_by    TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,

  -- Workflow listeners (which signal types to extract)
  listen_leads        BOOLEAN DEFAULT true,
  listen_todos        BOOLEAN DEFAULT true,
  listen_meetings     BOOLEAN DEFAULT true,
  listen_deadlines    BOOLEAN DEFAULT true,
  listen_decisions    BOOLEAN DEFAULT true,
  listen_action_items BOOLEAN DEFAULT true,
  listen_blockers     BOOLEAN DEFAULT true,
  listen_events       BOOLEAN DEFAULT true,
  listen_followups    BOOLEAN DEFAULT true,
  listen_expenses     BOOLEAN DEFAULT false,
  listen_ideas        BOOLEAN DEFAULT false,
  listen_feedback     BOOLEAN DEFAULT false,

  -- Routing config
  default_board_id    UUID,
  default_crew_id     UUID,
  auto_assign_to      TEXT,
  notify_on_extract   BOOLEAN DEFAULT true,
  digest_frequency    TEXT DEFAULT 'daily',
  min_confidence      FLOAT DEFAULT 0.6,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_intel_chat ON flowb_group_intelligence(chat_id);
CREATE INDEX IF NOT EXISTS idx_group_intel_active ON flowb_group_intelligence(is_active) WHERE is_active = true;

-- ============================================================================
-- flowb_group_signals: Extracted business signals from group messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_group_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id         BIGINT NOT NULL,
  message_id      BIGINT NOT NULL,
  sender_id       BIGINT NOT NULL,
  sender_name     TEXT,

  signal_type     TEXT NOT NULL CHECK (signal_type IN (
    'lead', 'todo', 'meeting', 'deadline', 'decision',
    'action_item', 'blocker', 'event', 'followup',
    'expense', 'idea', 'feedback'
  )),

  title           TEXT NOT NULL,
  description     TEXT,
  confidence      FLOAT NOT NULL DEFAULT 0.5,
  extracted_data  JSONB NOT NULL DEFAULT '{}',
  raw_text        TEXT,
  routed          BOOLEAN DEFAULT false,
  routed_to       TEXT,
  routed_ref_id   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_signals_chat ON flowb_group_signals(chat_id, created_at DESC);
CREATE INDEX idx_group_signals_type ON flowb_group_signals(chat_id, signal_type);
CREATE INDEX idx_group_signals_unrouted ON flowb_group_signals(chat_id) WHERE routed = false;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE flowb_group_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_group_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all" ON flowb_group_intelligence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON flowb_group_signals FOR ALL USING (true) WITH CHECK (true);

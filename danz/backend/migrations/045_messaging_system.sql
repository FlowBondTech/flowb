-- Migration: 045_messaging_system.sql
-- Date: 2025-01-28
-- Description: Complete messaging system with conversations, direct messages, and user blocking

-- ============================================================================
-- CONVERSATIONS TABLE
-- Represents a conversation thread between users
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation metadata
  title VARCHAR(200), -- Optional title for group conversations
  is_group BOOLEAN DEFAULT false,

  -- Last activity tracking for sorting
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,

  -- Conversation settings
  is_archived BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100) REFERENCES users(privy_id) ON DELETE SET NULL
);

-- ============================================================================
-- CONVERSATION PARTICIPANTS TABLE
-- Links users to conversations with their settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,

  -- Participant settings
  nickname VARCHAR(100), -- Custom name for the conversation
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Read tracking
  last_read_at TIMESTAMPTZ,
  unread_count INT DEFAULT 0,

  -- Role in group conversations
  role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ, -- NULL if still in conversation

  UNIQUE(conversation_id, user_id)
);

-- ============================================================================
-- MESSAGES TABLE
-- Individual messages within conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'system'

  -- Media attachments (optional)
  media_url TEXT,
  media_type VARCHAR(50),
  media_metadata JSONB,

  -- Reply threading
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Message status
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MESSAGE READ STATUS TABLE
-- Tracks which users have read which messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id)
);

-- ============================================================================
-- USER BLOCKS TABLE
-- For blocking users from messaging
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  blocked_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ============================================================================
-- MESSAGE REACTIONS TABLE
-- For emoji reactions on messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  emoji VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);

-- Participant indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_unread ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Read status indexes
CREATE INDEX IF NOT EXISTS idx_message_read_status_message ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user ON message_read_status(user_id);

-- Block indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Reaction indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see conversations they're part of
CREATE POLICY conversations_select ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = current_setting('app.current_user_id', true)
      AND left_at IS NULL
    )
  );

CREATE POLICY conversations_insert ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY conversations_update ON conversations FOR UPDATE
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = current_setting('app.current_user_id', true)
      AND left_at IS NULL
    )
  );

-- Participants: Users can see participants of their conversations
CREATE POLICY participants_select ON conversation_participants FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = current_setting('app.current_user_id', true)
      AND left_at IS NULL
    )
  );

CREATE POLICY participants_insert ON conversation_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY participants_update ON conversation_participants FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true));

-- Messages: Users can see messages in their conversations
CREATE POLICY messages_select ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = current_setting('app.current_user_id', true)
      AND left_at IS NULL
    )
    AND is_deleted = false
  );

CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (
    sender_id = current_setting('app.current_user_id', true)
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = current_setting('app.current_user_id', true)
      AND left_at IS NULL
    )
  );

CREATE POLICY messages_update ON messages FOR UPDATE
  USING (sender_id = current_setting('app.current_user_id', true));

-- Read status: Users can only manage their own read status
CREATE POLICY read_status_select ON message_read_status FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY read_status_insert ON message_read_status FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Blocks: Users can only see and manage their own blocks
CREATE POLICY blocks_select ON user_blocks FOR SELECT
  USING (blocker_id = current_setting('app.current_user_id', true));

CREATE POLICY blocks_insert ON user_blocks FOR INSERT
  WITH CHECK (blocker_id = current_setting('app.current_user_id', true));

CREATE POLICY blocks_delete ON user_blocks FOR DELETE
  USING (blocker_id = current_setting('app.current_user_id', true));

-- Reactions: Users can see reactions in their conversations
CREATE POLICY reactions_select ON message_reactions FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = current_setting('app.current_user_id', true)
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY reactions_insert ON message_reactions FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY reactions_delete ON message_reactions FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update conversation last_message info
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Update unread count for all other participants
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
    AND left_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new messages
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to get or create direct message conversation
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(user1_id VARCHAR, user2_id VARCHAR)
RETURNS UUID AS $$
DECLARE
  existing_conversation_id UUID;
  new_conversation_id UUID;
BEGIN
  -- Check for existing DM conversation between these two users
  SELECT c.id INTO existing_conversation_id
  FROM conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id AND cp1.left_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id AND cp2.left_at IS NULL
    )
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = c.id AND cp3.left_at IS NULL
    ) = 2
  LIMIT 1;

  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (is_group, created_by)
  VALUES (false, user1_id)
  RETURNING id INTO new_conversation_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES
    (new_conversation_id, user1_id),
    (new_conversation_id, user2_id);

  RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_read(conv_id UUID, reader_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Update participant's read tracking
  UPDATE conversation_participants
  SET
    last_read_at = NOW(),
    unread_count = 0
  WHERE conversation_id = conv_id AND user_id = reader_id;

  -- Insert read status for unread messages
  INSERT INTO message_read_status (message_id, user_id)
  SELECT m.id, reader_id
  FROM messages m
  WHERE m.conversation_id = conv_id
    AND m.sender_id != reader_id
    AND NOT EXISTS (
      SELECT 1 FROM message_read_status mrs
      WHERE mrs.message_id = m.id AND mrs.user_id = reader_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE conversations IS 'Message threads between users (DMs or groups)';
COMMENT ON TABLE conversation_participants IS 'Users participating in conversations with their settings';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE message_read_status IS 'Tracks which users have read which messages';
COMMENT ON TABLE user_blocks IS 'Users blocked from messaging each other';
COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages';
COMMENT ON FUNCTION get_or_create_dm_conversation IS 'Gets existing DM conversation or creates new one';
COMMENT ON FUNCTION mark_conversation_read IS 'Marks all messages in a conversation as read for a user';

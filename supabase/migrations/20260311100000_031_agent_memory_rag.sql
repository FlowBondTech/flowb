-- ============================================================================
-- Migration 031: Agent Memory RAG System
-- Adds pgvector-powered memory for AI chat with hybrid search (vector + FTS)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: flowb_agent_memories
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_agent_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  memory_type   TEXT NOT NULL DEFAULT 'fact'
    CHECK (memory_type IN ('fact', 'preference', 'summary', 'episode', 'entity', 'goal')),
  content       TEXT NOT NULL,
  content_tsv   TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding     VECTOR(1024),

  metadata      JSONB NOT NULL DEFAULT '{}',
  importance    FLOAT NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  access_count  INT NOT NULL DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,

  source_message_id TEXT,
  related_event_id  UUID,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Table: flowb_conversation_summaries
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_conversation_summaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  platform      TEXT NOT NULL,
  summary       TEXT NOT NULL,
  embedding     VECTOR(1024),
  message_count INT NOT NULL DEFAULT 0,
  key_topics    TEXT[] DEFAULT '{}',
  sentiment     TEXT,

  window_start  TIMESTAMPTZ NOT NULL,
  window_end    TIMESTAMPTZ NOT NULL,

  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- HNSW vector indexes
CREATE INDEX idx_memories_embedding_hnsw
  ON flowb_agent_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_summaries_embedding_hnsw
  ON flowb_conversation_summaries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text search
CREATE INDEX idx_memories_content_tsv
  ON flowb_agent_memories
  USING gin (content_tsv);

-- User-scoped lookups
CREATE INDEX idx_memories_user_id ON flowb_agent_memories (user_id);
CREATE INDEX idx_memories_user_type ON flowb_agent_memories (user_id, memory_type);
CREATE INDEX idx_memories_user_importance ON flowb_agent_memories (user_id, importance DESC);
CREATE INDEX idx_summaries_user_id ON flowb_conversation_summaries (user_id);

-- Expiry cleanup
CREATE INDEX idx_memories_expires ON flowb_agent_memories (expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- RPC: Hybrid memory search (vector + BM25 via RRF)
-- ============================================================================
CREATE OR REPLACE FUNCTION match_agent_memories(
  query_embedding vector(1024),
  query_text text DEFAULT '',
  match_user_id text DEFAULT NULL,
  match_types text[] DEFAULT NULL,
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.3,
  use_hybrid boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  user_id text,
  memory_type text,
  content text,
  metadata jsonb,
  importance float,
  similarity float,
  combined_score float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF use_hybrid AND query_text != '' THEN
    RETURN QUERY
    WITH semantic AS (
      SELECT
        m.id,
        m.user_id,
        m.memory_type,
        m.content,
        m.metadata,
        m.importance,
        1 - (m.embedding <=> query_embedding) AS sim,
        ROW_NUMBER() OVER (ORDER BY m.embedding <=> query_embedding) AS sem_rank
      FROM flowb_agent_memories m
      WHERE (match_user_id IS NULL OR m.user_id = match_user_id)
        AND (match_types IS NULL OR m.memory_type = ANY(match_types))
        AND (m.expires_at IS NULL OR m.expires_at > NOW())
        AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
      ORDER BY m.embedding <=> query_embedding
      LIMIT match_count * 3
    ),
    fulltext AS (
      SELECT
        m.id,
        ts_rank_cd(m.content_tsv, websearch_to_tsquery('english', query_text)) AS ft_rank_score,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank_cd(m.content_tsv, websearch_to_tsquery('english', query_text)) DESC
        ) AS ft_rank
      FROM flowb_agent_memories m
      WHERE (match_user_id IS NULL OR m.user_id = match_user_id)
        AND (match_types IS NULL OR m.memory_type = ANY(match_types))
        AND (m.expires_at IS NULL OR m.expires_at > NOW())
        AND m.content_tsv @@ websearch_to_tsquery('english', query_text)
      LIMIT match_count * 3
    )
    SELECT
      s.id,
      s.user_id,
      s.memory_type,
      s.content,
      s.metadata,
      s.importance,
      s.sim AS similarity,
      (0.5 / (60.0 + s.sem_rank)) +
      (0.3 / (60.0 + COALESCE(f.ft_rank, 1000))) +
      (0.2 * s.importance) AS combined_score
    FROM semantic s
    LEFT JOIN fulltext f ON f.id = s.id
    ORDER BY combined_score DESC
    LIMIT match_count;
  ELSE
    RETURN QUERY
    SELECT
      m.id,
      m.user_id,
      m.memory_type,
      m.content,
      m.metadata,
      m.importance,
      1 - (m.embedding <=> query_embedding) AS similarity,
      (0.7 * (1 - (m.embedding <=> query_embedding))) + (0.3 * m.importance) AS combined_score
    FROM flowb_agent_memories m
    WHERE (match_user_id IS NULL OR m.user_id = match_user_id)
      AND (match_types IS NULL OR m.memory_type = ANY(match_types))
      AND (m.expires_at IS NULL OR m.expires_at > NOW())
      AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
    ORDER BY combined_score DESC
    LIMIT match_count;
  END IF;
END;
$$;

-- ============================================================================
-- RPC: Bump access stats
-- ============================================================================
CREATE OR REPLACE FUNCTION touch_memories(memory_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE flowb_agent_memories
  SET access_count = access_count + 1,
      last_accessed = NOW()
  WHERE id = ANY(memory_ids);
$$;

-- ============================================================================
-- Cleanup expired memories
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_memories()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM flowb_agent_memories
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- RLS
ALTER TABLE flowb_agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on memories"
  ON flowb_agent_memories FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on summaries"
  ON flowb_conversation_summaries FOR ALL
  USING (true) WITH CHECK (true);

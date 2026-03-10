-- ============================================================================
-- Migration 031b: FTS-only memory search fallback
-- Used when no embedding API key is configured (vector search unavailable)
-- ============================================================================

CREATE OR REPLACE FUNCTION search_memories_fts(
  query_text text,
  match_user_id text DEFAULT NULL,
  match_types text[] DEFAULT NULL,
  match_count int DEFAULT 10
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
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.memory_type,
    m.content,
    m.metadata,
    m.importance,
    ts_rank_cd(m.content_tsv, websearch_to_tsquery('english', query_text))::float AS similarity,
    (0.7 * ts_rank_cd(m.content_tsv, websearch_to_tsquery('english', query_text)) +
     0.3 * m.importance)::float AS combined_score
  FROM flowb_agent_memories m
  WHERE (match_user_id IS NULL OR m.user_id = match_user_id)
    AND (match_types IS NULL OR m.memory_type = ANY(match_types))
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND m.content_tsv @@ websearch_to_tsquery('english', query_text)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

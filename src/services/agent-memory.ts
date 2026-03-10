/**
 * Agent Memory Service — RAG-based persistent memory for FlowB AI
 *
 * Uses Supabase pgvector for hybrid search (vector + BM25 via RRF).
 * Memories are extracted from conversations and stored per-user,
 * shared across all platforms (Telegram, Farcaster, Web).
 */
import { sbFetch, sbPatchRaw, type SbConfig } from "../utils/supabase.js";

// ─── Types ───────────────────────────────────────────────────────────

export type MemoryType = "fact" | "preference" | "summary" | "episode" | "entity" | "goal";

export interface Memory {
  id: string;
  userId: string;
  memoryType: MemoryType;
  content: string;
  metadata: Record<string, any>;
  importance: number;
  similarity?: number;
  combinedScore?: number;
  createdAt: string;
}

export interface MemoryConfig {
  sb: SbConfig;
  openaiKey?: string;
  embeddingModel?: string;
}

// ─── Embedding Generation ────────────────────────────────────────────

const EMBEDDING_CACHE = new Map<string, number[]>();
const CACHE_MAX = 500;

async function generateEmbedding(text: string, config: MemoryConfig): Promise<number[]> {
  const cacheKey = text.slice(0, 200);
  const cached = EMBEDDING_CACHE.get(cacheKey);
  if (cached) return cached;

  const apiKey = config.openaiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OpenAI API key for embeddings");

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: config.embeddingModel || "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const embedding: number[] = data.data[0].embedding;

  if (EMBEDDING_CACHE.size >= CACHE_MAX) {
    const firstKey = EMBEDDING_CACHE.keys().next().value;
    if (firstKey !== undefined) EMBEDDING_CACHE.delete(firstKey);
  }
  EMBEDDING_CACHE.set(cacheKey, embedding);

  return embedding;
}

// ─── Memory Storage ──────────────────────────────────────────────────

export async function storeMemory(
  config: MemoryConfig,
  userId: string,
  content: string,
  type: MemoryType = "fact",
  metadata: Record<string, any> = {},
  importance: number = 0.5,
): Promise<string | null> {
  try {
    const embedding = await generateEmbedding(content, config);

    const res = await fetch(`${config.sb.supabaseUrl}/rest/v1/flowb_agent_memories`, {
      method: "POST",
      headers: {
        apikey: config.sb.supabaseKey,
        Authorization: `Bearer ${config.sb.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        memory_type: type,
        content,
        embedding: `[${embedding.join(",")}]`,
        metadata,
        importance: Math.min(Math.max(importance, 0), 1),
      }),
    });

    if (!res.ok) {
      console.error("[agent-memory] storeMemory failed:", res.status);
      return null;
    }
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row?.id || null;
  } catch (err) {
    console.error("[agent-memory] storeMemory error:", err);
    return null;
  }
}

// ─── Memory Retrieval (Hybrid Search) ────────────────────────────────

export async function searchMemories(
  config: MemoryConfig,
  userId: string,
  query: string,
  options: {
    types?: MemoryType[];
    limit?: number;
    threshold?: number;
    hybrid?: boolean;
  } = {},
): Promise<Memory[]> {
  try {
    const embedding = await generateEmbedding(query, config);
    const { types, limit = 10, threshold = 0.3, hybrid = true } = options;

    const res = await fetch(`${config.sb.supabaseUrl}/rest/v1/rpc/match_agent_memories`, {
      method: "POST",
      headers: {
        apikey: config.sb.supabaseKey,
        Authorization: `Bearer ${config.sb.supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_embedding: `[${embedding.join(",")}]`,
        query_text: hybrid ? query : "",
        match_user_id: userId,
        match_types: types || null,
        match_count: limit,
        similarity_threshold: threshold,
        use_hybrid: hybrid,
      }),
    });

    if (!res.ok) {
      console.error("[agent-memory] search RPC error:", res.status);
      return [];
    }

    const rows = await res.json();

    // Touch accessed memories (fire-and-forget)
    if (rows?.length) {
      const ids = rows.map((r: any) => r.id);
      fetch(`${config.sb.supabaseUrl}/rest/v1/rpc/touch_memories`, {
        method: "POST",
        headers: {
          apikey: config.sb.supabaseKey,
          Authorization: `Bearer ${config.sb.supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memory_ids: ids }),
      }).catch(() => {});
    }

    return (rows || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      memoryType: r.memory_type,
      content: r.content,
      metadata: r.metadata,
      importance: r.importance,
      similarity: r.similarity,
      combinedScore: r.combined_score,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("[agent-memory] searchMemories error:", err);
    return [];
  }
}

// ─── Memory Extraction from Conversations ────────────────────────────

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a conversation, extract facts, preferences, and important information about the user.

Return a JSON object with a "memories" array. Each entry:
- "content": concise self-contained statement (e.g. "User prefers DeFi events over NFT events")
- "type": one of "fact", "preference", "episode", "entity", "goal"
- "importance": 0.0-1.0
- "topics": array of topic tags

Only extract genuinely useful long-term info. Skip transient states, greetings, and tool outputs.
If nothing worth remembering, return: {"memories":[]}`;

export async function extractMemories(
  messages: Array<{ role: string; content: string | null }>,
  xaiKey: string,
): Promise<Array<{ content: string; type: MemoryType; importance: number; topics: string[] }>> {
  try {
    const convo = messages
      .filter(m => m.content && (m.role === "user" || m.role === "assistant"))
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    if (convo.length < 50) return [];

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini-fast",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: `Conversation:\n${convo}` },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";

    // Parse JSON — handle both array and {memories:[]} formats
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code block
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) parsed = JSON.parse(match[1]);
      else return [];
    }

    const memories = Array.isArray(parsed) ? parsed : (parsed.memories || []);
    return memories.filter(
      (m: any) => m.content && typeof m.content === "string" && m.content.length > 5,
    );
  } catch (err) {
    console.error("[agent-memory] extractMemories error:", err);
    return [];
  }
}

// ─── Integration Helpers ─────────────────────────────────────────────

/**
 * Build memory context string for injection into system prompt.
 * Returns empty string if no relevant memories found.
 */
export async function getMemoryContext(
  config: MemoryConfig,
  userId: string,
  userMessage: string,
): Promise<string> {
  try {
    const memories = await searchMemories(config, userId, userMessage, {
      limit: 8,
      threshold: 0.35,
      hybrid: true,
    });

    if (!memories.length) return "";

    const memoryBlock = memories
      .map((m, i) => `${i + 1}. [${m.memoryType}] ${m.content}`)
      .join("\n");

    return `\n\nREMEMBERED CONTEXT ABOUT THIS USER:\n${memoryBlock}\n\nUse these memories naturally in conversation. Don't explicitly say "I remember that..." unless the user asks what you know about them.`;
  } catch {
    return "";
  }
}

/**
 * Post-conversation: extract facts and store as memories.
 * Deduplicates against existing memories (cosine > 0.85).
 * Fire-and-forget — call without awaiting.
 */
export async function processConversationMemories(
  config: MemoryConfig,
  userId: string,
  messages: Array<{ role: string; content: string | null }>,
  xaiKey: string,
): Promise<number> {
  if (messages.length < 3) return 0;

  const extracted = await extractMemories(messages, xaiKey);
  let stored = 0;

  for (const mem of extracted) {
    // Deduplicate: check for very similar existing memory
    const existing = await searchMemories(config, userId, mem.content, {
      limit: 1,
      threshold: 0.85,
    });

    if (existing.length && existing[0].similarity && existing[0].similarity > 0.85) {
      // Reinforce existing memory instead of duplicating
      await sbPatchRaw(
        config.sb,
        `flowb_agent_memories?id=eq.${existing[0].id}`,
        {
          importance: Math.min(existing[0].importance + 0.1, 1.0),
          updated_at: new Date().toISOString(),
        },
      );
      continue;
    }

    const id = await storeMemory(
      config,
      userId,
      mem.content,
      mem.type as MemoryType,
      { topics: mem.topics, source: "conversation_extraction" },
      mem.importance,
    );

    if (id) stored++;
  }

  if (stored > 0) {
    console.log(`[agent-memory] Stored ${stored} new memories for ${userId}`);
  }

  return stored;
}

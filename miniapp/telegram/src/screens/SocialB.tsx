import { useState, useEffect, useRef } from "react";
import type { Screen } from "../App";
import { getToken } from "../api/client";

const API_BASE = import.meta.env.VITE_API_URL || "";

// ============================================================================
// SocialB API helpers (inline, same pattern as client.ts)
// ============================================================================

function socialbHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function socialbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: socialbHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function socialbPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: socialbHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ============================================================================
// Types
// ============================================================================

interface SocialBConfig {
  id: string;
  user_id: string;
  org_id: string;
  farcaster_fid: number;
  enabled: boolean;
  platforms: string[];
  exclude_replies: boolean;
  exclude_recasts: boolean;
  daily_limit: number;
  posts_today: number;
  tier: "free" | "pro";
  chat_queries_today: number;
  created_at: string;
  updated_at: string;
}

interface SocialBActivity {
  id: string;
  cast_hash: string;
  cast_text: string | null;
  platforms_attempted: string[];
  platforms_succeeded: string[];
  platforms_failed: string[];
  error_message: string | null;
  created_at: string;
}

interface Props {
  onNavigate: (s: Screen) => void;
}

// ============================================================================
// Constants
// ============================================================================

const ALL_PLATFORMS = [
  { key: "twitter", label: "Twitter / X" },
  { key: "threads", label: "Threads" },
  { key: "bluesky", label: "Bluesky" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "mastodon", label: "Mastodon" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
];

// ============================================================================
// Helpers
// ============================================================================

function timeSince(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function platformIcon(p: string): string {
  const icons: Record<string, string> = {
    twitter: "X",
    threads: "TH",
    bluesky: "BS",
    linkedin: "LI",
    instagram: "IG",
    mastodon: "MA",
    facebook: "FB",
    tiktok: "TK",
  };
  return icons[p] || p.slice(0, 2).toUpperCase();
}

// ============================================================================
// Skeleton
// ============================================================================

function SocialBSkeleton() {
  return (
    <div className="screen">
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div
          className="skeleton-line"
          style={{ width: 120, height: 24, margin: "0 auto 8px", borderRadius: 8 }}
        />
        <div
          className="skeleton-line"
          style={{ width: 200, height: 14, margin: "0 auto" }}
        />
      </div>
      <div className="skeleton" style={{ height: 80 }} />
      <div className="skeleton" style={{ height: 160, marginTop: 12 }} />
      <div className="skeleton" style={{ height: 200, marginTop: 12 }} />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SocialB({ onNavigate }: Props) {
  const [config, setConfig] = useState<SocialBConfig | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activity, setActivity] = useState<SocialBActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"activity" | "chat">("activity");

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "bot"; text: string }>
  >([]);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Local edits (for preferences that save on change)
  const [localPlatforms, setLocalPlatforms] = useState<string[]>([]);
  const [localExcludeReplies, setLocalExcludeReplies] = useState(true);
  const [localExcludeRecasts, setLocalExcludeRecasts] = useState(true);
  const [localDailyLimit, setLocalDailyLimit] = useState(10);

  // --------------------------------------------------------------------------
  // Load config + activity
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cfgRes, actRes] = await Promise.all([
        socialbGet<{ config: SocialBConfig | null }>("/api/v1/socialb/config"),
        socialbGet<{ activity: SocialBActivity[] }>("/api/v1/socialb/activity?limit=20").catch(
          () => ({ activity: [] }),
        ),
      ]);
      setConfig(cfgRes.config);
      setActivity(actRes.activity);
      if (cfgRes.config) {
        setLocalPlatforms(cfgRes.config.platforms);
        setLocalExcludeReplies(cfgRes.config.exclude_replies);
        setLocalExcludeRecasts(cfgRes.config.exclude_recasts);
        setLocalDailyLimit(cfgRes.config.daily_limit);
      }
    } catch (err) {
      console.error("SocialB load failed:", err);
      setConfig(null);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }

  // --------------------------------------------------------------------------
  // Toggle auto-repost
  // --------------------------------------------------------------------------

  async function handleToggle() {
    if (toggling || !config) return;
    setToggling(true);
    try {
      const res = await socialbPost<{ enabled: boolean }>("/api/v1/socialb/config/toggle");
      setConfig((prev) => (prev ? { ...prev, enabled: res.enabled } : prev));
    } catch (err: any) {
      alert(err.message || "Failed to toggle");
    } finally {
      setToggling(false);
    }
  }

  // --------------------------------------------------------------------------
  // Save preferences
  // --------------------------------------------------------------------------

  async function savePreferences(patch: Record<string, any>) {
    if (saving || !config) return;
    setSaving(true);
    try {
      const res = await socialbPost<{ config: SocialBConfig }>("/api/v1/socialb/config", patch);
      if (res.config) setConfig(res.config);
    } catch (err: any) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------------------------------
  // Platform toggle
  // --------------------------------------------------------------------------

  function togglePlatform(key: string) {
    const next = localPlatforms.includes(key)
      ? localPlatforms.filter((p) => p !== key)
      : [...localPlatforms, key];
    setLocalPlatforms(next);
    savePreferences({ platforms: next });
  }

  // --------------------------------------------------------------------------
  // Chat
  // --------------------------------------------------------------------------

  async function sendChatMessage() {
    const msg = chatInput.trim();
    if (!msg || chatSending) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setChatSending(true);
    try {
      const res = await socialbPost<{ reply: string; action?: string }>(
        "/api/v1/socialb/chat",
        { message: msg },
      );
      setChatMessages((prev) => [...prev, { role: "bot", text: res.reply }]);
      // Refresh data if an action was taken
      if (res.action) loadData();
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "bot", text: "Something went wrong. Try again." },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --------------------------------------------------------------------------
  // Guards
  // --------------------------------------------------------------------------

  if (loading) return <SocialBSkeleton />;

  if (hasLoaded && !config) {
    return (
      <div className="screen">
        <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }} className="gradient-text">
            SocialB
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Auto-post everywhere
          </div>
        </div>

        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji" style={{ fontSize: 48 }}>
              {"\u{1F310}"}
            </div>
            <div className="empty-state-title">Set Up SocialB</div>
            <div className="empty-state-text">
              Connect your Farcaster account to auto-repost your casts to Twitter, Threads,
              Bluesky, LinkedIn, and more. One cast, every platform.
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              SocialB requires a Farcaster account and a connected social org. Set this up from the
              web dashboard or Farcaster mini app first.
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate({ name: "home" })}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // After the guard, config is guaranteed non-null
  if (!config) return <SocialBSkeleton />;

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  const totalReposts = activity.filter(
    (a) => a.platforms_succeeded && a.platforms_succeeded.length > 0,
  ).length;
  const platformsReached = new Set(activity.flatMap((a) => a.platforms_succeeded || [])).size;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
        <div style={{ fontSize: 28, fontWeight: 700 }} className="gradient-text">
          SocialB
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Auto-post everywhere
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div
          className="card"
          style={{ textAlign: "center", padding: "14px 8px", marginBottom: 0 }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
            {totalReposts}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Total Reposts
          </div>
        </div>
        <div
          className="card"
          style={{ textAlign: "center", padding: "14px 8px", marginBottom: 0 }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--purple)" }}>
            {platformsReached}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Platforms Reached
          </div>
        </div>
      </div>

      {/* ON/OFF Toggle */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Auto-Repost</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {config.enabled
              ? `${config.posts_today}/${config.daily_limit || "inf"} posts today`
              : "Paused"}
            {" "}&middot; {config.tier} tier
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          style={{
            width: 56,
            height: 30,
            borderRadius: 15,
            border: "none",
            cursor: toggling ? "not-allowed" : "pointer",
            background: config.enabled
              ? "var(--green)"
              : "var(--border)",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              background: "#fff",
              position: "absolute",
              top: 3,
              left: config.enabled ? 29 : 3,
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </button>
      </div>

      {/* Platform Grid */}
      <div className="section-title">Connected Platforms</div>
      <div className="card" style={{ padding: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {ALL_PLATFORMS.map((p) => {
            const active = localPlatforms.includes(p.key);
            return (
              <button
                key={p.key}
                onClick={() => togglePlatform(p.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: active
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                  background: active
                    ? "var(--accent-glow)"
                    : "var(--bg)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "var(--font)",
                  color: active ? "var(--accent-light)" : "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    background: active
                      ? "var(--accent)"
                      : "var(--bg-card)",
                    color: active ? "#fff" : "var(--text-dim)",
                    flexShrink: 0,
                    letterSpacing: "0.02em",
                  }}
                >
                  {platformIcon(p.key)}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.label}
                </span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferences */}
      <div className="section-title">Preferences</div>
      <div className="card" style={{ padding: 0 }}>
        {/* Skip Replies */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Skip Replies</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Don't repost reply casts
            </div>
          </div>
          <button
            onClick={() => {
              const next = !localExcludeReplies;
              setLocalExcludeReplies(next);
              savePreferences({ exclude_replies: next });
            }}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: localExcludeReplies ? "var(--green)" : "var(--border)",
              position: "relative",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                background: "#fff",
                position: "absolute",
                top: 3,
                left: localExcludeReplies ? 23 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            />
          </button>
        </div>

        {/* Skip Recasts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Skip Recasts</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Don't repost recasted content
            </div>
          </div>
          <button
            onClick={() => {
              const next = !localExcludeRecasts;
              setLocalExcludeRecasts(next);
              savePreferences({ exclude_recasts: next });
            }}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: localExcludeRecasts ? "var(--green)" : "var(--border)",
              position: "relative",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                background: "#fff",
                position: "absolute",
                top: 3,
                left: localExcludeRecasts ? 23 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            />
          </button>
        </div>

        {/* Daily Limit */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Daily Limit</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Max reposts per day
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}
              onClick={() => {
                const next = Math.max(1, localDailyLimit - 1);
                setLocalDailyLimit(next);
                savePreferences({ daily_limit: next });
              }}
            >
              -
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 28, textAlign: "center" }}>
              {localDailyLimit}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}
              onClick={() => {
                const next = Math.min(100, localDailyLimit + 1);
                setLocalDailyLimit(next);
                savePreferences({ daily_limit: next });
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: Activity / Chat */}
      <div className="top-tabs" style={{ marginTop: 20 }}>
        <button
          className={`top-tab ${tab === "activity" ? "active" : ""}`}
          onClick={() => setTab("activity")}
        >
          Activity
        </button>
        <button
          className={`top-tab ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
        >
          AI Chat
        </button>
      </div>

      {/* Activity Feed */}
      {tab === "activity" && (
        <div>
          {activity.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: "24px 16px" }}>
                <div className="empty-state-title" style={{ fontSize: 14 }}>
                  No activity yet
                </div>
                <div className="empty-state-text" style={{ fontSize: 12 }}>
                  Reposts will appear here once SocialB starts auto-posting your Farcaster casts.
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: "4px 16px" }}>
              {activity.map((a) => {
                const succeeded = a.platforms_succeeded?.length > 0;
                const failed = a.platforms_failed?.length > 0;
                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: succeeded
                          ? "rgba(34, 197, 94, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                        color: succeeded ? "var(--green)" : "var(--red)",
                        fontWeight: 700,
                      }}
                    >
                      {succeeded ? "\u2713" : "\u2717"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.cast_text || "(no text)"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        {(a.platforms_succeeded || []).map((p) => (
                          <span
                            key={`ok-${p}`}
                            className="badge badge-green"
                            style={{ fontSize: 10 }}
                          >
                            {p}
                          </span>
                        ))}
                        {(a.platforms_failed || []).map((p) => (
                          <span
                            key={`fail-${p}`}
                            className="badge badge-red"
                            style={{ fontSize: 10 }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                      {failed && a.error_message && (
                        <div style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>
                          {a.error_message}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>
                      {timeSince(a.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AI Chat */}
      {tab === "chat" && (
        <div>
          <div
            className="card"
            style={{
              padding: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 280,
              maxHeight: 400,
            }}
          >
            {/* Chat messages area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {chatMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 12px",
                    color: "var(--text-dim)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{"\u{1F4AC}"}</div>
                  <div style={{ fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                    SocialB AI
                  </div>
                  <div style={{ lineHeight: 1.5 }}>
                    Ask me to post, schedule, check your casts, or change settings.
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "ai-bubble ai-bubble-user" : "ai-bubble ai-bubble-bot"}
                >
                  {m.text}
                </div>
              ))}
              {chatSending && (
                <div className="chat-typing">
                  <div className="chat-typing-dot" />
                  <div className="chat-typing-dot" />
                  <div className="chat-typing-dot" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick actions */}
            {chatMessages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  padding: "0 12px 8px",
                }}
              >
                {[
                  "Show my recent casts",
                  "Post to all platforms",
                  "List connected accounts",
                  "Show activity log",
                ].map((q) => (
                  <button
                    key={q}
                    className="chat-quick-chip"
                    onClick={() => {
                      setChatInput(q);
                      setTimeout(() => {
                        setChatInput("");
                        setChatMessages((prev) => [...prev, { role: "user", text: q }]);
                        setChatSending(true);
                        socialbPost<{ reply: string; action?: string }>("/api/v1/socialb/chat", {
                          message: q,
                        })
                          .then((res) => {
                            setChatMessages((prev) => [
                              ...prev,
                              { role: "bot", text: res.reply },
                            ]);
                            if (res.action) loadData();
                          })
                          .catch(() => {
                            setChatMessages((prev) => [
                              ...prev,
                              { role: "bot", text: "Something went wrong. Try again." },
                            ]);
                          })
                          .finally(() => setChatSending(false));
                      }, 100);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Chat input */}
            <div className="chat-input-row">
              <input
                className="input"
                type="text"
                placeholder="Ask SocialB anything..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                disabled={chatSending}
              />
              <button
                className="chat-send-btn"
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || chatSending}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacing for nav */}
      <div style={{ height: 24 }} />
    </div>
  );
}

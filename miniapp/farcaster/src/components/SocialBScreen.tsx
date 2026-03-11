"use client";

import { useState, useEffect, useRef } from "react";
import { getToken } from "../api/client";
import { hapticImpact, hapticNotification, hapticSelection } from "../lib/farcaster";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  authed: boolean;
  currentUserId?: string;
}

interface PlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
  connected: boolean;
}

interface SocialbConfig {
  enabled: boolean;
  platforms: PlatformConfig[];
  skipReplies: boolean;
  skipRecasts: boolean;
  dailyLimit: number;
}

interface ActivityItem {
  id: string;
  castHash: string;
  text: string;
  createdAt: string;
  platforms: { name: string; status: "success" | "failed" | "pending" }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Tab = "settings" | "activity" | "chat";

// ---------------------------------------------------------------------------
// API helpers (self-contained, to be moved to client.ts later)
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function socialbHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function socialbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: socialbHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function socialbPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: socialbHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function socialbPatch<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: socialbHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function platformStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "var(--green, #22c55e)";
    case "failed":
      return "#ef4444";
    case "pending":
      return "var(--yellow, #eab308)";
    default:
      return "var(--text-muted)";
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SocialbSkeleton() {
  return (
    <div className="screen">
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div
          className="skeleton-line"
          style={{ width: 120, height: 24, margin: "0 auto 8px", borderRadius: 8 }}
        />
        <div
          className="skeleton-line"
          style={{ width: 180, height: 14, margin: "0 auto" }}
        />
      </div>
      <div className="skeleton" style={{ height: 80 }} />
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 80 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SocialBScreen({ authed, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config state
  const [config, setConfig] = useState<SocialbConfig | null>(null);

  // Activity state
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }

  // ---------- Data loading ----------

  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    loadData();
  }, [authed]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function loadData() {
    setLoading(true);
    try {
      const [cfg, act] = await Promise.all([
        socialbGet<{ config: SocialbConfig | null }>("/api/v1/socialb/config"),
        socialbGet<{ activity: ActivityItem[] }>("/api/v1/socialb/activity"),
      ]);
      setConfig(cfg.config);
      setActivity(act.activity);
    } catch (err) {
      console.error("Failed to load SocialB data:", err);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Actions ----------

  async function handleToggleEnabled() {
    if (saving) return;
    setSaving(true);
    hapticImpact("medium");
    try {
      const result = await socialbPost<{ config: SocialbConfig }>(
        "/api/v1/socialb/config/toggle",
      );
      setConfig(result.config);
      hapticNotification("success");
      showFeedback("success", result.config.enabled ? "Auto-repost enabled" : "Auto-repost disabled");
    } catch (err: any) {
      console.error("Toggle failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to toggle");
    } finally {
      setSaving(false);
    }
  }

  async function handlePlatformToggle(platformId: string) {
    if (!config || saving) return;
    setSaving(true);
    hapticSelection();
    try {
      const updated = config.platforms.map((p) =>
        p.id === platformId ? { ...p, enabled: !p.enabled } : p,
      );
      const result = await socialbPatch<{ config: SocialbConfig }>(
        "/api/v1/socialb/config",
        { platforms: updated },
      );
      setConfig(result.config);
    } catch (err: any) {
      console.error("Platform toggle failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to update platform");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreferenceChange(
    key: "skipReplies" | "skipRecasts",
    value: boolean,
  ) {
    if (!config || saving) return;
    setSaving(true);
    hapticSelection();
    try {
      const result = await socialbPatch<{ config: SocialbConfig }>(
        "/api/v1/socialb/config",
        { [key]: value },
      );
      setConfig(result.config);
    } catch (err: any) {
      console.error("Preference update failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  }

  async function handleDailyLimitChange(value: number) {
    if (!config || saving) return;
    setSaving(true);
    try {
      const result = await socialbPatch<{ config: SocialbConfig }>(
        "/api/v1/socialb/config",
        { dailyLimit: value },
      );
      setConfig(result.config);
    } catch (err: any) {
      console.error("Daily limit update failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to update daily limit");
    } finally {
      setSaving(false);
    }
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    hapticImpact("light");
    const userMsg: ChatMessage = { role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const allMessages = [...chatMessages, userMsg];
      const result = await socialbPost<{ reply: string }>(
        "/api/v1/socialb/chat",
        { messages: allMessages },
      );
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
      hapticNotification("success");
    } catch (err: any) {
      console.error("Chat failed:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
      hapticNotification("error");
    } finally {
      setChatLoading(false);
    }
  }

  // ---------- Stats ----------

  const totalReposts = activity.length;
  const platformsReached = config
    ? new Set(
        activity.flatMap((a) =>
          a.platforms.filter((p) => p.status === "success").map((p) => p.name),
        ),
      ).size
    : 0;

  // ---------- Not authenticated ----------

  if (!authed) {
    return (
      <div className="screen">
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 16,
            letterSpacing: "-0.01em",
          }}
        >
          SocialB
        </h1>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">Sign in required</div>
            <div className="empty-state-text">
              Sign in to set up auto-posting across all your social platforms.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <SocialbSkeleton />;
  }

  // ---------- First-time setup ----------

  if (!config) {
    return (
      <div className="screen">
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 4,
            letterSpacing: "-0.01em",
          }}
        >
          SocialB
        </h1>
        <div
          style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}
        >
          Auto-post everywhere
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--accent, #6366f1), #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                fontSize: 24,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              SB
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              Set Up SocialB
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              SocialB automatically reposts your Farcaster casts to connected
              platforms. Set your preferences once and let it run -- your
              content reaches every audience.
            </div>
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={async () => {
              hapticImpact("medium");
              setSaving(true);
              try {
                const result = await socialbPost<{ config: SocialbConfig }>(
                  "/api/v1/socialb/config/toggle",
                );
                setConfig(result.config);
                hapticNotification("success");
                showFeedback("success", "SocialB activated!");
              } catch (err: any) {
                hapticNotification("error");
                showFeedback("error", err.message || "Setup failed");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Setting up..." : "Activate SocialB"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Main render ----------

  return (
    <div className="screen">
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 4,
          letterSpacing: "-0.01em",
        }}
      >
        SocialB
      </h1>
      <div
        style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}
      >
        Auto-post everywhere
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: "var(--radius, 12px)",
            fontSize: 13,
            fontWeight: 600,
            background:
              feedback.type === "success"
                ? "rgba(34, 197, 94, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            color:
              feedback.type === "success"
                ? "var(--green, #22c55e)"
                : "#ef4444",
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "12px 8px",
            background: "rgba(99, 102, 241, 0.08)",
            borderRadius: "var(--radius, 12px)",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--accent, #6366f1)",
            }}
          >
            {totalReposts}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Total reposts
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "12px 8px",
            background: "rgba(34, 197, 94, 0.08)",
            borderRadius: "var(--radius, 12px)",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--green, #22c55e)",
            }}
          >
            {platformsReached}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Platforms reached
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="top-tabs">
        <button
          className={`top-tab ${tab === "settings" ? "active" : ""}`}
          onClick={() => {
            hapticSelection();
            setTab("settings");
          }}
        >
          Settings
        </button>
        <button
          className={`top-tab ${tab === "activity" ? "active" : ""}`}
          onClick={() => {
            hapticSelection();
            setTab("activity");
          }}
        >
          Activity
        </button>
        <button
          className={`top-tab ${tab === "chat" ? "active" : ""}`}
          onClick={() => {
            hapticSelection();
            setTab("chat");
          }}
        >
          Chat
        </button>
      </div>

      {/* =================== SETTINGS TAB =================== */}
      {tab === "settings" && (
        <>
          {/* ON/OFF toggle */}
          <div
            className="card"
            style={{
              padding: 16,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                Auto-repost
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {config.enabled
                  ? "Active -- casts are being reposted"
                  : "Paused -- no reposts will be sent"}
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              disabled={saving}
              style={{
                width: 56,
                height: 32,
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s ease",
                background: config.enabled
                  ? "var(--accent, #6366f1)"
                  : "rgba(255, 255, 255, 0.1)",
                flexShrink: 0,
                opacity: saving ? 0.6 : 1,
              }}
              aria-label={config.enabled ? "Disable auto-repost" : "Enable auto-repost"}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 4,
                  left: config.enabled ? 28 : 4,
                  transition: "left 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          </div>

          {/* Platform grid */}
          <div className="section-title">Platforms</div>
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            {config.platforms.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  padding: 12,
                  fontSize: 13,
                }}
              >
                No platforms connected yet.
              </div>
            )}
            {config.platforms.map((platform) => (
              <div
                key={platform.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 4px",
                  borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: platform.connected
                        ? "var(--green, #22c55e)"
                        : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {platform.name}
                    </div>
                    {!platform.connected && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        Not connected
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handlePlatformToggle(platform.id)}
                  disabled={!platform.connected || saving}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    border: "none",
                    cursor: platform.connected ? "pointer" : "not-allowed",
                    position: "relative",
                    transition: "background 0.2s ease",
                    background:
                      platform.enabled && platform.connected
                        ? "var(--accent, #6366f1)"
                        : "rgba(255, 255, 255, 0.08)",
                    flexShrink: 0,
                    opacity: !platform.connected ? 0.4 : saving ? 0.6 : 1,
                  }}
                  aria-label={`Toggle ${platform.name}`}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 3,
                      left:
                        platform.enabled && platform.connected ? 21 : 3,
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Preferences */}
          <div className="section-title">Preferences</div>
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            {/* Skip replies */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 4px",
                borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Skip replies
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Don't repost reply casts
                </div>
              </div>
              <button
                onClick={() =>
                  handlePreferenceChange("skipReplies", !config.skipReplies)
                }
                disabled={saving}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s ease",
                  background: config.skipReplies
                    ? "var(--accent, #6366f1)"
                    : "rgba(255, 255, 255, 0.08)",
                  flexShrink: 0,
                  opacity: saving ? 0.6 : 1,
                }}
                aria-label={
                  config.skipReplies ? "Disable skip replies" : "Enable skip replies"
                }
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: config.skipReplies ? 21 : 3,
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
            </div>

            {/* Skip recasts */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 4px",
                borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Skip recasts
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Don't repost when you recast
                </div>
              </div>
              <button
                onClick={() =>
                  handlePreferenceChange("skipRecasts", !config.skipRecasts)
                }
                disabled={saving}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s ease",
                  background: config.skipRecasts
                    ? "var(--accent, #6366f1)"
                    : "rgba(255, 255, 255, 0.08)",
                  flexShrink: 0,
                  opacity: saving ? 0.6 : 1,
                }}
                aria-label={
                  config.skipRecasts
                    ? "Disable skip recasts"
                    : "Enable skip recasts"
                }
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: config.skipRecasts ? 21 : 3,
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
            </div>

            {/* Daily limit slider */}
            <div style={{ padding: "12px 4px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    Daily limit
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Max reposts per day
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--accent, #6366f1)",
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {config.dailyLimit}
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={config.dailyLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setConfig((prev) =>
                    prev ? { ...prev, dailyLimit: val } : prev,
                  );
                }}
                onMouseUp={(e) => {
                  handleDailyLimitChange(
                    parseInt((e.target as HTMLInputElement).value, 10),
                  );
                }}
                onTouchEnd={(e) => {
                  handleDailyLimitChange(
                    parseInt((e.target as HTMLInputElement).value, 10),
                  );
                }}
                style={{
                  width: "100%",
                  height: 4,
                  appearance: "none",
                  WebkitAppearance: "none",
                  background: `linear-gradient(to right, var(--accent, #6366f1) ${((config.dailyLimit - 1) / 49) * 100}%, rgba(255,255,255,0.1) ${((config.dailyLimit - 1) / 49) * 100}%)`,
                  borderRadius: 2,
                  outline: "none",
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                <span>1</span>
                <span>50</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================== ACTIVITY TAB =================== */}
      {tab === "activity" && (
        <>
          {activity.length === 0 && (
            <div className="card">
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  padding: 24,
                  fontSize: 13,
                }}
              >
                No reposts yet. Enable auto-repost and start casting.
              </div>
            </div>
          )}

          {activity.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{ padding: 14, marginBottom: 8 }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {item.text}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                {item.platforms.map((p) => (
                  <span
                    key={p.name}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: `${platformStatusColor(p.status)}18`,
                      color: platformStatusColor(p.status),
                    }}
                  >
                    {p.name}
                    {p.status === "success" && " \u2713"}
                    {p.status === "failed" && " \u2717"}
                    {p.status === "pending" && " ..."}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {timeAgo(item.createdAt)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* =================== CHAT TAB =================== */}
      {tab === "chat" && (
        <>
          <div
            className="card"
            style={{
              padding: 14,
              marginBottom: 12,
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))",
              border: "1px solid rgba(99, 102, 241, 0.15)",
            }}
          >
            <div
              style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}
            >
              Ask the SocialB AI to create custom posting rules, schedule
              content, or adjust your cross-platform strategy.
            </div>
          </div>

          {/* Messages area */}
          <div
            style={{
              minHeight: 200,
              maxHeight: 360,
              overflowY: "auto",
              marginBottom: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {chatMessages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  padding: 32,
                  fontSize: 13,
                }}
              >
                Start a conversation to customize your posting flow.
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius:
                    msg.role === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  background:
                    msg.role === "user"
                      ? "var(--accent, #6366f1)"
                      : "var(--bg-card, rgba(255,255,255,0.06))",
                  color:
                    msg.role === "user" ? "#fff" : "inherit",
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  background: "var(--bg-card, rgba(255,255,255,0.06))",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type="text"
              placeholder="Ask SocialB AI..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSend();
                }
              }}
              disabled={chatLoading}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleChatSend}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: "10px 16px",
                opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 18, height: 18 }}
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

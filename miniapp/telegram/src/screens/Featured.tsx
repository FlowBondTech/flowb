import { useState, useEffect, useRef } from "react";
import type { Screen } from "../App";
import type { FeaturedPageData } from "../api/types";
import { getFeaturedPageData, getToken } from "../api/client";
import { FeaturedSponsorModal } from "../components/FeaturedSponsorModal";

interface Props {
  onNavigate: (s: Screen) => void;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Ended";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function truncateUrl(url: string, max = 40): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + "..." : display;
  } catch {
    return url.length > max ? url.slice(0, max) + "..." : url;
  }
}

export function Featured({ onNavigate }: Props) {
  const [data, setData] = useState<FeaturedPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try { return sessionStorage.getItem("flowb_admin_key") || ""; } catch { return ""; }
  });
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUrl, setAdminUrl] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    getFeaturedPageData()
      .then((d) => {
        setData(d);
        if (d.current) setCountdown(d.current.timeRemainingSeconds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown > 0]);

  const openUrl = (url: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, "_blank");
  };

  const handleAdminOverride = async (eventUrl: string | null) => {
    if (!adminKey) {
      setAdminStatus("Enter admin key first");
      return;
    }
    setAdminStatus("Saving...");
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_URL || "";
      const hdrs: Record<string, string> = {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      };
      const token = getToken();
      if (token) hdrs["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/v1/admin/featured-event`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ eventUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setAdminStatus(`Error: ${err.error || res.statusText}`);
        return;
      }
      setAdminStatus(eventUrl ? "Override set!" : "Override cleared!");
      setAdminUrl("");
      // Refresh data
      const fresh = await getFeaturedPageData();
      setData(fresh);
      if (fresh.current) setCountdown(fresh.current.timeRemainingSeconds);
    } catch (err: any) {
      setAdminStatus(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="screen-container" style={{ padding: 20, textAlign: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  const cur = data?.current;

  return (
    <div className="screen-container" style={{ padding: "16px 16px 80px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Featured Events
      </h2>

      {/* Hero: Current Featured */}
      <div style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))",
        border: "1px solid rgba(245,158,11,0.3)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}>
        {cur?.effectiveUrl ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff", padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                Featured Now
              </span>
              {cur.adminOverrideUrl && (
                <span style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa", padding: "3px 8px", borderRadius: 6, fontSize: 10 }}>
                  Admin Pick
                </span>
              )}
            </div>
            <div
              style={{ cursor: "pointer", marginBottom: 12 }}
              onClick={() => openUrl(cur.effectiveUrl!)}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4, wordBreak: "break-all" }}>
                {truncateUrl(cur.effectiveUrl, 50)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Tap to view event
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>
                  {formatCountdown(countdown)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Time Remaining</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>
                  ${cur.amountUsdc.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Current Bid</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F3AF;</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No Featured Event Yet</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Be the first to boost your event to the top!
            </div>
          </div>
        )}
      </div>

      {/* Auction Status */}
      {cur && (
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Auction Status
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Cycle</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>#{cur.cycleNumber}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Min Next Bid</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#22c55e" }}>
                ${cur.minNextBid.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Payment</div>
              <div style={{ fontSize: 13 }}>USDC (Base) / Stripe</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Ends At</div>
              <div style={{ fontSize: 13 }}>{formatDate(cur.endsAt)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Boost CTA */}
      <button
        onClick={() => setShowBoostModal(true)}
        style={{
          width: "100%",
          padding: "14px 20px",
          borderRadius: 12,
          border: "none",
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        Boost Your Event
      </button>

      {/* Admin Controls */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 12,
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          {showAdmin ? "Hide Admin" : "Admin Controls"}
        </button>
        {showAdmin && (
          <div style={{
            background: "rgba(139,92,246,0.06)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 12,
            padding: 14,
            marginTop: 8,
          }}>
            <input
              type="password"
              placeholder="Admin key"
              value={adminKey}
              onChange={(e) => {
                setAdminKey(e.target.value);
                try { sessionStorage.setItem("flowb_admin_key", e.target.value); } catch {}
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card-bg)",
                color: "var(--text)",
                fontSize: 13,
                marginBottom: 8,
              }}
            />
            <input
              type="text"
              placeholder="Event URL to feature (or leave empty to clear)"
              value={adminUrl}
              onChange={(e) => setAdminUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card-bg)",
                color: "var(--text)",
                fontSize: 13,
                marginBottom: 8,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleAdminOverride(adminUrl || null)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#7c3aed",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {adminUrl ? "Set Override" : "Clear Override"}
              </button>
            </div>
            {adminStatus && (
              <div style={{ fontSize: 12, color: adminStatus.startsWith("Error") ? "#ef4444" : "#22c55e", marginTop: 6 }}>
                {adminStatus}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      {data?.history && data.history.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Past Featured Events
          </div>
          {data.history.map((h, i) => (
            <div
              key={i}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 8,
                cursor: h.eventUrl ? "pointer" : undefined,
              }}
              onClick={() => h.eventUrl && openUrl(h.eventUrl)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Cycle #{h.cycleNumber}</span>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
                    {h.eventUrl ? truncateUrl(h.eventUrl, 35) : "No winner"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>
                    ${h.amountUsdc.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {formatDate(h.endedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBoostModal && (
        <FeaturedSponsorModal
          onClose={() => setShowBoostModal(false)}
          onSuccess={() => {
            setShowBoostModal(false);
            getFeaturedPageData().then((d) => {
              setData(d);
              if (d.current) setCountdown(d.current.timeRemainingSeconds);
            }).catch(console.error);
          }}
        />
      )}
    </div>
  );
}

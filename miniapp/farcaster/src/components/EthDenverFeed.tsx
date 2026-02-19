import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { getEthDenverFeed } from "../api/client";
import { replyCast, quoteCast, viewCast, viewProfile, getCastUrl } from "../lib/farcaster";
import type { FeedCast } from "../api/types";

interface Props {
  authed: boolean;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const actionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: "none",
  padding: "4px 6px",
  margin: "-4px -6px",
  borderRadius: 6,
  cursor: "pointer",
  color: "inherit",
  fontSize: "inherit",
  transition: "color 0.15s, background 0.15s",
};

function CastCard({ cast }: { cast: FeedCast }) {
  const castUrl = getCastUrl(cast.author.username, cast.hash);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const handleReply = (e: MouseEvent) => {
    stop(e);
    replyCast(cast.hash);
  };

  const handleRecast = (e: MouseEvent) => {
    stop(e);
    quoteCast(castUrl);
  };

  const handleLike = (e: MouseEvent) => {
    stop(e);
    viewCast(cast.hash, cast.author.username);
  };

  const handleAuthor = (e: MouseEvent) => {
    stop(e);
    viewProfile(cast.author.fid);
  };

  return (
    <div
      className="card card-clickable"
      onClick={() => viewCast(cast.hash, cast.author.username)}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {cast.author.pfp_url ? (
          <img
            src={cast.author.pfp_url}
            alt=""
            onClick={handleAuthor}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              background: "var(--bg-card-hover)",
              cursor: "pointer",
            }}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className="avatar"
            onClick={handleAuthor}
            style={{ width: 36, height: 36, fontSize: 14, cursor: "pointer" }}
          >
            {cast.author.display_name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span
              onClick={handleAuthor}
              style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
            >
              {cast.author.display_name}
            </span>
            <span
              onClick={handleAuthor}
              style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, cursor: "pointer" }}
            >
              @{cast.author.username}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto", flexShrink: 0 }}>
              {timeAgo(cast.timestamp)}
            </span>
          </div>
          <div style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--text)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {cast.text.length > 300 ? cast.text.slice(0, 300) + "..." : cast.text}
          </div>
          {cast.channel && (
            <span
              className="badge badge-accent"
              style={{ marginTop: 8, fontSize: 10 }}
            >
              /{cast.channel.id}
            </span>
          )}
          <div style={{
            display: "flex",
            gap: 16,
            marginTop: 10,
            fontSize: 12,
            color: "var(--text-muted)",
          }}>
            <button
              onClick={handleReply}
              style={actionBtnStyle}
              title="Reply"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {cast.replies.count}
            </button>
            <button
              onClick={handleRecast}
              style={actionBtnStyle}
              title="Quote cast"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {cast.reactions.recasts_count}
            </button>
            <button
              onClick={handleLike}
              style={actionBtnStyle}
              title="Like (opens cast)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {cast.reactions.likes_count}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="skeleton">
      <div style={{ display: "flex", gap: 10 }}>
        <div className="skeleton-circle" style={{ width: 36, height: 36 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line" style={{ width: "90%", marginBottom: 6 }} />
          <div className="skeleton-line skeleton-line-sub" />
        </div>
      </div>
    </div>
  );
}

export function EthDenverFeed({ authed }: Props) {
  const [casts, setCasts] = useState<FeedCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEthDenverFeed();
      setCasts(data.casts);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Feed load error:", err);
      setError("Failed to load feed. Pull down to retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getEthDenverFeed(nextCursor);
      setCasts((prev) => {
        const existing = new Set(prev.map((c) => c.hash));
        const newCasts = data.casts.filter((c) => !existing.has(c.hash));
        return [...prev, ...newCasts];
      });
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
            EthDenver Feed
          </h1>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Live posts from the Farcaster community
          </div>
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={loadFeed}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? (
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          )}
        </button>
      </div>

      {loading ? (
        <>
          <FeedSkeleton />
          <FeedSkeleton />
          <FeedSkeleton />
          <FeedSkeleton />
        </>
      ) : error ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">{"\u26A0\uFE0F"}</div>
            <div className="empty-state-title">Couldn't load feed</div>
            <div className="empty-state-text">{error}</div>
            <button className="btn btn-primary" onClick={loadFeed}>
              Try Again
            </button>
          </div>
        </div>
      ) : casts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">{"\uD83D\uDCE1"}</div>
            <div className="empty-state-title">No posts yet</div>
            <div className="empty-state-text">
              EthDenver posts from Farcaster will appear here as they're shared.
            </div>
          </div>
        </div>
      ) : (
        <>
          {casts.map((cast) => (
            <CastCard key={cast.hash} cast={cast} />
          ))}
          {nextCursor && (
            <button
              className="btn btn-secondary btn-block"
              onClick={loadMore}
              disabled={loadingMore}
              style={{ marginTop: 8, marginBottom: 16 }}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
